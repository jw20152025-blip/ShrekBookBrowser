# ShrekBook Browser

A customizable Chromium desktop browser built for ShrekBook, with a first-class ShrekSearch knowledge-card layer and a crawler you control.

## What makes it different

- **Knowledge Cards:** ShrekSearch results arrive as compact source cards with summaries, tags, snippets and actions.
- **Web + Search dual mode:** Normal browsing remains normal browsing; ShrekSearch is the knowledge layer.
- **Spaces-ready architecture:** Each tab is a real Chromium `WebContentsView`, making later workspace/sidebar features straightforward.
- **Customization:** Midnight/Paper/Forest themes, compact tabs, focus mode and command palette are included from day one.
- **Your scraper:** `search/crawler.js` crawls your configured seeds, respects `robots.txt`, extracts useful page content and builds `search/index.json`.
- **Installer + updater:** Windows NSIS and portable builds are configured with electron-builder; packaged builds use electron-updater.

## 1. Install

Requirements: Node.js 20+ and npm.

```powershell
.\scripts\setup.ps1
```

## 2. Configure your search universe

Edit `search/seeds.json` to the sites you want ShrekSearch to index. Then edit `search/config.json` for crawl depth/page limits.

Run:

```powershell
.\scripts\crawl.ps1
```

The crawler stores its index at `search/index.json`.

## 3. Run the browser

```powershell
.\scripts\dev.ps1
```

Or:

```powershell
npm run dev
```

## 4. Build the Windows app

```powershell
.\scripts\build.ps1
```

Artifacts appear in `dist/`.

## 5. Turn on automatic updates

Edit the `build.publish` GitHub owner/repo values in `package.json`. Create releases with a GitHub token:

```powershell
$env:GH_TOKEN = "YOUR_TOKEN"
.\scripts\release.ps1
```

After the app is installed from a published release, it checks for updates automatically and installs them on quit.

## Search API

The local search service listens on `127.0.0.1:8787`.

- `GET /api/health`
- `GET /api/search?q=programming&limit=12`
- `GET /api/scrape?url=https://example.com`
- `POST /api/crawl`

The browser's `settings.searchUrl` can also be changed to your hosted ShrekSearch API later, which lets you move the crawler/index off the desktop without changing the UI.

## Next expansion modules

The clean next layer is a true workspace system, split-pane research mode, per-site reading mode, tab groups, bookmarks/history, a download shelf, custom start-page widgets, keyboard remapping, site permissions, extensions, and a ShrekAI research assistant that can cite the card sources instead of inventing them.
