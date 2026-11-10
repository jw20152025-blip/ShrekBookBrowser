const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('shrekBrowser',{
 state:()=>ipcRenderer.invoke('browser:get-state'),
 newTab:u=>ipcRenderer.invoke('browser:new-tab',u),closeTab:i=>ipcRenderer.invoke('browser:close-tab',i),selectTab:i=>ipcRenderer.invoke('browser:select-tab',i),
 navigate:v=>ipcRenderer.invoke('browser:navigate',v),back:()=>ipcRenderer.invoke('browser:go-back'),forward:()=>ipcRenderer.invoke('browser:go-forward'),
 reload:()=>ipcRenderer.invoke('browser:reload'),hardReload:()=>ipcRenderer.invoke('browser:hard-reload'),devtools:()=>ipcRenderer.invoke('browser:devtools'),
 search:(q,o)=>ipcRenderer.invoke('browser:search',q,o),scrape:u=>ipcRenderer.invoke('browser:scrape',u),crawl:()=>ipcRenderer.invoke('browser:crawl'),
 openExternal:u=>ipcRenderer.invoke('browser:open-external',u),getUrl:()=>ipcRenderer.invoke('browser:get-url'),setSetting:(k,v)=>ipcRenderer.invoke('browser:set-setting',k,v),
 getLibrary:()=>ipcRenderer.invoke('browser:get-library'),saveBookmark:x=>ipcRenderer.invoke('browser:save-bookmark',x),removeBookmark:i=>ipcRenderer.invoke('browser:remove-bookmark',i),
 saveCard:x=>ipcRenderer.invoke('browser:save-card',x),removeCard:i=>ipcRenderer.invoke('browser:remove-card',i),
 checkUpdate:()=>ipcRenderer.invoke('browser:check-update'),about:()=>ipcRenderer.invoke('browser:about'),
 onTabsUpdate:cb=>ipcRenderer.on('tabs:update',(_e,t)=>cb(t)),
 onUpdate:cb=>{ipcRenderer.on('update:available',()=>cb('available'));ipcRenderer.on('update:downloaded',()=>cb('downloaded'));ipcRenderer.on('update:error',(_e,e)=>cb('error',e&&e.message||e))}
});
