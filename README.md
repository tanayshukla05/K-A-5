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
│   ├── emulatorjs/          # Self-hosted EmulatorJS runtime (cabinet 02)
│   ├── multihero/           # MultiHero WASM web build (cabinet 01)
│   ├── roms/                # SNES cartridges + CREDITS.md attribution
│   ├── sounds/              # UI + game sounds (about-click.mp3 = ABOUT menu beat)
│   ├── fonts/               # Site fonts
│   ├── logo.png             # Used by loader + header
│   ├── bg-boulder.mp4       # Fixed background video (rain-boulder loop)
│   └── home-click.mp3       # Sound played when the HOME menu is clicked
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

The archive has two top-level entry menus:

- **Archive** menu — the shellcode-loader learning path (Stage 01–08).
- **CTF Walkthroughs** menu — the pwn.college binary-exploitation,
  race-condition, and kernel-exploitation walkthroughs.

The menu is decided by the `Category` metadata field: any entry whose
category contains `Binary Exploitation`, `Race Condition`, or `Kernel
Exploitation` is listed under CTF Walkthroughs; everything else appears in
the Archive index. Inside the pwn.college tab, that same field selects the
Binary Exploitation, Race Condition, or Kernel Exploitation sub-menu.
Prev/next links on entry pages stay inside their own series and sub-menu.

Three index sections — Research Notes, Cheat Sheets, and File Archive — are
kept in the menu but are intentionally empty for now: they render their
"no content" states until real entries are published for them.

---

## Games Room

Two cabinets, both one-click playable — nothing runs until it is clicked:

| Cabinet | What it is | Runtime |
| --- | --- | --- |
| 01 | MultiHero — Web Edition (0.96) | Official WASM build, self-hosted (`public/multihero/`) |
| 02 | Super Nintendo — local SNES library | Self-hosted EmulatorJS (`public/emulatorjs/`) |

Cartridge attribution lives at `public/roms/CREDITS.md`; MultiHero port
license and character notices live at `public/multihero/multihero-web/NOTICE.md`.

---

## Deployment

### Vercel

1. Keep the Git repository private; it contains the Games room cartridges
   (see the ROM guard in `.gitignore`).
2. Import the Git repository into Vercel and leave the detected Next.js
   build settings at their defaults.
3. In **Project → Settings → Git**, enable Git Large File Storage so Vercel
   pulls the media tracked by `.gitattributes`, then redeploy.
4. Set `NEXT_PUBLIC_SITE_URL` in **Project → Settings → Environment
   Variables** to the deployed domain. `/sitemap.xml` and `/rss.xml` use it.

Use Vercel's Git integration for this asset-heavy repository. Direct CLI
uploads are size-limited and may reject the full project. Vercel's Hobby
plan currently allows 100 MB of source files per CLI deployment; Git
integration can fetch the required Git LFS objects during checkout.

### Node.js host or VPS

Use Node.js 20.9 or newer, set `NEXT_PUBLIC_SITE_URL`, and run:

```bash
npm ci
npm run build
npm start
```

The start script serves the production site on port 3000. Put it behind a
TLS-enabled reverse proxy. `STATIC_EXPORT=1` is for the Android Capacitor
package only; use the normal build above for a hosted website.

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

---

## License

All rights reserved. This project and its content are the property of
Pandit Tanay Shukla Ji Maharaj.
