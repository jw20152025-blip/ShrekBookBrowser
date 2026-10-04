let appState = null;
let focusMode = false;

const $ = (id) => document.getElementById(id);
const tabStrip = $('tab-strip');
const homeView = $('home-view');
const results = $('results');
const omnibox = $('omnibox');
const homeSearch = $('home-search');
const customPanel = $('custom-panel');
const commandPalette = $('command-palette');
const status = $('status');

function toast(message) {
  status.textContent = message;
  status.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => status.classList.remove('show'), 2600);
}

function domainOf(url) {
  try { return new URL(url).hostname; } catch { return 'shreksearch'; }
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[ch]);
}

function renderTabs(tabs) {
  tabStrip.innerHTML = '';
  for (const tab of tabs) {
    const el = document.createElement('div');
    el.className = `tab${tab.active ? ' active' : ''}`;
    el.innerHTML = `<span>${tab.loading ? '◌' : '●'}</span><span class="tab-title">${escapeHtml(tab.title || 'New ShrekTab')}</span><button class="tab-close" aria-label="Close tab">×</button>`;
    el.addEventListener('click', (event) => {
      if (event.target.closest('.tab-close')) {
        window.shrekBrowser.closeTab(tab.id);
        return;
      }
      window.shrekBrowser.selectTab(tab.id);
    });
    tabStrip.appendChild(el);
  }
  const active = tabs.find(t => t.active);
  omnibox.value = active?.url?.startsWith('shrek://') ? '' : (active?.url || '');
  homeView.style.visibility = active?.url === 'shrek://home' ? 'visible' : 'hidden';
}

function renderResults(data) {
  results.innerHTML = '';
  if (!data?.results?.length) {
    results.innerHTML = `<div class="feature-card" style="grid-column:1/-1"><strong>No indexed matches yet.</strong><p>${escapeHtml(data?.message || 'Run the crawler with your own seed websites, then search again.')}</p></div>`;
    return;
  }
  for (const item of data.results) {
    const card = document.createElement('article');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-top"><span class="result-domain">${escapeHtml(item.domain || domainOf(item.url))}</span><span>${Math.round(item.score || 0)}</span></div>
      <h2 class="result-title">${escapeHtml(item.title || item.url)}</h2>
      <p class="result-snippet">${escapeHtml(item.snippet || item.description || '')}</p>
      <div class="result-tags">${(item.tags || []).slice(0,5).map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>
      <div class="result-actions"><button data-open>Open</button><button data-copy>Copy link</button></div>
    `;
    card.querySelector('[data-open]').addEventListener('click', () => window.shrekBrowser.newTab(item.url));
    card.querySelector('[data-copy]').addEventListener('click', async () => {
      await navigator.clipboard.writeText(item.url);
      toast('Link copied');
    });
    results.appendChild(card);
  }
}

async function performSearch(query) {
  const q = query.trim();
  if (!q) return;
  homeSearch.value = q;
  try {
    toast('ShrekSearch is thinking…');
    const data = await window.shrekBrowser.search(q, { limit: 12 });
    renderResults(data);
  } catch (error) {
    renderResults({ message: `Search service offline: ${error.message}` });
    toast('ShrekSearch is offline');
  }
}

function runCommand(command) {
  switch (command) {
    case 'new-tab': window.shrekBrowser.newTab('shrek://home'); break;
    case 'focus': toggleFocus(); break;
    case 'devtools': window.shrekBrowser.devtools(); break;
    case 'customize': customPanel.classList.toggle('hidden'); break;
    case 'reload': window.shrekBrowser.reload(); break;
  }
  commandPalette.classList.add('hidden');
}

function toggleFocus() {
  focusMode = !focusMode;
  document.body.classList.toggle('focus', focusMode);
  toast(focusMode ? 'Focus mode on' : 'Focus mode off');
}

$('new-tab').onclick = () => window.shrekBrowser.newTab('shrek://home');
$('back').onclick = () => window.shrekBrowser.back();
$('forward').onclick = () => window.shrekBrowser.forward();
$('reload').onclick = () => window.shrekBrowser.reload();
$('home').onclick = () => window.shrekBrowser.navigate('shrek://home');
$('focus-mode').onclick = toggleFocus;
$('customize').onclick = () => customPanel.classList.toggle('hidden');
$('close-custom').onclick = () => customPanel.classList.add('hidden');
$('command').onclick = () => commandPalette.classList.toggle('hidden');
$('home-search-button').onclick = () => performSearch(homeSearch.value);

homeSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') performSearch(homeSearch.value);
});

omnibox.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') window.shrekBrowser.navigate(omnibox.value);
});

for (const button of document.querySelectorAll('.quick-actions button')) {
  button.onclick = () => performSearch(button.dataset.query);
}

$('theme-select').onchange = async (event) => {
  document.body.className = document.body.className.replace(/\bpaper\b|\bforest\b/g, '').trim();
  if (event.target.value !== 'midnight') document.body.classList.add(event.target.value);
  await window.shrekBrowser.setSetting('theme', event.target.value);
};

$('compact-toggle').onchange = async (event) => {
  document.body.classList.toggle('compact', event.target.checked);
  await window.shrekBrowser.setSetting('compactTabs', event.target.checked);
};

$('scraper-toggle').onchange = async (event) => {
  await window.shrekBrowser.setSetting('scraperEnabled', event.target.checked);
  toast('Restart ShrekBook Browser to apply scraper service changes');
};

$('check-update').onclick = async () => {
  const result = await window.shrekBrowser.checkUpdate();
  toast(result?.skipped ? 'Updates check is available after packaging' : 'Update check started');
};
$('about-button').onclick = () => window.shrekBrowser.about();

document.querySelectorAll('[data-command]').forEach(button => {
  button.onclick = () => runCommand(button.dataset.command);
});

$('command-input').addEventListener('keydown', (event) => {
  if (event.key === 'Escape') commandPalette.classList.add('hidden');
  if (event.key === 'Enter') {
    const q = event.target.value.toLowerCase();
    const match = ['new-tab','focus','devtools','customize','reload'].find(c => c.replace('-', ' ').includes(q));
    if (match) runCommand(match);
  }
});

window.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
    event.preventDefault(); omnibox.focus(); omnibox.select();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); commandPalette.classList.toggle('hidden'); $('command-input').focus();
  }
  if (event.key === 'Escape') commandPalette.classList.add('hidden');
});

window.shrekBrowser.onTabsUpdate(renderTabs);
window.shrekBrowser.onUpdate((kind, error) => {
  if (kind === 'available') toast('A ShrekBook Browser update is downloading…');
  if (kind === 'downloaded') toast('Update ready — it will install on quit.');
  if (kind === 'error') toast(`Update check failed: ${error}`);
});

(async function boot() {
  appState = await window.shrekBrowser.state();
  const theme = appState.settings.theme || 'midnight';
  if (theme !== 'midnight') document.body.classList.add(theme);
  $('theme-select').value = theme;
  $('compact-toggle').checked = !!appState.settings.compactTabs;
  $('scraper-toggle').checked = !!appState.settings.scraperEnabled;
  document.body.classList.toggle('compact', !!appState.settings.compactTabs);
  renderTabs(appState.tabs);
})();
