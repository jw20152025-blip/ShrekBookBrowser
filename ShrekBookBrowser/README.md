# ShrekBook Browser

A research-first Electron/Chromium browser built around the local ShrekSearch index.

## Features
- ShrekSearch knowledge cards with source domains, descriptions, tags and relative relevance.
- A persistent research library for saved cards and bookmarks.
- Page summaries that extract key sentences locally. This is transparent extractive text analysis, not a hosted generative model; no paid API is required.
- A browser control to start a ShrekSearch crawl.
- Midnight, Paper and Forest themes; five accent colors; comfortable/compact density; rounded/soft/sharp corners; compact tabs and optional artwork.
- Electron tabs, command palette, keyboard shortcuts, updater and Windows build scripts.

## Structure
```text
ShrekBookBrowser/
├── app/
│   ├── main.js
│   ├── preload.js
│   └── library.js
├── assets/
├── data/
│   ├── default-settings.json
│   ├── bookmarks.json
│   └── knowledge/
│       ├── README.md
│       └── cards.json
├── renderer/
│   ├── index.html
│   ├── renderer.js
│   └── styles.css
├── search/
├── scripts/
├── tools/
├── package.json
└── package-lock.json
```

## Run
Use Node.js 20.19+ and npm. From this nested directory:
```powershell
npm ci
npm run dev
```

## Build
```powershell
npm run build
npm run build:portable
```

## ShrekSearch
The local service listens on 127.0.0.1:8787 and exposes `/api/health`, `/api/search`, `/api/scrape`, and `POST /api/crawl`. Configure `search/seeds.json` and `search/config.json` before crawling.

## Personal data
The repository's `data/` folder contains packaged defaults. Writable settings and saved research are kept in Electron's per-user application data directory so updates do not overwrite them: `browser-settings.json`, `library/bookmarks.json`, and `library/knowledge-cards.json`.

## Summary limitations
The built-in summarizer ranks and extracts representative sentences from page text. It is local and free, but it is not a neural language model and does not generate new explanations. Check summaries against the linked source.
