# skill_newJsDsaFileCreated

## Trigger

User prompts `skill_newJsDsaFileCreated` — meaning they just created a new `.js` DSA solution file and want it to appear in the browser sidebar.

## What it means

A new `.js` file was added to the project root. The sidebar reads from `manifest.json`, which doesn't auto-sync with the filesystem — it needs to be regenerated so the new file shows up, can be searched, selected, and run (logs visible in Chrome DevTools console).

## Behavior

When triggered, Claude:

1. Run `node generate-manifest.js` in the project root to regenerate `manifest.json` with all current `.js` solution files.
2. Confirm which files are now registered (print the updated file list from the command output).
3. Tell the user: the sidebar will reflect the change on the next Live Server reload (or immediately if the page is refreshed).

## Scope

- Touches: `manifest.json` (via `generate-manifest.js`)
- Off-limits: the solution `.js` files themselves, `index.html`, `server.js`, `script.js`, `generate-manifest.js`

## Edge cases

- **File not ending in `.js`**: `generate-manifest.js` only picks up `.js` files — remind user the file must have a `.js` extension.
- **Infrastructure file accidentally included**: if the new file is in the `EXCLUDED` set inside `generate-manifest.js` it won't appear — check the set and add/remove as needed.
- **File already in manifest**: safe to re-run, it just regenerates the same list.

## Boundaries

- Do NOT edit the new solution file.
- Do NOT modify `index.html` or any UI file.
- Do NOT commit or push anything.
- Do NOT rename or restructure the new file.

## Example

User: `skill_newJsDsaFileCreated`
Claude: runs `node generate-manifest.js`, confirms output showing the new file in the list, tells user the sidebar is updated.
