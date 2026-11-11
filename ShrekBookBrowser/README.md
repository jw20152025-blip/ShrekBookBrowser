# ShrekBook Browser 0.3.0

A research-first desktop browser built with Electron. ShrekBook Browser combines Chromium browsing with a local ShrekSearch index, knowledge cards, page briefs, bookmarks and a personal research library.

## Run on Windows

Use Node.js 20.19 or newer. Open PowerShell in this folder (the folder containing this file), then run:

```powershell
npm ci
npm run dev
```

If dependencies are already installed, start directly with `npm run dev`.

## Build

```powershell
npm run build
npm run build:portable
```

Build output is written to `dist/`.

## Included systems

- Multi-tab Chromium browsing with address bar, navigation controls and keyboard shortcuts.
- Local ShrekSearch service on `127.0.0.1:8787`.
- Search results presented as knowledge cards.
- Local page briefs that extract representative sentences from a readable page.
- Device-local bookmarks and saved knowledge cards.
- Appearance controls for Midnight, Paper and Forest themes, accent colours and compact density.
- Persistent settings and research data stored in Electron's user-data directory.

## ShrekSearch

The local search service exposes `/api/health`, `/api/search`, `/api/scrape` and `POST /api/crawl`. Configure the crawler's seed and policy files under `search/` before crawling. The crawler follows its configured limits and robots rules.

## Data and privacy

Settings, search index data, bookmarks and knowledge cards are stored locally in Electron's per-user application data directory. They are not written into the source repository.

## Page briefs

Page briefs are local extractive summaries, not a hosted or neural generative AI model. They select representative sentences from page text. Always verify important details against the original source.
