"use client";

import { useEffect, useState } from "react";
import { RHYMES, pickRhymeIndex } from "@/lib/rhymes";

/**
 * LoadingScreen — "UNSEALING" sequence (v2)
 *
 * Runs the full 5-second cinematic sequence on EVERY page load — including
 * reloads and refreshes. There is no "skip on subsequent visits" behaviour.
 *
 * Sequence:
 *   0.00s  Black screen fade-in
 *   0.25s  Corner brackets + frame labels draw in
 *   0.30s  Logo enters (blur → sharp) inside a square reticle frame
 *   0.50s  Stage hairline expands behind the logo; scanline sweep runs
 *   0.90s  Title decodes from scramble glyphs (~0.85s decode window)
 *   1.00s  Random rhyme (one per refresh) types per-character; progress begins
 *   3.75s  Electric-shock glitch burst — logo flashes white 3x
 *          (jolts at 75% / 81% / 87% of the 5s cycle)
 *   4.10s  Rhyme complete — prompt cursor appears
 *   4.55s  Glitch ends, logo back to normal colors
 *   4.60s  Progress reaches 100% — label switches to ARCHIVE READY
 *   4.80s  Final fade-out begins (fade + blur + micro scale)
 *   5.00s  Loader removed from DOM, body scroll unlocked
 *
 * Extra atmosphere, all deterministic and hydration-safe:
 *   - Binary rain: faint falling 1/0 columns echoing the marionette strings
 *     in the logo artwork (two columns carry a whisper of crimson).
 *   - CRT refresh lines layered over the whole frame.
 *   - Live UTC clock + cycling status ticker in the bottom bar.
 *   - Piecewise "realistic" progress: fast start, mid stall, plateau during
 *     the glitch burst, hard commit to 100%.
 *   - prefers-reduced-motion disables the rain/sweep/glitch.
 *   - One rhyme is picked per page load, guaranteed different from the
 *     previously displayed one (tracked in localStorage — the only
 *     storage read, and it never influences loader visibility). The pick
 *     happens inside an effect, so hydration stays safe.
 *
 * GPU-accelerated transforms + opacity only. No layout thrash — the rhyme
 * block lives in a fixed-min-height container and the progress bar animates
 * width/left with linear transitions.
 *
 * Hydration safety:
 *   The component renders identical markup on the server and the client
 *   for the first paint (always the full loader at t=0). All time-driven
 *   state updates happen inside useEffect, which only runs on the client.
 *   Random values (scramble glyphs) are generated exclusively inside
 *   effects — never during render.
 *
 * Logo color preservation:
 *   The logo image is rendered with NO color-stripping filter. Only a
 *   subtle drop-shadow glow is applied so the original colors of the
 *   artwork come through intact. Its colors clamp to white only during
 *   the ~800ms electric-shock burst (brightness(40) on each jolt).
 *
 * "Every reload" guarantee:
 *   The component mounts fresh on every full browser reload because React
 *   state is per-mount. The initial `visible` state is `true` unconditionally
 *   — there is no read from localStorage, sessionStorage, cookies,
 *   IndexedDB, or service-worker cache. Internal client-side hash navigation
 *   does NOT remount this component, so the loader correctly skips internal
 *   nav and only fires on a true browser reload / hard refresh.
 */

const FULL_DURATION_MS = 5000;

const ARCHIVE_NAME = "PANDIT TANAY SHUKLA JI MAHARAJ";
const SCRAMBLE_GLYPHS = "01<>[]{}#$%&*+=/\\~";

const STATUS_TICKER = [
  "ESTABLISHING SECURE SESSION",
  "TLS 1.3 · AES-256-GCM",
  "SYNCING CONTENT COLLECTION",
  "WARMING SEARCH INDEX",
  "MANIFEST VERIFIED",
  "ARCHIVE UNSEALED",
];

/* Binary rain columns — literal strings (no Math.random at render time).
   Two of the six columns carry a faint crimson tint, echoing the red
   marionette strings in the logo artwork. */
const RAIN_COLUMNS = [
  { left: "7%",  text: "1011001011010010110100101", red: false, dur: 9.5,  delay: -2.5 },
  { left: "16%", text: "0100101101001011010110100", red: true,  dur: 12,   delay: -6 },
  { left: "29%", text: "1101001010110100101100101", red: false, dur: 10.5, delay: -1 },
  { left: "69%", text: "0010110100101101001011010", red: false, dur: 11.5, delay: -4 },
  { left: "82%", text: "1010100110100101101001011", red: true,  dur: 9,    delay: -7.5 },
  { left: "91%", text: "0101101001011010010110100", red: false, dur: 13,   delay: -3 },
];

/* Piecewise progress keyframes: [elapsedMs, percent]. Fast start, steady
   climb, brief stall, plateau while the glitch burst fires, then a hard
   commit to 100% right before the fade-out. */
const PROGRESS_KEYS: Array<[number, number]> = [
  [1000, 0], [1600, 18], [2200, 38], [2700, 46], [3100, 50],
  [3400, 62], [3900, 76], [4200, 80], [4600, 100],
];

/* Rhyme typing schedule — built per rhyme, because the rhyme itself is
   random on every page load. Empty stanza lines cost no characters but
   still take a LINE_GAP pause, which gives the typing a lyrical breath. */
const CHAR_MS = 9;      // ms per character
const LINE_GAP_MS = 200;

function buildSchedule(lines: string[]) {
  const starts: number[] = [];
  const durs: number[] = [];
  let t = 0;
  for (const line of lines) {
    starts.push(t);
    durs.push(line.length * CHAR_MS);
    t += line.length * CHAR_MS + LINE_GAP_MS;
  }
  return { starts, durs, total: Math.max(0, t - LINE_GAP_MS) };
}

/** Total characters revealed across all rhyme lines at a given elapsed ms. */
function typedCharsAt(
  elapsedMs: number,
  schedule: ReturnType<typeof buildSchedule>,
): number {
  let n = 0;
  for (let i = 0; i < schedule.starts.length; i++) {
    const local = elapsedMs - schedule.starts[i];
    if (local <= 0) break;
    n += Math.min(schedule.durs[i], Math.floor(local / CHAR_MS));
  }
  return n;
}

/** Interpolate the piecewise progress curve at a given elapsed ms. */
function progressAt(elapsedMs: number): number {
  const keys = PROGRESS_KEYS;
  if (elapsedMs <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, p0] = keys[i];
    const [t1, p1] = keys[i + 1];
    if (elapsedMs >= t0 && elapsedMs <= t1) {
      const k = (elapsedMs - t0) / (t1 - t0);
      return p0 + (p1 - p0) * k;
    }
  }
  return keys[keys.length - 1][1];
}

function phaseLabel(pct: number): string {
  if (pct >= 100) return "ARCHIVE READY";
  if (pct >= 76) return "VERIFYING MANIFEST";
  if (pct >= 38) return "INDEXING CONTENT";
  return "LOADING ARCHIVE";
}

function utcClock(d: Date): string {
  return d.toISOString().slice(11, 19);
}

const MONO = "var(--font-geist-mono), ui-monospace, monospace";

export function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);
  const [typed, setTyped] = useState(0);       // flat char counter across lines
  const [progress, setProgress] = useState(0);
  const [nameText, setNameText] = useState(ARCHIVE_NAME);
  const [statusIdx, setStatusIdx] = useState(0);
  const [clock, setClock] = useState("--:--:--");
  const [rhyme, setRhyme] = useState<string[] | null>(null);

  // Lock body scroll while the loader is on screen, then UNLOCK it the
  // moment the loader becomes invisible. This effect re-runs whenever
  // `visible` changes, guaranteeing the unlock happens at 5.0s.
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const start = Date.now();
    const intervals: number[] = [];
    const timeouts: number[] = [];

    // --- Progress (piecewise curve, wall-clock interval-driven) ---------
    // An interval (not rAF) so background-tab throttling can never freeze
    // the bar: every tick recomputes the percentage from elapsed time and
    // self-corrects, exactly like the boot-log schedule.
    const tickProgress = () => {
      const pct = progressAt(Date.now() - start);
      setProgress(pct);
      if (pct >= 100) window.clearInterval(pIv);
    };
    const pIv = window.setInterval(tickProgress, 50);
    intervals.push(pIv);

    // --- Rhyme (one per page load, never an immediate repeat) -----------
    // The pick happens on the FIRST TICK of the typing interval below —
    // an async callback, not a synchronous setState in the effect body
    // (hydration-safe: the first paint matches the server markup, and no
    // Math.random runs during render). pickRhymeIndex() tracks the
    // previous rhyme in localStorage and redraws on a would-be repeat.
    let rhymeLines: string[] | null = null;
    let schedule = buildSchedule([]);
    const typeTick = () => {
      if (rhymeLines === null) {
        rhymeLines = RHYMES[pickRhymeIndex()];
        schedule = buildSchedule(rhymeLines);
        setRhyme(rhymeLines);
      }
      const elapsed = Date.now() - start - 1000;
      setTyped(elapsed <= 0 ? 0 : typedCharsAt(elapsed, schedule));
      if (elapsed > schedule.total) window.clearInterval(typeIv);
    };
    const typeIv = window.setInterval(typeTick, 24);
    intervals.push(typeIv);

    // --- Title scramble decode (starts at 0.9s, ~0.85s window) ----------
    const decodeTick = () => {
      const elapsed = Date.now() - start - 900;
      if (elapsed <= 0) return;
      if (elapsed >= 850) {
        setNameText(ARCHIVE_NAME);
        window.clearInterval(decodeIv);
        return;
      }
      const reveal = Math.floor((elapsed / 850) * ARCHIVE_NAME.length) + 1;
      let out = ARCHIVE_NAME.slice(0, reveal);
      for (let i = reveal; i < ARCHIVE_NAME.length; i++) {
        const ch = ARCHIVE_NAME[i];
        out += ch === " " ? " " : SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
      }
      setNameText(out);
    };
    const decodeIv = window.setInterval(decodeTick, 40);
    intervals.push(decodeIv);

    // --- Status ticker ---------------------------------------------------
    const statusIv = window.setInterval(
      () => setStatusIdx((i) => (i + 1) % STATUS_TICKER.length),
      950,
    );
    intervals.push(statusIv);

    // --- Live UTC clock ---------------------------------------------------
    // (No synchronous warm-up call here — setState inside the effect body
    // is flagged by react-hooks/set-state-in-effect, and the interval's
    // first tick at ~1s already lands before the clock fades in at 1.4s.)
    const clockIv = window.setInterval(() => setClock(utcClock(new Date())), 1000);
    intervals.push(clockIv);

    // --- Fade out at 4.8s, unmount at 5.0s -------------------------------
    timeouts.push(window.setTimeout(() => setFadingOut(true), 4800));
    timeouts.push(window.setTimeout(() => setVisible(false), FULL_DURATION_MS));

    return () => {
      intervals.forEach((id) => window.clearInterval(id));
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [visible]);

  // Once we're done, never render the loader.
  if (!visible) return null;

  const done = progress >= 100;

  // Derive per-line state from the flat typed counter. A plain loop (no
  // closure) so the reveal allocation stays immutable-by-convention.
  const lines = rhyme ?? [];
  const lineStates: Array<{ text: string; shown: number; complete: boolean }> = [];
  let remaining = typed;
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const shown = Math.min(remaining, text.length);
    remaining -= shown;
    lineStates.push({ text, shown, complete: shown === text.length });
  }
  const activeIdx = lineStates.findIndex((l) => !l.complete);
  const allDone = rhyme !== null && activeIdx === -1;
  const visibleLines = allDone ? lineStates.length : activeIdx + 1;

  return (
    <div
      aria-hidden={fadingOut}
      className="loader-shell fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{
        animation: fadingOut
          ? "loader-exit 240ms cubic-bezier(0.4,0,1,1) forwards"
          : "loader-fade-in 300ms ease-out both",
      }}
    >
      {/* Blueprint grid with radial falloff */}
      <div className="ldx-grid" />

      {/* Binary rain — echoes the dangling 1/0 strings in the logo */}
      <div className="ldx-rain" aria-hidden="true">
        {RAIN_COLUMNS.map((c, i) => (
          <div
            key={i}
            className={`ldx-rain-col${c.red ? " ldx-rain-col--red" : ""}`}
            style={{
              left: c.left,
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.delay}s`,
            }}
          >
            {c.text}
          </div>
        ))}
      </div>

      {/* Scanline sweep + CRT refresh lines */}
      <div className="loader-scanline" />
      <div className="ldx-crt" />

      {/* Outer frame — corner brackets + frame labels */}
      <div className="ldx-corner ldx-corner--tl" />
      <div className="ldx-corner ldx-corner--tr" />
      <div className="ldx-corner ldx-corner--bl" />
      <div className="ldx-corner ldx-corner--br" />
      <div className="ldx-frame-label ldx-frame-label--tl">KA://ROOT</div>
      <div className="ldx-frame-label ldx-frame-label--tr">SESSION 7F3A2C41</div>

      {/* Center cluster */}
      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Logo inside a square reticle frame, stage hairline behind */}
        <div className="ldx-logo-frame">
          <div className="ldx-stage-line" />
          <div className="ldx-reticle ldx-reticle--tl" />
          <div className="ldx-reticle ldx-reticle--tr" />
          <div className="ldx-reticle ldx-reticle--bl" />
          <div className="ldx-reticle ldx-reticle--br" />
          <div
            className="loader-glitch-target relative"
            style={{
              animation:
                "loader-logo-in 600ms cubic-bezier(0.16,1,0.3,1) both, loader-glitch 5s infinite",
            }}
          >
            {/* The logo — clean, unobstructed, no container/card/border.
                ORIGINAL COLORS PRESERVED: no brightness/invert filter,
                only a subtle drop-shadow glow and a slow breathing pulse. */}
            <img
              src="/logo.png"
              alt="Pandit Tanay Shukla Ji Maharaj"
              draggable={false}
              className="select-none relative z-10"
              style={{
                width: "min(36vw, 190px)",
                height: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 0 24px rgba(255,255,255,0.05))",
                animation: "ldx-breathe 3s ease-in-out 1s infinite",
              }}
            />
          </div>
        </div>

        {/* Decoding title + eyebrow */}
        <div className="ldx-name mt-7 text-center">
          <div
            style={{
              fontFamily: MONO,
              fontSize: "clamp(0.62rem, 1.3vw, 0.78rem)",
              letterSpacing: "0.3em",
              color: "rgba(255,255,255,0.92)",
              whiteSpace: "nowrap",
              animation: "ldx-rise 500ms cubic-bezier(0.16,1,0.3,1) 900ms both",
            }}
          >
            {nameText}
          </div>
          <div
            className="archive-eyebrow mt-2"
            style={{
              animation: "ldx-rise 500ms ease-out 1500ms both",
              marginBottom: 0,
              color: "rgba(255,255,255,0.42)",
            }}
          >
            PERSONAL KNOWLEDGE ARCHIVE
          </div>
        </div>

        {/* Rhyme — a random rhyme from the archive, typed out per refresh */}
        <div className="mt-9" style={{ width: "min(82vw, 380px)" }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "10px",
              lineHeight: 1.7,
              minHeight: "140px",
            }}
          >
            {lineStates.slice(0, visibleLines).map((l, i) => (
              <div key={i} className="flex items-baseline">
                <span
                  style={{
                    whiteSpace: "pre-wrap",
                    color: l.complete
                      ? "rgba(255,255,255,0.82)"
                      : "rgba(255,255,255,0.65)",
                  }}
                >
                  {l.text.slice(0, l.shown)}
                </span>
                {!l.complete && <span className="loader-cursor" />}
              </div>
            ))}
            {allDone && (
              <div style={{ marginTop: "2px", color: "rgba(255,255,255,0.5)" }}>
                &gt; <span className="loader-cursor" />
              </div>
            )}
          </div>

          {/* Progress — ticked track, glowing head, phase label */}
          <div
            className="mt-4"
            style={{ animation: "loader-fade-in 400ms ease-out 1000ms both" }}
          >
            <div
              className="flex items-baseline justify-between"
              style={{
                fontFamily: MONO,
                fontSize: "9px",
                letterSpacing: "0.18em",
                marginBottom: "4px",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <span style={{ color: done ? "rgba(255,255,255,0.95)" : undefined }}>
                {phaseLabel(progress)}
              </span>
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  color: done ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)",
                }}
              >
                {String(Math.round(progress)).padStart(3, "0")}%
              </span>
            </div>
            <div className="relative" style={{ height: "9px" }}>
              {/* 10% tick marks */}
              <div className="ldx-ticks absolute left-0 right-0" style={{ top: "3px", height: "3px" }} />
              {/* track */}
              <div
                className="absolute left-0 right-0"
                style={{ top: "4px", height: "1px", background: "rgba(255,255,255,0.12)" }}
              />
              {/* fill */}
              <div
                className={`absolute left-0${done ? " ldx-bar-done" : ""}`}
                style={{
                  top: "4px",
                  height: "1px",
                  width: `${progress}%`,
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0.35), rgba(255,255,255,0.95))",
                  transition: "width 90ms linear",
                }}
              />
              {/* glowing head */}
              {!done && (
                <div
                  className="absolute"
                  style={{
                    top: "3px",
                    height: "3px",
                    width: "6px",
                    marginLeft: "-3px",
                    left: `${progress}%`,
                    background: "#fff",
                    boxShadow: "0 0 10px rgba(255,255,255,0.9)",
                    transition: "left 90ms linear",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom status bar — build, ticker, live UTC clock */}
      <div
        className="absolute bottom-6 left-0 right-0 z-10 px-6 flex items-center justify-between"
        style={{
          fontFamily: MONO,
          fontSize: "9px",
          letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.35)",
          animation: "loader-fade-in 600ms ease-out 1400ms both",
        }}
      >
        <span>v1.0.0 · BUILD 3A7F</span>
        <span
          className="max-sm:hidden"
          style={{ color: "rgba(255,255,255,0.5)", transition: "color 200ms" }}
        >
          {STATUS_TICKER[statusIdx]}
        </span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>UTC {clock}</span>
      </div>

      {/* Vignette above everything but the flicker */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.72) 100%)",
        }}
      />
    </div>
  );
}
