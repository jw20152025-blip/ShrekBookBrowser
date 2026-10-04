const fs = require('fs');
const path = require('path');
const { load } = require('cheerio');
const robotsParser = require('robots-parser');

const ROOT = path.join(__dirname);
const DEFAULT_CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const DEFAULT_SEEDS = JSON.parse(fs.readFileSync(path.join(ROOT, 'seeds.json'), 'utf8'));

function runtimeFiles(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const configFile = path.join(dataDir, 'config.json');
  const seedsFile = path.join(dataDir, 'seeds.json');
  const indexFile = path.join(dataDir, 'index.json');
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, JSON.stringify(DEFAULT_CONFIG, null, 2));
  if (!fs.existsSync(seedsFile)) fs.writeFileSync(seedsFile, JSON.stringify(DEFAULT_SEEDS, null, 2));
  if (!fs.existsSync(indexFile)) fs.writeFileSync(indexFile, JSON.stringify({ generatedAt: null, count: 0, pages: [] }, null, 2));
  return {
    config: JSON.parse(fs.readFileSync(configFile, 'utf8')),
    seeds: JSON.parse(fs.readFileSync(seedsFile, 'utf8')),
    indexFile
  };
}

const STOPWORDS = new Set('the a an and or but if then else for from with into onto of to in on at by is are was were be been being this that these those it its as not no yes you your we our they their he she his her them what when where why how about over under more most less very can could should would will just than too also i me my'.split(/\s+/));

function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    u.hash = '';
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch { return null; }
}

function tokens(text, minWordLength) {
  return [...new Set(String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(w => w.length >= minWordLength && !STOPWORDS.has(w)))];
}

function cleanText($, selector) {
  $(selector).find('script,style,noscript,template,svg').remove();
  return $(selector).text().replace(/\s+/g, ' ').trim();
}

async function fetchRobots(origin) {
  try {
    const response = await fetch(`${origin}/robots.txt`, { headers: { 'User-Agent': CONFIG.userAgent } });
    const text = await response.text();
    return robotsParser(`${origin}/robots.txt`, text);
  } catch {
    return robotsParser(`${origin}/robots.txt`, 'User-agent: *\nAllow: /');
  }
}

async function crawl(options = {}) {
  const dataDir = options.dataDir || ROOT;
  const runtime = runtimeFiles(dataDir);
  const CONFIG = runtime.config;
  const SEEDS = runtime.seeds;
  const INDEX_FILE = runtime.indexFile;
  const pages = new Map();
  const queue = SEEDS.map(url => ({ url: normalizeUrl(url), depth: 0 })).filter(x => x.url);
  const robots = new Map();
  const seedHosts = new Set(SEEDS.map(s => { try { return new URL(s).hostname; } catch { return ''; } }).filter(Boolean));

  while (queue.length && pages.size < CONFIG.maxPages) {
    const item = queue.shift();
    if (!item?.url || pages.has(item.url) || item.depth > CONFIG.maxDepth) continue;
    const url = new URL(item.url);
    const host = url.hostname;
    if (CONFIG.sameHostOnly && !seedHosts.has(host)) continue;

    const origin = url.origin;
    if (!robots.has(origin)) robots.set(origin, await fetchRobots(origin));
    if (!robots.get(origin).isAllowed(item.url, CONFIG.userAgent)) continue;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
      const response = await fetch(item.url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': CONFIG.userAgent, 'Accept': 'text/html,application/xhtml+xml' }
      });
      clearTimeout(timer);
      if (!response.ok) continue;
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) continue;

      const html = await response.text();
      const $ = load(html);
      const title = $('title').first().text().trim() || $('h1').first().text().trim() || item.url;
      const description = $('meta[name="description"]').attr('content')?.trim() || '';
      const headings = $('h1,h2,h3').map((_i, el) => $(el).text()).get().join(' ');
      const body = cleanText($, 'body').slice(0, 30000);
      const links = $('a[href]').map((_i, el) => $(el).attr('href')).get();
      const tags = tokens(`${title} ${headings} ${description}`, CONFIG.minWordLength).slice(0, 8);
      pages.set(item.url, {
        url: response.url || item.url,
        title,
        description,
        headings,
        body,
        tags,
        tokens: tokens(`${title} ${description} ${headings} ${body}`, CONFIG.minWordLength),
        domain: new URL(response.url || item.url).hostname,
        fetchedAt: new Date().toISOString()
      });

      for (const href of links) {
        const next = normalizeUrl(new URL(href, response.url || item.url).toString());
        if (!next) continue;
        const nextHost = new URL(next).hostname;
        if (CONFIG.sameHostOnly && !seedHosts.has(nextHost)) continue;
        if (!pages.has(next) && !queue.some(q => q.url === next)) queue.push({ url: next, depth: item.depth + 1 });
      }
      console.log(`Indexed ${pages.size}/${CONFIG.maxPages}: ${item.url}`);
    } catch (error) {
      console.log(`Skipped ${item.url}: ${error.message}`);
    }
  }

  fs.writeFileSync(INDEX_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), count: pages.size, pages: [...pages.values()] }, null, 2));
  console.log(`Saved ${pages.size} pages to ${INDEX_FILE}`);
}

if (require.main === module) crawl().catch(err => { console.error(err); process.exit(1); });
module.exports = { crawl };
