const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const mkdirp = require('mkdirp');
const axios = require('axios');

// Lightweight logging to file + console
let LOG_FILE = path.join(__dirname, 'ts-debug.log');
function log(message, data) {
    const ts = new Date().toISOString();
    let line = `[${ts}] ${message}`;
    if (data !== undefined) {
        try { line += ' ' + JSON.stringify(data); } catch (_) { line += ' ' + String(data); }
    }
    line += '\n';
    try { fs.appendFileSync(LOG_FILE, line); } catch (_) {}
    try { console.log(line.trim()); } catch (_) {}
}

const debug = /--debug/.test(process.argv[2]);
log('Main process starting', {
  argv: process.argv,
  node: process.version,
  platform: process.platform,
  ELECTRON_RUN_AS_NODE: process.env.ELECTRON_RUN_AS_NODE || false
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let splashScreen = null;
let mainWindow = null;
let academyWindow = null;
let scrollToId = null;
let handshakeDone = false;

const menuTemplate = [
    {
        label: 'Window',
        role: 'window',
        submenu: [
            {
                label: 'Minimize',
                accelerator: 'CmdOrCtrl+M',
                role: 'minimize'
            },
            {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click: function(item, focusedWindow) {
                    if (focusedWindow) {
                        focusedWindow.reload();
                    }
                }
            },
            {
                label: 'Toggle Developer Tools',
                accelerator:
                    process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                click: function(item, focusedWindow) {
                    if (focusedWindow) {
                        focusedWindow.webContents.toggleDevTools();
                    }
                }
            }
        ]
    },
    { role: 'editMenu' }
];

function getDataPath() {
    const base = process.env.LOCALAPPDATA || (process.platform === 'darwin' ?
        path.join(process.env.HOME, 'Library', 'Application Support') :
        path.join(process.env.HOME, '.config'));

    const dir = path.join(base, 'translationstudio');
    mkdirp.sync(dir);
    // Switch log file to a persistent location once known
    try { LOG_FILE = path.join(dir, 'ts-desktop.log'); log('Log file path set', LOG_FILE); } catch (_) {}
    return dir;
}

function initialize() {
    makeSingleInstance();

    if (!app || typeof app.setPath !== 'function') {
        log('Electron app API not available. Is ELECTRON_RUN_AS_NODE set?', {
          ELECTRON_RUN_AS_NODE: process.env.ELECTRON_RUN_AS_NODE || false
        });
        return;
    }

    app.setPath('userData', getDataPath());

    app.on('ready', () => {
        log('App ready');
        createSplashWindow();
        setTimeout(() => {
            log('Showing splash');
            splashScreen.show();
            createWindow();
        }, 500);
    });

    app.on('window-all-closed', () => {
        // if (process.platform !== 'darwin') {
            app.quit();
        // }
    });

    app.on('activate', () => {
        if (mainWindow === null) {
            createWindow();
        }
    });

    // build menu
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    ipcMain.on('loading-status', function(event, status) {
        log('IPC loading-status', status);
        splashScreen && splashScreen.webContents.send('loading-status', status);
    });

    ipcMain.on('renderer-error', function(event, payload) {
        log('Renderer error', payload);
    });

    // Modern dialog handlers (Promise-based)
    ipcMain.handle('dialog:open', async (event, options) => {
        try {
            const res = await dialog.showOpenDialog(mainWindow || null, options || {});
            return res;
        } catch (e) { log('dialog:open error', e && e.message); return { canceled: true, filePaths: [] }; }
    });

    ipcMain.handle('dialog:save', async (event, options) => {
        try {
            const res = await dialog.showSaveDialog(mainWindow || null, options || {});
            return res;
        } catch (e) { log('dialog:save error', e && e.message); return { canceled: true, filePath: undefined }; }
    });

    // IPC: App/userData path
    ipcMain.handle('app:getUserDataPath', () => {
        try { return app.getPath('userData'); } catch (e) { log('app:getUserDataPath error', e && e.message); return null; }
    });

    // IPC: Simple file helpers scoped to userData
    ipcMain.handle('fs:ensureDir', async (event, relPath) => {
        try {
            const dir = path.join(app.getPath('userData'), relPath || '');
            await fsp.mkdir(dir, { recursive: true });
            return true;
        } catch (e) { log('fs:ensureDir error', { relPath, err: e && e.message }); return false; }
    });

    ipcMain.handle('fs:readJson', async (event, relPath) => {
        try {
            const file = path.join(app.getPath('userData'), relPath);
            const txt = await fsp.readFile(file, 'utf8');
            return JSON.parse(txt);
        } catch (e) { log('fs:readJson error', { relPath, err: e && e.message }); return null; }
    });

    ipcMain.handle('fs:writeJson', async (event, payload) => {
        const { relPath, data } = payload || {};
        try {
            const file = path.join(app.getPath('userData'), relPath);
            await fsp.mkdir(path.dirname(file), { recursive: true });
            await fsp.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (e) { log('fs:writeJson error', { relPath, err: e && e.message }); return false; }
    });

    ipcMain.handle('fs:readFile', async (event, relPath) => {
        try {
            const file = path.join(app.getPath('userData'), relPath);
            const buf = await fsp.readFile(file);
            return buf;
        } catch (e) { log('fs:readFile error', { relPath, err: e && e.message }); return null; }
    });

    ipcMain.handle('fs:writeFile', async (event, payload) => {
        const { relPath, data } = payload || {};
        try {
            const file = path.join(app.getPath('userData'), relPath);
            await fsp.mkdir(path.dirname(file), { recursive: true });
            await fsp.writeFile(file, Buffer.from(data));
            return true;
        } catch (e) { log('fs:writeFile error', { relPath, err: e && e.message }); return false; }
    });

    // Absolute path helpers for imports (read-only/copy-only)
    ipcMain.handle('fs:readAbsoluteText', async (event, absPath) => {
        try {
            const txt = await fsp.readFile(String(absPath), 'utf8');
            return txt;
        } catch (e) { log('fs:readAbsoluteText error', { absPath, err: e && e.message }); return null; }
    });

    ipcMain.handle('fs:listAbsoluteEntries', async (event, absPath) => {
        try {
            const root = String(absPath || '');
            if (!root) return [];
            const entries = await fsp.readdir(root, { withFileTypes: true });
            return entries.map((entry) => ({
                name: entry.name,
                isFile: entry.isFile(),
                isDirectory: entry.isDirectory(),
            }));
        } catch (e) {
            log('fs:listAbsoluteEntries error', { absPath, err: e && e.message });
            return [];
        }
    });

    ipcMain.handle('fs:copyAbsoluteToUserData', async (event, payload) => {
        const { absPath, relPath } = payload || {};
        try {
            const dst = path.join(app.getPath('userData'), relPath);
            await fsp.mkdir(path.dirname(dst), { recursive: true });
            await fsp.copyFile(String(absPath), dst);
            return true;
        } catch (e) { log('fs:copyAbsoluteToUserData error', { absPath, relPath, err: e && e.message }); return false; }
    });

    ipcMain.handle('fs:writeAbsoluteFile', async (event, payload) => {
        const { absPath, data } = payload || {};
        try {
            const dst = String(absPath || '');
            if (!dst) return false;
            await fsp.mkdir(path.dirname(dst), { recursive: true });
            await fsp.writeFile(dst, Buffer.from(data || []));
            return true;
        } catch (e) { log('fs:writeAbsoluteFile error', { absPath, err: e && e.message }); return false; }
    });

    ipcMain.handle('window:minimize', () => {
        try { mainWindow && mainWindow.minimize(); return true; }
        catch (e) { log('window:minimize error', e && e.message); return false; }
    });

    ipcMain.handle('window:maximize', () => {
        try {
            if (!mainWindow) return false;
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
            return true;
        } catch (e) { log('window:maximize error', e && e.message); return false; }
    });

    ipcMain.handle('window:close', () => {
        try { mainWindow && mainWindow.close(); return true; }
        catch (e) { log('window:close error', e && e.message); return false; }
    });

    ipcMain.handle('net:request', async (event, payload) => {
        const req = payload || {};
        const method = (req.method || 'GET').toUpperCase();
        const url = req.url;
        if (!url) {
            return {
                ok: false,
                status: 0,
                statusText: 'invalid-url',
                headers: {},
                data: null,
                error: 'Missing request url',
            };
        }
        const responseType = req.responseType || 'json';
        const timeout = typeof req.timeoutMs === 'number' ? req.timeoutMs : undefined;
        const headers = req.headers && typeof req.headers === 'object' ? req.headers : {};
        let data = req.body;
        if (data && data.type === 'Buffer' && Array.isArray(data.data)) {
            data = Buffer.from(data.data);
        } else if (data instanceof Uint8Array) {
            data = Buffer.from(data);
        }

        try {
            const res = await axios.request({
                url,
                method,
                headers,
                data,
                timeout,
                responseType: responseType === 'arraybuffer' ? 'arraybuffer' : responseType === 'text' ? 'text' : 'json',
                validateStatus: () => true,
            });

            const plainHeaders = {};
            Object.entries(res.headers || {}).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    plainHeaders[key] = value.join(', ');
                } else if (value !== undefined && value !== null) {
                    plainHeaders[key] = String(value);
                }
            });

            let payloadData = res.data;
            if (responseType === 'arraybuffer' && !(payloadData instanceof Buffer)) {
                payloadData = Buffer.from(payloadData);
            }
            if (responseType === 'text' && typeof payloadData !== 'string') {
                payloadData = typeof payloadData === 'object' ? JSON.stringify(payloadData) : String(payloadData);
            }

            return {
                ok: res.status >= 200 && res.status < 300,
                status: res.status,
                statusText: res.statusText,
                headers: plainHeaders,
                data: payloadData,
            };
        } catch (error) {
            const message = error && error.message ? error.message : String(error);
            log('net:request error', { url, method, err: message });
            return {
                ok: false,
                status: 0,
                statusText: 'network-error',
                headers: {},
                data: null,
                error: message,
            };
        }
    });

    ipcMain.on('main-window', function(event, arg) {
        if (typeof mainWindow[arg] === 'function') {
            let ret = mainWindow[arg]();
            event.returnValue = !!ret;
        } else if (mainWindow[arg]) {
            event.returnValue = mainWindow[arg];
        } else {
            event.returnValue = null;
        }
    });

    ipcMain.on('main-loading-done', function() {
        log('IPC main-loading-done received');
        handshakeDone = true;
        if (splashScreen && mainWindow) {
            // Launch fullscreen with DevTools open
            if (debug) {
                mainWindow.webContents.openDevTools();
                mainWindow.maximize();
                // Ensure window becomes visible in debug mode
                mainWindow.show();
                require('devtron').install();
            } else {
                mainWindow.show();
            }

            log('Closing splash');
            splashScreen.close();
        }
    });

    ipcMain.on('academy-window', function(event, arg) {
        if (typeof academyWindow[arg] === 'function') {
            let ret = academyWindow[arg]();
            event.returnValue = !!ret;
        } else if (academyWindow[arg]) {
            event.returnValue = academyWindow[arg];
        } else {
            event.returnValue = null;
        }
    });

    /**
     * Handles an event to open translationAcademy
     * @param event
     * @param lang - the translation to view
     * @param id - the article id
     */
    ipcMain.on('open-academy', function(event, args) {
        let lang, id;
        if(args) {
            lang = args.lang;
            id = args.id;
        }

        if (academyWindow) {
            academyWindow.show();
            // send props to window
            academyWindow.webContents.send('props', {
                lang,
                articleId: id,
                dataPath: getDataPath()
            });
        } else {
            createAcademySplash();
            setTimeout(function() {
                splashScreen.show();
                createAcademyWindow();
                academyWindow.once('ready-to-show', () => {
                    splashScreen.close();
                    academyWindow.show();
                    // send props to window
                    academyWindow.webContents.send('props', {
                        lang,
                        articleId: id,
                        dataPath: getDataPath()
                    });
                });
            }, 500);
        }
    });

    ipcMain.on('fire-reload', function() {
        if (splashScreen) {
            splashScreen.show();
        } else {
            createReloadSplash();
        }
        setTimeout(function() {
            splashScreen.show();
            setTimeout(function() {
                if (mainWindow) {
                    mainWindow.hide();
                    mainWindow.reload();
                }
            }, 500);
        }, 500);
    });

    ipcMain.on('save-as', function(event, arg) {
        var input = dialog.showSaveDialog(mainWindow, arg.options);
        event.returnValue = input || false;
    });

    ipcMain.on('open-file', function(event, arg) {
        var input = dialog.showOpenDialog(mainWindow, arg.options);
        event.returnValue = input || false;
    });
}

function createWindow() {
    const windowOptions = {
        width: 980,
        minWidth: 980,
        height: 580,
        minHeight: 580,
        show: false,
        center: true,
        backgroundColor: '#00796B',
        autoHideMenuBar: true,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: true
        },
        title: app.getName(),
        icon: path.join(__dirname, '/icons/icon.png')
    };

    mainWindow = new BrowserWindow(windowOptions);
    log('Main window created');
    mainWindow.dataPath = app.getPath('userData');
    mainWindow.loadURL(
        path.join('file://', __dirname, '/dist/index.html'));

    // Fallback: if renderer handshake not received in time, show main anyway
    const fallbackMs = debug ? 1500 : 4000;
    const handshakeTimer = setTimeout(() => {
        if (!handshakeDone && mainWindow) {
            log('IPC fallback: no main-loading-done received, showing main');
            try { mainWindow.show(); } catch (_) {}
            try { splashScreen && splashScreen.close(); } catch (_) {}
        }
    }, fallbackMs);

    // Diagnostics from webContents
    mainWindow.webContents.on('did-finish-load', () => log('Main did-finish-load'));
    mainWindow.webContents.on('dom-ready', () => log('Main dom-ready'));
    mainWindow.webContents.on('did-fail-load', (e, ec, ed, url) => log('Main did-fail-load', { ec, ed, url }));
    mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) =>
        log('Renderer console', { level, message, line, sourceId })
    );
    mainWindow.webContents.on('render-process-gone', (e, details) => log('Render process gone', details));

    mainWindow.on('closed', () => {
        try { clearTimeout(handshakeTimer); } catch (_) {}
        log('Main window closed');
        if (academyWindow) {
            academyWindow.close();
            academyWindow = null;
        }
        mainWindow = null;
    });

    mainWindow.on('maximize', function() {
        log('Main window maximize');
        mainWindow.webContents.send('maximize');
    });

    mainWindow.on('unmaximize', function() {
        log('Main window unmaximize');
        mainWindow.webContents.send('unmaximize');
    });
}

function createSplashWindow() {
    const windowOptions = {
        width: 400,
        height: 170,
        resizable: false,
        autoHideMenuBar: true,
        frame: false,
        show: false,
        center: true,
        title: 'translationStudio'
    };
    splashScreen = new BrowserWindow(windowOptions);
    log('Splash window created');
    splashScreen.loadURL(
        'file://' + __dirname + '/dist/splash.html');

    splashScreen.on('closed', function() {
        log('Splash window closed');
        splashScreen = null;
    });
}

/**
 * Make this app a single instance app.
 *
 * The main window will be restored and focused instead of a second window
 * opened when a person attempts to launch a second instance.
 *
 * Returns true if the current version of the app should quit instead of
 * launching.
 */
function makeSingleInstance() {
    if (process.mas) {
        return;
    }

    // Support both modern and legacy Electron APIs; guard if unavailable
    try {
        if (typeof app.requestSingleInstanceLock === 'function') {
            const gotTheLock = app.requestSingleInstanceLock();
            if (!gotTheLock) {
                app.quit();
                return;
            }
            app.on('second-instance', () => {
                if (mainWindow) {
                    if (mainWindow.isMinimized()) {
                        mainWindow.restore();
                    }
                    mainWindow.focus();
                }
            });
            return;
        }

        if (typeof app.makeSingleInstance === 'function') {
            app.makeSingleInstance(() => {
                if (mainWindow) {
                    if (mainWindow.isMinimized()) {
                        mainWindow.restore();
                    }
                    mainWindow.focus();
                }
            });
            return;
        }
    } catch (e) {
        // Fallback: if anything goes wrong, proceed without single-instance lock
    }
}

function createAcademySplash() {
    splashScreen = new BrowserWindow({
        width: 400,
        height: 170,
        resizable: false,
        autoHideMenuBar: true,
        frame: false,
        center: true,
        show: false,
        title: 'translationStudio'
    });

    splashScreen.loadURL(
        'file://' + __dirname + '/dist/splash.html');

    splashScreen.on('closed', function() {
        splashScreen = null;
    });
}

function createReloadSplash() {
    splashScreen = new BrowserWindow({
        width: 400,
        height: 170,
        resizable: false,
        autoHideMenuBar: true,
        frame: false,
        center: true,
        show: false,
        title: 'translationStudio'
    });

    splashScreen.loadURL(
        'file://' + __dirname + '/dist/splash.html');

    splashScreen.on('closed', function() {
        splashScreen = null;
    });
}

function createAcademyWindow() {

    academyWindow = new BrowserWindow({
        width: 950,
        height: 660,
        minWidth: 950,
        minHeight: 580,
        useContentSize: true,
        center: true,
        title: app.getName(),
        backgroundColor: '#00796B',
        autoHideMenuBar: true,
        show: false,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: true
        }
    });

    academyWindow.loadURL(
        'file://' + __dirname + '/dist/index.html');

    academyWindow.on('closed', function() {
        academyWindow = null;
    });

    academyWindow.on('maximize', function() {
        academyWindow.webContents.send('maximize');
    });

    academyWindow.on('unmaximize', function() {
        academyWindow.webContents.send('unmaximize');
    });

    academyWindow.on('blur', function() {
        // manually pass blur to the page because window.blur doesn't work properly.
        academyWindow.webContents.send('blur');
    });
}

initialize();
