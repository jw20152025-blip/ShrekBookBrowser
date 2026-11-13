'use strict';

const $ = id => document.getElementById(id);
const api = window.shrekBrowser;
let appState = null;
let library = { cards: [], bookmarks: [] };
let libraryTab = 'cards';
let searchResults = [];
let toastTimer = null;

const defaults = { theme: 'midnight', accent: 'mint', density: 'comfortable' };
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

function safeUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2600);
}

function showPanel(id, visible = true) {
  $(id).classList.toggle('hidden', !visible);
}

function closeDrawers(except = '') {
  ['custom-panel', 'library-panel', 'summary-panel', 'command-palette'].forEach(id => {
    if (id !== except) showPanel(id, false);
  });
}

function renderTabs(tabs) {
  $('tab-strip').replaceChildren();
  for (const tab of tabs || []) {
    const item = document.createElement('div');
    item.className = 'tab' + (tab.active ? ' active' : '');
    const title = document.createElement('span');
    title.textContent = tab.loading ? 'Loading…' : (tab.title || 'New tab');
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.title = 'Close tab';
    close.addEventListener('click', event => {
      event.stopPropagation();
      api.closeTab(tab.id);
    });
    item.append(title, close);
    item.addEventListener('click', () => api.selectTab(tab.id));
    $('tab-strip').append(item);
  }

  const active = (tabs || []).find(tab => tab.active);
  const isHome = !active || active.url === 'shrek://home';
  $('home-view').classList.toggle('hidden', !isHome);
  $('omnibox').value = active?.url === 'shrek://home' ? '' : (active?.url || '');
  $('back').disabled = !active?.canGoBack;
  $('forward').disabled = !active?.canGoForward;
}

function resultCard(entry, options = {}) {
  const url = safeUrl(entry.url);
  if (!url) return '';
  const title = escapeHTML(entry.title || url);
  const domain = escapeHTML(entry.domain || new URL(url).hostname);
  const description = escapeHTML(entry.description || entry.snippet || 'Open this source to explore.');
  const tags = (Array.isArray(entry.tags) ? entry.tags : []).slice(0, 4)
    .map(tag => '<i>' + escapeHTML(tag) + '</i>').join('');
  const saved = options.saved === true;
  const kind = options.kind || '';
  const id = escapeHTML(entry.id || '');
  let actions = '';

  if (saved) {
    actions = '<button data-action="open">Open ↗</button><button data-action="brief">Page brief</button>' +
      '<button data-action="remove" data-kind="' + escapeHTML(kind) + '" data-id="' + id + '">Remove</button>';
  } else {
    actions = '<button data-action="open">Open ↗</button><button data-action="brief">Page brief</button>' +
      '<button data-action="save">＋ Knowledge card</button><button data-action="bookmark">☆ Bookmark</button>';
  }

  return '<article class="result-card" data-url="' + escapeHTML(url) + '">' +
    '<div class="result-domain"><span class="domain-mark">↗</span><span>' + domain + '</span></div>' +
    '<h3>' + title + '</h3><p>' + description + '</p>' +
    (tags ? '<div class="tag-row">' + tags + '</div>' : '') +
    '<div class="card-actions">' + actions + '</div></article>';
}

function renderResults(items) {
  searchResults = Array.isArray(items) ? items : [];
  $('results').innerHTML = searchResults.length
    ? searchResults.map(item => resultCard(item)).join('')
    : '<div class="empty-state">No matching pages were found in your local index. Try another search or refresh ShrekSearch.</div>';
}

async function runSearch(query) {
  const value = String(query || '').trim();
  if (!value) return toast('Type a topic or question to search.');
  $('search-section').classList.remove('hidden');
  $('results-title').textContent = value;
  $('results-meta').textContent = 'Searching your local index…';
  $('results').innerHTML = '<div class="empty-state">Searching ShrekSearch…</div>';

  try {
    const response = await api.search(value, { limit: 24 });
    $('results-meta').textContent = (response.count || 0) + ' results · ' +
      (response.indexedPages || 0) + ' indexed pages';
    renderResults(response.results || []);
    $('search-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    $('results-meta').textContent = 'Search is unavailable';
    $('results').innerHTML = '<div class="empty-state">' + escapeHTML(error.message) + '</div>';
  }
}

function renderLibrary() {
  const items = libraryTab === 'cards' ? library.cards : library.bookmarks;
  $('library-content').innerHTML = items.length
    ? items.map(item => resultCard(item, { saved: true, kind: libraryTab })).join('')
    : '<div class="empty-state">Nothing saved here yet. Find a source and add it to your library.</div>';
}

async function refreshLibrary() {
  library = await api.getLibrary();
  library.cards = Array.isArray(library.cards) ? library.cards : [];
  library.bookmarks = Array.isArray(library.bookmarks) ? library.bookmarks : [];
  const total = library.cards.length + library.bookmarks.length;
  $('saved-count').textContent = total;
  $('card-count').textContent = library.cards.length;
  $('bookmark-count').textContent = library.bookmarks.length;
  $('card-tab-count').textContent = library.cards.length;
  $('bookmark-tab-count').textContent = library.bookmarks.length;
  renderLibrary();

  const quick = [...library.cards, ...library.bookmarks].slice(0, 7);
  $('quick-library').innerHTML = quick.length
    ? quick.map(item => '<button class="quick-item" data-quick-url="' + escapeHTML(item.url) +
      '"><b>' + escapeHTML(item.title) + '</b><small>' + escapeHTML(item.domain) + '</small></button>').join('')
    : '<div class="empty-state">Your saved sources will appear here.</div>';
}

function showLibrary() {
  document.querySelectorAll('[data-view]').forEach(button =>
    button.classList.toggle('active', button.dataset.view === 'library'));
  $('discover-view').classList.add('hidden');
  $('library-view').classList.remove('hidden');
  refreshLibrary().catch(error => toast(error.message));
}

function showDiscover() {
  document.querySelectorAll('[data-view]').forEach(button =>
    button.classList.toggle('active', button.dataset.view === 'discover'));
  $('library-view').classList.add('hidden');
  $('discover-view').classList.remove('hidden');
}

function applySettings() {
  const settings = { ...defaults, ...(appState?.settings || {}) };
  document.body.dataset.theme = settings.theme;
  document.body.dataset.accent = settings.accent;
  document.body.dataset.density = settings.density;
  $('theme-select').value = settings.theme;
  $('accent-select').value = settings.accent;
  $('density-select').value = settings.density;
}

async function setSetting(key, value) {
  await api.setSetting(key, value);
  appState.settings[key] = value;
  applySettings();
  toast('Preference saved');
}

function extractiveBrief(text) {
  const sentences = String(text || '').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) || [];
  const words = String(text || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [];
  const frequency = Object.create(null);
  words.forEach(word => frequency[word] = (frequency[word] || 0) + 1);
  return sentences.map((sentence, index) => {
    const terms = sentence.toLowerCase().match(/[a-z0-9]{3,}/g) || [];
    const score = terms.reduce((sum, word) => sum + Math.log1p(frequency[word] || 0), 0) /
      Math.max(1, Math.sqrt(sentence.length));
    return { sentence: sentence.trim(), index, score };
  }).filter(item => item.sentence.length > 45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .sort((a, b) => a.index - b.index)
    .map(item => item.sentence);
}

async function makeBrief(url, fallbackTitle) {
  closeDrawers('summary-panel');
  showPanel('summary-panel', true);
  $('summary-title').textContent = 'Preparing page brief…';
  $('summary-content').textContent = 'Reading the source page…';
  try {
    const page = await api.scrape(url);
    const points = extractiveBrief(page.text);
    const title = page.title || fallbackTitle || 'Untitled page';
    $('summary-title').textContent = title;
    $('summary-content').innerHTML =
      '<div class="source-meta"><b>' + escapeHTML(title) + '</b><small>' +
      escapeHTML(page.url || url) + '</small></div><h3>Key takeaways</h3>' +
      (points.length ? '<ol>' + points.map(point => '<li>' + escapeHTML(point) + '</li>').join('') + '</ol>' :
        '<p class="muted">This page did not contain enough readable text for a brief.</p>') +
      '<button id="save-brief" class="drawer-action">＋ Save to knowledge cards</button>';
    $('save-brief').addEventListener('click', async () => {
      await api.saveCard({
        url: page.url || url,
        title,
        description: page.description || points.slice(0, 2).join(' '),
        summary: points.join('\n'),
        tags: []
      });
      await refreshLibrary();
      toast('Brief saved to your knowledge cards');
    });
  } catch (error) {
    $('summary-content').textContent = 'Could not create a page brief: ' + error.message;
  }
}

async function refreshIndex() {
  try {
    const result = await api.crawl();
    toast(result.message || 'ShrekSearch refresh started');
  } catch (error) {
    toast('Could not refresh the index: ' + error.message);
  }
}

async function saveSearchResult(card, action) {
  const url = safeUrl(card.dataset.url);
  const entry = searchResults.find(item => safeUrl(item.url) === url) || {};
  const payload = {
    url,
    title: entry.title || card.querySelector('h3')?.textContent || url,
    description: entry.description || entry.snippet || card.querySelector('p')?.textContent || '',
    domain: entry.domain || (url ? new URL(url).hostname : ''),
    tags: entry.tags || []
  };
  if (action === 'bookmark') await api.saveBookmark(payload);
  else await api.saveCard(payload);
  await refreshLibrary();
  toast(action === 'bookmark' ? 'Bookmark saved' : 'Knowledge card saved');
}

document.addEventListener('click', async event => {
  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    const card = actionButton.closest('.result-card');
    const url = safeUrl(card?.dataset.url);
    if (!url) return;
    try {
      const action = actionButton.dataset.action;
      if (action === 'open') await api.newTab(url);
      if (action === 'brief') await makeBrief(url, card.querySelector('h3')?.textContent);
      if (action === 'save' || action === 'bookmark') await saveSearchResult(card, action);
      if (action === 'remove') {
        if (actionButton.dataset.kind === 'bookmarks') await api.removeBookmark(actionButton.dataset.id);
        else await api.removeCard(actionButton.dataset.id);
        await refreshLibrary();
        toast('Removed from your library');
      }
    } catch (error) { toast(error.message); }
  }

  const quick = event.target.closest('[data-quick-url]');
  if (quick) await api.newTab(quick.dataset.quickUrl);

  const command = event.target.closest('[data-command]');
  if (command) {
    showPanel('command-palette', false);
    const key = command.dataset.command;
    if (key === 'new') await api.newTab('shrek://home');
    if (key === 'library') showLibrary();
    if (key === 'settings') { closeDrawers('custom-panel'); showPanel('custom-panel'); }
    if (key === 'crawl') refreshIndex();
  }
});

$('new-tab').addEventListener('click', () => api.newTab('shrek://home'));
$('back').addEventListener('click', () => api.back());
$('forward').addEventListener('click', () => api.forward());
$('reload').addEventListener('click', () => api.reload());
$('go').addEventListener('click', () => api.navigate($('omnibox').value));
$('omnibox').addEventListener('keydown', event => {
  if (event.key === 'Enter') api.navigate(event.target.value);
});
$('search-button').addEventListener('click', () => runSearch($('home-search').value));
$('home-search').addEventListener('keydown', event => {
  if (event.key === 'Enter') runSearch(event.target.value);
});
$('bookmark-current').addEventListener('click', async () => {
  try {
    const url = await api.getUrl();
    const safe = safeUrl(url);
    if (!safe) return toast('Open a webpage before saving a bookmark.');
    await api.saveBookmark({ url: safe, title: safe, domain: new URL(safe).hostname });
    await refreshLibrary();
    toast('Current page bookmarked');
  } catch (error) { toast('Could not save bookmark: ' + error.message); }
});
$('library-button').addEventListener('click', async () => {
  closeDrawers('library-panel');
  await refreshLibrary();
  showPanel('library-panel');
});
$('customize').addEventListener('click', () => {
  closeDrawers('custom-panel');
  showPanel('custom-panel');
});
$('command').addEventListener('click', () => {
  closeDrawers('command-palette');
  showPanel('command-palette');
  $('command-input').focus();
});
$('crawl').addEventListener('click', refreshIndex);
$('close-custom').addEventListener('click', () => showPanel('custom-panel', false));
$('close-library').addEventListener('click', () => showPanel('library-panel', false));
$('close-summary').addEventListener('click', () => showPanel('summary-panel', false));
$('close-command').addEventListener('click', () => showPanel('command-palette', false));
$('open-full-library').addEventListener('click', () => {
  showPanel('library-panel', false);
  showLibrary();
});
$('clear-results').addEventListener('click', () => $('search-section').classList.add('hidden'));
$('library-refresh').addEventListener('click', () => refreshLibrary().then(() => toast('Library refreshed')));
document.querySelectorAll('[data-query]').forEach(button =>
  button.addEventListener('click', () => runSearch(button.dataset.query)));
document.querySelectorAll('[data-view]').forEach(button =>
  button.addEventListener('click', () => button.dataset.view === 'library' ? showLibrary() : showDiscover()));
document.querySelectorAll('[data-library-tab]').forEach(button => {
  button.addEventListener('click', () => {
    libraryTab = button.dataset.libraryTab;
    document.querySelectorAll('[data-library-tab]').forEach(item =>
      item.classList.toggle('active', item === button));
    renderLibrary();
  });
});
$('theme-select').addEventListener('change', event => setSetting('theme', event.target.value));
$('accent-select').addEventListener('change', event => setSetting('accent', event.target.value));
$('density-select').addEventListener('change', event => setSetting('density', event.target.value));
$('command-input').addEventListener('keydown', event => {
  if (event.key === 'Escape') showPanel('command-palette', false);
  if (event.key === 'Enter') {
    const query = event.target.value.trim();
    showPanel('command-palette', false);
    if (query) runSearch(query);
  }
});
$('check-update').addEventListener('click', async () => {
  try {
    const result = await api.checkUpdate();
    toast(result?.skipped ? 'Update checks are available in the installed build.' : 'Update check started.');
  } catch (error) { toast('Update check failed: ' + error.message); }
});

document.addEventListener('keydown', event => {
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    $('omnibox').focus();
    $('omnibox').select();
  }
  if (modifier && event.key.toLowerCase() === 't') {
    event.preventDefault();
    api.newTab('shrek://home');
  }
  if (modifier && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    closeDrawers('command-palette');
    showPanel('command-palette');
    $('command-input').focus();
  }
  if (event.key === 'Escape') closeDrawers();
});

async function updateIndexStatus() {
  try {
    const health = await fetch('http://127.0.0.1:8787/api/health').then(response => {
      if (!response.ok) throw new Error('Search service unavailable');
      return response.json();
    });
    $('status-dot').classList.add('online');
    $('status-title').textContent = 'Search index ready';
    $('status-text').textContent = (health.indexedPages || 0) + ' pages indexed';
  } catch {
    $('status-dot').classList.remove('online');
    $('status-title').textContent = 'Search index offline';
    $('status-text').textContent = 'Local service unavailable';
  }
}

async function init() {
  appState = await api.state();
  $('version').textContent = appState.version || '1.0';
  $('today-label').textContent = new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric'
  }).format(new Date()).toUpperCase();
  applySettings();
  renderTabs(appState.tabs || []);
  api.onTabsUpdate(renderTabs);
  await refreshLibrary();
  await updateIndexStatus();
}
init().catch(error => toast('Browser UI could not initialize: ' + error.message));
