# co-founder/

This folder is Claude's, not Lawrence's. It's where `skillCoFounderMentor.md` keeps the data it would otherwise have to carry inline — split into files so the skill file itself stays short and readable, and each piece can be read/written independently instead of rewriting one giant block every session.

Entry point is still `skills/skillCoFounderMentor.md` — that's what Lawrence invokes. It points here for the actual content.

| File | What's in it | When it's touched |
|---|---|---|
| [state.md](state.md) | Last Session snapshot + Next Session Starting Point — the "hot" state read at the top of every session | Rewritten on every `End Today` |
| [roadmap.md](roadmap.md) | Pattern/topic checklist (done / partial / not-started) | Checkboxes updated on `End Today`; new rows added only when a real gap surfaces |
| [session-history.md](session-history.md) | Dated log of every past session, newest first | Appended (prepended) on every `End Today` — never rewritten, only grown |
| [notes.md](notes.md) | Freeform, persistent observations that don't fit the other three — recurring weak spots, teaching adjustments, things worth remembering across many sessions | Edited whenever something cross-session-relevant surfaces, not on a fixed schedule |
| [curriculum.md](curriculum.md) | The 5-phase interview-prep plan (complexity fundamentals → patterns → per-problem discipline → mentor rhythm → interview readiness), one `## Phase N — Title` section per phase | Static reference content — edited only when the actual plan changes, not on a session cadence |

`index.html`'s Dashboard view fetches `state.md` and `roadmap.md` directly (see `loadDashboard()` in the script) and parses their fixed heading structure. The Roadmap view fetches `curriculum.md` (see `loadRoadmapView()`), splits it into phases on `## Phase`, and renders each phase's body with a small hand-rolled markdown renderer — it also fetches `roadmap.md` again to inject the live checklist wherever curriculum.md has a `<!-- LIVE_ROADMAP_CHECKLIST -->` marker. If heading names or checklist syntax change in any of these files, update the matching parser in `index.html`, or the view breaks silently.
