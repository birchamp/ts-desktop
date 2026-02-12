#!/usr/bin/env node
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('playwright-core');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForFile(absPath, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const stat = await fsp.stat(absPath);
      if (stat.isFile() && stat.size > 0) return stat.size;
    } catch {
      // keep waiting
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for file: ${absPath}`);
}

async function waitForHash(page, pattern, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const hash = await page.evaluate(() => window.location.hash || '');
    if (pattern.test(hash)) return hash;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for hash ${pattern}`);
}

async function waitForMainWindow(electronApp, timeoutMs = 30000) {
  const started = Date.now();
  let lastUrls = [];
  while (Date.now() - started < timeoutMs) {
    const windows = electronApp.windows();
    const urls = [];
    for (const page of windows) {
      try {
        const url = page.url();
        if (url) {
          urls.push(url);
        }
        if (url.includes('/dist/index.html')) {
          return page;
        }
      } catch {
        // Keep polling while splash/main windows churn.
      }
    }
    if (urls.length > 0) {
      lastUrls = urls;
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for main index window. Last URLs: ${lastUrls.join(' | ')}`);
}

async function clickSidebar(page, label) {
  const nav = page.locator('nav');
  await nav.getByText(label, { exact: true }).first().click();
}

async function waitForEnabled(locator, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await locator.isEnabled()) return;
    await sleep(100);
  }
  throw new Error('Timed out waiting for element to become enabled.');
}

function parseProjectIdFromHash(hash) {
  const query = hash.split('?')[1] || '';
  return new URLSearchParams(query).get('projectId');
}

async function setDialogQueues(electronApp, { open = null, save = null }) {
  await electronApp.evaluate(
    (_electron, { openQueue, saveQueue }) => {
      const current = globalThis.__pwDialogQueues || { open: [], save: [] };
      globalThis.__pwDialogQueues = {
        open: Array.isArray(openQueue) ? [...openQueue] : current.open,
        save: Array.isArray(saveQueue) ? [...saveQueue] : current.save,
      };
    },
    { openQueue: open, saveQueue: save }
  );
}

async function patchDialogHandlers(electronApp) {
  await electronApp.evaluate(({ dialog }) => {
    globalThis.__pwDialogQueues = { open: [], save: [] };

    dialog.showOpenDialog = async () => {
      const next = globalThis.__pwDialogQueues.open.shift();
      if (!next) {
        return { canceled: true, filePaths: [] };
      }
      return { canceled: false, filePaths: [next] };
    };

    dialog.showSaveDialog = async () => {
      const next = globalThis.__pwDialogQueues.save.shift();
      if (!next) {
        return { canceled: true, filePath: undefined };
      }
      return { canceled: false, filePath: next };
    };
  });
}

async function createProjectFromHome(page, projectName, bookName) {
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await waitForHash(page, /#\/new/);

  await page.getByRole('button', { name: 'Next' }).click();
  await page
    .locator('div[role="button"]')
    .filter({ hasText: new RegExp(`^${bookName}$`) })
    .first()
    .click();
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByLabel('Project Name').fill(projectName);
  await page.getByRole('button', { name: 'Create Project' }).click();

  const hash = await waitForHash(page, /#\/translate\?projectId=/);
  const projectId = parseProjectIdFromHash(hash);
  if (!projectId) {
    throw new Error(`Project ID missing from hash: ${hash}`);
  }
  return projectId;
}

async function seedDraftForReview(page, projectId, bookId, verseText) {
  const ok = await page.evaluate(async payload => {
    const content = {
      projectId: payload.projectId,
      books: {
        [payload.bookId]: {
          bookId: payload.bookId,
          verses: [
            {
              chapter: 1,
              verse: 1,
              text: payload.verseText,
              updatedAt: Date.now(),
            },
          ],
        },
      },
      updatedAt: Date.now(),
    };
    const relPath = `projects/${payload.projectId}/translation-draft.json`;

    if (window.electronAPI?.fs?.writeJson) {
      return await window.electronAPI.fs.writeJson(relPath, content);
    }
    const ipc = window.require?.('electron')?.ipcRenderer;
    if (!ipc?.invoke) return false;
    return await ipc.invoke('fs:writeJson', { relPath, data: content });
  }, { projectId, bookId, verseText });

  if (!ok) {
    throw new Error('Failed to seed translation draft for review automation.');
  }
}

async function run() {
  if (process.platform !== 'darwin') {
    throw new Error('This script targets macOS click-through parity validation.');
  }

  const stamp = Date.now();
  const fixtureDir = path.join(os.tmpdir(), `ts-desktop-pw-${stamp}`);
  const exportDir = path.join(fixtureDir, 'exports');
  await fsp.mkdir(exportDir, { recursive: true });

  const usfmFixturePath = path.join(fixtureDir, 'valid-gen.usfm');
  const importedUsfmName = `PWUSFM ${stamp}`;
  const usfmText = ['\\id PWG', `\\h ${importedUsfmName}`, '\\c 1', '\\v 1 In the beginning.'].join('\n');
  await fsp.writeFile(usfmFixturePath, usfmText, 'utf8');

  const exportUsfmPath = path.join(exportDir, 'print-export.usfm');
  const exportBackupPath = path.join(exportDir, 'print-export.tstudio');

  const status = {
    'P-01': { status: 'BLOCKED', notes: '' },
    'P-02': { status: 'BLOCKED', notes: '' },
    'P-03': { status: 'BLOCKED', notes: '' },
    'P-04': { status: 'BLOCKED', notes: '' },
    'I-03': { status: 'BLOCKED', notes: '' },
    'X-02': { status: 'BLOCKED', notes: '' },
    'T-03': { status: 'BLOCKED', notes: '' },
    'A-01': { status: 'BLOCKED', notes: '' },
    'A-02': { status: 'BLOCKED', notes: '' },
  };

  let electronApp;
  try {
    console.log('[pw] launching electron');
    electronApp = await electron.launch({
      args: ['.'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        PLAYWRIGHT: '1',
      },
    });

    console.log('[pw] waiting for main window');
    const page = await waitForMainWindow(electronApp);
    await page.waitForLoadState('domcontentloaded');
    console.log('[pw] patching dialog handlers');
    await patchDialogHandlers(electronApp);
    await waitForHash(page, /#\/home/);
    console.log('[pw] home ready');

    const projectOneName = `PW Genesis ${stamp}`;
    const projectTwoName = `PW Exodus ${stamp}`;

    let projectOneId = null;
    let projectTwoId = null;

    try {
      console.log('[pw] P-01');
      projectOneId = await createProjectFromHome(page, projectOneName, 'Genesis');
      await clickSidebar(page, 'Home');
      await page.getByText(projectOneName, { exact: false }).first().waitFor();
      status['P-01'] = {
        status: 'PASS',
        notes: `Created project ${projectOneId} and project appears on Home.`,
      };
    } catch (error) {
      status['P-01'] = { status: 'FAIL', notes: error.message };
    }

    try {
      console.log('[pw] create second project');
      projectTwoId = await createProjectFromHome(page, projectTwoName, 'Exodus');
      await clickSidebar(page, 'Home');
      await page.getByText(projectTwoName, { exact: false }).first().waitFor();
    } catch (error) {
      // keep going, individual checks below will fail with context
    }

    try {
      console.log('[pw] P-02');
      await page.getByText(projectOneName, { exact: false }).first().click();
      const hash = await waitForHash(page, /#\/translate\?projectId=/);
      const openedId = parseProjectIdFromHash(hash);
      if (!openedId) throw new Error('No projectId in translate hash');
      status['P-02'] = {
        status: 'PASS',
        notes: `Opened existing project from Home and reached translate route (${openedId}).`,
      };
    } catch (error) {
      status['P-02'] = { status: 'FAIL', notes: error.message };
    }

    try {
      console.log('[pw] P-03');
      await clickSidebar(page, 'Home');
      await page.getByText(projectOneName, { exact: false }).first().click();
      await waitForHash(page, /#\/translate\?projectId=/);
      await clickSidebar(page, 'Home');
      await page.getByText(projectTwoName, { exact: false }).first().click();
      await waitForHash(page, /#\/translate\?projectId=/);
      await clickSidebar(page, 'Home');
      status['P-03'] = {
        status: 'PASS',
        notes: 'Reopened projects repeatedly via Home list; recents/open flow is interactive and stable.',
      };
    } catch (error) {
      status['P-03'] = { status: 'FAIL', notes: error.message };
    }

    try {
      console.log('[pw] T-03');
      if (!projectTwoId) throw new Error('Missing second project for review workflow');
      await seedDraftForReview(page, projectTwoId, 'exo', `Playwright seeded translation ${stamp}`);
      await page.evaluate(id => {
        window.location.hash = `/review?projectId=${encodeURIComponent(id)}`;
      }, projectTwoId);
      await waitForHash(page, new RegExp(`#\\/review\\?projectId=${projectTwoId}`));

      await page.getByRole('button', { name: /^1:1/ }).first().click();
      await page.getByLabel('Reviewer Note').fill(`Playwright review note ${stamp}`);
      await page.getByRole('button', { name: 'Approve Verse' }).click();
      await page.getByText('Review saved.').first().waitFor({ timeout: 15000 });

      await clickSidebar(page, 'Translate');
      await waitForHash(page, new RegExp(`#\\/translate\\?projectId=${projectTwoId}`));
      await clickSidebar(page, 'Review');
      await waitForHash(page, new RegExp(`#\\/review\\?projectId=${projectTwoId}`));
      await page.getByRole('button', { name: /^1:1/ }).first().click();

      const noteValue = await page.getByLabel('Reviewer Note').inputValue();
      if (!noteValue.includes(String(stamp))) {
        throw new Error('Reviewer note did not persist after route changes.');
      }
      await page.getByText('Approved').first().waitFor();

      status['T-03'] = {
        status: 'PASS',
        notes: 'Review queue status/note actions persisted across Translate/Review navigation.',
      };
    } catch (error) {
      status['T-03'] = { status: 'FAIL', notes: error.message };
    }

    try {
      console.log('[pw] I-03/X-02');
      await clickSidebar(page, 'Print');
      await waitForHash(page, /#\/print/);
      await page.getByRole('button', { name: 'Open Export Tool' }).click();
      await page.getByText('Export Project').first().waitFor();
      await waitForEnabled(page.getByRole('button', { name: 'Export' }));

      await setDialogQueues(electronApp, { save: [exportUsfmPath] });
      await page.getByRole('button', { name: 'Export' }).click();
      await page.getByText('Exported to').first().waitFor({ timeout: 15000 });
      await waitForFile(exportUsfmPath, 15000);

      const exported = await fsp.readFile(exportUsfmPath, 'utf8');
      if (!exported.includes('\\id')) {
        throw new Error('USFM export did not include expected USFM header.');
      }

      status['I-03'] = {
        status: 'PASS',
        notes: `Exported USFM from Print flow to ${exportUsfmPath}.`,
      };

      await page.getByText('Project Backup (.tstudio)').first().click();
      await setDialogQueues(electronApp, { save: [exportBackupPath] });
      await page.getByRole('button', { name: 'Export' }).click();
      await page.getByText('Exported to').first().waitFor({ timeout: 15000 });
      await waitForFile(exportBackupPath, 15000);
      const backupText = await fsp.readFile(exportBackupPath, 'utf8');
      const parsed = JSON.parse(backupText);
      if (parsed.format !== 'ts-desktop-backup-v1') {
        throw new Error('Backup export format marker mismatch.');
      }

      status['X-02'] = {
        status: 'PASS',
        notes: `Print export flow produced USFM and backup outputs in ${exportDir}.`,
      };
    } catch (error) {
      status['I-03'] = status['I-03'].status === 'PASS' ? status['I-03'] : { status: 'FAIL', notes: error.message };
      status['X-02'] = { status: 'FAIL', notes: error.message };
    } finally {
      const closeButton = page.getByRole('button', { name: /Close|Cancel/ });
      if ((await closeButton.count()) > 0) {
        await closeButton.first().click().catch(() => {});
      }
    }

    try {
      console.log('[pw] P-04');
      if (!projectOneId) throw new Error('Missing first project ID for delete test.');
      await clickSidebar(page, 'Home');
      await waitForHash(page, /#\/home/);
      const row = page
        .locator('li', {
          has: page.locator('svg[data-testid="DeleteIcon"]'),
        })
        .filter({ hasText: projectOneName })
        .first();
      const deleteButton = row
        .locator('svg[data-testid="DeleteIcon"]')
        .first()
        .locator('xpath=ancestor::button[1]');
      await deleteButton.click({ timeout: 15000 });
      await page.waitForTimeout(800);
      const existsAfterDelete = await page.evaluate(async id => {
        const repo = window.projectRepository;
        if (!repo?.getProjectById) return true;
        const found = await repo.getProjectById(id);
        return !!found;
      }, projectOneId);
      if (existsAfterDelete) {
        throw new Error(`Project ${projectOneId} still exists after delete action.`);
      }
      status['P-04'] = {
        status: 'PASS',
        notes: `Deleted project ${projectOneName} from Home and repository no longer returns it.`,
      };
    } catch (error) {
      status['P-04'] = { status: 'FAIL', notes: error.message };
    }

    try {
      console.log('[pw] A-01/A-02');
      await clickSidebar(page, 'Home');
      await waitForHash(page, /#\/home/);
      const initialCount = electronApp.windows().length;
      await page.getByRole('button', { name: 'Academy' }).click();

      const started = Date.now();
      let academyCount = initialCount;
      while (Date.now() - started < 10000) {
        academyCount = electronApp.windows().length;
        if (academyCount > initialCount) break;
        await sleep(150);
      }
      if (academyCount <= initialCount) {
        throw new Error('Academy window did not open.');
      }

      status['A-01'] = {
        status: 'PASS',
        notes: `Academy window opened (window count ${initialCount} -> ${academyCount}).`,
      };

      const academyPage = electronApp
        .windows()
        .find(windowPage => windowPage !== page);
      if (!academyPage) {
        throw new Error('Academy page handle not found after opening window.');
      }
      await academyPage.close();

      const remaining = electronApp.windows().length;
      if (remaining !== 1) {
        throw new Error(`Expected one window after closing academy, found ${remaining}.`);
      }

      await clickSidebar(page, 'Updates');
      await waitForHash(page, /#\/updates/);
      await page.getByText('Check For Updates').first().waitFor();
      status['A-02'] = {
        status: 'PASS',
        notes: 'Closed Academy window and main window remained functional.',
      };
    } catch (error) {
      if (status['A-01'].status !== 'PASS') {
        status['A-01'] = { status: 'FAIL', notes: error.message };
      }
      status['A-02'] = { status: 'FAIL', notes: error.message };
    }

    const summaryPath = path.join(fixtureDir, 'clickthrough-summary.json');
    await fsp.writeFile(summaryPath, JSON.stringify(status, null, 2), 'utf8');

    Object.entries(status).forEach(([id, result]) => {
      console.log(`${id}: ${result.status} - ${result.notes}`);
    });
    console.log(`Summary file: ${summaryPath}`);

    const failures = Object.values(status).filter(item => item.status !== 'PASS');
    if (failures.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (electronApp) {
      const child = electronApp.process();
      await Promise.race([electronApp.close(), sleep(5000)]).catch(() => {});
      if (child && !child.killed) {
        try {
          child.kill('SIGKILL');
        } catch {
          // no-op
        }
      }
    }
  }
  process.exit(process.exitCode || 0);
}

run().catch(error => {
  console.error(`Click-through script failed: ${error.message}`);
  process.exit(1);
});
