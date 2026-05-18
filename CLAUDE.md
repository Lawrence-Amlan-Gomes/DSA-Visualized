# CLAUDE.md — DSA Visualized

## Project Overview

Personal DSA (Data Structures & Algorithms) practice tool. Lawrence writes JavaScript algorithm solutions in VS Code, then runs them through a browser sidebar UI where each file executes in the browser and all `console.log` output appears in Chrome DevTools console. No frameworks, no build step.

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
├── index.html               # Browser UI — sidebar with file list + search
├── manifest.json            # Auto-generated list of solution files shown in sidebar
├── generate-manifest.js     # Node script — updates manifest.json when files are added
├── script.js                # ES module utility: export default print(...args)
├── server.js                # Optional alt to Live Server — serves on port 4040
├── package.json             # scripts.start → node server.js
├── .vscode/
│   └── settings.json        # Live Server port set to 5501
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

### How the sidebar UI works

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
- All solution files live at the **project root** — no subdirectories. The sidebar is a flat list sorted alphabetically.
