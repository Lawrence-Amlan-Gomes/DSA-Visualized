# Curriculum

*(The 5-phase plan from zero to interview-ready. Rendered by index.html's Roadmap view — see `loadRoadmapView()` / `renderMarkdown()` in index.html. Each phase is a `## Phase N — Title` heading; everything under it until the next `## ` is that phase's page content, rendered with a small hand-rolled markdown-to-HTML converter (headings, bold, inline code, bullet/numbered lists, paragraphs — nothing fancier). If you add a phase or rename a heading, the parser picks it up automatically since it splits on `## Phase`.)*

## Phase 0 — Complexity Fundamentals

Before touching a single problem, Big O has to be reflexive — something you read off code instantly, not something you look up. This phase is short by design: 2-3 days, not longer. Everything after this starts with "what's the complexity and why," so it has to be automatic.

### What to actually learn

- Time and space complexity notation — Big O, Big Θ, Big Ω (Big O is 95% of what interviews test, but know the difference exists).
- How to read complexity out of code: nested loops multiply, sequential loops add, recursion needs a recurrence relation (branching factor × depth).
- Amortized analysis — why array `push` is O(1) amortized even though resizing is O(n).
- The complexity cheat sheet for core operations: array (access O(1), insert/delete O(n)), hash map (O(1) average, O(n) worst case), BST (O(log n) balanced, O(n) degenerate), heap (O(log n) insert/extract, O(1) peek).
- Space complexity includes recursion stack depth — not just extra data structures.

### How you'll know you're done

You can look at any of the first 5-10 problems in Phase 1 and state the brute-force and optimal complexity before writing a line of code, without hesitating.

## Phase 0.5 — OOP Fundamentals

DSA patterns are only half of most interview loops — a lot of interviewers (especially at product companies) also probe object-oriented design: the four pillars, when to use inheritance vs. composition, and whether you can reason about a class hierarchy out loud. This phase makes that reflexive too, the same way Phase 0 did for Big O.

### What to actually learn

- Classes vs. objects, constructors, and encapsulation (why hide internal state behind methods).
- Abstraction — hiding *how* something works behind a simple interface.
- Inheritance — sharing behavior through an "is-a" relationship, and its pitfalls (fragile base class, deep hierarchies).
- Composition — building behavior by combining smaller pieces ("has-a"), and why "favor composition over inheritance" is common advice.
- Polymorphism — one interface, many implementations; method overriding vs. overloading.
- The SOLID principles at a working level — able to name each one and give a concrete example, not just recite the acronym.
- How JavaScript's own OOP model works under the hood (prototypes, `class` as syntax sugar) since that's the language used throughout this app.

### How you'll know you're done

You can be handed a plain-English design prompt ("design a class for X") and talk through the classes, their responsibilities, and how they relate — inheritance vs. composition, which pillar is doing the work — without hesitating, the same way Phase 0 made complexity analysis automatic.

## Phase 1 — Core Patterns (Blind 75 core → NeetCode 150 breadth)

This is the bulk of the work. Patterns in this order — don't skip ahead to the next one until the current pattern's core trick is something you can explain without looking at a solution:

1. Arrays & Hashing
2. Two Pointers
3. Sliding Window
4. Stack
5. Binary Search
6. Linked List
7. Trees
8. Tries
9. Heap / Priority Queue
10. Backtracking
11. Graphs
12. Advanced Graphs (Union Find, Dijkstra, MST)
13. 1-D Dynamic Programming
14. 2-D Dynamic Programming
15. Greedy / Intervals
16. Bit Manipulation
17. Math & Geometry

Each pattern: roughly 3-6 problems, easy → medium → hard. The live checklist below tracks exactly where you stand per pattern (this is the same data `co-founder/roadmap.md` and the Dashboard use — one source of truth, not three copies).

<!-- LIVE_ROADMAP_CHECKLIST -->

## Phase 2 — Per-Problem Discipline

This is the actual interview-prep part — patterns alone don't pass interviews, the *reasoning process* does. Memorizing 150 solutions without this step is the single most common reason people fail: they know the destination but never practiced the path.

### The sequence, every problem, no exceptions

1. **State the brute force first** — out loud or in a comment — before touching the optimal approach. Include its time and space complexity.
2. **Optimize** — identify what the brute force wastes (repeated work, unnecessary space, wrong data structure) and fix that specifically.
3. **Re-derive complexity** for the optimized solution. If you can't justify it, you don't understand the solution yet.
4. **Edge cases** — empty input, single element, all-duplicates, negative numbers, already-sorted, maximum size. Say them before running, not after a failure.
5. **Write it clean in LiveCoding and run it.** Reading a solution is not the same as producing one under your own hands.

### Rule of thumb

If you jumped straight to the optimal approach without stating the brute force, you skipped the step that actually builds interview reflexes — go back and do it properly, even if you already know the answer.

## Phase 3 — How Mentor Sessions Work

This phase isn't something you "complete" — it's the operating rhythm for all of Phase 1 and 2.

- **`@skills/skillCoFounderMentor.md`** at the start of a session — reads `co-founder/state.md` + `co-founder/roadmap.md`, recaps what happened last time, quizzes on the *why* of the previous problem (not just whether it ran), and assigns the next move as a decision, not a menu.
- **`End Today`** at the end — logs the real outcome, updates the roadmap checklist, and writes anything cross-session-relevant into `co-founder/notes.md` (recurring weak spots, teaching adjustments) so the same gap doesn't get missed twice.
- **The Dashboard view** gives the at-a-glance status; **this Roadmap view** is for studying the plan itself.

The mentor defers to you on sequencing if you push back — the roadmap is a default ordering, not a mandate.

## Phase 4 — Interview Readiness

Only start this once Phase 1's patterns are genuinely solid (not "recognized," but reproducible cold) and Phase 2's discipline is automatic.

### Timed mock problems

25-35 minutes per problem, no hints, think-aloud the whole time as if an interviewer were listening. Mix patterns randomly instead of going pattern-by-pattern — real interviews don't tell you the category in advance.

### Full mock interviews

Complete 45-60 minute simulated rounds: problem statement cold, clarifying questions, brute force, optimization, code, test, complexity — all narrated. Do these with a second person if possible; solo think-aloud practice is the fallback, not the goal.

### Behavioral / system design (if the target role needs it)

Layer this in parallel with mocks near the end, not after — most interview loops mix technical and behavioral rounds, so practicing them in isolation doesn't reflect the real thing.
