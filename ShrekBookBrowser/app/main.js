const {
  app,
  BrowserWindow,
  WebContentsView,
  ipcMain,
  session,
  shell,
  dialog
} = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const APP_UI_HEIGHT = 118;
const MIN_WEB_WIDTH = 420;
const SEARCH_PORT = 8787;

let mainWindow = null;
let selectedTabId = null;
let nextTabId = 1;
let searchServer = null;
let tabStore = new Map();
let settings = {
  theme: 'midnight',
  compactTabs: false,
  sidebar: true,
  homeUrl: 'shrek://home',
  searchUrl: 'http://127.0.0.1:8787/api/search',
  scraperEnabled: true,
  startupRestore: true
};

function dataFile() {
  return path.join(app.getPath('userData'), 'browser-settings.json');
}

function loadSettings() {
  try {
    settings = { ...settings, ...JSON.parse(fs.readFileSync(dataFile(), 'utf8')) };
  } catch {}
}

function saveSettings() {
  fs.mkdirSync(path.dirname(dataFile()), { recursive: true });
  fs.writeFileSync(dataFile(), JSON.stringify(settings, null, 2));
}

function appPreload() {
  return path.join(__dirname, 'preload.js');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 650,
    title: 'ShrekBook Browser',
    backgroundColor: '#0b0d12',
    show: false,
    webPreferences: {
      preload: appPreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (settings.startupRestore) {
      createTab(settings.homeUrl, true);
    } else {
      createTab(settings.homeUrl, true);
    }
  });

  mainWindow.on('resize', layoutActiveView);
  mainWindow.on('closed', () => {
    for (const tab of tabStore.values()) tab.view.webContents.close();
    tabStore.clear();
    mainWindow = null;
  });

  configureSecurity();
}

function configureSecurity() {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = new Set(['fullscreen']);
    callback(allowed.has(permission));
  });

  ses.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ showOverwriteConfirmation: true });
  });
}

function normalizeUrl(input) {
  const value = String(input || '').trim();
  if (!value) return settings.homeUrl;
  if (value.startsWith('shrek://')) return value;
  try {
    return new URL(value).toString();
  } catch {}
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) {
    return `https://${value}`;
  }
  return `http://127.0.0.1:${SEARCH_PORT}/?q=${encodeURIComponent(value)}`;
}

function createTab(url = settings.homeUrl, activate = true) {
  const id = String(nextTabId++);
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });

  const tab = {
    id,
    view,
    title: url === settings.homeUrl ? 'New ShrekTab' : 'Loading…',
    url,
    loading: false,
    favicon: ''
  };

  tabStore.set(id, tab);
  wireTabEvents(tab);

  if (activate) selectedTabId = id;

  if (url !== settings.homeUrl) view.webContents.loadURL(normalizeUrl(url));
  else view.webContents.loadURL('about:blank');

  layoutActiveView();
  notifyTabs();
  return id;
}

function wireTabEvents(tab) {
  const wc = tab.view.webContents;

  wc.on('did-start-loading', () => {
    tab.loading = true;
    notifyTabs();
  });

  wc.on('did-stop-loading', () => {
    tab.loading = false;
    notifyTabs();
  });

  wc.on('page-title-updated', (_event, title) => {
    tab.title = title || tab.url;
    notifyTabs();
  });

  wc.on('page-favicon-updated', (_event, favicons) => {
    tab.favicon = favicons?.[0] || '';
    notifyTabs();
  });

  wc.on('did-navigate', (_event, url) => {
    tab.url = url;
    tab.title = wc.getTitle() || url;
    notifyTabs();
  });

  wc.on('did-navigate-in-page', (_event, url) => {
    tab.url = url;
    notifyTabs();
  });

  wc.on('render-process-gone', (_event, details) => {
    tab.loading = false;
    tab.title = `Tab crashed (${details.reason})`;
    notifyTabs();
  });

  wc.setWindowOpenHandler(({ url }) => {
    createTab(url, true);
    return { action: 'deny' };
  });

  wc.on('will-navigate', (event, url) => {
    if (!/^https?:\/\//i.test(url)) {
      event.preventDefault();
      shell.openExternal(url).catch(() => {});
    }
  });
}

function selectTab(id) {
  if (!tabStore.has(id)) return;
  selectedTabId = id;
  layoutActiveView();
  notifyTabs();
}

function closeTab(id) {
  const tab = tabStore.get(id);
  if (!tab) return;
  try { tab.view.webContents.close(); } catch {}
  tabStore.delete(id);
  if (selectedTabId === id) {
    const ids = [...tabStore.keys()];
    selectedTabId = ids.at(-1) || createTab(settings.homeUrl, true);
  }
  layoutActiveView();
  notifyTabs();
}

function activeTab() {
  return selectedTabId ? tabStore.get(selectedTabId) : null;
}

function layoutActiveView() {
  if (!mainWindow) return;
  const bounds = mainWindow.getContentBounds();
  for (const [id, tab] of tabStore) {
    const visible = id === selectedTabId && tab.url !== settings.homeUrl;
    if (!visible) {
      try { mainWindow.contentView.removeChildView(tab.view); } catch {}
      continue;
    }
    const left = settings.sidebar ? 0 : 0;
    tab.view.setBounds({
      x: left,
      y: APP_UI_HEIGHT,
      width: Math.max(MIN_WEB_WIDTH, bounds.width - left),
      height: Math.max(260, bounds.height - APP_UI_HEIGHT)
    });
    try {
      mainWindow.contentView.addChildView(tab.view);
    } catch {}
  }
}

function notifyTabs() {
  if (!mainWindow) return;
  mainWindow.webContents.send('tabs:update', serializeTabs());
}

function serializeTabs() {
  return [...tabStore.values()].map(tab => ({
    id: tab.id,
    title: tab.title,
    url: tab.url,
    loading: tab.loading,
    favicon: tab.favicon,
    active: tab.id === selectedTabId,
    canGoBack: tab.view.webContents.canGoBack(),
    canGoForward: tab.view.webContents.canGoForward()
  }));
}

function startSearchServer() {
  const { start } = require(path.join(__dirname, '..', 'search', 'server.js'));
  const dataDir = path.join(app.getPath('userData'), 'shreksearch');
  searchServer = start({ port: SEARCH_PORT, dataDir });
}

async function search(query, options = {}) {
  const endpoint = settings.searchUrl;
  const target = `${endpoint}?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(options.limit || 12)}`;
  const response = await fetch(target);
  if (!response.ok) throw new Error(`Search server returned ${response.status}`);
  return response.json();
}

ipcMain.handle('browser:get-state', () => ({
  tabs: serializeTabs(),
  settings,
  version: app.getVersion()
}));

ipcMain.handle('browser:new-tab', (_event, url) => createTab(url || settings.homeUrl, true));
ipcMain.handle('browser:close-tab', (_event, id) => closeTab(id));
ipcMain.handle('browser:select-tab', (_event, id) => selectTab(id));
ipcMain.handle('browser:navigate', (_event, value) => {
  const tab = activeTab();
  if (!tab) return;
  const url = normalizeUrl(value);
  tab.url = url;
  if (url === settings.homeUrl) {
    tab.title = 'New ShrekTab';
    try { mainWindow.contentView.removeChildView(tab.view); } catch {}
  } else {
    tab.view.webContents.loadURL(url);
  }
  layoutActiveView();
  notifyTabs();
});
ipcMain.handle('browser:go-back', () => activeTab()?.view.webContents.goBack());
ipcMain.handle('browser:go-forward', () => activeTab()?.view.webContents.goForward());
ipcMain.handle('browser:reload', () => activeTab()?.view.webContents.reload());
ipcMain.handle('browser:hard-reload', () => activeTab()?.view.webContents.reloadIgnoringCache());
ipcMain.handle('browser:devtools', () => activeTab()?.view.webContents.openDevTools({ mode: 'detach' }));
ipcMain.handle('browser:search', (_event, query, options) => search(query, options));
ipcMain.handle('browser:open-external', (_event, url) => shell.openExternal(normalizeUrl(url)));
ipcMain.handle('browser:get-url', () => activeTab()?.url || settings.homeUrl);
ipcMain.handle('browser:set-setting', (_event, key, value) => {
  if (!(key in settings)) throw new Error('Unknown setting');
  settings[key] = value;
  saveSettings();
  layoutActiveView();
  return settings;
});
ipcMain.handle('browser:check-update', async () => {
  if (!app.isPackaged) return { skipped: true, reason: 'development' };
  return autoUpdater.checkForUpdatesAndNotify();
});
ipcMain.handle('browser:about', async () => {
  await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'ShrekBook Browser',
    message: `ShrekBook Browser v${app.getVersion()}`,
    detail: 'A customizable Chromium browser powered by your own ShrekSearch index.'
  });
});

app.whenReady().then(() => {
  loadSettings();
  if (settings.scraperEnabled) startSearchServer();
  createWindow();

  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', () => mainWindow?.webContents.send('update:available'));
    autoUpdater.on('update-downloaded', () => mainWindow?.webContents.send('update:downloaded'));
    autoUpdater.on('error', (err) => mainWindow?.webContents.send('update:error', String(err.message || err)));
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 6000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (searchServer) {
    try { searchServer.close(); } catch {}
  }
  saveSettings();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
