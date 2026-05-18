# skillMaker

Template for generating new skills. Fill `SKILL_NAME` + `PURPOSE`. Prompt Claude with `skillMaker.md`. Claude ask clarifying questions if needed, then generate skill file in `skills/`.

---

## How to use

1. Edit file in place
2. Fill `SKILL_NAME` and `PURPOSE` slots
3. Save
4. Prompt Claude: `skillMaker.md`
5. Claude check fields, ask questions if anything unclear, then write skill file at `skills/<SKILL_NAME>.md`
6. Claude confirm with file path + one-line summary, then reset template

If any slot still has `<<...>>` Claude stop and ask which to fill.

---

## Fill these fields

### SKILL_NAME
<<
>>

### PURPOSE
<<
>>



---

## Generation rules (Claude reads this when user prompts `skillMaker.md`)

When user prompt is exactly `skillMaker.md` (or `/skillMaker.md`):

### Step 1 — Validate

- Read this file
- Verify every `<<...>>` slot filled. If unfilled → ask which to fill, stop
- If `SKILL_NAME` collides with existing file in `skills/`, ask before overwrite

### Step 2 — Clarify (THIS IS NEW)

Before writing skill file, Claude check if `PURPOSE` is clear enough to act on later. If any of these unclear, ask user **one batch of questions** (use AskUserQuestion tool, max 4 questions):

- **Trigger** — what exact prompt(s) activate this skill? (filename? slash command? phrase?)
- **Scope** — which folders/files/routes does this skill touch? what stays off-limits?
- **Behavior** — what does Claude actually DO when triggered? (read X, update Y, generate Z?)
- **Edge cases** — what if input missing? what if conflict? what if user changes mind mid-task?
- **Examples** — concrete before/after example user can confirm
- **Boundaries** — what skill must NOT do? (don't auto-commit, don't delete, don't add auth, etc.)

If `PURPOSE` already covers all of these clearly, skip questioning and go to Step 3.

If asking questions, after user answers → use answers to enrich skill file. Do not write skill until clarification received (unless user says "skip questions, just write it").

### Step 3 — Generate

Write new skill file at `skills/<SKILL_NAME>` (note: SKILL_NAME may already include `.md` — don't double-extension) with this structure:

```markdown
# <SKILL_NAME without extension>

## Trigger

<exact prompt(s) that activate this skill — from PURPOSE or clarification>

## What it means

<plain restatement of PURPOSE in Claude's own words, preserving user's intent and vocabulary>

## Behavior

When triggered, Claude:
1. <step 1 — concrete action>
2. <step 2>
3. <step N>

## Scope

- Touches: <files/folders/routes>
- Off-limits: <what skill must not modify>

## Edge cases

- <case>: <how to handle>
- <case>: <how to handle>

## Boundaries

- <hard rule, e.g. "no auth", "no UI for editing", "don't restructure user content">
- <hard rule>

## Example

User: <example trigger>
Claude: <example response/action>
```

Sections may be omitted if PURPOSE + clarification produced nothing for them. Keep skill self-contained.

### Step 4 — Reset

After write, reset this template — clear `SKILL_NAME` and `PURPOSE` back to `<<...>>` placeholders so ready for next skill.

### Step 5 — Report

Report: file path of new skill + one-line summary of what it does.

Do NOT modify any other file. Do NOT add UI. Do NOT register skill anywhere — file presence in `skills/` is enough.

---

## Constraints on generation

- Skill file must be self-contained markdown
- No code execution required to use skill — pure prompt logic
- Keep skill file under 200 lines unless behavior demands more
- Preserve user's exact wording from `PURPOSE` and clarification answers where possible — don't paraphrase user's voice into corporate speak
- If `SKILL_NAME` collides with existing file in `skills/`, ask before overwrite
- Match user's tone in skill file (informal, direct, lowercase fine) — skills are personal notes-to-future-Claude, not docs

## Why clarification step exists

Two-line PURPOSE often skips: trigger phrasing, scope boundaries, edge cases, what NOT to do. Future Claude reading skill file later won't have this conversation context. Asking questions now → richer skill file → future Claude acts correctly without re-asking user.

Skip questions only when PURPOSE already complete (rare for short purposes, common for long detailed ones).
