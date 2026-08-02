# CLAUDE.md — DSA Visualized

## Project Overview

Personal DSA (Data Structures & Algorithms) practice tool. Lawrence writes JavaScript algorithm solutions in VS Code, then runs them through a browser UI where each file executes in the browser and all `console.log` output appears in Chrome DevTools console.

The UI has four views, each a real route: **Dashboard** (`/dashboard` — live status pulled from `co-founder/state.md` + `co-founder/roadmap.md`), **Bookmarks** (`/bookmarks` — saved external links, cards open in a new tab), **LiveCoding** (`/livecoding` — the original sidebar file list — click a file, it runs, check DevTools), and **Roadmap** (`/roadmap/...` — the 5-phase interview-prep curriculum from `co-founder/curriculum.md`, fully nested per-phase/section/category/problem URLs — see "Roadmap routing" below). `/` redirects to `/livecoding`. That's also the activity-bar order top to bottom. The project also has a mentor/co-founder system (`skills/skillCoFounderMentor.md` + `co-founder/`) that tracks DSA learning progress across sessions — see [co-founder/README.md](co-founder/README.md) for how that folder works. The mentor also exchanges session summaries with mentors from Lawrence's other projects via a cross-project mail system (`mail-box/` inbox + `co-founder/mail-recipients.md` outbox list) — see the "Mail Box" section of `skills/skillCoFounderMentor.md`.

**The app runs on Next.js purely for a better local dev experience (a real `localhost` port, real URL routing) — it is not a rewrite of the teaching content into idiomatic React.** Almost all of the original hand-rolled vanilla-JS UI logic (all 53 problem teaching pages, all 6 Phase 0 modules, every SVG visualization) was ported near-verbatim into `lib/legacyApp.js` and is still imperative DOM manipulation (`innerHTML =`, `.onclick =`), not React state/JSX. Next.js pages are thin shells that render a static container and hand off to that module on mount. Keep new Phase 0/Phase 1 content in that same imperative style — don't convert individual sections to React as you touch them, that fragments the codebase without a real benefit.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js (App Router), plain JavaScript/JSX — no TypeScript |
| UI runtime logic | Vanilla JS (`lib/legacyApp.js`) — ported near-verbatim from the pre-migration single-file app, not React state |
| Runtime | Node.js |
| Dev server | `npm run dev` (Next.js, Turbopack) → `http://localhost:3000` (or next free port) |
| Editor | VS Code |

No `.env`, no database. `package.json` dependencies: `next`, `react`, `react-dom`.

---

## Project Structure

```
DSA Visualized/
├── app/
│   ├── layout.jsx                 # Root layout — imports globals.css, renders <ActivityBar/> + {children}
│   ├── globals.css                # All app CSS (ported verbatim from the old <style> block)
│   ├── page.jsx                   # "/" → redirect('/livecoding')
│   ├── dashboard/page.jsx         # Dashboard view — calls initDashboard() on mount
│   ├── bookmarks/page.jsx         # Bookmarks view — plain server component, reads lib/bookmarks.js directly
│   ├── livecoding/page.jsx        # LiveCoding view — renders container markup, calls initLiveCoding() on mount
│   ├── roadmap/page.jsx           # "/roadmap" → server-side redirect('/roadmap/phase-0')
│   ├── roadmap/[...slug]/page.jsx # Roadmap view — every /roadmap/* path; calls initRoadmap(pathname, router) on mount + every pathname change
│   └── api/
│       ├── co-founder/[file]/route.js   # Reads co-founder/state.md|roadmap.md|curriculum.md (allowlisted) server-side
│       └── solutions/watch/route.js     # SSE endpoint — watches public/solutions/, powers auto-rerun-on-save
├── components/
│   └── ActivityBar.jsx            # Left nav (4 icon links), uses next/link + usePathname for active state
├── lib/
│   ├── legacyApp.js               # ALL the ported UI logic — LiveCoding/Dashboard/Roadmap rendering, Phase 0/Phase 1
│   │                               # teaching content, every render/init function. "use client". See below.
│   └── bookmarks.js               # Plain data array for the Bookmarks view — edit directly to add/remove links
├── public/
│   └── solutions/                 # Solution files live here now (see "Solution files moved" below)
│       ├── manifest.json          # Auto-generated list of solution files shown in LiveCoding
│       ├── script.js              # ES module utility: export default print(...args)
│       └── *.js                   # Solution files, naming: category-algorithm.js
├── generate-manifest.js           # Node script — scans public/solutions/, writes public/solutions/manifest.json
├── next.config.mjs
├── package.json                   # scripts: dev / build / start (all next)
│
├── co-founder/               # Claude's private folder — DSA mentor's memory, not Lawrence's to edit
│   ├── README.md             # index of what's in this folder
│   ├── state.md               # last session + next session starting point
│   ├── roadmap.md             # pattern/topic checklist (live progress)
│   ├── curriculum.md          # 5-phase interview-prep plan, rendered in the Roadmap view
│   ├── session-history.md     # dated log of past sessions
│   ├── notes.md                # freeform cross-session observations
│   └── mail-recipients.md      # other projects' mail-box folder paths this mentor mails on `End Today`
├── mail-box/                 # Inbox for cross-project mail from other projects' co-founder mentors
│   ├── README.md              # what this folder is, not a mail file — never deleted
│   └── <Topic Name>.md         # mail files dropped in by other mentors — read + folded into co-founder/*.md + deleted at next session start
└── skills/                   # Prompt-file conventions (not the Claude Code Skill tool — see skills/skillCoFounderMentor.md)
    ├── skillCoFounderMentor.md   # `@skills/skillCoFounderMentor.md` / `End Today` — the DSA mentor
    └── skill_AddCommitPush.md    # git add/commit/push in one shot
```

`co-founder/`, `mail-box/`, and `skills/` are untouched by the Next.js migration — same location, same rules as always.

---

## Getting Started

```bash
npm install
npm run dev
```

Open the printed `localhost` URL (usually `http://localhost:3000`), it lands on LiveCoding. Open Chrome DevTools → Console (`F12`). Click any file in the sidebar → it runs → logs appear in the console.

---

## Dev Server Session Protocol (for Claude)

Lawrence usually has other projects' dev servers running at the same time (other `next dev` processes on other ports). These rules exist to make sure this project's session never touches them:

- **At the start of every session, start `npm run dev` yourself and tell Lawrence the port** it actually bound to (Next auto-picks the next free port starting at 3000 and prints it — don't assume 3000, read it from the output).
- **Before starting, check what's already running and identify it precisely** — e.g. `lsof -i :3000 -sTCP:LISTEN` then confirm via that PID's cwd (`lsof -p <pid> | grep cwd`) which project it belongs to. Never assume a process on a given port is yours.
- **Never kill a process you didn't start.** If a port is taken by something else, let Next fall through to the next free port — don't kill whatever's already there to reclaim it.
- **Never use a broad pattern kill like `pkill -f "next dev"`.** It matches every Next dev server on the machine, not just this project's — it can silently kill a different project's server. Only ever kill the exact PID you captured when you started your own process.
- You may kill and restart the dev server *you* started (e.g. after clearing `.next` cache, or to pick up a change) — when you do, tell Lawrence you did it and the new port.
- **When wrapping up for the day (`End Today`, or Lawrence otherwise signals the session is done), kill the dev server process you started this session** — by its exact captured PID, not by pattern.

---

## Development Commands

```bash
# Update manifest.json after adding a new solution file (run once)
node generate-manifest.js

# Auto-update manifest.json whenever a new .js file is created (leave running)
node generate-manifest.js --watch

# Dev server
npm run dev      # → http://localhost:3000

# Production build / start (rarely needed for this project, but supported)
npm run build
npm run start
```

---

## Architecture & Key Concepts

### How the UI works

Four real Next.js routes — `/dashboard`, `/bookmarks`, `/livecoding`, `/roadmap` — switched via the left activity bar (`components/ActivityBar.jsx`, using `next/link`). `/` server-redirects to `/livecoding`. Three of the four pages (LiveCoding, Dashboard, Roadmap) are thin client components: each renders the original static container markup (`<div id="view-livecoding">`, etc. — same IDs as before) in JSX, then calls one exported init function from `lib/legacyApp.js` inside a `useEffect` on mount (`initLiveCoding()`, `initDashboard()`, `initRoadmap()`). From that point on, **all rendering inside those three views is the same imperative vanilla JS as before** — `document.getElementById(...).innerHTML = ...`, `.onclick = fn` — React does not re-render or manage that DOM subtree. **Bookmarks is the exception**: it's new (added 2026-07-30, no legacy equivalent to port), so it's a plain React server component that maps `lib/bookmarks.js`'s data array straight to JSX — no `lib/legacyApp.js` involvement, no client-side state. Don't route future *new* features through the imperative `lib/legacyApp.js` pattern by default — that pattern exists to preserve the ported legacy content, not as the house style for everything new; a small static feature like Bookmarks is simpler as a normal React component.

- **Bookmarks** (`/bookmarks`) — `app/bookmarks/page.jsx` reads `lib/bookmarks.js`'s `bookmarks` array (`{ title, url, note? }` objects) and renders each as a card; clicking a card opens `url` in a new tab (`target="_blank"`). No search, no categories, no bookmarking of in-app DSA problems — just a flat list of external links (videos, articles, courses) Lawrence wants saved, modeled on the "Contents" page pattern from his `High Level Design` project. `bookmarks` starts empty — add entries by editing the array directly; never fabricate/guess a URL to seed it.
- **LiveCoding** — the original file-list sidebar, described below.
- **Dashboard** — fetches and parses `/api/co-founder/state.md` + `/api/co-founder/roadmap.md` on mount (`initDashboard()`, exported from `loadDashboard` internally), no caching, always fresh.
- **Roadmap** (`app/roadmap/page.jsx` + `app/roadmap/[...slug]/page.jsx`) — real nested routes, added 2026-08-02 replacing the old single-`/roadmap` + `localStorage`-position design. **The URL is the single source of truth for what's showing — there is no `localStorage` key for roadmap position anymore** (the five keys `dsa-p-phase`/`dsa-p0-section`/`dsa-p05-section`/`dsa-p1-problem`/`dsa-p1-category` are gone; only LiveCoding's `dsa-last` remains). `app/roadmap/page.jsx` is a server component that does a real HTTP `redirect('/roadmap/phase-0')` for the bare `/roadmap` path. Every other `/roadmap/*` path is caught by `app/roadmap/[...slug]/page.jsx`, a client component that reads `usePathname()`/`useRouter()` and calls `initRoadmap(pathname, router)` in a `useEffect` keyed on `pathname` — so it re-runs on every navigation, whether triggered by a sidebar click, browser back/forward, or a fresh page load/refresh. `initRoadmap()` fetches+caches `curriculumPhases` once (skips the fetch on subsequent calls) then calls `renderRoadmapRoute(pathname)`, which parses the URL into a `slug` array and renders whatever it points to. **Routing is still glued together with the same imperative pattern as everything else in `lib/legacyApp.js`** — `renderRoadmapRoute()` sets `#roadmap-content-inner`'s `innerHTML` directly; there's no server-rendered content per route and no file-per-route (all 17 categories × their problems are handled by the one dynamic `[...slug]` catch-all reading from the same `PHASE1_PROBLEMS`/`PHASE1_CATEGORIES`/`PATTERN_PRIMERS` data arrays it always had). A module-level `navRouter` (set at the top of every `initRoadmap()` call) is what click handlers and footer buttons call `.push()`/`.replace()` on instead of mutating local state.

  **URL scheme** (`slugify()` lowercases, turns `&` into `and`, and collapses everything else into `-`; `slugifyPhase()` turns `"Phase 0.5"` into `"phase-0.5"`):
  - `/roadmap/phase-0/<section-id>` — Phase 0's 6 sections, `<section-id>` is the literal `PHASE0_SECTIONS[].id` (`notation`, `reading`, `amortized`, `cheatsheet`, `space`, `checkpoint`).
  - `/roadmap/phase-0.5/<section-id>` — Phase 0.5's 7 sections, same pattern against `PHASE05_SECTIONS[].id`.
  - `/roadmap/phase-1/overview` — the pattern-order list + live progress checklist (curriculum.md's Phase 1 body, unchanged content, now its own page instead of the default landing content shown above every category/problem).
  - `/roadmap/phase-1/<category-slug>` — bare category URL; always redirects (via `navRouter.replace`, computed by `defaultUrlForCategory()`) to `.../guide` if that category has a `PATTERN_PRIMERS` entry, else to its first problem, else — if the category has neither yet (e.g. Bit Manipulation, Math & Geometry) — renders an empty "no problems built yet" state directly at that URL instead of redirecting to itself.
  - `/roadmap/phase-1/<category-slug>/guide` — that category's Pattern Primer, alone on its own page (**no longer shown inline above every problem in that category** — that was the old behavior; primers are a distinct nav item now).
  - `/roadmap/phase-1/<category-slug>/<problem-slug>` — a single problem's page (`<problem-slug>` = `slugify(problem.title)`, e.g. `contains-duplicate`, `two-sum`).
  - `/roadmap/phase-2`, `/phase-3`, `/phase-4` — flat, no further nesting (these phases have no sections/categories).
  - Any unrecognized phase, section, category, or problem segment falls back to `navRouter.replace()`-ing the nearest valid default (first phase, first section, or the category's own default child) rather than 404ing.

  **Phase 0** is special-cased: instead of rendering its whole body as markdown, `renderRoadmapRoute()` only renders curriculum.md's intro paragraph, then hands off to `renderPhase0Extra()` — a hand-built, self-contained interactive teaching module (sliders, SVG charts, toggles, animated simulations, self-check quizzes) defined entirely in `lib/legacyApp.js`, independent of curriculum.md's markdown content. Its sections live in the `PHASE0_SECTIONS` array (id, nav label, render function) — add a new Phase 0 section there, not in curriculum.md; the `id` becomes that section's URL segment automatically. Each section ends with a `#p0-next-footer` that `updateP0NextFooter()` fills with either a "Continue to next section" button, a "Go to Phase 0.5" handoff button (on the section flagged `final: true`), or a "more coming soon" note — these buttons call `navRouter.push(...)` with the next section's/phase's concrete URL, not a bare state mutation. **Phase 0.5 — OOP Fundamentals** (added 2026-08-01, sits between Phase 0 and Phase 1) is special-cased the same way: `renderRoadmapRoute()` renders curriculum.md's intro paragraph only, then hands off to `renderPhase05Extra()`, a self-contained interactive module in `lib/legacyApp.js` covering classes/encapsulation, abstraction, inheritance, composition vs. inheritance, polymorphism, SOLID, and a final interview-question drill — same shape as Phase 0's module (a `PHASE05_SECTIONS` array of `{id, label, render}`, a `#p05-next-footer` filled by `updateP05NextFooter()` with "Continue" / "Go to Phase 1" / "more coming soon"). Add new Phase 0.5 sections to `PHASE05_SECTIONS`, not to curriculum.md. Because "Phase 0.5" isn't an integer, `parseCurriculum()`'s heading regex is `/^(Phase [\d.]+)\s*—\s*(.+)$/` (not `\d+`) — if a future phase number ever needs another non-integer form, that regex is the one to touch. Any code that jumps between phases by name (e.g. Phase 0's final-section button, Phase 0.5's final-section button) looks up the target phase dynamically via `curriculumPhases.find(p => p.num === 'Phase X')` (or the equivalent name-derived URL, since the URL scheme is slug-derived from phase/category/problem names, not array indices) rather than a hardcoded array index — inserting Phase 0.5 shifted every later phase's index, so a hardcoded index would have silently pointed at the wrong phase; this is exactly why the URL scheme is name-based instead of index-based, so a future inserted phase can't silently break other phases' links.

  **Phase 1** renders `/overview` as curriculum.md's markdown body as usual (including the `<!-- LIVE_ROADMAP_CHECKLIST -->` re-fetch/injection from `/api/co-founder/roadmap.md` — unchanged). Category and problem pages render only their own content — no intro markdown, no checklist, no primer duplicated in. **Navigation lives entirely in the sidebar (`#phase-list`), not in the content pane.** `renderSidebar()` (called at the end of every `renderRoadmapRoute()`) renders all 5 phase items, and — right after the Phase 1 phase item specifically — also renders `renderP1SidebarTree()`: all 17 `PHASE1_CATEGORIES` as their own nested nav items, always listed. Clicking a category expands it (single-expand accordion, driven by `currentP1Category`, derived from the current URL, not persisted anywhere) to reveal, directly underneath, a **`📘 Guide` nav item first (only if that category has a `PATTERN_PRIMERS` entry) followed by that category's problems** — only one category is ever expanded at a time. Categories with no problems yet render with a `.empty` class (grayed, non-expanding) instead of dead-ending in an empty list. A problem's `pattern` field must exactly match one of the `PHASE1_CATEGORIES` strings or it won't surface under any category (and its slug will never resolve). `bindPhase1Handlers()` only wires each problem's interactive stepper and the next-footer, not navigation — sidebar clicks call `navRouter.push()` directly with the target's concrete URL. Switching between Phase 0/Phase 0.5 sections resets `#roadmap-content`'s scroll to top (`resetScrollNext` flag); switching between Phase 1 categories/problems instead captures and restores `#roadmap-content`'s `scrollTop` around the navigation (`pendingScrollTop`, checked at the end of `renderRoadmapRoute()`) so switching nav items preserves content scroll position rather than resetting it. Each problem page follows a fixed shape: plain-English statement, a non-spoiler visual of the *concept* (never the algorithm), a "before you code" prompt list, a `renderP1Workflow(file)` callout naming the exact `.js` file to open, then a closed-by-default `<details class="p0-reveal">` gating the brute force, optimal approach, an interactive step-through simulation, edge cases, and a complexity table — closed so Lawrence attempts the problem himself before seeing the answer. `#p1-next-footer` is filled by `updateP1NextFooter()` the same way `#p0-next-footer` is, navigating via `navRouter.push()` to the next problem's concrete URL. New problems are added to `PHASE1_PROBLEMS` one at a time as mentor sessions reach them, not built out in bulk ahead of time — and the matching solution `.js` file (now in `public/solutions/`) should be stubbed (problem comment + empty method + test calls, no solution) before Lawrence is pointed at it, since older solution files were bulk-imported from a previous project and often already contain a full answer **and sometimes have wrong `// Expected:` comments even when the code is correct** — run the baked file and manually verify each expected value before stubbing, don't just check whether a `class Solution` already exists. **`PATTERN_PRIMERS`** is a separate registry (category name → render function): whenever `/roadmap/phase-1/<category-slug>/guide` is visited, that entry's markup renders alone on the page, inside a `.p1-primer` wrapper — **not inline above the active problem's page anymore** (that was the pre-routing behavior; the primer is its own `Guide` nav item now, one level under the category, per Lawrence's 2026-08-02 request). A primer teaches the *pattern itself* (what it is, how it works, when to reach for it, common variations, a complexity cheat-sheet) — never one specific problem. Like `PHASE1_PROBLEMS`, primers are authored incrementally: only categories with at least one problem *authored* have an entry; categories still at 0 problems simply have no key in `PATTERN_PRIMERS`, show no `Guide` nav item, and their bare category URL renders the empty "no problems yet" state directly. **Add the primer at the same time as a category's first problem, not gated behind that problem being solved** — Lawrence needs the pattern's conceptual grounding before attempting problem 1, not after. Reuse that pattern's existing shared visual helper (`renderP1Trie`, `renderP1Heap`, `renderP1TreeSVG`, `renderP1GraphSVG`, `renderP1LLChainSimple`, `renderP1Timeline`, `renderP1ArrayRow`, `renderP1ChosenRow`, etc.) rather than building new rendering infra. **`renderP1Callout(kind, title, bodyHtml)`** is a small reusable emphasis box (`kind` is `'idea'`, `'remember'`, or `'warning'`) for highlighting the one thing that matters most in a section — added 2026-07-30, inspired by the callout pattern in Lawrence's other project (`High Level Design`)'s mentor system. Use it sparingly, next to a real diagram, never as a substitute for one — a callout is text emphasis, not a visual.

Both Dashboard and Roadmap parse fixed markdown heading/checklist structure — if that structure changes in the `co-founder/*.md` files, the matching parser in `lib/legacyApp.js` needs a matching update, or the view breaks silently (no error shown beyond the view's own try/catch fallback text).

#### LiveCoding file list

`initLiveCoding()` (in `lib/legacyApp.js`) fetches `/solutions/manifest.json` on mount to get the file list. When a file is clicked:

1. `localStorage.setItem('dsa-last', name)` saves the selection.
2. `console.clear()` clears Chrome DevTools.
3. A dynamic `import('/solutions/filename.js?t=Date.now()')` loads the file fresh (cache-busted) — see "Why `dynamicImport` looks odd" below.
4. `mod.default()` calls the file's exported `run()` function.
5. All `console.log` calls inside `run()` go directly to Chrome DevTools — no UI interception.

#### Why `dynamicImport` looks odd

Solution files must load as real, unbundled runtime ES modules — Lawrence edits them freely with zero build step and expects an instant cache-busted re-run, so they must NOT be resolved/bundled by Next's bundler at build time. A plain `import(\`/solutions/${name}?t=...\`)` gets statically analyzed by Turbopack/webpack and fails to build (`Module not found`) because the specifier isn't a literal string. `lib/legacyApp.js` works around this with `new Function('specifier', 'return import(specifier)')`, built once at module scope and reused — this hides the `import()` call from bundler static analysis entirely, so it only ever executes as a genuine runtime browser import. Don't "simplify" this back to a plain template-literal `import()`; it will silently break the build.

### Auto-rerun on save (replaces the old Live Server reload)

Previously, VS Code's Live Server reloaded the whole page on any file save, and the page auto-reran the last-selected file on load. Next's dev server doesn't watch `public/` the same way, so this is now reproduced deliberately: `app/api/solutions/watch/route.js` is a Server-Sent-Events endpoint that runs `fs.watch()` on `public/solutions/` (debounced ~200ms) and pushes a message on any `.js` change. `initLiveCoding()` opens an `EventSource` to it and reruns the currently-open file whenever a message arrives — matching the old "save any solution file → open file reruns" behavior. The connection is closed in the page's `useEffect` cleanup.

### Solution file contract

Every solution file (under `public/solutions/`) must follow this pattern for the UI to execute it:

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

`run()` is the entry point. Everything — class definition, test cases, console.log calls — lives inside it. **This contract did not change in the migration** — it was kept exactly as-is by design.

### manifest.json

`public/solutions/manifest.json` is the source of truth for what appears in the sidebar. It is **not** auto-synced with the filesystem — it must be regenerated manually after adding new files:

```bash
node generate-manifest.js
```

`generate-manifest.js` scans `public/solutions/` for `*.js` files and excludes `script.js` (hardcoded `EXCLUDED` set), writing `public/solutions/manifest.json`.

### `lib/legacyApp.js` and server-side rendering — read before adding module-scope state

This file has `"use client"` at the top, but Next.js still executes a client component's module code once on the server for the initial HTML (SSR), where `window`/`document`/`localStorage` don't exist. The file defines `const isBrowser = typeof window !== 'undefined';` at the top for exactly this reason. **Any new module-scope (top-level, outside a function) code that reads `localStorage`, `window`, or `document` must be guarded with `isBrowser`**, e.g. `let x = (isBrowser && localStorage.getItem('key')) || fallback;` — code *inside* an exported `init...()` function or any function only ever called from a `useEffect` doesn't need this, since those never run during SSR. Getting this wrong doesn't error loudly in dev the first time — it surfaces as an SSR crash (500) or a failed `next build`, so if you add a new `localStorage`/`window` read that isn't inside a function, check `npm run build` before considering the change done.

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
- Solution files only ever import from `./script.js` (the `print` utility) — no other cross-file imports between solution files.
- `generate-manifest.js` uses CommonJS (`require`).
- Solution files, `script.js`, and everything under `app/`/`lib`/`components` use ES Modules (`import`/`export`).

---

## Environment Variables

None. No `.env` file. No secrets.

---

## Testing

No test framework. Test cases are written inline inside each `run()` function as `console.log` calls with expected output noted in comments. Output is verified visually in Chrome DevTools console.

---

## Important Notes for AI Assistance

- **After adding a new solution file**, always run `node generate-manifest.js` to register it in the sidebar. Remind the user if they report a file not appearing. Solution files go in `public/solutions/`, not the project root.
- **`generate-manifest.js` has a hardcoded `EXCLUDED` set** (currently just `script.js`). If a new infrastructure file needs to live in `public/solutions/` for some reason, add it there too.
- **Never intercept `console.log`** in the UI. The design intent is that all output goes to the real Chrome DevTools console, not a custom panel.
- **Cache-busting** is handled by appending `?t=Date.now()` to the dynamic import — see "Why `dynamicImport` looks odd" above for why it's built via `new Function` instead of a plain `import()`.
- **`script.js` is excluded from the sidebar** — it's a shared utility, not a solution. Do not rename or move it; existing solution files import it by relative path (`./script.js`, resolved against `public/solutions/`).
- **`localStorage` keys**: only `dsa-last` remains (LiveCoding, last-run file). The Roadmap's five position keys (`dsa-p-phase`, `dsa-p0-section`, `dsa-p05-section`, `dsa-p1-problem`, `dsa-p1-category`) were removed 2026-08-02 when Roadmap moved to real nested routes — the URL is the source of truth for position now, not `localStorage`. Any future module-scope `localStorage`/`window` read still needs the `isBrowser` guard described above.
- All solution files live in **`public/solutions/`** — no further subdirectories. The LiveCoding list is flat, sorted alphabetically.
- **`co-founder/` is Claude's, not Lawrence's.** Read/write it as directed by `skills/skillCoFounderMentor.md`'s Behavior section, not on your own initiative. Its files have a fixed heading/checklist structure that `app/api/co-founder/[file]/route.js` serves and `lib/legacyApp.js`'s Dashboard/Roadmap parsers consume directly — don't restructure headings there without updating the matching parser. The route only serves an allowlist (`state.md`, `roadmap.md`, `curriculum.md`) — a new co-founder file needs adding to that allowlist to be fetchable.
- **`skills/*.md` files are a project-specific prompt convention, not the Claude Code Skill tool.** They're plain markdown, triggered by the user mentioning the filename (e.g. `@skills/skillCoFounderMentor.md`), not registered anywhere else.
- **A scrolling container's `max-width` must live on an inner wrapper, never on the scrolling element itself, or the scrollbar floats away from the true window edge instead of sitting flush against it.** Caught 2026-07-30 on `#roadmap-content`: it had both `overflow-y:auto` and `max-width:760px` on the same element, so on any viewport wider than ~1050px the element (and its scrollbar) stopped growing at 760px, leaving a visible gap between the scrollbar and the actual right edge of the window. Fixed by splitting it into `#roadmap-content` (owns `flex:1` + `overflow-y:auto`, no width cap, so it always spans full available width) and a nested `#roadmap-content-inner` (owns `max-width:760px` + the padding, holds the actual rendered content). `lib/legacyApp.js` sets `innerHTML` on `#roadmap-content-inner`; scroll-position save/restore (`pendingScrollTop`/`resetScrollNext`, checked at the end of `renderRoadmapRoute()`) still reads/writes `#roadmap-content`'s `scrollTop`, since that's still the real scrolling element. If a similar full-width scrollable pane gets added later, use the same two-element split — verify with `getBoundingClientRect()` that the scroller's right edge matches `window.innerWidth`, not just that content renders.
- **`.p0-arr-cell` (the shared array/queue box style) must always be placed inside a `.p0-arr-row` (or another `display:flex` parent).** It sizes itself via `flex:0 1 40px`, which only takes effect inside a flex container — without one, a cell falls back to a full-width block element, and `aspect-ratio:1` then makes it a giant square. This bit twice in one session (2026-07-18, pre-migration): the shared class used to use bare `flex:1`, which stretched cells to fill the entire row divided evenly by however many cells existed (a single-cell row rendered at 642×642px); and a primer's `renderP1ArrayRow(...)` call was missing its `.p0-arr-row` wrapper entirely, causing the same full-width collapse. When adding any new array/box visual, verify with an actual `getBoundingClientRect()` check (not just that it renders without console errors) that cell width/height lands near 40px. (Verified unaffected by the Next.js migration — checked live post-migration.)
