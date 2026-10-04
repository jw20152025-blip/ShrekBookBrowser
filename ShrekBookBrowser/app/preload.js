const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shrekBrowser', {
  state: () => ipcRenderer.invoke('browser:get-state'),
  newTab: (url) => ipcRenderer.invoke('browser:new-tab', url),
  closeTab: (id) => ipcRenderer.invoke('browser:close-tab', id),
  selectTab: (id) => ipcRenderer.invoke('browser:select-tab', id),
  navigate: (value) => ipcRenderer.invoke('browser:navigate', value),
  back: () => ipcRenderer.invoke('browser:go-back'),
  forward: () => ipcRenderer.invoke('browser:go-forward'),
  reload: () => ipcRenderer.invoke('browser:reload'),
  hardReload: () => ipcRenderer.invoke('browser:hard-reload'),
  devtools: () => ipcRenderer.invoke('browser:devtools'),
  search: (query, options) => ipcRenderer.invoke('browser:search', query, options),
  openExternal: (url) => ipcRenderer.invoke('browser:open-external', url),
  getUrl: () => ipcRenderer.invoke('browser:get-url'),
  setSetting: (key, value) => ipcRenderer.invoke('browser:set-setting', key, value),
  checkUpdate: () => ipcRenderer.invoke('browser:check-update'),
  about: () => ipcRenderer.invoke('browser:about'),
  onTabsUpdate: (callback) => ipcRenderer.on('tabs:update', (_event, tabs) => callback(tabs)),
  onUpdate: (callback) => {
    ipcRenderer.on('update:available', () => callback('available'));
    ipcRenderer.on('update:downloaded', () => callback('downloaded'));
    ipcRenderer.on('update:error', (_event, error) => callback('error', error));
  }
});
