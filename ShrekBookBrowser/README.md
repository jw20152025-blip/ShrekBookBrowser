# ShrekBook Browser 0.4.0

ShrekBook Browser is a Windows desktop browser built with Electron. It combines multi-tab Chromium browsing with a research workspace powered by your own local ShrekSearch index.

## Run on Windows

Install Node.js 20.19 or newer. Open PowerShell in the folder containing this README and run:

```powershell
npm ci
npm run dev
```

## Build installers

```powershell
npm run build
npm run build:portable
```

Build output is written to `dist/`.

## Browser features

- Multi-tab Chromium browsing, address bar, back/forward/reload, and keyboard shortcuts.
- A rebuilt research home with topic shortcuts and an integrated ShrekSearch interface.
- ShrekSearch results displayed as source cards with descriptions and tags.
- Page briefs that extract representative sentences from readable pages.
- Save search results as knowledge cards.
- Bookmark search results or the currently open webpage.
- A persistent local library with separate knowledge-card and bookmark collections.
- Midnight, Paper, and Forest appearance themes, five accent colours, and compact density.
- Command palette (`Ctrl+K`), address bar shortcut (`Ctrl+L`), and new-tab shortcut (`Ctrl+T`).
- Local index refresh through the ShrekSearch crawler.
- GitHub-based app update checks in packaged builds.

## ShrekSearch

The local service runs on `127.0.0.1:8787` and provides:

- `GET /api/health`
- `GET /api/search?q=...`
- `GET /api/scrape?url=...`
- `POST /api/crawl`

Configure crawler seeds and policy limits under `search/`. The crawler respects each site's robots.txt rules and configured crawl limits.

## Local data and privacy

Browser settings, the search index, bookmarks, and knowledge cards are stored in Electron's per-user application data directory. They are not committed to this repository.

## Page briefs

Page briefs are local extractive summaries, not a generative AI model. They select representative sentences from the page text. Verify important details against the original source.
