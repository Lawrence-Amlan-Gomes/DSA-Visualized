# CLAUDE.md — DSA Visualized

## Project Overview

Personal DSA (Data Structures & Algorithms) practice tool. Lawrence writes JavaScript algorithm solutions in VS Code, then runs them through a browser UI where each file executes in the browser and all `console.log` output appears in Chrome DevTools console. No frameworks, no build step.

The UI has three views, switched via a left activity bar: **LiveCoding** (the original sidebar file list — click a file, it runs, check DevTools), **Dashboard** (live status pulled from `co-founder/state.md` + `co-founder/roadmap.md`), and **Roadmap** (the 5-phase interview-prep curriculum from `co-founder/curriculum.md`, one page per phase). The project also has a mentor/co-founder system (`skills/skillCoFounderMentor.md` + `co-founder/`) that tracks DSA learning progress across sessions — see [co-founder/README.md](co-founder/README.md) for how that folder works.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Language | Vanilla JavaScript (ES Modules) |
| Runtime | Node.js (built-ins only — no npm packages) |
| UI | Single HTML file, plain CSS |
| Dev server | VS Code Live Server extension (primary) |
| Alt server | `server.js` — custom Node.js HTTP server (optional) |
| Editor | VS Code |

No external npm dependencies. `package.json` exists only to provide `npm start`.

---

## Project Structure

```
DSA Visualized/
├── index.html               # Browser UI — 3 views (LiveCoding / Dashboard / Roadmap) via activity bar
├── manifest.json            # Auto-generated list of solution files shown in LiveCoding
├── generate-manifest.js     # Node script — updates manifest.json when files are added
├── script.js                # ES module utility: export default print(...args)
├── server.js                # Optional alt to Live Server — serves on port 4040
├── package.json             # scripts.start → node server.js
├── .vscode/
│   └── settings.json        # Live Server port set to 5501
│
├── co-founder/               # Claude's private folder — DSA mentor's memory, not Lawrence's to edit
│   ├── README.md             # index of what's in this folder
│   ├── state.md               # last session + next session starting point
│   ├── roadmap.md             # pattern/topic checklist (live progress)
│   ├── curriculum.md          # 5-phase interview-prep plan, rendered in the Roadmap view
│   ├── session-history.md     # dated log of past sessions
│   └── notes.md                # freeform cross-session observations
├── skills/                   # Prompt-file conventions (not the Claude Code Skill tool — see skills/skillCoFounderMentor.md)
│   ├── skillCoFounderMentor.md   # `@skills/skillCoFounderMentor.md` / `End Today` — the DSA mentor
│   └── skill_AddCommitPush.md    # git add/commit/push in one shot
│
│   ── Solution files (all at root, naming: category-algorithm.js) ──
├── array-hashMap-longestConsecutiveSequence.js
├── twoPointers-threeSum.js
└── test.js
```

---

## Getting Started

No install step needed (zero npm dependencies).

1. Open the project folder in VS Code.
2. Click **Go Live** in the VS Code status bar to start Live Server.
3. Open Chrome at `http://127.0.0.1:5501` and open DevTools → Console (`F12`).
4. Click any file in the left sidebar → it runs → logs appear in the console.

---

## Development Commands

```bash
# Update manifest.json after adding a new solution file (run once)
node generate-manifest.js

# Auto-update manifest.json whenever a new .js file is created (leave running)
node generate-manifest.js --watch

# Alternative: run the custom Node.js server instead of Live Server
node server.js        # → http://localhost:4040
npm start             # same thing
```

---

## Architecture & Key Concepts

### How the UI works

`index.html` has a left activity bar (3 icon buttons) that toggles which view is visible: **LiveCoding** (default), **Dashboard**, **Roadmap**. Only one `.view` element has the `active` class at a time (see `switchView()`).

- **LiveCoding** — the original file-list sidebar, described below.
- **Dashboard** — fetches and parses `co-founder/state.md` + `co-founder/roadmap.md` on every view switch (`loadDashboard()`), no caching, always fresh.
- **Roadmap** — fetches `co-founder/curriculum.md` (`loadRoadmapView()`), splits it into phases on `## Phase N — Title` headings, renders each with a small hand-rolled markdown-to-HTML converter (`renderMarkdown()`). Phase 1's markdown body additionally re-fetches `co-founder/roadmap.md` and injects the live checklist wherever curriculum.md has a `<!-- LIVE_ROADMAP_CHECKLIST -->` marker. **Phase 0 is special-cased**: instead of rendering its whole body as markdown, `showPhase()` only renders curriculum.md's intro paragraph, then hands off to `renderPhase0Extra()` — a hand-built, self-contained interactive teaching module (sliders, SVG charts, toggles, animated simulations, self-check quizzes) defined entirely in `index.html`'s script, independent of curriculum.md's markdown content. Its sections live in the `PHASE0_SECTIONS` array (id, nav label, render function) — add a new Phase 0 section there, not in curriculum.md. Each section ends with a `#p0-next-footer` that `updateP0NextFooter()` fills with either a "Continue to next section" button, a "Go to Phase 1" handoff button (on the section flagged `final: true`), or a "more coming soon" note. **Phase 1 is also special-cased**, additively: `showPhase()` renders curriculum.md's markdown body as usual, then appends `renderPhase1Extra()` — a per-problem interactive module (same hand-built approach as Phase 0) listed in the `PHASE1_PROBLEMS` array (id, pattern, title, difficulty, `file`, `render`, `init`). Navigation is two-level: `renderPhase1Extra()` first renders a fixed `PHASE1_CATEGORIES` array (all 17 pattern names, matching `co-founder/roadmap.md`'s pattern list) as top-level nav pills, then filters `PHASE1_PROBLEMS` by whichever category is selected (`currentP1Category`, persisted in `localStorage` alongside `currentP1Problem`) to render that category's problem pills underneath — categories with no problems yet show an honest "not built yet" message instead of an empty pill row. A problem's `pattern` field must exactly match one of the `PHASE1_CATEGORIES` strings or it won't surface under any category pill. `goToP1Category()` / `goToP1Problem()` explicitly capture and restore `#roadmap-content`'s `scrollTop` around the re-render so switching pills preserves scroll position rather than resetting it. Each problem page follows a fixed shape: plain-English statement, a non-spoiler visual of the *concept* (never the algorithm), a "before you code" prompt list, a `renderP1Workflow(file)` callout naming the exact `.js` file to open, then a closed-by-default `<details class="p0-reveal">` gating the brute force, optimal approach, an interactive step-through simulation, edge cases, and a complexity table — closed so Lawrence attempts the problem himself before seeing the answer. `#p1-next-footer` is filled by `updateP1NextFooter()` the same way `#p0-next-footer` is. New problems are added to `PHASE1_PROBLEMS` one at a time as mentor sessions reach them, not built out in bulk ahead of time — and the matching solution `.js` file should be stubbed (problem comment + empty method + test calls, no solution) before Lawrence is pointed at it, since the repo's solution files were bulk-imported from an old project and often already contain a full answer **and sometimes have wrong `// Expected:` comments even when the code is correct** — run the baked file and manually verify each expected value before stubbing, don't just check whether a `class Solution` already exists. **`PATTERN_PRIMERS`** is a separate registry (category name → render function) checked in `renderPhase1Extra()`: whenever a category with a matching entry is opened, that primer's markup renders inside a `.p1-primer` wrapper, positioned between the category pills and that category's problem pills. A primer teaches the *pattern itself* (what it is, how it works, when to reach for it, common variations, a complexity cheat-sheet) — never one specific problem — and is always visible (not gated behind a reveal, unlike the per-problem brute-force/optimal section). Like `PHASE1_PROBLEMS`, primers are authored incrementally: only categories with at least one problem *authored* have an entry; categories still at 0 problems simply have no key in `PATTERN_PRIMERS` and show no primer. **Add the primer at the same time as a category's first problem, not gated behind that problem being solved** — Lawrence needs the pattern's conceptual grounding (what it is, how it works, when to reach for it) before attempting problem 1, not after; waiting until after defeats the point for exactly the problem that needs it most. (Earlier versions of this rule said "as soon as solved" — changed 2026-07-19 after Lawrence pointed out the contradiction.) Reuse that pattern's existing shared visual helper (`renderP1Trie`, `renderP1Heap`, `renderP1TreeSVG`, `renderP1GraphSVG`, `renderP1LLChainSimple`, `renderP1Timeline`, `renderP1ArrayRow`, `renderP1ChosenRow`, etc.) rather than building new rendering infra.

Both Dashboard and Roadmap parse fixed markdown heading/checklist structure — if that structure changes in the `co-founder/*.md` files, the matching parser in `index.html` needs a matching update, or the view breaks silently (no error shown beyond the view's own try/catch fallback text).

#### LiveCoding file list

`index.html` fetches `manifest.json` on load to get the file list. When a file is clicked:

1. `localStorage.setItem('dsa-last', name)` saves the selection.
2. `console.clear()` clears Chrome DevTools.
3. A dynamic `import('./filename.js?t=Date.now()')` loads the file fresh (cache-busted).
4. `mod.default()` calls the file's exported `run()` function.
5. All `console.log` calls inside `run()` go directly to Chrome DevTools — no UI interception.

### Live Server auto-rerun

When the user saves a file in VS Code, Live Server reloads `index.html`. On reload, the page reads `localStorage.getItem('dsa-last')` and automatically reruns the last selected file. This means the workflow is: **save in VS Code → page reloads → new output appears in DevTools** with no manual clicks.

### Solution file contract

Every solution file must follow this pattern for the UI to execute it:

```js
// Optional — only if using print() instead of console.log
import print from "./script.js";

export default function run() {
  class Solution {
    methodName(input) {
      // algorithm
    }
  }

  const solution = new Solution();
  console.log(solution.methodName(input));   // appears in Chrome DevTools
  print(solution.methodName(input));         // same — print() wraps console.log
}
```

`run()` is the entry point. Everything — class definition, test cases, console.log calls — lives inside it.

### manifest.json

`manifest.json` is the source of truth for what appears in the sidebar. It is **not** auto-synced with the filesystem — it must be regenerated manually after adding new files:

```bash
node generate-manifest.js
```

`generate-manifest.js` scans the root directory for `*.js` files and excludes infrastructure files via a hardcoded `EXCLUDED` set.

---

## Code Conventions

### File naming
```
category-SubcategoryOrNote-algorithmName.js
```
Examples:
- `array-hashMap-longestConsecutiveSequence.js`
- `twoPointers-threeSum.js`

Use camelCase within each segment. The category prefix groups files visually in the sorted sidebar list.

### Solution structure
- One class `Solution` per file with a clearly named method (matching the problem name).
- Problem statement as a block comment at the top of `run()`.
- Time and Space complexity noted in the block comment.
- Test cases with `console.log` calls below the class, all inside `run()`.
- Detailed step-by-step trace comment at the bottom when useful for learning.

### Imports
- Only ever import from `./script.js` (the `print` utility).
- No other cross-file imports between solution files.
- Infrastructure files (`server.js`, `generate-manifest.js`) use CommonJS (`require`).
- Solution files and `script.js` use ES Modules (`import`/`export`).

---

## Environment Variables

None. No `.env` file. No secrets.

---

## Testing

No test framework. Test cases are written inline inside each `run()` function as `console.log` calls with expected output noted in comments. Output is verified visually in Chrome DevTools console.

---

## Important Notes for AI Assistance

- **After adding a new solution file**, always run `node generate-manifest.js` to register it in the sidebar. Remind the user if they report a file not appearing.
- **`generate-manifest.js` has a hardcoded `EXCLUDED` set**. If new infrastructure `.js` files are added to the project root, add them to `EXCLUDED` in `generate-manifest.js` AND to `EXCLUDED` in `server.js` to prevent them appearing in the sidebar.
- **`server.js` is not the primary workflow** — Live Server is. `server.js` is an alternative if the user is not in VS Code or wants the Node.js server approach. Live Server port is `5501` (set in `.vscode/settings.json`).
- **Never intercept `console.log`** in the UI. The design intent is that all output goes to the real Chrome DevTools console, not a custom panel.
- **Cache-busting** is handled by appending `?t=Date.now()` to dynamic imports. This ensures the latest saved version of a file is always loaded after VS Code edits.
- **`script.js` is excluded from the sidebar** — it's a shared utility, not a solution. Do not rename or move it; existing solution files import it by relative path.
- **`localStorage` key `'dsa-last'`** stores the last selected filename for auto-rerun on Live Server reload. If the stored filename is removed from `manifest.json`, the auto-rerun silently does nothing.
- **ES Module dynamic import with query strings**: relative imports inside a solution file (like `import print from "./script.js"`) resolve correctly even when the parent module URL has a `?t=...` query string, because browsers resolve relative paths against the URL path only.
- All solution files live at the **project root** — no subdirectories. The LiveCoding list is flat, sorted alphabetically.
- **`co-founder/` is Claude's, not Lawrence's.** Read/write it as directed by `skills/skillCoFounderMentor.md`'s Behavior section, not on your own initiative. Its files have a fixed heading/checklist structure that `index.html`'s Dashboard and Roadmap views parse directly — don't restructure headings there without updating the matching parser.
- **`skills/*.md` files are a project-specific prompt convention, not the Claude Code Skill tool.** They're plain markdown, triggered by the user mentioning the filename (e.g. `@skills/skillCoFounderMentor.md`), not registered anywhere else.
- **`.p0-arr-cell` (the shared array/queue box style) must always be placed inside a `.p0-arr-row` (or another `display:flex` parent).** It sizes itself via `flex:0 1 40px`, which only takes effect inside a flex container — without one, a cell falls back to a full-width block element, and `aspect-ratio:1` then makes it a giant square. This bit twice in one session (2026-07-18): the shared class used to use bare `flex:1`, which stretched cells to fill the entire row divided evenly by however many cells existed (a single-cell row rendered at 642×642px); and a primer's `renderP1ArrayRow(...)` call was missing its `.p0-arr-row` wrapper entirely, causing the same full-width collapse. When adding any new array/box visual, verify with an actual `getBoundingClientRect()` check (not just that it renders without console errors) that cell width/height lands near 40px.
