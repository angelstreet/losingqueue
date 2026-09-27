# Animated Short renderer — how to redo the video for another game

`scripts/promotion/animated/` produces the 15 s vertical promo (1080×1920, 30 fps, H.264 + AAC) from
one losingqueue match screenshot plus a small JSON file with the numbers and copy.

Files:

| File | Role |
|---|---|
| `promo.html` | The canvas renderer. `renderFrame(t, locale)` draws the frame at time `t`. All layout, animation and default copy live here. |
| `make-video.mjs` | Driver: serves the page, captures 450 frames with Playwright, synthesizes the soundtrack and encodes with ffmpeg. |
| `example-game.json` | The data/copy used for the current video (Warwick, 28–44, FAVORED 59 %). Copy it for a new game. |
| `match.png` | The screenshot used for the current video. |

`--grid` writes `grid.png` next to the script (git-ignored); outputs default to `promotion-output/`.

Requirements: Node 22, ffmpeg on PATH, and `npm install` done at the repo root
(the driver loads Playwright from the root `node_modules`). Fonts: Bahnschrift is a
Windows system font; on Linux the text falls back to Arial and looks worse.

## Quick recipe (5 steps)

All commands run from this folder (or use `npm run promo:short -- <flags>` from the repo root):

```bash
cd scripts/promotion/animated
```

### 1. Take the screenshot

Open the game on losingqueue.lol, scroll so the whole **MATCHUP** block is visible
(header line with `Defeat / Victory`, champion, kill score and verdict at the top,
the five player rows, the team totals, the 41 % / 59 % bar) and screenshot it.
Any size works; ~1100 px wide is what the current one is. Save it here, for example
`game-2.png`.

### 2. Create the data file

```bash
cp example-game.json game-2.json
```

Edit `game-2.json`. Everything is optional: a missing key keeps the default from
`promo.html`.

```jsonc
{
  "data": {
    "result": "DEFEAT",               // "DEFEAT" or "VICTORY" (drives red/green)
    "kills": [28, 44],                // your team kills, their kills (header "28-44")
    "verdict": "FAVORED",             // "FAVORED", "FAIR" or "NOT FAIR" (gold/green/red)
    "prob": { "blue": 41, "red": 59 },// pregame win chance from the bar
    "rowRect": { "x": 607, "y": 197, "w": 508, "h": 68 }, // your row, in screenshot pixels (step 3)
    "rowFocus": { "x": 861, "y": 231 }                    // where the zoom centres (step 3)
  },
  "copy": {
    "fr": {
      "context": "Warwick · Jungle · EUW",          // champion · role · region
      "callout": "Toi : GA 76 · ACE · #2 du lobby", // pill under the zoomed screenshot
      "red": "RED · TOI", "blue": "BLUE",           // put "· TOI" on the side you played
      "favLine1": "Ton équipe était",
      "favLine2": "FAVORITE À 59 %",
      "chips": ["Team GA 66 vs 57", "Jungle Δ +37", "Duo pour toi"], // exactly 3
      "reason": ["Jungle +37 et duo en ta faveur…", "et pourtant, défaite."] // 2 lines
    },
    "en": { /* same keys in English */ }
  }
}
```

Where the numbers come from on the page:

- `result`, champion, `kills`, `verdict` → the header line above MATCHUP.
- `prob` → the percentages next to the FAVORED bar at the bottom.
- `chips` → the "TEAM · team GA" line, the lane deltas in the "Favored" column
  (e.g. `RED +37` on the jungle row) and the duo/OTP/autofill notes.
- `callout` → your row: GA, badge (ACE / MVP), lobby rank (`#2` after your name).

Other copy keys you can override (see `COPY` at the top of `promo.html`):
`hook`, `hookSmall`, `badge`, `gameLabel`, `preTitle`, `resultLabel`,
`verdictLabel`, `cta1`, `ctaBtn`, `small`.

If you played on the **blue** side: set `"blue": "BLUE · TOI"`, `"red": "RED"`,
and put your team's percentage in `prob.blue`. The big numbers are always drawn
blue-left / red-right like the site.

### 3. Find your row's coordinates

```bash
node make-video.mjs --grid --data game-2.json --image game-2.png
```

This writes `grid.png`: the screenshot at 1:1 with a 50 px grid (labels every
100 px), a red box for the current `rowRect` and a red dot for `rowFocus`.
Open it, read the pixel position of your row, update `rowRect` (top-left x/y,
width, height) and `rowFocus` (centre of the row, the zoom target), and rerun
until the red box frames your row. Zoom is 1.85×, so the framed area shown in
the video is about 520×350 px of the screenshot around `rowFocus`.

### 4. Preview the key frames

```bash
node make-video.mjs --locale fr --preview --data game-2.json --image game-2.png
```

Writes `preview-fr-*.png` (ten key moments) and `preview-fr-sheet.png`, a strip
of all ten. Check: text fits on its line, the zoom lands on your row, the chips do
not overlap. Long strings are the usual problem: keep `chips` under ~18 characters
and each `reason` line under ~40.

### 5. Render

```bash
node make-video.mjs --locale fr --data game-2.json --image game-2.png --out ../../../promotion-output/short.mp4
```

```bash
node make-video.mjs --locale en --data game-2.json --image game-2.png --out ../../../promotion-output/short-en.mp4
```

Without `--out` the file goes to `promotion-output/short-<locale>.mp4`. Takes about 80 s per language. Each run also writes `<out>-poster.png`
(the CTA frame, usable as thumbnail). Frames are kept in `frames-<locale>/` and
can be deleted.

Then generate the captions as before from the project root
(`npm run promo:generate -- --url <deep link> --locale fr --no-render`) so
`manifest.json`, `youtube-title.txt`, `youtube-description.txt` and
`caption-x.txt` match the new game, and publish with `promo:publish:*`.

## Storyboard (what each second shows)

| Time | Scene | What moves |
|---|---|---|
| 0.0–2.4 | Hook | Two-line question slides up, gold underline draws, context line fades in |
| 2.4–6.0 | The game | Screenshot card pops in, Ken Burns zoom to your row, others dim, orange highlight pulses, callout pill slides in |
| 6.0–8.6 | Before the game | 41 % / 59 % count up, bar slides from even to real split, "FAVORITE À 59 %" pops, 3 chips stagger in |
| 8.6–11.6 | Verdict | DEFEAT slams in (flash + shake), kill score, FAVORED slams in, two-line reason |
| 11.6–15 | CTA | "Teste ta propre game", glowing losingqueue.lol, button, disclaimer, recap pills, fade to black |

Everything important stays above y = 1500 so the YouTube Shorts / TikTok overlay
(bottom ~20 %, right column) never covers it.

## Changing timings, colours or the sound

- **Timings**: `T` in `promo.html` (seconds). You can also override any of them
  with a `"timeline": { "verdict": 9.0, ... }` block in the JSON. Total length is
  `T.end` (15); if you change it, also change `DUR` in `make-video.mjs` so the audio
  matches.
- **Colours**: `GOLD`, `BLUE`, `ORANGE`, `RED`, `GREEN` constants in `promo.html`.
- **Sound**: the `expr` string in `make-video.mjs`. It is one ffmpeg `aevalsrc`
  expression: a low pad, a riser into the verdict, bass hits at `T.verdict`,
  `T.favored` and `T.cta`, ticks at the chip reveals, and noise whooshes on the
  scene changes. If you move `T.verdict` etc., move the matching numbers in
  `hit(...)`, `tick(...)`, `whoosh(...)` too. To ship silent, delete the
  `'-f', 'lavfi', '-i', audioGraph` and the `-c:a … -ac 2 -shortest` args.
- **Frame rate / quality**: `--fps 30` flag; `-crf 17` in the ffmpeg args (lower is
  bigger and sharper).

## Troubleshooting

- `Error: Cannot find module 'playwright'` → run `npm install` at the repo root first;
  the driver resolves Playwright from there (`PROMO` at the top of `make-video.mjs`).
- `ffmpeg exit 1` right after the frames finish → usually the output file is open
  in a player; close it and rerun.
- Text looks like plain Arial → Bahnschrift is missing (non-Windows machine).
- The zoom shows the wrong area → `rowFocus` is off; use `--grid` again.
- A run occasionally dies while writing frames (Chromium hiccup); just rerun the
  same command.
