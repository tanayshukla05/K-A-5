# Knowledge Archive

A personal knowledge archive for **Pandit Tanay Shukla Ji Maharaj**.

This is not a corporate portfolio. It is a personal knowledge archive where
Markdown files become a searchable, indexed, cross-linked library of blogs,
CTF walkthroughs, research notes, cheat sheets, and downloadable files.

---

## Philosophy

- **Information-first.** Fast, minimal, timeless.
- **Markdown-first.** Drop a `.md` file into `content/` and the archive
  updates automatically — no HTML editing, no database migrations.
- **Real content only.** No placeholder text, no filler, no fabricated
  statistics. Empty pages say so plainly.
- **Dark monochrome.** Zero rounded corners, typography-first, premium
  digital-archive aesthetic.

---

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript 5**
- **Tailwind CSS 4**
- **React 19**

No database, no ORM, no auth library, no UI kit. The archive reads Markdown
from disk at build time and statically prerenders every route, rendering it
through a lightweight custom GFM parser — no `react-markdown` runtime, no
syntax-highlighter bundle.

---

## Project Structure

```
.
├── content/
│   └── learning-paths/      # Markdown entries — drop new .md files here
├── public/
│   ├── logo.png             # Used by loader + header
│   ├── favicon.png
│   └── bg-boulder.mp4       # Fixed background video (rain-boulder loop)
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout, metadata, fonts, background video
│   │   ├── page.tsx         # Server component: loads content, mounts loader + shell
│   │   ├── globals.css      # Theme, loader animations, app shell styling
│   │   ├── robots.ts        # /robots.txt
│   │   ├── sitemap.ts       # /sitemap.xml
│   │   └── rss.xml/
│   │       └── route.ts     # /rss.xml
│   ├── components/
│   │   ├── loader.tsx       # 5-second cinematic loading screen (random rhyme)
│   │   ├── archive-shell.tsx# Header + sidebar + content area + footer
│   │   ├── pages.tsx        # All page components (Home, Archive, Stage, Tags, etc.)
│   │   ├── search-panel.tsx # Ctrl+K command panel
│   │   └── content-provider.tsx # React Context bridge for server-loaded data
│   └── lib/
│       ├── content.ts       # Server-only: reads + parses Markdown
│       ├── types.ts         # Shared types (zero runtime imports)
│       ├── router.ts        # Hash-based client router
│       ├── entry-group.ts   # learning-path vs CTF series helper
│       ├── links.ts         # LINKS directory (user-editable)
│       └── rhymes.ts        # Loading-screen rhyme pool + no-repeat picker
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── eslint.config.mjs
├── package.json
└── README.md
```

---

## Local Development

```bash
npm install
npm run dev
```

The site runs at `http://localhost:3000`.

The loading screen will fire on every full browser reload — this is
intentional. Internal client-side navigation does not re-trigger it.

---

## Publishing Content

To add a new entry to the archive:

1. Create a Markdown file in `content/learning-paths/`
   (e.g. `stage-09-newtopic.md`).
2. Start the file with an H1 in the format:
   `# Stage NN: Title — Subtitle`
3. Include a `## Module Metadata` section with a table containing fields
   like `Module Name`, `Level`, `Estimated Time`, `Category`, `Platform`,
   `Binary`, `VT Score`, and optionally `Prerequisites`, `MITRE ATT&CK`.

That's it. The new entry will automatically appear on the homepage, in the
archive index, in the tag and category pages, in the search index, in the
sitemap, and in the RSS feed.

### Where entries appear

The archive has two entry series, numbered independently:

- **Archive** menu — the shellcode-loader learning path (Stage 01–08).
- **CTF Walkthroughs** menu — the pwn.college binary-exploitation
  walkthroughs (Stage 01–17).

The menu is decided by the `Category` metadata field: any entry whose
category starts with `Binary Exploitation` is listed under CTF Walkthroughs;
everything else appears in the Archive index. Prev/next links on entry pages
stay inside their own series.

Three index sections — Research Notes, Cheat Sheets, and File Archive — are
kept in the menu but are intentionally empty for now: they render their
"no content" states until real entries are published for them.

---

## Loading Screen

The loading screen is a 5-second cinematic "unsealing" sequence that fires
on every full browser reload. It is not cached — no `localStorage`,
`sessionStorage`, cookies, IndexedDB, or service worker. Internal
client-side navigation correctly skips the loader.

**Timeline:**

| Time   | Event                                                        |
|--------|--------------------------------------------------------------|
| 0.0s   | Black screen fade-in                                         |
| 0.25s  | Corner brackets + frame labels (`KA://ROOT`, session id)     |
| 0.3s   | Logo enters (blur → sharp) inside a square reticle frame     |
| 0.5s   | Stage hairline expands behind the logo; scanline sweep runs  |
| 0.9s   | Title decodes from scramble glyphs (~0.85s decode window)    |
| 1.0s   | Random rhyme (new one per refresh, never an immediate repeat) types per-character; progress begins |
| 3.75s  | Electric-shock glitch burst — logo flashes white 3x           |
| 4.1s   | Rhyme complete — prompt cursor appears                        |
| 4.55s  | Glitch ends, logo back to normal colors                      |
| 4.6s   | Progress commits to 100% — label switches to `ARCHIVE READY` |
| 4.8s   | Final fade-out begins (fade + blur + micro scale)            |
| 5.0s   | Loader removed from DOM, body scroll unlocked                |

Atmosphere details:

- **Binary rain** — faint falling `1`/`0` columns behind the content,
  echoing the marionette strings in the logo artwork; two of the six
  columns carry a whisper of crimson.
- **Rhyme typing** — one rhyme picked per page load from
  `src/lib/rhymes.ts` (never an immediate repeat of the previous one),
  typed per-character with stanza pauses.
- **Piecewise progress** — fast start, brief stall, plateau during the
  glitch burst, hard commit to 100%. Tick marks every 10%, a glowing
  leading head, and a phase label (`LOADING ARCHIVE` → `INDEXING
  CONTENT` → `VERIFYING MANIFEST` → `ARCHIVE READY`).
- **Live telemetry** — cycling status ticker and a real UTC clock in the
  bottom bar; session id and build hash in the frame labels.
- **CRT texture** — refresh lines and scanline sweep over the whole frame.
- **Reduced motion** — `prefers-reduced-motion` disables the rain,
  flicker, sweep, and glitch while keeping the choreography.

The logo's original colors are preserved at all times except during the
~800ms electric-shock burst, when `brightness(40)` briefly clamps the
silhouette to pure white on each jolt.

---

## Keyboard Shortcuts

| Shortcut         | Action                          |
|------------------|---------------------------------|
| `Ctrl+K` / `Cmd+K` | Open search panel             |
| `Esc`            | Close search panel              |
| `↑` / `↓`        | Navigate search results         |
| `Enter`          | Open active search result       |
| `Tab`            | Move through interactive elements |

---

## SEO

- `/robots.txt` — auto-generated, allows all crawlers
- `/sitemap.xml` — auto-generated, includes every entry
- `/rss.xml` — RSS 2.0 feed of all entries
- Open Graph + Twitter Card metadata in `<head>`
- Canonical URLs, theme-color, viewport

Set `NEXT_PUBLIC_SITE_URL` (see `.env.example`) to your deployment URL so
the sitemap and RSS links point at your real domain.

---

## Deploying to Vercel

The project is standard Next.js 16 (App Router) and deploys as-is.

**Option A — GitHub (recommended):**

1. Install Git, then from the project folder:
   ```bash
   git init
   git add -A
   git commit -m "Knowledge Archive — initial commit"
   ```
2. Create a GitHub repository and push.
3. On [vercel.com/new](https://vercel.com/new), import the repository.
   Vercel auto-detects Next.js — leave build settings at their defaults
   (`npm run build`).
4. After the first deploy, add the environment variable
   `NEXT_PUBLIC_SITE_URL = https://<your-project>.vercel.app` (or your
   custom domain) in Project → Settings → Environment Variables, and
   redeploy once so `/sitemap.xml` and `/rss.xml` pick it up.

**Option B — Vercel CLI (no Git needed):**

```bash
npx vercel          # preview deploy
npx vercel --prod   # production deploy
```

Notes:

- No database, no API keys, no runtime secrets — deploys with zero
  configuration.
- All content is read at build time and statically prerendered; the
  `content/learning-paths/*.md` files are also explicitly included in the
  serverless file trace (`outputFileTracingIncludes` in `next.config.ts`)
  so revalidation always has the Markdown available.
- `content/`, `public/`, and everything else needed is committed with the
  repo; nothing outside the project is required at runtime.

---

## License

All rights reserved. This project and its content are the property of
Pandit Tanay Shukla Ji Maharaj.
