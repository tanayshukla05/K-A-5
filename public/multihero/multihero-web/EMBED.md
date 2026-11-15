# MultiHero — Web Edition (drop-in folder)

This folder is the complete, ready-to-serve browser version of **MultiHero 0.96** (by mhman),
web port 1.7.1 by richardyusan (MIT). It is already compiled and tested — no build step needed.

> Note: this is **0.96**, the newest official version of the game (your old folder was 0.94).
> Everything 0.94 had is here, plus more characters/stages. Locked characters can be unlocked
> with the in-game **CHEATS** menu or Adventure mode.

## Files (keep them all together, do not rename)

| File | Purpose |
|---|---|
| `index.html` | The game page (canvas, Play button, fullscreen, touch controls) |
| `multihero.js` | WASM loader |
| `multihero.wasm` | The game engine (WebAssembly) |
| `multihero.data` | All game data: graphics, sounds, maps (~11 MB) |
| `icon.png` | Favicon |
| `LICENSE`, `NOTICE.md` | MIT license for the port + attribution for the original game/characters |

Total: ~13 MB.

## 1) One-click embed (copy-paste)

Upload this whole folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, itch.io,
your own server — anything that serves files). Then drop this into any page:

```html
<iframe src="multihero-web/index.html"
        style="width:100%;max-width:960px;aspect-ratio:640/480;border:0;border-radius:8px"
        allow="fullscreen; gamepad"
        allowfullscreen
        title="Play MultiHero"></iframe>
```

That's it. The visitor clicks **▶ Play** and the game starts (browsers require one click before
sound; the Play button handles it). Keyboard, mouse, gamepads and on-screen touch controls all
work inside the frame.

## 2) Or just link/iframe the hosted copy (zero upload)

The port author hosts the same build publicly:

```html
<iframe src="https://richardyusan.github.io/multihero-web/"
        style="width:100%;max-width:960px;aspect-ratio:640/480;border:0"
        allow="fullscreen; gamepad" allowfullscreen title="Play MultiHero"></iframe>
```

Use option 1 (self-host) if you want it under your own domain.

## Rules that matter

- The 4 game files **must stay in the same folder** as `index.html`; the loader fetches them
  relative to the page.
- Must be served over **http(s)** — opening `index.html` from disk (`file://`) does not work
  (the browser blocks the data download).
- If your host serves `.wasm` with a wrong MIME type the game still runs (the loader falls
  back), but `application/wasm` is ideal.

## Controls (defaults, changeable in Options → Controls)

| Key | Action |
|---|---|
| W A S D | move |
| N | attack |
| M | jump |
| H | special |
| Space | block |
| J | throw / pick up |
| Enter | OK |
| Esc | in-game menu |

Bonus: **MULTIPLAYER ONLINE** in the menu gives real online play (up to 4 players) with no
server setup — it uses the port author's public Cloudflare server.

## Credits

- Game + original source: **mhman** (MultiHero is his free non-commercial fan game).
- Web/Android port (transpiler, runtime, shell): **richardyusan**, MIT license — see `LICENSE`.
- Characters belong to their respective owners (Nintendo, Capcom, Marvel, etc.) — see `NOTICE.md`.
