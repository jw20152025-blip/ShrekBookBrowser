# ShrekBook Browser

Customizable Electron/Chromium browser with a ShrekSearch knowledge workspace.

## Features
- Knowledge Cards display source domains, descriptions, relevance, tags and source actions.
- Page Summarizer fetches readable page text and creates a local extractive overview with key takeaways. It requires no paid API key. This is local text analysis, not a hosted generative LLM.
- Personalization: Midnight, Paper and Forest themes; five accent colors; comfortable/compact density; rounded/soft/sharp cards; compact tabs and optional home artwork. Preferences persist in Electron user data.
- Chromium tabs remain real Electron WebContentsViews.
- ShrekSearch crawler/index, Windows installer and portable build configuration remain included.

## Requirements
Windows 10/11, Node.js 20.19+ and npm.

## Run
From the nested `ShrekBookBrowser` directory:
```powershell
npm install
npm run dev
```

## Build
```powershell
npm run build
npm run build:portable
```

## Search index
Configure `search/seeds.json` and `search/config.json`, then run `npm run search:crawl`. The local API listens on 127.0.0.1:8787 and exposes `/api/health`, `/api/search`, `/api/scrape` and `/api/crawl`.

The summarizer ranks sentences from fetched page text and assembles an overview and takeaways. It does not claim to be a generative AI model or invent facts beyond the source.