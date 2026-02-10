import { createRoot } from 'react-dom/client';
import { version as reactVersion } from 'react';
import { version as reactDomVersion } from 'react-dom';
import App from './App';
import DevErrorBoundary from './components/DevErrorBoundary';
import { send } from './utils/ipc';

// Initialize the app
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

console.log('[renderer] Mounting React app');
try {
  console.log('[renderer] electronAPI available:', typeof (window as any).electronAPI);
  // Log React/ReactDOM versions to main log for diagnostics
  try {
    console.log(`[renderer] React ${reactVersion}, ReactDOM ${reactDomVersion}`);
    send('loading-status', `react-versions ${reactVersion}/${reactDomVersion}`);
  } catch {}

  const root = createRoot(container);
  root.render(
    <DevErrorBoundary>
      <App />
    </DevErrorBoundary>
  );
} catch (e) {
  console.error('[renderer] React render failed:', e);
  try {
    send('renderer-error', {
      message: e && (e as any).message,
      stack: e && (e as any).stack,
    });
  } catch {}
  // crude fallback to display something
  const el = document.createElement('pre');
  el.textContent = '[renderer] React render failed: ' + String((e && (e as any).message) || e);
  document.body.appendChild(el);
}

// Signal to Electron that the React app has loaded
// Prefer Electron's ipcRenderer via window.require when available
function notifyMainLoaded() {
  try {
    console.log('[renderer] Sending main-loading-done');
    if (send('main-loading-done')) return;
    send('loading-status', 'renderer-mounted');
  } catch {}
}

// Try immediately after first render and once more after a short delay
notifyMainLoaded();
setTimeout(notifyMainLoaded, 500);

// Report runtime errors to main for logging
try {
  window.addEventListener('error', (e) => {
    send('renderer-error', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: (e as any).error && (e as any).error.stack,
    });
  });
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    send('renderer-error', {
      message: 'Unhandled promise rejection',
      reason: (e as any).reason && ((e as any).reason.message || String((e as any).reason)),
      stack: (e as any).reason && (e as any).reason.stack,
    });
  });
} catch {}
