const http = require('http');
const fs = require('fs');
const path = require('path');
const { load } = require('cheerio');
const { crawl } = require('./crawler');

const PORT = Number(process.env.SHREK_BROWSER_PORT || 8787);
const INDEX_FILE = path.join(__dirname, 'index.json');
const STATIC_ROOT = __dirname;
let dataDir = __dirname;
let indexFile = INDEX_FILE;

function readIndex() {
  try { return JSON.parse(fs.readFileSync(indexFile, 'utf8')); }
  catch { return { pages: [] }; }
}

function tokenize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(Boolean);
}

function makeSnippet(text, terms) {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  if (!source) return '';
  const lower = source.toLowerCase();
  let at = 0;
  for (const term of terms) {
    const found = lower.indexOf(term);
    if (found >= 0) { at = found; break; }
  }
  const start = Math.max(0, at - 90);
  return `${start ? '…' : ''}${source.slice(start, start + 280)}${source.length > start + 280 ? '…' : ''}`;
}

function scorePage(page, terms) {
  let score = 0;
  const title = tokenize(page.title);
  const description = tokenize(page.description);
  const headings = tokenize(page.headings);
  const body = tokenize(page.body);
  for (const term of terms) {
    if (title.includes(term)) score += 40;
    if (description.includes(term)) score += 20;
    if (headings.includes(term)) score += 14;
    score += Math.min(12, body.filter(x => x === term).length * 2);
    if (page.tags?.includes(term)) score += 8;
  }
  return score;
}

function search(q, limit = 12) {
  const index = readIndex();
  const terms = [...new Set(tokenize(q))].slice(0, 12);
  if (!terms.length) return { query: q, count: 0, results: [], generatedAt: index.generatedAt };

  const ranked = index.pages
    .map(page => ({ page, score: scorePage(page, terms) }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score || String(a.page.title).localeCompare(String(b.page.title)))
    .slice(0, Math.max(1, Math.min(50, Number(limit) || 12)))
    .map(({ page, score }) => ({
      url: page.url,
      title: page.title,
      description: page.description,
      snippet: makeSnippet(page.body || page.description, terms),
      domain: page.domain,
      tags: page.tags || [],
      score
    }));

  return { query: q, count: ranked.length, results: ranked, generatedAt: index.generatedAt || null, indexedPages: index.pages.length };
}

async function scrapeUrl(url) {
  const target = new URL(url);
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Only HTTP(S) URLs are supported');
  const response = await fetch(target.toString(), { redirect: 'follow', headers: { 'User-Agent': 'ShrekBookBot/0.1' } });
  const html = await response.text();
  const $ = load(html);
  $('script,style,noscript,template,svg').remove();
  return {
    url: response.url || target.toString(),
    title: $('title').first().text().trim(),
    description: $('meta[name="description"]').attr('content')?.trim() || '',
    headings: $('h1,h2,h3').map((_i, el) => $(el).text().replace(/\s+/g, ' ').trim()).get(),
    text: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 20000),
    links: $('a[href]').map((_i, el) => new URL($(el).attr('href'), response.url || target.toString()).toString()).get().slice(0, 100),
    status: response.status
  };
}

const server = http.createServer(async (req, res) => {
  const origin = `http://127.0.0.1:${PORT}`;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const url = new URL(req.url, origin);
    if (url.pathname === '/api/health') return send(res, 200, { ok: true, index: readIndex().count || 0 });
    if (url.pathname === '/api/search') {
      return send(res, 200, search(url.searchParams.get('q') || '', url.searchParams.get('limit')));
    }
    if (url.pathname === '/api/crawl' && req.method === 'POST') {
      crawl({ dataDir }).catch(console.error);
      return send(res, 202, { ok: true, message: 'Crawler started' });
    }
    if (url.pathname === '/api/scrape') {
      const target = url.searchParams.get('url');
      if (!target) return send(res, 400, { error: 'Missing url' });
      return send(res, 200, await scrapeUrl(target));
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return serveFile(res, path.join(STATIC_ROOT, 'search-home.html'), 'text/html; charset=utf-8');
    }
    send(res, 404, { error: 'Not found' });
  } catch (error) {
    send(res, 500, { error: error.message });
  }
});

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
function serveFile(res, file, type) {
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

function start(options = {}) {
  dataDir = options.dataDir || __dirname;
  indexFile = path.join(dataDir, 'index.json');
  fs.mkdirSync(dataDir, { recursive: true });
  const defaultIndex = { generatedAt: null, count: 0, pages: [] };
  if (!fs.existsSync(indexFile)) fs.writeFileSync(indexFile, JSON.stringify(defaultIndex, null, 2));
  if (!server.listening) server.listen(options.port || PORT, '127.0.0.1', () => {
    console.log(`ShrekSearch server listening at http://127.0.0.1:${options.port || PORT}`);
  });
  return server;
}

if (require.main === module) start();
module.exports = { start, search, scrapeUrl };
