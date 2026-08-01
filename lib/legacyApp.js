"use client";

// This module is imported by client components that Next.js still renders
// once on the server for the initial HTML — module-scope code here runs in
// Node too, where window/localStorage don't exist. Guard reads with this.
const isBrowser = typeof window !== 'undefined';

// Solution files live under public/solutions/ and must be loaded as real,
// unbundled runtime imports (not resolved by Next's bundler at build time —
// they're written and edited freely with zero build step). Building the
// import() call via `new Function` hides it from static bundler analysis.
const dynamicImport = isBrowser ? new Function('specifier', 'return import(specifier)') : null;

let allFiles = [];
let currentFile = null;

export async function initLiveCoding() {
  // Load file list from manifest.json
  try {
    const data = await fetch('/solutions/manifest.json').then(r => r.json());
    allFiles = data.files || [];
  } catch {
    document.getElementById('main-hint').textContent =
      'manifest.json not found — run: node generate-manifest.js';
  }

  renderList(allFiles);

  // Auto-rerun last file after it changes on disk (see EventSource below)
  const last = localStorage.getItem('dsa-last');
  if (last && allFiles.includes(last)) runFile(last);

  // Search
  document.getElementById('search').oninput = e => {
    const q = e.target.value.trim().toLowerCase();
    renderList(q ? allFiles.filter(f => f.toLowerCase().includes(q)) : allFiles);
  };

  // Auto-rerun on file save — Next's dev server doesn't watch public/ for us,
  // so a small API route watches it and pushes a message here instead.
  const es = new EventSource('/api/solutions/watch');
  es.onmessage = () => { if (currentFile) runFile(currentFile); };

  return () => es.close();
}

  function renderList(files) {
    const list  = document.getElementById('file-list');
    const count = document.getElementById('file-count');
    count.textContent = `${files.length} file${files.length !== 1 ? 's' : ''}`;
    list.innerHTML = '';
    files.forEach(name => {
      const el = document.createElement('div');
      el.className = 'file-item' + (name === currentFile ? ' active' : '');
      el.dataset.name = name;
      el.title = name;
      el.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" style="flex-shrink:0">
          <path d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5L9.5 1Z" fill="#eab308"/>
          <path d="M9.5 1v3.5H13" fill="none" stroke="#f97316" stroke-width="1"/>
          <text x="4.5" y="11" font-size="4.5" fill="#0a0a0a" font-family="monospace" font-weight="bold">JS</text>
        </svg>
        <span class="file-name">${name}</span>`;
      el.onclick = () => runFile(name);
      list.appendChild(el);
    });
  }

  async function runFile(name) {
    currentFile = name;
    localStorage.setItem('dsa-last', name);

    document.querySelectorAll('.file-item').forEach(el =>
      el.classList.toggle('active', el.dataset.name === name));

    const hint = document.getElementById('main-hint');
    document.getElementById('main-file').style.display = 'block';
    document.getElementById('main-file').textContent = name;
    hint.className = '';
    hint.textContent = 'Running…';
    document.getElementById('btn-rerun').style.display = 'inline-block';

    // Clear console and run — logs go straight to Chrome DevTools
    console.clear();
    console.log(`%c▶ ${name}`, 'color:#3b82f6;font-weight:bold;font-size:13px');

    try {
      // Cache-bust so the browser always loads the latest saved version
      const mod = await dynamicImport(`/solutions/${name}?t=${Date.now()}`);
      if (typeof mod.default === 'function') mod.default();
      hint.className = 'success';
      hint.textContent = 'Done — check DevTools console (F12)';
    } catch (e) {
      console.error(e);
      hint.className = 'error';
      hint.textContent = `Error: ${e.message}`;
    }
  }

  if (isBrowser) window.rerun = () => { if (currentFile) runFile(currentFile); };

  // ── Dashboard: reads co-founder/state.md + co-founder/roadmap.md ──
  export async function initDashboard() {
    const lastEl     = document.getElementById('dash-last-session');
    const nextEl     = document.getElementById('dash-next-move');
    const roadmapEl  = document.getElementById('dash-roadmap');

    let state;
    try {
      const fetchText = url => fetch(`${url}?t=${Date.now()}`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
        return r.text();
      });
      const [stateMd, roadmapMd] = await Promise.all([
        fetchText('/api/co-founder/state.md'),
        fetchText('/api/co-founder/roadmap.md'),
      ]);
      state = parseMentorFiles(stateMd, roadmapMd);
    } catch (e) {
      renderStats([]);
      lastEl.innerHTML    = `<h2>Last Session</h2><p class="empty">Couldn't load co-founder/ files (${e.message}). Check that co-founder/state.md and co-founder/roadmap.md exist and the dev server is running.</p>`;
      nextEl.innerHTML    = '';
      roadmapEl.innerHTML = '';
      return;
    }

    renderStats(state.roadmap);

    lastEl.innerHTML = `<h2>Last Session</h2>` + (
      state.lastSession.length
        ? `<ul>${state.lastSession.map(li => `<li>${mdInline(li)}</li>`).join('')}</ul>`
        : `<p class="empty">No session logged yet.</p>`
    );

    nextEl.innerHTML = `<h2>Next Move</h2><p>${state.nextMove ? mdInline(state.nextMove) : '<span class="empty">Not set.</span>'}</p>`;

    roadmapEl.innerHTML = `<h2>Roadmap</h2>` + renderChecklistItems(state.roadmap);
  }

  // Shared by the Dashboard's roadmap card and the Roadmap view's Phase 1 embed
  function parseRoadmapChecklist(roadmapMd) {
    return roadmapMd.split('\n')
      .filter(l => /^- \[[ x~]\]/.test(l.trim()))
      .map(l => {
        const t = l.trim();
        return { status: t[3], text: t.slice(6).trim() };
      });
  }

  function renderChecklistItems(items) {
    return items.map(r => {
      const cls = r.status === 'x' ? 'done' : r.status === '~' ? 'partial' : 'todo';
      return `<div class="roadmap-item ${cls}"><span class="roadmap-dot"></span><span class="text">${escapeHtml(r.text)}</span></div>`;
    }).join('');
  }

  // ── Roadmap view: reads co-founder/curriculum.md, one page per phase ──
  let curriculumPhases = [];
  let currentPhaseIndex = (isBrowser && Number(localStorage.getItem('dsa-p-phase'))) || 0;

  export async function initRoadmap() {
    const listEl = document.getElementById('phase-list');

    try {
      const md = await fetch(`/api/co-founder/curriculum.md?t=${Date.now()}`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      });
      curriculumPhases = parseCurriculum(md);
    } catch (e) {
      listEl.innerHTML = '';
      document.getElementById('roadmap-content-inner').innerHTML = `<p style="color:var(--red)">Couldn't load co-founder/curriculum.md (${e.message}). Check that the file exists and the dev server is running.</p>`;
      return;
    }

    renderSidebar();
    showPhase(currentPhaseIndex);
  }

  // ── Single side navbar: phase items, with Phase 1 split into its own nested
  // category/problem nav items (instead of pills buried inside the content pane).
  // Categories are always listed; a category's problems only show while it's the
  // expanded one (single-expand accordion — matches currentP1Category being one value).
  function renderSidebar() {
    const listEl = document.getElementById('phase-list');
    if (!listEl) return;

    listEl.innerHTML = curriculumPhases.map((phase, i) => {
      const phaseItemHtml = `<div class="phase-item${i === currentPhaseIndex ? ' active' : ''}" data-phase-idx="${i}">
        <span class="phase-num">${escapeHtml(phase.num)}</span><span class="phase-title">${escapeHtml(phase.title)}</span>
      </div>`;
      return phase.num === 'Phase 1' ? phaseItemHtml + renderP1SidebarTree() : phaseItemHtml;
    }).join('');

    listEl.querySelectorAll('.phase-item').forEach(el => {
      el.onclick = () => showPhase(Number(el.dataset.phaseIdx));
    });
    listEl.querySelectorAll('[data-p1cat]').forEach(el => {
      el.onclick = () => goToP1Category(el.dataset.p1cat);
    });
    listEl.querySelectorAll('[data-p1]').forEach(el => {
      el.onclick = () => goToP1Problem(el.dataset.p1);
    });
  }

  function renderP1SidebarTree() {
    const catsHtml = PHASE1_CATEGORIES.map(cat => {
      const problemsInCategory = PHASE1_PROBLEMS.filter(p => p.pattern === cat);
      const isEmpty = !problemsInCategory.length;
      const isExpanded = cat === currentP1Category;
      const catHtml = `<div class="p1-cat-item${isExpanded ? ' expanded' : ''}${isEmpty ? ' empty' : ''}" data-p1cat="${escapeHtml(cat)}">${escapeHtml(cat)}</div>`;
      if (!isExpanded || isEmpty) return catHtml;
      const probsHtml = problemsInCategory.map(p =>
        `<div class="p1-prob-item${p.id === currentP1Problem ? ' active' : ''}" data-p1="${p.id}">${escapeHtml(p.title)}</div>`
      ).join('');
      return catHtml + `<div class="p1-prob-list">${probsHtml}</div>`;
    }).join('');
    return `<div class="p1-sidebar-tree">${catsHtml}</div>`;
  }

  // Splits curriculum.md into phases on "## Phase N — Title" headings
  function parseCurriculum(md) {
    return md.split(/\n(?=## Phase )/)
      .filter(block => block.trim().startsWith('## Phase'))
      .map(block => {
        const lines   = block.split('\n');
        const heading = lines[0].replace(/^##\s*/, '').trim();
        const body    = lines.slice(1).join('\n').trim();
        const m = heading.match(/^(Phase [\d.]+)\s*—\s*(.+)$/);
        return { num: m ? m[1] : heading, title: m ? m[2] : '', body };
      });
  }

  async function showPhase(index) {
    const phase = curriculumPhases[index];
    if (!phase) return;
    currentPhaseIndex = index;
    localStorage.setItem('dsa-p-phase', String(index));
    renderSidebar();

    const isPhase0 = phase.num === 'Phase 0';
    const isPhase05 = phase.num === 'Phase 0.5';
    const isPhase1 = phase.num === 'Phase 1';
    let html;
    if (isPhase0) {
      const introBody = phase.body.split(/\n### /)[0].trim();
      html = `<h2 class="phase-title-main">${escapeHtml(phase.num)} — ${escapeHtml(phase.title)}</h2>`
        + renderPhase0Extra(renderMarkdown(introBody));
    } else if (isPhase05) {
      const introBody = phase.body.split(/\n### /)[0].trim();
      html = `<h2 class="phase-title-main">${escapeHtml(phase.num)} — ${escapeHtml(phase.title)}</h2>`
        + renderPhase05Extra(renderMarkdown(introBody));
    } else if (isPhase1) {
      html = `<h2 class="phase-title-main">${escapeHtml(phase.num)} — ${escapeHtml(phase.title)}</h2>`
        + renderMarkdown(phase.body) + renderPhase1Extra();
    } else {
      html = `<h2 class="phase-title-main">${escapeHtml(phase.num)} — ${escapeHtml(phase.title)}</h2>` + renderMarkdown(phase.body);
    }

    if (html.includes('<!-- LIVE_ROADMAP_CHECKLIST -->')) {
      let checklistHtml = `<p class="empty" style="color:var(--muted)">Couldn't load live checklist.</p>`;
      try {
        const roadmapMd = await fetch(`/api/co-founder/roadmap.md?t=${Date.now()}`).then(r => r.text());
        checklistHtml = `<div class="live-checklist"><h4>Live Progress</h4>${renderChecklistItems(parseRoadmapChecklist(roadmapMd))}</div>`;
      } catch {}
      html = html.replace('<!-- LIVE_ROADMAP_CHECKLIST -->', checklistHtml);
    }

    document.getElementById('roadmap-content-inner').innerHTML = html;
    if (isPhase0) bindPhase0Handlers();
    if (isPhase05) bindPhase05Handlers();
    if (isPhase1) bindPhase1Handlers();
  }

  // ── Phase 0: interactive learning module (built section by section, not chat) ──
  const PHASE0_SECTIONS = [
    { id: 'notation',   label: '1 · Big O, Θ, Ω',         render: renderP0Notation },
    { id: 'reading',    label: '2 · Reading Code',        render: renderP0Reading },
    { id: 'amortized',  label: '3 · Amortized Analysis',  render: renderP0Amortized },
    { id: 'cheatsheet', label: '4 · Cheat Sheet',         render: renderP0CheatSheet },
    { id: 'space',      label: '5 · Space Complexity',    render: renderP0Space },
    { id: 'checkpoint', label: '6 · Check Yourself',      render: renderP0Checkpoint, final: true },
  ];
  let currentP0Section = (isBrowser && localStorage.getItem('dsa-p0-section')) || PHASE0_SECTIONS[0].id;

  function renderPhase0Extra(introHtml) {
    const navHtml = PHASE0_SECTIONS.map(s =>
      `<div class="p0-nav-item${s.id === currentP0Section ? ' active' : ''}" data-p0="${s.id}">${escapeHtml(s.label)}</div>`
    ).join('');
    const active = PHASE0_SECTIONS.find(s => s.id === currentP0Section) || PHASE0_SECTIONS[0];

    return `${introHtml}<div class="p0-nav">${navHtml}</div><div class="p0-container" id="p0-body">${active.render()}</div>`;
  }

  function bindPhase0Handlers() {
    document.querySelectorAll('.p0-nav-item').forEach(el => {
      el.onclick = () => goToP0Section(el.dataset.p0);
    });
    initP0Chart();
    initP0LoopViz();
    initP0RecursionViz();
    initP0TraceChart();
    initP0AmortChart();
    initP0ArrayViz();
    initP0HashViz();
    initP0BstViz();
    initP0HeapViz();
    initP0StackTower();
    initP0SpaceViz();
    updateP0NextFooter();
  }

  async function goToP0Section(id) {
    currentP0Section = id;
    localStorage.setItem('dsa-p0-section', id);
    await showPhase(currentPhaseIndex);
    const contentEl = document.getElementById('roadmap-content');
    if (contentEl) contentEl.scrollTop = 0;
  }

  // Renders a "Continue →" button when a next section already exists, a "Go to Phase 1" button on the final
  // section, otherwise an honest "not built yet" note
  function updateP0NextFooter() {
    const footer = document.getElementById('p0-next-footer');
    if (!footer) return;
    const idx = PHASE0_SECTIONS.findIndex(s => s.id === currentP0Section);
    const current = PHASE0_SECTIONS[idx];
    const next = PHASE0_SECTIONS[idx + 1];
    if (next) {
      footer.innerHTML = `<button class="p0-next-btn" id="p0-next-btn">Continue to Section ${escapeHtml(next.label)} →</button>`;
      document.getElementById('p0-next-btn').onclick = () => goToP0Section(next.id);
    } else if (current && current.final) {
      footer.innerHTML = `<button class="p0-next-btn" id="p0-next-btn">Go to Phase 0.5 — OOP Fundamentals →</button>`;
      document.getElementById('p0-next-btn').onclick = () => {
        const idx = curriculumPhases.findIndex(p => p.num === 'Phase 0.5');
        if (idx >= 0) showPhase(idx);
      };
    } else {
      footer.textContent = "You've reached the end of what's built so far in Phase 0 — more sections coming soon.";
    }
  }

  function renderP0Notation() {
    return `
    <div class="p0-section-title">Big O, Big Θ, Big Ω — what "complexity notation" actually means</div>
    <div class="p0-section-sub">Section 1 of Phase 0 — read once, use the chart, come back if it doesn't stick.</div>

    <p>Every algorithm's runtime depends on the size of its input, almost always called <code>n</code>. Big-O notation isn't a stopwatch measurement — it describes how the number of operations <em>grows</em> as <code>n</code> grows. Three symbols show up, and each is a different kind of bound on that growth, not an exact count.</p>

    <div class="p0-card">
      <h4>The three bounds, plain English</h4>
      <div class="p0-bound-row">
        <div class="p0-bound-sym o">O</div>
        <div class="p0-bound-text"><strong>Big O — the ceiling.</strong> "At most this slow." An upper bound on how bad it can get.<span class="tag">This is 95% of what interviews test — when someone says "what's the complexity," they mean Big O.</span></div>
      </div>
      <div class="p0-bound-row">
        <div class="p0-bound-sym omega">Ω</div>
        <div class="p0-bound-text"><strong>Big Omega — the floor.</strong> "At least this fast." A lower bound on how good it can get, even in the best possible case.</div>
      </div>
      <div class="p0-bound-row">
        <div class="p0-bound-sym theta">Θ</div>
        <div class="p0-bound-text"><strong>Big Theta — the tight bound.</strong> "Exactly this." Only applies when the floor and the ceiling meet — best case and worst case are the same order of growth.</div>
      </div>
    </div>

    <div class="p0-card">
      <h4>Worked example A — floor and ceiling meet (Θ applies)</h4>
      <p>Summing every element in an array of size <code>n</code>:</p>
      <pre class="p0-code">let total = 0;
for (const x of arr) total += x;</pre>
      <p>No matter what's inside the array — all zeros, huge numbers, sorted or shuffled — this loop runs exactly <code>n</code> times. Best case = worst case = <code>n</code>. Floor and ceiling are the same curve, so this is <strong>Θ(n)</strong>: simultaneously O(n) <em>and</em> Ω(n).</p>
      <div class="p0-diagram-col">
        <div class="p0-diagram-label">Ω(n) and O(n) collapse onto one line</div>
        <div class="p0-range-track"><div class="p0-range-fill" style="left:47%;width:6%"></div></div>
        <div class="p0-range-tags"><span>Ω(n) — floor</span><span>Θ(n) — tight</span><span>O(n) — ceiling</span></div>
      </div>
      <details class="p0-reveal"><summary>Why can't this ever be faster or slower than n?</summary>
        <p>Every element has to be visited at least once to end up in the total — skip one and the answer is wrong. That's the Ω(n) floor. It also never needs a second pass — that's the O(n) ceiling. Floor = ceiling = Θ(n).</p>
      </details>
    </div>

    <div class="p0-card">
      <h4>Worked example B — floor and ceiling diverge (no single Θ)</h4>
      <p>Linear search for a target value:</p>
      <pre class="p0-code">for (let i = 0; i &lt; arr.length; i++) {
  if (arr[i] === target) return i;
}
return -1;</pre>
      <p>Best case: the target is at index 0 → 1 comparison → <strong>Ω(1)</strong>. Worst case: the target is missing (or last) → n comparisons → <strong>O(n)</strong>. Constant and linear are different orders of growth, so there is no single Θ that describes linear search in general.</p>
      <div class="p0-diagram-col">
        <div class="p0-diagram-label">Ω(1) and O(n) stay far apart</div>
        <div class="p0-range-track"><div class="p0-range-fill" style="left:2%;width:96%"></div></div>
        <div class="p0-range-tags"><span>Ω(1) — floor</span><span>no Θ</span><span>O(n) — ceiling</span></div>
      </div>
      <details class="p0-reveal"><summary>So what do interviewers actually mean by "the complexity" of linear search?</summary>
        <p>They mean the worst case, O(n) — that's the default reading of Big O unless someone specifies otherwise. Knowing Ω and Θ exist is what separates "I memorized O(n)" from "I understand what the bound actually claims."</p>
      </details>
    </div>

    <div class="p0-card">
      <h4>See the growth rates, don't just read them</h4>
      <p>Drag <code>n</code> and watch how far apart these classes really get. Notice the chart's <strong>y-axis is logarithmic</strong> — each gridline is 10× the last. On a normal scale, O(2ⁿ) would swallow every other curve and make them all look flat.</p>
      <div class="p0-chart-wrap">
        <div class="p0-chart-controls">
          <span style="font-size:12px;color:var(--sublabel)">n =</span>
          <input type="range" id="p0-n-slider" min="1" max="20" value="10">
          <span class="n-label" id="p0-n-label">10</span>
        </div>
        <div id="p0-chart-svg"></div>
        <div class="p0-legend" id="p0-legend"></div>
        <table class="p0-table">
          <thead><tr><th>Complexity</th><th style="text-align:right">Real-world analogue</th><th style="text-align:right">Ops at this n</th></tr></thead>
          <tbody id="p0-table-body"></tbody>
        </table>
      </div>
    </div>

    <div class="p0-callout"><strong>Takeaway:</strong> saying a solution is "O(n²)" is a specific claim — no matter the input, this algorithm won't do meaningfully more than ~n² work as n grows. You should be able to point at the exact line of code responsible for that claim. That's section 2.</div>
    <div class="p0-footer-next" id="p0-next-footer"></div>`;
  }

  function renderP0Reading() {
    return `
    <div class="p0-section-title">Reading complexity straight off code</div>
    <div class="p0-section-sub">Section 2 of Phase 0 — three rules cover almost everything you'll see: nested loops multiply, sequential loops add, recursion is branching factor × depth.</div>

    <div class="p0-card">
      <h4>Nested multiplies, sequential adds</h4>
      <p>Same input size <code>n</code>, two very different totals — depending only on whether the loops sit <em>inside</em> each other or <em>next to</em> each other. Drag <code>n</code> and watch both grow.</p>
      <div class="p0-chart-controls">
        <span style="font-size:12px;color:var(--sublabel)">n =</span>
        <input type="range" id="p0-loop-n" min="2" max="12" value="6">
        <span class="n-label" id="p0-loop-n-label">6</span>
      </div>
      <div class="p0-split">
        <div>
          <div class="p0-diagram-label">Nested — multiply</div>
          <pre class="p0-code">for (let i = 0; i &lt; n; i++) {
  for (let j = 0; j &lt; n; j++) {
    // O(1) work
  }
}</pre>
          <div id="p0-nested-grid" class="p0-grid"></div>
          <div class="p0-count-badge">Total = n × n = <strong id="p0-nested-count"></strong> → <strong>O(n²)</strong></div>
        </div>
        <div>
          <div class="p0-diagram-label">Sequential — add</div>
          <pre class="p0-code">for (let i = 0; i &lt; n; i++) { /* O(1) */ }
for (let j = 0; j &lt; n; j++) { /* O(1) */ }</pre>
          <div class="p0-bars-row" id="p0-seq-bars"></div>
          <div class="p0-count-badge">Total = n + n = <strong id="p0-seq-count"></strong> → drop the constant → <strong>O(n)</strong></div>
        </div>
      </div>
      <details class="p0-reveal"><summary>Why does Big O let you drop the 2 in "2n"?</summary>
        <p>Big O describes growth as n → ∞. Whether it's n, 2n, or 100n, the shape of the curve — a straight line — is identical; only the steepness changes. n² vs. n, on the other hand, are genuinely different shapes — no constant closes that gap.</p>
      </details>
    </div>

    <div class="p0-card">
      <h4>Watch for: nested loops over different-sized inputs</h4>
      <pre class="p0-code">for (let i = 0; i &lt; n; i++) {       // n = arr1.length
  for (let j = 0; j &lt; m; j++) {     // m = arr2.length
    // O(1) work
  }
}</pre>
      <p>Nesting still multiplies — but the result is <strong>O(n·m)</strong>, not O(n²). They only collapse to O(n²) if <code>n</code> and <code>m</code> happen to be the same size. Writing "O(n²)" for two different-length inputs is one of the most common complexity mistakes — nested loop <em>structure</em> doesn't automatically mean "n squared."</p>
    </div>

    <div class="p0-card">
      <h4>Recursion: branching factor × depth</h4>
      <p>A recursive function's calls form a tree. Its size depends on two things: how many recursive calls each invocation makes (<strong>branching factor</strong>, b) and how many levels deep it goes before the base case (<strong>depth</strong>, d). If each call does O(1) extra work besides recursing, total work ≈ <strong>O(b<sup>d</sup>)</strong>.</p>

      <div class="p0-toggle-row">
        <div class="p0-toggle-btn active" data-b="1">Branching factor 1 — linear recursion</div>
        <div class="p0-toggle-btn" data-b="2">Branching factor 2 — binary recursion</div>
      </div>

      <pre class="p0-code" id="p0-recursion-code"></pre>

      <div class="p0-chart-controls">
        <span style="font-size:12px;color:var(--sublabel)">depth =</span>
        <input type="range" id="p0-depth-slider" min="1" max="5" value="3">
        <span class="n-label" id="p0-depth-label">3</span>
      </div>

      <div id="p0-tree-svg"></div>
      <div class="p0-count-badge" id="p0-tree-count"></div>

      <details class="p0-reveal"><summary>Why does naive Fibonacci recompute so much work?</summary>
        <p><code>fib(n) = fib(n-1) + fib(n-2)</code> branches into 2 calls at every level, down to depth n — that's the b=2 tree above. The same subproblems (like <code>fib(3)</code>) get recomputed inside many different branches, which is exactly why the call count explodes to O(2ⁿ) instead of O(n). Memoization fixes this by caching results so each subproblem is computed once — that comes back when we hit Dynamic Programming.</p>
      </details>
    </div>

    <div class="p0-card">
      <h4>Only the fastest-growing term survives</h4>
      <p>If one part of your code is O(n²) and another is O(n), the total is O(n² + n) — but we write that as <strong>O(n²)</strong>. As n grows, the smaller term becomes irrelevant next to the bigger one.</p>
      <table class="p0-table">
        <thead><tr><th>n</th><th style="text-align:right">n² term</th><th style="text-align:right">n term</th><th style="text-align:right">n² is bigger by</th></tr></thead>
        <tbody>
          <tr><td>10</td><td class="num">100</td><td class="num">10</td><td class="num">10×</td></tr>
          <tr><td>100</td><td class="num">10,000</td><td class="num">100</td><td class="num">100×</td></tr>
          <tr><td>10,000</td><td class="num">100,000,000</td><td class="num">10,000</td><td class="num">10,000×</td></tr>
        </tbody>
      </table>
      <p>The gap only widens as n grows — it never closes. That's why the smaller term is dropped entirely, not approximated.</p>
    </div>

    <div class="p0-callout"><strong>Takeaway:</strong> before writing a line of code, look at the shape of the control flow — loops nested or side by side, recursion's branching and depth — and the complexity falls out directly. You shouldn't need to run anything to know it.</div>
    <div class="p0-footer-next" id="p0-next-footer"></div>`;
  }

  function initP0LoopViz() {
    const slider = document.getElementById('p0-loop-n');
    if (!slider) return;
    const label      = document.getElementById('p0-loop-n-label');
    const gridHost   = document.getElementById('p0-nested-grid');
    const nestedCount = document.getElementById('p0-nested-count');
    const barsHost   = document.getElementById('p0-seq-bars');
    const seqCount   = document.getElementById('p0-seq-count');
    const SLIDER_MAX = Number(slider.max);

    function render(n) {
      gridHost.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
      gridHost.innerHTML = Array.from({ length: n * n }).map(() => '<div class="p0-dot"></div>').join('');
      nestedCount.textContent = n * n;

      const pct = Math.round((n / SLIDER_MAX) * 100);
      barsHost.innerHTML = `
        <div><div class="p0-bar-label">Pass 1 — n steps</div><div class="p0-bar" style="width:${pct}%"></div></div>
        <div><div class="p0-bar-label">Pass 2 — n steps</div><div class="p0-bar b2" style="width:${pct}%"></div></div>`;
      seqCount.textContent = n + n;
    }

    slider.oninput = () => { label.textContent = slider.value; render(Number(slider.value)); };
    render(Number(slider.value));
  }

  function initP0RecursionViz() {
    const depthSlider = document.getElementById('p0-depth-slider');
    if (!depthSlider) return;
    const depthLabel = document.getElementById('p0-depth-label');
    const svgHost    = document.getElementById('p0-tree-svg');
    const countEl    = document.getElementById('p0-tree-count');
    const codeEl     = document.getElementById('p0-recursion-code');
    const toggleBtns = document.querySelectorAll('.p0-toggle-btn');

    let branching = 1;
    const CODE = {
      1: 'function f(n) {\n  if (n === 0) return 1;\n  return f(n - 1);\n}',
      2: 'function fib(n) {\n  if (n &lt;= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}',
    };

    function buildTree(depth, b) {
      const nodes = [], edges = [];
      (function gen(level, xMin, xMax, parentIdx) {
        const x = (xMin + xMax) / 2;
        const idx = nodes.length;
        nodes.push({ x, y: level });
        if (parentIdx !== null) edges.push([parentIdx, idx]);
        if (level < depth) {
          if (b === 1) {
            gen(level + 1, xMin, xMax, idx);
          } else {
            const mid = (xMin + xMax) / 2;
            gen(level + 1, xMin, mid, idx);
            gen(level + 1, mid, xMax, idx);
          }
        }
      })(0, 0, 1, null);
      return { nodes, edges };
    }

    function render() {
      const depth = Number(depthSlider.value);
      codeEl.innerHTML = CODE[branching];

      const { nodes, edges } = buildTree(depth, branching);
      const W = 600, H = 40 + depth * 44, PAD = 20;
      const xFor = x => PAD + x * (W - PAD * 2);
      const yFor = y => 20 + y * ((H - 40) / Math.max(1, depth));

      const edgeLines = edges.map(([a, c]) =>
        `<line x1="${xFor(nodes[a].x).toFixed(1)}" y1="${yFor(nodes[a].y).toFixed(1)}" x2="${xFor(nodes[c].x).toFixed(1)}" y2="${yFor(nodes[c].y).toFixed(1)}" stroke="rgba(255,255,255,0.15)" stroke-width="1.4"/>`
      ).join('');
      const circles = nodes.map(nd =>
        `<circle cx="${xFor(nd.x).toFixed(1)}" cy="${yFor(nd.y).toFixed(1)}" r="5" fill="${branching === 2 ? '#06b6d4' : '#3b82f6'}"/>`
      ).join('');

      svgHost.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${edgeLines}${circles}</svg>`;

      const total = branching === 1 ? depth + 1 : Math.pow(2, depth + 1) - 1;
      countEl.innerHTML = branching === 1
        ? `Total calls at depth ${depth} = <strong>${total}</strong> → <strong>O(depth)</strong> — a straight line, no branching.`
        : `Total calls at depth ${depth} = <strong>${total}</strong> → <strong>O(2<sup>depth</sup>)</strong> — the same explosive curve as O(2ⁿ) from Section 1.`;
    }

    toggleBtns.forEach(btn => {
      btn.onclick = () => {
        branching = Number(btn.dataset.b);
        toggleBtns.forEach(b => b.classList.toggle('active', b === btn));
        render();
      };
    });

    depthSlider.oninput = () => { depthLabel.textContent = depthSlider.value; render(); };
    render();
  }

  function renderP0Amortized() {
    return `
    <div class="p0-section-title">Amortized analysis — why array push is O(1) even though resizing is O(n)</div>
    <div class="p0-section-sub">Section 3 of Phase 0 — the cost of one operation can be expensive; the average over a sequence rarely is.</div>

    <p>A dynamic array (JS array, Python list, C++ vector) doesn't ask for more memory on every push. It keeps spare capacity, and only <strong>resizes</strong> — allocates a bigger buffer and copies every existing element into it — once that spare capacity runs out. Copying n elements is O(n). So is push O(n)? Only on the rare push that triggers a resize. <strong>Amortized analysis</strong> asks: what's the average cost per push, over a long sequence, not just the worst single call?</p>

    <div class="p0-card">
      <h4>The idea in one sentence</h4>
      <p>"Amortized cost" = total cost of a sequence of operations, divided by the number of operations. A handful of expensive O(n) resizes, spread across many cheap O(1) pushes, can still average out to O(1) per push — <em>if the expensive ones get rare fast enough.</em></p>
      <p>Think of it like a savings account: every cheap push deposits a little extra work into a piggy bank. When a resize finally hits, it withdraws from the piggy bank instead of billing you fresh — as long as enough has been saved by then, no single push actually feels the full cost.</p>
    </div>

    <div class="p0-card">
      <h4>Trace it — 16 pushes into a doubling array</h4>
      <p>Capacity starts at 1 and <strong>doubles</strong> every time it fills up. Most pushes just drop an element in place (green, O(1)). The rare push that finds the array full pays for a full copy of everything currently in it (red).</p>
      <div id="p0-trace-chart"></div>
      <div class="p0-count-badge" id="p0-trace-total"></div>
      <details class="p0-reveal"><summary>Why doesn't this total keep growing per push as n grows?</summary>
        <p>A resize at size k costs k — and there were k pushes since capacity was last k/2, all quietly "prepaying" for it. The resizes form a geometric series (1 + 2 + 4 + 8 + ...) that sums to less than 2n. Add the n pushes themselves and total work for n pushes stays under 3n — always linear in n, no matter how many pushes you do.</p>
      </details>
    </div>

    <div class="p0-card">
      <h4>Doubling vs. a fixed +4 increment — same idea, wildly different result</h4>
      <p>Resizing when full isn't automatically cheap — it matters <em>how much bigger</em> you grow each time. Drag n and compare the amortized cost per push (total cost so far ÷ n) for two growth strategies.</p>
      <div class="p0-chart-controls">
        <span style="font-size:12px;color:var(--sublabel)">n pushes =</span>
        <input type="range" id="p0-amort-n" min="8" max="200" value="80">
        <span class="n-label" id="p0-amort-n-label">80</span>
      </div>
      <div id="p0-amort-svg"></div>
      <div class="p0-legend">
        <div class="p0-legend-item"><span class="p0-legend-dot" style="background:#3b82f6"></span>Double capacity when full</div>
        <div class="p0-legend-item"><span class="p0-legend-dot" style="background:#f97316"></span>Fixed +4 capacity when full</div>
      </div>
      <table class="p0-table">
        <thead><tr><th>Strategy</th><th style="text-align:right">Total cost for n pushes</th><th style="text-align:right">Amortized cost / push</th></tr></thead>
        <tbody id="p0-amort-table"></tbody>
      </table>
      <details class="p0-reveal"><summary>Why does +4 fail to give amortized O(1)?</summary>
        <p>With a fixed increment, resizes happen at a constant <em>rate</em> (every 4 pushes), but the cost of each resize keeps growing — you're copying more elements every time. Frequent-and-growing beats rare-and-growing: total copy cost becomes O(n²), so amortized cost per push is O(n) — it never settles, it keeps climbing as n grows. Doubling keeps resizes rare enough, fast enough, that the total never outpaces O(n).</p>
      </details>
    </div>

    <div class="p0-callout"><strong>Takeaway:</strong> "amortized O(1)" is a claim about a sequence of operations, not any single call — you can't read it off one line of code the way you read O(n) off a loop (Section 2). It shows up whenever a data structure occasionally pays for expensive cleanup, and the trigger for that cleanup gets exponentially rarer relative to its cost. Dynamic arrays and hash-table resizing are the two you'll meet constantly.</div>
    <div class="p0-footer-next" id="p0-next-footer"></div>`;
  }

  function p0SimulatePush(n, strategy) {
    const FIXED_INC = 4;
    let capacity = strategy === 'double' ? 1 : FIXED_INC;
    let size = 0;
    const costs = [];
    for (let i = 1; i <= n; i++) {
      let cost = 1;
      if (size === capacity) {
        cost += capacity;
        capacity = strategy === 'double' ? capacity * 2 : capacity + FIXED_INC;
      }
      size++;
      costs.push(cost);
    }
    return costs;
  }

  function initP0TraceChart() {
    const host = document.getElementById('p0-trace-chart');
    if (!host) return;
    const N = 16;
    const costs = p0SimulatePush(N, 'double');
    const maxCost = Math.max(...costs);

    host.innerHTML = `<div class="p0-trace-wrap">` + costs.map((c, i) => {
      const h = Math.round((c / maxCost) * 100);
      const color = c === 1 ? '#22c55e' : '#ef4444';
      return `<div class="p0-trace-col">
        <div class="p0-trace-cost">${c}</div>
        <div class="p0-trace-bar" style="height:${h}%;background:${color}"></div>
        <div class="p0-trace-idx">${i + 1}</div>
      </div>`;
    }).join('') + `</div>`;

    const total = costs.reduce((a, b) => a + b, 0);
    document.getElementById('p0-trace-total').innerHTML =
      `Total cost for ${N} pushes = <strong>${total}</strong> → amortized = ${total}/${N} ≈ <strong>${(total / N).toFixed(2)}</strong> per push — a small constant, not "16."`;
  }

  function initP0AmortChart() {
    const svgHost = document.getElementById('p0-amort-svg');
    if (!svgHost) return;
    const slider    = document.getElementById('p0-amort-n');
    const label     = document.getElementById('p0-amort-n-label');
    const tableBody = document.getElementById('p0-amort-table');

    const NMAX = Number(slider.max);
    const W = 640, H = 220, PAD = { l: 40, r: 14, t: 10, b: 22 };

    function amortizedCurve(strategy) {
      const costs = p0SimulatePush(NMAX, strategy);
      let total = 0;
      return costs.map((c, idx) => { total += c; return total / (idx + 1); });
    }

    const doubleCurve = amortizedCurve('double');
    const fixedCurve  = amortizedCurve('fixed');
    const maxY = Math.max(...fixedCurve, ...doubleCurve);

    const xFor = n => PAD.l + ((n - 1) / (NMAX - 1)) * (W - PAD.l - PAD.r);
    const yFor = v => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b);

    function pathFor(arr) {
      let d = '';
      arr.forEach((v, idx) => {
        const n = idx + 1;
        d += (n === 1 ? 'M' : 'L') + xFor(n).toFixed(1) + ',' + yFor(v).toFixed(1) + ' ';
      });
      return d.trim();
    }

    const STEPS = 5;
    const gridLines = [];
    for (let s = 0; s <= STEPS; s++) {
      const val = (maxY / STEPS) * s;
      const y = yFor(val);
      gridLines.push(`<line x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${W - PAD.r}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.08)"/>`);
      gridLines.push(`<text x="${PAD.l - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#a3a3a3">${val.toFixed(0)}</text>`);
    }

    const doublePath = pathFor(doubleCurve);
    const fixedPath  = pathFor(fixedCurve);

    function render(n) {
      const markerX = xFor(n).toFixed(1);
      svgHost.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">
        ${gridLines.join('')}
        <line x1="${PAD.l}" y1="${PAD.t}" x2="${PAD.l}" y2="${H - PAD.b}" stroke="rgba(255,255,255,0.08)"/>
        <line x1="${markerX}" y1="${PAD.t}" x2="${markerX}" y2="${H - PAD.b}" stroke="#444444" stroke-dasharray="3,3"/>
        <path d="${doublePath}" fill="none" stroke="#3b82f6" stroke-width="2"/>
        <path d="${fixedPath}" fill="none" stroke="#f97316" stroke-width="2"/>
        <circle cx="${markerX}" cy="${yFor(doubleCurve[n - 1]).toFixed(1)}" r="3.2" fill="#3b82f6"/>
        <circle cx="${markerX}" cy="${yFor(fixedCurve[n - 1]).toFixed(1)}" r="3.2" fill="#f97316"/>
      </svg>`;

      tableBody.innerHTML = `
        <tr><td>Double capacity</td><td class="num">${Math.round(doubleCurve[n - 1] * n)}</td><td class="num">${doubleCurve[n - 1].toFixed(2)}</td></tr>
        <tr><td>Fixed +4 capacity</td><td class="num">${Math.round(fixedCurve[n - 1] * n)}</td><td class="num">${fixedCurve[n - 1].toFixed(2)}</td></tr>`;
    }

    slider.oninput = () => { label.textContent = slider.value; render(Number(slider.value)); };
    render(Number(slider.value));
  }

  function renderP0CheatSheet() {
    return `
    <div class="p0-section-title">The complexity cheat sheet — and why each number is what it is</div>
    <div class="p0-section-sub">Section 4 of Phase 0 — don't memorize this table. Understand the shape behind each row so you can re-derive it under pressure.</div>

    <p>Four data structures cover most of what comes up in interviews. Each one's complexity falls out of the same three shapes you've already seen: a <strong>direct address</strong> is O(1), <strong>eliminating half the candidates</strong> each step is O(log n), and <strong>touching every element</strong> is O(n).</p>

    <div class="p0-card">
      <h4>Array — direct address vs. shifting neighbors</h4>
      <p><strong>Access by index is O(1).</strong> An array lives in one contiguous block of memory, so <code>arr[i]</code> jumps straight to address <code>base + i × elementSize</code> — one calculation, no searching, no matter how big the array is or which index you pick.</p>
      <div class="p0-chart-controls">
        <span style="font-size:12px;color:var(--sublabel)">index =</span>
        <input type="range" id="p0-arr-access" min="0" max="9" value="4">
        <span class="n-label" id="p0-arr-access-label">4</span>
      </div>
      <div class="p0-arr-row" id="p0-arr-access-row"></div>

      <p style="margin-top:20px"><strong>Insert or delete in the middle is O(n).</strong> Staying contiguous means every element after the gap has to shift over by one slot. Drag the insert position and watch how many cells move.</p>
      <div class="p0-chart-controls">
        <span style="font-size:12px;color:var(--sublabel)">insert at =</span>
        <input type="range" id="p0-arr-insert" min="0" max="10" value="3">
        <span class="n-label" id="p0-arr-insert-label">3</span>
      </div>
      <div class="p0-arr-row" id="p0-arr-insert-row"></div>
      <div class="p0-count-badge" id="p0-arr-insert-note"></div>
      <details class="p0-reveal"><summary>So why is push() to the end O(1) then?</summary>
        <p>Inserting at the very last position shifts zero elements — there's nothing after it to move. That's the O(1) (amortized, see Section 3) case. The O(n) cost only shows up when you insert or delete somewhere before the end.</p>
      </details>
    </div>

    <div class="p0-card">
      <h4>Hash map — O(1) average, O(n) worst case</h4>
      <p>A hash function turns a key into a bucket index directly — like array access, it's a jump, not a search, which is where the O(1) average comes from. But if many keys hash into the <em>same</em> bucket, that bucket degrades into a plain list you have to scan — that's the O(n) worst case.</p>
      <div class="p0-toggle-row">
        <div class="p0-toggle-btn p0-hash-toggle active" data-mode="good">Well-distributed hash</div>
        <div class="p0-toggle-btn p0-hash-toggle" data-mode="bad">Adversarial collisions</div>
      </div>
      <div class="p0-bucket-row" id="p0-hash-buckets"></div>
      <div class="p0-bucket-labels" id="p0-hash-labels"></div>
      <div class="p0-count-badge" id="p0-hash-note"></div>
    </div>

    <div class="p0-card">
      <h4>Binary Search Tree — O(log n) balanced, O(n) degenerate</h4>
      <p>Each comparison in a BST throws away half the remaining candidates — <em>if</em> the tree is roughly balanced. Insert the same 7 values in sorted order with no rebalancing, and the "tree" collapses into a straight line — a linked list wearing a tree's name.</p>
      <div class="p0-toggle-row">
        <div class="p0-toggle-btn p0-bst-toggle active" data-mode="balanced">Balanced</div>
        <div class="p0-toggle-btn p0-bst-toggle" data-mode="degenerate">Degenerate (inserted 1..7 in order)</div>
      </div>
      <div id="p0-bst-svg"></div>
      <div class="p0-count-badge" id="p0-bst-note"></div>
    </div>

    <div class="p0-card">
      <h4>Heap — O(1) peek, O(log n) insert / extract</h4>
      <p>A binary (min-)heap keeps one promise: every parent is smaller than its children. That guarantees the smallest element always sits at the root — <strong>peek is O(1)</strong>, just look there. Inserting means dropping the new value in the next open slot and "bubbling" it upward until the promise holds again, one swap per level — <strong>O(log n)</strong>, the height of the tree.</p>
      <div id="p0-heap-svg"></div>
      <button class="p0-next-btn p0-sim-btn" id="p0-heap-sim-btn">▶ Simulate inserting 1</button>
      <div class="p0-sim-log" id="p0-heap-log"></div>
    </div>

    <div class="p0-card">
      <h4>The cheat sheet, all in one place</h4>
      <table class="p0-table">
        <thead><tr><th>Structure</th><th style="text-align:right">Typical</th><th style="text-align:right">Worst case</th></tr></thead>
        <tbody>
          <tr><td>Array — access</td><td class="num">O(1)</td><td class="num">O(1)</td></tr>
          <tr><td>Array — insert/delete (middle)</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
          <tr><td>Array — insert/delete (end)</td><td class="num">O(1)*</td><td class="num">O(n)*</td></tr>
          <tr><td>Hash map — get/set/delete</td><td class="num">O(1)</td><td class="num">O(n)</td></tr>
          <tr><td>BST — search/insert/delete</td><td class="num">O(log n)</td><td class="num">O(n)</td></tr>
          <tr><td>Heap — peek</td><td class="num">O(1)</td><td class="num">O(1)</td></tr>
          <tr><td>Heap — insert/extract</td><td class="num">O(log n)</td><td class="num">O(log n)</td></tr>
        </tbody>
      </table>
      <p style="margin-top:10px;font-size:11.5px;color:var(--muted)">*End-of-array insert/delete is amortized O(1) (Section 3) — the O(n) only shows up on the rare resize.</p>
    </div>

    <div class="p0-callout"><strong>Takeaway:</strong> three shapes explain almost every row on this sheet — <strong>direct address</strong> (array index, hash bucket) is O(1); <strong>eliminate half each step</strong> (balanced BST, heap height) is O(log n); <strong>touch every element</strong> (shifting an array, a collided bucket, a degenerate tree) is O(n). When you blank on a specific complexity, ask which of these three shapes the operation actually is.</div>
    <div class="p0-footer-next" id="p0-next-footer"></div>`;
  }

  function initP0ArrayViz() {
    const accessSlider = document.getElementById('p0-arr-access');
    if (!accessSlider) return;
    const accessLabel = document.getElementById('p0-arr-access-label');
    const accessRow   = document.getElementById('p0-arr-access-row');
    const insertSlider = document.getElementById('p0-arr-insert');
    const insertLabel  = document.getElementById('p0-arr-insert-label');
    const insertRow    = document.getElementById('p0-arr-insert-row');
    const insertNote   = document.getElementById('p0-arr-insert-note');
    const VALUES = [8, 3, 7, 1, 9, 4, 2, 6, 5, 0];
    const N = VALUES.length;

    function renderAccess(idx) {
      accessRow.innerHTML = VALUES.map((v, i) => `<div class="p0-arr-cell${i === idx ? ' active' : ''}">${v}</div>`).join('');
    }
    function renderInsert(pos) {
      insertRow.innerHTML = VALUES.map((v, i) => `<div class="p0-arr-cell${i >= pos ? ' shift' : ''}">${v}</div>`).join('');
      const shifted = N - pos;
      insertNote.innerHTML = `Insert at index ${pos} → <strong>${shifted}</strong> element${shifted === 1 ? '' : 's'} shift right → O(n − i).`;
    }

    accessSlider.oninput = () => { accessLabel.textContent = accessSlider.value; renderAccess(Number(accessSlider.value)); };
    insertSlider.oninput = () => { insertLabel.textContent = insertSlider.value; renderInsert(Number(insertSlider.value)); };

    renderAccess(Number(accessSlider.value));
    renderInsert(Number(insertSlider.value));
  }

  const P0_HASH_KEYS = ['ann', 'bob', 'cid', 'dan', 'eve', 'fay', 'gus', 'hank'];

  function initP0HashViz() {
    const host = document.getElementById('p0-hash-buckets');
    if (!host) return;
    const labelsHost = document.getElementById('p0-hash-labels');
    const noteEl     = document.getElementById('p0-hash-note');
    const toggleBtns = document.querySelectorAll('.p0-hash-toggle');

    function render(mode) {
      const buckets = Array.from({ length: 8 }, () => []);
      if (mode === 'good') {
        P0_HASH_KEYS.forEach((k, i) => buckets[i].push(k));
      } else {
        P0_HASH_KEYS.forEach(k => buckets[3].push(k));
      }
      host.innerHTML = buckets.map(chips =>
        `<div class="p0-bucket">${chips.map(k => `<div class="p0-key-chip${mode === 'bad' ? ' collide' : ''}">${k}</div>`).join('')}</div>`
      ).join('');
      labelsHost.innerHTML = buckets.map((_, i) => `<div style="flex:1;text-align:center;font-size:9px;color:var(--muted)">bucket ${i}</div>`).join('');
      noteEl.innerHTML = mode === 'good'
        ? `Every key lands in its own bucket → each lookup checks <strong>1 item</strong> → <strong>O(1)</strong>.`
        : `All 8 keys collide into bucket 3 → looking one up may scan all <strong>8 items</strong> in that bucket → <strong>O(n)</strong> worst case.`;
    }

    toggleBtns.forEach(btn => {
      btn.onclick = () => {
        toggleBtns.forEach(b => b.classList.toggle('active', b === btn));
        render(btn.dataset.mode);
      };
    });
    render('good');
  }

  const P0_BST = {
    balanced: {
      nodes: [
        { v: 4, x: 0.5,   y: 0 },
        { v: 2, x: 0.25,  y: 1 }, { v: 6, x: 0.75,  y: 1 },
        { v: 1, x: 0.125, y: 2 }, { v: 3, x: 0.375, y: 2 }, { v: 5, x: 0.625, y: 2 }, { v: 7, x: 0.875, y: 2 },
      ],
      edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]],
      path: [0, 2, 6],
      depth: 3,
    },
    degenerate: {
      nodes: [0, 1, 2, 3, 4, 5, 6].map(i => ({ v: i + 1, x: 0.5, y: i })),
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
      path: [0, 1, 2, 3, 4, 5, 6],
      depth: 7,
    },
  };

  function drawP0Tree(svgHost, data, opts = {}) {
    const maxY = Math.max(...data.nodes.map(n => n.y));
    const W = 500, H = 70 + maxY * 55, PAD = 30;
    const xFor = x => PAD + x * (W - PAD * 2);
    const yFor = y => 30 + y * ((H - 60) / Math.max(1, maxY));

    const edgeLines = data.edges.map(([a, c]) =>
      `<line x1="${xFor(data.nodes[a].x).toFixed(1)}" y1="${yFor(data.nodes[a].y).toFixed(1)}" x2="${xFor(data.nodes[c].x).toFixed(1)}" y2="${yFor(data.nodes[c].y).toFixed(1)}" stroke="rgba(255,255,255,0.15)" stroke-width="1.4"/>`
    ).join('');

    const pathSet = new Set(opts.path || []);
    const circles = data.nodes.map((n, i) => {
      const onPath = pathSet.has(i);
      return `<circle cx="${xFor(n.x).toFixed(1)}" cy="${yFor(n.y).toFixed(1)}" r="14" fill="${onPath ? '#f97316' : '#3b82f6'}"/>
        <text x="${xFor(n.x).toFixed(1)}" y="${(yFor(n.y) + 4).toFixed(1)}" text-anchor="middle" font-size="12" fill="#ffffff" font-weight="700">${n.v}</text>`;
    }).join('');

    svgHost.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${edgeLines}${circles}</svg>`;
  }

  function initP0BstViz() {
    const svgHost = document.getElementById('p0-bst-svg');
    if (!svgHost) return;
    const noteEl = document.getElementById('p0-bst-note');
    const toggleBtns = document.querySelectorAll('.p0-bst-toggle');

    function render(mode) {
      const data = P0_BST[mode];
      drawP0Tree(svgHost, data, { path: data.path });
      noteEl.innerHTML = `Depth = <strong>${data.depth}</strong>. Finding the value <strong>7</strong> (orange path) takes <strong>${data.path.length}</strong> comparisons → ${mode === 'balanced' ? '<strong>O(log n)</strong>' : '<strong>O(n)</strong>'}.`;
    }

    toggleBtns.forEach(btn => {
      btn.onclick = () => { toggleBtns.forEach(b => b.classList.toggle('active', b === btn)); render(btn.dataset.mode); };
    });
    render('balanced');
  }

  const P0_HEAP_POS = [
    { x: 0.5,   y: 0 },
    { x: 0.25,  y: 1 }, { x: 0.75,  y: 1 },
    { x: 0.125, y: 2 }, { x: 0.375, y: 2 }, { x: 0.625, y: 2 }, { x: 0.875, y: 2 },
    { x: 0.125, y: 3 },
  ];
  const P0_HEAP_EDGES_BASE = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]];
  const P0_HEAP_INITIAL = [2, 4, 3, 8, 5, 9, 7];

  function drawP0Heap(svgHost, values, highlightIdx) {
    const n = values.length;
    const edges = P0_HEAP_EDGES_BASE.concat(n > 7 ? [[3, 7]] : []);
    const maxY = Math.max(...P0_HEAP_POS.slice(0, n).map(p => p.y));
    const W = 500, H = 70 + maxY * 55, PAD = 30;
    const xFor = x => PAD + x * (W - PAD * 2);
    const yFor = y => 30 + y * ((H - 60) / Math.max(1, maxY));

    const edgeLines = edges.map(([a, c]) =>
      `<line x1="${xFor(P0_HEAP_POS[a].x).toFixed(1)}" y1="${yFor(P0_HEAP_POS[a].y).toFixed(1)}" x2="${xFor(P0_HEAP_POS[c].x).toFixed(1)}" y2="${yFor(P0_HEAP_POS[c].y).toFixed(1)}" stroke="rgba(255,255,255,0.15)" stroke-width="1.4"/>`
    ).join('');

    const circles = values.map((v, i) => {
      let fill = i === 0 ? '#22c55e' : '#3b82f6';
      if (i === highlightIdx) fill = '#f97316';
      return `<circle cx="${xFor(P0_HEAP_POS[i].x).toFixed(1)}" cy="${yFor(P0_HEAP_POS[i].y).toFixed(1)}" r="14" fill="${fill}"/>
        <text x="${xFor(P0_HEAP_POS[i].x).toFixed(1)}" y="${(yFor(P0_HEAP_POS[i].y) + 4).toFixed(1)}" text-anchor="middle" font-size="12" fill="#fff" font-weight="700">${v}</text>`;
    }).join('');

    svgHost.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${edgeLines}${circles}</svg>`;
  }

  function p0Wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  function initP0HeapViz() {
    const svgHost = document.getElementById('p0-heap-svg');
    if (!svgHost) return;
    const btn   = document.getElementById('p0-heap-sim-btn');
    const logEl = document.getElementById('p0-heap-log');

    function showInitial() {
      drawP0Heap(svgHost, P0_HEAP_INITIAL.slice());
      logEl.textContent = '';
      btn.textContent = '▶ Simulate inserting 1';
      btn.disabled = false;
      btn.onclick = runSimulation;
    }

    async function runSimulation() {
      btn.disabled = true;
      const values = P0_HEAP_INITIAL.slice();
      values.push(1);
      drawP0Heap(svgHost, values, 7);
      logEl.textContent = 'Dropped 1 into the next open slot (index 7)…';
      await p0Wait(650);

      const path = [7, 3, 1, 0];
      let swaps = 0;
      for (let k = 0; k < path.length - 1; k++) {
        const child = path[k], parent = path[k + 1];
        drawP0Heap(svgHost, values, child);
        logEl.textContent = `Compare index ${child} (${values[child]}) with parent index ${parent} (${values[parent]})…`;
        await p0Wait(650);
        [values[child], values[parent]] = [values[parent], values[child]];
        swaps++;
        drawP0Heap(svgHost, values, parent);
        logEl.textContent = `${values[parent]} < parent → swap (${swaps} so far).`;
        await p0Wait(650);
      }

      drawP0Heap(svgHost, values);
      logEl.textContent = `Done — ${swaps} swaps to insert into a heap of 8 elements ≈ ⌈log₂8⌉ = 3. That's O(log n).`;
      btn.disabled = false;
      btn.textContent = '↺ Reset';
      btn.onclick = showInitial;
    }

    showInitial();
  }

  function renderP0Space() {
    return `
    <div class="p0-section-title">Space Complexity — Recursion Uses Memory Too</div>
    <div class="p0-section-sub">Section 5 of Phase 0 — even code with zero arrays can still use a lot of memory, because of the call stack.</div>

    <p>Space complexity just means: <strong>how much extra memory does your code need as n gets bigger?</strong> (We don't count the input itself — just the extra stuff.) There are two things that use extra memory:</p>
    <p>1) <strong>Data structures you build yourself</strong> — arrays, hash maps, sets.<br>2) <strong>The call stack</strong> — every function call that hasn't finished yet is still sitting in memory, holding onto its own variables.</p>
    <p>Most people remember #1. Almost everyone forgets #2 — this section is about #2.</p>

    <div class="p0-card">
      <h4>Loop vs. recursion — same answer, different amount of memory</h4>
      <div class="p0-split">
        <div>
          <div class="p0-diagram-label">Loop — O(1) memory</div>
          <pre class="p0-code">function sum(arr) {
  let total = 0;
  for (const x of arr) total += x;
  return total;
}</pre>
          <p style="font-size:12.5px">There's only one variable, <code>total</code>. It gets reused every single time through the loop. The memory used never grows, no matter how big <code>n</code> gets.</p>
        </div>
        <div>
          <div class="p0-diagram-label">Recursion — O(n) memory</div>
          <pre class="p0-code">function sum(arr) {
  if (arr.length === 0) return 0;
  return arr[0] + sum(arr.slice(1));
}</pre>
          <p style="font-size:12.5px">Every call has to wait for the next call to finish before it can add anything. So all <code>n</code> calls stay stuck in memory <em>at the same time</em>, each one taking up its own little slot.</p>
        </div>
      </div>
      <div class="p0-chart-controls">
        <span style="font-size:12px;color:var(--sublabel)">n =</span>
        <input type="range" id="p0-stack-n" min="1" max="12" value="6">
        <span class="n-label" id="p0-stack-n-label">6</span>
      </div>
      <div id="p0-stack-tower"></div>
      <div class="p0-count-badge" id="p0-stack-note"></div>
    </div>

    <div class="p0-card">
      <h4>Fibonacci: a lot of time, but not much memory</h4>
      <p>The tree below (same one from Section 2) has a lot of nodes in total — that's the <strong>time</strong> cost. But at any given moment, memory only holds <strong>one path</strong> — from the top node down to whichever node is running right now. Why? Because the code fully finishes one branch (and clears it from memory) before it even starts the next branch. Click the button and watch two numbers: how many nodes have run in total, vs. how many are sitting in memory right now.</p>
      <div class="p0-chart-controls">
        <span style="font-size:12px;color:var(--sublabel)">depth =</span>
        <input type="range" id="p0-space-depth" min="1" max="4" value="3">
        <span class="n-label" id="p0-space-depth-label">3</span>
      </div>
      <div id="p0-space-svg"></div>
      <div class="p0-split">
        <div class="p0-count-badge">Calls finished so far (time): <strong id="p0-space-visited">0</strong> / <span id="p0-space-total">0</span></div>
        <div class="p0-count-badge">In memory right now (space): <strong id="p0-space-stack">0</strong> — highest it ever got: <strong id="p0-space-maxstack">0</strong></div>
      </div>
      <button class="p0-next-btn p0-sim-btn" id="p0-space-sim-btn">▶ Run the simulation</button>
      <div class="p0-sim-log" id="p0-space-log"></div>
    </div>

    <div class="p0-card">
      <h4>Two real examples: merge sort vs. quicksort</h4>
      <p>Real algorithms often use <em>both</em> things at once — an extra data structure <em>and</em> a recursive call stack. To get the space complexity, take whichever one is bigger. Don't just add them together.</p>
      <table class="p0-table">
        <thead><tr><th>Algorithm</th><th style="text-align:right">Extra memory used</th><th style="text-align:right">How deep the recursion goes</th><th style="text-align:right">Total space</th></tr></thead>
        <tbody>
          <tr><td>Merge sort</td><td class="num">O(n) — builds temporary arrays</td><td class="num">O(log n)</td><td class="num">O(n)</td></tr>
          <tr><td>Quicksort (in-place)</td><td class="num">O(1) — no extra arrays</td><td class="num">O(log n) usually / O(n) worst case</td><td class="num">O(log n) usually / O(n) worst case</td></tr>
        </tbody>
      </table>
      <p>Quicksort's worst case happens for the same reason a BST turns into a straight line (Section 4). If you keep picking a bad pivot — like always the first element, on data that's already sorted — the array gets split unevenly every time (1 element on one side, everything else on the other). So the recursion goes n levels deep instead of log n levels deep.</p>
    </div>

    <div class="p0-callout"><strong>Takeaway:</strong> to find space complexity, check two things — 1) any new data structure whose size depends on n, and 2) how deep the recursion goes before anything finishes. Whichever number is bigger, that's your answer. Don't assume "no arrays = O(1)" — recursion counts too.</div>
    <div class="p0-footer-next" id="p0-next-footer"></div>`;
  }

  function initP0StackTower() {
    const slider = document.getElementById('p0-stack-n');
    if (!slider) return;
    const label = document.getElementById('p0-stack-n-label');
    const host  = document.getElementById('p0-stack-tower');
    const note  = document.getElementById('p0-stack-note');

    function render(n) {
      let frames = '';
      for (let d = 0; d < n; d++) {
        frames += `<div class="p0-stack-frame">sum(arr[${d}:]) — waiting on sum(arr[${d + 1}:]) to return</div>`;
      }
      host.innerHTML = `<div class="p0-stack-frames">${frames}</div>`;
      note.innerHTML = `${n} calls are stuck in memory at the same time → that's <strong>O(${n})</strong> right now, or <strong>O(n)</strong> in general. The loop version always stays at <strong>O(1)</strong>, no matter how big n gets.`;
    }

    slider.oninput = () => { label.textContent = slider.value; render(Number(slider.value)); };
    render(Number(slider.value));
  }

  function p0BuildFibTree(depth) {
    const nodes = [], edges = [], children = [];
    (function gen(level, xMin, xMax, parentIdx) {
      const x = (xMin + xMax) / 2;
      const idx = nodes.length;
      nodes.push({ x, y: level });
      children.push([]);
      if (parentIdx !== null) { edges.push([parentIdx, idx]); children[parentIdx].push(idx); }
      if (level < depth) {
        const mid = (xMin + xMax) / 2;
        gen(level + 1, xMin, mid, idx);
        gen(level + 1, mid, xMax, idx);
      }
    })(0, 0, 1, null);
    return { nodes, edges, children };
  }

  function p0DfsEvents(children) {
    const events = [];
    (function walk(idx) {
      events.push({ type: 'enter', idx });
      for (const c of children[idx]) walk(c);
      events.push({ type: 'exit', idx });
    })(0);
    return events;
  }

  function drawP0SpaceTree(svgHost, data, state) {
    const maxY = Math.max(...data.nodes.map(n => n.y));
    const W = 600, H = 60 + maxY * 55, PAD = 20;
    const xFor = x => PAD + x * (W - PAD * 2);
    const yFor = y => 25 + y * ((H - 50) / Math.max(1, maxY));

    const edgeLines = data.edges.map(([a, c]) =>
      `<line x1="${xFor(data.nodes[a].x).toFixed(1)}" y1="${yFor(data.nodes[a].y).toFixed(1)}" x2="${xFor(data.nodes[c].x).toFixed(1)}" y2="${yFor(data.nodes[c].y).toFixed(1)}" stroke="rgba(255,255,255,0.15)" stroke-width="1.4"/>`
    ).join('');

    const circles = data.nodes.map((n, i) => {
      let fill = '#2a2a2a';
      if (state.visited.has(i)) fill = '#3b82f6';
      if (state.stack.has(i)) fill = '#f97316';
      const r = state.stack.has(i) ? 6.5 : 5;
      return `<circle cx="${xFor(n.x).toFixed(1)}" cy="${yFor(n.y).toFixed(1)}" r="${r}" fill="${fill}"/>`;
    }).join('');

    svgHost.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${edgeLines}${circles}</svg>`;
  }

  function initP0SpaceViz() {
    const svgHost = document.getElementById('p0-space-svg');
    if (!svgHost) return;
    const depthSlider = document.getElementById('p0-space-depth');
    const depthLabel  = document.getElementById('p0-space-depth-label');
    const visitedEl   = document.getElementById('p0-space-visited');
    const totalEl     = document.getElementById('p0-space-total');
    const stackEl     = document.getElementById('p0-space-stack');
    const maxstackEl  = document.getElementById('p0-space-maxstack');
    const btn         = document.getElementById('p0-space-sim-btn');
    const logEl       = document.getElementById('p0-space-log');

    let data, events;

    function setup() {
      const depth = Number(depthSlider.value);
      data = p0BuildFibTree(depth);
      events = p0DfsEvents(data.children);
      drawP0SpaceTree(svgHost, data, { visited: new Set(), stack: new Set() });
      visitedEl.textContent = '0';
      totalEl.textContent = data.nodes.length;
      stackEl.textContent = '0';
      maxstackEl.textContent = '0';
      logEl.textContent = '';
      btn.disabled = false;
      btn.textContent = '▶ Run the simulation';
      btn.onclick = run;
    }

    async function run() {
      btn.disabled = true;
      depthSlider.disabled = true;
      const visited = new Set();
      const stack = new Set();
      let visitedCount = 0, maxStack = 0;

      for (const ev of events) {
        if (ev.type === 'enter') {
          stack.add(ev.idx);
          maxStack = Math.max(maxStack, stack.size);
          logEl.textContent = `→ Call #${ev.idx} starts (depth ${data.nodes[ev.idx].y}) — added to memory.`;
        } else {
          stack.delete(ev.idx);
          visited.add(ev.idx);
          visitedCount++;
          logEl.textContent = `← Call #${ev.idx} finishes — removed from memory.`;
        }
        drawP0SpaceTree(svgHost, data, { visited, stack });
        visitedEl.textContent = visitedCount;
        stackEl.textContent = stack.size;
        maxstackEl.textContent = maxStack;
        await p0Wait(120);
      }

      logEl.textContent = `Done! ${data.nodes.length} calls ran in total (that's the time cost). But memory never held more than ${maxStack} calls at once (that's the space cost).`;
      btn.disabled = false;
      depthSlider.disabled = false;
      btn.textContent = '↺ Reset';
      btn.onclick = setup;
    }

    depthSlider.oninput = () => { depthLabel.textContent = depthSlider.value; setup(); };
    setup();
  }

  function renderP0Checkpoint() {
    return `
    <div class="p0-section-title">Check Yourself — Are You Ready for Phase 1?</div>
    <div class="p0-section-sub">Section 6 of Phase 0 — the last step. No new ideas here, just practice using what you already learned.</div>

    <p>Phase 0 is done when you can look at a new problem and say its time and space complexity right away — before writing any code. Try it here. For each problem below:</p>
    <p>1) Think of the slow way first (brute force). Say its time and space.<br>2) Think of a faster way (optimal). Say its time and space.<br>3) Click "Show Answer" and check yourself.</p>

    <div class="p0-card">
      <h4>5 quick checks (these are the first problems in Phase 1)</h4>

      <div class="p0-quiz-item">
        <div class="p0-quiz-q"><strong>1. Contains Duplicate</strong> — given a list of numbers, return true if any number shows up more than once.</div>
        <details class="p0-reveal"><summary>Show Answer</summary>
          <div class="p0-quiz-answer">
            <strong>Brute force:</strong> compare every pair of numbers → O(n²) time, O(1) extra space.<br>
            <strong>Optimal:</strong> put each number in a hash set as you go. If you see one that's already in the set, return true → O(n) time, O(n) space.
          </div>
        </details>
      </div>

      <div class="p0-quiz-item">
        <div class="p0-quiz-q"><strong>2. Two Sum</strong> — given a list of numbers and a target, find two numbers that add up to the target.</div>
        <details class="p0-reveal"><summary>Show Answer</summary>
          <div class="p0-quiz-answer">
            <strong>Brute force:</strong> check every pair → O(n²) time, O(1) extra space.<br>
            <strong>Optimal:</strong> use a hash map of {number: index} as you go. For each number, check if (target − number) is already in the map → O(n) time, O(n) space.
          </div>
        </details>
      </div>

      <div class="p0-quiz-item">
        <div class="p0-quiz-q"><strong>3. Valid Anagram</strong> — given two words, check if one is just the letters of the other, rearranged.</div>
        <details class="p0-reveal"><summary>Show Answer</summary>
          <div class="p0-quiz-answer">
            <strong>Brute force:</strong> sort both words and compare → O(n log n) time, O(n) space (for the sorted copies).<br>
            <strong>Optimal:</strong> count each letter of word one in a hash map, then subtract counts while scanning word two → O(n) time, O(1) space (only 26 possible letters).
          </div>
        </details>
      </div>

      <div class="p0-quiz-item">
        <div class="p0-quiz-q"><strong>4. Group Anagrams</strong> — given a list of words, group the ones that are anagrams of each other.</div>
        <details class="p0-reveal"><summary>Show Answer</summary>
          <div class="p0-quiz-answer">
            <strong>Brute force:</strong> compare every word to every other word → O(n² · k) time (k = word length), O(n) space.<br>
            <strong>Optimal:</strong> use a hash map. For each word, sort its letters to make a "key" — anagrams share the same key — and group words under that key → O(n · k log k) time, O(n · k) space.
          </div>
        </details>
      </div>

      <div class="p0-quiz-item">
        <div class="p0-quiz-q"><strong>5. Top K Frequent Elements</strong> — given a list of numbers and a number k, return the k numbers that show up most often.</div>
        <details class="p0-reveal"><summary>Show Answer</summary>
          <div class="p0-quiz-answer">
            <strong>Brute force:</strong> count how often each number appears, then sort everything by count → O(n log n) time, O(n) space.<br>
            <strong>Optimal:</strong> count with a hash map, then use a heap (or bucket sort) to grab just the top k without sorting everything → about O(n log k) time, O(n) space.
          </div>
        </details>
      </div>
    </div>

    <div class="p0-card">
      <h4>You're ready for Phase 1 when...</h4>
      <p>✓ You can read a loop and say its time complexity without thinking hard.<br>
      ✓ You know the difference between "how many times does this run" (time) and "what does this hold onto" (space).<br>
      ✓ You know why array push, hash maps, and doubling are usually O(1) — and when they're not.<br>
      ✓ You didn't need to peek at the answers above more than once or twice.</p>
    </div>

    <div class="p0-callout"><strong>That's it — Phase 0 is done.</strong> You don't need to memorize every number on this page. You need to be able to work them out, fast, just from the shape of the code. That's exactly what Phase 1 will keep testing, one problem at a time.</div>
    <div class="p0-footer-next" id="p0-next-footer"></div>`;
  }

  const P0_CLASSES = [
    { label: 'O(1)',        color: '#22c55e', analogue: 'Grab shelf by known slot',          fn: n => 1 },
    { label: 'O(log n)',    color: '#06b6d4', analogue: 'Binary search a phone book',        fn: n => Math.max(1, Math.log2(n)) },
    { label: 'O(n)',        color: '#3b82f6', analogue: 'Scan every item once',              fn: n => n },
    { label: 'O(n log n)',  color: '#eab308', analogue: 'Efficient sort (merge/quicksort)',  fn: n => Math.max(1, n * Math.log2(n)) },
    { label: 'O(n²)',       color: '#f97316', analogue: 'Compare every pair',                fn: n => n * n },
    { label: 'O(2ⁿ)',       color: '#ef4444', analogue: 'Try every subset',                  fn: n => Math.pow(2, n) },
  ];

  function initP0Chart() {
    const svgHost = document.getElementById('p0-chart-svg');
    if (!svgHost) return;

    const slider = document.getElementById('p0-n-slider');
    const nLabel = document.getElementById('p0-n-label');
    const legend = document.getElementById('p0-legend');

    legend.innerHTML = P0_CLASSES.map(c =>
      `<div class="p0-legend-item"><span class="p0-legend-dot" style="background:${c.color}"></span>${c.label}</div>`
    ).join('');

    const NMAX = 20;
    const W = 640, H = 240, PAD = { l: 40, r: 14, t: 10, b: 22 };
    const maxLog = Math.log10(Math.pow(2, NMAX));

    const xFor = n => PAD.l + ((n - 1) / (NMAX - 1)) * (W - PAD.l - PAD.r);
    const yFor = v => H - PAD.b - (Math.log10(Math.max(1, v)) / maxLog) * (H - PAD.t - PAD.b);

    function pathFor(fn) {
      let d = '';
      for (let n = 1; n <= NMAX; n++) {
        d += (n === 1 ? 'M' : 'L') + xFor(n).toFixed(1) + ',' + yFor(fn(n)).toFixed(1) + ' ';
      }
      return d.trim();
    }

    const gridLines = [];
    for (let p = 0; p <= Math.ceil(maxLog); p++) {
      const y = H - PAD.b - (p / maxLog) * (H - PAD.t - PAD.b);
      gridLines.push(`<line x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${W - PAD.r}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`);
      gridLines.push(`<text x="${PAD.l - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#a3a3a3">10^${p}</text>`);
    }

    const curves = P0_CLASSES.map(c => `<path d="${pathFor(c.fn)}" fill="none" stroke="${c.color}" stroke-width="2"/>`).join('');

    function render(n) {
      const markerX = xFor(n).toFixed(1);
      const dots = P0_CLASSES.map(c => `<circle cx="${markerX}" cy="${yFor(c.fn(n)).toFixed(1)}" r="3.2" fill="${c.color}"/>`).join('');

      svgHost.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">
        ${gridLines.join('')}
        <line x1="${PAD.l}" y1="${PAD.t}" x2="${PAD.l}" y2="${H - PAD.b}" stroke="rgba(255,255,255,0.08)"/>
        <line x1="${markerX}" y1="${PAD.t}" x2="${markerX}" y2="${H - PAD.b}" stroke="#444444" stroke-dasharray="3,3"/>
        ${curves}
        ${dots}
      </svg>`;

      document.getElementById('p0-table-body').innerHTML = P0_CLASSES.map(c => {
        const v = c.fn(n);
        const display = v >= 1000 ? Math.round(v).toLocaleString() : (Number.isInteger(v) ? v : v.toFixed(1));
        return `<tr><td>${c.label}</td><td style="text-align:right;color:var(--sublabel)">${c.analogue}</td><td class="num">${display}</td></tr>`;
      }).join('');
    }

    slider.oninput = () => { nLabel.textContent = slider.value; render(Number(slider.value)); };
    render(Number(slider.value));
  }

  // ── Phase 0.5: interactive OOP module (same build-as-you-go pattern as PHASE0_SECTIONS).
  // Goal per curriculum.md: be able to talk through a class design out loud in an interview,
  // not just recognize the vocabulary.
  const PHASE05_SECTIONS = [
    { id: 'basics',        label: '1 · Classes & Encapsulation',   render: renderP05Basics },
    { id: 'abstraction',   label: '2 · Abstraction',               render: renderP05Abstraction },
    { id: 'inheritance',   label: '3 · Inheritance',                render: renderP05Inheritance },
    { id: 'composition',   label: '4 · Composition vs Inheritance', render: renderP05Composition },
    { id: 'polymorphism',  label: '5 · Polymorphism',               render: renderP05Polymorphism },
    { id: 'solid',         label: '6 · SOLID Principles',           render: renderP05Solid },
    { id: 'checkpoint',    label: '7 · Interview Drill',            render: renderP05Checkpoint, final: true },
  ];
  let currentP05Section = (isBrowser && localStorage.getItem('dsa-p05-section')) || PHASE05_SECTIONS[0].id;

  function renderPhase05Extra(introHtml) {
    const navHtml = PHASE05_SECTIONS.map(s =>
      `<div class="p0-nav-item${s.id === currentP05Section ? ' active' : ''}" data-p05="${s.id}">${escapeHtml(s.label)}</div>`
    ).join('');
    const active = PHASE05_SECTIONS.find(s => s.id === currentP05Section) || PHASE05_SECTIONS[0];

    return `${introHtml}<div class="p0-nav">${navHtml}</div><div class="p0-container" id="p05-body">${active.render()}</div>`;
  }

  function bindPhase05Handlers() {
    document.querySelectorAll('[data-p05]').forEach(el => {
      el.onclick = () => goToP05Section(el.dataset.p05);
    });
    updateP05NextFooter();
  }

  async function goToP05Section(id) {
    currentP05Section = id;
    localStorage.setItem('dsa-p05-section', id);
    await showPhase(currentPhaseIndex);
    const contentEl = document.getElementById('roadmap-content');
    if (contentEl) contentEl.scrollTop = 0;
  }

  // Same "Continue →" / "Go to Phase 1" / "not built yet" footer pattern as Phase 0.
  function updateP05NextFooter() {
    const footer = document.getElementById('p05-next-footer');
    if (!footer) return;
    const idx = PHASE05_SECTIONS.findIndex(s => s.id === currentP05Section);
    const current = PHASE05_SECTIONS[idx];
    const next = PHASE05_SECTIONS[idx + 1];
    if (next) {
      footer.innerHTML = `<button class="p0-next-btn" id="p05-next-btn">Continue to Section ${escapeHtml(next.label)} →</button>`;
      document.getElementById('p05-next-btn').onclick = () => goToP05Section(next.id);
    } else if (current && current.final) {
      footer.innerHTML = `<button class="p0-next-btn" id="p05-next-btn">Go to Phase 1 — Arrays & Hashing →</button>`;
      document.getElementById('p05-next-btn').onclick = () => {
        const phase1Idx = curriculumPhases.findIndex(p => p.num === 'Phase 1');
        if (phase1Idx >= 0) showPhase(phase1Idx);
      };
    } else {
      footer.textContent = "You've reached the end of what's built so far in Phase 0.5 — more sections coming soon.";
    }
  }

  function renderP05Basics() {
    return `
    <div class="p0-section-title">Classes, Objects & Encapsulation</div>
    <div class="p0-section-sub">Section 1 of Phase 0.5 — the two words everything else in OOP is built on top of.</div>

    <div class="p0-card">
      <h4>Class vs. object — a blueprint vs. the real thing</h4>
      <p>A <strong>class</strong> is a blueprint. It's not a real thing by itself — it just says what fields (data) and methods (actions) every object built from it will have. An <strong>object</strong> is one real thing built from that blueprint. You can build many objects from the same class, and each one keeps its own separate data.</p>
      <pre class="p0-code">class Dog {
  constructor(name) {
    this.name = name;   // each dog object gets its own name
  }
  bark() {
    console.log(\`\${this.name} says woof!\`);
  }
}

const rex = new Dog('Rex');     // one object
const fido = new Dog('Fido');   // a different object, same blueprint
rex.bark();   // "Rex says woof!"
fido.bark();  // "Fido says woof!"</pre>
      <p><code>Dog</code> is the class. <code>rex</code> and <code>fido</code> are two separate objects — same shape, different data.</p>
    </div>

    <div class="p0-card">
      <h4>Encapsulation — keep the data and the code that changes it together, and hide the messy parts</h4>
      <p>Encapsulation means two things at once: (1) bundle an object's data and the methods that work on that data into one unit, and (2) hide the internal details so outside code can only touch that data through a small, controlled set of methods — not directly.</p>
      <pre class="p0-code">class BankAccount {
  #balance = 0;   // "#" makes this a private field — nothing outside this class can read or set it directly

  deposit(amount) {
    if (amount <= 0) throw new Error('Deposit must be positive');
    this.#balance += amount;
  }
  withdraw(amount) {
    if (amount > this.#balance) throw new Error('Insufficient funds');
    this.#balance -= amount;
  }
  getBalance() {
    return this.#balance;
  }
}

const acc = new BankAccount();
acc.deposit(100);
// acc.#balance = -9999;  ← this line would crash — #balance isn't reachable from outside the class</pre>
      <details class="p0-reveal"><summary>Why hide the balance instead of just letting anyone set it directly?</summary>
        <p>If <code>balance</code> were a plain public field, any code anywhere could set it to a negative number, skip the "insufficient funds" check, or set it to a string by mistake — nothing would stop it. By forcing every change through <code>deposit()</code>/<code>withdraw()</code>, the class can guarantee the balance is always valid. It also means you can change how the balance is stored later (e.g. move it to a database) without touching any of the code that calls <code>deposit()</code> — the outside world only ever sees the method names, not the implementation.</p>
      </details>
    </div>

    <div class="p0-callout"><strong>Takeaway:</strong> a class groups related data and behavior together; encapsulation is the discipline of hiding that data behind methods so the object can protect its own rules. Interviewers listen for whether you can say <em>why</em> you'd make a field private, not just that "private is good practice."</div>
    <div class="p0-footer-next" id="p05-next-footer"></div>`;
  }

  function renderP05Abstraction() {
    return `
    <div class="p0-section-title">Abstraction — show the simple part, hide the complicated part</div>
    <div class="p0-section-sub">Section 2 of Phase 0.5 — easy to confuse with encapsulation. They're related but not the same thing.</div>

    <div class="p0-card">
      <h4>Abstraction in plain English</h4>
      <p>Abstraction means giving something a simple, easy-to-use interface, while hiding <em>how</em> it actually works underneath. You already do this every day: a car has a steering wheel and pedals — you don't need to know how the engine burns fuel to drive it. The "how" is hidden behind a simple "what."</p>
      <pre class="p0-code">class PaymentProcessor {
  charge(amountInCents) {
    // caller has no idea if this hits Stripe, PayPal, or a bank API directly —
    // and doesn't need to. All they know is: call charge(), get a result.
    return this.#sendToProvider(amountInCents);
  }

  #sendToProvider(amountInCents) {
    // messy provider-specific network/auth/retry logic lives here
  }
}</pre>
      <p>Anyone using <code>PaymentProcessor</code> only ever calls <code>.charge(amount)</code>. They never think about retries, network errors, or which payment provider is behind it. That's abstraction — a simple surface hiding real complexity.</p>
    </div>

    <div class="p0-card">
      <h4>Abstraction vs. encapsulation — the difference that trips people up</h4>
      <p><strong>Encapsulation</strong> is about restricting access — bundling data with methods and locking outside code out of the raw data. <strong>Abstraction</strong> is about simplifying — designing the interface so the user only sees what they need, regardless of whether the data underneath is technically "hidden" or not.</p>
      <p>In practice they usually show up together (a well-encapsulated class is usually also a good abstraction), but they answer different questions: encapsulation asks "what can touch this data?" — abstraction asks "what does the user of this class actually need to know?"</p>
      <details class="p0-reveal"><summary>Give me a one-line way to keep these straight in an interview</summary>
        <p>Encapsulation = hiding <em>data</em>. Abstraction = hiding <em>complexity</em> behind a simple interface. A class can be abstract (simple to use) even if you could technically inspect its internals — and a class can encapsulate its fields tightly while still exposing a genuinely complicated, unpleasant interface. They're two separate design goals that usually — but not always — get achieved together.</p>
      </details>
    </div>

    <div class="p0-callout"><strong>Takeaway:</strong> when you design a class, ask "what's the smallest, clearest set of methods someone else needs to use this thing correctly?" — everything else belongs behind the interface, not in front of it.</div>
    <div class="p0-footer-next" id="p05-next-footer"></div>`;
  }

  function renderP05Inheritance() {
    return `
    <div class="p0-section-title">Inheritance — sharing behavior through "is-a"</div>
    <div class="p0-section-sub">Section 3 of Phase 0.5 — powerful, but the most commonly overused OOP tool. Section 4 covers the usual alternative.</div>

    <div class="p0-card">
      <h4>The basic shape</h4>
      <p>Inheritance lets one class (the subclass) reuse and extend another class's (the parent's, or "base class's") fields and methods. Use it when the relationship is genuinely <strong>"is-a"</strong> — a <code>Dog</code> <em>is an</em> <code>Animal</code>.</p>
      <pre class="p0-code">class Animal {
  constructor(name) { this.name = name; }
  speak() { return \`\${this.name} makes a sound\`; }
}

class Dog extends Animal {
  speak() {                  // overrides the parent's method
    return \`\${this.name} barks\`;
  }
}

const a = new Animal('Generic');
const d = new Dog('Rex');
a.speak();  // "Generic makes a sound"
d.speak();  // "Rex barks" — Dog's own version wins</pre>
      <p><code>extends</code> sets up the "is-a" link. <code>super(...)</code> (not shown above, but used when the subclass needs its own constructor) calls the parent's constructor first.</p>
    </div>

    <div class="p0-card">
      <h4>Where inheritance gets you into trouble</h4>
      <p>Two well-known problems, both worth naming directly in an interview:</p>
      <p><strong>The fragile base class problem</strong> — a change to the parent class can silently break subclasses in ways that aren't obvious from reading the subclass alone, because the subclass's correctness depends on assumptions about how the parent behaves internally, not just its public shape.</p>
      <p><strong>Deep hierarchies get hard to reason about</strong> — if <code>D extends C extends B extends A</code>, answering "where does this method actually come from?" means walking up four classes. The deeper the chain, the harder it is to hold the whole picture in your head.</p>
      <details class="p0-reveal"><summary>So when does a 3-4 level hierarchy actually break something?</summary>
        <p>Say <code>Animal.speak()</code> is changed to also log analytics. Every subclass three levels down that overrides <code>speak()</code> but still calls <code>super.speak()</code> now silently gets that new analytics call too — even ones the person editing <code>Animal</code> never thought about or tested. The deeper the chain, the more subclasses are affected by a change nobody reviewing them was aware of.</p>
      </details>
    </div>

    <div class="p0-callout"><strong>Takeaway:</strong> inheritance is the right tool for a real, stable "is-a" relationship — but it's also the OOP feature most commonly reached for out of habit when a shallower alternative would be safer. That alternative is next.</div>
    <div class="p0-footer-next" id="p05-next-footer"></div>`;
  }

  function renderP05Composition() {
    return `
    <div class="p0-section-title">Composition vs. Inheritance — "has-a" instead of "is-a"</div>
    <div class="p0-section-sub">Section 4 of Phase 0.5 — "favor composition over inheritance" is one of the most quoted lines in OOP design. Know why, not just that it's said.</div>

    <div class="p0-card">
      <h4>Composition in plain English</h4>
      <p>Instead of a class <em>being</em> a more specific version of another class, composition builds a class out of smaller pieces it <strong>has</strong>. A <code>Car</code> doesn't have to inherit from <code>Engine</code> — it can just <em>have</em> an <code>Engine</code> as a field, and delegate to it.</p>
      <pre class="p0-code">class Engine {
  start() { return 'engine running'; }
}

class Car {
  constructor() {
    this.engine = new Engine();   // Car HAS an Engine — composition
  }
  start() {
    return this.engine.start();  // delegate the work to the piece that owns it
  }
}</pre>
    </div>

    <div class="p0-card">
      <h4>Inheritance vs. composition, side by side</h4>
      <table class="p0-table">
        <thead><tr><th></th><th>Inheritance ("is-a")</th><th>Composition ("has-a")</th></tr></thead>
        <tbody>
          <tr><td>Relationship</td><td class="num" style="text-align:left">Subclass IS a kind of the parent</td><td class="num" style="text-align:left">Object HAS another object as a part</td></tr>
          <tr><td>Flexibility</td><td class="num" style="text-align:left">Fixed once the class is written</td><td class="num" style="text-align:left">Parts can be swapped, even at runtime</td></tr>
          <tr><td>Coupling</td><td class="num" style="text-align:left">Tight — subclass depends on parent's internals</td><td class="num" style="text-align:left">Loose — only depends on the part's public interface</td></tr>
          <tr><td>Good for</td><td class="num" style="text-align:left">A genuinely stable taxonomy, 1-2 levels deep</td><td class="num" style="text-align:left">Mixing and matching pluggable behavior</td></tr>
        </tbody>
      </table>
      <p>Why "favor composition" as a default: you can swap an object's <code>Engine</code> for an <code>ElectricEngine</code> without touching <code>Car</code>'s class definition at all — just hand it a different object. Doing the equivalent with inheritance (an <code>ElectricCar</code> subclass) means the choice is baked in at class-definition time, and every layer of inherited behavior comes along whether you want it or not.</p>
      <details class="p0-reveal"><summary>So is inheritance ever actually the right call?</summary>
        <p>Yes — when the relationship is truly "is-a," genuinely stable (unlikely to need a different combination later), and shallow (one, maybe two levels). A <code>Square</code>-<code>Shape</code> or <code>SavingsAccount</code>-<code>Account</code> relationship is a reasonable "is-a." The moment you're inheriting just to reuse a method, or reaching for a 3rd/4th level to express "a mix of behaviors," that's usually a sign composition is the better fit.</p>
      </details>
    </div>

    <div class="p0-callout"><strong>Takeaway:</strong> ask "is-a" or "has-a" before writing a class relationship. If you're not sure, composition is the safer default — it's easier to change your mind later.</div>
    <div class="p0-footer-next" id="p05-next-footer"></div>`;
  }

  function renderP05Polymorphism() {
    return `
    <div class="p0-section-title">Polymorphism — one call, many behaviors</div>
    <div class="p0-section-sub">Section 5 of Phase 0.5 — the payoff that makes inheritance and interfaces actually useful, not just organized.</div>

    <div class="p0-card">
      <h4>Polymorphism in plain English</h4>
      <p>Polymorphism means: different objects can respond to the exact same method call, each in its own way — and the calling code doesn't need to know which specific type it's dealing with.</p>
      <pre class="p0-code">class Animal { speak() { return '...'; } }
class Dog extends Animal { speak() { return 'Woof'; } }
class Cat extends Animal { speak() { return 'Meow'; } }
class Cow extends Animal { speak() { return 'Moo'; } }

const animals = [new Dog(), new Cat(), new Cow()];
for (const a of animals) {
  console.log(a.speak());   // this loop never checks "what kind of animal is this?"
}
// Woof
// Meow
// Moo</pre>
      <p>The loop just calls <code>.speak()</code> — it has no idea, and doesn't need to know, whether it's holding a <code>Dog</code>, a <code>Cat</code>, or a <code>Cow</code>. Each object knows how to handle the call itself.</p>
    </div>

    <div class="p0-card">
      <h4>Overriding vs. overloading — not the same thing</h4>
      <p><strong>Overriding</strong>: a subclass redefines a method that already exists on its parent, keeping the same name (the <code>speak()</code> example above). JavaScript supports this natively through <code>class</code>/<code>extends</code>.</p>
      <p><strong>Overloading</strong>: having multiple versions of the <em>same-named</em> method that differ only by parameter list (e.g. <code>add(a, b)</code> and <code>add(a, b, c)</code> as two separate definitions). Some languages (Java, C++) support this directly.</p>
      <details class="p0-reveal"><summary>Does JavaScript support real method overloading?</summary>
        <p>No. In JavaScript, a function is just a value bound to a name — defining <code>add(a, b)</code> and then <code>add(a, b, c)</code> doesn't create two versions; the second definition simply overwrites the first. To fake overload-like behavior, you check <code>arguments.length</code>, use default parameters, or accept a rest parameter and branch inside one function body. This is a common interview gotcha specifically because it trips up people coming from Java/C++.</p>
      </details>
    </div>

    <div class="p0-card">
      <h4>Duck typing — polymorphism without a formal type system</h4>
      <p>"If it walks like a duck and quacks like a duck, it's a duck." In JavaScript, an object doesn't need to formally declare that it implements some interface — if it has the method being called, it works, no matter its actual class or where it came from. This is why polymorphism in JS often doesn't need inheritance at all: any two unrelated objects that both happen to have a <code>.speak()</code> method work identically in the loop above.</p>
    </div>

    <div class="p0-callout"><strong>Takeaway:</strong> polymorphism is what makes "write code against the general case, not every specific type" actually work. When asked for a real-world example in an interview, use one where the calling code is genuinely oblivious to the concrete type — that's the part that matters, not just "different classes have different methods."</div>
    <div class="p0-footer-next" id="p05-next-footer"></div>`;
  }

  function renderP05Solid() {
    return `
    <div class="p0-section-title">SOLID Principles</div>
    <div class="p0-section-sub">Section 6 of Phase 0.5 — five design principles interviewers use to check whether you can reason about maintainable class design, not just get code to run.</div>

    <div class="p0-card">
      <h4>S — Single Responsibility Principle</h4>
      <p>A class should have exactly one reason to change — one job.</p>
      <p><strong>Violates it:</strong> one <code>Employee</code> class that calculates pay, saves it to a database, <em>and</em> formats a printed report. Three unrelated reasons this class would need to change (a pay rule changes, the database changes, the report layout changes).</p>
      <p><strong>Fixes it:</strong> split into <code>PayCalculator</code>, <code>PayRepository</code>, and <code>PayReportPrinter</code> — each with one job, each changeable independently.</p>
    </div>

    <div class="p0-card">
      <h4>O — Open/Closed Principle</h4>
      <p>Classes should be open for extension, but closed for modification. Add new behavior by adding new code, not by editing and re-testing existing code every time a new case shows up.</p>
      <p><strong>Violates it:</strong> a <code>calculateArea(shape)</code> function with a growing <code>if/else</code> chain — <code>if (shape.type === 'circle') ... else if (shape.type === 'square') ...</code> — that needs a new branch (and a new round of testing the whole function) every time a new shape is added.</p>
      <p><strong>Fixes it:</strong> give every shape class its own <code>.area()</code> method; calling code just does <code>shape.area()</code>. Adding a new shape means adding a new class — the calling code never changes.</p>
    </div>

    <div class="p0-card">
      <h4>L — Liskov Substitution Principle</h4>
      <p>Anywhere the parent type is expected, a subclass should be usable as a drop-in replacement without breaking the caller's expectations.</p>
      <p><strong>Classic violation:</strong> <code>Square extends Rectangle</code>, overriding <code>setWidth()</code> to also change the height (to keep it square). Any code that does <code>rect.setWidth(5); rect.setHeight(10);</code> and expects <code>width=5, height=10</code> silently breaks when handed a <code>Square</code> — because setting width secretly changed height too. The subclass violated an assumption the caller was entitled to make about the parent.</p>
    </div>

    <div class="p0-card">
      <h4>I — Interface Segregation Principle</h4>
      <p>Don't force a class to depend on methods it doesn't actually use. Prefer several small, specific interfaces over one large, general-purpose one.</p>
      <p><strong>Violates it:</strong> one fat <code>Worker</code> interface requiring both <code>work()</code> and <code>eat()</code> — forcing a <code>RobotWorker</code> class to implement a meaningless <code>eat()</code> method just to satisfy the interface.</p>
      <p><strong>Fixes it:</strong> split into a <code>Workable</code> interface (<code>work()</code>) and a separate <code>Eatable</code> interface (<code>eat()</code>) — <code>RobotWorker</code> only implements <code>Workable</code>.</p>
    </div>

    <div class="p0-card">
      <h4>D — Dependency Inversion Principle</h4>
      <p>High-level code should depend on an abstraction (an interface/contract), not directly on a specific low-level implementation.</p>
      <p><strong>Violates it:</strong> a class that does <code>this.db = new MySQLDatabase()</code> directly inside itself — now it can never be tested without a real MySQL connection, and can never swap databases without editing this class.</p>
      <p><strong>Fixes it:</strong> accept a database object through the constructor (<code>constructor(db) { this.db = db; }</code>) instead of creating it internally — this is called <strong>dependency injection</strong>. Now a fake/mock database can be passed in for tests, and swapping databases means passing in a different object, not editing this class.</p>
    </div>

    <div class="p0-callout"><strong>Takeaway:</strong> in an interview, you don't need to recite the acronym on cue — you need to spot a SOLID violation when it's in front of you and explain concretely what goes wrong because of it. That's what the drill in the next section is checking for.</div>
    <div class="p0-footer-next" id="p05-next-footer"></div>`;
  }

  function renderP05Checkpoint() {
    return `
    <div class="p0-section-title">Interview Drill — Are You Ready?</div>
    <div class="p0-section-sub">Section 7 of Phase 0.5 — the last step. These are close to word-for-word the OOP questions that actually get asked.</div>

    <p>For each question: try to answer it out loud, in your own words, before opening the answer. If you can't get through one without checking, go back and re-read that section before moving on.</p>

    <div class="p0-card">
      <h4>6 questions you should be able to answer cold</h4>

      <div class="p0-quiz-item">
        <div class="p0-quiz-q"><strong>1.</strong> What's the difference between abstraction and encapsulation?</div>
        <details class="p0-reveal"><summary>Show Answer</summary>
          <div class="p0-quiz-answer">Encapsulation hides <em>data</em> — it bundles fields with the methods that control them and restricts direct outside access. Abstraction hides <em>complexity</em> — it gives the user of a class a simple interface without needing to know how it works underneath. They usually show up together, but they answer different design questions.</div>
        </details>
      </div>

      <div class="p0-quiz-item">
        <div class="p0-quiz-q"><strong>2.</strong> What's the difference between an abstract class and an interface? Does JavaScript really have either?</div>
        <details class="p0-reveal"><summary>Show Answer</summary>
          <div class="p0-quiz-answer">An abstract class can have some real implementation plus some methods subclasses must fill in; an interface (in languages that have one, like Java) defines only method signatures with zero implementation, and a class can implement several interfaces but usually only extend one class. Plain JavaScript has neither keyword — you fake an "abstract class" by throwing an error in a base method if a subclass didn't override it, and you fake an "interface" through duck typing (an object just needs to have the right methods) or, in TypeScript, an actual <code>interface</code> keyword.</div>
        </details>
      </div>

      <div class="p0-quiz-item">
        <div class="p0-quiz-q"><strong>3.</strong> When would you choose composition over inheritance?</div>
        <details class="p0-reveal"><summary>Show Answer</summary>
          <div class="p0-quiz-answer">When the relationship isn't a clean, stable "is-a," when you want to swap behavior at runtime, or when inheritance would force a deep/rigid hierarchy just to reuse one method. Composition keeps coupling loose — an object only depends on the public interface of the parts it holds, not on a parent class's internals.</div>
        </details>
      </div>

      <div class="p0-quiz-item">
        <div class="p0-quiz-q"><strong>4.</strong> What is polymorphism? Give a real example.</div>
        <details class="p0-reveal"><summary>Show Answer</summary>
          <div class="p0-quiz-answer">Different objects respond to the same method call each in their own way, and the calling code doesn't need to know which concrete type it's holding. Example: a list of shapes (<code>Circle</code>, <code>Square</code>, <code>Triangle</code>) where a loop just calls <code>shape.area()</code> on each one — the loop never branches on shape type.</div>
        </details>
      </div>

      <div class="p0-quiz-item">
        <div class="p0-quiz-q"><strong>5.</strong> Explain the Liskov Substitution Principle with an example.</div>
        <details class="p0-reveal"><summary>Show Answer</summary>
          <div class="p0-quiz-answer">A subclass should be usable anywhere the parent class is expected, without breaking the caller's assumptions. Classic broken example: <code>Square extends Rectangle</code>, where setting the width also silently changes the height to keep it square — code that expects <code>setWidth()</code> and <code>setHeight()</code> to be independent (true for any <code>Rectangle</code>) breaks the moment it's handed a <code>Square</code>.</div>
        </details>
      </div>

      <div class="p0-quiz-item">
        <div class="p0-quiz-q"><strong>6.</strong> "Design a class for a parking lot" — how do you even start?</div>
        <details class="p0-reveal"><summary>Show Answer</summary>
          <div class="p0-quiz-answer">Pull the classes out of the nouns in the prompt (<code>ParkingLot</code>, <code>ParkingSpot</code>, <code>Vehicle</code>, <code>Ticket</code>) and the methods out of the verbs (<code>parkVehicle()</code>, <code>removeVehicle()</code>, <code>findAvailableSpot()</code>). For each relationship, decide "is-a" vs. "has-a" out loud (a <code>Car</code> is-a <code>Vehicle</code>; a <code>ParkingLot</code> has-a list of <code>ParkingSpot</code>s). Keep each class to one job (SRP). Don't reach for inheritance or design patterns you can't justify — a lot of candidates over-engineer this kind of question trying to look sophisticated. State assumptions out loud instead of guessing silently.</div>
        </details>
      </div>
    </div>

    <div class="p0-card">
      <h4>You're ready for Phase 1 when...</h4>
      <p>✓ You can explain encapsulation and abstraction as two different things, not synonyms.<br>
      ✓ You default to asking "is-a or has-a?" before writing a class relationship.<br>
      ✓ You can catch a SOLID violation in a snippet of code and say what breaks because of it.<br>
      ✓ You didn't need to peek at the answers above more than once or twice.</p>
    </div>

    <div class="p0-callout"><strong>That's it — Phase 0.5 is done.</strong> You won't get quizzed on OOP vocabulary in a DSA interview loop, but a design-round interviewer absolutely will hand you an open-ended "design a class for X" prompt — this is what prepares you to talk through it out loud instead of freezing.</div>
    <div class="p0-footer-next" id="p05-next-footer"></div>`;
  }

  // ── Phase 1: interactive per-problem module. Each problem gets: easy-English statement,
  // a non-spoiler visual of the concept, a pointer to which .js file to code in, and the
  // brute-force/optimal walkthrough hidden behind a <details class="p0-reveal"> until Lawrence
  // has attempted it himself. New problems are added to PHASE1_PROBLEMS one at a time, as they
  // come up in a mentor session — same build-as-you-go pattern as PHASE0_SECTIONS.
  const PHASE1_PROBLEMS = [
    {
      id: 'containsDuplicate',
      pattern: 'Arrays & Hashing',
      title: 'Contains Duplicate',
      difficulty: 'easy',
      file: 'array-hashMap-containsDuplicate.js',
      render: renderP1ContainsDuplicate,
      init: initP1ContainsDuplicateStepper,
    },
    {
      id: 'twoSum',
      pattern: 'Arrays & Hashing',
      title: 'Two Sum',
      difficulty: 'easy',
      file: 'array-hashMap-twoSum.js',
      render: renderP1TwoSum,
      init: initP1TwoSumStepper,
    },
    {
      id: 'validAnagram',
      pattern: 'Arrays & Hashing',
      title: 'Valid Anagram',
      difficulty: 'easy',
      file: 'array-hashMap-validAnagram.js',
      render: renderP1ValidAnagram,
      init: initP1ValidAnagramStepper,
    },
    {
      id: 'groupAnagrams',
      pattern: 'Arrays & Hashing',
      title: 'Group Anagrams',
      difficulty: 'medium',
      file: 'array-hashMap-groupAnagrams.js',
      render: renderP1GroupAnagrams,
      init: initP1GroupAnagramsStepper,
    },
    {
      id: 'topKFrequent',
      pattern: 'Arrays & Hashing',
      title: 'Top K Frequent Elements',
      difficulty: 'medium',
      file: 'array-hashMap-topKFrequent.js',
      render: renderP1TopKFrequent,
      init: initP1TopKFrequentStepper,
    },
    {
      id: 'productExceptSelf',
      pattern: 'Arrays & Hashing',
      title: 'Product of Array Except Self',
      difficulty: 'medium',
      file: 'array-hashMap-productExceptSelf.js',
      render: renderP1ProductExceptSelf,
      init: initP1ProductExceptSelfStepper,
    },
    {
      id: 'longestConsecutiveSequence',
      pattern: 'Arrays & Hashing',
      title: 'Longest Consecutive Sequence',
      difficulty: 'medium',
      file: 'array-hashMap-longestConsecutiveSequence.js',
      render: renderP1LongestConsecutive,
      init: initP1LongestConsecutiveStepper,
    },
    {
      id: 'encodeAndDecodeStrings',
      pattern: 'Arrays & Hashing',
      title: 'Encode and Decode Strings',
      difficulty: 'medium',
      file: 'array-hashMap-encodeAndDecodeStrings.js',
      render: renderP1EncodeDecode,
      init: initP1EncodeDecodeStepper,
    },
    {
      id: 'firstUniqChar',
      pattern: 'Arrays & Hashing',
      title: 'First Unique Character',
      difficulty: 'easy',
      file: 'array-hashMap-firstUniqChar.js',
      render: renderP1FirstUniqChar,
      init: initP1FirstUniqCharStepper,
    },
    {
      id: 'reverseWords',
      pattern: 'Arrays & Hashing',
      title: 'Reverse Words in a String',
      difficulty: 'medium',
      file: 'array-hashMap-reverseWords.js',
      render: renderP1ReverseWords,
      init: initP1ReverseWordsStepper,
    },
    {
      id: 'validPalindrome',
      pattern: 'Two Pointers',
      title: 'Valid Palindrome',
      difficulty: 'easy',
      file: 'twoPointers-validPalindrome.js',
      render: renderP1ValidPalindrome,
      init: initP1ValidPalindromeStepper,
    },
    {
      id: 'threeSum',
      pattern: 'Two Pointers',
      title: '3Sum',
      difficulty: 'medium',
      file: 'twoPointers-threeSum.js',
      render: renderP1ThreeSum,
      init: initP1ThreeSumStepper,
    },
    {
      id: 'containerWithMostWater',
      pattern: 'Two Pointers',
      title: 'Container With Most Water',
      difficulty: 'medium',
      file: 'twoPointers-containerWithMostWater.js',
      render: renderP1ContainerWater,
      init: initP1ContainerWaterStepper,
    },
    {
      id: 'bestTimeToBuyAndSellStock',
      pattern: 'Sliding Window',
      title: 'Best Time to Buy and Sell Stock',
      difficulty: 'easy',
      file: 'slidingWindow-bestTimeToBuyAndSellStock.js',
      render: renderP1BestTimeToBuySell,
      init: initP1BestTimeToBuySellStepper,
    },
    {
      id: 'longestSubstringWithoutRepeating',
      pattern: 'Sliding Window',
      title: 'Longest Substring Without Repeating Characters',
      difficulty: 'medium',
      file: 'slidingWindow-longestSubstringWithoutRepeating.js',
      render: renderP1LongestSubstring,
      init: initP1LongestSubstringStepper,
    },
    {
      id: 'longestRepeatingCharacterReplacement',
      pattern: 'Sliding Window',
      title: 'Longest Repeating Character Replacement',
      difficulty: 'medium',
      file: 'slidingWindow-longestRepeatingCharacterReplacement.js',
      render: renderP1CharReplacement,
      init: initP1CharReplacementStepper,
    },
    {
      id: 'minimumWindowSubstring',
      pattern: 'Sliding Window',
      title: 'Minimum Window Substring',
      difficulty: 'hard',
      file: 'slidingWindow-minimumWindowSubstring.js',
      render: renderP1MinWindow,
      init: initP1MinWindowStepper,
    },
    {
      id: 'validParentheses',
      pattern: 'Stack',
      title: 'Valid Parentheses',
      difficulty: 'easy',
      file: 'stack-validParentheses.js',
      render: renderP1ValidParentheses,
      init: initP1ValidParenthesesStepper,
    },
    {
      id: 'searchInRotatedSortedArray',
      pattern: 'Binary Search',
      title: 'Search in Rotated Sorted Array',
      difficulty: 'medium',
      file: 'searchInRotatedSortedArray.js',
      render: renderP1SearchRotated,
      init: initP1SearchRotatedStepper,
    },
    {
      id: 'findMinimumInRotatedSortedArray',
      pattern: 'Binary Search',
      title: 'Find Minimum in Rotated Sorted Array',
      difficulty: 'medium',
      file: 'binarySearch-findMinimumInRotatedSortedArray.js',
      render: renderP1FindMinRotated,
      init: initP1FindMinRotatedStepper,
    },
    {
      id: 'reverseLinkedList',
      pattern: 'Linked List',
      title: 'Reverse Linked List',
      difficulty: 'easy',
      file: 'linkedList-reverseLinkedList.js',
      render: renderP1ReverseLinkedList,
      init: initP1ReverseLinkedListStepper,
    },
    {
      id: 'linkedListCycle',
      pattern: 'Linked List',
      title: 'Linked List Cycle',
      difficulty: 'easy',
      file: 'linkedList-linkedListCycle.js',
      render: renderP1LinkedListCycle,
      init: initP1LinkedListCycleStepper,
    },
    {
      id: 'mergeTwoSortedLists',
      pattern: 'Linked List',
      title: 'Merge Two Sorted Lists',
      difficulty: 'easy',
      file: 'linkedList-mergeTwoSortedLists.js',
      render: renderP1MergeTwoLists,
      init: initP1MergeTwoListsStepper,
    },
    {
      id: 'removeNthFromEnd',
      pattern: 'Linked List',
      title: 'Remove Nth Node From End of List',
      difficulty: 'medium',
      file: 'linkedList-removeNthFromEnd.js',
      render: renderP1RemoveNthFromEnd,
      init: initP1RemoveNthFromEndStepper,
    },
    {
      id: 'reorderLinkedList',
      pattern: 'Linked List',
      title: 'Reorder List',
      difficulty: 'medium',
      file: 'linkedList-reorderLinkedList.js',
      render: renderP1ReorderList,
      init: initP1ReorderListStepper,
    },
    {
      id: 'mergeKSortedLinkedLists',
      pattern: 'Linked List',
      title: 'Merge K Sorted Lists',
      difficulty: 'hard',
      file: 'mergeKSortedLinkedLists.js',
      render: renderP1MergeKLists,
      init: initP1MergeKListsStepper,
    },
    {
      id: 'invertBinaryTree',
      pattern: 'Trees',
      title: 'Invert Binary Tree',
      difficulty: 'easy',
      file: 'trees-invertBinaryTree.js',
      render: renderP1InvertBinaryTree,
      init: initP1InvertBinaryTreeStepper,
    },
    {
      id: 'maximumDepthOfBinaryTree',
      pattern: 'Trees',
      title: 'Maximum Depth of Binary Tree',
      difficulty: 'easy',
      file: 'trees-maximumDepthOfBinaryTree.js',
      render: renderP1MaxDepth,
      init: initP1MaxDepthStepper,
    },
    {
      id: 'sameBinaryTree',
      pattern: 'Trees',
      title: 'Same Binary Tree',
      difficulty: 'easy',
      file: 'trees-sameBinaryTree.js',
      render: renderP1SameBinaryTree,
      init: initP1SameBinaryTreeStepper,
    },
    {
      id: 'subtreeOfAnotherTree',
      pattern: 'Trees',
      title: 'Subtree of Another Tree',
      difficulty: 'easy',
      file: 'trees-subtreeOfAnotherTree.js',
      render: renderP1SubtreeOfAnotherTree,
      init: initP1SubtreeOfAnotherTreeStepper,
    },
    {
      id: 'lowestCommonAncestorBST',
      pattern: 'Trees',
      title: 'Lowest Common Ancestor of a BST',
      difficulty: 'medium',
      file: 'trees-lowestCommonAncestorBST.js',
      render: renderP1LCABST,
      init: initP1LCABSTStepper,
    },
    {
      id: 'binaryTreeLevelOrderTraversal',
      pattern: 'Trees',
      title: 'Binary Tree Level Order Traversal',
      difficulty: 'medium',
      file: 'trees-binaryTreeLevelOrderTraversal.js',
      render: renderP1LevelOrder,
      init: initP1LevelOrderStepper,
    },
    {
      id: 'validBinarySearchTree',
      pattern: 'Trees',
      title: 'Valid Binary Search Tree',
      difficulty: 'medium',
      file: 'trees-validBinarySearchTree.js',
      render: renderP1ValidBST,
      init: initP1ValidBSTStepper,
    },
    {
      id: 'kthSmallestIntegerInBST',
      pattern: 'Trees',
      title: 'Kth Smallest Integer in a BST',
      difficulty: 'medium',
      file: 'trees-kthSmallestIntegerInBST.js',
      render: renderP1KthSmallest,
      init: initP1KthSmallestStepper,
    },
    {
      id: 'constructBinaryTreeFromPreorderAndInorderTraversal',
      pattern: 'Trees',
      title: 'Construct Binary Tree from Preorder and Inorder Traversal',
      difficulty: 'medium',
      file: 'trees-constructBinaryTreeFromPreorderAndInorderTraversal.js',
      render: renderP1ConstructTree,
      init: initP1ConstructTreeStepper,
    },
    {
      id: 'binaryTreeMaximumPathSum',
      pattern: 'Trees',
      title: 'Binary Tree Maximum Path Sum',
      difficulty: 'hard',
      file: 'binaryTreeMaximumPathSum.js',
      render: renderP1MaxPathSum,
      init: initP1MaxPathSumStepper,
    },
    {
      id: 'serializeAndDeserializeBinaryTree',
      pattern: 'Trees',
      title: 'Serialize and Deserialize Binary Tree',
      difficulty: 'hard',
      file: 'trees-serializeAndDeserializeBinaryTree.js',
      render: renderP1SerDe,
      init: initP1SerDeStepper,
    },
    {
      id: 'numberOfIslands',
      pattern: 'Graphs',
      title: 'Number of Islands',
      difficulty: 'medium',
      file: 'graph-numberOfIslands.js',
      render: renderP1NumberOfIslands,
      init: initP1IslandsStepper,
    },
    {
      id: 'cloneGraph',
      pattern: 'Graphs',
      title: 'Clone Graph',
      difficulty: 'medium',
      file: 'graph-cloneGraph.js',
      render: renderP1CloneGraph,
      init: initP1CloneGraphStepper,
    },
    {
      id: 'courseSchedule',
      pattern: 'Graphs',
      title: 'Course Schedule',
      difficulty: 'medium',
      file: 'courseSchedule.js',
      render: renderP1CourseSchedule,
      init: initP1CourseScheduleStepper,
    },
    {
      id: 'redundantConnection',
      pattern: 'Advanced Graphs (Union Find, Dijkstra, MST)',
      title: 'Redundant Connection',
      difficulty: 'medium',
      file: 'graph-redundantConnection.js',
      render: renderP1RedundantConnection,
      init: initP1RedundantConnectionStepper,
    },
    {
      id: 'climbingStairs',
      pattern: '1-D Dynamic Programming',
      title: 'Climbing Stairs',
      difficulty: 'easy',
      file: 'dynamicProgramming-climbingStairs.js',
      render: renderP1ClimbingStairs,
      init: initP1ClimbingStairsStepper,
    },
    {
      id: 'houseRobber',
      pattern: '1-D Dynamic Programming',
      title: 'House Robber',
      difficulty: 'medium',
      file: 'dynamicProgramming-houseRobber.js',
      render: renderP1HouseRobber,
      init: initP1HouseRobberStepper,
    },
    {
      id: 'houseRobberII',
      pattern: '1-D Dynamic Programming',
      title: 'House Robber II',
      difficulty: 'medium',
      file: 'houseRobberII.js',
      render: renderP1HouseRobberII,
      init: initP1HouseRobberIIStepper,
    },
    {
      id: 'uniquePaths',
      pattern: '2-D Dynamic Programming',
      title: 'Unique Paths',
      difficulty: 'medium',
      file: 'dynamicProgramming-uniquePaths.js',
      render: renderP1UniquePaths,
      init: initP1UniquePathsStepper,
    },
    {
      id: 'mergeIntervals',
      pattern: 'Greedy / Intervals',
      title: 'Merge Intervals',
      difficulty: 'medium',
      file: 'intervals-mergeIntervals.js',
      render: renderP1MergeIntervals,
      init: initP1MergeIntervalsStepper,
    },
    {
      id: 'insertInterval',
      pattern: 'Greedy / Intervals',
      title: 'Insert Interval',
      difficulty: 'medium',
      file: 'intervals-insertInterval.js',
      render: renderP1InsertInterval,
      init: initP1InsertIntervalStepper,
    },
    {
      id: 'nonOverlappingIntervals',
      pattern: 'Greedy / Intervals',
      title: 'Non-overlapping Intervals',
      difficulty: 'medium',
      file: 'nonOverlappingIntervals.js',
      render: renderP1NonOverlappingIntervals,
      init: initP1NonOverlappingIntervalsStepper,
    },
    {
      id: 'meetingRoomsII',
      pattern: 'Greedy / Intervals',
      title: 'Meeting Rooms II',
      difficulty: 'medium',
      file: 'intervals-meetingRoomsII.js',
      render: renderP1MeetingRoomsII,
      init: initP1MeetingRoomsIIStepper,
    },
    {
      id: 'implementTrie',
      pattern: 'Tries',
      title: 'Implement Trie (Prefix Tree)',
      difficulty: 'medium',
      file: 'trie-implementTrie.js',
      render: renderP1ImplementTrie,
      init: initP1ImplementTrieStepper,
    },
    {
      id: 'addAndSearchWords',
      pattern: 'Tries',
      title: 'Design Add and Search Words Data Structure',
      difficulty: 'medium',
      file: 'trie-addAndSearchWords.js',
      render: renderP1AddAndSearchWords,
      init: initP1AddAndSearchWordsStepper,
    },
    {
      id: 'kthLargestInStream',
      pattern: 'Heap / Priority Queue',
      title: 'Kth Largest Element in a Stream',
      difficulty: 'easy',
      file: 'heap-kthLargestElementInStream.js',
      render: renderP1KthLargestStream,
      init: initP1KthLargestStreamStepper,
    },
    {
      id: 'subsets',
      pattern: 'Backtracking',
      title: 'Subsets',
      difficulty: 'medium',
      file: 'backtracking-subsets.js',
      render: renderP1Subsets,
      init: initP1SubsetsStepper,
    },
  ];

  // Top-level pattern categories, matching co-founder/roadmap.md's order. Shown as pills first;
  // clicking one reveals that pattern's problem pills (only Arrays & Hashing has any so far).
  const PHASE1_CATEGORIES = [
    'Arrays & Hashing',
    'Two Pointers',
    'Sliding Window',
    'Stack',
    'Binary Search',
    'Linked List',
    'Trees',
    'Tries',
    'Heap / Priority Queue',
    'Backtracking',
    'Graphs',
    'Advanced Graphs (Union Find, Dijkstra, MST)',
    '1-D Dynamic Programming',
    '2-D Dynamic Programming',
    'Greedy / Intervals',
    'Bit Manipulation',
    'Math & Geometry',
  ];

  // Maps a PHASE1_CATEGORIES name -> a render function for that pattern's teaching primer (what it
  // is, how it works, when to reach for it, common variations, complexity cheat-sheet). Shown above
  // the problem pills whenever that category is open. Authored one pattern at a time as sessions
  // reach them, same incremental approach as PHASE1_PROBLEMS itself — categories with no entry here
  // yet simply show no primer.
  const PATTERN_PRIMERS = {
    'Arrays & Hashing': renderPrimerArraysHashing,
    'Two Pointers': renderPrimerTwoPointers,
    'Sliding Window': renderPrimerSlidingWindow,
    'Stack': renderPrimerStack,
    'Binary Search': renderPrimerBinarySearch,
    'Linked List': renderPrimerLinkedList,
    'Trees': renderPrimerTrees,
    'Tries': renderPrimerTries,
    'Heap / Priority Queue': renderPrimerHeap,
    'Graphs': renderPrimerGraphs,
    'Advanced Graphs (Union Find, Dijkstra, MST)': renderPrimerAdvancedGraphs,
    '1-D Dynamic Programming': renderPrimerOneDDP,
    '2-D Dynamic Programming': renderPrimerTwoDDP,
    'Greedy / Intervals': renderPrimerGreedyIntervals,
    'Backtracking': renderPrimerBacktracking,
  };

  let currentP1Problem = (isBrowser && localStorage.getItem('dsa-p1-problem')) || PHASE1_PROBLEMS[0].id;
  let currentP1Category = (isBrowser && localStorage.getItem('dsa-p1-category'))
    || (PHASE1_PROBLEMS.find(p => p.id === currentP1Problem) || PHASE1_PROBLEMS[0]).pattern;

  function renderPhase1Extra() {
    const primerFn = PATTERN_PRIMERS[currentP1Category];
    const primerHtml = primerFn ? `<div class="p1-primer">${primerFn()}</div>` : '';

    const problemsInCategory = PHASE1_PROBLEMS.filter(p => p.pattern === currentP1Category);
    let bodyHtml;
    if (!problemsInCategory.length) {
      bodyHtml = `<div class="p0-container"><p style="color:var(--muted);font-size:13px">No problems built yet for ${escapeHtml(currentP1Category)} — more added as sessions reach them.</p></div>`;
    } else {
      const active = problemsInCategory.find(p => p.id === currentP1Problem) || problemsInCategory[0];
      bodyHtml = `<div class="p0-container" id="p1-body">${active.render()}</div>`;
    }

    return primerHtml + bodyHtml;
  }

  // Category/problem clicks are bound in renderSidebar() now, since that nav
  // moved into the sidebar's Phase 1 tree — this only wires the active problem's
  // own interactive stepper and the "continue" footer.
  function bindPhase1Handlers() {
    PHASE1_PROBLEMS.forEach(p => p.init && p.init());
    updateP1NextFooter();
  }

  async function goToP1Category(cat) {
    currentP1Category = cat;
    localStorage.setItem('dsa-p1-category', cat);
    const problemsInCategory = PHASE1_PROBLEMS.filter(p => p.pattern === cat);
    if (problemsInCategory.length && !problemsInCategory.some(p => p.id === currentP1Problem)) {
      currentP1Problem = problemsInCategory[0].id;
      localStorage.setItem('dsa-p1-problem', currentP1Problem);
    }
    const phase1Index = curriculumPhases.findIndex(p => p.num === 'Phase 1');
    const contentEl = document.getElementById('roadmap-content');
    const scrollBefore = contentEl ? contentEl.scrollTop : 0;
    await showPhase(phase1Index);
    if (contentEl) contentEl.scrollTop = scrollBefore;
  }

  async function goToP1Problem(id) {
    currentP1Problem = id;
    localStorage.setItem('dsa-p1-problem', id);
    const p = PHASE1_PROBLEMS.find(pp => pp.id === id);
    if (p) {
      currentP1Category = p.pattern;
      localStorage.setItem('dsa-p1-category', currentP1Category);
    }
    const phase1Index = curriculumPhases.findIndex(p => p.num === 'Phase 1');
    const contentEl = document.getElementById('roadmap-content');
    const scrollBefore = contentEl ? contentEl.scrollTop : 0;
    await showPhase(phase1Index);
    if (contentEl) contentEl.scrollTop = scrollBefore;
  }

  // Renders a "Continue to next problem" button when one exists, otherwise an honest
  // "not built yet" note — same pattern as Phase 0's updateP0NextFooter.
  function updateP1NextFooter() {
    const footer = document.getElementById('p1-next-footer');
    if (!footer) return;
    const idx = PHASE1_PROBLEMS.findIndex(p => p.id === currentP1Problem);
    const next = PHASE1_PROBLEMS[idx + 1];
    if (next) {
      footer.innerHTML = `<button class="p0-next-btn" id="p1-next-btn">Continue to ${escapeHtml(next.title)} →</button>`;
      document.getElementById('p1-next-btn').onclick = () => goToP1Problem(next.id);
    } else {
      footer.textContent = "You've reached the end of what's built so far in Phase 1 — more problems added as we go.";
    }
  }

  // ── Pattern primers: one per PHASE1_CATEGORIES entry, shown above that category's problem pills.
  // Each teaches the pattern itself (not any one problem) — what it is, how it works, when to reach
  // for it, common variations, and a complexity cheat-sheet. Reuses each pattern's own shared visual
  // helper (renderP1Trie, renderP1Heap, renderP1GraphSVG, etc.) so no new rendering infra is needed.

  function renderPrimerArraysHashing() {
    return `
    <div class="p1-primer-label">📘 Pattern Primer — Arrays &amp; Hashing</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>An array is a row of numbered slots — slot <code>i</code> is reached instantly, no searching needed. Hashing turns any key (a number, string, whatever) into a slot number, so a hash map or hash set gives you that same "jump straight there" speed for lookups too, not just for arrays.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>A hash map/set runs your key through a hash function to get a bucket number, then stores (or looks up) the key in that bucket. Same key always hashes to the same bucket, so checking "have I seen this?" or "how many of these are there?" is instant — no scanning. Matching colors below are the same value, found by hashing instead of by comparing every pair:</p>
      <div class="p0-arr-row">${renderP1ArrayRow([1, 2, 3, 2, 4, 1])}</div>
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>"Have I seen this before?" &middot; "how many times does X appear?" &middot; "find two values that add up to a target" &middot; "group things by some computed key" &middot; anything where checking membership or counting needs to be fast, not a linear scan.</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p>Hash <strong>set</strong> for plain membership ("have I seen this?" — Contains Duplicate). Hash <strong>map</strong> of value→index or value→count (Two Sum's complement lookup, frequency counting). Hash map of a computed key→group (Group Anagrams sorts each string to build the key). Prefix/suffix running totals stored alongside a map (Product of Array Except Self).</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Operation</th><th style="text-align:right">Average</th><th style="text-align:right">Worst case</th></tr></thead>
      <tbody>
        <tr><td>Insert / lookup / delete (hash map or set)</td><td class="num">O(1)</td><td class="num">O(n)</td></tr>
        <tr><td>Array access by index</td><td class="num">O(1)</td><td class="num">O(1)</td></tr>
      </tbody>
    </table>`;
  }

  function renderPrimerTwoPointers() {
    const arr = [1, 3, 4, 6, 7, 9];
    const pointerRow = `<div class="p0-arr-row" style="align-items:flex-end">${arr.map((v, i) => {
      const isL = i === 0, isR = i === arr.length - 1;
      const label = isL ? '▲ L' : (isR ? '▲ R' : '');
      const color = isL || isR ? '#3b82f6' : undefined;
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
        <div class="p0-arr-cell"${color ? ` style="border-color:${color}"` : ''}>${v}</div>
        <div style="font-size:10px;color:var(--blue);height:12px">${label}</div>
      </div>`;
    }).join('')}</div>`;

    return `
    <div class="p1-primer-label">📘 Pattern Primer — Two Pointers</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>Instead of a nested loop checking every pair (O(n²)), you keep two index variables that each only ever move forward — never backtrack — across a sorted or naturally-ordered structure. That single-direction movement is what cuts the work down to O(n).</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>Two common shapes: pointers starting at opposite ends and moving toward each other, or one pointer chasing another from the same side. Either way, each step you take rules out possibilities you'll never need to check again:</p>
      ${pointerRow}
      <p style="margin-top:6px">L and R close inward based on what you compare at each step — e.g. if the sum at L+R is too small, move L right; too big, move R left.</p>
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>The array is sorted (or you sort it first) &middot; "find a pair/triple that sums to a target" &middot; "reverse or check symmetry in place" &middot; anything where a nested loop would work but feels wasteful.</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>Opposite ends closing inward</strong> — Valid Palindrome, Container With Most Water. <strong>Fixed first value + two pointers on the rest</strong> — 3Sum sorts, fixes one number, then two-pointers the remainder for the other two. <strong>Same-direction, different speeds</strong> — removing duplicates in place, or the fast/slow pointer trick used for cycle detection.</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
      <tbody>
        <tr><td>Nested loop (brute force)</td><td class="num">O(n&sup2;)</td><td class="num">O(1)</td></tr>
        <tr><td>Two pointers (plus a sort, if needed)</td><td class="num">O(n log n)</td><td class="num">O(1)</td></tr>
      </tbody>
    </table>`;
  }

  function renderPrimerSlidingWindow() {
    const arr = [4, 2, 1, 7, 8, 3, 5];
    const winStart = 2, winEnd = 4;
    const windowRow = `<div class="p0-arr-row">${arr.map((v, i) => {
      const inWindow = i >= winStart && i <= winEnd;
      return `<div class="p0-arr-cell"${inWindow ? ' style="border-color:#22c55e;background:#22c55e22"' : ''}>${v}</div>`;
    }).join('')}</div>`;

    return `
    <div class="p1-primer-label">📘 Pattern Primer — Sliding Window</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>A window is a contiguous chunk of an array or string, marked by a left and right edge. Instead of recomputing everything from scratch for every possible window, you grow the window by moving the right edge, and shrink it by moving the left edge — reusing whatever you already knew about the previous window.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>The green cells are the current window. Moving the right edge forward adds one new element to whatever you're tracking (a count, a sum, a set of seen characters); moving the left edge forward removes one:</p>
      ${windowRow}
      <p style="margin-top:6px">This is what makes it O(n) overall even though it looks like two nested loops — each edge only ever moves forward, so together they take at most 2n steps total, never n&sup2;.</p>
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>"Longest/shortest/best <strong>contiguous</strong> substring or subarray that satisfies some condition" — the word "contiguous" is the giveaway. "No repeating characters," "at most k distinct," "contains all of these characters" all fit this shape.</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>Fixed-size window</strong> — the window length is given up front, just slide it across. <strong>Variable-size window</strong> (far more common) — grow the right edge until the window becomes invalid, then shrink the left edge until it's valid again, tracking the best window seen along the way. Longest Substring Without Repeating, Longest Repeating Character Replacement, and Minimum Window Substring are all this second shape.</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
      <tbody>
        <tr><td>Check every substring/subarray (brute force)</td><td class="num">O(n&sup2;) or O(n&sup3;)</td><td class="num">varies</td></tr>
        <tr><td>Sliding window (two pointers, one pass)</td><td class="num">O(n)</td><td class="num">O(k) typical</td></tr>
      </tbody>
    </table>`;
  }

  function renderPrimerStack() {
    const stackVals = ['(', '[', '('];
    const stackVisual = `<div style="display:flex;flex-direction:column-reverse;align-items:center;gap:4px;width:60px">
      ${stackVals.map((v, i) => `<div class="p0-arr-cell" style="width:44px${i === stackVals.length - 1 ? ';border-color:#22c55e' : ''}">${escapeHtml(v)}</div>`).join('')}
    </div>
    <div style="font-size:10px;color:var(--sublabel);margin-top:4px;text-align:center;width:60px">↑ top</div>`;

    return `
    <div class="p1-primer-label">📘 Pattern Primer — Stack</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>A stack only lets you add or remove from ONE end — the top. Last thing pushed in is the first thing popped out (LIFO — Last In, First Out). No random access, no peeking anywhere except the top.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>Push adds to the top, pop removes from the top, peek looks at the top without removing it. Below, three opening brackets have been pushed — the green one on top is the most recently opened, so it's the first one that must be closed:</p>
      <div style="display:flex;flex-direction:column;align-items:center">${stackVisual}</div>
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>"Matching pairs" (parentheses, brackets, tags) &middot; "undo the most recent thing" &middot; anything where you need to know "what was the most recent unmatched/unprocessed item" &middot; simulating recursion without actual function calls.</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>Plain stack</strong> for matching/validity checks — Valid Parentheses pushes openers, pops and compares on closers. <strong>Monotonic stack</strong> — keep the stack always increasing or always decreasing, popping off anything that violates that order, used for "next greater/smaller element" style problems. <strong>Stack simulating recursion</strong> — iterative DFS, expression evaluation.</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Operation</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
      <tbody>
        <tr><td>Push / pop / peek</td><td class="num">O(1)</td><td class="num">O(n) total</td></tr>
      </tbody>
    </table>`;
  }

  function renderPrimerBinarySearch() {
    const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
    function boundsRow(lo, mid, hi) {
      return `<div class="p0-arr-row" style="align-items:flex-end">${arr.map((v, i) => {
        let label = '', color;
        if (i === lo) { label = 'L'; color = '#a855f7'; }
        if (i === mid) { label = 'mid'; color = '#3b82f6'; }
        if (i === hi) { label = label ? label + '/R' : 'R'; color = '#a855f7'; }
        const inRange = i >= lo && i <= hi;
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
          <div class="p0-arr-cell"${color ? ` style="border-color:${color}"` : (inRange ? '' : ' style="opacity:0.3"')}>${v}</div>
          <div style="font-size:9px;color:var(--sublabel);height:11px">${label}</div>
        </div>`;
      }).join('')}</div>`;
    }

    return `
    <div class="p1-primer-label">📘 Pattern Primer — Binary Search</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>If your search space is sorted — or has some property that flips cleanly from "no" to "yes" at one point — you don't need to check every element. Check the middle; whether the answer is bigger or smaller tells you which HALF to throw away entirely. Repeat, and each step cuts what's left in half.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>Searching for 23 in a sorted array of 10 values. Start with L and R at the ends, check mid:</p>
      ${boundsRow(0, 4, 9)}
      <p style="margin-top:8px">23 &lt; 16? No, so the left half (indices 0-4) can be thrown away entirely — search only continues in the right half from here:</p>
      ${boundsRow(5, 6, 9)}
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>Sorted array (even if rotated) &middot; a problem that explicitly asks for O(log n) &middot; "find the point where a condition switches from true to false" &middot; "minimize/maximize some value such that a condition still holds" — even when there's no obvious array to search.</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>Classic search</strong> for one exact value. <strong>Rotated sorted array</strong> — figure out which half (left or right of mid) is still properly ordered, then decide which half the target could be in. <strong>Binary search on the answer</strong> — instead of searching the array, guess a candidate answer, check if it satisfies the condition, and narrow the range of possible answers — the array itself may not even be sorted, only the condition needs to be monotonic.</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
      <tbody>
        <tr><td>Linear scan</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
        <tr><td>Binary search</td><td class="num">O(log n)</td><td class="num">O(1) iterative</td></tr>
      </tbody>
    </table>`;
  }

  function renderPrimerLinkedList() {
    return `
    <div class="p1-primer-label">📘 Pattern Primer — Linked List</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>Instead of one contiguous block of memory like an array, each node stores its value plus a pointer to the next node. There's no index — to reach node 5, you must walk from the head, one <code>next</code> pointer at a time.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>A chain of nodes, each pointing to the next, ending in null:</p>
      ${renderP1LLChainSimple([1, 2, 3, 4, 5])}
      <p style="margin-top:6px">No shifting is needed to insert or delete once you're already at the right node — you just rewire a couple of pointers. That's the trade-off versus an array: no O(1) random access, but O(1) insert/delete once you're there.</p>
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>The problem explicitly hands you a linked list &middot; you need O(1) insert/delete in the middle without shifting elements &middot; anything about detecting cycles, merging chains, or reordering nodes in place.</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>Fast &amp; slow pointers</strong> — slow moves 1 step, fast moves 2. They meet inside a cycle, or when fast reaches the end, slow is exactly at the middle. <strong>Dummy head node</strong> — a fake node before the real head, so removing/inserting at the very front doesn't need a special case. <strong>Reversing in place</strong> — track <code>prev</code>, <code>curr</code>, and <code>next</code> as three pointers while you walk and flip each link. <strong>Merging multiple lists</strong> — compare current heads directly (two lists) or with a heap (k lists).</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Operation</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
      <tbody>
        <tr><td>Access by index (must walk from head)</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
        <tr><td>Insert / delete at a known node</td><td class="num">O(1)</td><td class="num">O(1)</td></tr>
      </tbody>
    </table>`;
  }

  function renderPrimerTrees() {
    return `
    <div class="p1-primer-label">📘 Pattern Primer — Trees</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>A tree is a node with child pointers (usually two, for a binary tree), forming a hierarchy with one root and no cycles — everything branches downward, and every node has exactly one path back up to the root.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>A binary search tree (BST) — every node's left subtree is smaller, right subtree is bigger, which is what lets you skip half the tree at every step during a search:</p>
      ${renderP1TreeSVG([8, 3, 10, 1, 6, null, 14])}
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>The data is naturally hierarchical (parent/child, nested) &middot; you need fast search + insert + delete on sorted data (BST) &middot; "traverse level by level" &middot; "find a path from root to leaf" &middot; "lowest common ancestor," "subtree," or "depth" show up in the problem statement.</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>DFS</strong> (preorder, inorder, postorder) — recursion naturally mirrors the tree's own shape, and is the default choice for most tree problems. <strong>BFS</strong> with a queue — used whenever you need level-by-level order. <strong>BST property</strong> — comparing against the current node lets you discard an entire subtree instead of visiting every node, the same idea as binary search applied to a tree shape.</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Operation</th><th style="text-align:right">Balanced</th><th style="text-align:right">Worst case</th></tr></thead>
      <tbody>
        <tr><td>Search / insert / delete (BST)</td><td class="num">O(log n)</td><td class="num">O(n)</td></tr>
        <tr><td>Full traversal (visit every node)</td><td class="num">O(n) time, O(log n) space</td><td class="num">O(n) time, O(n) space</td></tr>
      </tbody>
    </table>`;
  }

  function renderPrimerTries() {
    return `
    <div class="p1-primer-label">📘 Pattern Primer — Tries</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>A trie (prefix tree) is a tree where each edge is a single character, and a path from the root spells out a string. Words that share a prefix share the same path for that prefix, only branching where they first differ.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>"cat," "car," and "dog" inserted — "cat" and "car" share the c → a path and only branch at the last letter, while "dog" gets its own separate chain:</p>
      ${renderP1Trie(['cat', 'car', 'dog'])}
      <p style="margin-top:6px">Checking whether "car" was ever inserted just means walking c → a → r and checking the end-of-word flag — no scanning through a list of stored strings.</p>
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>"Does any word start with this prefix?" &middot; autocomplete &middot; storing and searching a large set of strings efficiently by shared prefixes &middot; wildcard string matching.</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>Plain trie</strong> — insert, search, startsWith. <strong>Trie + DFS with wildcard branching</strong> — a wildcard character tries every child at that node instead of following one exact path (Design Add and Search Words). <strong>Trie for autocomplete</strong> — walk to the end of a prefix, then DFS everything below it to collect matching words.</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Operation</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
      <tbody>
        <tr><td>Insert / search a word of length L</td><td class="num">O(L)</td><td class="num">O(total characters stored)</td></tr>
      </tbody>
    </table>`;
  }

  function renderPrimerHeap() {
    return `
    <div class="p1-primer-label">📘 Pattern Primer — Heap / Priority Queue</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>A heap keeps its smallest (min-heap) or largest (max-heap) element instantly reachable at the root, without fully sorting everything else. It's stored as a plain array, but behaves like a tree — every parent is smaller (or larger) than its own children.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>A min-heap — notice every parent is smaller than both its children, but siblings aren't ordered relative to each other. That partial ordering is exactly enough to make the root always correct, without paying for a full sort:</p>
      ${renderP1Heap([2, 5, 4, 8, 7])}
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>"Kth largest/smallest" &middot; "top k" &middot; always needing the current min/max while the rest of the data can stay unordered &middot; merging several already-sorted sources together &middot; scheduling/processing by priority.</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>Fixed-size heap capped at k</strong> — evict the smallest the moment you exceed k, so the root is always "the kth largest so far" (Kth Largest Element in a Stream). <strong>Heap of "next candidates"</strong> across multiple sources — one entry per source's current head, used to merge many sorted lists (Merge K Sorted Lists). <strong>Two heaps</strong> (a max-heap for the smaller half, min-heap for the larger half) for running-median-style problems.</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Operation</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
      <tbody>
        <tr><td>Push / pop</td><td class="num">O(log n)</td><td class="num">O(n)</td></tr>
        <tr><td>Peek at min/max</td><td class="num">O(1)</td><td class="num">—</td></tr>
      </tbody>
    </table>`;
  }

  function renderPrimerGraphs() {
    return `
    <div class="p1-primer-label">📘 Pattern Primer — Graphs</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>A graph is nodes (vertices) connected by edges, with no guarantee of a single root or "no cycles" — far more general than a tree. Edges can be directed (one-way) or undirected, and may or may not have weights.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>A small undirected graph — each line is a connection both directions can travel:</p>
      ${renderP1GraphSVG(5, { edges: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 1], [1, 3]] })}
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>Connections/relationships between items that aren't strictly hierarchical &middot; a grid where each cell connects to its neighbors &middot; "can you get from A to B" &middot; dependencies or prerequisites &middot; "islands," "clone," "connected components."</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>DFS</strong> (recursion or explicit stack) — explore as deep as possible before backtracking, natural for "does a path exist" or "find every connected piece." <strong>BFS</strong> (queue) — shortest path in an unweighted graph, or level-by-level spread (like water or fire spreading across a grid). <strong>3-color cycle detection</strong> (unvisited / currently visiting / fully done) — needed for "is there a valid order" problems like Course Schedule. An <strong>adjacency list</strong> (node → list of neighbors) is almost always the right representation over an adjacency matrix, unless the graph is dense.</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Traversal</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
      <tbody>
        <tr><td>DFS / BFS</td><td class="num">O(V + E)</td><td class="num">O(V)</td></tr>
      </tbody>
    </table>`;
  }

  function renderPrimerAdvancedGraphs() {
    const arrRow = (arr, labelPrefix) => `<div class="p0-arr-row" style="align-items:flex-end">${arr.map((v, i) =>
      `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
        <div class="p0-arr-cell">${v}</div>
        <div style="font-size:9px;color:var(--sublabel)">${labelPrefix}[${i + 1}]</div>
      </div>`
    ).join('')}</div>`;

    return `
    <div class="p1-primer-label">📘 Pattern Primer — Advanced Graphs (Union Find, Dijkstra, MST)</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>This category bundles three separate tools for graph problems that plain DFS/BFS handles badly: <strong>Union Find</strong> (tracking which nodes are already connected as edges get added one at a time), <strong>Dijkstra's algorithm</strong> (shortest paths on a weighted graph), and <strong>Minimum Spanning Tree</strong> (connecting every node as cheaply as possible). The first problem here uses Union Find — Dijkstra and MST get their own problems later, so this primer focuses on Union Find for now.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>Every node starts as its own group, pointing at itself as its "parent" (its root). This is nodes 1-5, each in its own group:</p>
      ${arrRow([1, 2, 3, 4, 5], 'parent')}
      <p style="margin-top:10px">Union(1, 2) merges the two groups by making one root point at the other. Now node 1's parent is 2 — following parent pointers from either 1 or 2 lands on the same root, so they're "connected":</p>
      ${arrRow([2, 2, 3, 4, 5], 'parent')}
      <p style="margin-top:8px;font-size:12.5px;color:var(--sublabel)">To check "are nodes X and Y connected," follow each one's parent pointer until it points at itself — that's the root. Same root means same group.</p>
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>"Are these two nodes already connected" checked over and over as edges arrive one at a time &middot; find the edge that creates a cycle in an undirected graph &middot; count connected components without a full DFS/BFS pass &middot; Kruskal's MST — add edges cheapest-first, skip any edge that would connect two nodes already in the same group.</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>Path compression</strong> — while following parent pointers to find a root, re-point every node visited along the way straight at that root, so the next lookup from any of them is instant. <strong>Union by rank/size</strong> — always attach the smaller group's root under the bigger group's root, so the tree of parent pointers never gets tall. Combined, these two tricks make each operation run in almost constant time. Dijkstra and MST (Prim's/Kruskal's) are separate tools in this same bucket, covered as their own problems later — Union Find by itself only answers "are these connected," nothing about shortest paths or edge weights.</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
      <tbody>
        <tr><td>Union Find, no compression/rank</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
        <tr><td>Union Find + path compression + union by rank</td><td class="num">O(&alpha;(n))<span style="color:var(--sublabel)"> amortized</span></td><td class="num">O(n)</td></tr>
      </tbody>
    </table>
    <p style="margin-top:6px;font-size:12.5px;color:var(--sublabel)">&alpha;(n) is the inverse Ackermann function — it grows so slowly that for any n you'd ever actually use, treat it as a small constant.</p>`;
  }

  function renderPrimerOneDDP() {
    const dp = [1, 1, 2, 3, 5, 8];
    const dpRow = `<div class="p0-arr-row" style="align-items:flex-end">${dp.map((v, i) =>
      `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
        <div class="p0-arr-cell">${v}</div>
        <div style="font-size:9px;color:var(--sublabel)">dp[${i}]</div>
      </div>`
    ).join('')}</div>`;

    return `
    <div class="p1-primer-label">📘 Pattern Primer — 1-D Dynamic Programming</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>When the answer for size n can be built from the answers to smaller sizes (n-1, n-2, ...), you don't need to recompute those smaller answers every time — store each one the first time it's computed, and reuse it. That's the whole trick: trade memory for skipping repeated work.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>Each slot only depends on the one or two slots right before it, so once those are known, the next one is a quick combination of them — no need to recompute from scratch:</p>
      ${dpRow}
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>"Number of ways to do X" &middot; "minimum/maximum cost to reach X" &middot; the problem naturally breaks into "the answer for n depends on the answer(s) for smaller n" &middot; a brute-force recursion that keeps recomputing the exact same smaller subproblems over and over.</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>Top-down (memoization)</strong> — write the brute-force recursion first, then cache results so repeated calls return instantly. <strong>Bottom-up</strong> — build a dp array from the smallest base case upward, no recursion at all. <strong>Rolling / O(1) space</strong> — once you notice dp[i] only ever depends on the last one or two values, drop the full array and just keep those few variables (House Robber only ever needs the previous two totals).</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
      <tbody>
        <tr><td>Naive recursion (recomputes subproblems)</td><td class="num">O(2<sup>n</sup>) typical</td><td class="num">O(n) call stack</td></tr>
        <tr><td>Memoized / bottom-up DP</td><td class="num">O(n)</td><td class="num">O(n), often reducible to O(1)</td></tr>
      </tbody>
    </table>`;
  }

  function renderPrimerTwoDDP() {
    return `
    <div class="p1-primer-label">📘 Pattern Primer — 2-D Dynamic Programming</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>Same idea as 1-D DP — build the answer for a bigger case out of answers you already worked out for smaller cases — except now "smaller" needs <strong>two</strong> numbers to describe it, not one. That usually means a grid position (row, column) or two string lengths (i, j), so the table of stored answers is a 2-D grid instead of a 1-D row.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>Each cell's answer is built from one or more cells you've already filled in — usually the cell above it, the cell to its left, or both. Here's a filled-in table where every cell equals (the cell above it) + (the cell to its left), with the bottom row and right column pre-filled as the base case:</p>
      ${renderP1Grid([['6','3','1'],['3','2','1'],['1','1','1']], { cellColors: [['#3b82f6','#3b82f6','#22c55e'],['#3b82f6','#3b82f6','#22c55e'],['#22c55e','#22c55e','#22c55e']] })}
      <p style="margin-top:8px;font-size:12.5px;color:var(--sublabel)">Green = base case (filled in directly, no dependency). Blue = built from cells already filled.</p>
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>Anything on a grid where you move in limited directions (right/down) &middot; comparing two strings/arrays position by position (longest common subsequence, edit distance) &middot; "number of ways" or "min/max cost" questions where the state naturally needs two indices to describe, not one.</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>Grid DP</strong> — state is (row, col), moves are usually right/down, base case is the last row and/or last column (Unique Paths). <strong>Two-string DP</strong> — state is (i, j), one index per string, base case is one string being empty (Longest Common Subsequence, Edit Distance). Both can go top-down with memoization or bottom-up with a table — bottom-up is usually cleaner here since the fill order (which cells must exist before which) is easy to see once you know the base case.</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
      <tbody>
        <tr><td>Naive recursion (recomputes subproblems)</td><td class="num">O(2<sup>m+n</sup>) typical</td><td class="num">O(m+n) call stack</td></tr>
        <tr><td>Memoized / bottom-up DP table</td><td class="num">O(m&middot;n)</td><td class="num">O(m&middot;n), often reducible to O(min(m,n))</td></tr>
      </tbody>
    </table>`;
  }

  function renderPrimerGreedyIntervals() {
    return `
    <div class="p1-primer-label">📘 Pattern Primer — Greedy / Intervals</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>A greedy algorithm makes the locally-best choice at each step and never reconsiders — no backtracking. It only works when you can show that the locally-best choice never rules out the globally-best answer. Interval problems (start/end ranges) are a common home for greedy, since sorting by start or end usually reveals an obvious "always pick this one" rule.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>Sort by start, then merge whenever the next interval's start is at or before the current one's end:</p>
      ${renderP1Timeline([[1, 3], [2, 6], [8, 10], [15, 18]], { colors: ['#3b82f6', '#3b82f6', '#a855f7', '#f97316'] })}
      <p style="margin-top:8px">Merged — the first two collapse into one, the rest stay separate:</p>
      ${renderP1Timeline([[1, 6], [8, 10], [15, 18]], { colors: ['#3b82f6', '#a855f7', '#f97316'] })}
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>"Combine/merge overlapping ranges" &middot; "schedule the maximum number of non-overlapping events" &middot; "minimum number of resources (rooms, arrows, platforms) needed at once."</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>Sort by start</strong>, merge while adjacent intervals overlap — Merge Intervals, Insert Interval. <strong>Sort by END</strong>, greedily keep whichever interval finishes earliest to leave the most room for what comes next — Non-overlapping Intervals, the classic "activity selection" proof. <strong>Sweep-line</strong> over start/end events sorted together, tracking how many are "currently open" at once — Meeting Rooms II.</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
      <tbody>
        <tr><td>Greedy over sorted intervals</td><td class="num">O(n log n)</td><td class="num">O(n)</td></tr>
      </tbody>
    </table>`;
  }

  function renderPrimerBacktracking() {
    return `
    <div class="p1-primer-label">📘 Pattern Primer — Backtracking</div>

    <div class="p0-card">
      <h4>What it is</h4>
      <p>Backtracking explores a tree of choices with plain recursion: at each step, make a choice, recurse deeper as if it were final, and when that recursive call returns, undo the choice before trying the next one. "Undo" is the whole idea — without it, choices from one branch would leak into the next.</p>
    </div>

    <div class="p0-card">
      <h4>How it works</h4>
      <p>The same three-step cycle — choose, explore, un-choose — shown with nums = [1,2,3]:</p>
      <div class="p0-diagram-label">1. Choose: include 1</div>
      ${renderP1ChosenRow([1, 2, 3], [0])}
      <div class="p0-diagram-label" style="margin-top:10px">2. Explore deeper: also include 2</div>
      ${renderP1ChosenRow([1, 2, 3], [0, 1])}
      <div class="p0-diagram-label" style="margin-top:10px">3. Backtrack: undo 2, back to just [1] — now try the next branch instead</div>
      ${renderP1ChosenRow([1, 2, 3], [0])}
      <p style="margin-top:6px">Every step forward adds exactly one choice; every step back removes exactly the last choice made. That's why the "currently chosen so far" list is always accurate for wherever the recursion currently is — nothing from an abandoned branch is ever left behind.</p>
    </div>

    <div class="p0-card">
      <h4>When to reach for it</h4>
      <p>"Return all possible ___" (subsets, combinations, permutations) &middot; constraint satisfaction where you place things one at a time and some placements become invalid (N-Queens, Sudoku) &middot; searching a grid/graph where you need to remember "the path taken so far" and un-mark it on the way back (Word Search) &middot; anytime the brute force is "try every combination of choices," but you want to stop exploring a branch early once it's clearly wrong (pruning).</p>
    </div>

    <div class="p0-card">
      <h4>Common variations</h4>
      <p><strong>Include/exclude per index</strong> — at each position, branch into "skip it" and "take it" (Subsets). <strong>Start-index loop</strong> — at each level, try every remaining candidate from a moving start point, so the same element is never reused earlier in the path (Combinations, Combination Sum). <strong>Grid DFS with a visited set</strong> — mark a cell visited going in, recurse into neighbors, un-mark it coming back out, so a path can revisit that cell from a different route (Word Search). <strong>Pruning</strong> — check a partial choice against the constraints immediately and stop recursing the moment it can't possibly work, instead of building the whole thing first and checking at the end.</p>
    </div>

    <table class="p0-table">
      <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
      <tbody>
        <tr><td>Explore every branch (b choices, depth d)</td><td class="num">O(b<sup>d</sup>)</td><td class="num">O(d)</td></tr>
      </tbody>
    </table>
    <p style="margin-top:6px;font-size:12.5px;color:var(--sublabel)">b and d depend on the problem — for Subsets, b = 2 (include/exclude) and d = n, giving O(2<sup>n</sup>). The O(d) space is the recursion stack plus whatever "current choice" list you're building — it's small even though the total number of branches explored is huge.</p>`;
  }

  // Small non-spoiler visual: color-codes cells by value so "duplicate" is something Lawrence
  // can see, without hinting at hash sets / sorting / any specific approach.
  function renderP1ArrayRow(arr) {
    const PALETTE = ['#3b82f6', '#a855f7', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#ef4444'];
    const colorFor = {};
    let ci = 0;
    arr.forEach(v => { if (!(v in colorFor)) colorFor[v] = PALETTE[ci++ % PALETTE.length]; });
    return arr.length
      ? arr.map(v => `<div class="p0-arr-cell" style="border-color:${colorFor[v]}">${v}</div>`).join('')
      : `<div style="font-size:12px;color:var(--muted);padding:6px 0">(empty array)</div>`;
  }

  function renderP1Workflow(file) {
    return `
    <div class="p0-callout">
      <strong>Where to code:</strong> open <span class="p1-file-tag">${escapeHtml(file)}</span> in VS Code. Don't open the "Brute force &amp; optimal" reveal below until you've tried it.
      <br><br>
      1. Write the brute force first — comment its time and space complexity above it.<br>
      2. Optimize it — say what the brute force wastes.<br>
      3. Re-derive the complexity for your optimized version.<br>
      4. List edge cases before you run anything.<br>
      5. Click the file in LiveCoding, check the output in DevTools (F12).
    </div>`;
  }

  // Small color-coded callout box for highlighting the one thing that matters most
  // in a section — "idea" (Key Idea), "remember", or "warning" (Watch Out). Use
  // sparingly, inside a primer or problem page, next to (not instead of) a real
  // diagram — a callout is a text emphasis box, not a substitute for a visual.
  function renderP1Callout(kind, title, bodyHtml) {
    const ICONS = { idea: '💡', remember: '🧠', warning: '⚠️' };
    return `<div class="p1-callout p1-callout-${kind}">
      <div class="p1-callout-title">${ICONS[kind] || ''} ${escapeHtml(title)}</div>
      <div class="p1-callout-body">${bodyHtml}</div>
    </div>`;
  }

  function renderP1ContainsDuplicate() {
    return `
    <div class="p0-section-title">Contains Duplicate<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Arrays &amp; Hashing — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a list of numbers. Some numbers might show up more than once. You need to answer one yes/no question: <strong>does any number appear at least twice?</strong></p>
      <p>If yes, return <code>true</code>. If every number is different from every other number, return <code>false</code>.</p>
    </div>

    <div class="p0-card">
      <h4>What "duplicate" looks like</h4>
      <p>Same border color = same value. This one has a duplicate:</p>
      <div class="p0-arr-row">${renderP1ArrayRow([1, 2, 3, 1])}</div>
      <p style="margin-top:16px">This one doesn't — four different colors, four different values:</p>
      <div class="p0-arr-row">${renderP1ArrayRow([1, 2, 3, 4])}</div>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. What's the simplest, slowest way you could check every number against every other number?<br>
      2. What is that slow way's time complexity? Its space complexity?<br>
      3. What is it wasting? Is there a data structure from the Phase 0 cheat sheet that answers "have I seen this before?" fast?<br>
      4. What should happen for an empty array? A one-element array? An array where every value is the same?</p>
    </div>

    ${renderP1Workflow('array-hashMap-containsDuplicate.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force</h4>
        <p>Compare every number against every other number that comes after it. Two nested loops.</p>
        <pre class="p0-code">function hasDuplicate(nums) {
  for (let i = 0; i &lt; nums.length; i++) {
    for (let j = i + 1; j &lt; nums.length; j++) {
      if (nums[i] === nums[j]) return true;
    }
  }
  return false;
}</pre>
        <p>Time: <strong>O(n²)</strong> — nested loops over the same array (Phase 0, Section 2). Space: <strong>O(1)</strong> — no extra structure, just a couple of counters.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — a hash set, one pass</h4>
        <p>A hash set answers "have I seen this value before?" in O(1) average time (Phase 0, Section 4). Walk the array once. Before adding a number, check if it's already in the set.</p>
        <pre class="p0-code">function hasDuplicate(nums) {
  const seen = new Set();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}</pre>
        <p>Time: <strong>O(n)</strong> — one pass, O(1) work per element. Space: <strong>O(n)</strong> — worst case, the set ends up holding every element (no duplicates found until the last check).</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — nums = [1, 2, 3, 1]</div>
        <div id="p1-cd-array" class="p0-arr-row"></div>
        <div class="p0-diagram-label" style="margin-top:12px">Seen so far</div>
        <div id="p1-cd-seen" class="p0-bucket" style="min-height:34px"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-cd-step-btn">▶ Step</button>
        <div class="p0-sim-log" id="p1-cd-log"></div>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty array:</strong> loop never runs → returns false.<br>
        <strong>Single element:</strong> nothing to compare against → returns false.<br>
        <strong>All identical values:</strong> the second element is already a duplicate → returns true almost immediately.<br>
        <strong>All unique, large array:</strong> the set grows to size n and you get the full O(n) space cost.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force</td><td class="num">O(n²)</td><td class="num">O(1)</td></tr>
          <tr><td>Hash set</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ContainsDuplicateStepper() {
    const btn = document.getElementById('p1-cd-step-btn');
    if (!btn) return;
    const arrHost  = document.getElementById('p1-cd-array');
    const seenHost = document.getElementById('p1-cd-seen');
    const logEl    = document.getElementById('p1-cd-log');
    const ARR = [1, 2, 3, 1];
    let i = 0;
    let seen = new Set();

    function render(activeIdx, dupIdx) {
      arrHost.innerHTML = ARR.map((v, idx) => {
        let cls = 'p0-arr-cell';
        if (idx === activeIdx) cls += ' active';
        if (idx === dupIdx) cls += ' shift';
        return `<div class="${cls}">${v}</div>`;
      }).join('');
      seenHost.innerHTML = seen.size
        ? [...seen].map(v => `<div class="p0-key-chip">${v}</div>`).join('')
        : `<span style="font-size:11px;color:var(--muted)">empty</span>`;
    }

    function reset() {
      i = 0;
      seen = new Set();
      render(-1, -1);
      logEl.textContent = '';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (i >= ARR.length) return;
      const v = ARR[i];
      if (seen.has(v)) {
        render(i, i);
        logEl.textContent = `Index ${i}: ${v} is already in "seen" → duplicate found, return true.`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
        return;
      }
      seen.add(v);
      render(i, -1);
      logEl.textContent = `Index ${i}: ${v} not seen before → add it to the set.`;
      i++;
      if (i >= ARR.length) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1TwoSum() {
    return `
    <div class="p0-section-title">Two Sum<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Arrays &amp; Hashing — problem 2</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a list of numbers and one target number. Find two <strong>different positions</strong> in the list whose values add up to the target. Return those two positions (indices), not the values.</p>
      <p>There's always exactly one valid pair, and you can't use the same position twice.</p>
    </div>

    <div class="p0-card">
      <h4>What a valid pair looks like</h4>
      <p>nums = [2, 7, 11, 15], target = 9:</p>
      <div class="p0-arr-row">${[2, 7, 11, 15].map((v, i) => `<div class="p0-arr-cell${i < 2 ? ' active' : ''}">${v}</div>`).join('')}</div>
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">nums[0] + nums[1] = 2 + 7 = 9 = target → answer [0, 1].</p>
      <p style="margin-top:16px">nums = [3, 2, 4], target = 6:</p>
      <div class="p0-arr-row">${[3, 2, 4].map((v, i) => `<div class="p0-arr-cell${i > 0 ? ' active' : ''}">${v}</div>`).join('')}</div>
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">nums[1] + nums[2] = 2 + 4 = 6 = target → answer [1, 2]. Note it's not always the first two elements.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. Simplest, slowest way: check every pair of positions. What's its time and space complexity?<br>
      2. For each number, you need to know: "have I already seen the <em>other half</em> of the pair?" What data structure answers that in O(1), and what would you store in it — just the number, or something more?<br>
      3. Why check for the complement <em>before</em> you store the current number, not after?<br>
      4. nums = [3, 3], target = 6 — the same value twice, at two different positions. Does your approach still work, or does it accidentally reuse one position for both numbers?</p>
    </div>

    ${renderP1Workflow('array-hashMap-twoSum.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force</h4>
        <p>Check every pair of positions until one adds up to the target.</p>
        <pre class="p0-code">function twoSum(nums, target) {
  for (let i = 0; i &lt; nums.length; i++) {
    for (let j = i + 1; j &lt; nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return [];
}</pre>
        <p>Time: <strong>O(n²)</strong> — nested loops over the array. Space: <strong>O(1)</strong> — no extra structure.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — a hash map, one pass</h4>
        <p>Instead of asking "does some other number equal target − nums[i]?" by scanning, store <code>{number → index}</code> as you go. Before storing the current number, check whether its <strong>complement</strong> (target − current) is already in the map — if it is, you've found your pair instantly.</p>
        <pre class="p0-code">function twoSum(nums, target) {
  const numToIndex = new Map();
  for (let i = 0; i &lt; nums.length; i++) {
    const complement = target - nums[i];
    if (numToIndex.has(complement)) {
      return [numToIndex.get(complement), i];
    }
    numToIndex.set(nums[i], i);
  }
  return [];
}</pre>
        <p>Time: <strong>O(n)</strong> — one pass, O(1) map lookup per element. Space: <strong>O(n)</strong> — worst case the map holds almost every element before the match is found.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — nums = [2, 7, 11, 15], target = 9</div>
        <div id="p1-ts-array" class="p0-arr-row"></div>
        <div class="p0-diagram-label" style="margin-top:12px">Map so far (number → index)</div>
        <div id="p1-ts-map" class="p0-bucket" style="min-height:34px"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-ts-step-btn">▶ Step</button>
        <div class="p0-sim-log" id="p1-ts-log"></div>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Duplicate values, e.g. [3, 3], target 6:</strong> checking the complement <em>before</em> storing the current number means index 0's "3" isn't in the map yet when index 0 runs — it only gets checked against on index 1, so the two different positions never collide with themselves.<br>
        <strong>Checking-before-storing order matters:</strong> if you stored first and checked second, nums=[3] with target 6 would find its own index as a false "pair."<br>
        <strong>No valid pair:</strong> the problem guarantees one exists, so this isn't tested — but a real-world version should decide what to return (empty array, null, throw) if the loop finishes with nothing found.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force</td><td class="num">O(n²)</td><td class="num">O(1)</td></tr>
          <tr><td>Hash map</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1TwoSumStepper() {
    const btn = document.getElementById('p1-ts-step-btn');
    if (!btn) return;
    const arrHost = document.getElementById('p1-ts-array');
    const mapHost = document.getElementById('p1-ts-map');
    const logEl   = document.getElementById('p1-ts-log');
    const ARR = [2, 7, 11, 15];
    const TARGET = 9;
    let i = 0;
    let map = new Map();

    function render(activeIdx, foundIdx) {
      arrHost.innerHTML = ARR.map((v, idx) => {
        let cls = 'p0-arr-cell';
        if (idx === activeIdx) cls += ' active';
        if (foundIdx !== undefined && idx === foundIdx) cls += ' shift';
        return `<div class="${cls}">${v}</div>`;
      }).join('');
      mapHost.innerHTML = map.size
        ? [...map.entries()].map(([k, v]) => `<div class="p0-key-chip">${k}→${v}</div>`).join('')
        : `<span style="font-size:11px;color:var(--muted)">empty</span>`;
    }

    function reset() {
      i = 0;
      map = new Map();
      render(-1);
      logEl.textContent = '';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (i >= ARR.length) return;
      const num = ARR[i];
      const complement = TARGET - num;
      if (map.has(complement)) {
        const j = map.get(complement);
        render(i, j);
        logEl.textContent = `Index ${i}: need ${complement} (${TARGET} − ${num}). Map already has ${complement}→${j} → return [${j}, ${i}].`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
        return;
      }
      render(i);
      logEl.textContent = `Index ${i}: need ${complement} (${TARGET} − ${num}). Not in map yet → store ${num}→${i}.`;
      map.set(num, i);
      i++;
      if (i >= ARR.length) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // Shared by Valid Anagram's concept viz — assigns one color per character across BOTH
  // words so matching letters are visually obvious, mismatches are not.
  function renderP1AnagramPair(a, b) {
    const PALETTE = ['#3b82f6', '#a855f7', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#ef4444'];
    const colorFor = {};
    let ci = 0;
    for (const ch of a + b) { if (!(ch in colorFor)) colorFor[ch] = PALETTE[ci++ % PALETTE.length]; }
    const rowFor = str => str.length
      ? str.split('').map(ch => `<div class="p0-arr-cell" style="border-color:${colorFor[ch]}">${ch}</div>`).join('')
      : `<div style="font-size:12px;color:var(--muted);padding:6px 0">(empty string)</div>`;
    return `<div class="p0-arr-row">${rowFor(a)}</div><div class="p0-arr-row" style="margin-top:6px">${rowFor(b)}</div>`;
  }

  function renderP1ValidAnagram() {
    return `
    <div class="p0-section-title">Valid Anagram<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Arrays &amp; Hashing — problem 3</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get two words, <code>s</code> and <code>t</code>. Return <code>true</code> if <code>t</code> is just <code>s</code> with its letters rearranged — same letters, same counts, different order. Otherwise return <code>false</code>.</p>
    </div>

    <div class="p0-card">
      <h4>What "anagram" looks like</h4>
      <p>Same border color = same letter. s = "anagram", t = "nagaram" — every letter in one has a matching letter in the other:</p>
      ${renderP1AnagramPair('anagram', 'nagaram')}
      <p style="margin-top:16px">s = "rat", t = "car" — same length, but the letters don't match up (no "t" in "car", no "c" in "rat"):</p>
      ${renderP1AnagramPair('rat', 'car')}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. Slowest way you could check this: what if you sorted both words and compared them? What's the time and space complexity of that?<br>
      2. What's one O(1) check you can do <em>before</em> any real work, using only <code>.length</code>?<br>
      3. What data structure tracks "how many of each letter have I seen"? Why does having only 26 lowercase letters possible make that structure's size <strong>not</strong> depend on <code>n</code>?<br>
      4. What should happen if <code>t</code> has a letter that never appears in <code>s</code> at all?</p>
    </div>

    ${renderP1Workflow('array-hashMap-validAnagram.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force</h4>
        <p>Sort both words into a canonical order — anagrams sort to the exact same string.</p>
        <pre class="p0-code">function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const sortedS = s.split('').sort().join('');
  const sortedT = t.split('').sort().join('');
  return sortedS === sortedT;
}</pre>
        <p>Time: <strong>O(n log n)</strong> — dominated by the sort. Space: <strong>O(n)</strong> — two new sorted copies of the strings.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — a frequency counter, one pass each</h4>
        <p>Count every letter of <code>s</code> up, then count every letter of <code>t</code> down. If a count ever goes negative, or <code>t</code> has a letter <code>s</code> never had, they can't be anagrams. If everything cancels to zero, they are.</p>
        <pre class="p0-code">function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = {};
  for (const ch of s) count[ch] = (count[ch] || 0) + 1;
  for (const ch of t) {
    if (!count[ch]) return false;
    count[ch]--;
  }
  return true;
}</pre>
        <p>Time: <strong>O(n)</strong> — one pass over each string. Space: <strong>O(1)</strong> — bounded by the 26-lowercase-letter alphabet, not by <code>n</code> (this only holds because the character set is fixed and small — with arbitrary Unicode it would be O(k) for k distinct characters).</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — s = "ab", t = "ba"</div>
        <div id="p1-va-words" class="p0-arr-row"></div>
        <div class="p0-diagram-label" style="margin-top:12px">Letter counts</div>
        <div id="p1-va-counts" class="p0-bucket" style="min-height:34px"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-va-step-btn">▶ Step</button>
        <div class="p0-sim-log" id="p1-va-log"></div>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Different lengths:</strong> caught instantly by the length check — never even builds the count map.<br>
        <strong>Empty strings:</strong> lengths match (both 0), both loops run zero times → returns true.<br>
        <strong>Letter in t not in s:</strong> <code>count[ch]</code> is <code>undefined</code> (falsy) → the <code>!count[ch]</code> check catches it immediately.<br>
        <strong>Repeated letters (e.g. "aacc" vs "ccaa"):</strong> counts go up to 2 for each letter during the first pass, then back down to 0 during the second — order never mattered, only totals.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Sort &amp; compare</td><td class="num">O(n log n)</td><td class="num">O(n)</td></tr>
          <tr><td>Frequency counter</td><td class="num">O(n)</td><td class="num">O(1)*</td></tr>
        </tbody>
      </table>
      <p style="margin-top:10px;font-size:11.5px;color:var(--muted)">*Assumes a fixed, small alphabet (e.g. lowercase a–z). Arbitrary Unicode input would be O(k) for k distinct characters.</p>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ValidAnagramStepper() {
    const btn = document.getElementById('p1-va-step-btn');
    if (!btn) return;
    const wordsHost  = document.getElementById('p1-va-words');
    const countsHost = document.getElementById('p1-va-counts');
    const logEl      = document.getElementById('p1-va-log');
    const S = 'ab', T = 'ba';
    const OPS = [
      ...S.split('').map(ch => ({ mode: 'add', ch })),
      ...T.split('').map(ch => ({ mode: 'sub', ch })),
    ];
    let step = 0;
    let counts = {};
    let failed = false;

    function renderWords(activeMode, activeIdx) {
      const sRow = S.split('').map((ch, i) =>
        `<div class="p0-arr-cell${activeMode === 'add' && i === activeIdx ? ' active' : ''}">${ch}</div>`).join('');
      const tRow = T.split('').map((ch, i) =>
        `<div class="p0-arr-cell${activeMode === 'sub' && i === activeIdx ? ' active' : ''}${failed && activeMode === 'sub' && i === activeIdx ? ' shift' : ''}">${ch}</div>`).join('');
      wordsHost.innerHTML = `<div class="p0-arr-row">${sRow}</div><div class="p0-arr-row" style="margin-top:6px">${tRow}</div>`;
    }

    function renderCounts() {
      const entries = Object.entries(counts).filter(([, v]) => v !== 0 || true);
      countsHost.innerHTML = entries.length
        ? entries.map(([ch, v]) => `<div class="p0-key-chip${v < 0 ? ' collide' : ''}">${ch}:${v}</div>`).join('')
        : `<span style="font-size:11px;color:var(--muted)">empty</span>`;
    }

    function reset() {
      step = 0;
      counts = {};
      failed = false;
      renderWords(null, -1);
      renderCounts();
      logEl.textContent = '';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = advance;
    }

    function advance() {
      if (step >= OPS.length || failed) return;
      const { mode, ch } = OPS[step];
      const idxInWord = mode === 'add' ? step : step - S.length;

      if (mode === 'add') {
        counts[ch] = (counts[ch] || 0) + 1;
        renderWords('add', idxInWord);
        renderCounts();
        logEl.textContent = `Counting s: '${ch}' → count['${ch}'] = ${counts[ch]}.`;
      } else {
        if (!counts[ch]) {
          failed = true;
          renderWords('sub', idxInWord);
          renderCounts();
          logEl.textContent = `Subtracting t: '${ch}' has count 0 (or never seen) → not an anagram, return false.`;
          btn.textContent = '↺ Reset';
          btn.onclick = reset;
          return;
        }
        counts[ch]--;
        renderWords('sub', idxInWord);
        renderCounts();
        logEl.textContent = `Subtracting t: '${ch}' → count['${ch}'] = ${counts[ch]}.`;
      }

      step++;
      if (step >= OPS.length) {
        logEl.textContent += ' All counts reached 0 with no misses → anagram, return true.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // Shared by Group Anagrams' concept viz — colors every word by which anagram family it
  // belongs to (computed purely for display, not tied to any specific coded approach).
  function renderP1AnagramGroupsViz(strs) {
    const PALETTE = ['#3b82f6', '#a855f7', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#ef4444'];
    const keyFor = s => s.split('').sort().join('');
    const colorFor = {};
    let ci = 0;
    strs.forEach(s => { const k = keyFor(s); if (!(k in colorFor)) colorFor[k] = PALETTE[ci++ % PALETTE.length]; });
    return `<div class="p0-arr-row">${strs.map(s => `<div class="p0-arr-cell" style="border-color:${colorFor[keyFor(s)]}">${s}</div>`).join('')}</div>`;
  }

  function renderP1GroupAnagrams() {
    return `
    <div class="p0-section-title">Group Anagrams<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Arrays &amp; Hashing — problem 4</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a list of words. Put every word that's an anagram of another word into the same group. A word with no anagram partner in the list just forms a group of one. Return the groups — order doesn't matter, inside or out.</p>
    </div>

    <div class="p0-card">
      <h4>What "grouped" looks like</h4>
      <p>Same border color = same group. strs = ["eat","tea","tan","ate","nat","bat"] has three groups: {eat, tea, ate}, {tan, nat}, {bat}:</p>
      ${renderP1AnagramGroupsViz(['eat', 'tea', 'tan', 'ate', 'nat', 'bat'])}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. Valid Anagram told you if <em>two</em> words are anagrams. How could you turn that same idea into a "label" you could compare across <em>many</em> words at once, not just two?<br>
      2. If two words are anagrams, what's true about their letters once you sort each word's letters into order?<br>
      3. Once every word has a label, what data structure lets you collect every word sharing a label into the same group, in one pass?<br>
      4. Sorting each word costs something — is there a labeling trick that skips sorting entirely, using the same "26-letter fixed alphabet" idea from Valid Anagram?</p>
    </div>

    ${renderP1Workflow('array-hashMap-groupAnagrams.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — sort each word, group by sorted string</h4>
        <p>Anagrams sort to the exact same string. Sort every word's letters, use that sorted string as a hash map key, and push the original word into that key's group.</p>
        <pre class="p0-code">function groupAnagrams(strs) {
  const groups = {};
  for (const s of strs) {
    const key = s.split('').sort().join('');
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return Object.values(groups);
}</pre>
        <p>Time: <strong>O(n · k log k)</strong> — n words, each sorted in O(k log k) for word length k. Space: <strong>O(n · k)</strong> — the map ends up holding every word.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — frequency-count key, no sorting</h4>
        <p>Same idea as Valid Anagram's frequency counter: build a 26-length count array per word instead of sorting it. Anagrams produce the identical count array, so joining it into a string gives a unique, sort-free key.</p>
        <pre class="p0-code">function groupAnagrams(strs) {
  const groups = {};
  for (const s of strs) {
    const count = new Array(26).fill(0);
    for (const ch of s) count[ch.charCodeAt(0) - 97]++;
    const key = count.join(',');
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return Object.values(groups);
}</pre>
        <p>Time: <strong>O(n · k)</strong> — one pass counting each word's 26 letters, no sort. Space: <strong>O(n · k)</strong> — same map, plus a fixed 26-length array per word.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — strs = ["eat", "tea", "bat"]</div>
        <div id="p1-ga-word" class="p0-arr-row"></div>
        <div class="p0-diagram-label" style="margin-top:12px">Groups so far (key → words)</div>
        <div id="p1-ga-groups" class="p0-bucket" style="min-height:34px"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-ga-step-btn">▶ Step</button>
        <div class="p0-sim-log" id="p1-ga-log"></div>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty array:</strong> loop never runs → returns [].<br>
        <strong>Single empty string [""]:</strong> count array is all zeros, one group containing [""].<br>
        <strong>No anagram partners at all:</strong> every word gets its own group of one — still correct, just n groups of size 1.<br>
        <strong>All words in one anagram family:</strong> one group holding every word.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Sort &amp; group</td><td class="num">O(n·k log k)</td><td class="num">O(n·k)</td></tr>
          <tr><td>Frequency-count key</td><td class="num">O(n·k)</td><td class="num">O(n·k)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1GroupAnagramsStepper() {
    const btn = document.getElementById('p1-ga-step-btn');
    if (!btn) return;
    const wordHost = document.getElementById('p1-ga-word');
    const groupsHost = document.getElementById('p1-ga-groups');
    const logEl = document.getElementById('p1-ga-log');
    const STRS = ['eat', 'tea', 'bat'];
    const keyFor = s => {
      const count = new Array(26).fill(0);
      for (const ch of s) count[ch.charCodeAt(0) - 97]++;
      return count.join(',');
    };
    let i = 0;
    let groups = {};

    function render(activeIdx) {
      wordHost.innerHTML = STRS.map((s, idx) =>
        `<div class="p0-arr-cell${idx === activeIdx ? ' active' : ''}">${s}</div>`).join('');
      const keys = Object.keys(groups);
      groupsHost.innerHTML = keys.length
        ? keys.map(k => `<div class="p0-key-chip">[${groups[k].join(', ')}]</div>`).join('')
        : `<span style="font-size:11px;color:var(--muted)">empty</span>`;
    }

    function reset() {
      i = 0;
      groups = {};
      render(-1);
      logEl.textContent = '';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (i >= STRS.length) return;
      const s = STRS[i];
      const key = keyFor(s);
      const isNew = !groups[key];
      if (isNew) groups[key] = [];
      groups[key].push(s);
      render(i);
      logEl.textContent = isNew
        ? `"${s}": new frequency key → start a new group.`
        : `"${s}": same frequency key as an existing group → add it there.`;
      i++;
      if (i >= STRS.length) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // Shared by Top K Frequent's concept viz — bar height = frequency, top-k bars highlighted green.
  function renderP1FrequencyBars(nums, topK) {
    const counts = {};
    nums.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map(e => e[1]));
    const topSet = new Set(entries.slice(0, topK).map(e => e[0]));
    return `<div class="p0-arr-row" style="align-items:flex-end;gap:10px">${entries.map(([n, c]) => {
      const h = Math.round((c / max) * 60) + 20;
      const highlight = topSet.has(n);
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="width:28px;height:${h}px;background:${highlight ? '#22c55e' : '#3b82f6'};border-radius:4px 4px 0 0"></div>
        <div style="font-size:11px;color:var(--sublabel)">${n}</div>
        <div style="font-size:10px;color:var(--muted)">×${c}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderP1TopKFrequent() {
    return `
    <div class="p0-section-title">Top K Frequent Elements<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Arrays &amp; Hashing — problem 5</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a list of numbers and a number <code>k</code>. Return the <code>k</code> numbers that show up most often in the list. Order of the answer doesn't matter.</p>
    </div>

    <div class="p0-card">
      <h4>What "most frequent" looks like</h4>
      <p>nums = [1,1,1,2,2,3], k = 2 — bar height is how many times each number appears. The tallest k bars (green) are the answer:</p>
      ${renderP1FrequencyBars([1, 1, 1, 2, 2, 3], 2)}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. Simplest way: count every number's frequency, then what do you do with those counts to find the top k? What's the time complexity of that step?<br>
      2. Sorting the counts works, but is it the fastest possible? A count can only ever be a whole number between 1 and <code>n</code> (the array length) — is there a way to use that fact to skip sorting entirely?<br>
      3. If you had one "bucket" per possible frequency value, what would you put in bucket number 5?<br>
      4. Once the buckets are filled, which direction do you walk through them to get the <em>most</em> frequent numbers first?</p>
    </div>

    ${renderP1Workflow('array-hashMap-topKFrequent.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — count, then sort by frequency</h4>
        <p>Count every number's frequency with a hash map, turn that into a list of [number, count] pairs, sort the pairs by count descending, take the first k.</p>
        <pre class="p0-code">function topKFrequent(nums, k) {
  const count = {};
  for (const n of nums) count[n] = (count[n] || 0) + 1;
  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, k).map(([n]) => Number(n));
}</pre>
        <p>Time: <strong>O(n log n)</strong> — counting is O(n), but sorting the unique values dominates. Space: <strong>O(n)</strong> — the count map.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — bucket sort by frequency, no sorting at all</h4>
        <p>A frequency can never exceed <code>n</code> (the array length). So instead of sorting, make an array of <code>n + 1</code> "buckets," where bucket index = frequency. Drop each number into the bucket matching its count. Then walk the buckets from the highest index down to 1, collecting numbers until you have k.</p>
        <pre class="p0-code">function topKFrequent(nums, k) {
  const count = {};
  for (const n of nums) count[n] = (count[n] || 0) + 1;

  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const n in count) buckets[count[n]].push(Number(n));

  const res = [];
  for (let f = buckets.length - 1; f > 0 && res.length < k; f--) {
    for (const n of buckets[f]) {
      res.push(n);
      if (res.length === k) break;
    }
  }
  return res;
}</pre>
        <p>Time: <strong>O(n)</strong> — counting is O(n), building buckets is O(n), walking buckets visits at most n items total. Space: <strong>O(n)</strong> — the count map and the buckets array together.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — nums = [1,1,1,2,2,3], k = 2</div>
        <div id="p1-tk-buckets" class="p0-arr-row" style="flex-wrap:wrap"></div>
        <div class="p0-diagram-label" style="margin-top:12px">Result so far</div>
        <div id="p1-tk-result" class="p0-bucket" style="min-height:34px"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-tk-step-btn">▶ Step</button>
        <div class="p0-sim-log" id="p1-tk-log"></div>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>k equals the number of unique elements:</strong> you end up collecting every unique number, just ordered by frequency.<br>
        <strong>All elements identical:</strong> one bucket holds everything, at the highest index — the first bucket you visit.<br>
        <strong>Negative numbers:</strong> the count map's keys work fine with negatives; just make sure you convert the key back with <code>Number()</code>, not leave it as a string.<br>
        <strong>Ties in frequency:</strong> the problem says any valid k-set is acceptable, so which tied number comes out first doesn't matter.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Count &amp; sort</td><td class="num">O(n log n)</td><td class="num">O(n)</td></tr>
          <tr><td>Bucket sort</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1TopKFrequentStepper() {
    const btn = document.getElementById('p1-tk-step-btn');
    if (!btn) return;
    const bucketsHost = document.getElementById('p1-tk-buckets');
    const resultHost = document.getElementById('p1-tk-result');
    const logEl = document.getElementById('p1-tk-log');
    const NUMS = [1, 1, 1, 2, 2, 3];
    const K = 2;

    const count = {};
    for (const n of NUMS) count[n] = (count[n] || 0) + 1;
    const buckets = Array.from({ length: NUMS.length + 1 }, () => []);
    for (const n in count) buckets[count[n]].push(Number(n));

    let f, result;

    function renderBuckets(activeF) {
      bucketsHost.innerHTML = buckets.map((b, idx) => {
        if (idx === 0) return '';
        const empty = b.length === 0;
        const style = idx === activeF ? 'background:#22c55e' : (empty ? 'opacity:0.35' : '');
        return `<div class="p0-key-chip" style="${style}">freq ${idx}: [${b.join(', ') || '—'}]</div>`;
      }).join('');
    }

    function renderResult() {
      resultHost.innerHTML = result.length
        ? result.map(n => `<div class="p0-key-chip">${n}</div>`).join('')
        : `<span style="font-size:11px;color:var(--muted)">empty</span>`;
    }

    function reset() {
      f = buckets.length - 1;
      result = [];
      renderBuckets(-1);
      renderResult();
      logEl.textContent = '';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function finish() {
      logEl.textContent += ` Have ${K} elements → return [${result.join(', ')}].`;
      btn.textContent = '↺ Reset';
      btn.onclick = reset;
    }

    function step() {
      if (result.length >= K) return;
      while (f > 0 && buckets[f].length === 0) f--;
      if (f <= 0) { finish(); return; }
      for (const n of buckets[f]) {
        if (result.length >= K) break;
        result.push(n);
      }
      renderBuckets(f);
      renderResult();
      logEl.textContent = `Bucket ${f} (frequency ${f}): [${buckets[f].join(', ')}] → add to result.`;
      f--;
      if (result.length >= K) finish();
    }

    reset();
  }

  function renderP1ExceptSelfViz(nums, excludeIdx) {
    const rest = nums.filter((_, i) => i !== excludeIdx);
    const product = rest.reduce((a, b) => a * b, 1);
    return `<div class="p0-arr-row">${nums.map((n, i) => {
      const excluded = i === excludeIdx;
      return `<div class="p0-arr-cell${excluded ? '' : ' active'}" style="${excluded ? 'opacity:0.35;text-decoration:line-through' : ''}">${n}</div>`;
    }).join('')}</div>
    <p style="margin-top:8px;font-size:12px;color:var(--sublabel)">Skip index ${excludeIdx} (value ${nums[excludeIdx]}) → multiply the rest: ${rest.join(' × ')} = <strong>${product}</strong></p>`;
  }

  function renderP1ProductExceptSelf() {
    return `
    <div class="p0-section-title">Product of Array Except Self<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Arrays &amp; Hashing — problem 6</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a list of numbers. For every position, return the product of all the <em>other</em> numbers (not the one at that position). You can't use division, and it has to run in O(n) time.</p>
    </div>

    <div class="p0-card">
      <h4>What "except self" means</h4>
      <p>nums = [1,2,3,4] — to get the answer at index 2, cross out that position and multiply everything else:</p>
      ${renderP1ExceptSelfViz([1, 2, 3, 4], 2)}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. The obvious way: for every index, loop through the whole array again and multiply everything except that spot. What's the time complexity of that?<br>
      2. Without division, how could you describe the answer at index <code>i</code> as two separate pieces — one built from the numbers <em>to the left</em> of <code>i</code>, and one built from the numbers <em>to the right</em>?<br>
      3. If you built a "product of everything to the left" array in one left-to-right pass, and a "product of everything to the right" array in one right-to-left pass, how would you combine them at each index?<br>
      4. Can you avoid allocating two extra arrays and instead reuse the output array for one of the two passes?</p>
    </div>

    ${renderP1Workflow('array-hashMap-productExceptSelf.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — nested loop, recompute every product from scratch</h4>
        <p>For every index i, loop through the whole array again and multiply every value except nums[i].</p>
        <pre class="p0-code">function productExceptSelf(nums) {
  const res = [];
  for (let i = 0; i < nums.length; i++) {
    let product = 1;
    for (let j = 0; j < nums.length; j++) {
      if (j !== i) product *= nums[j];
    }
    res.push(product);
  }
  return res;
}</pre>
        <p>Time: <strong>O(n&sup2;)</strong> — an inner loop over the whole array for every index. Space: <strong>O(n)</strong> — the output array.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — prefix product, then suffix product, in two linear passes</h4>
        <p>The answer at index i is (product of everything left of i) × (product of everything right of i). Build the left products into the output array on a left-to-right pass. Then walk right-to-left with a running "suffix product" variable, multiplying it into each slot as you go — no second array needed.</p>
        <pre class="p0-code">function productExceptSelf(nums) {
  const n = nums.length;
  const res = new Array(n).fill(1);

  for (let i = 1; i < n; i++) {
    res[i] = res[i - 1] * nums[i - 1];
  }

  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    res[i] *= suffix;
    suffix *= nums[i];
  }
  return res;
}</pre>
        <p>Time: <strong>O(n)</strong> — two linear passes. Space: <strong>O(1)</strong> extra — only the output array, which the problem allows since you have to return it anyway.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — nums = [1,2,3,4]</div>
        <div id="p1-pes-res" class="p0-arr-row"></div>
        <div class="p0-sim-log" id="p1-pes-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-pes-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>One zero in the array:</strong> every index except the zero's own position gets 0 (because the zero is part of their product); the zero's own position gets the product of everything else.<br>
        <strong>Two or more zeros:</strong> every position's answer becomes 0, since every product now includes at least one of the zeros.<br>
        <strong>Negative numbers:</strong> just carry the sign through the multiplication normally — no special-casing needed.<br>
        <strong>Array of length 1:</strong> there's nothing to multiply, so the answer is <code>[1]</code> — an empty product.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Nested loop</td><td class="num">O(n&sup2;)</td><td class="num">O(n)</td></tr>
          <tr><td>Prefix + suffix pass</td><td class="num">O(n)</td><td class="num">O(1) extra</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ProductExceptSelfStepper() {
    const btn = document.getElementById('p1-pes-step-btn');
    if (!btn) return;
    const resHost = document.getElementById('p1-pes-res');
    const logEl = document.getElementById('p1-pes-log');
    const NUMS = [1, 2, 3, 4];

    const steps = [];
    {
      const n = NUMS.length;
      const res = new Array(n).fill(1);
      for (let i = 1; i < n; i++) {
        res[i] = res[i - 1] * NUMS[i - 1];
        steps.push({ res: res.slice(), note: `Left pass: res[${i}] = res[${i - 1}] × nums[${i - 1}] = ${res[i]}` });
      }
      let suffix = 1;
      for (let i = n - 1; i >= 0; i--) {
        res[i] *= suffix;
        steps.push({ res: res.slice(), note: `Right pass: res[${i}] ×= suffix(${suffix}) → ${res[i]}` });
        suffix *= NUMS[i];
      }
    }

    let idx;

    function renderResAt(res, activeIdx) {
      resHost.innerHTML = res.map((v, i) => {
        const active = i === activeIdx;
        return `<div class="p0-arr-cell${active ? ' active' : ''}">${v}</div>`;
      }).join('');
    }

    function reset() {
      idx = 0;
      renderResAt(new Array(NUMS.length).fill(1), -1);
      logEl.textContent = 'Start: res = [1, 1, 1, 1]';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      const match = s.note.match(/res\[(\d+)\]/);
      renderResAt(s.res, match ? Number(match[1]) : -1);
      logEl.textContent = s.note;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ` → done: [${s.res.join(', ')}]`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1ConsecutiveViz(nums) {
    const uniqueSorted = [...new Set(nums)].sort((a, b) => a - b);
    const runs = [];
    let current = [];
    for (const n of uniqueSorted) {
      if (current.length && n !== current[current.length - 1] + 1) {
        runs.push(current);
        current = [];
      }
      current.push(n);
    }
    if (current.length) runs.push(current);

    const longest = runs.reduce((a, b) => (b.length > a.length ? b : a), []);
    const PALETTE = ['#3b82f6', '#a855f7', '#f97316', '#eab308', '#06b6d4', '#ef4444'];
    const runOf = new Map();
    runs.forEach((run, i) => run.forEach(n => runOf.set(n, i)));
    const longestSet = new Set(longest);

    const cellsHtml = nums.map(n => {
      const color = PALETTE[runOf.get(n) % PALETTE.length];
      return `<div class="p0-arr-cell${longestSet.has(n) ? ' active' : ''}" style="border-color:${color}">${n}</div>`;
    }).join('');

    return `<div class="p0-arr-row">${cellsHtml}</div>
    <p style="margin-top:8px;font-size:12px;color:var(--sublabel)">Same border color = same run of back-to-back numbers. The highlighted run is <strong>${longest.join(' → ')}</strong> — length ${longest.length}.</p>`;
  }

  function renderP1LongestConsecutive() {
    return `
    <div class="p0-section-title">Longest Consecutive Sequence<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Arrays &amp; Hashing — problem 7</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a list of numbers, in any order. Find the longest run of numbers that are back-to-back (like 1, 2, 3, 4 — each one exactly one more than the last). Return how long that longest run is. Has to run in O(n) time.</p>
    </div>

    <div class="p0-card">
      <h4>What "consecutive" looks like</h4>
      <p>nums = [100, 4, 200, 1, 3, 2] — the numbers are scattered, but 1, 2, 3, 4 are all back-to-back:</p>
      ${renderP1ConsecutiveViz([100, 4, 200, 1, 3, 2])}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. Simplest way: what happens if you sort the array first? Once it's sorted, how would you walk through it once and count how long each streak of back-to-back numbers is? What's the time complexity, given sorting alone costs O(n log n)?<br>
      2. Sorting works but isn't O(n). If you drop every number into a Set instead (O(1) lookups, no order), how could you tell just by looking at a number whether it's the <em>start</em> of a run — not the middle of one?<br>
      3. Once you find a number that starts a run, how do you count how long that run goes?<br>
      4. There's a while loop nested inside a for loop here — so why is the total work still O(n) and not O(n&sup2;)? Think about which numbers actually get expanded from.</p>
    </div>

    ${renderP1Workflow('array-hashMap-longestConsecutiveSequence.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — sort, then scan for streaks</h4>
        <p>Sort the deduplicated numbers. Walk through once, tracking how long the current back-to-back streak is; reset it to 1 whenever the next number isn't exactly one more than the last.</p>
        <pre class="p0-code">function longestConsecutive(nums) {
  if (nums.length === 0) return 0;
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  let longest = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      current++;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
  }
  return longest;
}</pre>
        <p>Time: <strong>O(n log n)</strong> — the sort dominates. Space: <strong>O(n)</strong> — the deduplicated, sorted copy.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — a Set, but only expand from run starts</h4>
        <p>Put every number in a Set. For each number, check if it's a run <em>start</em> — meaning <code>number - 1</code> is NOT in the set. Only then expand forward (<code>number + 1</code>, <code>+2</code>, ...) counting how far the run goes. Numbers in the middle of a run get skipped instantly, so every number only ever gets expanded into once across the whole algorithm.</p>
        <pre class="p0-code">function longestConsecutive(nums) {
  const set = new Set(nums);
  let longest = 0;
  for (const n of set) {
    if (!set.has(n - 1)) {
      let length = 1;
      while (set.has(n + length)) length++;
      longest = Math.max(longest, length);
    }
  }
  return longest;
}</pre>
        <p>Time: <strong>O(n)</strong> — every number is visited once as a candidate, and the inner while loop only ever runs for numbers that are true run starts, so the total expansion work across all runs is also O(n). Space: <strong>O(n)</strong> — the set.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — nums = [100, 4, 200, 1, 3, 2]</div>
        <div id="p1-lcs-arr" class="p0-arr-row"></div>
        <div class="p0-sim-log" id="p1-lcs-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-lcs-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty array:</strong> return 0 — there's nothing to form a run.<br>
        <strong>Duplicates:</strong> the Set removes them automatically, so repeats never inflate a run's length.<br>
        <strong>All one number, repeated:</strong> the Set collapses to a single value, so the longest run is 1.<br>
        <strong>Negative numbers:</strong> the Set and the <code>n - 1</code> / <code>n + 1</code> checks work identically — sign doesn't matter.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Sort &amp; scan</td><td class="num">O(n log n)</td><td class="num">O(n)</td></tr>
          <tr><td>Set, expand from run starts</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1LongestConsecutiveStepper() {
    const btn = document.getElementById('p1-lcs-step-btn');
    if (!btn) return;
    const arrHost = document.getElementById('p1-lcs-arr');
    const logEl = document.getElementById('p1-lcs-log');
    const NUMS = [100, 4, 200, 1, 3, 2];
    const set = new Set(NUMS);

    const steps = [];
    let precomputeLongest = 0;
    for (const n of set) {
      if (!set.has(n - 1)) {
        let length = 1;
        while (set.has(n + length)) length++;
        precomputeLongest = Math.max(precomputeLongest, length);
        steps.push({ n, isStart: true, length, longest: precomputeLongest, run: Array.from({ length }, (_, i) => n + i) });
      } else {
        steps.push({ n, isStart: false, longest: precomputeLongest });
      }
    }

    let idx;

    function renderArr(activeN, runSet) {
      arrHost.innerHTML = NUMS.map(v => {
        const inRun = runSet && runSet.has(v);
        const isActive = v === activeN;
        return `<div class="p0-arr-cell${inRun ? ' active' : ''}" style="${isActive && !inRun ? 'opacity:0.5' : ''}">${v}</div>`;
      }).join('');
    }

    function reset() {
      idx = 0;
      renderArr(null, null);
      logEl.textContent = 'Set built: {100, 4, 200, 1, 3, 2}. Longest so far: 0';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.isStart) {
        renderArr(s.n, new Set(s.run));
        logEl.textContent = `${s.n} - 1 = ${s.n - 1} is NOT in the set → run start. Expand: ${s.run.join(' → ')} (length ${s.length}). Longest so far: ${s.longest}.`;
      } else {
        renderArr(s.n, null);
        logEl.textContent = `${s.n} - 1 = ${s.n - 1} IS in the set → not a run start, skip. Longest so far: ${s.longest}.`;
      }
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ` → done: longest run length = ${s.longest}.`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1JoinDemo(strs, broken) {
    const boxesHtml = strs.map(s => `<div class="p0-arr-cell">${escapeHtml(s) || '<span style="color:var(--muted)">(empty)</span>'}</div>`).join('');
    const joined = strs.join(',');
    return `<div class="p0-arr-row">${boxesHtml}</div>
    <div style="text-align:center;margin:8px 0;color:var(--muted);font-size:16px">↓ join with a comma ↓</div>
    <div class="p0-arr-row"><div class="p0-arr-cell${broken ? ' active' : ''}" style="width:auto;padding:0 12px;flex:none${broken ? ';border-color:#ef4444' : ''}">${escapeHtml(joined)}</div></div>
    ${broken ? `<p style="margin-top:8px;font-size:12px;color:#ef4444">Split this back by comma and you get ${JSON.stringify(joined.split(','))} — not the original list. The comma inside a string got mistaken for a separator.</p>` : ''}`;
  }

  function renderP1EncodeDecode() {
    return `
    <div class="p0-section-title">Encode and Decode Strings<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Arrays &amp; Hashing — problem 8</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>Turn a list of strings into one single string (so it can be sent somewhere, like over a network), then turn that one string back into the exact same list. The strings can contain <em>any</em> character at all — letters, numbers, even punctuation like <code>#</code> or <code>,</code>.</p>
    </div>

    <div class="p0-card">
      <h4>Why the obvious idea breaks</h4>
      <p>The first instinct is usually: glue the strings together with a separator (like a comma), and split on that separator to decode. That works here:</p>
      ${renderP1JoinDemo(['Hello', 'World'], false)}
      <p style="margin-top:14px">But it quietly breaks the moment a string contains that same separator character:</p>
      ${renderP1JoinDemo(['a,b', 'c'], true)}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. Since strings can contain <em>any</em> character, is there any single separator character you could pick that's guaranteed to never appear inside a string?<br>
      2. Instead of relying on a separator being "safe," what if you told the decoder exactly how many characters belong to each string, up front?<br>
      3. If you write a string's length before the string itself (like <code>5Hello</code>), how does the decoder know where the number ends and the actual string starts? What tiny piece of punctuation would fix that?<br>
      4. Walk through decoding <code>5#Hello5#World</code> by hand: what do you read first, and how do you know when to stop reading digits and start reading letters?</p>
    </div>

    ${renderP1Workflow('array-hashMap-encodeAndDecodeStrings.js')}

    <details class="p0-reveal">
      <summary>Approach &amp; walkthrough — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Why "just pick a rare separator" isn't good enough</h4>
        <p>You might think: use a separator so unusual it'll never show up (like <code>|||</code>). But the problem explicitly allows <em>any</em> character in the input, so no fixed separator is ever 100% safe — there's always some input that breaks it. You need an approach that works no matter what the strings contain.</p>
      </div>

      <div class="p0-card">
        <h4>The fix — prefix every string with its own length</h4>
        <p>Before each string, write its length, then a delimiter (like <code>#</code>), then the string itself. <code>"Hello"</code> becomes <code>"5#Hello"</code>. The delimiter after the number is just there so the decoder knows where the digits end — the number itself is never ambiguous, because digits and non-digits can't be confused with each other.</p>
        <pre class="p0-code">function encode(strs) {
  let res = '';
  for (const s of strs) {
    res += s.length + '#' + s;
  }
  return res;
}

function decode(str) {
  const res = [];
  let i = 0;
  while (i < str.length) {
    let j = i;
    while (str[j] !== '#') j++;
    const length = parseInt(str.substring(i, j));
    i = j + 1;
    j = i + length;
    res.push(str.substring(i, j));
    i = j;
  }
  return res;
}</pre>
        <p>Time: <strong>O(n)</strong> for encode and decode, where n is the total number of characters across all strings — each character is visited a constant number of times. Space: <strong>O(n)</strong> — the encoded string and the output array.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Decode it, step by step — str = "5#Hello5#World"</div>
        <div id="p1-ed-str" class="p0-code" style="font-size:14px"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Decoded so far</div>
        <div id="p1-ed-result" class="p0-bucket" style="min-height:34px"></div>
        <div class="p0-sim-log" id="p1-ed-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-ed-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty string in the list:</strong> <code>""</code> encodes as <code>"0#"</code> — length 0, nothing after the delimiter. Decodes back to <code>""</code> correctly.<br>
        <strong>A string that contains <code>#</code>:</strong> doesn't matter — the decoder never searches for <code>#</code> inside the string body, only in the length prefix, and it knows exactly how many characters to take because it already read the length.<br>
        <strong>Empty input list:</strong> encode returns <code>""</code>, and the decode loop's <code>while (i &lt; str.length)</code> never runs, so it correctly returns <code>[]</code>.<br>
        <strong>A string that starts with digits:</strong> (like <code>"123"</code>) still works — the length prefix and the string body are read independently, so digits inside the string are never mistaken for a new length prefix.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Naive delimiter join</td><td class="num">—</td><td class="num">incorrect on some inputs</td></tr>
          <tr><td>Length-prefix encoding</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1EncodeDecodeStepper() {
    const btn = document.getElementById('p1-ed-step-btn');
    if (!btn) return;
    const strHost = document.getElementById('p1-ed-str');
    const resultHost = document.getElementById('p1-ed-result');
    const logEl = document.getElementById('p1-ed-log');
    const STR = '5#Hello5#World';

    const steps = [];
    {
      let i = 0;
      const result = [];
      while (i < STR.length) {
        let j = i;
        while (STR[j] !== '#') j++;
        const length = parseInt(STR.substring(i, j));
        steps.push({ type: 'length', from: i, to: j, length });
        const bodyStart = j + 1;
        const bodyEnd = bodyStart + length;
        const value = STR.substring(bodyStart, bodyEnd);
        result.push(value);
        steps.push({ type: 'body', from: bodyStart, to: bodyEnd, value, result: result.slice() });
        i = bodyEnd;
      }
    }

    let idx;

    function renderStr(highlightFrom, highlightTo) {
      const chars = STR.split('');
      strHost.innerHTML = chars.map((c, i) => {
        const on = highlightFrom != null && i >= highlightFrom && i < highlightTo;
        return `<span style="${on ? 'background:var(--active-bg);color:var(--blue);font-weight:700' : ''}">${c}</span>`;
      }).join('');
    }

    function renderResult(result) {
      resultHost.innerHTML = result && result.length
        ? result.map(s => `<div class="p0-key-chip">"${escapeHtml(s)}"</div>`).join('')
        : `<span style="font-size:11px;color:var(--muted)">empty</span>`;
    }

    function reset() {
      idx = 0;
      renderStr(null, null);
      renderResult([]);
      logEl.textContent = `Start decoding: "${STR}"`;
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.type === 'length') {
        renderStr(s.from, s.to);
        logEl.textContent = `Read digits from index ${s.from} to ${s.to - 1} → length = ${s.length}.`;
      } else {
        renderStr(s.from, s.to);
        renderResult(s.result);
        logEl.textContent = `Take the next ${s.value.length} characters (index ${s.from}–${s.to - 1}) → "${s.value}". Add to result.`;
      }
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' → done decoding.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1FirstUniqCharViz(str) {
    const counts = {};
    for (const c of str) counts[c] = (counts[c] || 0) + 1;
    const firstUniqIdx = str.split('').findIndex(c => counts[c] === 1);
    const cellsHtml = str.split('').map((c, i) => {
      const unique = counts[c] === 1;
      const isFirst = i === firstUniqIdx;
      return `<div class="p0-arr-cell${isFirst ? ' active' : ''}" style="${unique ? '' : 'opacity:0.35'}">${c}</div>`;
    }).join('');
    const caption = firstUniqIdx === -1
      ? 'Every character repeats — no unique character, answer is -1.'
      : `Dimmed letters repeat somewhere else. "${str[firstUniqIdx]}" at index ${firstUniqIdx} is the first one that never repeats.`;
    return `<div class="p0-arr-row">${cellsHtml}</div>
    <p style="margin-top:8px;font-size:12px;color:var(--sublabel)">${caption}</p>`;
  }

  function renderP1FirstUniqChar() {
    return `
    <div class="p0-section-title">First Unique Character<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Arrays &amp; Hashing — problem 9</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a string. Find the first character that never repeats anywhere else in it, and return its index. If every character repeats, return -1.</p>
    </div>

    <div class="p0-card">
      <h4>What "first unique" means</h4>
      <p>s = "loveleetcode" — dimmed letters show up more than once. The first one that doesn't:</p>
      ${renderP1FirstUniqCharViz('loveleetcode')}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. Simplest way: for each character, how would you check whether it shows up anywhere else in the string? If you do that check for every character, what's the total time complexity?<br>
      2. What if you counted how many times every character appears in one pass, then made a second pass through the string <em>in order</em> looking for the first one whose count is 1? Why does doing it in two separate passes still add up to O(n) overall, not O(n&sup2;)?<br>
      3. The problem is usually restricted to lowercase English letters. What does that fixed-size alphabet mean for the space complexity of your count map?<br>
      4. In "loveleetcode", why isn't the answer 'l' (which appears at index 0)?</p>
    </div>

    ${renderP1Workflow('array-hashMap-firstUniqChar.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — check every character against every other character</h4>
        <p>For each index, scan the whole string again looking for the same character anywhere else. The first index with no match is the answer.</p>
        <pre class="p0-code">function firstUniqChar(s) {
  for (let i = 0; i < s.length; i++) {
    let unique = true;
    for (let j = 0; j < s.length; j++) {
      if (j !== i && s[j] === s[i]) { unique = false; break; }
    }
    if (unique) return i;
  }
  return -1;
}</pre>
        <p>Time: <strong>O(n&sup2;)</strong> — a full inner scan for every character. Space: <strong>O(1)</strong>.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — count once, then scan in order</h4>
        <p>First pass: count how many times every character appears, using a map. Second pass: walk the string in its original order, and return the first index whose character has a count of exactly 1.</p>
        <pre class="p0-code">function firstUniqChar(s) {
  const count = new Map();
  for (const c of s) count.set(c, (count.get(c) || 0) + 1);

  for (let i = 0; i < s.length; i++) {
    if (count.get(s[i]) === 1) return i;
  }
  return -1;
}</pre>
        <p>Time: <strong>O(n)</strong> — two linear passes. Space: <strong>O(1)</strong> when the alphabet is a fixed size (26 lowercase letters), since the count map can never hold more than 26 entries no matter how long the string is. With arbitrary Unicode input, this would become O(n) space instead — same reasoning as Contains Duplicate's fixed-alphabet trick.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — s = "loveleetcode"</div>
        <div id="p1-fu-str" class="p0-code" style="font-size:14px"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Character counts</div>
        <div id="p1-fu-counts" class="p0-arr-row" style="flex-wrap:wrap"></div>
        <div class="p0-sim-log" id="p1-fu-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-fu-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty string:</strong> return -1 immediately — there's nothing to scan.<br>
        <strong>Single character:</strong> it's automatically unique (count of 1), so the answer is index 0.<br>
        <strong>Every character repeats:</strong> the second pass never finds a count of 1, so it falls through to -1.<br>
        <strong>The unique character isn't the visually "obvious" one:</strong> always trust the count map, not intuition — a character can look rare in a short glance but still repeat later in the string.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Check every pair</td><td class="num">O(n&sup2;)</td><td class="num">O(1)</td></tr>
          <tr><td>Count, then scan</td><td class="num">O(n)</td><td class="num">O(1)*</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1FirstUniqCharStepper() {
    const btn = document.getElementById('p1-fu-step-btn');
    if (!btn) return;
    const strHost = document.getElementById('p1-fu-str');
    const countsHost = document.getElementById('p1-fu-counts');
    const logEl = document.getElementById('p1-fu-log');
    const STR = 'loveleetcode';

    const steps = [];
    {
      const count = new Map();
      for (const c of STR) {
        count.set(c, (count.get(c) || 0) + 1);
        steps.push({ phase: 'count', char: c, counts: new Map(count) });
      }
      for (let i = 0; i < STR.length; i++) {
        const c = STR[i];
        const isUnique = count.get(c) === 1;
        steps.push({ phase: 'scan', index: i, char: c, isUnique, freq: count.get(c) });
        if (isUnique) break;
      }
    }

    let idx;

    function renderStr(activeIdx) {
      strHost.innerHTML = STR.split('').map((c, i) =>
        `<span style="${i === activeIdx ? 'background:var(--active-bg);color:var(--blue);font-weight:700' : ''}">${c}</span>`
      ).join('');
    }

    function renderCounts(counts) {
      countsHost.innerHTML = [...counts.entries()].map(([c, n]) =>
        `<div class="p0-key-chip">${c}: ${n}</div>`
      ).join('');
    }

    function reset() {
      idx = 0;
      renderStr(-1);
      renderCounts(new Map());
      logEl.textContent = `Start counting characters in "${STR}"`;
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.phase === 'count') {
        renderStr(-1);
        renderCounts(s.counts);
        logEl.textContent = `Counted "${s.char}" → now ${s.counts.get(s.char)}.`;
      } else {
        renderStr(s.index);
        logEl.textContent = s.isUnique
          ? `Index ${s.index}: "${s.char}" has count ${s.freq} → unique! Return ${s.index}.`
          : `Index ${s.index}: "${s.char}" has count ${s.freq} → repeats, skip.`;
      }
      idx++;
      if (idx >= steps.length) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1ReverseWordsViz(str) {
    const words = str.trim().split(/\s+/).filter(Boolean);
    const cellsHtml = arr => arr.map(w =>
      `<div class="p0-arr-cell" style="width:auto;padding:0 14px;flex:none">${escapeHtml(w)}</div>`
    ).join('');
    return `<div class="p0-arr-row" style="flex-wrap:wrap">${cellsHtml(words)}</div>
    <div style="text-align:center;margin:10px 0;color:var(--muted);font-size:16px">↓ reverse the order ↓</div>
    <div class="p0-arr-row" style="flex-wrap:wrap">${cellsHtml([...words].reverse())}</div>`;
  }

  function renderP1ReverseWords() {
    return `
    <div class="p0-section-title">Reverse Words in a String<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Arrays &amp; Hashing — problem 10</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a string of words separated by spaces. Reverse the <em>order</em> of the words (not the letters inside each word). The input might have extra spaces anywhere — leading, trailing, or multiple spaces between words — but your answer should have exactly one space between words and none at the start or end.</p>
    </div>

    <div class="p0-card">
      <h4>What "reverse the words" means</h4>
      <p>s = "  Bob    Loves  Alice   " — messy spacing collapses away, and only the word order flips:</p>
      ${renderP1ReverseWordsViz('  Bob    Loves  Alice   ')}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you scan the string from the <em>end</em> backwards, one character at a time, how would you tell where one word stops and the next one starts?<br>
      2. What do you do when you hit a run of multiple spaces — how many times should your pointer move before you're back at real letters?<br>
      3. JS strings already have tools for this: splitting on whitespace, reversing an array, joining with a single space. What's the shortest correct solution using those, and does it still handle leading/trailing/multiple spaces correctly?<br>
      4. Both approaches end up visiting every character roughly once — so what's actually different between "parse it by hand" and "use the built-ins"? (Hint: it's not the Big-O.)</p>
    </div>

    ${renderP1Workflow('array-hashMap-reverseWords.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Manual approach — scan backwards, extract words by hand</h4>
        <p>Walk the string from the last character to the first. Skip over any spaces. Once you hit a real character, keep walking backwards until you hit a space (or the start) — that span is one word. Collect words in this order (which is already reverse order) and join with single spaces.</p>
        <pre class="p0-code">function reverseWords(s) {
  const result = [];
  let i = s.length - 1;
  while (i >= 0) {
    while (i >= 0 && s[i] === ' ') i--;
    if (i < 0) break;
    let end = i;
    while (i >= 0 && s[i] !== ' ') i--;
    result.push(s.substring(i + 1, end + 1));
  }
  return result.join(' ');
}</pre>
        <p>Time: <strong>O(n)</strong> — every character is visited once. Space: <strong>O(n)</strong> — the result array and output string.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal &amp; most compact — trim, split, reverse, join</h4>
        <p>Trim the string, split on any run of whitespace (<code>/\s+/</code> handles single or multiple spaces identically), reverse the resulting array, and join with a single space.</p>
        <pre class="p0-code">function reverseWords(s) {
  return s.trim().split(/\s+/).reverse().join(' ');
}</pre>
        <p>Time: <strong>O(n)</strong> — same as the manual version. Space: <strong>O(n)</strong> — same too. The win here isn't asymptotic, it's correctness and readability: no off-by-one risk on word boundaries, and the regex split handles all the messy-spacing edge cases for you in one call.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through the manual scan — s = "  Bob    Loves  Alice   "</div>
        <div id="p1-rw-str" class="p0-code" style="font-size:14px;word-break:break-all"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Words found so far (already in reverse order)</div>
        <div id="p1-rw-result" class="p0-bucket" style="min-height:34px"></div>
        <div class="p0-sim-log" id="p1-rw-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-rw-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Leading/trailing spaces:</strong> both approaches naturally drop them — <code>trim()</code> in the compact version, and the backward space-skipping in the manual version.<br>
        <strong>Multiple spaces between words:</strong> collapse to a single space in the output either way.<br>
        <strong>Single word, no spaces:</strong> the "reversed" order is just that one word, unchanged.<br>
        <strong>All spaces, or empty string:</strong> no words at all — the answer is an empty string.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Manual backward scan</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
          <tr><td>trim + split + reverse + join</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ReverseWordsStepper() {
    const btn = document.getElementById('p1-rw-step-btn');
    if (!btn) return;
    const strHost = document.getElementById('p1-rw-str');
    const resultHost = document.getElementById('p1-rw-result');
    const logEl = document.getElementById('p1-rw-log');
    const STR = '  Bob    Loves  Alice   ';

    const steps = [];
    {
      let i = STR.length - 1;
      const result = [];
      while (i >= 0) {
        const skipFrom = i;
        while (i >= 0 && STR[i] === ' ') i--;
        if (skipFrom !== i && i >= 0) steps.push({ type: 'skip', from: i + 1, to: skipFrom });
        if (i < 0) break;
        const end = i;
        while (i >= 0 && STR[i] !== ' ') i--;
        const word = STR.substring(i + 1, end + 1);
        result.push(word);
        steps.push({ type: 'word', from: i + 1, to: end, word, result: result.slice() });
      }
    }

    let idx;

    function renderStr(from, to) {
      strHost.innerHTML = STR.split('').map((c, i) => {
        const on = from != null && i >= from && i <= to;
        return `<span style="${on ? 'background:var(--active-bg);color:var(--blue);font-weight:700' : ''}">${c === ' ' ? '&middot;' : c}</span>`;
      }).join('');
    }

    function renderResult(result) {
      resultHost.innerHTML = result && result.length
        ? result.map(w => `<div class="p0-key-chip">${escapeHtml(w)}</div>`).join('')
        : `<span style="font-size:11px;color:var(--muted)">empty</span>`;
    }

    function reset() {
      idx = 0;
      renderStr(null, null);
      renderResult([]);
      logEl.textContent = `Start scanning from the end of "${STR}"`;
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.type === 'skip') {
        renderStr(s.from, s.to);
        logEl.textContent = `Skip spaces (index ${s.from}–${s.to}).`;
      } else {
        renderStr(s.from, s.to);
        renderResult(s.result);
        logEl.textContent = `Found word "${s.word}" (index ${s.from}–${s.to}). Add to result.`;
      }
      idx++;
      if (idx >= steps.length) {
        const lastWordStep = [...steps].reverse().find(st => st.type === 'word');
        logEl.textContent += ` → done: "${lastWordStep ? lastWordStep.result.join(' ') : ''}"`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1ValidPalindromeViz(str) {
    const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cellsHtml = s => s.split('').map(c =>
      `<div class="p0-arr-cell" style="width:auto;padding:0 10px;flex:none">${escapeHtml(c)}</div>`
    ).join('');
    return `<div class="p0-diagram-label">Cleaned (lowercase, letters/digits only)</div>
    <div class="p0-arr-row" style="flex-wrap:wrap">${cellsHtml(cleaned)}</div>
    <div style="text-align:center;margin:10px 0;color:var(--muted);font-size:16px">↓ same string, reversed ↓</div>
    <div class="p0-arr-row" style="flex-wrap:wrap">${cellsHtml(cleaned.split('').reverse().join(''))}</div>`;
  }

  function renderP1ValidPalindrome() {
    return `
    <div class="p0-section-title">Valid Palindrome<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Two Pointers — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a string. First, lowercase every letter and throw away anything that isn't a letter or a digit (spaces, commas, colons, punctuation — all gone). Then check: does the cleaned-up string read exactly the same forwards and backwards? Return true or false.</p>
    </div>

    <div class="p0-card">
      <h4>What "reads the same forwards and backwards" means</h4>
      <p>s = "A man, a plan, a canal: Panama" — after cleaning, the string forwards and the same string reversed are identical, letter for letter:</p>
      ${renderP1ValidPalindromeViz('A man, a plan, a canal: Panama')}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you had to build a cleaned-up copy of the string first (lowercase, letters/digits only), how would you compare it to check it's a palindrome — and what would that cost in extra space?<br>
      2. Now the harder version: can you check the answer without building a second string at all, using one pointer at each end of the <em>original</em> string moving toward the middle?<br>
      3. What should happen when a pointer is sitting on a character that isn't a letter or digit — does it move once, or does it need to keep moving until it lands on something valid?<br>
      4. What's the very first thing you should check when the two pointers meet or cross — have you actually proven anything yet if you never found a mismatch?</p>
    </div>

    ${renderP1Workflow('twoPointers-validPalindrome.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — build a cleaned string, then compare to its reverse</h4>
        <p>Walk the whole string once, keeping only lowercased letters/digits, to build a new cleaned string. Then compare that string to its own reverse.</p>
        <pre class="p0-code">function isPalindrome(s) {
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === cleaned.split('').reverse().join('');
}</pre>
        <p>Time: <strong>O(n)</strong> — one pass to clean, one pass to reverse/compare. Space: <strong>O(n)</strong> — the cleaned string and its reverse are new arrays/strings the size of the input.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — two pointers, no extra string</h4>
        <p>Keep one pointer at the start and one at the end of the <em>original</em> string. Each step: skip forward/backward over any character that isn't a letter or digit, then compare the two characters (case-insensitive). If they ever differ, it's not a palindrome. If the pointers meet or cross without a mismatch, it is.</p>
        <pre class="p0-code">function isPalindrome(s) {
  let l = 0, r = s.length - 1;
  const alphaNum = c => /[a-z0-9]/i.test(c);
  while (l < r) {
    while (l < r && !alphaNum(s[l])) l++;
    while (r > l && !alphaNum(s[r])) r--;
    if (s[l].toLowerCase() !== s[r].toLowerCase()) return false;
    l++; r--;
  }
  return true;
}</pre>
        <p>Time: <strong>O(n)</strong> — same as brute force, each character is visited at most twice. Space: <strong>O(1)</strong> — only two pointers, no second string built. The win here is real: no extra memory, and it's the pattern (two pointers converging from both ends) that shows up again and again in this category.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through the two pointers — s = "A man, a plan, a canal: Panama"</div>
        <div id="p1-vp-str" class="p0-code" style="font-size:14px;word-break:break-all"></div>
        <div class="p0-sim-log" id="p1-vp-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-vp-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty string or all-spaces:</strong> nothing alphanumeric to compare — vacuously true.<br>
        <strong>Single character:</strong> true — a lone character always mirrors itself.<br>
        <strong>String with only punctuation between two different letters (e.g. "0P"):</strong> both characters are alphanumeric, so they get compared directly — mismatched case/value still fails.<br>
        <strong>Numbers mixed with letters:</strong> digits count as alphanumeric too, so "121" is a valid palindrome on its own.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Build cleaned string + compare</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
          <tr><td>Two pointers, in place</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ValidPalindromeStepper() {
    const btn = document.getElementById('p1-vp-step-btn');
    if (!btn) return;
    const strHost = document.getElementById('p1-vp-str');
    const logEl = document.getElementById('p1-vp-log');
    const STR = 'A man, a plan, a canal: Panama';
    const alphaNum = c => /[a-z0-9]/i.test(c);

    const steps = [];
    {
      let l = 0, r = STR.length - 1;
      while (l < r) {
        while (l < r && !alphaNum(STR[l])) { steps.push({ type: 'skipL', l, r }); l++; }
        while (r > l && !alphaNum(STR[r])) { steps.push({ type: 'skipR', l, r }); r--; }
        if (l >= r) break;
        const match = STR[l].toLowerCase() === STR[r].toLowerCase();
        steps.push({ type: 'compare', l, r, match });
        if (!match) break;
        l++; r--;
      }
      if (l >= r) steps.push({ type: 'done' });
    }

    let idx;

    function renderStr(l, r) {
      strHost.innerHTML = STR.split('').map((c, i) => {
        const on = i === l || i === r;
        return `<span style="${on ? 'background:var(--active-bg);color:var(--blue);font-weight:700' : ''}">${c === ' ' ? '&middot;' : c}</span>`;
      }).join('');
    }

    function reset() {
      idx = 0;
      renderStr(0, STR.length - 1);
      logEl.textContent = `l = 0, r = ${STR.length - 1}. Start closing in from both ends.`;
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.type === 'skipL') {
        renderStr(s.l, s.r);
        logEl.textContent = `s[${s.l}] = "${STR[s.l]}" isn't alphanumeric — move l forward.`;
      } else if (s.type === 'skipR') {
        renderStr(s.l, s.r);
        logEl.textContent = `s[${s.r}] = "${STR[s.r]}" isn't alphanumeric — move r backward.`;
      } else if (s.type === 'compare') {
        renderStr(s.l, s.r);
        logEl.textContent = s.match
          ? `Compare "${STR[s.l].toLowerCase()}" vs "${STR[s.r].toLowerCase()}" — match. Move both pointers inward.`
          : `Compare "${STR[s.l].toLowerCase()}" vs "${STR[s.r].toLowerCase()}" — mismatch! Not a palindrome.`;
      } else if (s.type === 'done') {
        logEl.textContent = 'Pointers met without a mismatch → it is a palindrome.';
      }
      idx++;
      if (idx >= steps.length) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1ThreeSum() {
    return `
    <div class="p0-section-title">3Sum<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Two Pointers — problem 2</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a list of numbers. Find every group of <strong>three different positions</strong> whose values add up to zero. Return the list of value-triplets (not positions), and don't return the same triplet of values twice, even if it can be formed from different positions.</p>
    </div>

    <div class="p0-card">
      <h4>What a valid triplet looks like</h4>
      <p>nums = [-1, 0, 1, 2, -1, -4] — two valid triplets exist, [-1,-1,2] and [-1,0,1]. Here's the first one, at positions 0, 4, and 3:</p>
      <div class="p0-arr-row">${[-1, 0, 1, 2, -1, -4].map((v, i) => `<div class="p0-arr-cell${[0,3,4].includes(i) ? ' active' : ''}">${v}</div>`).join('')}</div>
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">nums[0] + nums[4] + nums[3] = -1 + (-1) + 2 = 0. The full answer is [[-1,-1,2],[-1,0,1]] — two different value-triplets, each summing to exactly 0.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you checked every possible group of three positions directly, how many combinations is that, and what's the time complexity?<br>
      2. The problem bans duplicate triplets in the output. If the array were sorted first, how would that make it easy to spot and skip a value you've already used as the "first number" of a triplet?<br>
      3. Once the first number is fixed and the array is sorted, finding the other two numbers that sum to a specific target (zero minus the first number) in the <em>remaining</em> sorted slice — what earlier problem does that reduce to?<br>
      4. If the fixed first number is already positive, and the array is sorted ascending, can any two numbers after it ever bring the sum back down to zero? What does that let you do early?</p>
    </div>

    ${renderP1Workflow('twoPointers-threeSum.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — check every triplet of positions</h4>
        <p>Three nested loops over all distinct positions i &lt; j &lt; k, checking every combination. Use a Set keyed by the sorted triplet's values to avoid duplicate output.</p>
        <pre class="p0-code">function threeSum(nums) {
  const seen = new Set();
  const res = [];
  for (let i = 0; i &lt; nums.length; i++) {
    for (let j = i + 1; j &lt; nums.length; j++) {
      for (let k = j + 1; k &lt; nums.length; k++) {
        if (nums[i] + nums[j] + nums[k] === 0) {
          const key = [nums[i], nums[j], nums[k]].sort((a, b) => a - b).join(',');
          if (!seen.has(key)) {
            seen.add(key);
            res.push([nums[i], nums[j], nums[k]]);
          }
        }
      }
    }
  }
  return res;
}</pre>
        <p>Time: <strong>O(n³)</strong> — three nested loops. Space: <strong>O(n)</strong> — the dedup set, on top of the output.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — sort, then two pointers per fixed first number</h4>
        <p>Sort the array first. Fix each position <code>i</code> as the first number of the triplet (skipping it if it's the same value as the previous <code>i</code>, to avoid duplicate triplets). For the rest of the array, run the same two-pointer sweep as a sorted "two numbers sum to target" problem, where the target is <code>-nums[i]</code>. Skip duplicate values on both pointers after a match, and stop the outer loop early once <code>nums[i]</code> turns positive.</p>
        <pre class="p0-code">function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const res = [];
  for (let i = 0; i &lt; nums.length; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    if (nums[i] > 0) break;
    let l = i + 1, r = nums.length - 1;
    while (l &lt; r) {
      const sum = nums[i] + nums[l] + nums[r];
      if (sum &lt; 0) l++;
      else if (sum > 0) r--;
      else {
        res.push([nums[i], nums[l], nums[r]]);
        l++; r--;
        while (l &lt; r && nums[l] === nums[l - 1]) l++;
        while (l &lt; r && nums[r] === nums[r + 1]) r--;
      }
    }
  }
  return res;
}</pre>
        <p>Time: <strong>O(n²)</strong> — O(n log n) to sort, then O(n) outer loop each running an O(n) two-pointer sweep. Space: <strong>O(1)</strong> extra besides the output (or O(n)/O(log n) depending on the sort's internals — no extra data structure either way).</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — nums (sorted) = [-4, -1, -1, 0, 1, 2]</div>
        <div id="p1-3s-array" class="p0-arr-row"></div>
        <div class="p0-diagram-label" style="margin-top:12px">Triplets found so far</div>
        <div id="p1-3s-result" class="p0-bucket" style="min-height:34px"></div>
        <div class="p0-sim-log" id="p1-3s-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-3s-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Fewer than 3 numbers:</strong> no triplet is possible — return an empty list.<br>
        <strong>All zeros, e.g. [0,0,0]:</strong> one valid triplet, [0,0,0] — the duplicate-skip logic must not delete it entirely.<br>
        <strong>No valid triplet exists:</strong> the two-pointer sweep just never lands on sum === 0 for any fixed first number — return an empty list.<br>
        <strong>Many duplicate values:</strong> the "skip if same as previous i" check, plus the post-match duplicate skips on l and r, are what keep the output free of repeated triplets.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (triple loop + dedup set)</td><td class="num">O(n³)</td><td class="num">O(n)</td></tr>
          <tr><td>Sort + two pointers per fixed i</td><td class="num">O(n²)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ThreeSumStepper() {
    const btn = document.getElementById('p1-3s-step-btn');
    if (!btn) return;
    const arrHost = document.getElementById('p1-3s-array');
    const resultHost = document.getElementById('p1-3s-result');
    const logEl = document.getElementById('p1-3s-log');
    const ARR = [-4, -1, -1, 0, 1, 2];

    const steps = [];
    {
      const result = [];
      for (let i = 0; i < ARR.length; i++) {
        if (i > 0 && ARR[i] === ARR[i - 1]) {
          steps.push({ type: 'skipI', i });
          continue;
        }
        if (ARR[i] > 0) {
          steps.push({ type: 'breakI', i });
          break;
        }
        let l = i + 1, r = ARR.length - 1;
        steps.push({ type: 'startI', i, l, r });
        while (l < r) {
          const sum = ARR[i] + ARR[l] + ARR[r];
          if (sum < 0) {
            steps.push({ type: 'moveL', i, l, r, sum });
            l++;
          } else if (sum > 0) {
            steps.push({ type: 'moveR', i, l, r, sum });
            r--;
          } else {
            result.push([ARR[i], ARR[l], ARR[r]]);
            steps.push({ type: 'found', i, l, r, result: result.slice() });
            l++; r--;
            while (l < r && ARR[l] === ARR[l - 1]) l++;
            while (l < r && ARR[r] === ARR[r + 1]) r--;
          }
        }
      }
      steps.push({ type: 'done', result: result.slice() });
    }

    let idx;

    function renderArr(i, l, r) {
      arrHost.innerHTML = ARR.map((v, pos) => {
        let style = '';
        if (pos === i) style = 'border-color:#22c55e;color:#22c55e;font-weight:700';
        else if (pos === l) style = 'background:var(--active-bg);border-color:var(--blue);color:var(--blue);font-weight:700';
        else if (pos === r) style = 'background:rgba(239,68,68,0.15);border-color:rgba(239,68,68,0.5);color:#ef4444;font-weight:700';
        return `<div class="p0-arr-cell" style="${style}">${v}</div>`;
      }).join('');
    }

    function renderResult(result) {
      resultHost.innerHTML = result.length
        ? result.map(t => `<div class="p0-key-chip">[${t.join(',')}]</div>`).join('')
        : `<span style="font-size:11px;color:var(--muted)">empty</span>`;
    }

    function reset() {
      idx = 0;
      renderArr(-1, -1, -1);
      renderResult([]);
      logEl.textContent = 'i = green, l = blue, r = red. Start with i = 0.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.type === 'skipI') {
        renderArr(s.i, -1, -1);
        logEl.textContent = `i = ${s.i}: nums[${s.i}] = ${ARR[s.i]} same as previous — skip to avoid a duplicate first number.`;
      } else if (s.type === 'breakI') {
        renderArr(s.i, -1, -1);
        logEl.textContent = `i = ${s.i}: nums[${s.i}] = ${ARR[s.i]} is already positive — no way left to reach sum 0. Stop.`;
      } else if (s.type === 'startI') {
        renderArr(s.i, s.l, s.r);
        logEl.textContent = `Fix i = ${s.i} (value ${ARR[s.i]}). l = ${s.l}, r = ${s.r}.`;
      } else if (s.type === 'moveL') {
        renderArr(s.i, s.l, s.r);
        logEl.textContent = `Sum = ${s.sum} < 0 — need bigger → move l right.`;
      } else if (s.type === 'moveR') {
        renderArr(s.i, s.l, s.r);
        logEl.textContent = `Sum = ${s.sum} > 0 — need smaller → move r left.`;
      } else if (s.type === 'found') {
        renderArr(s.i, s.l, s.r);
        renderResult(s.result);
        logEl.textContent = `Sum = 0 → found [${ARR[s.i]},${ARR[s.l]},${ARR[s.r]}]. Move both pointers, skip duplicates.`;
      } else if (s.type === 'done') {
        renderResult(s.result);
        logEl.textContent = `Done. All triplets found: ${JSON.stringify(s.result)}`;
      }
      idx++;
      if (idx >= steps.length) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1ContainerWaterBars(heights, l, r) {
    const max = Math.max(...heights);
    return `<div class="p0-arr-row" style="align-items:flex-end;gap:8px">${heights.map((h, i) => {
      const barPx = Math.round((h / max) * 70) + 6;
      const on = i === l || i === r;
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
        <div style="width:100%;max-width:28px;height:${barPx}px;background:${on ? '#3b82f6' : 'rgba(255,255,255,0.2)'};border-radius:3px 3px 0 0"></div>
        <div style="font-size:10px;color:var(--sublabel)">${h}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderP1ContainerWaterViz(heights) {
    return renderP1ContainerWaterBars(heights, 1, heights.length - 1);
  }

  function renderP1ContainerWater() {
    return `
    <div class="p0-section-title">Container With Most Water<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Two Pointers — problem 3</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a list of heights — think of them as vertical lines standing on the x-axis. Pick any two lines. Together with the ground between them, they form a container that can hold water. The water's height is capped by whichever of the two lines is shorter (water spills over the short side), and the width is just the distance between them. Find the two lines that hold the <strong>most</strong> water.</p>
    </div>

    <div class="p0-card">
      <h4>What "container" and "water held" mean</h4>
      <p>height = [1, 8, 6, 2, 5, 4, 8, 3, 7] — picking the lines at index 1 (height 8) and index 8 (height 7) gives width 7 and a water height capped at 7 (the shorter of the two), so area = 7 × 7 = 49:</p>
      ${renderP1ContainerWaterViz([1, 8, 6, 2, 5, 4, 8, 3, 7])}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">Area = min(height[left], height[right]) × (right − left). Every pair of lines forms one candidate container — you want the biggest area over all pairs.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you checked every possible pair of lines directly, how many pairs is that, and what's the time complexity?<br>
      2. Start with the widest possible container — one pointer at each end. If you want to try a narrower container, moving <em>which</em> pointer inward could still possibly increase the area, and which one provably never can? (Think about what caps the height.)<br>
      3. If the left line is shorter than the right line, and you move the <em>right</em> pointer inward instead, can the new area ever beat the one you already have? Why not?<br>
      4. Once you always move the shorter side's pointer, how many total steps does the whole scan take before the pointers meet?</p>
    </div>

    ${renderP1Workflow('twoPointers-containerWithMostWater.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — check every pair of lines</h4>
        <p>Try every pair of indices (i, j) and compute the area for each, keeping the max.</p>
        <pre class="p0-code">function maxArea(height) {
  let res = 0;
  for (let i = 0; i &lt; height.length; i++) {
    for (let j = i + 1; j &lt; height.length; j++) {
      const area = Math.min(height[i], height[j]) * (j - i);
      res = Math.max(res, area);
    }
  }
  return res;
}</pre>
        <p>Time: <strong>O(n²)</strong> — every pair is checked. Space: <strong>O(1)</strong> — just a running max.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — two pointers, greedy inward move</h4>
        <p>Start with the widest container: one pointer at each end. At each step, compute the area, update the max, then move the pointer at the <strong>shorter</strong> line inward. Why the shorter one? The area is capped by the shorter line — keeping it and moving the other pointer can only shrink the width without any chance of a taller cap, so it can never beat what you already have. Moving the shorter line's pointer is the only move that has a chance of finding a taller line to raise the cap.</p>
        <pre class="p0-code">function maxArea(height) {
  let l = 0, r = height.length - 1;
  let res = 0;
  while (l &lt; r) {
    const area = Math.min(height[l], height[r]) * (r - l);
    res = Math.max(res, area);
    if (height[l] &lt;= height[r]) l++;
    else r--;
  }
  return res;
}</pre>
        <p>Time: <strong>O(n)</strong> — each pointer moves inward at most n times total, so the whole scan is one pass. Space: <strong>O(1)</strong> — only two pointers and a running max.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — height = [1, 8, 6, 2, 5, 4, 8, 3, 7]</div>
        <div id="p1-cw-array" class="p0-arr-row" style="align-items:flex-end"></div>
        <div class="p0-sim-log" id="p1-cw-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-cw-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Fewer than 2 lines:</strong> no container can be formed — area is 0.<br>
        <strong>All heights are 0:</strong> every container holds 0 water no matter the width.<br>
        <strong>Equal heights on both pointers:</strong> either pointer can move inward — the code picks left (<code>&lt;=</code>), and it doesn't change correctness either way.<br>
        <strong>Tallest lines at both ends already:</strong> the very first area checked (widest container) may already be the max — the algorithm still keeps scanning inward but won't find anything better.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (every pair)</td><td class="num">O(n²)</td><td class="num">O(1)</td></tr>
          <tr><td>Two pointers, greedy inward</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ContainerWaterStepper() {
    const btn = document.getElementById('p1-cw-step-btn');
    if (!btn) return;
    const arrHost = document.getElementById('p1-cw-array');
    const logEl = document.getElementById('p1-cw-log');
    const ARR = [1, 8, 6, 2, 5, 4, 8, 3, 7];

    const steps = [];
    {
      let l = 0, r = ARR.length - 1;
      let res = 0;
      while (l < r) {
        const area = Math.min(ARR[l], ARR[r]) * (r - l);
        res = Math.max(res, area);
        steps.push({ l, r, area, res });
        if (ARR[l] <= ARR[r]) l++;
        else r--;
      }
    }

    let idx;

    function renderArr(l, r) {
      arrHost.innerHTML = renderP1ContainerWaterBars(ARR, l, r);
    }

    function reset() {
      idx = 0;
      renderArr(0, ARR.length - 1);
      logEl.textContent = 'l = 0, r = last index. Start with the widest container.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      renderArr(s.l, s.r);
      const shorter = ARR[s.l] <= ARR[s.r] ? 'left' : 'right';
      logEl.textContent = `l=${s.l} (h=${ARR[s.l]}), r=${s.r} (h=${ARR[s.r]}) → area = ${s.area}. Best so far: ${s.res}. Move ${shorter} pointer inward.`;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Pointers met — done.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1PriceBars(prices, buyIdx, sellIdx) {
    const max = Math.max(...prices, 1);
    return `<div class="p0-arr-row" style="align-items:flex-end;gap:8px">${prices.map((p, i) => {
      const barPx = Math.round((p / max) * 70) + 6;
      const isBuy = i === buyIdx;
      const isSell = i === sellIdx;
      const color = isBuy ? '#22c55e' : isSell ? '#3b82f6' : 'rgba(255,255,255,0.2)';
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
        <div style="font-size:10px;color:var(--sublabel)">${isBuy ? 'buy' : isSell ? 'sell' : ''}</div>
        <div style="width:100%;max-width:28px;height:${barPx}px;background:${color};border-radius:3px 3px 0 0"></div>
        <div style="font-size:10px;color:var(--sublabel)">${p}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderP1BestTimeToBuySell() {
    return `
    <div class="p0-section-title">Best Time to Buy and Sell Stock<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Sliding Window — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a list of stock prices, one per day, in order. Pick one day to buy and a <strong>later</strong> day to sell. You want the biggest possible profit (sell price minus buy price). If there's no way to make a profit, the answer is 0 — you're not forced to buy and sell.</p>
    </div>

    <div class="p0-card">
      <h4>What "profit" means here</h4>
      <p>prices = [7, 1, 5, 3, 6, 4] — buying on day 1 (price 1) and selling on day 4 (price 6) gives profit 6 − 1 = 5, the best you can do:</p>
      ${renderP1PriceBars([7, 1, 5, 3, 6, 4], 1, 4)}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">You only ever hold one share at a time, and you must buy before you sell — a later day's price minus an earlier day's price.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you checked every possible (buy day, sell day) pair directly, how many pairs is that, and what's the time complexity?<br>
      2. As you scan left to right, what's the only price from the days you've already seen that could ever matter for today's sell decision?<br>
      3. If today's price is lower than the cheapest price you've seen so far, is today ever a good day to sell? What should it become instead?<br>
      4. Can you get the answer in a single pass, keeping track of just two numbers as you go?</p>
    </div>

    ${renderP1Workflow('slidingWindow-bestTimeToBuyAndSellStock.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — check every buy/sell pair</h4>
        <p>Try every pair of days (i, j) with j after i, compute the profit for each, keeping the max.</p>
        <pre class="p0-code">function maxProfit(prices) {
  let res = 0;
  for (let i = 0; i &lt; prices.length; i++) {
    for (let j = i + 1; j &lt; prices.length; j++) {
      res = Math.max(res, prices[j] - prices[i]);
    }
  }
  return res;
}</pre>
        <p>Time: <strong>O(n²)</strong> — every pair is checked. Space: <strong>O(1)</strong> — just a running max.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — sliding window, track the cheapest buy so far</h4>
        <p>Walk through the prices once. Keep the lowest price seen so far (your best buy day). At each day, check the profit if you sold today against that lowest price, and update the max profit. If today's price is even lower than your current best buy, that becomes the new best buy — there's no reason to ever sell on a day whose price is below a cheaper day you already passed.</p>
        <pre class="p0-code">function maxProfit(prices) {
  let minPrice = Infinity;
  let maxP = 0;
  for (let i = 0; i &lt; prices.length; i++) {
    if (prices[i] &lt; minPrice) {
      minPrice = prices[i];
    } else {
      maxP = Math.max(maxP, prices[i] - minPrice);
    }
  }
  return maxP;
}</pre>
        <p>Time: <strong>O(n)</strong> — one pass over the prices. Space: <strong>O(1)</strong> — just the running min and max.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — prices = [7, 1, 5, 3, 6, 4]</div>
        <div id="p1-bt-array" class="p0-arr-row" style="align-items:flex-end"></div>
        <div class="p0-sim-log" id="p1-bt-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-bt-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Fewer than 2 days:</strong> no transaction is possible — profit is 0.<br>
        <strong>Prices only ever fall:</strong> every day is a new low, profit stays 0 the whole way through.<br>
        <strong>Prices only ever rise:</strong> the first day is the best (and only) buy day, and the running max profit keeps growing until the last day.<br>
        <strong>Empty array:</strong> nothing to scan — profit is 0.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (every pair)</td><td class="num">O(n²)</td><td class="num">O(1)</td></tr>
          <tr><td>Sliding window, running min</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1BestTimeToBuySellStepper() {
    const btn = document.getElementById('p1-bt-step-btn');
    if (!btn) return;
    const arrHost = document.getElementById('p1-bt-array');
    const logEl = document.getElementById('p1-bt-log');
    const ARR = [7, 1, 5, 3, 6, 4];

    const steps = [];
    {
      let minPrice = Infinity;
      let maxP = 0;
      for (let i = 0; i < ARR.length; i++) {
        if (ARR[i] < minPrice) {
          minPrice = ARR[i];
          steps.push({ i, minPrice, maxP, action: 'newMin' });
        } else {
          maxP = Math.max(maxP, ARR[i] - minPrice);
          steps.push({ i, minPrice, maxP, action: 'checkSell' });
        }
      }
    }

    let idx;
    let bestBuyIdx;

    function renderArr(sellIdx) {
      arrHost.innerHTML = renderP1PriceBars(ARR, bestBuyIdx, sellIdx);
    }

    function reset() {
      idx = 0;
      bestBuyIdx = null;
      renderArr(null);
      logEl.textContent = 'Scanning day by day. Tracking the lowest price seen so far.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.action === 'newMin') {
        bestBuyIdx = s.i;
        renderArr(null);
        logEl.textContent = `Day ${s.i}: price ${ARR[s.i]} is a new low. New best buy day. Best profit so far: ${s.maxP}.`;
      } else {
        renderArr(s.i);
        logEl.textContent = `Day ${s.i}: price ${ARR[s.i]} vs. best buy ${s.minPrice} → profit ${ARR[s.i] - s.minPrice}. Best profit so far: ${s.maxP}.`;
      }
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Scan done.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1CharWindow(str, left, right) {
    const chars = str.length ? str.split('') : [' '];
    return `<div class="p0-arr-row" style="gap:6px">${chars.map((ch, i) => {
      const inWindow = str.length && i >= left && i <= right;
      const isRight = i === right;
      const isLeft = i === left;
      const bg = isRight ? '#3b82f6' : isLeft ? '#22c55e' : inWindow ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)';
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;background:${bg};border-radius:4px;font-size:13px;font-family:monospace">${ch === ' ' ? '␣' : escapeHtml(ch)}</div>
        <div style="font-size:9px;color:var(--sublabel)">${i}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderP1LongestSubstring() {
    return `
    <div class="p0-section-title">Longest Substring Without Repeating Characters<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Sliding Window — problem 2</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a string. Find the length of the longest stretch of <strong>consecutive</strong> characters in it where no character repeats. You don't need to return the substring itself, just how long the longest one is.</p>
    </div>

    <div class="p0-card">
      <h4>What "window" means here</h4>
      <p>s = "pwwkew" — the longest run without a repeat is "wke", length 3 (not "pw" extended, because the second "w" repeats):</p>
      ${renderP1CharWindow('pwwkew', 3, 5)}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">Green = left edge of the current window, blue = right edge (the character just added). Everything between them is the current candidate substring.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you tried every possible substring directly and checked each one for repeats, what's the time complexity?<br>
      2. As you scan left to right adding one character at a time, how would you quickly tell if the new character already exists in your current window?<br>
      3. When you find a repeat, do you need to shrink the window one step at a time, or can you jump the left edge straight past the earlier occurrence?<br>
      4. What should you track as you scan, if not the substring itself, to still know the length of the current window?</p>
    </div>

    ${renderP1Workflow('slidingWindow-longestSubstringWithoutRepeating.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — check every substring</h4>
        <p>Try every starting point, extend right as long as no repeat is found, and track the best length.</p>
        <pre class="p0-code">function lengthOfLongestSubstring(s) {
  let res = 0;
  for (let i = 0; i &lt; s.length; i++) {
    const seen = new Set();
    for (let j = i; j &lt; s.length; j++) {
      if (seen.has(s[j])) break;
      seen.add(s[j]);
      res = Math.max(res, j - i + 1);
    }
  }
  return res;
}</pre>
        <p>Time: <strong>O(n²)</strong> — every starting point rescans forward. Space: <strong>O(min(n, charset))</strong> — the seen set per start.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — sliding window with a map of last-seen index</h4>
        <p>Keep a window [left, right] with no repeats inside it, and a map from character → the last index it was seen at. Move right one step at a time. If the new character was already seen <strong>inside the current window</strong>, jump left to just past that earlier occurrence (never backwards). Update the map, then update the max window size.</p>
        <pre class="p0-code">function lengthOfLongestSubstring(s) {
  const lastSeen = new Map();
  let left = 0, maxLen = 0;
  for (let right = 0; right &lt; s.length; right++) {
    const c = s[right];
    if (lastSeen.has(c)) {
      left = Math.max(lastSeen.get(c) + 1, left);
    }
    lastSeen.set(c, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}</pre>
        <p>Time: <strong>O(n)</strong> — each character is visited by <code>right</code> exactly once. Space: <strong>O(min(n, charset))</strong> — the map holds at most one entry per distinct character.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — s = "pwwkew"</div>
        <div id="p1-ls-array" class="p0-arr-row"></div>
        <div class="p0-sim-log" id="p1-ls-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-ls-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty string:</strong> no characters at all — length is 0.<br>
        <strong>All identical characters ("bbbbb"):</strong> the window can never grow past 1 — left jumps to right on every step.<br>
        <strong>A repeat whose earlier occurrence is already outside the window ("dvdf"):</strong> the jump target must never move <code>left</code> backwards — always take <code>Math.max(lastSeen + 1, left)</code>, or you'd wrongly re-include characters you already dropped.<br>
        <strong>Single character or single space:</strong> length is 1 either way — a space is just another character.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (every substring)</td><td class="num">O(n²)</td><td class="num">O(min(n, charset))</td></tr>
          <tr><td>Sliding window + last-seen map</td><td class="num">O(n)</td><td class="num">O(min(n, charset))</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1LongestSubstringStepper() {
    const btn = document.getElementById('p1-ls-step-btn');
    if (!btn) return;
    const arrHost = document.getElementById('p1-ls-array');
    const logEl = document.getElementById('p1-ls-log');
    const STR = 'pwwkew';

    const steps = [];
    {
      const lastSeen = new Map();
      let left = 0, maxLen = 0;
      for (let right = 0; right < STR.length; right++) {
        const c = STR[right];
        let jumped = false;
        if (lastSeen.has(c) && lastSeen.get(c) + 1 > left) {
          left = lastSeen.get(c) + 1;
          jumped = true;
        }
        lastSeen.set(c, right);
        maxLen = Math.max(maxLen, right - left + 1);
        steps.push({ right, left, c, jumped, maxLen });
      }
    }

    let idx;

    function renderArr(left, right) {
      arrHost.innerHTML = renderP1CharWindow(STR, left, right);
    }

    function reset() {
      idx = 0;
      renderArr(0, -1);
      logEl.textContent = 'left = 0. Scanning right one character at a time.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      renderArr(s.left, s.right);
      const jumpNote = s.jumped ? ` "${s.c}" repeats inside the window — left jumps to ${s.left}.` : '';
      logEl.textContent = `right=${s.right} ("${s.c}").${jumpNote} Window is now [${s.left}, ${s.right}]. Best length so far: ${s.maxLen}.`;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Scan done.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1CharReplacement() {
    return `
    <div class="p0-section-title">Longest Repeating Character Replacement<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Sliding Window — problem 3</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a string of uppercase letters and a number k. You're allowed to change up to k characters in the string to any other letter. Find the length of the longest stretch of <strong>consecutive</strong> characters you can turn into all the same letter, using at most k changes.</p>
    </div>

    <div class="p0-card">
      <h4>What "at most k changes" means for a window</h4>
      <p>s = "AABDBBBC", k = 2 — the window "ABDBBB" (indices 1-6) has 4 B's and 2 other letters (A, D). Since we can change at most 2 characters, we can turn A and D into B, making the whole window "BBBBBB" — a valid window of length 6:</p>
      ${renderP1CharWindow('AABDBBBC', 1, 6)}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">A window is "valid" if (window size) − (count of its most frequent letter) ≤ k — that difference is exactly how many characters you'd need to change.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you tried every substring and, for each one, counted letters and checked if it needed ≤ k changes, what's the time complexity?<br>
      2. As you expand a window one character at a time, what single number do you need to know to check if the window is still valid — do you need every letter's count, or just the count of the <em>most frequent</em> one?<br>
      3. If adding a new character makes the window invalid (needs more than k changes), what should you do to the left side of the window?<br>
      4. Here's the subtle part: if you track the best "max frequency" seen so far in the window and never let it decrease even after shrinking, does that ever cause you to accept an invalid window — or does it only affect whether the window's length can grow? (Think about what happens to <code>longest</code> if the window briefly stops growing.)</p>
    </div>

    ${renderP1Workflow('slidingWindow-longestRepeatingCharacterReplacement.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — check every substring</h4>
        <p>Try every substring, count its letters, and check if (length − max count) ≤ k.</p>
        <pre class="p0-code">function characterReplacement(s, k) {
  let res = 0;
  for (let i = 0; i &lt; s.length; i++) {
    const count = new Map();
    let maxFreq = 0;
    for (let j = i; j &lt; s.length; j++) {
      count.set(s[j], (count.get(s[j]) || 0) + 1);
      maxFreq = Math.max(maxFreq, count.get(s[j]));
      if ((j - i + 1) - maxFreq &lt;= k) {
        res = Math.max(res, j - i + 1);
      }
    }
  }
  return res;
}</pre>
        <p>Time: <strong>O(n²)</strong> — every start rescans forward. Space: <strong>O(1)</strong> — at most 26 letters tracked.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — sliding window, track only the max frequency</h4>
        <p>Expand the window with <code>right</code>, keeping a frequency count per letter and the highest frequency seen in the window so far (<code>maxFrequency</code>). If <code>(right - left + 1) - maxFrequency &gt; k</code>, the window needs too many changes — shrink from the left until it's valid again. The key trick: <code>maxFrequency</code> is allowed to go stale (not recomputed after shrinking) — it can only ever help the window look "more valid" than it truly is for a moment, and that never lets an invalid answer get recorded, it just occasionally delays recognizing the window could shrink further. It still finds the true longest length.</p>
        <pre class="p0-code">function characterReplacement(s, k) {
  const count = new Map();
  let left = 0, maxFrequency = 0, longest = 0;
  for (let right = 0; right &lt; s.length; right++) {
    const c = s[right];
    count.set(c, (count.get(c) || 0) + 1);
    maxFrequency = Math.max(maxFrequency, count.get(c));
    while ((right - left + 1) - maxFrequency &gt; k) {
      const lc = s[left];
      count.set(lc, count.get(lc) - 1);
      left++;
    }
    longest = Math.max(longest, right - left + 1);
  }
  return longest;
}</pre>
        <p>Time: <strong>O(n)</strong> — right moves forward n times, left moves forward at most n times total. Space: <strong>O(1)</strong> — the count map holds at most 26 uppercase letters.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — s = "AABDBBBC", k = 2</div>
        <div id="p1-cr-array" class="p0-arr-row"></div>
        <div class="p0-sim-log" id="p1-cr-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-cr-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>k = 0:</strong> no changes allowed — the answer is just the longest run of one repeated letter already in the string.<br>
        <strong>k ≥ string length:</strong> you can change everything — the whole string can become one letter.<br>
        <strong>Empty string:</strong> nothing to scan — answer is 0.<br>
        <strong>All one letter already:</strong> the window never needs to shrink — it grows to the full string length.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (every substring)</td><td class="num">O(n²)</td><td class="num">O(1)</td></tr>
          <tr><td>Sliding window, running max frequency</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1CharReplacementStepper() {
    const btn = document.getElementById('p1-cr-step-btn');
    if (!btn) return;
    const arrHost = document.getElementById('p1-cr-array');
    const logEl = document.getElementById('p1-cr-log');
    const STR = 'AABDBBBC';
    const K = 2;

    const steps = [];
    {
      const count = new Map();
      let left = 0, maxFrequency = 0, longest = 0;
      for (let right = 0; right < STR.length; right++) {
        const c = STR[right];
        count.set(c, (count.get(c) || 0) + 1);
        maxFrequency = Math.max(maxFrequency, count.get(c));
        let shrunk = false;
        while ((right - left + 1) - maxFrequency > K) {
          const lc = STR[left];
          count.set(lc, count.get(lc) - 1);
          left++;
          shrunk = true;
        }
        longest = Math.max(longest, right - left + 1);
        steps.push({ right, left, c, maxFrequency, shrunk, longest });
      }
    }

    let idx;

    function renderArr(left, right) {
      arrHost.innerHTML = renderP1CharWindow(STR, left, right);
    }

    function reset() {
      idx = 0;
      renderArr(0, -1);
      logEl.textContent = 'left = 0. Expanding right one character at a time.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      renderArr(s.left, s.right);
      const shrinkNote = s.shrunk ? ` Window needed too many changes — shrunk left to ${s.left}.` : '';
      logEl.textContent = `right=${s.right} ("${s.c}"). Most frequent letter count so far: ${s.maxFrequency}.${shrinkNote} Window [${s.left}, ${s.right}]. Longest valid so far: ${s.longest}.`;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Scan done.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1MinWindow() {
    return `
    <div class="p0-section-title">Minimum Window Substring<span class="p1-badge hard">Hard</span></div>
    <div class="p0-section-sub">Sliding Window — problem 4</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get two strings, s and t. Find the <strong>shortest</strong> stretch of consecutive characters in s that contains every character of t — including repeats. For example if t has two "A"s, your window needs at least two "A"s in it too. If no such window exists, return an empty string.</p>
    </div>

    <div class="p0-card">
      <h4>What "contains every character" means</h4>
      <p>s = "DAOBECODEBANCDNK", t = "ABC" — the window "BANC" (indices 9-12) is the shortest stretch that contains an A, a B, and a C:</p>
      ${renderP1CharWindow('DAOBECODEBANCDNK', 9, 12)}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">Order doesn't matter and extra characters are fine ("N" is in the window too) — the only requirement is that every character t needs (with the right count) is present somewhere in the window.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you checked every possible substring of s directly and, for each one, verified it contains all of t's characters, what's the time complexity?<br>
      2. As you expand the window with a right pointer, how would you track "do I currently have enough of each required character," without rechecking every character in the window each time?<br>
      3. Once your window contains everything t needs, is it ever helpful to keep expanding right before trying to shrink from the left? Why shrink immediately instead of continuing to expand first?<br>
      4. When you shrink from the left and remove a character that t needs, at what exact point does the window stop being valid — and how do you detect that moment without recounting everything?</p>
    </div>

    ${renderP1Workflow('slidingWindow-minimumWindowSubstring.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — check every substring</h4>
        <p>Try every substring of s, build its character counts, and check if it satisfies every requirement from t. Keep the shortest one that qualifies.</p>
        <pre class="p0-code">function minWindow(s, t) {
  if (t === "") return "";
  const need = {};
  for (const c of t) need[c] = (need[c] || 0) + 1;
  let best = "";
  for (let i = 0; i &lt; s.length; i++) {
    const have = {};
    for (let j = i; j &lt; s.length; j++) {
      have[s[j]] = (have[s[j]] || 0) + 1;
      const ok = Object.keys(need).every(c =&gt; (have[c] || 0) &gt;= need[c]);
      if (ok) {
        const candidate = s.slice(i, j + 1);
        if (!best || candidate.length &lt; best.length) best = candidate;
        break;
      }
    }
  }
  return best;
}</pre>
        <p>Time: <strong>O(n² · |t|)</strong> — every start rescans forward, each check scans t's unique characters. Space: <strong>O(|t|)</strong> — the requirement map.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — sliding window with two frequency maps</h4>
        <p>Build a frequency map <code>countT</code> for t, and note <code>need</code> = how many <em>distinct</em> characters t requires. Expand the window with <code>right</code>, tracking a <code>window</code> frequency map and a counter <code>have</code> = how many of those distinct characters currently meet their required count. The moment <code>have === need</code>, the window is valid — immediately try shrinking from the left (recording the window each time it's the smallest valid one seen) until removing the left character would drop <code>have</code> below <code>need</code>. Then go back to expanding.</p>
        <pre class="p0-code">function minWindow(s, t) {
  if (t === "") return "";
  const countT = {};
  for (const c of t) countT[c] = (countT[c] || 0) + 1;
  const need = Object.keys(countT).length;
  const window = {};
  let have = 0, left = 0;
  let result = [-1, -1], resultLen = Infinity;
  for (let right = 0; right &lt; s.length; right++) {
    const c = s[right];
    window[c] = (window[c] || 0) + 1;
    if (countT[c] &amp;&amp; window[c] === countT[c]) have++;
    while (have === need) {
      if (right - left + 1 &lt; resultLen) {
        resultLen = right - left + 1;
        result = [left, right];
      }
      const lc = s[left];
      window[lc]--;
      if (countT[lc] &amp;&amp; window[lc] &lt; countT[lc]) have--;
      left++;
    }
  }
  return resultLen === Infinity ? "" : s.slice(result[0], result[1] + 1);
}</pre>
        <p>Time: <strong>O(|s| + |t|)</strong> — building <code>countT</code> is O(|t|), and <code>right</code>/<code>left</code> each move forward across s at most once. Space: <strong>O(|s| + |t|)</strong> in the worst case for the two frequency maps (constant if the alphabet is fixed, e.g. ASCII).</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — s = "ADOBECODEBANC", t = "ABC"</div>
        <div id="p1-mw-array" class="p0-arr-row" style="flex-wrap:wrap;row-gap:8px"></div>
        <div class="p0-sim-log" id="p1-mw-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-mw-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>t is longer than s, or needs more of a character than s has (e.g. s = "a", t = "aa"):</strong> no valid window exists — return "".<br>
        <strong>t is an empty string:</strong> no characters are required — the answer is "" (any window, including none, trivially "contains" nothing).<br>
        <strong>s is empty but t isn't:</strong> nothing to search — return "".<br>
        <strong>Multiple valid windows of the same minimum length:</strong> any one of them is an acceptable answer (the problem guarantees a unique answer only when the shortest length itself is unique, not the substring's content).</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (every substring)</td><td class="num">O(n²·|t|)</td><td class="num">O(|t|)</td></tr>
          <tr><td>Sliding window, two frequency maps</td><td class="num">O(|s| + |t|)</td><td class="num">O(|s| + |t|)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1MinWindowStepper() {
    const btn = document.getElementById('p1-mw-step-btn');
    if (!btn) return;
    const arrHost = document.getElementById('p1-mw-array');
    const logEl = document.getElementById('p1-mw-log');
    const STR = 'ADOBECODEBANC';
    const T = 'ABC';

    const steps = [];
    {
      const countT = {};
      for (const c of T) countT[c] = (countT[c] || 0) + 1;
      const need = Object.keys(countT).length;
      const window = {};
      let have = 0, left = 0;
      let result = [-1, -1], resultLen = Infinity;
      for (let right = 0; right < STR.length; right++) {
        const c = STR[right];
        window[c] = (window[c] || 0) + 1;
        if (countT[c] && window[c] === countT[c]) have++;
        let shrunkTo = null;
        while (have === need) {
          if (right - left + 1 < resultLen) {
            resultLen = right - left + 1;
            result = [left, right];
          }
          const lc = STR[left];
          window[lc]--;
          if (countT[lc] && window[lc] < countT[lc]) have--;
          left++;
          shrunkTo = left;
        }
        steps.push({ right, left, c, have, need, shrunkTo, result: [...result], resultLen });
      }
    }

    let idx;

    function renderArr(left, right) {
      arrHost.innerHTML = renderP1CharWindow(STR, left, right);
    }

    function reset() {
      idx = 0;
      renderArr(0, -1);
      logEl.textContent = `left = 0. Need all of "${T}" in the window.`;
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      renderArr(s.left, s.right);
      const best = s.resultLen === Infinity ? 'none yet' : `"${STR.slice(s.result[0], s.result[1] + 1)}" (length ${s.resultLen})`;
      const shrinkNote = s.shrunkTo !== null ? ` Valid — shrank left to ${s.shrunkTo}.` : '';
      logEl.textContent = `right=${s.right} ("${s.c}"). Have ${s.have}/${s.need} required characters.${shrinkNote} Best window so far: ${best}.`;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Scan done.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // Non-spoiler concept visual: colors each bracket by which partner it matches, computed
  // just for display. Shows "last opened, first closed" without naming the stack technique.
  function renderP1BracketPairs(str) {
    const PALETTE = ['#3b82f6', '#a855f7', '#f97316', '#22c55e', '#06b6d4', '#eab308', '#ef4444'];
    const openSet = new Set(['(', '[', '{']);
    const closeSet = new Set([')', ']', '}']);
    const matchOf = new Array(str.length).fill(null);
    const colorOf = new Array(str.length).fill(null);
    const pending = [];
    let ci = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (openSet.has(c)) {
        pending.push(i);
      } else if (closeSet.has(c) && pending.length) {
        const openIdx = pending.pop();
        const color = PALETTE[ci++ % PALETTE.length];
        colorOf[openIdx] = color;
        colorOf[i] = color;
      }
    }
    const chars = str.length ? str.split('') : [' '];
    return `<div class="p0-arr-row" style="gap:6px">${chars.map((ch, i) => {
      const color = colorOf[i] || 'rgba(255,255,255,0.25)';
      return `<div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:2px solid ${color};border-radius:6px;font-size:16px;font-family:monospace;font-weight:600">${ch === ' ' ? '␣' : escapeHtml(ch)}</div>`;
    }).join('')}</div>`;
  }

  // Row of characters with the current scan position highlighted.
  function renderP1CharRow(str, currentIdx) {
    const chars = str.length ? str.split('') : [' '];
    return `<div class="p0-arr-row" style="gap:6px">${chars.map((ch, i) => {
      const isCurrent = i === currentIdx;
      const bg = isCurrent ? '#3b82f6' : 'rgba(255,255,255,0.08)';
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:${bg};border-radius:4px;font-size:15px;font-family:monospace;font-weight:600">${ch === ' ' ? '␣' : escapeHtml(ch)}</div>
        <div style="font-size:9px;color:var(--sublabel)">${i}</div>
      </div>`;
    }).join('')}</div>`;
  }

  // Vertical box stack — newest pushed item drawn on top.
  function renderP1StackBoxes(stackArr) {
    if (!stackArr.length) {
      return `<div style="font-size:12px;color:var(--muted);padding:6px 0">(empty stack)</div>`;
    }
    return `<div style="display:flex;flex-direction:column;gap:4px;align-items:center">${stackArr.slice().reverse().map(c =>
      `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:rgba(59,130,246,0.35);border:2px solid #3b82f6;border-radius:6px;font-size:16px;font-family:monospace;font-weight:600">${escapeHtml(c)}</div>`
    ).join('')}</div>`;
  }

  function renderP1ValidParentheses() {
    return `
    <div class="p0-section-title">Valid Parentheses<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Stack — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a string made only of <strong>(</strong> <strong>)</strong> <strong>[</strong> <strong>]</strong> <strong>{</strong> <strong>}</strong>. Say whether the brackets are "balanced" — every open bracket has a matching close bracket of the <strong>same type</strong>, closed in the <strong>right order</strong>.</p>
    </div>

    <div class="p0-card">
      <h4>What "matching" means here</h4>
      <p>s = "{[()]}" — every bracket pairs up cleanly, so it's valid. Same color below means those two brackets match each other:</p>
      ${renderP1BracketPairs('{[()]}')}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">Notice the pairing is nested, not just "same count of each type." "([)]" has one of each bracket too, but it's still invalid — the order is wrong.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. When you hit a closing bracket, which open bracket is it allowed to match — any earlier one, or one specific one?<br>
      2. What's special about the <em>most recent</em> open bracket you haven't closed yet?<br>
      3. What data structure naturally hands you back "the most recent thing you added" first?<br>
      4. If you reach the end of the string and there are still open brackets waiting to be closed, is that valid?<br>
      5. What if you see a closing bracket but there's nothing open to match it against?</p>
    </div>

    ${renderP1Workflow('stack-validParentheses.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — repeatedly remove matched pairs</h4>
        <p>Keep deleting any "()", "[]", or "{}" you find, anywhere in the string. If the string is truly balanced, this whittles it all the way down to empty. If nothing changes on a pass and the string isn't empty, it can never become valid.</p>
        <pre class="p0-code">function isValid(s) {
  let prevLength;
  do {
    prevLength = s.length;
    s = s.replace('()', '').replace('[]', '').replace('{}', '');
  } while (s.length !== prevLength);
  return s.length === 0;
}</pre>
        <p>Time: <strong>O(n²)</strong> — each pass scans the string and up to n/2 passes may be needed. Space: <strong>O(n)</strong> — each <code>replace</code> builds a new string.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — one pass with a stack</h4>
        <p>Scan left to right. Every time you see an open bracket, push it. Every time you see a closing bracket, check the top of the stack — it must be the matching open bracket, or the string is invalid right away. Pop it if it matches. At the end, the stack must be completely empty — no open brackets left waiting.</p>
        <pre class="p0-code">function isValid(s) {
  const stack = [];
  const closeToOpen = { ')': '(', ']': '[', '}': '{' };
  for (const c of s) {
    if (closeToOpen[c]) {
      if (stack.length && stack[stack.length - 1] === closeToOpen[c]) {
        stack.pop();
      } else {
        return false;
      }
    } else {
      stack.push(c);
    }
  }
  return stack.length === 0;
}</pre>
        <p>Time: <strong>O(n)</strong> — one pass through the string. Space: <strong>O(n)</strong> — the stack, worst case all opens.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — s = "{[()]}"</div>
        <div id="p1-vpar-chars" class="p0-arr-row"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Stack (top = most recently opened, unmatched bracket)</div>
        <div id="p1-vpar-stack" style="min-height:120px"></div>
        <div class="p0-sim-log" id="p1-vpar-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-vpar-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty string:</strong> nothing to mismatch — valid.<br>
        <strong>Odd length:</strong> can never balance perfectly (not a required check — it falls out naturally, since one bracket is always left over).<br>
        <strong>Closing bracket with nothing open:</strong> stack is empty when you need to pop — invalid immediately.<br>
        <strong>Open brackets left at the end:</strong> stack isn't empty after the scan — invalid.<br>
        <strong>Right bracket types, wrong order:</strong> e.g. "([)]" — the top of the stack won't match the closing bracket you're looking at, even though every type appears the right number of times.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (remove pairs repeatedly)</td><td class="num">O(n²)</td><td class="num">O(n)</td></tr>
          <tr><td>Single-pass stack</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ValidParenthesesStepper() {
    const btn = document.getElementById('p1-vpar-step-btn');
    if (!btn) return;
    const charsHost = document.getElementById('p1-vpar-chars');
    const stackHost = document.getElementById('p1-vpar-stack');
    const logEl = document.getElementById('p1-vpar-log');
    const STR = '{[()]}';
    const closeToOpen = { ')': '(', ']': '[', '}': '{' };

    const steps = [];
    {
      const stack = [];
      for (let i = 0; i < STR.length; i++) {
        const c = STR[i];
        if (closeToOpen[c]) {
          const matched = stack.length > 0 && stack[stack.length - 1] === closeToOpen[c];
          if (matched) stack.pop();
          steps.push({ i, c, stack: [...stack], action: matched ? 'pop' : 'mismatch' });
        } else {
          stack.push(c);
          steps.push({ i, c, stack: [...stack], action: 'push' });
        }
      }
    }

    let idx;

    function render(i, stackArr) {
      charsHost.innerHTML = renderP1CharRow(STR, i);
      stackHost.innerHTML = renderP1StackBoxes(stackArr);
    }

    function reset() {
      idx = 0;
      render(-1, []);
      logEl.textContent = 'Scanning left to right. Stack starts empty.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      render(s.i, s.stack);
      if (s.action === 'push') {
        logEl.textContent = `Index ${s.i}: "${s.c}" is an open bracket — push it.`;
      } else if (s.action === 'pop') {
        logEl.textContent = `Index ${s.i}: "${s.c}" matches the top of the stack — pop it.`;
      } else {
        logEl.textContent = `Index ${s.i}: "${s.c}" does not match the top of the stack — invalid.`;
      }
      idx++;
      if (idx >= steps.length) {
        const finalValid = steps[steps.length - 1].action !== 'mismatch' && steps[steps.length - 1].stack.length === 0;
        logEl.textContent += ` Scan done. Stack is ${finalValid ? 'empty → valid.' : 'not empty or a mismatch occurred → invalid.'}`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // Non-spoiler concept visual: colors each number by which of the two ascending runs it
  // belongs to (the array is "glued" from two sorted pieces at the rotation point).
  function renderP1RotatedRuns(arr) {
    const COLORS = ['#3b82f6', '#f97316'];
    let runIdx = 0;
    const colorOf = arr.map((v, i) => {
      if (i > 0 && arr[i] < arr[i - 1]) runIdx = 1;
      return COLORS[runIdx];
    });
    return `<div class="p0-arr-row" style="gap:6px">${arr.map((v, i) =>
      `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:2px solid ${colorOf[i]};border-radius:6px;font-size:14px;font-family:monospace;font-weight:600">${v}</div>
        <div style="font-size:9px;color:var(--sublabel)">${i}</div>
      </div>`
    ).join('')}</div>`;
  }

  // l / mid / r pointer visual for the binary search stepper.
  function renderP1BinarySearchPointers(arr, l, mid, r, foundIdx) {
    return `<div class="p0-arr-row" style="gap:6px">${arr.map((v, i) => {
      let bg = 'rgba(255,255,255,0.08)';
      let label = String(i);
      if (i === foundIdx) { bg = '#22c55e'; label = 'found'; }
      else if (i === mid) { bg = '#3b82f6'; label = 'mid'; }
      else if (i === l) { bg = '#a855f7'; label = 'l'; }
      else if (i === r) { bg = '#f97316'; label = 'r'; }
      else if (l !== null && r !== null && (i < l || i > r)) { bg = 'rgba(255,255,255,0.03)'; }
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:${bg};border-radius:6px;font-size:14px;font-family:monospace;font-weight:600">${v}</div>
        <div style="font-size:9px;color:var(--sublabel)">${label}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderP1SearchRotated() {
    return `
    <div class="p0-section-title">Search in Rotated Sorted Array<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Binary Search — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You have an array that used to be sorted in ascending order, but it got "rotated" — cut at some point and the front piece moved to the back. Find the index of a target value, or return -1 if it isn't there. It must run in <strong>O(log n)</strong> — a plain linear scan isn't good enough.</p>
    </div>

    <div class="p0-card">
      <h4>What "rotated" looks like</h4>
      <p>nums = [4, 5, 6, 7, 0, 1, 2] — it isn't sorted end to end, but it's really just two sorted pieces glued together:</p>
      ${renderP1RotatedRuns([4, 5, 6, 7, 0, 1, 2])}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">Blue = one ascending run, orange = the other. That's the whole array: [4,5,6,7] then [0,1,2], stuck together.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. A plain linear scan finds the target fine — what's its time complexity, and why doesn't it satisfy this problem's requirement?<br>
      2. Pick any midpoint in this array. Is it possible for <strong>neither</strong> half (left of mid, right of mid) to be sorted?<br>
      3. Given <code>nums[l]</code>, <code>nums[mid]</code>, and <code>nums[r]</code>, how could you tell — with just comparisons, no loops — which half is the sorted one?<br>
      4. Once you know which half is sorted, how do you decide whether the target could be hiding in it, using just its two endpoint values?</p>
    </div>

    ${renderP1Workflow('searchInRotatedSortedArray.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — linear scan</h4>
        <p>Check every element one at a time until you find the target.</p>
        <pre class="p0-code">function search(nums, target) {
  for (let i = 0; i &lt; nums.length; i++) {
    if (nums[i] === target) return i;
  }
  return -1;
}</pre>
        <p>Time: <strong>O(n)</strong> — worst case checks every element. Space: <strong>O(1)</strong>.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — modified binary search</h4>
        <p>Same l/mid/r shrinking as normal binary search, but before deciding where to go, first work out which half is sorted. Whichever half is sorted, you can check its two endpoints directly to know if the target could be inside it — if not, discard that half and search the other one.</p>
        <pre class="p0-code">function search(nums, target) {
  let l = 0, r = nums.length - 1;
  while (l &lt;= r) {
    const mid = Math.floor((l + r) / 2);
    if (nums[mid] === target) return mid;
    if (nums[l] &lt;= nums[mid]) {
      if (target &gt; nums[mid] || target &lt; nums[l]) {
        l = mid + 1;
      } else {
        r = mid - 1;
      }
    } else {
      if (target &lt; nums[mid] || target &gt; nums[r]) {
        r = mid - 1;
      } else {
        l = mid + 1;
      }
    }
  }
  return -1;
}</pre>
        <p>Time: <strong>O(log n)</strong> — the search space halves every step, same as plain binary search. Space: <strong>O(1)</strong> — three integer pointers.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — nums = [4,5,6,7,0,1,2], target = 0</div>
        <div id="p1-sr-array" class="p0-arr-row" style="align-items:flex-end"></div>
        <div class="p0-sim-log" id="p1-sr-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-sr-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Not rotated at all:</strong> the whole array is one sorted run — this still works, since one "half" check just always passes.<br>
        <strong>Single element:</strong> l === r === mid immediately — one comparison decides it.<br>
        <strong>Target not present:</strong> l eventually crosses r and the loop ends — return -1.<br>
        <strong>Target at the rotation point itself:</strong> no special case needed — it's just whichever half nums[mid] happens to land in.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (linear scan)</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
          <tr><td>Modified binary search</td><td class="num">O(log n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1SearchRotatedStepper() {
    const btn = document.getElementById('p1-sr-step-btn');
    if (!btn) return;
    const arrHost = document.getElementById('p1-sr-array');
    const logEl = document.getElementById('p1-sr-log');
    const ARR = [4, 5, 6, 7, 0, 1, 2];
    const TARGET = 0;

    const steps = [];
    {
      let l = 0, r = ARR.length - 1;
      while (l <= r) {
        const mid = Math.floor((l + r) / 2);
        if (ARR[mid] === TARGET) {
          steps.push({ l, mid, r, found: mid });
          break;
        }
        const leftSorted = ARR[l] <= ARR[mid];
        let goLeft;
        if (leftSorted) {
          goLeft = !(TARGET > ARR[mid] || TARGET < ARR[l]);
        } else {
          goLeft = !(TARGET < ARR[mid] || TARGET > ARR[r]);
        }
        steps.push({ l, mid, r, leftSorted, goLeft, found: null });
        if (leftSorted) {
          if (goLeft) r = mid - 1; else l = mid + 1;
        } else {
          if (goLeft) r = mid - 1; else l = mid + 1;
        }
      }
    }

    let idx;

    function render(l, mid, r, found) {
      arrHost.innerHTML = renderP1BinarySearchPointers(ARR, l, mid, r, found);
    }

    function reset() {
      idx = 0;
      render(0, null, ARR.length - 1, null);
      logEl.textContent = `l = 0, r = ${ARR.length - 1}. Looking for target ${TARGET}.`;
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.found !== null) {
        render(s.l, s.mid, s.r, s.found);
        logEl.textContent = `mid = ${s.mid}. nums[mid] = ${ARR[s.mid]} — that's the target! Found at index ${s.found}.`;
      } else {
        render(s.l, s.mid, s.r, null);
        const sortedHalf = s.leftSorted ? 'left' : 'right';
        const decision = s.goLeft
          ? `target could be in the sorted ${sortedHalf} half — search there`
          : `target can't be in the sorted ${sortedHalf} half — search the other side`;
        logEl.textContent = `mid = ${s.mid} (value ${ARR[s.mid]}). The ${sortedHalf} half is sorted. ${decision}.`;
      }
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Search done.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1FindMinRotated() {
    return `
    <div class="p0-section-title">Find Minimum in Rotated Sorted Array<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Binary Search — problem 2</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>Same rotated-array setup as before, but now you just need the smallest value in the array — no target to search for. Must still run in <strong>O(log n)</strong>.</p>
    </div>

    <div class="p0-card">
      <h4>Where the minimum sits</h4>
      <p>nums = [3, 4, 5, 1, 2] — two sorted runs glued together, and the minimum is always the very first element of the second run:</p>
      ${renderP1RotatedRuns([3, 4, 5, 1, 2])}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">The minimum sits right where the array "drops" from the end of the blue run to the start of the orange run.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. A linear scan for the smallest value works fine — what's its time complexity, and why isn't it enough here?<br>
      2. Compare <code>nums[mid]</code> to <code>nums[r]</code> (the current rightmost value). If <code>nums[mid] &lt; nums[r]</code>, what does that tell you about whether the minimum is to the left of mid, or to the right?<br>
      3. In that same case, could <code>nums[mid]</code> itself be the minimum — should it stay in the search space or get dropped?<br>
      4. If instead <code>nums[mid] &gt;= nums[r]</code>, can <code>nums[mid]</code> possibly be the answer? What does that tell you about where to search next?</p>
    </div>

    ${renderP1Workflow('binarySearch-findMinimumInRotatedSortedArray.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — linear scan</h4>
        <p>Walk the whole array, tracking the smallest value seen.</p>
        <pre class="p0-code">function findMin(nums) {
  let min = nums[0];
  for (let i = 1; i &lt; nums.length; i++) {
    min = Math.min(min, nums[i]);
  }
  return min;
}</pre>
        <p>Time: <strong>O(n)</strong> — checks every element. Space: <strong>O(1)</strong>.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — binary search against the right endpoint</h4>
        <p>Compare <code>nums[mid]</code> to <code>nums[r]</code>. If <code>nums[mid] &lt; nums[r]</code>, the right half is sorted and mid could still be the minimum, so keep it in the search space and move r down to mid. Otherwise, the minimum must be strictly to the right of mid, so move l to mid + 1. Stop when l === r — that index holds the minimum.</p>
        <pre class="p0-code">function findMin(nums) {
  let l = 0, r = nums.length - 1;
  while (l &lt; r) {
    const m = l + Math.floor((r - l) / 2);
    if (nums[m] &lt; nums[r]) {
      r = m;
    } else {
      l = m + 1;
    }
  }
  return nums[l];
}</pre>
        <p>Time: <strong>O(log n)</strong> — the search space halves every step. Space: <strong>O(1)</strong> — two integer pointers.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — nums = [3, 4, 5, 1, 2]</div>
        <div id="p1-fm-array" class="p0-arr-row" style="align-items:flex-end"></div>
        <div class="p0-sim-log" id="p1-fm-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-fm-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Not rotated at all:</strong> nums[mid] is always less than nums[r], so r keeps shrinking down to index 0 — the correct answer.<br>
        <strong>Single element:</strong> l === r immediately, loop never runs — return nums[0].<br>
        <strong>Two elements:</strong> one comparison decides which of the two is smaller.<br>
        <strong>Minimum at index 0 (rotation point is the last index):</strong> still falls out correctly — no special case needed.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (linear scan)</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
          <tr><td>Binary search vs. right endpoint</td><td class="num">O(log n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1FindMinRotatedStepper() {
    const btn = document.getElementById('p1-fm-step-btn');
    if (!btn) return;
    const arrHost = document.getElementById('p1-fm-array');
    const logEl = document.getElementById('p1-fm-log');
    const ARR = [3, 4, 5, 1, 2];

    const steps = [];
    {
      let l = 0, r = ARR.length - 1;
      while (l < r) {
        const m = l + Math.floor((r - l) / 2);
        const goRight = ARR[m] < ARR[r];
        steps.push({ l, m, r, goRight });
        if (goRight) r = m; else l = m + 1;
      }
      steps.push({ l, r, done: true });
    }

    let idx;

    function render(l, mid, r, found) {
      arrHost.innerHTML = renderP1BinarySearchPointers(ARR, l, mid, r, found);
    }

    function reset() {
      idx = 0;
      render(0, null, ARR.length - 1, null);
      logEl.textContent = `l = 0, r = ${ARR.length - 1}. Narrowing down to the minimum.`;
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.done) {
        render(s.l, null, s.l, s.l);
        logEl.textContent = `l === r === ${s.l}. That's the minimum: nums[${s.l}] = ${ARR[s.l]}.`;
      } else {
        render(s.l, s.m, s.r, null);
        logEl.textContent = s.goRight
          ? `mid = ${s.m} (value ${ARR[s.m]}) < nums[r] = ${ARR[s.r]} — right half is sorted, mid could still be the min. r = mid.`
          : `mid = ${s.m} (value ${ARR[s.m]}) >= nums[r] = ${ARR[s.r]} — minimum must be to the right. l = mid + 1.`;
      }
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Search done.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // Plain chain of boxes with right-pointing arrows — no pointer state, just shows a list's shape.
  function renderP1LLChainSimple(values) {
    return `<div class="p0-arr-row" style="gap:4px;align-items:center">${values.map((v, i) =>
      `<div style="display:flex;align-items:center;gap:4px">
        <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.25);border-radius:6px;font-size:14px;font-family:monospace;font-weight:600">${v}</div>
        <div style="font-size:14px;color:var(--sublabel)">${i < values.length - 1 ? '→' : '→ null'}</div>
      </div>`
    ).join('')}</div>`;
  }

  // Each box shows its current next-pointer target underneath — accurately reflects mid-reversal state.
  function renderP1LLPointers(values, nextOf, prevIdx, currIdx) {
    return `<div class="p0-arr-row" style="gap:14px;align-items:flex-start">${values.map((v, i) => {
      let border = 'rgba(255,255,255,0.25)';
      let roleLabel = '';
      if (i === prevIdx) { border = '#a855f7'; roleLabel = 'prev'; }
      if (i === currIdx) { border = '#3b82f6'; roleLabel = 'curr'; }
      const target = nextOf[i];
      const targetLabel = target === null ? '∅' : String(values[target]);
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
        <div style="font-size:9px;color:var(--sublabel);height:11px">${roleLabel}</div>
        <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:2px solid ${border};border-radius:6px;font-size:14px;font-family:monospace;font-weight:600">${v}</div>
        <div style="font-size:9px;color:var(--sublabel)">next→${targetLabel}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderP1ReverseLinkedList() {
    return `
    <div class="p0-section-title">Reverse Linked List<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Linked List — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You're given the head of a singly linked list. Reverse the direction of every link and return the new head — the old tail becomes the new head, and every node's <code>next</code> pointer now points to what used to be before it.</p>
    </div>

    <div class="p0-card">
      <h4>What "reversed" means here</h4>
      <p>head = [1, 2, 3, 4, 5] becomes [5, 4, 3, 2, 1] — same nodes, every arrow flipped:</p>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
        <div><div class="p0-diagram-label">Original</div>${renderP1LLChainSimple([1, 2, 3, 4, 5])}</div>
        <div><div class="p0-diagram-label">Reversed</div>${renderP1LLChainSimple([5, 4, 3, 2, 1])}</div>
      </div>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. You could walk the list and build a brand new one by prepending each value as you go — what's the time and space complexity of that approach?<br>
      2. If instead you want to reuse the existing nodes and just flip their <code>next</code> pointers in place, what do you need to save <strong>before</strong> you overwrite a node's <code>next</code>, so you don't lose the rest of the list?<br>
      3. What three pointers do you need to track as you walk forward, and what should each one point to right before you take a step?<br>
      4. What should the original head's <code>next</code> pointer become once it's reversed — and what does that tell you about your starting value for "the node before the first one"?</p>
    </div>

    ${renderP1Workflow('linkedList-reverseLinkedList.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — collect values, build a new reversed list</h4>
        <p>Walk the original list, collect every value into an array, reverse the array, then build a brand new linked list from it.</p>
        <pre class="p0-code">function reverseList(head) {
  const vals = [];
  let node = head;
  while (node) { vals.push(node.val); node = node.next; }
  vals.reverse();
  const dummy = new ListNode();
  let tail = dummy;
  for (const v of vals) {
    tail.next = new ListNode(v);
    tail = tail.next;
  }
  return dummy.next;
}</pre>
        <p>Time: <strong>O(n)</strong> — two passes over the list. Space: <strong>O(n)</strong> — the array plus a whole new set of nodes.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — reverse pointers in place</h4>
        <p>Walk the original nodes once. At each node, save its <code>next</code> before overwriting it, point it back at <code>prev</code>, then slide both <code>prev</code> and <code>curr</code> forward one step. <code>prev</code> starts at <code>null</code>, since the new tail (old head) must end up pointing at nothing.</p>
        <pre class="p0-code">function reverseList(head) {
  let prev = null;
  let curr = head;
  while (curr !== null) {
    const temp = curr.next;
    curr.next = prev;
    prev = curr;
    curr = temp;
  }
  return prev;
}</pre>
        <p>Time: <strong>O(n)</strong> — one pass. Space: <strong>O(1)</strong> — just three pointers, no new nodes.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — head = [1, 2, 3, 4, 5]</div>
        <div id="p1-rl-array" class="p0-arr-row"></div>
        <div class="p0-sim-log" id="p1-rl-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-rl-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty list:</strong> head is null — return null immediately, the loop never runs.<br>
        <strong>Single node:</strong> its next was already null, becomes prev = that node, curr = null — loop ends after one step, correct.<br>
        <strong>Two nodes:</strong> confirms the pointer juggling order matters — save next before overwriting, or you lose the rest of the list.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (collect + rebuild)</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
          <tr><td>In-place pointer reversal</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ReverseLinkedListStepper() {
    const btn = document.getElementById('p1-rl-step-btn');
    if (!btn) return;
    const arrHost = document.getElementById('p1-rl-array');
    const logEl = document.getElementById('p1-rl-log');
    const VALUES = [1, 2, 3, 4, 5];
    const n = VALUES.length;

    const initialNextOf = VALUES.map((_, i) => (i < n - 1 ? i + 1 : null));
    const steps = [];
    {
      const nextOf = [...initialNextOf];
      let prevIdx = null;
      for (let c = 0; c < n; c++) {
        const prevBefore = prevIdx;
        const tempNext = nextOf[c];
        nextOf[c] = prevBefore;
        prevIdx = c;
        steps.push({ processedIdx: c, prevBefore, newCurr: tempNext, nextOfSnapshot: [...nextOf] });
      }
    }

    let idx;

    function render(nextOf, prevIdx, currIdx) {
      arrHost.innerHTML = renderP1LLPointers(VALUES, nextOf, prevIdx, currIdx);
    }

    function reset() {
      idx = 0;
      render(initialNextOf, null, 0);
      logEl.textContent = 'prev = null, curr = head (node 1). Nothing reversed yet.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      render(s.nextOfSnapshot, s.processedIdx, s.newCurr);
      const prevLabel = s.prevBefore === null ? 'null' : VALUES[s.prevBefore];
      const currLabel = s.newCurr === null ? 'null' : VALUES[s.newCurr];
      logEl.textContent = `Node ${VALUES[s.processedIdx]}: point its next pointer back to ${prevLabel}. prev now = ${VALUES[s.processedIdx]}, curr moves to ${currLabel}.`;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ` curr is null — reversal complete. New head is node ${VALUES[n - 1]}.`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // slow/fast pointer visual — a box can carry both labels at once (that's the "they met" moment).
  function renderP1CyclePointers(values, nextOf, slowIdx, fastIdx) {
    return `<div class="p0-arr-row" style="gap:14px;align-items:flex-start">${values.map((v, i) => {
      let border = 'rgba(255,255,255,0.25)';
      let roleLabel = '';
      const isSlow = i === slowIdx, isFast = i === fastIdx;
      if (isSlow && isFast) { border = '#22c55e'; roleLabel = 'slow, fast'; }
      else if (isSlow) { border = '#a855f7'; roleLabel = 'slow'; }
      else if (isFast) { border = '#3b82f6'; roleLabel = 'fast'; }
      const target = nextOf[i];
      const targetLabel = target === null ? '∅' : String(values[target]);
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
        <div style="font-size:9px;color:var(--sublabel);height:11px">${roleLabel}</div>
        <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:2px solid ${border};border-radius:6px;font-size:14px;font-family:monospace;font-weight:600">${v}</div>
        <div style="font-size:9px;color:var(--sublabel)">next→${targetLabel}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderP1LinkedListCycle() {
    return `
    <div class="p0-section-title">Linked List Cycle<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Linked List — problem 2</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get the head of a linked list. Somewhere in it, the last node's <code>next</code> pointer might loop back to an earlier node instead of ending at <code>null</code>. Return <code>true</code> if there's a loop like that anywhere, <code>false</code> if the list just ends normally.</p>
    </div>

    <div class="p0-card">
      <h4>What a cycle looks like</h4>
      <p>head = [3, 2, 0, -4], and the tail (-4) loops back to index 1 (value 2) instead of pointing to null:</p>
      ${renderP1CyclePointers([3, 2, 0, -4], [1, 2, 3, 1], null, null)}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">Notice the last node's "next→" doesn't say ∅ — it points back into the list. Walking forward from here, you'd never reach the end; you'd just keep looping 2 → 0 → -4 → 2 → 0 → -4 forever.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you kept a Set of every node you've already visited and checked each new node against it, what's the time and space complexity? Does it correctly catch a cycle?<br>
      2. Can you detect a cycle using just two pointers and no extra data structure — one moving one step at a time, the other moving two steps at a time? What happens to the gap between them, loop after loop, if there <strong>is</strong> a cycle?<br>
      3. If there's <strong>no</strong> cycle, what should stop your loop before you run off the end of the list?<br>
      4. Could the faster pointer ever "jump over" the slower one and skip past it, missing the meeting point entirely?</p>
    </div>

    ${renderP1Workflow('linkedList-linkedListCycle.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — track visited nodes in a Set</h4>
        <p>Walk the list one node at a time. Before moving on, check if you've already seen this exact node. If you have, there's a cycle. If you reach null first, there isn't.</p>
        <pre class="p0-code">function hasCycle(head) {
  const seen = new Set();
  let node = head;
  while (node) {
    if (seen.has(node)) return true;
    seen.add(node);
    node = node.next;
  }
  return false;
}</pre>
        <p>Time: <strong>O(n)</strong> — each node visited once. Space: <strong>O(n)</strong> — the Set can hold every node.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — Floyd's slow &amp; fast pointers</h4>
        <p>Move <code>slow</code> one step and <code>fast</code> two steps, every iteration. If there's no cycle, <code>fast</code> reaches the end first and the loop stops. If there is a cycle, <code>fast</code> is gaining on <code>slow</code> by one extra step every loop — it's guaranteed to eventually land on the exact same node as <code>slow</code>.</p>
        <pre class="p0-code">function hasCycle(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    fast = fast.next.next;
    slow = slow.next;
    if (fast === slow) return true;
  }
  return false;
}</pre>
        <p>Time: <strong>O(n)</strong> — fast catches up within one full loop of the cycle. Space: <strong>O(1)</strong> — just two pointers.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — [3, 2, 0, -4], tail loops back to value 2</div>
        <div id="p1-lc-array" class="p0-arr-row"></div>
        <div class="p0-sim-log" id="p1-lc-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-lc-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty list:</strong> head is null — the while condition fails immediately, return false.<br>
        <strong>Single node, no self-loop:</strong> fast.next is null right away — no cycle.<br>
        <strong>Single node that points to itself:</strong> fast and slow both land back on that same node — cycle detected.<br>
        <strong>Cycle at the very end vs. cycle including the head:</strong> doesn't matter where the loop starts — slow and fast still meet inside it either way.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (visited Set)</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
          <tr><td>Floyd's slow &amp; fast pointers</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1LinkedListCycleStepper() {
    const btn = document.getElementById('p1-lc-step-btn');
    if (!btn) return;
    const arrHost = document.getElementById('p1-lc-array');
    const logEl = document.getElementById('p1-lc-log');
    const VALUES = [3, 2, 0, -4];
    const NEXT_OF = [1, 2, 3, 1]; // tail (index 3) loops back to index 1

    const steps = [];
    {
      let slow = 0, fast = 0;
      while (fast !== null && NEXT_OF[fast] !== null) {
        fast = NEXT_OF[NEXT_OF[fast]];
        slow = NEXT_OF[slow];
        steps.push({ slow, fast, met: fast === slow });
        if (fast === slow) break;
      }
    }

    let idx;

    function render(slowIdx, fastIdx) {
      arrHost.innerHTML = renderP1CyclePointers(VALUES, NEXT_OF, slowIdx, fastIdx);
    }

    function reset() {
      idx = 0;
      render(0, 0);
      logEl.textContent = 'slow = fast = head (value 3). Start moving slow ×1, fast ×2.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      render(s.slow, s.fast);
      logEl.textContent = s.met
        ? `slow lands on value ${VALUES[s.slow]}, fast lands on value ${VALUES[s.fast]} — they match! Cycle confirmed.`
        : `slow moves to value ${VALUES[s.slow]}, fast moves to value ${VALUES[s.fast]} — not equal yet, keep going.`;
      idx++;
      if (idx >= steps.length) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // A labeled row of boxes with an optional highlighted pointer index.
  function renderP1MergeRow(label, arr, ptr, resultStyle) {
    const boxes = arr.length
      ? arr.map((v, i) => {
          const isPtr = i === ptr;
          const bg = resultStyle ? 'rgba(34,197,94,0.2)' : (isPtr ? '#3b82f6' : 'rgba(255,255,255,0.08)');
          const border = resultStyle ? '#22c55e' : (isPtr ? '#3b82f6' : 'rgba(255,255,255,0.25)');
          return `<div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:${bg};border:2px solid ${border};border-radius:6px;font-size:14px;font-family:monospace;font-weight:600">${v}</div>`;
        }).join('')
      : `<div style="font-size:12px;color:var(--muted)">(empty)</div>`;
    return `<div style="margin-bottom:8px"><div style="font-size:11px;color:var(--sublabel);margin-bottom:4px">${escapeHtml(label)}</div><div class="p0-arr-row" style="gap:6px">${boxes}</div></div>`;
  }

  function renderP1MergeState(list1, list2, i, j, merged, label1, label2) {
    return renderP1MergeRow(label1 || 'list1', list1, i, false)
      + renderP1MergeRow(label2 || 'list2', list2, j, false)
      + renderP1MergeRow('Merged so far', merged, null, true);
  }

  function renderP1MergeTwoLists() {
    return `
    <div class="p0-section-title">Merge Two Sorted Lists<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Linked List — problem 3</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get two linked lists, each already sorted in ascending order. Merge them into a single sorted list, reusing the existing nodes (don't build brand new ones), and return the head.</p>
    </div>

    <div class="p0-card">
      <h4>What "merge" means here</h4>
      <p>list1 = [1, 2, 4], list2 = [1, 3, 4] → merged = [1, 1, 2, 3, 4, 4]:</p>
      ${renderP1LLChainSimple([1, 2, 4])}
      ${renderP1LLChainSimple([1, 3, 4])}
      <p style="margin-top:6px;font-size:12.5px;color:var(--sublabel)">Every value from both lists appears in the result, in sorted order — nothing added, nothing dropped, nothing left out.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you dumped every value from both lists into one array and sorted it, what's the time complexity? Does it use the fact that both lists were already sorted?<br>
      2. Since both lists are already sorted, at any moment, where could the next-smallest overall value possibly be — anywhere in either list, or only at the very front of each?<br>
      3. What happens once one list runs out before the other? Do you need to keep comparing, or is there a shortcut?<br>
      4. Would using a "dummy" placeholder head node before you start make it easier to always have something to attach the next node to?</p>
    </div>

    ${renderP1Workflow('linkedList-mergeTwoSortedLists.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — collect all values, sort, rebuild</h4>
        <p>Walk both lists, dump every value into one array, sort it, then build a new list from the sorted array.</p>
        <pre class="p0-code">function mergeTwoLists(list1, list2) {
  const vals = [];
  for (let n = list1; n; n = n.next) vals.push(n.val);
  for (let n = list2; n; n = n.next) vals.push(n.val);
  vals.sort((a, b) => a - b);
  const dummy = new ListNode();
  let tail = dummy;
  for (const v of vals) {
    tail.next = new ListNode(v);
    tail = tail.next;
  }
  return dummy.next;
}</pre>
        <p>Time: <strong>O((n+m) log(n+m))</strong> — the sort dominates, and it ignores that both lists were already sorted. Space: <strong>O(n+m)</strong> — the array plus a whole new set of nodes.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — splice nodes with two pointers</h4>
        <p>Use a dummy head so there's always something to attach to. Compare the front of each list, splice the smaller node onto the result, and advance only that list's pointer. Once one list runs out, the other is already sorted — just attach the rest of it directly.</p>
        <pre class="p0-code">function mergeTwoLists(list1, list2) {
  const dummy = { val: 0, next: null };
  let node = dummy;
  while (list1 && list2) {
    if (list1.val < list2.val) {
      node.next = list1;
      list1 = list1.next;
    } else {
      node.next = list2;
      list2 = list2.next;
    }
    node = node.next;
  }
  node.next = list1 ? list1 : list2;
  return dummy.next;
}</pre>
        <p>Time: <strong>O(n + m)</strong> — one pass through both lists combined. Space: <strong>O(1)</strong> — reuses existing nodes, only the dummy is extra.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — list1 = [1,2,4], list2 = [1,3,4]</div>
        <div id="p1-mg-state"></div>
        <div class="p0-sim-log" id="p1-mg-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-mg-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Both lists empty:</strong> the while loop never runs, and both pointers are null — return null.<br>
        <strong>One list empty:</strong> the while loop never runs — the non-empty list gets attached whole, unchanged.<br>
        <strong>Equal values at the front of both lists:</strong> the comparison's tie-break (using <code>&lt;</code>, not <code>&lt;=</code>) decides which one goes first — either order is valid since the values are equal.<br>
        <strong>One list fully drained mid-merge:</strong> no need to keep comparing — attach whatever's left of the other list directly, it's already sorted.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (collect + sort + rebuild)</td><td class="num">O((n+m) log(n+m))</td><td class="num">O(n+m)</td></tr>
          <tr><td>Two-pointer splice</td><td class="num">O(n+m)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1MergeTwoListsStepper() {
    const btn = document.getElementById('p1-mg-step-btn');
    if (!btn) return;
    const stateHost = document.getElementById('p1-mg-state');
    const logEl = document.getElementById('p1-mg-log');
    const LIST1 = [1, 2, 4];
    const LIST2 = [1, 3, 4];

    const steps = [];
    {
      let i = 0, j = 0;
      const merged = [];
      while (i < LIST1.length && j < LIST2.length) {
        if (LIST1[i] < LIST2[j]) {
          merged.push(LIST1[i]);
          i++;
        } else {
          merged.push(LIST2[j]);
          j++;
        }
        steps.push({ i, j, merged: [...merged], done: false });
      }
      while (i < LIST1.length) { merged.push(LIST1[i]); i++; steps.push({ i, j, merged: [...merged], done: false }); }
      while (j < LIST2.length) { merged.push(LIST2[j]); j++; steps.push({ i, j, merged: [...merged], done: false }); }
      steps.push({ i, j, merged: [...merged], done: true });
    }

    let idx;

    function render(i, j, merged) {
      stateHost.innerHTML = renderP1MergeState(LIST1, LIST2, i < LIST1.length ? i : null, j < LIST2.length ? j : null, merged);
    }

    function reset() {
      idx = 0;
      render(0, 0, []);
      logEl.textContent = 'i = 0, j = 0. Compare the fronts of both lists.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      render(s.i, s.j, s.merged);
      if (s.done) {
        logEl.textContent = `Merge complete: [${s.merged.join(', ')}].`;
      } else {
        const justAdded = s.merged[s.merged.length - 1];
        logEl.textContent = `Attach ${justAdded} to the merged list. i = ${s.i}, j = ${s.j}.`;
      }
      idx++;
      if (idx >= steps.length) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // Non-spoiler concept visual: just highlights which node "n-th from the end" refers to.
  function renderP1NthFromEndHighlight(values, n) {
    const targetIdx = values.length - n;
    const label = n === 1 ? 'last node' : `${n}th from end`;
    return `<div class="p0-arr-row" style="gap:4px;align-items:flex-start">${values.map((v, i) => {
      const isTarget = i === targetIdx;
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
        <div style="font-size:9px;color:#ef4444;visibility:${isTarget ? 'visible' : 'hidden'}">${label}</div>
        <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:2px solid ${isTarget ? '#ef4444' : 'rgba(255,255,255,0.25)'};border-radius:6px;font-size:14px;font-family:monospace;font-weight:600">${v}</div>
      </div>`;
    }).join('')}</div>`;
  }

  // left/right pointer visual with a dummy "D" node at the front, and an optional removed-node highlight.
  function renderP1RemoveNthPointers(display, leftIdx, rightIdx, removedIdx) {
    return `<div class="p0-arr-row" style="gap:10px;align-items:flex-start">${display.map((v, i) => {
      let border = 'rgba(255,255,255,0.25)';
      let bg = 'rgba(255,255,255,0.08)';
      let label = '';
      if (i === removedIdx) { border = '#ef4444'; bg = 'rgba(239,68,68,0.15)'; label = 'remove'; }
      if (i === leftIdx) { border = '#a855f7'; label = label ? label + ', left' : 'left'; }
      if (i === rightIdx) { border = '#3b82f6'; label = label ? label + ', right' : 'right'; }
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="font-size:9px;color:var(--sublabel);height:11px">${label}</div>
        <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:${bg};border:2px solid ${border};border-radius:6px;font-size:14px;font-family:monospace;font-weight:600">${v}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderP1RemoveNthFromEnd() {
    return `
    <div class="p0-section-title">Remove Nth Node From End of List<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Linked List — problem 4</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get the head of a linked list and a number <code>n</code>. Remove the node that sits <code>n</code> positions from the <strong>end</strong> of the list (not the front), and return the (possibly new) head. You don't know the list's length ahead of time.</p>
    </div>

    <div class="p0-card">
      <h4>What "nth from the end" means here</h4>
      <p>head = [1, 2, 3, 4, 5], n = 2 — counting from the end, node 4 is the 2nd one, so it gets removed, leaving [1, 2, 3, 5]:</p>
      ${renderP1NthFromEndHighlight([1, 2, 3, 4, 5], 2)}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">Counting from the end is easy once you know the length. The trick is doing it without knowing the length up front, or without walking the list twice.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you first walked the whole list once to count its length, then walked again to the right spot, what's the time complexity? How many total passes is that?<br>
      2. Could you find "n-th from the end" in a single pass, using two pointers with a fixed gap of <code>n</code> nodes between them?<br>
      3. If one pointer starts <code>n</code> steps ahead of the other and they move together, what's true about the trailing pointer the moment the leading one falls off the end?<br>
      4. What could go wrong if you need to remove the <strong>head</strong> itself — why might a dummy node placed before the head make that case simpler?</p>
    </div>

    ${renderP1Workflow('linkedList-removeNthFromEnd.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — count the length first, two passes</h4>
        <p>Walk the list once to count its total length. Then walk again to the node right before the target (position <code>length − n − 1</code>), and skip over the target.</p>
        <pre class="p0-code">function removeNthFromEnd(head, n) {
  let length = 0;
  for (let node = head; node; node = node.next) length++;
  const dummy = new ListNode(0, head);
  let curr = dummy;
  for (let i = 0; i < length - n; i++) curr = curr.next;
  curr.next = curr.next.next;
  return dummy.next;
}</pre>
        <p>Time: <strong>O(n)</strong> — still linear, but it's <em>two full passes</em> over the list instead of one. Space: <strong>O(1)</strong>. Not a worse Big-O than the optimal version — just less elegant, and it needs the length known before the second pass can even start.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — one pass, two pointers with a fixed gap</h4>
        <p>Use a dummy node before the head so removing the actual head is no different from removing any other node. Move <code>right</code> forward <code>n</code> steps first, opening up a gap of exactly <code>n</code> nodes. Then move <code>left</code> and <code>right</code> forward together. When <code>right</code> falls off the end (becomes null), <code>left</code> is sitting exactly one node before the target — skip it.</p>
        <pre class="p0-code">function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);
  let left = dummy;
  let right = head;
  while (n > 0) {
    right = right.next;
    n--;
  }
  while (right !== null) {
    left = left.next;
    right = right.next;
  }
  left.next = left.next.next;
  return dummy.next;
}</pre>
        <p>Time: <strong>O(n)</strong> — one pass, right pointer touches each node once. Space: <strong>O(1)</strong> — two pointers plus the dummy.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — head = [1,2,3,4,5], n = 2 (D = dummy node)</div>
        <div id="p1-rn-array" class="p0-arr-row"></div>
        <div class="p0-sim-log" id="p1-rn-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-rn-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Removing the head (n === length):</strong> the gap-building phase pushes <code>right</code> all the way past the list, so the together-phase never moves <code>left</code> off the dummy — it stays there and correctly skips the real head.<br>
        <strong>Single-node list, n = 1:</strong> right becomes null immediately after the gap phase, left stays at dummy, dummy.next.next becomes null — list is empty.<br>
        <strong>n equals the list length exactly:</strong> covered by the head-removal case above, no special handling needed.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (count length, two passes)</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
          <tr><td>Two-pointer gap, one pass</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1RemoveNthFromEndStepper() {
    const btn = document.getElementById('p1-rn-step-btn');
    if (!btn) return;
    const arrHost = document.getElementById('p1-rn-array');
    const logEl = document.getElementById('p1-rn-log');
    const VALUES = [1, 2, 3, 4, 5];
    const N = 2;
    const DISPLAY = ['D', ...VALUES]; // index 0 = dummy, index i = VALUES[i-1]

    const steps = [];
    {
      let leftIdx = 0, rightIdx = 1;
      for (let k = 0; k < N; k++) {
        rightIdx++;
        steps.push({ phase: 'gap', leftIdx, rightIdx });
      }
      while (rightIdx <= DISPLAY.length - 1) {
        leftIdx++;
        rightIdx++;
        steps.push({ phase: 'together', leftIdx, rightIdx: rightIdx <= DISPLAY.length - 1 ? rightIdx : null });
      }
      const removedIdx = leftIdx + 1;
      steps.push({ phase: 'remove', leftIdx, rightIdx: null, removedIdx });
    }

    let idx;

    function render(leftIdx, rightIdx, removedIdx) {
      arrHost.innerHTML = renderP1RemoveNthPointers(DISPLAY, leftIdx, rightIdx, removedIdx);
    }

    function reset() {
      idx = 0;
      render(0, 1, null);
      logEl.textContent = `left = D (dummy), right = head (${VALUES[0]}). Build a gap of ${N} nodes first.`;
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      render(s.leftIdx, s.rightIdx, s.removedIdx);
      if (s.phase === 'gap') {
        logEl.textContent = `Move right forward to build the gap. right now at ${DISPLAY[s.rightIdx]}.`;
      } else if (s.phase === 'together') {
        const rightLabel = s.rightIdx === null ? 'null' : DISPLAY[s.rightIdx];
        logEl.textContent = `Move both pointers one step. left now at ${DISPLAY[s.leftIdx]}, right now at ${rightLabel}.`;
      } else {
        logEl.textContent = `right is null — left (${DISPLAY[s.leftIdx]}) is right before the target. Skip node ${DISPLAY[s.removedIdx]}: left.next = left.next.next.`;
      }
      idx++;
      if (idx >= steps.length) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1ReorderList() {
    return `
    <div class="p0-section-title">Reorder List<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Linked List — problem 5</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get the head of a linked list L0 → L1 → … → Ln. Rearrange it in place into L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → … — alternating one node from the front, one from the back, working inward. You can't change the values, only re-link the nodes.</p>
    </div>

    <div class="p0-card">
      <h4>What the reordering looks like</h4>
      <p>head = [1, 2, 3, 4, 5] → reordered = [1, 5, 2, 4, 3] — front and back, alternating, folding toward the middle:</p>
      ${renderP1LLChainSimple([1, 2, 3, 4, 5])}
      ${renderP1LLChainSimple([1, 5, 2, 4, 3])}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you collected every node into an array first, then rebuilt the list by alternating from the front and back of that array, what's the time and space complexity?<br>
      2. The final order keeps grabbing "the next node from the back half." What would make grabbing from the back just as easy as grabbing from the front — instead of having to walk backward each time?<br>
      3. If you split the list at its middle and reversed only the second half, would both halves then be walkable in the same direction (forward)?<br>
      4. How do you find the middle of a singly linked list in a single pass, without knowing its length ahead of time?</p>
    </div>

    ${renderP1Workflow('linkedList-reorderLinkedList.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — collect into an array, relink by index</h4>
        <p>Walk the list once, storing every node reference in an array. Then walk the array with one pointer from the front and one from the back, relinking <code>next</code> pointers as you alternate between them.</p>
        <pre class="p0-code">function reorderList(head) {
  const nodes = [];
  for (let n = head; n; n = n.next) nodes.push(n);
  let i = 0, j = nodes.length - 1;
  while (i < j) {
    nodes[i].next = nodes[j];
    i++;
    if (i === j) break;
    nodes[j].next = nodes[i];
    j--;
  }
  nodes[i].next = null;
}</pre>
        <p>Time: <strong>O(n)</strong> — one pass to collect, one pass to relink. Space: <strong>O(n)</strong> — the array holds a reference to every node.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — find middle, reverse second half, merge alternately</h4>
        <p>Three in-place steps: (1) use slow/fast pointers to find the middle and split the list into two halves; (2) reverse the second half, so it can now be walked forward from what used to be the tail; (3) merge the two halves by alternately splicing one node from each.</p>
        <pre class="p0-code">function reorderList(head) {
  let slow = head, fast = head.next;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  let second = slow.next;
  slow.next = null;
  let prev = null;
  while (second) {
    const tmp = second.next;
    second.next = prev;
    prev = second;
    second = tmp;
  }
  let first = head;
  second = prev;
  while (second) {
    const t1 = first.next, t2 = second.next;
    first.next = second;
    second.next = t1;
    first = t1;
    second = t2;
  }
}</pre>
        <p>Time: <strong>O(n)</strong> — each of the three steps is a single pass. Space: <strong>O(1)</strong> — everything is re-linked in place, no extra storage.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — head = [1, 2, 3, 4, 5]</div>
        <div id="p1-ro-state"></div>
        <div class="p0-sim-log" id="p1-ro-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-ro-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Single node:</strong> nothing to reorder — it's already its own answer.<br>
        <strong>Two nodes:</strong> the middle-finding stops immediately, the "second half" is just the one tail node, reversing a single node does nothing, and merging attaches it right back where it was.<br>
        <strong>Odd-length list:</strong> the first half ends up one node longer than the (reversed) second half — that extra middle node naturally ends up last, since its own <code>next</code> was already set to null when the list was split.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (collect into array)</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
          <tr><td>Find middle + reverse + merge, in place</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ReorderListStepper() {
    const btn = document.getElementById('p1-ro-step-btn');
    if (!btn) return;
    const stateHost = document.getElementById('p1-ro-state');
    const logEl = document.getElementById('p1-ro-log');
    const VALUES = [1, 2, 3, 4, 5];
    const n = VALUES.length;

    // Phase 1: find the middle (same slow/fast shape as Linked List Cycle, non-cyclic here)
    const forwardNextOf = VALUES.map((_, i) => (i < n - 1 ? i + 1 : null));
    const phase1Steps = [];
    {
      let slow = 0, fast = 1;
      while (fast !== null && forwardNextOf[fast] !== null) {
        slow = forwardNextOf[slow];
        fast = forwardNextOf[forwardNextOf[fast]];
        phase1Steps.push({ phase: 'findMiddle', slow, fast });
      }
    }
    const middleIdx = phase1Steps.length ? phase1Steps[phase1Steps.length - 1].slow : 0;
    const firstHalf = VALUES.slice(0, middleIdx + 1);
    const secondHalf = VALUES.slice(middleIdx + 1);

    // Phase 2: reverse the second half (same shape as Reverse Linked List)
    const m = secondHalf.length;
    const phase2Steps = [];
    let reversedSecondHalf = [];
    {
      const initialNextOf = secondHalf.map((_, i) => (i < m - 1 ? i + 1 : null));
      const nextOf = [...initialNextOf];
      let prevIdx = null;
      for (let c = 0; c < m; c++) {
        const tempNext = nextOf[c];
        nextOf[c] = prevIdx;
        prevIdx = c;
        phase2Steps.push({ phase: 'reverseSecond', processedIdx: c, newCurr: tempNext, nextOfSnapshot: [...nextOf] });
      }
      let cur = m > 0 ? prevIdx : null;
      const finalNextOf = phase2Steps.length ? phase2Steps[phase2Steps.length - 1].nextOfSnapshot : [];
      while (cur !== null) { reversedSecondHalf.push(secondHalf[cur]); cur = finalNextOf[cur]; }
    }

    // Phase 3: merge the two halves alternately (same shape as Merge Two Sorted Lists)
    const phase3Steps = [];
    {
      const merged = [];
      const lim = Math.min(firstHalf.length, reversedSecondHalf.length);
      for (let k = 0; k < lim; k++) {
        merged.push(firstHalf[k]);
        merged.push(reversedSecondHalf[k]);
        phase3Steps.push({ phase: 'merge', type: 'pair', i: k + 1, j: k + 1, merged: [...merged] });
      }
      if (firstHalf.length > reversedSecondHalf.length) {
        merged.push(...firstHalf.slice(reversedSecondHalf.length));
        phase3Steps.push({ phase: 'merge', type: 'leftover', i: firstHalf.length, j: reversedSecondHalf.length, merged: [...merged] });
      }
    }

    const steps = [...phase1Steps, ...phase2Steps, ...phase3Steps];
    let idx;

    function render() {
      if (idx === 0) {
        stateHost.innerHTML = renderP1CyclePointers(VALUES, forwardNextOf, 0, 1);
        return;
      }
      const s = steps[idx - 1];
      if (s.phase === 'findMiddle') {
        stateHost.innerHTML = renderP1CyclePointers(VALUES, forwardNextOf, s.slow, s.fast);
      } else if (s.phase === 'reverseSecond') {
        stateHost.innerHTML = renderP1LLPointers(secondHalf, s.nextOfSnapshot, s.processedIdx, s.newCurr);
      } else {
        stateHost.innerHTML = renderP1MergeState(
          firstHalf, reversedSecondHalf,
          s.i < firstHalf.length ? s.i : null,
          s.j < reversedSecondHalf.length ? s.j : null,
          s.merged, 'First half', 'Second half (reversed)'
        );
      }
    }

    function reset() {
      idx = 0;
      render();
      logEl.textContent = 'Phase 1 — find the middle: slow = head, fast = head.next.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      idx++;
      render();
      if (s.phase === 'findMiddle') {
        const fastLabel = s.fast === null ? 'null' : VALUES[s.fast];
        logEl.textContent = `slow moves to ${VALUES[s.slow]}, fast moves to ${fastLabel}.`
          + (idx === phase1Steps.length ? ` Middle found: ${VALUES[middleIdx]}. Split into [${firstHalf.join(', ')}] and [${secondHalf.join(', ')}].` : '');
      } else if (s.phase === 'reverseSecond') {
        const label = secondHalf[s.processedIdx];
        logEl.textContent = `Phase 2 — reversing second half: node ${label} now points backward.`
          + (s.newCurr === null ? ` Second half fully reversed: [${reversedSecondHalf.join(', ')}].` : '');
      } else if (s.type === 'pair') {
        const addedPair = s.merged.slice(-2);
        logEl.textContent = `Phase 3 — splice in ${addedPair[0]} then ${addedPair[1]}, one from each half.`;
      } else {
        logEl.textContent = `The first half has one extra node — it attaches automatically. Final: [${s.merged.join(', ')}].`;
      }
      if (idx >= steps.length) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // A round's worth of lists, each rendered as its own labeled chain.
  function renderP1MergeKRound(listsArr) {
    return listsArr.map((l, i) =>
      `<div style="margin-bottom:8px"><div style="font-size:11px;color:var(--sublabel);margin-bottom:3px">List ${i}</div>${renderP1LLChainSimple(l)}</div>`
    ).join('');
  }

  function renderP1MergeKLists() {
    return `
    <div class="p0-section-title">Merge K Sorted Lists<span class="p1-badge hard">Hard</span></div>
    <div class="p0-section-sub">Linked List — problem 6</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get an array of <code>k</code> linked lists, each already sorted in ascending order. Merge all of them into one single sorted linked list.</p>
    </div>

    <div class="p0-card">
      <h4>What "merge k lists" looks like</h4>
      <p>lists = [1→4→5, 1→3→4, 2→6] → one sorted list: [1,1,2,3,4,4,5,6]:</p>
      ${renderP1MergeKRound([[1, 4, 5], [1, 3, 4], [2, 6]])}
      <p style="margin-top:6px;font-size:12.5px;color:var(--sublabel)">You already solved "Merge Two Sorted Lists" — the question here is how to scale that up to <code>k</code> lists without doing far more work than necessary.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you merged the lists <strong>sequentially</strong> — merge list0 into a running result, then merge list1 into that result, then list2, and so on — how many total merges is that, and what does the running result's size grow to? What's the total time complexity in terms of total nodes N and list count K?<br>
      2. Instead, what if you paired up the lists — merge list0 with list1, list2 with list3, and so on, all in one "round" — and then repeated that on the results? How many lists are you left with after one round? After two?<br>
      3. How many rounds of halving does it take to go from K lists down to a single list?<br>
      4. Does pairing-and-halving ever do more total work than merging one at a time, or strictly less? What's actually different between the two approaches?</p>
    </div>

    ${renderP1Workflow('mergeKSortedLinkedLists.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — merge one list into the result at a time</h4>
        <p>Start with an empty result. Merge list0 into it, then merge list1 into the (growing) result, then list2, and so on.</p>
        <pre class="p0-code">function mergeKLists(lists) {
  let result = null;
  for (const list of lists) {
    result = mergeTwoLists(result, list);
  }
  return result;
}</pre>
        <p>Time: <strong>O(N·K)</strong> — the result list grows toward N nodes, and you do K merges, each potentially touching most of the growing result. Space: <strong>O(1)</strong> extra (nodes are reused).</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — divide and conquer, merge pairs in rounds</h4>
        <p>Instead of folding lists in one at a time, pair them up and merge each pair — list0+list1, list2+list3, etc. That's one round, and it roughly halves the number of lists. Repeat on the results until only one list remains.</p>
        <pre class="p0-code">function mergeKLists(lists) {
  if (!lists || lists.length === 0) return null;
  while (lists.length > 1) {
    const merged = [];
    for (let i = 0; i < lists.length; i += 2) {
      const l1 = lists[i];
      const l2 = i + 1 < lists.length ? lists[i + 1] : null;
      merged.push(mergeTwoLists(l1, l2));
    }
    lists = merged;
  }
  return lists[0];
}</pre>
        <p>Time: <strong>O(N log K)</strong> — each of the log K rounds does O(N) total work across all its merges, since every node is touched exactly once per round. Space: <strong>O(K)</strong> — the temporary array of merged lists each round.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — lists = [1→4→5, 1→3→4, 2→6]</div>
        <div id="p1-mk-round"></div>
        <div class="p0-sim-log" id="p1-mk-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-mk-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty array of lists:</strong> nothing to merge — return null immediately.<br>
        <strong>All lists empty:</strong> merging empties together just produces another empty list — final result is null.<br>
        <strong>Single list:</strong> the while loop never runs (length is already 1) — return it as-is.<br>
        <strong>Odd number of lists in a round:</strong> the last unpaired list merges with <code>null</code>, which just passes it through unchanged to the next round.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (sequential merge)</td><td class="num">O(N·K)</td><td class="num">O(1)</td></tr>
          <tr><td>Divide &amp; conquer (pairwise rounds)</td><td class="num">O(N log K)</td><td class="num">O(K)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1MergeKListsStepper() {
    const btn = document.getElementById('p1-mk-step-btn');
    if (!btn) return;
    const roundHost = document.getElementById('p1-mk-round');
    const logEl = document.getElementById('p1-mk-log');

    function mergeTwoSortedArrays(a, b) {
      const result = [];
      let i = 0, j = 0;
      while (i < a.length && j < b.length) {
        if (a[i] <= b[j]) result.push(a[i++]); else result.push(b[j++]);
      }
      while (i < a.length) result.push(a[i++]);
      while (j < b.length) result.push(b[j++]);
      return result;
    }

    const INITIAL_LISTS = [[1, 4, 5], [1, 3, 4], [2, 6]];
    const rounds = [INITIAL_LISTS];
    {
      let current = INITIAL_LISTS;
      while (current.length > 1) {
        const merged = [];
        const pairLogs = [];
        for (let i = 0; i < current.length; i += 2) {
          const l1 = current[i];
          const l2 = i + 1 < current.length ? current[i + 1] : [];
          const m = mergeTwoSortedArrays(l1, l2);
          merged.push(m);
          pairLogs.push(i + 1 < current.length
            ? `merge List ${i} + List ${i + 1} → [${m.join(', ')}]`
            : `List ${i} has no partner this round, carries over unchanged: [${m.join(', ')}]`);
        }
        rounds.push(merged);
        current = merged;
        rounds[rounds.length - 1].__log = pairLogs;
      }
    }

    let idx;

    function render(lists) {
      roundHost.innerHTML = renderP1MergeKRound(lists);
    }

    function reset() {
      idx = 0;
      render(rounds[0]);
      logEl.textContent = `Start: ${rounds[0].length} lists. Pair them up and merge each pair.`;
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= rounds.length - 1) return;
      idx++;
      const roundResult = rounds[idx];
      render(roundResult);
      const roundNum = idx;
      const logLines = roundResult.__log.join(' · ');
      const doneNote = roundResult.length === 1 ? ' Only one list left — done.' : ` ${roundResult.length} lists remain — repeat.`;
      logEl.textContent = `Round ${roundNum}: ${logLines}.${doneNote}`;
      if (idx >= rounds.length - 1) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // ── Shared binary-tree visual helpers, reused across every Trees problem in Phase 1. ──

  // Builds a node-object tree ({val,left,right}) from a level-order array with null gaps —
  // same BFS-with-queue shape every tree solution file's own buildTree() test helper uses.
  function buildP1TreeFromArray(levelArr) {
    if (!levelArr || !levelArr.length) return null;
    const makeNode = v => ({ val: v, left: null, right: null });
    const root = makeNode(levelArr[0]);
    const queue = [root];
    let i = 1;
    while (i < levelArr.length && queue.length) {
      const current = queue.shift();
      if (i < levelArr.length && levelArr[i] !== null) { current.left = makeNode(levelArr[i]); queue.push(current.left); }
      i++;
      if (i < levelArr.length && levelArr[i] !== null) { current.right = makeNode(levelArr[i]); queue.push(current.right); }
      i++;
    }
    return root;
  }

  function cloneP1TreeNode(node) {
    if (!node) return null;
    return { val: node.val, left: cloneP1TreeNode(node.left), right: cloneP1TreeNode(node.right) };
  }

  // Recursive x-splitting layout (same technique as Phase 0's recursion-tree diagrams):
  // each node's x is the midpoint of the horizontal range handed to it; children split that range.
  function layoutP1TreeNodes(root) {
    const nodes = [], edges = [];
    let maxDepth = 0;
    (function gen(node, level, xMin, xMax, parentIdx) {
      if (!node) return;
      maxDepth = Math.max(maxDepth, level);
      const x = (xMin + xMax) / 2;
      const idx = nodes.length;
      nodes.push({ x, y: level, val: node.val });
      if (parentIdx !== null) edges.push([parentIdx, idx]);
      const mid = (xMin + xMax) / 2;
      gen(node.left, level + 1, xMin, mid, idx);
      gen(node.right, level + 1, mid, xMax, idx);
    })(root, 0, 0, 1, null);
    return { nodes, edges, maxDepth };
  }

  // Renders a node-object tree as an SVG diagram. opts.highlightVals: Set of values to highlight.
  function renderP1TreeFromRoot(root, opts) {
    opts = opts || {};
    if (!root) return `<div style="font-size:12px;color:var(--muted);padding:6px 0">(empty tree)</div>`;
    const { nodes, edges, maxDepth } = layoutP1TreeNodes(root);
    const W = Math.max(220, nodes.length * 48), H = 56 + maxDepth * 58, PAD = 30;
    const xFor = x => PAD + x * (W - PAD * 2);
    const yFor = y => 28 + y * ((H - 56) / Math.max(1, maxDepth));
    const edgeLines = edges.map(([a, c]) =>
      `<line x1="${xFor(nodes[a].x).toFixed(1)}" y1="${yFor(nodes[a].y).toFixed(1)}" x2="${xFor(nodes[c].x).toFixed(1)}" y2="${yFor(nodes[c].y).toFixed(1)}" stroke="rgba(255,255,255,0.2)" stroke-width="1.4"/>`
    ).join('');
    const circles = nodes.map(nd => {
      const isHighlight = opts.highlightVals && opts.highlightVals.has(nd.val);
      const fill = isHighlight ? '#3b82f6' : 'rgba(255,255,255,0.08)';
      const stroke = isHighlight ? '#3b82f6' : 'rgba(255,255,255,0.35)';
      const textFill = isHighlight ? '#fff' : 'var(--body-text)';
      const label = opts.nodeLabels && opts.nodeLabels.has(nd.val) ? opts.nodeLabels.get(nd.val) : null;
      const labelSvg = label !== null
        ? `<text x="${xFor(nd.x).toFixed(1)}" y="${(yFor(nd.y) - 22).toFixed(1)}" text-anchor="middle" font-size="11" font-family="monospace" font-weight="700" fill="#22c55e">${label}</text>`
        : '';
      return `<circle cx="${xFor(nd.x).toFixed(1)}" cy="${yFor(nd.y).toFixed(1)}" r="16" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
        + `<text x="${xFor(nd.x).toFixed(1)}" y="${(yFor(nd.y) + 4).toFixed(1)}" text-anchor="middle" font-size="13" font-family="monospace" font-weight="600" fill="${textFill}">${nd.val}</text>`
        + labelSvg;
    }).join('');
    return `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${edgeLines}${circles}</svg></div>`;
  }

  // Convenience wrapper for static (non-spoiler) concept visuals built directly from a level-order array.
  function renderP1TreeSVG(levelArr, highlightVals) {
    return renderP1TreeFromRoot(buildP1TreeFromArray(levelArr), { highlightVals });
  }

  function renderP1InvertBinaryTree() {
    return `
    <div class="p0-section-title">Invert Binary Tree<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Trees — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get the root of a binary tree. Invert it — mirror it left-to-right — so every node's left and right children are swapped, all the way down. Return the (same) root.</p>
    </div>

    <div class="p0-card">
      <h4>What "inverted" means here</h4>
      <p>root = [4,2,7,1,3,6,9] becomes [4,7,2,9,6,3,1] — a left-right mirror image:</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div><div class="p0-diagram-label">Original</div>${renderP1TreeSVG([4, 2, 7, 1, 3, 6, 9])}</div>
        <div><div class="p0-diagram-label">Inverted</div>${renderP1TreeSVG([4, 7, 2, 9, 6, 3, 1])}</div>
      </div>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you visited the tree level by level with a queue (BFS), swapping each node's two children as you dequeue it, would the whole tree end up correctly inverted? What's the time and space complexity?<br>
      2. Can this be solved with a simple recursive rule: "swap this node's children, then do the same thing to each child"? What's the base case that stops the recursion?<br>
      3. Does it matter whether you swap a node's children <strong>before</strong> or <strong>after</strong> recursing into them?<br>
      4. The recursive approach's space cost is usually described in terms of the tree's <strong>height</strong>, not its total node count — why, and when would that differ a lot from the iterative (queue-based) version's space usage?</p>
    </div>

    ${renderP1Workflow('trees-invertBinaryTree.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — iterative BFS with a queue</h4>
        <p>Visit nodes level by level using a queue. For each node you dequeue, swap its left and right children, then enqueue both children so they get the same treatment.</p>
        <pre class="p0-code">function invertTree(root) {
  if (!root) return null;
  const queue = [root];
  while (queue.length) {
    const node = queue.shift();
    [node.left, node.right] = [node.right, node.left];
    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
  }
  return root;
}</pre>
        <p>Time: <strong>O(n)</strong> — visits every node once. Space: <strong>O(n)</strong> worst case — a wide, bushy tree can have up to roughly n/2 nodes sitting in the queue at its widest level.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — recursive DFS, swap then recurse</h4>
        <p>At every node: swap its left and right children immediately, then recursively do the same to the (now-swapped) left and right subtrees. Because the swap happens before the recursive calls, the whole tree ends up mirrored.</p>
        <pre class="p0-code">function invertTree(root) {
  if (!root) return null;
  [root.left, root.right] = [root.right, root.left];
  invertTree(root.left);
  invertTree(root.right);
  return root;
}</pre>
        <p>Time: <strong>O(n)</strong> — same as BFS, every node visited once. Space: <strong>O(h)</strong> — the recursion call stack, where h is the tree's height. That's O(log n) for a balanced tree (much better than the queue's worst case), but O(n) for a completely skewed tree — not strictly better in every case, just usually better and more idiomatic.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — root = [4,2,7,1,3,6,9]</div>
        <div id="p1-iv-tree"></div>
        <div class="p0-sim-log" id="p1-iv-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-iv-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty tree:</strong> root is null — return null immediately, nothing to do.<br>
        <strong>Single node:</strong> it has no children to swap — the swap is a no-op, but it's still visited.<br>
        <strong>Leaf nodes anywhere in the tree:</strong> swapping <code>null</code> and <code>null</code> does nothing — the recursion still visits them, it just has no visible effect.<br>
        <strong>Skewed (linked-list-like) tree:</strong> every node has only one child — inverting still works, it just flips which side that child sits on at every level.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (iterative BFS)</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
          <tr><td>Optimal (recursive DFS)</td><td class="num">O(n)</td><td class="num">O(h)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1InvertBinaryTreeStepper() {
    const btn = document.getElementById('p1-iv-step-btn');
    if (!btn) return;
    const treeHost = document.getElementById('p1-iv-tree');
    const logEl = document.getElementById('p1-iv-log');

    const root = buildP1TreeFromArray([4, 2, 7, 1, 3, 6, 9]);
    const initialSnapshot = cloneP1TreeNode(root);

    const steps = [];
    (function simulateInvert(node) {
      if (!node) return;
      const hadChildren = !!(node.left || node.right);
      [node.left, node.right] = [node.right, node.left];
      steps.push({ val: node.val, hadChildren, snapshot: cloneP1TreeNode(root) });
      simulateInvert(node.left);
      simulateInvert(node.right);
    })(root);

    let idx;

    function render(snapshot, highlightVal) {
      treeHost.innerHTML = renderP1TreeFromRoot(snapshot, { highlightVals: highlightVal === undefined ? null : new Set([highlightVal]) });
    }

    function reset() {
      idx = 0;
      render(initialSnapshot, null);
      logEl.textContent = 'Visit the root first. Swap its children, then recurse into each side.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      render(s.snapshot, s.val);
      logEl.textContent = s.hadChildren
        ? `Visit node ${s.val}: swap its left and right children.`
        : `Visit node ${s.val}: it's a leaf — swapping its (null) children does nothing.`;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' All nodes visited — the tree is fully inverted.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1MaxDepth() {
    return `
    <div class="p0-section-title">Maximum Depth of Binary Tree<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Trees — problem 2</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get the root of a binary tree. Return its maximum depth — the number of nodes along the longest path from the root down to the farthest leaf.</p>
    </div>

    <div class="p0-card">
      <h4>What "depth" means here</h4>
      <p>root = [3, 9, 20, null, null, 15, 7] — the longest path is 3 → 20 → 7 (or 3 → 20 → 15), 3 nodes deep:</p>
      ${renderP1TreeSVG([3, 9, 20, null, null, 15, 7], new Set([3, 20, 7]))}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">Highlighted: one longest root-to-leaf path. The branch through node 9 is only 2 nodes deep, so it doesn't set the maximum.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you did a level-by-level BFS and counted how many levels you passed through before the queue emptied, would that give you the max depth? What's the time and space complexity?<br>
      2. For any single node, if you already knew the max depth of its left subtree and the max depth of its right subtree, how would you combine those two numbers into this node's own depth?<br>
      3. What should an empty (null) subtree's depth be, so that "1 + max(left, right)" gives the right answer even at the very bottom of the tree?<br>
      4. Does it matter which subtree — left or right — you compute first?</p>
    </div>

    ${renderP1Workflow('trees-maximumDepthOfBinaryTree.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — iterative BFS, count the levels</h4>
        <p>Walk the tree level by level with a queue, counting how many full levels you process before the queue runs out.</p>
        <pre class="p0-code">function maxDepth(root) {
  if (!root) return 0;
  let depth = 0;
  let queue = [root];
  while (queue.length) {
    depth++;
    const next = [];
    for (const node of queue) {
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    queue = next;
  }
  return depth;
}</pre>
        <p>Time: <strong>O(n)</strong> — every node visited once. Space: <strong>O(n)</strong> worst case — a wide tree's queue can hold up to roughly n/2 nodes at its widest level.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — recursive DFS, bubble depth up from the leaves</h4>
        <p>An empty subtree has depth 0. Any other node's depth is 1 (for itself) plus whichever of its two subtrees is deeper. The recursion naturally computes leaves first, then combines those results going back up toward the root.</p>
        <pre class="p0-code">function maxDepth(root) {
  if (root === null) return 0;
  return 1 + Math.max(
    maxDepth(root.left),
    maxDepth(root.right)
  );
}</pre>
        <p>Time: <strong>O(n)</strong> — every node visited once. Space: <strong>O(h)</strong> — the recursion call stack, where h is the tree's height.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — root = [3,9,20,null,null,15,7]</div>
        <div id="p1-md-tree"></div>
        <div class="p0-sim-log" id="p1-md-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-md-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty tree:</strong> root is null — depth is 0.<br>
        <strong>Single node:</strong> both children are null (depth 0 each), so this node's depth is 1.<br>
        <strong>Completely skewed tree:</strong> every node has exactly one child — depth equals the total number of nodes.<br>
        <strong>Unbalanced tree:</strong> the formula naturally ignores the shorter branch — it only cares about the deeper of the two subtrees.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (iterative BFS)</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
          <tr><td>Optimal (recursive DFS)</td><td class="num">O(n)</td><td class="num">O(h)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1MaxDepthStepper() {
    const btn = document.getElementById('p1-md-step-btn');
    if (!btn) return;
    const treeHost = document.getElementById('p1-md-tree');
    const logEl = document.getElementById('p1-md-log');

    const root = buildP1TreeFromArray([3, 9, 20, null, null, 15, 7]);

    const steps = [];
    (function computeDepth(node) {
      if (!node) return 0;
      const leftDepth = computeDepth(node.left);
      const rightDepth = computeDepth(node.right);
      const depth = 1 + Math.max(leftDepth, rightDepth);
      steps.push({ val: node.val, leftDepth, rightDepth, depth });
      return depth;
    })(root);

    let idx;
    const labels = new Map();

    function render(currentVal) {
      treeHost.innerHTML = renderP1TreeFromRoot(root, {
        nodeLabels: labels,
        highlightVals: currentVal === undefined ? null : new Set([currentVal]),
      });
    }

    function reset() {
      idx = 0;
      labels.clear();
      render(null);
      logEl.textContent = 'Recursion dives to the leaves first — depth bubbles back up from there.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      labels.set(s.val, `depth=${s.depth}`);
      render(s.val);
      logEl.textContent = `Node ${s.val}: left subtree depth ${s.leftDepth}, right subtree depth ${s.rightDepth} → 1 + max(${s.leftDepth}, ${s.rightDepth}) = ${s.depth}.`;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ` Root finished — maximum depth is ${steps[steps.length - 1].depth}.`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1SameBinaryTree() {
    return `
    <div class="p0-section-title">Same Binary Tree<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Trees — problem 3</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get the roots of two binary trees, p and q. Check whether they're the same — same shape, and the same value sitting at every matching position. Return true or false.</p>
    </div>

    <div class="p0-card">
      <h4>"Same" means both shape and values match</h4>
      <p>p = [1,2,3], q = [1,2,3] — identical shape, identical values → <strong>true</strong>:</p>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px">
        <div style="flex:1;min-width:160px"><div class="p0-diagram-label">p</div>${renderP1TreeSVG([1, 2, 3])}</div>
        <div style="flex:1;min-width:160px"><div class="p0-diagram-label">q</div>${renderP1TreeSVG([1, 2, 3])}</div>
      </div>
      <p>p = [1,2], q = [1,null,2] — same two values (1 and 2) exist in both, but 2 sits on a different side → <strong>false</strong>:</p>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px"><div class="p0-diagram-label">p</div>${renderP1TreeSVG([1, 2])}</div>
        <div style="flex:1;min-width:160px"><div class="p0-diagram-label">q</div>${renderP1TreeSVG([1, null, 2])}</div>
      </div>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you compare two trees node by node with recursion, what should happen when both current nodes are null?<br>
      2. What should happen when exactly one of the two current nodes is null (and the other isn't)?<br>
      3. What should happen when both nodes exist but hold different values?<br>
      4. If the left subtrees already matched, do you still need to separately check the right subtrees? Does the order — left first, then right — change the final true/false answer, or only which mismatch you'd notice first?</p>
    </div>

    ${renderP1Workflow('trees-sameBinaryTree.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — serialize both trees, then compare</h4>
        <p>Flatten each tree into a single array or string using a fixed traversal order (e.g. preorder), making sure to record <code>null</code> for every missing child so different shapes can't accidentally produce the same serialization. Then just compare the two serializations directly.</p>
        <pre class="p0-code">function serialize(node, out) {
  if (!node) { out.push(null); return; }
  out.push(node.val);
  serialize(node.left, out);
  serialize(node.right, out);
}
function isSameTree(p, q) {
  const a = [], b = [];
  serialize(p, a);
  serialize(q, b);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}</pre>
        <p>Time: <strong>O(n)</strong> — every node visited once during serialization, plus a linear comparison. Space: <strong>O(n)</strong> — two full extra arrays are built before any comparing happens, on top of the recursion stack.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — direct recursive comparison, no extra structure</h4>
        <p>Compare p and q node by node as you go, with no serialized copy needed: both null is a match, exactly one null (or a value mismatch) is an immediate false, otherwise recurse into both children and require both sides to agree.</p>
        <pre class="p0-code">function isSameTree(p, q) {
  if (!p && !q) return true;
  if (!p || !q || p.val !== q.val) return false;
  return isSameTree(p.left, q.left)
      && isSameTree(p.right, q.right);
}</pre>
        <p>Time: <strong>O(n)</strong> — where n is the number of nodes in the smaller tree; the <code>&amp;&amp;</code> can short-circuit and skip whole subtrees once a mismatch is found. Space: <strong>O(h)</strong> — just the recursion call stack, no extra arrays.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — p = [1,2,3,4,5], q = [1,2,3,4,6]</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:160px"><div class="p0-diagram-label">p</div><div id="p1-st-tree-p"></div></div>
          <div style="flex:1;min-width:160px"><div class="p0-diagram-label">q</div><div id="p1-st-tree-q"></div></div>
        </div>
        <div class="p0-sim-log" id="p1-st-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-st-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Both trees empty:</strong> root is null for both — true immediately, nothing to compare.<br>
        <strong>One empty, one not:</strong> false right away — no need to look any deeper.<br>
        <strong>Same values, different shape:</strong> e.g. [1,2] vs [1,null,2] — false, because a value being in the tree "somewhere" isn't enough, it has to be in the matching position.<br>
        <strong>Same shape, different values:</strong> e.g. [1,2,1] vs [1,1,2] — false at the first node where the values disagree.<br>
        <strong>Large identical trees:</strong> every node matches all the way down — true.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (serialize + compare)</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
          <tr><td>Optimal (direct recursive compare)</td><td class="num">O(n)</td><td class="num">O(h)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1SameBinaryTreeStepper() {
    const btn = document.getElementById('p1-st-step-btn');
    if (!btn) return;
    const treeHostP = document.getElementById('p1-st-tree-p');
    const treeHostQ = document.getElementById('p1-st-tree-q');
    const logEl = document.getElementById('p1-st-log');

    const rootP = buildP1TreeFromArray([1, 2, 3, 4, 5]);
    const rootQ = buildP1TreeFromArray([1, 2, 3, 4, 6]);

    const steps = [];
    (function simulate(p, q) {
      if (!p && !q) return true;
      if (!p || !q || p.val !== q.val) {
        steps.push({
          pVal: p ? p.val : null,
          qVal: q ? q.val : null,
          msg: (!p || !q)
            ? `One side is missing a node here (p=${p ? p.val : 'null'}, q=${q ? q.val : 'null'}) — false.`
            : `Values differ: p=${p.val} vs q=${q.val} — false, return immediately.`,
        });
        return false;
      }
      steps.push({ pVal: p.val, qVal: q.val, msg: `Compare node: p=${p.val}, q=${q.val} → values match. Recurse into left subtree.` });
      const leftOk = simulate(p.left, q.left);
      if (!leftOk) {
        steps.push({ pVal: p.val, qVal: q.val, msg: `Node ${p.val}'s left subtree returned false → the && short-circuits: right subtree is never checked. Node ${p.val} returns false.` });
        return false;
      }
      steps.push({ pVal: p.val, qVal: q.val, msg: `Node ${p.val}'s left subtree matched. Recurse into right subtree.` });
      const rightOk = simulate(p.right, q.right);
      steps.push({
        pVal: p.val, qVal: q.val,
        msg: rightOk
          ? `Node ${p.val}'s right subtree matched too — node ${p.val} returns true.`
          : `Node ${p.val}'s right subtree returned false — node ${p.val} returns false.`,
      });
      return rightOk;
    })(rootP, rootQ);

    let idx;

    function render(pVal, qVal) {
      treeHostP.innerHTML = renderP1TreeFromRoot(rootP, { highlightVals: pVal === null || pVal === undefined ? null : new Set([pVal]) });
      treeHostQ.innerHTML = renderP1TreeFromRoot(rootQ, { highlightVals: qVal === null || qVal === undefined ? null : new Set([qVal]) });
    }

    function reset() {
      idx = 0;
      render(null, null);
      logEl.textContent = 'Compare the roots first, then recurse left before right — same as the code does.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      render(s.pVal, s.qVal);
      logEl.textContent = s.msg;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Final result: false. (Node 3 on both trees was never even visited — short-circuited away.)';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1SubtreeOfAnotherTree() {
    return `
    <div class="p0-section-title">Subtree of Another Tree<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Trees — problem 4</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get two trees, root and subRoot. Check whether subRoot shows up <em>anywhere</em> inside root — meaning some node in root, together with all of its descendants, is exactly the same tree as subRoot (same shape, same values). root counts as a subtree of itself too.</p>
    </div>

    <div class="p0-card">
      <h4>What "found as a subtree" means</h4>
      <p>root = [3,4,5,1,2], subRoot = [4,1,2] — the piece of root starting at node 4 (highlighted) is exactly subRoot → <strong>true</strong>:</p>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px">
        <div style="flex:1;min-width:180px"><div class="p0-diagram-label">root</div>${renderP1TreeSVG([3, 4, 5, 1, 2], new Set([4, 1, 2]))}</div>
        <div style="flex:1;min-width:160px"><div class="p0-diagram-label">subRoot</div>${renderP1TreeSVG([4, 1, 2])}</div>
      </div>
      <p>root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2] — node 4's piece of root <em>looks</em> close, but node 2 there has an extra child (0) that subRoot doesn't have → <strong>false</strong>. Close isn't enough — every node and every missing child has to line up exactly.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. You already built a helper that checks whether two trees are <em>exactly</em> identical (Same Binary Tree). Where would you call that helper from here, and on what?<br>
      2. Do you need to test every single node in root as a possible starting point, or can you stop the moment you find one match?<br>
      3. What should the answer be if subRoot is empty (null)? Is an empty tree always "present" inside any root, including an empty one?<br>
      4. What should the answer be if root is empty but subRoot isn't?</p>
    </div>

    ${renderP1Workflow('trees-subtreeOfAnotherTree.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Standard approach — try the "same tree" check at every node</h4>
        <p>Reuse the "are these two trees identical" check from Same Binary Tree as a helper. Walk root node by node: at each node, ask "is the tree starting here identical to subRoot?" If yes, done. If no, try the same question starting from that node's left child, or its right child.</p>
        <pre class="p0-code">function sameTree(a, b) {
  if (!a && !b) return true;
  if (!a || !b || a.val !== b.val) return false;
  return sameTree(a.left, b.left)
      && sameTree(a.right, b.right);
}
function isSubtree(root, subRoot) {
  if (!subRoot) return true;
  if (!root) return false;
  if (sameTree(root, subRoot)) return true;
  return isSubtree(root.left, subRoot)
      || isSubtree(root.right, subRoot);
}</pre>
        <p>Time: <strong>O(M · N)</strong> — M = nodes in root, N = nodes in subRoot; in the worst case you attempt the sameTree check at every one of root's M nodes, and each check can walk up to N nodes deep before failing. Space: <strong>O(H)</strong> — the recursion stack, H = root's height.</p>
      </div>

      <div class="p0-card">
        <h4>A further optimization — serialize to strings, then substring search</h4>
        <p>Flatten both trees to strings using a fixed traversal that marks every missing child (so shape differences can't hide), then check whether subRoot's string is a substring of root's string using a linear-time string-matching algorithm (like KMP) instead of a naive nested check.</p>
        <p>Time: <strong>O(M + N)</strong> — linear in both trees' sizes, avoiding the M·N blowup. Space: <strong>O(M + N)</strong> — for the two serialized strings. This is a nice trick to know exists, but the recursive "sameTree at every node" version above is the one expected in most interviews.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — root = [3,4,5,1,2], subRoot = [4,1,2]</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:180px"><div class="p0-diagram-label">root</div><div id="p1-so-tree-root"></div></div>
          <div style="flex:1;min-width:160px"><div class="p0-diagram-label">subRoot</div>${renderP1TreeSVG([4, 1, 2])}</div>
        </div>
        <div class="p0-sim-log" id="p1-so-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-so-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>subRoot is empty:</strong> an empty tree is trivially found everywhere — true immediately.<br>
        <strong>root is empty, subRoot isn't:</strong> nothing to search in — false.<br>
        <strong>Same values, wrong shape:</strong> e.g. an extra child hiding deep inside the candidate subtree — sameTree catches it and rejects, even though the top-level values matched.<br>
        <strong>subRoot equals the whole root:</strong> the very first sameTree check (at the root) succeeds — true, no need to search further down.<br>
        <strong>subRoot never appears:</strong> every node in root gets tried as a candidate and every one fails — false.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Standard (sameTree at every node)</td><td class="num">O(M·N)</td><td class="num">O(H)</td></tr>
          <tr><td>Further optimization (serialize + KMP substring search)</td><td class="num">O(M+N)</td><td class="num">O(M+N)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1SubtreeOfAnotherTreeStepper() {
    const btn = document.getElementById('p1-so-step-btn');
    if (!btn) return;
    const treeHostRoot = document.getElementById('p1-so-tree-root');
    const logEl = document.getElementById('p1-so-log');

    const root = buildP1TreeFromArray([3, 4, 5, 1, 2]);
    const subRoot = buildP1TreeFromArray([4, 1, 2]);

    function sameTree(a, b) {
      if (!a && !b) return true;
      if (!a || !b || a.val !== b.val) return false;
      return sameTree(a.left, b.left) && sameTree(a.right, b.right);
    }

    const steps = [];
    (function simulate(node) {
      if (!node) return false;
      const matched = sameTree(node, subRoot);
      steps.push({
        val: node.val,
        matched,
        msg: matched
          ? `Try node ${node.val} as a candidate: sameTree(node ${node.val}, subRoot) → true! Match found — stop searching, return true.`
          : `Try node ${node.val} as a candidate: sameTree(node ${node.val}, subRoot) → false. Move on to its children.`,
      });
      if (matched) return true;
      return simulate(node.left) || simulate(node.right);
    })(root);

    let idx;

    function render(val) {
      treeHostRoot.innerHTML = renderP1TreeFromRoot(root, { highlightVals: val === null || val === undefined ? null : new Set([val]) });
    }

    function reset() {
      idx = 0;
      render(null);
      logEl.textContent = 'Try the root first as a candidate, then work down — same as the code does.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      render(s.val);
      logEl.textContent = s.msg;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += " Node 5 (root's right child) was never even tried — the search stopped as soon as node 4 matched.";
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1LCABST() {
    return `
    <div class="p0-section-title">Lowest Common Ancestor of a BST<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Trees — problem 5</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a <strong>binary search tree</strong> (left child &lt; node &lt; right child, everywhere in the tree) and two of its nodes, p and q. Find their lowest common ancestor — the deepest node that has both p and q somewhere in its subtree (a node counts as its own descendant, so if p is q's ancestor, the answer is p itself).</p>
    </div>

    <div class="p0-card">
      <h4>What "lowest common ancestor" means here</h4>
      <p>root = [6,2,8,0,4,7,9,null,null,3,5]. p=2, q=8 sit on opposite sides of the root — their lowest common ancestor is the root itself, node 6:</p>
      ${renderP1TreeSVG([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], new Set([6, 2, 8]))}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">p=2 and q=4 sit on the same side (both under node 2) — their lowest common ancestor is node 2 itself, not the root, because 2 is already an ancestor of 4.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. This tree is specifically a BST. If p's value and q's value are both greater than the current node's value, what does that tell you about which side their LCA must be on?<br>
      2. What if both are smaller than the current node's value?<br>
      3. What does it mean, in terms of "which side," if p's value is smaller than the current node's and q's value is larger (or the other way around)?<br>
      4. What if the current node's value is exactly equal to p's value or q's value — does that change anything?</p>
    </div>

    ${renderP1Workflow('trees-lowestCommonAncestorBST.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — find both root-to-node paths, compare them</h4>
        <p>Walk from the root down to p, recording every node visited along the way — that's one path. Do the same for q. Then walk both recorded paths together from the start and find the last node where they still agree; that's the LCA.</p>
        <pre class="p0-code">function pathTo(root, target) {
  const path = [];
  let cur = root;
  while (cur) {
    path.push(cur);
    if (target.val === cur.val) break;
    cur = target.val < cur.val ? cur.left : cur.right;
  }
  return path;
}
function lowestCommonAncestor(root, p, q) {
  const pathP = pathTo(root, p);
  const pathQ = pathTo(root, q);
  let lca = root;
  for (let i = 0; i < pathP.length && i < pathQ.length; i++) {
    if (pathP[i].val === pathQ[i].val) lca = pathP[i];
    else break;
  }
  return lca;
}</pre>
        <p>Time: <strong>O(H)</strong> — H = tree height, one walk down for each of p and q. Space: <strong>O(H)</strong> — both full paths are stored as arrays before comparing.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — one walk down, using the BST property directly</h4>
        <p>You don't need to store either path. Start at the root and look at where p and q sit relative to the current node's value: if both are greater, the LCA must be further right, so move right. If both are smaller, move left. The moment they're no longer both on the same side — one is smaller, one is larger, or the current node's value matches one of them — the current node is the LCA, because this is exactly where their paths would diverge.</p>
        <pre class="p0-code">function lowestCommonAncestor(root, p, q) {
  let cur = root;
  while (cur) {
    if (p.val > cur.val && q.val > cur.val) {
      cur = cur.right;
    } else if (p.val < cur.val && q.val < cur.val) {
      cur = cur.left;
    } else {
      return cur;
    }
  }
  return null;
}</pre>
        <p>Time: <strong>O(H)</strong> — same single walk down, at most one node per level. Space: <strong>O(1)</strong> — no stored paths, no recursion stack (it's iterative).</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — root = [6,2,8,0,4,7,9,null,null,3,5], p=3, q=5</div>
        <div id="p1-lca-tree"></div>
        <div class="p0-sim-log" id="p1-lca-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-lca-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>p and q on opposite sides of the root:</strong> the root itself is the LCA — found on the very first check.<br>
        <strong>One of p/q is an ancestor of the other:</strong> the walk stops exactly at that ancestor, since the current node's value will equal one of them.<br>
        <strong>p and q are the same node:</strong> the walk stops the moment it reaches that node.<br>
        <strong>Single-node tree:</strong> root is p, q, and the LCA, all at once.<br>
        <strong>Fully skewed (linked-list-like) BST:</strong> still works — the walk just moves one direction the whole way down until it lands on the shallower of the two nodes.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (two stored paths)</td><td class="num">O(H)</td><td class="num">O(H)</td></tr>
          <tr><td>Optimal (single iterative walk)</td><td class="num">O(H)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1LCABSTStepper() {
    const btn = document.getElementById('p1-lca-step-btn');
    if (!btn) return;
    const treeHost = document.getElementById('p1-lca-tree');
    const logEl = document.getElementById('p1-lca-log');

    const root = buildP1TreeFromArray([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5]);
    const pVal = 3, qVal = 5;

    const steps = [];
    (function simulate(cur) {
      if (!cur) return;
      if (pVal > cur.val && qVal > cur.val) {
        steps.push({ val: cur.val, msg: `At node ${cur.val}: both p=${pVal} and q=${qVal} are greater → LCA must be further right. Move right.` });
        simulate(cur.right);
      } else if (pVal < cur.val && qVal < cur.val) {
        steps.push({ val: cur.val, msg: `At node ${cur.val}: both p=${pVal} and q=${qVal} are smaller → LCA must be further left. Move left.` });
        simulate(cur.left);
      } else {
        steps.push({ val: cur.val, msg: `At node ${cur.val}: p=${pVal} and q=${qVal} are no longer on the same side — this is where their paths diverge. Node ${cur.val} is the LCA.` });
      }
    })(root);

    let idx;

    function render(val) {
      treeHost.innerHTML = renderP1TreeFromRoot(root, { highlightVals: val === null || val === undefined ? null : new Set([val]) });
    }

    function reset() {
      idx = 0;
      render(null);
      logEl.textContent = `Start at the root and compare p=${pVal}, q=${qVal} against each node's value.`;
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      render(s.val);
      logEl.textContent = s.msg;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Done — no need to visit the rest of the tree.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1LevelOrder() {
    return `
    <div class="p0-section-title">Binary Tree Level Order Traversal<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Trees — problem 6</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get the root of a binary tree. Return its node values grouped level by level, top to bottom, left to right within each level — one array per level, all wrapped in an outer array.</p>
    </div>

    <div class="p0-card">
      <h4>What "level by level" means</h4>
      <p>root = [3, 9, 20, null, null, 15, 7] has three levels. Each one becomes its own array in the output, in top-to-bottom order:</p>
      <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px">
        <div><div class="p0-diagram-label">Level 0 → [3]</div>${renderP1TreeSVG([3, 9, 20, null, null, 15, 7], new Set([3]))}</div>
        <div><div class="p0-diagram-label">Level 1 → [9, 20]</div>${renderP1TreeSVG([3, 9, 20, null, null, 15, 7], new Set([9, 20]))}</div>
        <div><div class="p0-diagram-label">Level 2 → [15, 7]</div>${renderP1TreeSVG([3, 9, 20, null, null, 15, 7], new Set([15, 7]))}</div>
      </div>
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">Output: [[3], [9, 20], [15, 7]].</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you keep a running list of "nodes I still need to visit," and you always take from the front and add new ones to the back, what does that behave like?<br>
      2. Using a list like that, how do you know exactly when one level has finished and the next one starts, if everything is sitting in one flat list?<br>
      3. Could you solve this with DFS instead, recursing all the way down one branch before the next? What extra piece of information would you need to pass along so values still land in the right level's array?<br>
      4. What should the output be for an empty tree?</p>
    </div>

    ${renderP1Workflow('trees-binaryTreeLevelOrderTraversal.js')}

    <details class="p0-reveal">
      <summary>Two valid approaches — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Approach 1 — BFS with a queue (matches the problem directly)</h4>
        <p>Start a queue with just the root. Each round, the number of nodes <em>already</em> in the queue is exactly the size of the current level — so grab that many, collect their values into this level's array, and push each one's children onto the back of the queue for the next round.</p>
        <pre class="p0-code">function levelOrder(root) {
  if (!root) return [];
  const res = [];
  const queue = [root];
  while (queue.length) {
    const levelSize = queue.length;
    const level = [];
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    res.push(level);
  }
  return res;
}</pre>
        <p>Time: <strong>O(N)</strong> — every node dequeued and enqueued exactly once. Space: <strong>O(N)</strong> — the widest level of the tree can hold up to roughly N/2 nodes in the queue at once, plus the result array itself holds all N values.</p>
      </div>

      <div class="p0-card">
        <h4>Approach 2 — DFS with a depth counter (also valid, same complexity)</h4>
        <p>Recurse depth-first, but carry the current depth along. The first time you reach a given depth, create a new array for it in the result. Every node adds its value to its own depth's array, then recurses into left, then right — since left is always visited before right, order within a level still comes out correct.</p>
        <pre class="p0-code">function levelOrder(root) {
  const res = [];
  function dfs(node, depth) {
    if (!node) return;
    if (res.length === depth) res.push([]);
    res[depth].push(node.val);
    dfs(node.left, depth + 1);
    dfs(node.right, depth + 1);
  }
  dfs(root, 0);
  return res;
}</pre>
        <p>Time: <strong>O(N)</strong> — every node visited once. Space: <strong>O(N)</strong> for the result array; the recursion stack itself only goes as deep as O(H).</p>
        <p style="margin-top:8px;font-size:12.5px;color:var(--sublabel)">Neither approach is asymptotically better here — this is one of those cases where the choice is about which mental model fits the problem, not about Big-O. BFS mirrors "go level by level" directly; DFS gets the same grouping with an extra depth-tracking trick.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — BFS with a queue, root = [3,9,20,null,null,15,7]</div>
        <div id="p1-lot-tree"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Queue (front → back)</div>
        <div class="p0-arr-row" id="p1-lot-queue"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Result so far</div>
        <div class="p0-code" id="p1-lot-result"></div>
        <div class="p0-sim-log" id="p1-lot-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-lot-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty tree:</strong> root is null — return [] immediately, no levels at all.<br>
        <strong>Single node:</strong> one level, containing just that value: [[val]].<br>
        <strong>Fully skewed tree (only left or only right children the whole way down):</strong> every level has exactly one node — the output is a column of single-element arrays.<br>
        <strong>Uneven levels:</strong> level sizes can differ wildly (a wide level 1, a narrow level 2) — the queue's length at the start of each round adapts automatically, so nothing needs to be hardcoded.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>BFS with a queue</td><td class="num">O(N)</td><td class="num">O(N)</td></tr>
          <tr><td>DFS with a depth counter</td><td class="num">O(N)</td><td class="num">O(N)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1LevelOrderStepper() {
    const btn = document.getElementById('p1-lot-step-btn');
    if (!btn) return;
    const treeHost = document.getElementById('p1-lot-tree');
    const queueHost = document.getElementById('p1-lot-queue');
    const resultHost = document.getElementById('p1-lot-result');
    const logEl = document.getElementById('p1-lot-log');

    const root = buildP1TreeFromArray([3, 9, 20, null, null, 15, 7]);

    const steps = [];
    {
      let queue = [root];
      let level = 0;
      while (queue.length) {
        const levelSize = queue.length;
        const levelVals = [];
        for (let i = 0; i < levelSize; i++) {
          const node = queue.shift();
          levelVals.push(node.val);
          const enqueuedVals = [];
          if (node.left) { queue.push(node.left); enqueuedVals.push(node.left.val); }
          if (node.right) { queue.push(node.right); enqueuedVals.push(node.right.val); }
          steps.push({ type: 'dequeue', val: node.val, level, levelVals: [...levelVals], queueAfter: queue.map(n => n.val), enqueuedVals });
        }
        steps.push({ type: 'levelDone', level, levelVals: [...levelVals] });
        level++;
      }
    }

    let idx;
    const labels = new Map();
    const finishedLevels = [];

    function renderResult(inProgress) {
      const parts = finishedLevels.map(l => `[${l.join(', ')}]`);
      if (inProgress && inProgress.length) parts.push(`[${inProgress.join(', ')}]  ← filling`);
      resultHost.textContent = parts.length ? parts.join('  ') : '(empty so far)';
    }

    function reset() {
      idx = 0;
      labels.clear();
      finishedLevels.length = 0;
      treeHost.innerHTML = renderP1TreeFromRoot(root, { nodeLabels: labels, highlightVals: null });
      queueHost.innerHTML = renderP1ArrayRow([root.val]);
      renderResult([]);
      logEl.textContent = 'Queue starts with just the root. We process nodes in the order they were added — first in, first out.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.type === 'dequeue') {
        labels.set(s.val, `L${s.level}`);
        treeHost.innerHTML = renderP1TreeFromRoot(root, { nodeLabels: labels, highlightVals: new Set([s.val]) });
        queueHost.innerHTML = renderP1ArrayRow(s.queueAfter);
        renderResult(s.levelVals);
        logEl.textContent = s.enqueuedVals.length
          ? `Dequeue ${s.val} (level ${s.level}), add it to this level's array, then enqueue its children: ${s.enqueuedVals.join(', ')}.`
          : `Dequeue ${s.val} (level ${s.level}), add it to this level's array. No children to enqueue.`;
      } else {
        finishedLevels.push(s.levelVals);
        renderResult([]);
        logEl.textContent = `Level ${s.level} is done — every node that was in the queue at the start of this round has been processed. Push [${s.levelVals.join(', ')}] onto the result.`;
      }
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Queue is empty — traversal complete.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1ValidBST() {
    return `
    <div class="p0-section-title">Valid Binary Search Tree<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Trees — problem 7</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get the root of a binary tree. Return true if it's a valid binary search tree (BST): every node's value must be strictly greater than <em>every</em> value in its left subtree and strictly less than <em>every</em> value in its right subtree — not just its immediate children.</p>
    </div>

    <div class="p0-card">
      <h4>What makes a BST valid</h4>
      <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px">
        <div><div class="p0-diagram-label">Valid — [2,1,3]</div>${renderP1TreeSVG([2, 1, 3])}</div>
        <div><div class="p0-diagram-label">Invalid — [5,1,4,null,null,3,6]</div>${renderP1TreeSVG([5, 1, 4, null, null, 3, 6], new Set([4]))}</div>
      </div>
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">Highlighted: node 4 sits in the root's right subtree, so it must be greater than 5 — it isn't. The same kind of violation can also happen much deeper in a tree, several levels below the ancestor whose rule got broken, which is why the check has to carry a constraint down from every ancestor above a node, not just its immediate parent.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you only checked each node against its immediate parent, would that always be enough to catch every kind of violation? Can you imagine a tree where a node looks fine next to its parent but still breaks the BST rule?<br>
      2. As you move into a node's left subtree, which of the two bounds (lower or upper) should tighten, and to what value?<br>
      3. Same question moving into the right subtree — which bound tightens, and to what?<br>
      4. What are the very first lower and upper bounds, before you've looked at any node at all?</p>
    </div>

    ${renderP1Workflow('trees-validBinarySearchTree.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — inorder traversal into an array, then check it's strictly increasing</h4>
        <p>A BST's inorder traversal (left, node, right) visits values in strictly increasing order if and only if the tree is valid. So walk the whole tree inorder, collect every value into an array, then do a second pass checking that each value is strictly greater than the one before it.</p>
        <pre class="p0-code">function isValidBST(root) {
  const values = [];
  function inorder(node) {
    if (!node) return;
    inorder(node.left);
    values.push(node.val);
    inorder(node.right);
  }
  inorder(root);
  for (let i = 1; i < values.length; i++) {
    if (values[i] <= values[i - 1]) return false;
  }
  return true;
}</pre>
        <p>Time: <strong>O(N)</strong> — every node visited once, plus one linear pass over the array. Space: <strong>O(N)</strong> — the values array holds every node's value, on top of the O(H) recursion stack.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — range bounds, no extra array</h4>
        <p>Pass a valid (low, high) range down through the recursion instead of storing anything. The root can be anything, so it starts at (-∞, ∞). Going left tightens the upper bound to the current node's value; going right tightens the lower bound. Each node just checks whether it fits inside the range it inherited from every ancestor above it.</p>
        <pre class="p0-code">function isValidBST(root) {
  function valid(node, low, high) {
    if (!node) return true;
    if (!(node.val > low && node.val < high)) return false;
    return valid(node.left, low, node.val)
        && valid(node.right, node.val, high);
  }
  return valid(root, -Infinity, Infinity);
}</pre>
        <p>Time: <strong>O(N)</strong> — every node visited once. Space: <strong>O(H)</strong> — just the recursion stack, no extra array of values.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — root = [5,1,4,null,null,3,6]</div>
        <div id="p1-vbst-tree"></div>
        <div class="p0-sim-log" id="p1-vbst-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-vbst-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty tree:</strong> valid by definition — true immediately, no nodes to violate anything.<br>
        <strong>Single node:</strong> no children to break the rule — always true.<br>
        <strong>Duplicate values:</strong> the BST rule here is strict (&gt; and &lt;, not &ge;/&le;) — a node equal to an ancestor's value is invalid, so the range check must use strict inequalities.<br>
        <strong>Deeply skewed tree (a long chain of only-left or only-right children):</strong> one bound keeps tightening every step while the other stays at ±∞ — still handled correctly since each recursive call only updates one side.<br>
        <strong>A node that looks fine next to its own parent but violates a rule from a higher ancestor:</strong> exactly what the range check is built to catch — a single parent comparison would miss it.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (inorder array + check)</td><td class="num">O(N)</td><td class="num">O(N)</td></tr>
          <tr><td>Optimal (range bounds)</td><td class="num">O(N)</td><td class="num">O(H)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ValidBSTStepper() {
    const btn = document.getElementById('p1-vbst-step-btn');
    if (!btn) return;
    const treeHost = document.getElementById('p1-vbst-tree');
    const logEl = document.getElementById('p1-vbst-log');

    const root = buildP1TreeFromArray([5, 1, 4, null, null, 3, 6]);

    function fmtBound(v) { return v === -Infinity ? '-∞' : v === Infinity ? '∞' : String(v); }

    const steps = [];
    let overallValid = true;
    (function walk(node, low, high, dir, parentVal) {
      if (!node || !overallValid) return;
      const ok = node.val > low && node.val < high;
      steps.push({ val: node.val, low, high, ok, dir, parentVal });
      if (!ok) { overallValid = false; return; }
      walk(node.left, low, node.val, 'left', node.val);
      if (!overallValid) return;
      walk(node.right, node.val, high, 'right', node.val);
    })(root, -Infinity, Infinity, 'start', null);

    let idx;
    const labels = new Map();

    function render(val) {
      treeHost.innerHTML = renderP1TreeFromRoot(root, {
        nodeLabels: labels,
        highlightVals: val === undefined ? null : new Set([val]),
      });
    }

    function reset() {
      idx = 0;
      labels.clear();
      render(null);
      logEl.textContent = 'Start at the root with no constraints yet — range is (-∞, ∞).';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      labels.set(s.val, `(${fmtBound(s.low)}, ${fmtBound(s.high)})`);
      render(s.val);
      let msg;
      if (s.dir === 'start') {
        msg = `Root, range (${fmtBound(s.low)}, ${fmtBound(s.high)}). `;
      } else if (s.dir === 'left') {
        msg = `Went left from ${s.parentVal}, so the upper bound tightens to ${s.parentVal}: range (${fmtBound(s.low)}, ${fmtBound(s.high)}). `;
      } else {
        msg = `Went right from ${s.parentVal}, so the lower bound tightens to ${s.parentVal}: range (${fmtBound(s.low)}, ${fmtBound(s.high)}). `;
      }
      msg += s.ok
        ? `Node ${s.val} fits inside this range — keep going.`
        : `Node ${s.val} does NOT fit inside this range — invalid BST, stop here.`;
      logEl.textContent = msg;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += overallValid ? ' Every node checked out — valid BST.' : ' Traversal stopped early — tree is invalid.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1KthSmallest() {
    return `
    <div class="p0-section-title">Kth Smallest Integer in a BST<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Trees — problem 8</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get the root of a binary search tree and an integer k. Return the kth smallest value among all the node values (1-indexed — k=1 means the smallest value in the whole tree).</p>
    </div>

    <div class="p0-card">
      <h4>A neat BST fact worth knowing first</h4>
      <p>Walking a BST <strong>inorder</strong> (left subtree, then the node, then right subtree) visits every value in strictly increasing order. root = [5,3,6,2,4,null,null,1] — the leftmost node is where that walk starts:</p>
      ${renderP1TreeSVG([5, 3, 6, 2, 4, null, null, 1], new Set([1]))}
      <p style="margin-top:10px;font-size:12.5px">An inorder walk of this tree visits: 1, 2, 3, 4, 5, 6 — already sorted. So "find the kth smallest value" is the same question as "what's the kth value an inorder walk visits?"</p>
      <div class="p0-arr-row" style="margin-top:8px">${[1, 2, 3, 4, 5, 6].map((v, i) => `<div class="p0-arr-cell" style="border-color:${i === 2 ? '#3b82f6' : 'rgba(255,255,255,0.25)'}">${v}</div>`).join('')}</div>
      <p style="margin-top:6px;font-size:12.5px;color:var(--sublabel)">k=3 → the 3rd value visited is 3.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you count nodes as you visit them inorder, what should that count equal at the exact moment you've found the answer?<br>
      2. Do you need to walk the entire tree and build the full sorted list first, or can you stop the instant you've counted k nodes?<br>
      3. If you wrote this recursively with a shared counter, and one deeply nested call finds the answer and returns early — does that automatically stop every call still waiting above it in the call stack, or only that one call?<br>
      4. The problem guarantees k is always a valid index (1 ≤ k ≤ number of nodes) — does your solution need to handle k being too large?</p>
    </div>

    ${renderP1Workflow('trees-kthSmallestIntegerInBST.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — full inorder traversal into an array, then index in</h4>
        <p>Walk the whole tree inorder, collecting every value into an array in sorted order. Once you have it, the answer is just the value at index k-1.</p>
        <pre class="p0-code">function kthSmallest(root, k) {
  const values = [];
  function inorder(node) {
    if (!node) return;
    inorder(node.left);
    values.push(node.val);
    inorder(node.right);
  }
  inorder(root);
  return values[k - 1];
}</pre>
        <p>Time: <strong>O(N)</strong> — visits every node, even if k is small and the answer shows up early. Space: <strong>O(N)</strong> — the values array holds every node's value, on top of the O(H) recursion stack.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — iterative inorder with an explicit stack, stop the moment k hits 0</h4>
        <p>Simulate the inorder walk yourself with a stack instead of recursion. Push every left child on the way down. When you run out of left children, pop one node — that's the next value in sorted order — decrement k, and check if you've arrived. If not, move into that node's right subtree and keep going. Because it's one flat loop, stopping the moment k reaches 0 genuinely stops everything, no leftover pending calls anywhere.</p>
        <pre class="p0-code">function kthSmallest(root, k) {
  const stack = [];
  let node = root;
  while (node || stack.length) {
    while (node) {
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();
    k--;
    if (k === 0) return node.val;
    node = node.right;
  }
}</pre>
        <p>Time: <strong>O(H + K)</strong> — walk down to the leftmost node once (O(H)), then only pop/advance K times. Space: <strong>O(H)</strong> — the stack only ever holds one root-to-node path.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — root = [5,3,6,2,4,null,null,1], k = 3</div>
        <div id="p1-ks-tree"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Stack (bottom → top)</div>
        <div class="p0-arr-row" id="p1-ks-stack"></div>
        <div class="p0-sim-log" id="p1-ks-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-ks-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>k = 1:</strong> answer is the tree's minimum — the leftmost node, found almost immediately.<br>
        <strong>k = total number of nodes:</strong> answer is the tree's maximum — the walk ends up visiting every node before it stops.<br>
        <strong>Single node:</strong> k must be 1, and the root is the answer.<br>
        <strong>A tempting bug in a recursive version:</strong> if you decrement a shared counter during a recursive inorder walk and return early once it hits 0, that early return only exits <em>that one</em> recursive call. Every ancestor call that already started its own left-subtree recursion will still run its own leftover steps afterward, unless it also explicitly checks a shared "found it" flag before doing anything else. The iterative stack version above sidesteps this entirely — there's just one loop to break out of.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (full inorder array)</td><td class="num">O(N)</td><td class="num">O(N)</td></tr>
          <tr><td>Optimal (iterative stack, early stop)</td><td class="num">O(H + K)</td><td class="num">O(H)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1KthSmallestStepper() {
    const btn = document.getElementById('p1-ks-step-btn');
    if (!btn) return;
    const treeHost = document.getElementById('p1-ks-tree');
    const stackHost = document.getElementById('p1-ks-stack');
    const logEl = document.getElementById('p1-ks-log');

    const root = buildP1TreeFromArray([5, 3, 6, 2, 4, null, null, 1]);
    const K = 3;

    const steps = [];
    {
      const stack = [];
      let node = root;
      let k = K;
      while (node || stack.length) {
        while (node) {
          stack.push(node);
          steps.push({ type: 'push', val: node.val, stackAfter: stack.map(n => n.val) });
          node = node.left;
        }
        node = stack.pop();
        k--;
        const found = k === 0;
        steps.push({ type: 'pop', val: node.val, remainingK: k, stackAfter: stack.map(n => n.val), found });
        if (found) break;
        node = node.right;
      }
    }

    let idx;

    function render(val) {
      treeHost.innerHTML = renderP1TreeFromRoot(root, { highlightVals: val === undefined ? null : new Set([val]) });
    }

    function reset() {
      idx = 0;
      render(null);
      stackHost.innerHTML = renderP1ArrayRow([]);
      logEl.textContent = `k = ${K}. Walk down the left spine, pushing every node onto the stack.`;
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      render(s.val);
      stackHost.innerHTML = renderP1ArrayRow(s.stackAfter);
      if (s.type === 'push') {
        logEl.textContent = `Push ${s.val} onto the stack, keep going left.`;
      } else {
        logEl.textContent = s.found
          ? `Pop ${s.val} — this is the smallest value not yet counted. k reaches 0 here: ${s.val} is the answer. Stop.`
          : `Pop ${s.val} — this is the next smallest value not yet counted. k is now ${s.remainingK}, not 0 yet — move into ${s.val}'s right subtree.`;
      }
      idx++;
      if (idx >= steps.length) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1ConstructTree() {
    return `
    <div class="p0-section-title">Construct Binary Tree from Preorder and Inorder Traversal<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Trees — problem 9</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get two arrays: a <strong>preorder</strong> traversal (root, then left subtree, then right subtree) and an <strong>inorder</strong> traversal (left subtree, then root, then right subtree) of the same binary tree. All values are unique. Rebuild and return the actual tree.</p>
    </div>

    <div class="p0-card">
      <h4>What the two arrays tell you</h4>
      <p>preorder = [3, 9, 20, 15, 7], inorder = [9, 3, 15, 20, 7] both describe this same tree:</p>
      ${renderP1TreeSVG([3, 9, 20, null, null, 15, 7])}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">Preorder always visits a subtree's root first. Inorder always visits a subtree's root strictly between its left subtree's values and its right subtree's values.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. In a preorder traversal, which position always holds the root of whatever subtree you're currently rebuilding?<br>
      2. Once you know a subtree's root value, how does the inorder array tell you exactly which values belong to its left subtree and which belong to its right subtree?<br>
      3. Once you know how many values landed in the left subtree, how does that tell you where the <em>next</em> root (the left child's root) sits in the preorder array?<br>
      4. Why does the problem's guarantee that all values are unique matter for using inorder to split the tree unambiguously?</p>
    </div>

    ${renderP1Workflow('trees-constructBinaryTreeFromPreorderAndInorderTraversal.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — linear search + slicing new arrays every call</h4>
        <p>Take the first element of preorder as the root. Linearly search inorder for that value to find the split point. Slice out the left and right portions of both arrays and recurse on those slices.</p>
        <pre class="p0-code">function buildTree(preorder, inorder) {
  if (!preorder.length) return null;
  const rootVal = preorder[0];
  const root = new TreeNode(rootVal);
  const mid = inorder.indexOf(rootVal);
  root.left = buildTree(preorder.slice(1, mid + 1), inorder.slice(0, mid));
  root.right = buildTree(preorder.slice(mid + 1), inorder.slice(mid + 1));
  return root;
}</pre>
        <p>Time: <strong>O(N&sup2;)</strong> — <code>indexOf</code> is O(N) per call, and slicing copies elements every level, across O(N) calls. Space: <strong>O(N&sup2;)</strong> worst case — every call allocates new sliced arrays (a fully skewed tree makes this add up fast).</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — hashmap for O(1) lookup, index ranges instead of slicing</h4>
        <p>Precompute a map from value → its index in inorder, so finding the split point is instant. Instead of slicing new arrays, pass along index ranges [left, right] into the original inorder array. Track one shared pointer into preorder that always points at the next unused value — every recursive call consumes exactly one.</p>
        <pre class="p0-code">function buildTree(preorder, inorder) {
  const inorderMap = new Map();
  inorder.forEach((v, i) => inorderMap.set(v, i));
  let preIndex = 0;
  function build(left, right) {
    if (left > right) return null;
    const rootVal = preorder[preIndex++];
    const root = new TreeNode(rootVal);
    const mid = inorderMap.get(rootVal);
    root.left = build(left, mid - 1);
    root.right = build(mid + 1, right);
    return root;
  }
  return build(0, inorder.length - 1);
}</pre>
        <p>Time: <strong>O(N)</strong> — every node created once, every lookup O(1). Space: <strong>O(N)</strong> — the hashmap, plus O(H) recursion stack.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]</div>
        <div id="p1-cbt-tree"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Preorder (blue = value just consumed)</div>
        <div id="p1-cbt-preorder"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Inorder (purple = current subtree's range, blue = the root found inside it)</div>
        <div id="p1-cbt-inorder"></div>
        <div class="p0-sim-log" id="p1-cbt-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-cbt-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Single node:</strong> preorder = [v], inorder = [v] — one node, recursion bottoms out immediately on both sides.<br>
        <strong>Fully left-skewed tree (every node has only a left child):</strong> the inorder array turns out to be the exact reverse of preorder.<br>
        <strong>Fully right-skewed tree (every node has only a right child):</strong> the inorder array turns out to be identical to preorder.<br>
        <strong>Duplicate values:</strong> not possible here — the problem guarantees every value is unique, which is exactly what makes "find this value's index in inorder" an unambiguous way to split the tree.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (indexOf + slicing)</td><td class="num">O(N&sup2;)</td><td class="num">O(N&sup2;)</td></tr>
          <tr><td>Optimal (hashmap + index ranges)</td><td class="num">O(N)</td><td class="num">O(N)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ConstructTreeStepper() {
    const btn = document.getElementById('p1-cbt-step-btn');
    if (!btn) return;
    const treeHost = document.getElementById('p1-cbt-tree');
    const preorderHost = document.getElementById('p1-cbt-preorder');
    const inorderHost = document.getElementById('p1-cbt-inorder');
    const logEl = document.getElementById('p1-cbt-log');

    const preorder = [3, 9, 20, 15, 7];
    const inorder = [9, 3, 15, 20, 7];
    const inorderMap = new Map();
    inorder.forEach((v, i) => inorderMap.set(v, i));

    const steps = [];
    {
      let preIndex = 0;
      (function build(left, right, parentVal, side) {
        if (left > right) return;
        const rootVal = preorder[preIndex];
        const mid = inorderMap.get(rootVal);
        steps.push({ val: rootVal, left, right, mid, preIndexUsed: preIndex, parentVal, side });
        preIndex++;
        build(left, mid - 1, rootVal, 'left');
        build(mid + 1, right, rootVal, 'right');
      })(0, inorder.length - 1, null, null);
    }

    function renderRangeRow(arr, left, right, mid) {
      return `<div class="p0-arr-row">${arr.map((v, i) => {
        let border = 'rgba(255,255,255,0.15)';
        if (i === mid) border = '#3b82f6';
        else if (left !== undefined && i >= left && i <= right) border = '#a855f7';
        return `<div class="p0-arr-cell" style="border-color:${border}">${v}</div>`;
      }).join('')}</div>`;
    }

    function renderPointerRow(arr, pointerIdx) {
      return `<div class="p0-arr-row">${arr.map((v, i) => `<div class="p0-arr-cell" style="border-color:${i === pointerIdx ? '#3b82f6' : 'rgba(255,255,255,0.15)'}">${v}</div>`).join('')}</div>`;
    }

    let idx;
    let builtRoot;

    function findNode(node, val) {
      if (!node) return null;
      if (node.val === val) return node;
      return findNode(node.left, val) || findNode(node.right, val);
    }

    function reset() {
      idx = 0;
      builtRoot = null;
      treeHost.innerHTML = renderP1TreeFromRoot(null);
      preorderHost.innerHTML = renderPointerRow(preorder, null);
      inorderHost.innerHTML = renderRangeRow(inorder, undefined, undefined, null);
      logEl.textContent = 'Preorder’s first value is always the root of the whole tree. Range to search in inorder: the full array.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      const node = { val: s.val, left: null, right: null };
      if (s.parentVal === null) {
        builtRoot = node;
      } else {
        const parent = findNode(builtRoot, s.parentVal);
        if (s.side === 'left') parent.left = node; else parent.right = node;
      }
      treeHost.innerHTML = renderP1TreeFromRoot(builtRoot, { highlightVals: new Set([s.val]) });
      preorderHost.innerHTML = renderPointerRow(preorder, s.preIndexUsed);
      inorderHost.innerHTML = renderRangeRow(inorder, s.left, s.right, s.mid);
      const rangeDesc = s.parentVal === null
        ? 'whole tree'
        : `${s.side} subtree of ${s.parentVal}`;
      logEl.textContent = `Next preorder value: ${s.val} → root of the ${rangeDesc} (inorder range [${s.left}, ${s.right}]). Found at inorder index ${s.mid} — everything left of it is the left subtree's range, everything right of it is the right subtree's range.`;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' All nodes placed — tree fully built.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1MaxPathSum() {
    return `
    <div class="p0-section-title">Binary Tree Maximum Path Sum<span class="p1-badge hard">Hard</span></div>
    <div class="p0-section-sub">Trees — problem 10</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>A "path" is any sequence of nodes where each adjacent pair is connected by an edge, and no node is used twice. The path does <strong>not</strong> have to pass through the root, and it does <strong>not</strong> have to end at a leaf. Given the root of a binary tree, return the largest possible sum of values along any such path.</p>
    </div>

    <div class="p0-card">
      <h4>What a "path" can look like</h4>
      <p>root = [-10, 9, 20, null, null, 15, 7]. The best path here is 15 → 20 → 7 — it doesn't touch the root at all, and it "bends" once at node 20, using both of node 20's children:</p>
      ${renderP1TreeSVG([-10, 9, 20, null, null, 15, 7], new Set([15, 20, 7]))}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">15 + 20 + 7 = 42. Note that a path can bend at exactly one node (going up from one child, through that node, back down the other child) — it can't bend a second time anywhere else, since that would mean revisiting a node or leaving a gap with no edge.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. Since a path can bend at most once, why can't it bend at two different nodes?<br>
      2. If you're standing at some node and need to report "the best path sum starting here, that my parent could extend upward," can that reported value include contributions from <em>both</em> your left child and right child? Why or why not?<br>
      3. Separately from what gets reported upward — what's the best path sum that's allowed to bend <em>right at this node</em>, using both children at once?<br>
      4. If a child's best contribution turns out to be negative, would including it in a path ever help? What should you use instead?</p>
    </div>

    ${renderP1Workflow('binaryTreeMaximumPathSum.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — treat every node as a possible "bend point," recompute from scratch each time</h4>
        <p>For every node in the tree, ask "what's the best path that bends here?" To answer that, you need the best straight-line (single-direction) sum going down into the left child, and the same for the right child — each computed with its own fresh recursive call.</p>
        <pre class="p0-code">function maxDownward(node) {
  if (!node) return 0;
  const left = Math.max(maxDownward(node.left), 0);
  const right = Math.max(maxDownward(node.right), 0);
  return node.val + Math.max(left, right);
}
function maxPathSum(root) {
  let best = -Infinity;
  function visit(node) {
    if (!node) return;
    const left = Math.max(maxDownward(node.left), 0);
    const right = Math.max(maxDownward(node.right), 0);
    best = Math.max(best, node.val + left + right);
    visit(node.left);
    visit(node.right);
  }
  visit(root);
  return best;
}</pre>
        <p>Time: <strong>O(N&sup2;)</strong> worst case — every one of the N nodes triggers its own fresh O(N) downward recursion. Space: <strong>O(H)</strong> — recursion depth at any one moment, though total work is quadratic.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — one combined post-order pass</h4>
        <p>Notice that <code>maxDownward</code> and <code>visit</code> above are walking the same tree, computing overlapping information twice. Merge them: a single post-order DFS that, at each node, computes the best downward-only contribution from each child (clamped to 0 if negative), uses <em>both</em> to check whether bending here beats the best path found so far, and returns just the better of the two single-direction options up to its own parent (since a path handed upward can't bend twice).</p>
        <pre class="p0-code">function maxPathSum(root) {
  let best = -Infinity;
  function dfs(node) {
    if (!node) return 0;
    const left = Math.max(dfs(node.left), 0);
    const right = Math.max(dfs(node.right), 0);
    best = Math.max(best, node.val + left + right);
    return node.val + Math.max(left, right);
  }
  dfs(root);
  return best;
}</pre>
        <p>Time: <strong>O(N)</strong> — every node visited exactly once. Space: <strong>O(H)</strong> — just the recursion stack.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — root = [-10,9,20,null,null,15,7]</div>
        <div id="p1-mps-tree"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Best path sum found so far</div>
        <div class="p0-code" id="p1-mps-best"></div>
        <div class="p0-sim-log" id="p1-mps-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-mps-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>A child's downward contribution is negative:</strong> clamp it to 0 before adding it in — a negative contribution would only shrink the sum, so it's better to not extend the path into that child at all.<br>
        <strong>Single node:</strong> no children to bend into — the answer is just that node's own value, even if it's negative.<br>
        <strong>Every value in the tree is negative:</strong> clamping a child's contribution to 0 only affects whether you extend <em>into</em> that child — the final answer itself has no floor at 0, since a path must contain at least one real node, and the best available node might still be negative.<br>
        <strong>A node with only one child:</strong> the "bend" at that node naturally degrades into a straight chain through the one existing child, since the missing child's clamped contribution is exactly 0.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (fresh downward call per node)</td><td class="num">O(N&sup2;)</td><td class="num">O(H)</td></tr>
          <tr><td>Optimal (single combined pass)</td><td class="num">O(N)</td><td class="num">O(H)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1MaxPathSumStepper() {
    const btn = document.getElementById('p1-mps-step-btn');
    if (!btn) return;
    const treeHost = document.getElementById('p1-mps-tree');
    const bestHost = document.getElementById('p1-mps-best');
    const logEl = document.getElementById('p1-mps-log');

    const root = buildP1TreeFromArray([-10, 9, 20, null, null, 15, 7]);

    const steps = [];
    let best = -Infinity;
    (function dfs(node) {
      if (!node) return 0;
      const leftRaw = dfs(node.left);
      const rightRaw = dfs(node.right);
      const left = Math.max(leftRaw, 0);
      const right = Math.max(rightRaw, 0);
      const bendSum = node.val + left + right;
      const prevBest = best;
      best = Math.max(best, bendSum);
      const upward = node.val + Math.max(left, right);
      steps.push({ val: node.val, left, right, bendSum, prevBest, newBest: best, upward, updated: best !== prevBest });
      return upward;
    })(root);

    let idx;
    const labels = new Map();

    function render(val) {
      treeHost.innerHTML = renderP1TreeFromRoot(root, { nodeLabels: labels, highlightVals: val === undefined ? null : new Set([val]) });
    }

    function fmtBest(v) { return v === -Infinity ? '(none yet)' : String(v); }

    function reset() {
      idx = 0;
      labels.clear();
      best = -Infinity;
      render(null);
      bestHost.textContent = fmtBest(-Infinity);
      logEl.textContent = 'Post-order DFS: process both children fully before this node. Starts at the deepest leaves.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      labels.set(s.val, `up:${s.upward}`);
      render(s.val);
      bestHost.textContent = fmtBest(s.newBest);
      logEl.textContent = `Node ${s.val}: left contributes ${s.left}, right contributes ${s.right} (negatives clamped to 0). Bending here: ${s.val} + ${s.left} + ${s.right} = ${s.bendSum}.` +
        (s.updated ? ` New best! (was ${fmtBest(s.prevBest)})` : ` Not better than the current best (${fmtBest(s.prevBest)}).`) +
        ` Reports ${s.upward} upward (its own value + the better single side).`;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ` Done — maximum path sum is ${s.newBest}.`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1SerDe() {
    return `
    <div class="p0-section-title">Serialize and Deserialize Binary Tree<span class="p1-badge hard">Hard</span></div>
    <div class="p0-section-sub">Trees — problem 11</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>Design two functions: <strong>serialize(root)</strong>, which turns a binary tree into a string, and <strong>deserialize(data)</strong>, which turns that string back into a tree with the exact same shape and values. There's no required format — you just have to be able to round-trip any tree through your own encoding.</p>
    </div>

    <div class="p0-card">
      <h4>What a round trip needs to preserve</h4>
      <p>root = [1,2,3,null,null,4,5] can become the string "1,2,N,N,3,4,N,N,5,N,N" — every null child gets its own placeholder ('N') so the tree's exact <em>shape</em> survives, not just its values:</p>
      ${renderP1TreeSVG([1, 2, 3, null, null, 4, 5])}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you wrote down each node's value in some traversal order but skipped null children entirely, could two different-shaped trees end up producing the exact same string? Why does that break the round trip?<br>
      2. Preorder (root, then left, then right) has a handy property: the very first token is always the root of whatever subtree you're currently rebuilding. Why does that make deserializing easier than starting from an inorder string?<br>
      3. If serialize walks the tree in a specific order, what does deserialize need to do to line back up with that exact same order?<br>
      4. What should serialize output for a completely empty tree? What should deserialize do when it reads that back?</p>
    </div>

    ${renderP1Workflow('trees-serializeAndDeserializeBinaryTree.js')}

    <details class="p0-reveal">
      <summary>Two valid approaches — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Approach 1 — Preorder DFS with null markers (recommended)</h4>
        <p>Walk the tree preorder. At every node — including null ones — push a token: the value as a string, or 'N' for null. Join with commas. To deserialize, split back into tokens and walk them with a shared pointer: read the next token; if it's 'N', consume it and return null; otherwise create a node, consume the token, then recursively rebuild its left and right children from the <em>same</em> pointer.</p>
        <pre class="p0-code">function serialize(root) {
  const res = [];
  function dfs(node) {
    if (!node) { res.push('N'); return; }
    res.push(String(node.val));
    dfs(node.left);
    dfs(node.right);
  }
  dfs(root);
  return res.join(',');
}
function deserialize(data) {
  const vals = data.split(',');
  let i = 0;
  function build() {
    const token = vals[i++];
    if (token === 'N') return null;
    const node = new TreeNode(Number(token));
    node.left = build();
    node.right = build();
    return node;
  }
  return build();
}</pre>
        <p>Time: <strong>O(N)</strong> both ways — every real node and every null child produces exactly one token. Space: <strong>O(N)</strong> — the token string/array, plus O(H) recursion stack.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — root = [1,2,3,null,null,4,5]</div>
        <div class="p0-diagram-label">Original tree (serialize walks this)</div>
        <div id="p1-serde-tree"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Token string (blue = current position)</div>
        <div id="p1-serde-tokens"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Reconstructed tree (deserialize builds this)</div>
        <div id="p1-serde-rebuilt"></div>
        <div class="p0-sim-log" id="p1-serde-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-serde-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Approach 2 — Level-order BFS with null markers</h4>
        <p>Same idea, different traversal: use a queue, and for every real node dequeued, push its value then enqueue both children (pushing 'N' placeholders for missing ones instead of enqueuing them). This is the format LeetCode itself displays trees in — it's the same style every <code>buildTree(arr)</code> test helper you've been using all session already uses, just written out as an explicit string instead of a JS array.</p>
        <p style="margin-top:8px;font-size:12.5px;color:var(--sublabel)">Same complexity as Approach 1 — O(N) time, O(N) space. Neither traversal is "more correct"; the problem explicitly says there's no required format, so either is a fully valid design choice.</p>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty tree:</strong> serialize should output just a single 'N' token, and deserialize on that string should immediately return null without creating any node.<br>
        <strong>Every node has zero, one, or two children, mixed throughout the tree:</strong> the null-marker format handles all of it uniformly — every node, real or null, contributes exactly one token, so there's never a special case to add.<br>
        <strong>Negative values:</strong> splitting on a plain comma and parsing with <code>Number(...)</code> works fine as long as the delimiter itself never appears inside a value — true for plain integers, including negative ones.<br>
        <strong>Large trees:</strong> the string grows to roughly 2N+1 tokens (N real values, up to N+1 null markers) — still linear in the number of nodes.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Preorder DFS with null markers</td><td class="num">O(N)</td><td class="num">O(N)</td></tr>
          <tr><td>Level-order BFS with null markers</td><td class="num">O(N)</td><td class="num">O(N)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1SerDeStepper() {
    const btn = document.getElementById('p1-serde-step-btn');
    if (!btn) return;
    const treeHost = document.getElementById('p1-serde-tree');
    const tokensHost = document.getElementById('p1-serde-tokens');
    const rebuiltHost = document.getElementById('p1-serde-rebuilt');
    const logEl = document.getElementById('p1-serde-log');

    const root = buildP1TreeFromArray([1, 2, 3, null, null, 4, 5]);

    const tokens = [];
    const steps = [];
    (function dfs(node) {
      if (!node) {
        tokens.push('N');
        steps.push({ phase: 'serialize', token: 'N', val: null, tokensSoFar: [...tokens] });
        return;
      }
      tokens.push(String(node.val));
      steps.push({ phase: 'serialize', token: String(node.val), val: node.val, tokensSoFar: [...tokens] });
      dfs(node.left);
      dfs(node.right);
    })(root);

    {
      let i = 0;
      (function build(parentVal, side) {
        const token = tokens[i];
        const consumedIdx = i;
        i++;
        if (token === 'N') {
          steps.push({ phase: 'deserialize', token, val: null, consumedIdx, parentVal, side });
          return;
        }
        const val = Number(token);
        steps.push({ phase: 'deserialize', token, val, consumedIdx, parentVal, side });
        build(val, 'left');
        build(val, 'right');
      })(null, null);
    }

    function renderTokenRow(highlightIdx, upTo) {
      const shown = upTo === undefined ? tokens : tokens.slice(0, upTo);
      return `<div class="p0-arr-row">${shown.map((t, i) => `<div class="p0-arr-cell" style="border-color:${i === highlightIdx ? '#3b82f6' : 'rgba(255,255,255,0.2)'}">${t}</div>`).join('')}</div>`;
    }

    function findNode(node, val) {
      if (!node) return null;
      if (node.val === val) return node;
      return findNode(node.left, val) || findNode(node.right, val);
    }

    const serializeCount = steps.filter(x => x.phase === 'serialize').length;
    let idx;
    let rebuiltRoot;

    function reset() {
      idx = 0;
      rebuiltRoot = null;
      treeHost.innerHTML = renderP1TreeFromRoot(root);
      tokensHost.innerHTML = renderTokenRow(null, 0);
      rebuiltHost.innerHTML = renderP1TreeFromRoot(null);
      logEl.textContent = 'Phase 1: serialize. Walk the original tree preorder, writing one token per node (including nulls).';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.phase === 'serialize') {
        treeHost.innerHTML = renderP1TreeFromRoot(root, { highlightVals: s.val === null ? null : new Set([s.val]) });
        tokensHost.innerHTML = renderTokenRow(s.tokensSoFar.length - 1, s.tokensSoFar.length);
        logEl.textContent = s.val === null
          ? `Null child → write 'N'.`
          : `Node ${s.val} → write "${s.val}".`;
      } else {
        if (s.token !== 'N') {
          const node = { val: s.val, left: null, right: null };
          if (s.parentVal === null) {
            rebuiltRoot = node;
          } else {
            const parent = findNode(rebuiltRoot, s.parentVal);
            if (s.side === 'left') parent.left = node; else parent.right = node;
          }
        }
        tokensHost.innerHTML = renderTokenRow(s.consumedIdx);
        rebuiltHost.innerHTML = renderP1TreeFromRoot(rebuiltRoot, { highlightVals: s.val === null ? null : new Set([s.val]) });
        const prefix = idx === serializeCount ? 'Phase 2: deserialize. Read the token string back, in the same order it was written. ' : '';
        logEl.textContent = prefix + (s.token === 'N'
          ? `Read 'N' → null. This branch ends here.`
          : `Read "${s.val}" → create node ${s.val}${s.parentVal === null ? ' (the root)' : ` as ${s.side} child of ${s.parentVal}`}.`);
      }
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Done — reconstructed tree matches the original exactly.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // Renders a 2D grid (e.g. land/water) as CSS-grid cells. opts.cellColors: same-shaped 2D array of
  // hex colors (or null per cell) that overrides the default land/water look — used to show islands
  // being "sunk" one at a time during a step-through. opts.currentRC: [r, c] of the cell being visited
  // right now, drawn with a highlighted outline. First shared visual helper for grid-based (Graphs)
  // problems — later grid problems (e.g. Course Schedule's neighbors, flood-fill variants) can reuse it.
  // Tries' first visual: builds a small trie from a word list and lays it out as an n-ary tree
  // (character per node, root drawn as a dot). Nodes marked isEnd (a real inserted word ends there)
  // get a green ring. opts.highlightPath: a word/prefix to trace from the root — nodes along the
  // matched portion turn blue, and the final relevant node is colored green (success) or red
  // (dead end, or found-but-not-a-word for search) depending on opts.requireEnd (true for search,
  // false/omitted for startsWith, since startsWith only needs the path to exist).
  function buildP1TrieForVisual(words) {
    const root = { children: {}, isEnd: false, char: '' };
    for (const w of words) {
      let node = root;
      for (const ch of w) {
        if (!node.children[ch]) node.children[ch] = { children: {}, isEnd: false, char: ch };
        node = node.children[ch];
      }
      node.isEnd = true;
    }
    return root;
  }

  function walkP1TriePath(root, str) {
    const path = [root];
    let node = root;
    for (const ch of str) {
      if (!node.children[ch]) return { path, complete: false };
      node = node.children[ch];
      path.push(node);
    }
    return { path, complete: true, isEnd: node.isEnd };
  }

  function layoutP1TrieForVisual(root) {
    const nodes = [];
    const edges = [];
    const idOf = new Map();
    let nextX = 0;
    function assign(node, depth) {
      const id = nodes.length;
      idOf.set(node, id);
      nodes.push({ id, char: node.char, isEnd: node.isEnd, depth, x: 0 });
      const childChars = Object.keys(node.children).sort();
      if (childChars.length === 0) {
        nodes[id].x = nextX++;
      } else {
        const childIds = childChars.map(ch => {
          const childId = assign(node.children[ch], depth + 1);
          edges.push([id, childId]);
          return childId;
        });
        nodes[id].x = childIds.reduce((sum, cid) => sum + nodes[cid].x, 0) / childIds.length;
      }
      return id;
    }
    assign(root, 0);
    const maxDepth = Math.max(...nodes.map(n => n.depth));
    return { nodes, edges, maxDepth, leafCount: nextX, idOf };
  }

  function renderP1Trie(words, opts) {
    opts = opts || {};
    const root = buildP1TrieForVisual(words);
    const { nodes, edges, maxDepth, leafCount, idOf } = layoutP1TrieForVisual(root);

    let highlightIds = new Set();
    let finalId = null, finalColor = null;
    if (opts.highlightPath !== undefined) {
      const { path, complete, isEnd } = walkP1TriePath(root, opts.highlightPath);
      highlightIds = new Set(path.map(n => idOf.get(n)));
      finalId = idOf.get(path[path.length - 1]);
      if (!complete) finalColor = '#ef4444';
      else if (opts.requireEnd) finalColor = isEnd ? '#22c55e' : '#ef4444';
      else finalColor = '#22c55e';
    }

    const COL_W = 46, ROW_H = 54, PAD = 24;
    const W = Math.max(220, leafCount * COL_W + PAD * 2);
    const H = (maxDepth + 1) * ROW_H + PAD;
    const xFor = x => PAD + x * COL_W;
    const yFor = d => PAD + d * ROW_H;

    const edgeLines = edges.map(([a, c]) => {
      const A = nodes[a], C = nodes[c];
      const active = highlightIds.has(a) && highlightIds.has(c);
      return `<line x1="${xFor(A.x).toFixed(1)}" y1="${yFor(A.depth).toFixed(1)}" x2="${xFor(C.x).toFixed(1)}" y2="${yFor(C.depth).toFixed(1)}" stroke="${active ? '#3b82f6' : 'rgba(255,255,255,0.2)'}" stroke-width="${active ? 2.2 : 1.4}"/>`;
    }).join('');

    const circles = nodes.map(nd => {
      const cx = xFor(nd.x).toFixed(1), cy = yFor(nd.depth).toFixed(1);
      const isRoot = nd.depth === 0;
      const isFinal = nd.id === finalId;
      const isOnPath = highlightIds.has(nd.id);
      let stroke = nd.isEnd ? '#22c55e' : 'rgba(255,255,255,0.35)';
      let fill = nd.isEnd ? '#22c55e33' : (isRoot ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)');
      if (isOnPath && !isFinal) { stroke = '#3b82f6'; fill = nd.isEnd ? '#22c55e33' : '#3b82f633'; }
      if (isFinal) { stroke = finalColor; fill = finalColor + '33'; }
      const label = isRoot ? '•' : escapeHtml(nd.char);
      return `<circle cx="${cx}" cy="${cy}" r="15" fill="${fill}" stroke="${stroke}" stroke-width="2.2"/>`
        + `<text x="${cx}" y="${(parseFloat(cy) + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-family="monospace" font-weight="600" fill="var(--body-text)">${label}</text>`;
    }).join('');

    return `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${edgeLines}${circles}</svg></div>`;
  }

  function renderP1Grid(grid, opts) {
    opts = opts || {};
    const cellColors = opts.cellColors;
    const currentRC = opts.currentRC;
    const cols = grid[0] ? grid[0].length : 0;
    const cellsHtml = grid.map((row, r) => row.map((val, c) => {
      const isCurrent = currentRC && currentRC[0] === r && currentRC[1] === c;
      const color = cellColors && cellColors[r][c];
      let cls = 'p1-grid-cell';
      let style = '';
      if (color) {
        style = `background:${color}33;border-color:${color};color:${color}`;
      } else if (val === '1') {
        cls += ' land';
      } else {
        cls += ' water';
      }
      if (isCurrent) cls += ' current';
      return `<div class="${cls}" style="${style}">${val}</div>`;
    }).join('')).join('');
    return `<div class="p1-grid" style="grid-template-columns:repeat(${cols}, 32px)">${cellsHtml}</div>`;
  }

  // Second shared Graphs visual: node-and-edge diagrams for non-grid graphs (adjacency lists), laid
  // out in a circle so any small graph reads cleanly without needing a fixed tree/grid shape.
  // n: node count (nodes are always 1..n). opts.edges: array of [a, b] value pairs to draw.
  // opts.directed: draw arrowheads a→b instead of plain lines (for prerequisite/dependency graphs).
  // opts.activeVals: Set of vals to draw solid (others draw faint/dashed — "not created yet", used to
  // show a clone being built incrementally). opts.highlightVals: Set of vals to draw filled-in with
  // opts.highlightColor (defaults to blue) — reused for "chosen"/"robbed" marking, not just current-node.
  // opts.nodeStates: object val -> 'visiting' | 'done' for 3-color DFS traversal state (cycle
  // detection); when set, this takes over node coloring instead of activeVals/dashing.
  // opts.zeroIndexed: display labels as val-1 (edges/state keys still use internal 1..n) — for
  // problems (like Course Schedule) whose own numbering starts at 0.
  function renderP1GraphSVG(n, opts) {
    opts = opts || {};
    const edges = opts.edges || [];
    const activeVals = opts.activeVals;
    const highlightVals = opts.highlightVals;
    const nodeStates = opts.nodeStates;
    const directed = !!opts.directed;
    const zeroIndexed = !!opts.zeroIndexed;
    if (!n) return `<div style="font-size:12px;color:var(--muted);padding:6px 0">(empty graph)</div>`;
    const W = 240, H = 200, R = 78, cx = W / 2, cy = H / 2, NODE_R = 16;
    const pos = Array.from({ length: n }, (_, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
    });
    const edgeParts = edges.map(([a, b]) => {
      const p1 = pos[a - 1], p2 = pos[b - 1];
      if (!directed) {
        return `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="rgba(255,255,255,0.25)" stroke-width="1.6"/>`;
      }
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const AL = 7, AW = 5;
      const baseX = p2.x - (NODE_R + AL) * Math.cos(angle), baseY = p2.y - (NODE_R + AL) * Math.sin(angle);
      const tipX = p2.x - NODE_R * Math.cos(angle), tipY = p2.y - NODE_R * Math.sin(angle);
      const leftX = baseX + AW * Math.cos(angle + Math.PI / 2), leftY = baseY + AW * Math.sin(angle + Math.PI / 2);
      const rightX = baseX + AW * Math.cos(angle - Math.PI / 2), rightY = baseY + AW * Math.sin(angle - Math.PI / 2);
      return `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${baseX.toFixed(1)}" y2="${baseY.toFixed(1)}" stroke="rgba(255,255,255,0.3)" stroke-width="1.6"/>`
        + `<polygon points="${tipX.toFixed(1)},${tipY.toFixed(1)} ${leftX.toFixed(1)},${leftY.toFixed(1)} ${rightX.toFixed(1)},${rightY.toFixed(1)}" fill="rgba(255,255,255,0.45)"/>`;
    }).join('');
    const circles = Array.from({ length: n }, (_, i) => {
      const val = i + 1;
      let fill, stroke, textFill, dash = '';
      if (nodeStates) {
        const state = nodeStates[val];
        if (state === 'visiting') { fill = 'rgba(234,179,8,0.18)'; stroke = 'var(--yellow)'; textFill = 'var(--yellow)'; }
        else if (state === 'done') { fill = 'rgba(34,197,94,0.18)'; stroke = 'var(--green)'; textFill = 'var(--green)'; }
        else { fill = 'rgba(255,255,255,0.08)'; stroke = 'rgba(255,255,255,0.35)'; textFill = 'var(--body-text)'; }
      } else {
        const isActive = !activeVals || activeVals.has(val);
        fill = isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)';
        stroke = isActive ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)';
        textFill = isActive ? 'var(--body-text)' : 'var(--muted)';
        dash = isActive ? '' : ' stroke-dasharray="3,2"';
      }
      const isHighlight = highlightVals && highlightVals.has(val);
      if (isHighlight) { fill = opts.highlightColor || '#3b82f6'; stroke = opts.highlightColor || '#3b82f6'; textFill = '#fff'; }
      const showLabel = nodeStates ? true : (!activeVals || activeVals.has(val));
      const displayVal = zeroIndexed ? val - 1 : val;
      const label = showLabel ? `<text x="${pos[i].x.toFixed(1)}" y="${(pos[i].y + 4).toFixed(1)}" text-anchor="middle" font-size="13" font-family="monospace" font-weight="600" fill="${textFill}">${displayVal}</text>` : '';
      return `<circle cx="${pos[i].x.toFixed(1)}" cy="${pos[i].y.toFixed(1)}" r="${NODE_R}" fill="${fill}" stroke="${stroke}" stroke-width="2"${dash}/>${label}`;
    }).join('');
    return `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${edgeParts}${circles}</svg></div>`;
  }

  // Shared Heap/Priority Queue visual: draws a binary heap laid out from its backing array, using
  // the standard implicit-tree rule (node i's children live at 2i+1 and 2i+2). Reusable for any
  // future heap problem, not just Kth Largest — pass opts.highlight = { index: '#hexcolor' } to ring
  // specific nodes (e.g. the node that just moved during a bubble-up/down step).
  function renderP1Heap(data, opts) {
    opts = opts || {};
    const highlight = opts.highlight || {};
    const n = data.length;
    if (!n) return `<div style="font-size:12px;color:var(--muted);padding:6px 0">(empty heap)</div>`;

    const maxDepth = Math.floor(Math.log2(n));
    const COL_W = 46, ROW_H = 54, PAD = 24;
    const fullWidth = Math.pow(2, maxDepth) * COL_W;
    const W = Math.max(220, fullWidth + PAD * 2);
    const H = (maxDepth + 1) * ROW_H + PAD;

    const depthOf = i => Math.floor(Math.log2(i + 1));
    const xFor = i => {
      const d = depthOf(i);
      const levelStart = Math.pow(2, d) - 1;
      const posInLevel = i - levelStart;
      const totalInLevel = Math.pow(2, d);
      return PAD + ((posInLevel + 0.5) / totalInLevel) * fullWidth;
    };
    const yFor = i => PAD + depthOf(i) * ROW_H;

    const edgeLines = [];
    for (let i = 0; i < n; i++) {
      for (const c of [2 * i + 1, 2 * i + 2]) {
        if (c < n) {
          edgeLines.push(`<line x1="${xFor(i).toFixed(1)}" y1="${yFor(i).toFixed(1)}" x2="${xFor(c).toFixed(1)}" y2="${yFor(c).toFixed(1)}" stroke="rgba(255,255,255,0.2)" stroke-width="1.4"/>`);
        }
      }
    }

    const circles = data.map((val, i) => {
      const cx = xFor(i).toFixed(1), cy = yFor(i).toFixed(1);
      const isRoot = i === 0;
      let fill = isRoot ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)';
      let stroke = 'rgba(255,255,255,0.35)';
      if (highlight[i]) { fill = highlight[i] + '33'; stroke = highlight[i]; }
      return `<circle cx="${cx}" cy="${cy}" r="15" fill="${fill}" stroke="${stroke}" stroke-width="2.2"/>`
        + `<text x="${cx}" y="${(parseFloat(cy) + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-family="monospace" font-weight="600" fill="var(--body-text)">${val}</text>`;
    }).join('');

    return `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${edgeLines.join('')}${circles}</svg></div>`;
  }

  function renderP1NumberOfIslands() {
    return `
    <div class="p0-section-title">Number of Islands<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Graphs — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a 2D grid of <code>'1'</code>s (land) and <code>'0'</code>s (water). An <strong>island</strong> is a group of land cells connected to each other only up, down, left, or right — never diagonally. Count how many separate islands are in the grid.</p>
    </div>

    <div class="p0-card">
      <h4>What "connected" means here</h4>
      <p>These three land cells are all directly next to one another — that's <strong>one</strong> island:</p>
      ${renderP1Grid([['1','1','0'],['0','1','0'],['0','0','0']])}
      <p style="margin-top:16px">These two land cells only touch at a corner, with no up/down/left/right path between them — that's <strong>two separate</strong> islands, not one:</p>
      ${renderP1Grid([['1','0'],['0','1']])}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you land on an unvisited <code>'1'</code>, how do you find every other land cell that belongs to the same island?<br>
      2. Once you've counted every cell in one island, how do you make sure none of those cells get counted again as the start of a "new" island later?<br>
      3. What's the simplest way to explore all connected land from one starting cell — recursion, an explicit stack, or a queue? What does each cost in space?<br>
      4. What should happen for an empty grid? A grid that's entirely water? A grid that's entirely land?</p>
    </div>

    ${renderP1Workflow('graph-numberOfIslands.js')}

    <details class="p0-reveal">
      <summary>Approach &amp; step-through — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>DFS flood fill</h4>
        <p>Scan every cell in order. Whenever you find an unvisited <code>'1'</code>, you've found a brand-new island — count it, then flood outward from that cell (DFS or BFS), marking every connected land cell as visited so the outer scan never counts any of them again.</p>
        <pre class="p0-code">function numIslands(grid) {
  const ROWS = grid.length, COLS = grid[0].length;
  let islands = 0;

  function dfs(r, c) {
    if (r < 0 || c < 0 || r >= ROWS || c >= COLS || grid[r][c] === '0') return;
    grid[r][c] = '0'; // sink it so it's never revisited
    dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === '1') {
        islands++;
        dfs(r, c);
      }
    }
  }
  return islands;
}</pre>
        <p>Time: <strong>O(M&times;N)</strong> — every cell is visited (and sunk) at most once across the whole run, no matter how the flood fills spread out. Space: <strong>O(M&times;N)</strong> worst case — if the entire grid is land, the DFS recursion stack can go as deep as the total cell count.</p>
        <p style="margin-top:8px;font-size:12.5px;color:var(--sublabel)">Mutating the grid in place (<code>'1'</code> → <code>'0'</code>) to mark a cell visited avoids needing a separate <code>visited</code> set — a fine trade when you're allowed to modify the input. A BFS with an explicit queue solves it in the same O(M&times;N)/O(M&times;N) bounds and avoids recursion-depth limits on very large grids — a real alternative, not a worse "brute force."</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — a 4×5 grid with 3 islands</div>
        <div id="p1-isl-grid"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Islands found so far</div>
        <div class="p0-code" id="p1-isl-count"></div>
        <div class="p0-sim-log" id="p1-isl-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-isl-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty grid</strong> (no rows, or rows with no columns): 0 islands — check this before touching <code>grid[0].length</code>.<br>
        <strong>All water:</strong> the outer loop never finds a <code>'1'</code>, so the count stays 0.<br>
        <strong>All land:</strong> one DFS call from the very first cell sinks the entire grid — the count ends at exactly 1.<br>
        <strong>Diagonal-only land:</strong> DFS only checks the 4 orthogonal neighbors, so diagonal cells never merge into the same island automatically — that's correct, not a bug.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>DFS flood fill (in-place)</td><td class="num">O(M&times;N)</td><td class="num">O(M&times;N)</td></tr>
          <tr><td>BFS flood fill (queue)</td><td class="num">O(M&times;N)</td><td class="num">O(M&times;N)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1IslandsStepper() {
    const btn = document.getElementById('p1-isl-step-btn');
    if (!btn) return;
    const gridHost = document.getElementById('p1-isl-grid');
    const countHost = document.getElementById('p1-isl-count');
    const logEl = document.getElementById('p1-isl-log');

    const ISLAND_COLORS = ['#3b82f6', '#a855f7', '#f97316', '#eab308', '#06b6d4', '#ef4444'];
    const grid = [
      ['1', '1', '0', '0', '0'],
      ['1', '1', '0', '0', '0'],
      ['0', '0', '1', '0', '0'],
      ['0', '0', '0', '1', '1'],
    ];
    const ROWS = grid.length, COLS = grid[0].length;
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    // Simulate the exact DFS flood-fill order so the stepper matches the reveal's algorithm precisely.
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const steps = [];
    const newIslandStepIdx = new Set();
    let totalIslands = 0;

    function dfs(r, c, islandNum) {
      if (r < 0 || c < 0 || r >= ROWS || c >= COLS || grid[r][c] === '0' || visited[r][c]) return;
      visited[r][c] = true;
      steps.push({ r, c, islandNum });
      for (const [dr, dc] of DIRS) dfs(r + dr, c + dc, islandNum);
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === '1' && !visited[r][c]) {
          totalIslands++;
          newIslandStepIdx.add(steps.length);
          dfs(r, c, totalIslands);
        }
      }
    }

    let idx, colors;

    function render(currentRC) {
      gridHost.innerHTML = renderP1Grid(grid, { cellColors: colors, currentRC });
    }

    function reset() {
      idx = 0;
      colors = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      render(null);
      countHost.textContent = '0';
      logEl.textContent = 'Scanning the grid left-to-right, top-to-bottom, looking for an unvisited land cell.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      const isNew = newIslandStepIdx.has(idx);
      colors[s.r][s.c] = ISLAND_COLORS[(s.islandNum - 1) % ISLAND_COLORS.length];
      render([s.r, s.c]);
      countHost.textContent = String(s.islandNum);
      logEl.textContent = isNew
        ? `Found new land at (${s.r},${s.c}) — starting island #${s.islandNum}. DFS floods outward from here.`
        : `DFS spreads to (${s.r},${s.c}) — still island #${s.islandNum}, marking it visited.`;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ` Done — ${totalIslands} island(s) total.`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1CloneGraph() {
    return `
    <div class="p0-section-title">Clone Graph<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Graphs — problem 2</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You're given a reference to one node in a connected undirected graph. Each node has a value and a list of neighbor references. Return a <strong>deep copy</strong> of the whole graph — every node must be a brand-new object, but the copy must have the exact same values and the exact same connections as the original.</p>
    </div>

    <div class="p0-card">
      <h4>What "deep copy" means here</h4>
      <p>This 4-node graph has a cycle: 1↔2, 2↔3, 3↔4, 4↔1.</p>
      ${renderP1GraphSVG(4, { edges: [[1, 2], [2, 3], [3, 4], [4, 1]] })}
      <p style="margin-top:10px">A correct clone reproduces this exact same shape — same 4 values, same 4 connections — but every single node object is new. None of the cloned nodes should be <code>===</code> to any original node.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. The graph can have cycles (node A points to node B, which points back to A). If you clone A, then start cloning its neighbor B, and B's neighbor list points back to A — what stops this from recursing forever?<br>
      2. What data structure lets you check "have I already cloned this node?" and, if so, hand back the <em>same</em> clone instead of making a second one?<br>
      3. Since a node's neighbor list can point to a node you haven't finished cloning yet, does it matter whether you store a node's clone in that structure <em>before</em> or <em>after</em> recursing into its neighbors?<br>
      4. What should happen for a graph with a single node and no edges? For a completely empty graph (null input)?</p>
    </div>

    ${renderP1Workflow('graph-cloneGraph.js')}

    <details class="p0-reveal">
      <summary>Approach &amp; step-through — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>DFS with a hash map from old node → new node</h4>
        <p>Use a map to remember which original nodes have already been cloned. On visiting a node: if it's already in the map, return its existing clone immediately — this is what breaks cycles. Otherwise, create its clone <em>first</em> and store it in the map <em>before</em> recursing into its neighbors, so if a neighbor's DFS loops back to this node, the map lookup finds the clone instead of recursing infinitely.</p>
        <pre class="p0-code">function cloneGraph(node) {
  const oldToNew = new Map();

  function dfs(node) {
    if (node === null) return null;
    if (oldToNew.has(node)) return oldToNew.get(node);

    const copy = new Node(node.val);
    oldToNew.set(node, copy);
    for (const nei of node.neighbors) {
      copy.neighbors.push(dfs(nei));
    }
    return copy;
  }

  return dfs(node);
}</pre>
        <p>Time: <strong>O(N + E)</strong> — every node is visited once, and every edge is crossed once from each of its two directions. Space: <strong>O(N)</strong> — the map holds one entry per node, plus O(N) recursion depth worst case.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — original graph vs. clone being built</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:180px"><div class="p0-diagram-label">Original</div><div id="p1-cg-orig"></div></div>
          <div style="flex:1;min-width:180px"><div class="p0-diagram-label">Clone (in progress)</div><div id="p1-cg-clone"></div></div>
        </div>
        <div class="p0-sim-log" id="p1-cg-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-cg-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Null input:</strong> return null immediately — there's nothing to clone.<br>
        <strong>Single node, no neighbors:</strong> the map gets exactly one entry; the clone's neighbor list stays empty.<br>
        <strong>Self-loop</strong> (a node lists itself as its own neighbor): the map lookup catches it — by the time the loop reaches "itself," that node's own clone is already stored, so it links to itself correctly instead of recursing forever.<br>
        <strong>Disconnected graphs</strong> aren't possible here — the problem guarantees the graph is connected, so a single DFS from the given start node always reaches every node.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>DFS + hash map (old → new)</td><td class="num">O(N + E)</td><td class="num">O(N)</td></tr>
          <tr><td>BFS + hash map (queue instead of recursion)</td><td class="num">O(N + E)</td><td class="num">O(N)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1CloneGraphStepper() {
    const btn = document.getElementById('p1-cg-step-btn');
    if (!btn) return;
    const origHost = document.getElementById('p1-cg-orig');
    const cloneHost = document.getElementById('p1-cg-clone');
    const logEl = document.getElementById('p1-cg-log');

    const N = 4;
    const ADJ = { 1: [2, 4], 2: [1, 3], 3: [2, 4], 4: [1, 3] };
    const ORIG_EDGES = [[1, 2], [2, 3], [3, 4], [4, 1]];

    const visited = new Set();
    const steps = [];
    (function dfs(val) {
      if (visited.has(val)) return;
      visited.add(val);
      steps.push({ type: 'create', val });
      for (const nei of ADJ[val]) {
        const reused = visited.has(nei);
        dfs(nei);
        steps.push({ type: 'connect', from: val, to: nei, reused });
      }
    })(1);

    let idx, activeVals, cloneEdges;

    function edgeKey(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

    function render(currentVal) {
      const hv = currentVal === undefined || currentVal === null ? null : new Set([currentVal]);
      origHost.innerHTML = renderP1GraphSVG(N, { edges: ORIG_EDGES, highlightVals: hv });
      cloneHost.innerHTML = renderP1GraphSVG(N, { edges: cloneEdges, activeVals, highlightVals: hv });
    }

    function reset() {
      idx = 0;
      activeVals = new Set();
      cloneEdges = [];
      render(null);
      logEl.textContent = 'Starting DFS from node 1. A map will track old node → cloned node.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.type === 'create') {
        activeVals.add(s.val);
        render(s.val);
        logEl.textContent = `Node ${s.val} not in the map yet — create its clone and store it before recursing into its neighbors.`;
      } else {
        const key = edgeKey(s.from, s.to);
        if (!cloneEdges.some(([a, b]) => edgeKey(a, b) === key)) cloneEdges.push([s.from, s.to]);
        render(s.from);
        logEl.textContent = s.reused
          ? `Node ${s.to} was already cloned — reuse it from the map (this is what closes the cycle). Connect ${s.from} → ${s.to}.`
          : `Node ${s.from}'s clone connects to node ${s.to}'s freshly-made clone.`;
      }
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Done — clone matches the original graph exactly, but every node is a new object.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1CourseSchedule() {
    return `
    <div class="p0-section-title">Course Schedule<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Graphs — problem 3</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You have <code>numCourses</code> courses, numbered 0 to <code>numCourses - 1</code>. Each pair <code>[a, b]</code> in <code>prerequisites</code> means "you must finish course b before course a." Given all the pairs, return <code>true</code> if there's some order you could take every course in, or <code>false</code> if it's impossible.</p>
    </div>

    <div class="p0-card">
      <h4>What makes it impossible</h4>
      <p>Arrows point from a prerequisite to the course that needs it. This one has a valid order — take 0, then 1, then 2, then 3:</p>
      ${renderP1GraphSVG(4, { edges: [[1, 2], [2, 3], [3, 4]], directed: true, zeroIndexed: true })}
      <p style="margin-top:16px">This one doesn't — course 0 needs 2, 2 needs 1, and 1 needs 0. Every course in the loop is waiting on another course in the same loop:</p>
      ${renderP1GraphSVG(3, { edges: [[1, 2], [2, 3], [3, 1]], directed: true, zeroIndexed: true })}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you're following course X's prerequisite chain and that chain leads you back to X itself before you've finished checking it, what does that tell you?<br>
      2. What data structure lets you track "which courses are currently being checked, mid-chain" — so you can recognize exactly that situation when it happens?<br>
      3. Once you've confirmed a course's entire prerequisite chain has no cycle, how could you avoid redoing that same work if a different course later depends on it too?<br>
      4. What should happen if <code>prerequisites</code> is empty? What if a course lists itself as its own prerequisite?</p>
    </div>

    ${renderP1Workflow('courseSchedule.js')}

    <details class="p0-reveal">
      <summary>Approach &amp; step-through — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>DFS with 3 states (cycle detection)</h4>
        <p>Build an adjacency list: each course maps to its list of prerequisites. Then run DFS from every course, tracking two things: a <strong>visiting</strong> set (courses on the current chain, not yet confirmed safe) and a <strong>done</strong> marker (courses already confirmed safe, so later chains can skip re-checking them). If DFS ever reaches a course that's already in <code>visiting</code>, that's a cycle — the whole answer is <code>false</code>.</p>
        <pre class="p0-code">function canFinish(numCourses, prerequisites) {
  const preMap = new Map();
  for (let i = 0; i < numCourses; i++) preMap.set(i, []);
  for (const [crs, pre] of prerequisites) preMap.get(crs).push(pre);

  const visiting = new Set();

  function dfs(crs) {
    if (visiting.has(crs)) return false;       // cycle!
    if (preMap.get(crs).length === 0) return true; // no prereqs left — safe

    visiting.add(crs);
    for (const pre of preMap.get(crs)) {
      if (!dfs(pre)) return false;
    }
    visiting.delete(crs);
    preMap.set(crs, []); // memoize: this course (and its chain) is confirmed safe
    return true;
  }

  for (let c = 0; c < numCourses; c++) {
    if (!dfs(c)) return false;
  }
  return true;
}</pre>
        <p>Time: <strong>O(N + E)</strong> — building the adjacency list is O(N + E), and memoization (clearing a course's prereq list once it's confirmed safe) means no course's chain gets fully re-walked twice. Space: <strong>O(N + E)</strong> for the adjacency list, plus O(N) for the <code>visiting</code> set and recursion stack.</p>
        <p style="margin-top:8px;font-size:12.5px;color:var(--sublabel)">This is sometimes called "white/gray/black" DFS: white = untouched, gray = <code>visiting</code> (on the current path), black = done. An equally valid alternative is Kahn's algorithm — BFS from courses with zero prerequisites, repeatedly peeling off finished courses — same O(N + E)/O(N + E) bounds, not a worse "brute force," just a different traversal order.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — numCourses = 4, prerequisites = [[1,0],[2,1],[3,2]]</div>
        <div id="p1-cs-graph"></div>
        <div class="p0-sim-log" id="p1-cs-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-cs-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>No prerequisites at all:</strong> every course's list is already empty, so every <code>dfs</code> call hits the base case immediately — always <code>true</code>.<br>
        <strong>A course lists itself</strong> (<code>[0, 0]</code>): as soon as <code>dfs(0)</code> adds 0 to <code>visiting</code> and loops into its own prerequisite, it immediately finds 0 already in <code>visiting</code> — cycle detected correctly.<br>
        <strong>Disconnected groups of courses:</strong> the outer loop calls <code>dfs</code> on every course, not just ones reachable from course 0, so an unrelated separate chain still gets checked.<br>
        <strong>A course that's a prerequisite for many others:</strong> the <code>done</code>/memoization step means once it's confirmed safe, every later chain that depends on it short-circuits instantly instead of re-walking it.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>DFS, 3-state cycle detection</td><td class="num">O(N + E)</td><td class="num">O(N + E)</td></tr>
          <tr><td>Kahn's algorithm (BFS topological sort)</td><td class="num">O(N + E)</td><td class="num">O(N + E)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1CourseScheduleStepper() {
    const btn = document.getElementById('p1-cs-step-btn');
    if (!btn) return;
    const graphHost = document.getElementById('p1-cs-graph');
    const logEl = document.getElementById('p1-cs-log');

    const NUM_COURSES = 4;
    const PREREQS = [[1, 0], [2, 1], [3, 2]];
    // Internal 1-indexed edges for the visual, drawn prerequisite → course ("must finish before").
    const EDGES = PREREQS.map(([a, b]) => [b + 1, a + 1]);

    const preMap = new Map();
    for (let i = 0; i < NUM_COURSES; i++) preMap.set(i, []);
    for (const [crs, pre] of PREREQS) preMap.get(crs).push(pre);

    const visiting = new Set();
    const doneSet = new Set();
    const steps = [];

    function dfs(crs) {
      if (visiting.has(crs)) { steps.push({ type: 'cycle', crs }); return false; }
      if (preMap.get(crs).length === 0) {
        steps.push({ type: 'safe', crs, memoized: doneSet.has(crs) });
        doneSet.add(crs);
        return true;
      }
      visiting.add(crs);
      steps.push({ type: 'visiting', crs });
      for (const pre of preMap.get(crs)) {
        if (!dfs(pre)) return false;
      }
      visiting.delete(crs);
      preMap.set(crs, []);
      steps.push({ type: 'safe', crs, memoized: false });
      doneSet.add(crs);
      return true;
    }
    for (let c = 0; c < NUM_COURSES; c++) dfs(c);

    let idx, nodeStates;

    function render() {
      graphHost.innerHTML = renderP1GraphSVG(NUM_COURSES, { edges: EDGES, directed: true, zeroIndexed: true, nodeStates });
    }

    function reset() {
      idx = 0;
      nodeStates = {};
      render();
      logEl.textContent = 'Checking each course 0 → 3 in order. A course is "visiting" while we\'re following its prerequisite chain, and becomes "done" once its chain is confirmed cycle-free.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.type === 'visiting') {
        nodeStates[s.crs + 1] = 'visiting';
        logEl.textContent = `Course ${s.crs} has unresolved prerequisites — mark it "visiting" and follow its prerequisite chain.`;
      } else if (s.type === 'safe') {
        nodeStates[s.crs + 1] = 'done';
        logEl.textContent = s.memoized
          ? `Course ${s.crs} was already confirmed safe earlier — reuse that result instead of re-deriving it.`
          : `Course ${s.crs} has no unresolved prerequisites left — mark it "done," safe to take.`;
      } else {
        logEl.textContent = `Course ${s.crs} is already "visiting" on this same chain — that's a cycle. Impossible to finish.`;
      }
      render();
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Done — every course reaches "done" with no cycle, so all 4 courses can be finished.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1RedundantConnection() {
    return `
    <div class="p0-section-title">Redundant Connection<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Advanced Graphs (Union Find, Dijkstra, MST) — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>Think of nodes connected by edges, like towns connected by roads. There are <code>n</code> nodes, numbered 1 to n. A normal tree with n nodes only needs n - 1 edges, and it never makes a loop. But here, someone added <strong>one extra edge</strong> by mistake. Now there are n edges — one too many — and that extra edge makes exactly one loop.</p>
      <p style="margin-top:10px"><strong>Input:</strong> <code>edges</code> — a list of edges, in the order they were added. Each edge is two node numbers, like <code>[1, 2]</code>, meaning node 1 and node 2 are connected.<br>
      <strong>Output:</strong> the one edge you should remove to make it a normal tree again (no loop, everything still connected) — same format, like <code>[2, 3]</code>. If more than one edge could work, pick the one that shows up <strong>last</strong> in the list.</p>
    </div>

    <div class="p0-card">
      <h4>What makes an edge "extra"</h4>
      <p>4 nodes, 3 edges, no loop. This is just a normal tree — all good:</p>
      ${renderP1GraphSVG(4, { edges: [[1, 2], [2, 3], [3, 4]] })}
      <p style="margin-top:16px">Now add one more edge: 1-4. There are 4 edges for 4 nodes now — one too many. Follow the nodes around: 1 &rarr; 2 &rarr; 3 &rarr; 4 &rarr; 1 — that's a loop. You could remove any one edge in that loop and the loop goes away, but the problem wants specifically whichever one of those edges appears last in the list:</p>
      ${renderP1GraphSVG(4, { edges: [[1, 2], [2, 3], [3, 4], [1, 4]] })}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. Say you add edges one at a time, and you keep track of which nodes are already connected to each other. What happens the moment you try to add an edge between two nodes that are already connected?<br>
      2. What's a fast way to check "are these two nodes already connected" — faster than walking the whole graph from scratch every single time?<br>
      3. If several edges could each be a valid answer, why does picking the very first edge (in list order) that connects two already-connected nodes give you the edge that comes last among all the possible answers?<br>
      4. What's the smallest loop you can make? (Hint: you don't need 4 nodes — think smaller.) Does your idea still catch it?</p>
    </div>

    ${renderP1Workflow('graph-redundantConnection.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — recheck connectivity from scratch with DFS</h4>
        <p>Build the adjacency list one edge at a time. Before adding an edge, run a DFS from one endpoint to see if the other endpoint is already reachable. If it is, this edge is redundant — return it. Otherwise add it and keep going.</p>
        <pre class="p0-code">function findRedundantConnection(edges) {
  const n = edges.length;
  const adj = Array.from({ length: n + 1 }, () => []);

  function isConnected(start, target) {
    const visited = new Set([start]);
    const stack = [start];
    while (stack.length) {
      const node = stack.pop();
      if (node === target) return true;
      for (const next of adj[node]) {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }
    return false;
  }

  for (const [u, v] of edges) {
    if (isConnected(u, v)) return [u, v];
    adj[u].push(v);
    adj[v].push(u);
  }
  return [];
}</pre>
        <p>Time: <strong>O(n&sup2;)</strong> — n edges, and each can trigger a DFS that visits up to O(n) nodes. Space: <strong>O(n)</strong> for the adjacency list and DFS stack.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — Union Find (path compression + union by rank)</h4>
        <p>Give every node its own group. For each edge, find both endpoints' roots. If they're already the same root, this edge connects two nodes already in the same group — it's the redundant one. Otherwise merge the two groups and keep going.</p>
        <pre class="p0-code">function findRedundantConnection(edges) {
  const n = edges.length;
  const parent = Array.from({ length: n + 1 }, (_, i) => i);
  const rank = new Array(n + 1).fill(1);

  function find(x) {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]; // path compression
      x = parent[x];
    }
    return x;
  }

  function union(x, y) {
    const rootX = find(x), rootY = find(y);
    if (rootX === rootY) return false; // already connected -> cycle
    if (rank[rootX] < rank[rootY]) {
      parent[rootX] = rootY;
      rank[rootY] += rank[rootX];
    } else {
      parent[rootY] = rootX;
      rank[rootX] += rank[rootY];
    }
    return true;
  }

  for (const [u, v] of edges) {
    if (!union(u, v)) return [u, v];
  }
  return [];
}</pre>
        <p>Time: <strong>O(n&middot;&alpha;(n))</strong> &asymp; O(n) — union/find with path compression and union by rank runs in amortized inverse-Ackermann time per call, essentially constant. Space: <strong>O(n)</strong> for the parent and rank arrays.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]</div>
        <div id="p1-rc-graph"></div>
        <div class="p0-sim-log" id="p1-rc-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-rc-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>The redundant edge is the very last one listed:</strong> every prior edge unions cleanly, and only the final union call fails — still correctly detected.<br>
        <strong>The cycle is the smallest possible (a triangle, 3 nodes/3 edges):</strong> the third edge's two endpoints already share a root from the first two unions.<br>
        <strong>Multiple edges could each be "the" answer</strong> (e.g. a longer cycle where removing any one edge in it works): processing strictly in input order and returning the first failed union guarantees you get whichever qualifying edge appears last.<br>
        <strong>Path compression correctness:</strong> re-pointing visited nodes straight at the root during <code>find</code> only shortens future lookups — it never changes which group a node belongs to.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force — DFS connectivity check per edge</td><td class="num">O(n&sup2;)</td><td class="num">O(n)</td></tr>
          <tr><td>Union Find + path compression + union by rank</td><td class="num">O(n&middot;&alpha;(n))</td><td class="num">O(n)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1RedundantConnectionStepper() {
    const btn = document.getElementById('p1-rc-step-btn');
    if (!btn) return;
    const graphHost = document.getElementById('p1-rc-graph');
    const logEl = document.getElementById('p1-rc-log');

    const N = 5;
    const EDGES = [[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]];

    const parent = Array.from({ length: N + 1 }, (_, i) => i);
    const rank = new Array(N + 1).fill(1);
    const steps = [];

    function find(x) {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }

    for (const [u, v] of EDGES) {
      const rootU = find(u), rootV = find(v);
      if (rootU === rootV) {
        steps.push({ type: 'redundant', u, v });
        break;
      }
      steps.push({ type: 'union', u, v });
      if (rank[rootU] < rank[rootV]) {
        parent[rootU] = rootV;
        rank[rootV] += rank[rootU];
      } else {
        parent[rootV] = rootU;
        rank[rootU] += rank[rootV];
      }
    }

    let idx, drawnEdges, nodeStates, highlightVals;

    function render() {
      graphHost.innerHTML = renderP1GraphSVG(N, {
        edges: drawnEdges,
        nodeStates,
        highlightVals,
        highlightColor: 'var(--red)',
      });
    }

    function reset() {
      idx = 0;
      drawnEdges = [];
      nodeStates = {};
      highlightVals = null;
      render();
      logEl.textContent = 'Processing edges in order. Each edge either unions two separate groups, or — if both endpoints already share a root — is the redundant one.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.type === 'union') {
        drawnEdges = [...drawnEdges, [s.u, s.v]];
        nodeStates = { ...nodeStates, [s.u]: 'done', [s.v]: 'done' };
        logEl.textContent = `Union(${s.u}, ${s.v}): different groups — merge them, edge added.`;
      } else {
        highlightVals = new Set([s.u, s.v]);
        logEl.textContent = `Find(${s.u}) and Find(${s.v}) already point to the same root — they're already connected. Adding [${s.u}, ${s.v}] would create a cycle. This is the redundant edge.`;
      }
      render();
      idx++;
      if (idx >= steps.length) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // Builds the "steps remaining" decision tree for Climbing Stairs (left = take 1 step, right =
  // take 2 steps), pruning negative remainders. Reuses the Trees pattern's renderP1TreeFromRoot —
  // the same left/right branching SVG works unmodified for a plain decision tree, not just a BST.
  function buildP1StairsDecisionTree(remaining) {
    if (remaining < 0) return null;
    const node = { val: remaining, left: null, right: null };
    if (remaining === 0) return node;
    node.left = buildP1StairsDecisionTree(remaining - 1);
    node.right = buildP1StairsDecisionTree(remaining - 2);
    return node;
  }

  function renderP1ClimbingStairs() {
    return `
    <div class="p0-section-title">Climbing Stairs<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">1-D Dynamic Programming — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You're standing at the bottom of a staircase with <code>n</code> steps. Each move, you can climb <strong>1 step</strong> or <strong>2 steps</strong>. How many distinct sequences of moves get you exactly to the top?</p>
    </div>

    <div class="p0-card">
      <h4>Every choice, laid out</h4>
      <p>For n = 3, each node is "steps remaining." Going left means "take 1 step," going right means "take 2 steps." A node that hits exactly 0 means you've landed exactly on the top — a valid way:</p>
      ${renderP1TreeFromRoot(buildP1StairsDecisionTree(3), { highlightVals: new Set([0]) })}
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">Three highlighted leaves — three ways to reach the top, matching 1+1+1, 1+2, and 2+1 from the examples. Notice "1 step remaining" shows up twice, in two different branches — the exact same sub-problem, reached two different ways.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If <code>ways(n)</code> is "the number of ways to climb n steps," can you write <code>ways(n)</code> in terms of <code>ways(n-1)</code> and <code>ways(n-2)</code>? Think about your very first move.<br>
      2. If you computed <code>ways(n)</code> with plain recursion and no memoization, the tree above shows the shape of the recursion — using Phase 0's "branching factor × depth" rule, what's the time complexity as n grows?<br>
      3. That repeated sub-problem you noticed (the same "n remaining" showing up in multiple branches) — what's the cheapest way to avoid recomputing it: memoizing the recursion, or building the answer bottom-up in a small array?<br>
      4. Does the recurrence need the <em>entire</em> array of past results, or just the last couple of values?</p>
    </div>

    ${renderP1Workflow('dynamicProgramming-climbingStairs.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — plain recursion, no memoization</h4>
        <p>Directly translate the recurrence: the ways to reach step n is the ways to reach n-1, plus the ways to reach n-2.</p>
        <pre class="p0-code">function climbStairs(n) {
  if (n === 1) return 1;
  if (n === 2) return 2;
  return climbStairs(n - 1) + climbStairs(n - 2);
}</pre>
        <p>Time: <strong>O(2&sup2;)</strong> — branching factor 2, depth n (Phase 0, Section 2), since every call re-solves the same smaller sub-problems from scratch. Space: <strong>O(n)</strong> — the recursion stack's depth.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — bottom-up with two rolling variables</h4>
        <p>This is exactly the Fibonacci recurrence. You never need more than the previous two values, so skip the array entirely and roll two variables forward.</p>
        <pre class="p0-code">function climbStairs(n) {
  if (n === 1) return 1;
  if (n === 2) return 2;
  let prev2 = 1, prev1 = 2;
  for (let i = 3; i <= n; i++) {
    const current = prev1 + prev2;
    prev2 = prev1;
    prev1 = current;
  }
  return prev1;
}</pre>
        <p>Time: <strong>O(n)</strong> — one pass from 3 to n. Space: <strong>O(1)</strong> — just two rolling variables, no array. (A top-down memoized version is also valid, at O(n) time but O(n) space for the memo table plus recursion stack — this bottom-up version is strictly better on space.)</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — building ways(1) through ways(5)</div>
        <div id="p1-clm-row"></div>
        <div class="p0-sim-log" id="p1-clm-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-clm-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>n = 1:</strong> only one way (a single 1-step) — must be handled as a base case, since the general loop assumes at least 2 steps already computed.<br>
        <strong>n = 2:</strong> exactly two ways (1+1 or 2) — the other base case.<br>
        <strong>Large n:</strong> the values grow like Fibonacci numbers, roughly doubling every ~1.44 steps — for very large n this can exceed <code>Number.MAX_SAFE_INTEGER</code>, though not for this problem's usual constraints (n ≤ 45).</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (plain recursion)</td><td class="num">O(2&sup2;)</td><td class="num">O(n)</td></tr>
          <tr><td>Top-down (memoized recursion)</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
          <tr><td>Bottom-up (two rolling variables)</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ClimbingStairsStepper() {
    const btn = document.getElementById('p1-clm-step-btn');
    if (!btn) return;
    const rowHost = document.getElementById('p1-clm-row');
    const logEl = document.getElementById('p1-clm-log');

    const N = 5;
    const ways = [null, 1, 2];
    for (let i = 3; i <= N; i++) ways[i] = ways[i - 1] + ways[i - 2];

    let idx;

    function renderRow(upTo) {
      const cells = [];
      for (let i = 1; i <= N; i++) {
        const shown = i <= upTo;
        cells.push(`<div class="p0-arr-cell${i === upTo ? ' active' : ''}">${shown ? ways[i] : ''}</div>`);
      }
      rowHost.innerHTML = `<div class="p0-arr-row">${cells.join('')}</div>`;
    }

    function reset() {
      idx = 0;
      renderRow(0);
      logEl.textContent = 'Filling in ways(1) through ways(5), left to right — each cell only needs the two cells before it.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= N) return;
      idx++;
      renderRow(idx);
      if (idx === 1) {
        logEl.textContent = 'ways(1) = 1 — base case: only one way to climb a single step.';
      } else if (idx === 2) {
        logEl.textContent = 'ways(2) = 2 — base case: 1+1, or a single 2-step.';
      } else {
        logEl.textContent = `ways(${idx}) = ways(${idx - 1}) + ways(${idx - 2}) = ${ways[idx - 1]} + ${ways[idx - 2]} = ${ways[idx]}.`;
      }
      if (idx >= N) {
        logEl.textContent += ` Done — ways(${N}) = ${ways[N]}.`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // Shared 1-D DP visual: an array row with some cells marked "chosen" (blue) or, for showing an
  // invalid/rule-breaking selection, "chosen but conflicting" (red). Reusable for House Robber II.
  function renderP1ChosenRow(nums, chosenIdx, opts) {
    opts = opts || {};
    const invalid = !!opts.invalid;
    const chosen = new Set(chosenIdx);
    const cells = nums.map((v, i) => {
      if (!chosen.has(i)) return `<div class="p0-arr-cell">${v}</div>`;
      const style = invalid
        ? 'border-color:#ef4444;color:#ef4444;background:rgba(239,68,68,0.1)'
        : 'border-color:#3b82f6;color:#3b82f6;background:rgba(59,130,246,0.1)';
      return `<div class="p0-arr-cell" style="${style}">${v}</div>`;
    }).join('');
    return `<div class="p0-arr-row">${cells}</div>`;
  }

  function renderP1HouseRobber() {
    return `
    <div class="p0-section-title">House Robber<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">1-D Dynamic Programming — problem 2</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get an array of houses, each holding some amount of money. You can rob any set of houses you want, <strong>except you can never rob two houses that are next to each other</strong> — that trips the alarm. Return the most money you can rob.</p>
    </div>

    <div class="p0-card">
      <h4>A valid selection vs. one that trips the alarm</h4>
      <p>nums = [2, 7, 9, 3, 2]. Robbing houses 0, 2, 4 is valid — no two are adjacent:</p>
      ${renderP1ChosenRow([2, 7, 9, 3, 2], [0, 2, 4])}
      <p style="margin-top:16px">Robbing houses 2 and 3 is <strong>not</strong> valid — they're right next to each other:</p>
      ${renderP1ChosenRow([2, 7, 9, 3, 2], [2, 3], { invalid: true })}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. At each house, you really only have two choices: rob it, or skip it. If you rob house i, which house must you have skipped just before it?<br>
      2. If <code>best(i)</code> means "the most money you can have after deciding about house i," can you write <code>best(i)</code> in terms of <code>best(i-1)</code> and <code>best(i-2)</code>?<br>
      3. Do you need to remember the best value for every single house so far, or just the last two?<br>
      4. What should happen for an empty list of houses? A single house?</p>
    </div>

    ${renderP1Workflow('dynamicProgramming-houseRobber.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — plain recursion, no memoization</h4>
        <p>At each house, try both choices and take the better one: rob it (skip to i+2) or skip it (move to i+1).</p>
        <pre class="p0-code">function rob(nums, i = 0) {
  if (i >= nums.length) return 0;
  const robThis = nums[i] + rob(nums, i + 2);
  const skipThis = rob(nums, i + 1);
  return Math.max(robThis, skipThis);
}</pre>
        <p>Time: <strong>O(2&sup2;)</strong> — branching factor 2, depth n, since the same sub-arrays get re-solved repeatedly. Space: <strong>O(n)</strong> — the recursion stack.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — bottom-up with two rolling variables</h4>
        <p>Same idea as Climbing Stairs: you only ever need the previous two "best so far" values, so roll them forward instead of keeping a full array.</p>
        <pre class="p0-code">function rob(nums) {
  let rob1 = 0, rob2 = 0;
  for (const num of nums) {
    const temp = Math.max(num + rob1, rob2);
    rob1 = rob2;
    rob2 = temp;
  }
  return rob2;
}</pre>
        <p>Time: <strong>O(n)</strong> — one pass. Space: <strong>O(1)</strong> — two rolling variables, no array.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — nums = [2, 7, 9, 3, 2]</div>
        <div id="p1-hr-row"></div>
        <div class="p0-sim-log" id="p1-hr-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-hr-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty array:</strong> 0 — nothing to rob.<br>
        <strong>Single house:</strong> rob it — no neighbor to conflict with.<br>
        <strong>Two houses:</strong> rob whichever has more — you can only take one of them.<br>
        <strong>A big value sandwiched between two small ones</strong> (like [1, 100, 1]): the algorithm correctly skips both small houses and takes only the big one — robbing both small ones (1 + 1 = 2) never beats the big one alone (100).</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (plain recursion)</td><td class="num">O(2&sup2;)</td><td class="num">O(n)</td></tr>
          <tr><td>Top-down (memoized recursion)</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
          <tr><td>Bottom-up (two rolling variables)</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1HouseRobberStepper() {
    const btn = document.getElementById('p1-hr-step-btn');
    if (!btn) return;
    const rowHost = document.getElementById('p1-hr-row');
    const logEl = document.getElementById('p1-hr-log');

    const NUMS = [2, 7, 9, 3, 2];
    const dp = [];
    for (let i = 0; i < NUMS.length; i++) {
      if (i === 0) dp[0] = NUMS[0];
      else if (i === 1) dp[1] = Math.max(NUMS[0], NUMS[1]);
      else dp[i] = Math.max(dp[i - 1], dp[i - 2] + NUMS[i]);
    }

    let idx;

    function renderRow(upTo) {
      const cells = NUMS.map((v, i) => {
        const cls = i === upTo - 1 ? 'p0-arr-cell active' : 'p0-arr-cell';
        return `<div class="${cls}">${i < upTo ? dp[i] : v}</div>`;
      }).join('');
      rowHost.innerHTML = `<div class="p0-arr-row">${cells}</div>`;
    }

    function reset() {
      idx = 0;
      renderRow(0);
      logEl.textContent = 'Each cell will hold "the most money robbable using houses 0 through i." Starting from house 0.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= NUMS.length) return;
      const i = idx;
      renderRow(idx + 1);
      if (i === 0) {
        logEl.textContent = `best(0) = ${dp[0]} — only one house so far, rob it.`;
      } else if (i === 1) {
        logEl.textContent = `best(1) = max(${NUMS[0]}, ${NUMS[1]}) = ${dp[1]} — two houses, take the bigger one.`;
      } else {
        logEl.textContent = `best(${i}) = max(best(${i - 1}), best(${i - 2}) + nums[${i}]) = max(${dp[i - 1]}, ${dp[i - 2]} + ${NUMS[i]}) = ${dp[i]}.`;
      }
      idx++;
      if (idx >= NUMS.length) {
        logEl.textContent += ` Done — the most you can rob is ${dp[NUMS.length - 1]}.`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1HouseRobberII() {
    return `
    <div class="p0-section-title">House Robber II<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">1-D Dynamic Programming — problem 3</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>Same rules as House Robber, except the houses are arranged in a <strong>circle</strong> — the first house and the last house are neighbors too. You still can't rob two adjacent houses. Return the most money you can rob.</p>
    </div>

    <div class="p0-card">
      <h4>The new gotcha: the wraparound</h4>
      <p>4 houses in a circle — house 0 and house 3 are neighbors too, even though they sit at opposite ends of the array:</p>
      ${renderP1GraphSVG(4, { edges: [[1, 2], [2, 3], [3, 4], [4, 1]], zeroIndexed: true })}
      <p style="margin-top:16px">Robbing houses 0 and 2 is valid — neither pair is adjacent, even going around the circle:</p>
      ${renderP1GraphSVG(4, { edges: [[1, 2], [2, 3], [3, 4], [4, 1]], zeroIndexed: true, highlightVals: new Set([1, 3]) })}
      <p style="margin-top:16px">Robbing houses 0 and 3 is <strong>not</strong> valid — they look far apart by index, but the circle makes them neighbors:</p>
      ${renderP1GraphSVG(4, { edges: [[1, 2], [2, 3], [3, 4], [4, 1]], zeroIndexed: true, highlightVals: new Set([1, 4]), highlightColor: '#ef4444' })}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. In House Robber, you never had to worry about the first and last house being neighbors. Here they are — what specifically breaks if you just run the exact same linear algorithm on the whole circular array?<br>
      2. You already know house 0 and house n-1 can never both be robbed. Can you split this into two problems you've already solved — one that considers house 0 but never house n-1, and one that does the opposite?<br>
      3. Once you have the best answer for each of those two cases, how do you combine them into the final answer?<br>
      4. What's the smallest circle size where things get tricky? Think through n = 1, n = 2, and n = 3 specifically.</p>
    </div>

    ${renderP1Workflow('houseRobberII.js')}

    <details class="p0-reveal">
      <summary>Approach &amp; step-through — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Reduce to two House Robber I calls</h4>
        <p>Since house 0 and house n-1 can never both be robbed, the answer is the better of two linear sub-problems: rob houses 0 through n-2 (never touch the last house), or rob houses 1 through n-1 (never touch the first house). Each sub-problem is exactly House Robber I — reuse that same rolling-variable helper.</p>
        <pre class="p0-code">function rob(nums) {
  if (nums.length === 1) return nums[0];

  function helper(houses) {
    let rob1 = 0, rob2 = 0;
    for (const num of houses) {
      const temp = Math.max(num + rob1, rob2);
      rob1 = rob2;
      rob2 = temp;
    }
    return rob2;
  }

  return Math.max(
    helper(nums.slice(0, -1)), // exclude the last house
    helper(nums.slice(1))      // exclude the first house
  );
}</pre>
        <p>Time: <strong>O(n)</strong> — two linear passes over (roughly) the whole array. Space: <strong>O(n)</strong> as written, since <code>.slice()</code> copies each sub-array — that copy is avoidable by running the same rolling-variable loop directly over index ranges <code>[0, n-2]</code> and <code>[1, n-1]</code> instead of slicing, which brings space down to O(1).</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — nums = [1, 2, 3, 4, 5, 1]</div>
        <div class="p0-diagram-label" style="margin-top:6px;text-transform:none;font-size:11px">Case 1 — exclude the last house: [1, 2, 3, 4, 5]</div>
        <div id="p1-hr2-row1"></div>
        <div class="p0-diagram-label" style="margin-top:12px;text-transform:none;font-size:11px">Case 2 — exclude the first house: [2, 3, 4, 5, 1]</div>
        <div id="p1-hr2-row2"></div>
        <div class="p0-sim-log" id="p1-hr2-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-hr2-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>n = 1:</strong> a single house has no neighbor at all — rob it directly; don't run the two-case split (slicing down to an empty array would break the reduction).<br>
        <strong>n = 2:</strong> the two houses are each other's neighbor on both sides of the circle — you can only take one, so the answer is just the larger of the two.<br>
        <strong>n = 3:</strong> every house is adjacent to both others in a 3-cycle, so at most one house can ever be robbed — the answer is just the single largest value.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Two linear passes, with slicing</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
          <tr><td>Two linear passes, index-bounded (no slicing)</td><td class="num">O(n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1HouseRobberIIStepper() {
    const btn = document.getElementById('p1-hr2-step-btn');
    if (!btn) return;
    const row1Host = document.getElementById('p1-hr2-row1');
    const row2Host = document.getElementById('p1-hr2-row2');
    const logEl = document.getElementById('p1-hr2-log');

    const CASE1 = [1, 2, 3, 4, 5];
    const CASE2 = [2, 3, 4, 5, 1];

    function buildDp(nums) {
      const dp = [];
      for (let i = 0; i < nums.length; i++) {
        if (i === 0) dp[0] = nums[0];
        else if (i === 1) dp[1] = Math.max(nums[0], nums[1]);
        else dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i]);
      }
      return dp;
    }
    const dp1 = buildDp(CASE1);
    const dp2 = buildDp(CASE2);

    function buildSteps(row, label, nums, dp) {
      return nums.map((v, i) => {
        let msg;
        if (i === 0) msg = `${label}: best(0) = ${dp[0]}.`;
        else if (i === 1) msg = `${label}: best(1) = max(${nums[0]}, ${nums[1]}) = ${dp[1]}.`;
        else msg = `${label}: best(${i}) = max(best(${i - 1}), best(${i - 2}) + ${nums[i]}) = max(${dp[i - 1]}, ${dp[i - 2]} + ${nums[i]}) = ${dp[i]}.`;
        return { row, i, msg };
      });
    }

    const steps = [
      ...buildSteps(1, 'Case 1 (exclude last)', CASE1, dp1),
      ...buildSteps(2, 'Case 2 (exclude first)', CASE2, dp2),
      { combine: true },
    ];

    let idx;

    function renderRow(host, nums, dp, upTo) {
      const cells = nums.map((v, i) => {
        const cls = i === upTo - 1 ? 'p0-arr-cell active' : 'p0-arr-cell';
        return `<div class="${cls}">${i < upTo ? dp[i] : v}</div>`;
      }).join('');
      host.innerHTML = `<div class="p0-arr-row">${cells}</div>`;
    }

    function reset() {
      idx = 0;
      renderRow(row1Host, CASE1, dp1, 0);
      renderRow(row2Host, CASE2, dp2, 0);
      logEl.textContent = 'Solving Case 1 first — House Robber I on houses 0 through n-2.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      if (s.combine) {
        const final1 = dp1[dp1.length - 1], final2 = dp2[dp2.length - 1];
        logEl.textContent = `Combine: max(Case 1 = ${final1}, Case 2 = ${final2}) = ${Math.max(final1, final2)}. Done.`;
      } else if (s.row === 1) {
        renderRow(row1Host, CASE1, dp1, s.i + 1);
        logEl.textContent = s.msg;
      } else {
        renderRow(row2Host, CASE2, dp2, s.i + 1);
        logEl.textContent = s.msg;
      }
      idx++;
      if (idx >= steps.length) {
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1UniquePaths() {
    return `
    <div class="p0-section-title">Unique Paths<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">2-D Dynamic Programming — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>A robot starts at the top-left corner of a grid with <code>m</code> rows and <code>n</code> columns. It wants to reach the bottom-right corner. It can only move <strong>right</strong> or <strong>down</strong> — never left, up, or diagonal. Return how many different paths it can take to get there.</p>
    </div>

    <div class="p0-card">
      <h4>What one path looks like</h4>
      <p>A 3x3 grid. Start (S) is top-left, End (E) is bottom-right. One valid path — right, right, down, down:</p>
      ${renderP1Grid([['S','→','↓'],['','','↓'],['','','E']], { cellColors: [['#3b82f6','#3b82f6','#3b82f6'],[undefined,undefined,'#3b82f6'],[undefined,undefined,'#3b82f6']] })}
      <p style="margin-top:16px">A <strong>different</strong> valid path to the same corner — down, down, right, right:</p>
      ${renderP1Grid([['S','',''],['↓','',''],['↓','→','E']], { cellColors: [['#3b82f6',undefined,undefined],['#3b82f6',undefined,undefined],['#3b82f6','#3b82f6','#3b82f6']] })}
      <p style="margin-top:8px;font-size:12.5px;color:var(--sublabel)">Both reach the same corner using the same number of moves (2 rights + 2 downs) — just in a different order. The question is: how many different orderings like this exist in total?</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. Pick any cell in the grid. To arrive at that cell, where must the robot have been one move earlier? How many different cells is that?<br>
      2. So the number of ways to reach a cell — can you write it in terms of the number of ways to reach the cells right above it and directly to its left?<br>
      3. What's true about every cell in the very top row, or the very leftmost column? How many ways are there to reach those, and why?<br>
      4. What's the smallest possible grid — a single cell (1x1)? How many paths does that have?</p>
    </div>

    ${renderP1Workflow('dynamicProgramming-uniquePaths.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — plain recursion, no memoization</h4>
        <p>From any cell, the number of paths to the goal is the paths from moving right plus the paths from moving down. Once you fall off the grid on the "wrong" side, that branch is invalid (0 paths); reaching the last row or last column means only one direction is left, so there's exactly 1 path from there on.</p>
        <pre class="p0-code">function uniquePaths(m, n) {
  function go(r, c) {
    if (r === m - 1 || c === n - 1) return 1;
    return go(r + 1, c) + go(r, c + 1);
  }
  return go(0, 0);
}</pre>
        <p>Time: <strong>O(2<sup>m+n</sup>)</strong> — two branches at every step, up to (m+n) steps deep, and the same cells get re-explored from different paths. Space: <strong>O(m+n)</strong> — the recursion stack.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — bottom-up DP table</h4>
        <p>Build a table the same shape as the grid. The last row and last column are all 1 (only one direction left to move). Every other cell is the cell below it plus the cell to its right — fill from the bottom-right corner backward so both of those are always already known.</p>
        <pre class="p0-code">function uniquePaths(m, n) {
  const dp = Array.from({ length: m }, () => new Array(n).fill(1));
  for (let r = m - 2; r >= 0; r--) {
    for (let c = n - 2; c >= 0; c--) {
      dp[r][c] = dp[r + 1][c] + dp[r][c + 1];
    }
  }
  return dp[0][0];
}</pre>
        <p>Time: <strong>O(m&middot;n)</strong> — every cell filled once. Space: <strong>O(m&middot;n)</strong> for the full table — reducible to O(n) by only keeping the current and previous row, since each cell only ever needs the row below it.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — a 3-row &times; 4-column grid, filled bottom-up</div>
        <div id="p1-up-grid"></div>
        <div class="p0-sim-log" id="p1-up-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-up-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>1x1 grid:</strong> the robot starts where it needs to end — exactly 1 path (the "do nothing" path).<br>
        <strong>Single row (1 &times; n) or single column (m &times; 1):</strong> only 1 path — every cell has just one direction available the whole way.<br>
        <strong>Large grids:</strong> the count grows fast (combinatorially) — for the constraints this problem usually ships with, the answer still fits safely in a normal JS number.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (plain recursion)</td><td class="num">O(2<sup>m+n</sup>)</td><td class="num">O(m+n)</td></tr>
          <tr><td>Bottom-up DP table</td><td class="num">O(m&middot;n)</td><td class="num">O(m&middot;n)</td></tr>
          <tr><td>Bottom-up, rolling row</td><td class="num">O(m&middot;n)</td><td class="num">O(n)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1UniquePathsStepper() {
    const btn = document.getElementById('p1-up-step-btn');
    if (!btn) return;
    const gridHost = document.getElementById('p1-up-grid');
    const logEl = document.getElementById('p1-up-log');

    const M = 3, N = 4;
    const dp = Array.from({ length: M }, () => new Array(N).fill(null));
    for (let c = 0; c < N; c++) dp[M - 1][c] = 1;
    for (let r = 0; r < M; r++) dp[r][N - 1] = 1;
    for (let r = M - 2; r >= 0; r--) {
      for (let c = N - 2; c >= 0; c--) {
        dp[r][c] = dp[r + 1][c] + dp[r][c + 1];
      }
    }

    // Step order: base row/col first (one combined step), then interior cells bottom-up,
    // right-to-left, same order the bottom-up code fills them in.
    const steps = [{ base: true }];
    for (let r = M - 2; r >= 0; r--) {
      for (let c = N - 2; c >= 0; c--) {
        steps.push({ r, c });
      }
    }

    let idx;

    function renderGrid(filled) {
      const grid = [];
      const cellColors = [];
      for (let r = 0; r < M; r++) {
        const row = [], colorRow = [];
        for (let c = 0; c < N; c++) {
          const isBase = r === M - 1 || c === N - 1;
          if (filled[r][c]) {
            row.push(String(dp[r][c]));
            colorRow.push(isBase ? '#22c55e' : '#3b82f6');
          } else {
            row.push('?');
            colorRow.push(undefined);
          }
        }
        grid.push(row);
        cellColors.push(colorRow);
      }
      gridHost.innerHTML = renderP1Grid(grid, { cellColors });
    }

    function reset() {
      idx = 0;
      const filled = Array.from({ length: M }, () => new Array(N).fill(false));
      renderGrid(filled);
      logEl.textContent = 'Every cell will hold "the number of ways to reach the goal from here." Starting with the base case.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      const filled = Array.from({ length: M }, () => new Array(N).fill(false));
      for (let k = 0; k <= idx; k++) {
        const st = steps[k];
        if (st.base) {
          for (let c = 0; c < N; c++) filled[M - 1][c] = true;
          for (let r = 0; r < M; r++) filled[r][N - 1] = true;
        } else {
          filled[st.r][st.c] = true;
        }
      }
      renderGrid(filled);
      if (s.base) {
        logEl.textContent = 'Base case: last row and last column are all 1 — only one direction left to move, so exactly one path.';
      } else {
        const { r, c } = s;
        logEl.textContent = `dp[${r}][${c}] = dp[${r + 1}][${c}] + dp[${r}][${c + 1}] = ${dp[r + 1][c]} + ${dp[r][c + 1]} = ${dp[r][c]}.`;
      }
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ` Done — total unique paths = ${dp[0][0]}.`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // First shared Greedy/Intervals visual: intervals drawn as horizontal bars on a shared numeric
  // axis. Overlapping intervals are auto-stacked onto separate rows so they stay legible instead of
  // drawing on top of each other. intervals: array of [start, end] pairs. opts.colors: array of
  // per-interval hex colors, same order as intervals.
  function renderP1Timeline(intervals, opts) {
    opts = opts || {};
    if (!intervals.length) return `<div style="font-size:12px;color:var(--muted);padding:6px 0">(no intervals)</div>`;
    const allVals = intervals.flat();
    const min = Math.min(...allVals), max = Math.max(...allVals);
    const span = Math.max(1, max - min);
    const W = 320, PAD = 12, ROW_H = 28, GAP = 6;
    const xFor = v => PAD + ((v - min) / span) * (W - PAD * 2);

    const rowEnd = []; // rowEnd[r] = end value of the last interval placed in row r
    const rowOf = intervals.map(([s, e]) => {
      let r = 0;
      while (rowEnd[r] !== undefined && rowEnd[r] > s) r++;
      rowEnd[r] = e;
      return r;
    });
    const numRows = Math.max(...rowOf) + 1;
    const H = numRows * (ROW_H + GAP) + GAP;

    const bars = intervals.map(([s, e], i) => {
      const x = xFor(s), w = Math.max(2, xFor(e) - xFor(s));
      const y = GAP + rowOf[i] * (ROW_H + GAP);
      const color = (opts.colors && opts.colors[i]) || '#3b82f6';
      return `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${ROW_H}" rx="4" fill="${color}33" stroke="${color}" stroke-width="1.6"/>`
        + `<text x="${(x + w / 2).toFixed(1)}" y="${(y + ROW_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-family="monospace" fill="${color}">[${s},${e}]</text>`;
    }).join('');
    return `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${bars}</svg></div>`;
  }

  function renderP1MergeIntervals() {
    return `
    <div class="p0-section-title">Merge Intervals<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Greedy / Intervals — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a list of intervals, each written as <code>[start, end]</code>. Whenever two intervals overlap — or even just touch — combine them into one bigger interval. Return the smallest set of intervals that still covers everything the original list covered.</p>
    </div>

    <div class="p0-card">
      <h4>Before and after</h4>
      <p>intervals = [1,3], [2,6], [8,10], [15,18]. The first two overlap and collapse into one; the other two are already separate:</p>
      ${renderP1Timeline([[1, 3], [2, 6], [8, 10], [15, 18]], { colors: ['#3b82f6', '#3b82f6', '#a855f7', '#f97316'] })}
      <p style="margin-top:10px">Merged result — [1,6], [8,10], [15,18]:</p>
      ${renderP1Timeline([[1, 6], [8, 10], [15, 18]], { colors: ['#3b82f6', '#a855f7', '#f97316'] })}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you sort the intervals by start time first, do any two intervals that overlap end up sitting right next to each other in the sorted order? Why does that make a single left-to-right pass enough?<br>
      2. Walking through the sorted list, when should the current interval merge into the one you're building, versus start a brand new one?<br>
      3. When you merge two overlapping intervals, is the merged end always the second interval's end — or could the first interval's end already be bigger?<br>
      4. What should happen if two intervals just touch, like [1,4] and [4,5], but don't actually overlap in the strict sense?</p>
    </div>

    ${renderP1Workflow('intervals-mergeIntervals.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — repeatedly merge any overlapping pair</h4>
        <p>Without sorting first, overlapping intervals can sit anywhere in the list, including chains where interval A only overlaps C once it's already been merged with B. Repeatedly scan every pair, merge any that overlap, and repeat until a full pass makes no changes.</p>
        <p>Time: <strong>O(n&sup2;)</strong> or worse — each pass compares every pair, and multiple passes may be needed to fully resolve chained merges. Space: <strong>O(n)</strong>.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — sort first, then one linear pass</h4>
        <p>Sort by start time. Now any intervals that overlap are guaranteed to be adjacent in the sorted order, so a single pass is enough: keep a "current merged interval," and for each next interval, either fold it in (if it overlaps) or close off the current one and start a new one.</p>
        <pre class="p0-code">function merge(intervals) {
  if (intervals.length === 0) return [];
  intervals.sort((a, b) => a[0] - b[0]);

  const output = [intervals[0]];
  for (const [start, end] of intervals) {
    const last = output[output.length - 1];
    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      output.push([start, end]);
    }
  }
  return output;
}</pre>
        <p>Time: <strong>O(n log n)</strong> — dominated by the sort; the merge pass itself is O(n). Space: <strong>O(n)</strong> for the output array.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — intervals = [1,3], [2,6], [6,10], [15,18], [8,9] (sorted first)</div>
        <div class="p0-diagram-label" style="margin-top:6px;text-transform:none;font-size:11px">Sorted input</div>
        <div id="p1-mi-input"></div>
        <div class="p0-diagram-label" style="margin-top:12px;text-transform:none;font-size:11px">Output being built</div>
        <div id="p1-mi-output"></div>
        <div class="p0-sim-log" id="p1-mi-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-mi-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty input:</strong> return an empty array immediately.<br>
        <strong>Single interval:</strong> nothing to merge — return it as-is.<br>
        <strong>Touching intervals</strong> (like [1,4] and [4,5]): still merge — the condition is <code>start &lt;= last[1]</code>, not <code>&lt;</code>, so touching counts as overlapping.<br>
        <strong>A chain of merges</strong> (A overlaps B, B overlaps C, but A doesn't overlap C directly): sorting plus tracking the running merged end handles this correctly with no special-casing needed.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (repeated pairwise merging)</td><td class="num">O(n&sup2;) or worse</td><td class="num">O(n)</td></tr>
          <tr><td>Sort + single pass</td><td class="num">O(n log n)</td><td class="num">O(n)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1MergeIntervalsStepper() {
    const btn = document.getElementById('p1-mi-step-btn');
    if (!btn) return;
    const inputHost = document.getElementById('p1-mi-input');
    const outputHost = document.getElementById('p1-mi-output');
    const logEl = document.getElementById('p1-mi-log');

    const RAW = [[1, 3], [2, 6], [6, 10], [15, 18], [8, 9]];
    const sorted = [...RAW].sort((a, b) => a[0] - b[0]);
    const COLORS = ['#3b82f6', '#a855f7', '#f97316', '#eab308', '#06b6d4'];

    const steps = [];
    let output = [[...sorted[0]]];
    steps.push({ output: output.map(iv => [...iv]), note: `Start with the first sorted interval: [${sorted[0][0]}, ${sorted[0][1]}].` });

    for (let i = 1; i < sorted.length; i++) {
      const [start, end] = sorted[i];
      const last = output[output.length - 1];
      if (start <= last[1]) {
        const oldEnd = last[1];
        last[1] = Math.max(last[1], end);
        steps.push({ output: output.map(iv => [...iv]), note: `[${start}, ${end}] overlaps the current interval (start ${start} ≤ end ${oldEnd}) — merge: end becomes max(${oldEnd}, ${end}) = ${last[1]}.` });
      } else {
        output.push([start, end]);
        steps.push({ output: output.map(iv => [...iv]), note: `[${start}, ${end}] starts after the current interval ends (${start} > ${last[1]}) — no overlap, start a new interval.` });
      }
    }

    let idx;

    function reset() {
      idx = 0;
      inputHost.innerHTML = renderP1Timeline(sorted, { colors: sorted.map((_, i) => COLORS[i % COLORS.length]) });
      outputHost.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:6px 0">(not started)</div>`;
      logEl.textContent = 'Sorted by start time. Building the merged output one interval at a time.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      outputHost.innerHTML = renderP1Timeline(s.output, { colors: s.output.map((_, i) => COLORS[i % COLORS.length]) });
      logEl.textContent = s.note;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ` Done — final merged result: ${JSON.stringify(s.output)}.`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1InsertInterval() {
    return `
    <div class="p0-section-title">Insert Interval<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Greedy / Intervals — problem 2</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You already have a sorted, non-overlapping list of intervals. You get one new interval to insert. Put it in the right place, merging it with any existing intervals it overlaps, so the list stays sorted and non-overlapping.</p>
    </div>

    <div class="p0-card">
      <h4>Where the new interval lands</h4>
      <p>intervals = [1,2], [3,5], [6,7], [8,10], [12,16]. newInterval = [4,8] (shown in red) overlaps three of them at once:</p>
      ${renderP1Timeline([[1, 2], [3, 5], [6, 7], [8, 10], [12, 16], [4, 8]], { colors: ['#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6', '#ef4444'] })}
      <p style="margin-top:10px">Result — [1,2], [3,10], [12,16]. The three overlapping intervals collapsed into one, absorbing newInterval:</p>
      ${renderP1Timeline([[1, 2], [3, 10], [12, 16]], { colors: ['#3b82f6', '#a855f7', '#f97316'] })}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. The existing intervals are already sorted and non-overlapping — does that mean you can skip sorting entirely, unlike Merge Intervals?<br>
      2. Scanning left to right, when can you say "this existing interval definitely comes entirely before newInterval — just keep it as-is"?<br>
      3. Once an existing interval overlaps newInterval, how do you grow newInterval to absorb it? How do you know when to stop absorbing and move on?<br>
      4. What should happen if newInterval doesn't overlap anything at all — does it just slot into the correct sorted position on its own?</p>
    </div>

    ${renderP1Workflow('intervals-insertInterval.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — reuse Merge Intervals from scratch</h4>
        <p>Append newInterval to the existing list, then run the full Merge Intervals algorithm: sort everything by start, then do the single merge pass.</p>
        <p>Time: <strong>O(n log n)</strong> — the sort dominates. Space: <strong>O(n)</strong>. This works, but it throws away something you already know for free: the input was already sorted.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — one pass, three phases, no sorting needed</h4>
        <p>Since the input is already sorted, walk it once: first copy over every interval that ends entirely before newInterval starts, then absorb every interval that overlaps newInterval (growing its start/end as you go), then copy over everything left after that.</p>
        <pre class="p0-code">function insert(intervals, newInterval) {
  const res = [];
  let i = 0;

  while (i < intervals.length && intervals[i][1] < newInterval[0]) {
    res.push(intervals[i]);
    i++;
  }

  while (i < intervals.length && newInterval[1] >= intervals[i][0]) {
    newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
    newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
    i++;
  }
  res.push(newInterval);

  while (i < intervals.length) {
    res.push(intervals[i]);
    i++;
  }
  return res;
}</pre>
        <p>Time: <strong>O(n)</strong> — one linear pass, no sort needed since the input already came sorted. Space: <strong>O(n)</strong> for the result array.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — intervals = [1,2],[3,5],[6,7],[8,10],[12,16], newInterval = [4,8]</div>
        <div class="p0-diagram-label" style="margin-top:6px;text-transform:none;font-size:11px">Original (newInterval in red)</div>
        <div id="p1-ii-input"></div>
        <div class="p0-diagram-label" style="margin-top:12px;text-transform:none;font-size:11px">Result being built</div>
        <div id="p1-ii-output"></div>
        <div class="p0-sim-log" id="p1-ii-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-ii-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty intervals list:</strong> the first and second while-loops never run — the result is just <code>[newInterval]</code>.<br>
        <strong>newInterval before everything:</strong> phase 1 copies nothing, phase 2 absorbs nothing, newInterval gets pushed first, phase 3 copies the rest.<br>
        <strong>newInterval after everything:</strong> phase 1 copies everything, phase 2 absorbs nothing, newInterval gets pushed last.<br>
        <strong>newInterval fully inside an existing interval:</strong> phase 2 still "absorbs" that interval, but <code>min</code>/<code>max</code> leave newInterval's bounds exactly where the existing interval already was — the result is unchanged.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (append + sort + merge)</td><td class="num">O(n log n)</td><td class="num">O(n)</td></tr>
          <tr><td>Optimal (single pass, no sort)</td><td class="num">O(n)</td><td class="num">O(n)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1InsertIntervalStepper() {
    const btn = document.getElementById('p1-ii-step-btn');
    if (!btn) return;
    const inputHost = document.getElementById('p1-ii-input');
    const outputHost = document.getElementById('p1-ii-output');
    const logEl = document.getElementById('p1-ii-log');

    const INTERVALS = [[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]];
    const NEW_INTERVAL_START = [4, 8];
    const COLORS = ['#3b82f6', '#a855f7', '#f97316', '#eab308', '#06b6d4'];

    const res = [];
    const steps = [];
    let ni = [...NEW_INTERVAL_START];
    let i = 0;

    while (i < INTERVALS.length && INTERVALS[i][1] < ni[0]) {
      res.push(INTERVALS[i]);
      steps.push({ res: res.map(iv => [...iv]), ni: [...ni], note: `[${INTERVALS[i][0]}, ${INTERVALS[i][1]}] ends before newInterval starts (${INTERVALS[i][1]} < ${ni[0]}) — copy it over as-is.` });
      i++;
    }
    while (i < INTERVALS.length && ni[1] >= INTERVALS[i][0]) {
      const [os, oe] = ni;
      ni = [Math.min(ni[0], INTERVALS[i][0]), Math.max(ni[1], INTERVALS[i][1])];
      steps.push({ res: res.map(iv => [...iv]), ni: [...ni], note: `[${INTERVALS[i][0]}, ${INTERVALS[i][1]}] overlaps newInterval (${INTERVALS[i][0]} ≤ ${oe}) — absorb it: newInterval becomes [${ni[0]}, ${ni[1]}].` });
      i++;
    }
    res.push(ni);
    steps.push({ res: res.map(iv => [...iv]), ni: [...ni], note: `No more overlap — insert newInterval [${ni[0]}, ${ni[1]}] into the result.` });
    while (i < INTERVALS.length) {
      res.push(INTERVALS[i]);
      steps.push({ res: res.map(iv => [...iv]), ni: [...ni], note: `[${INTERVALS[i][0]}, ${INTERVALS[i][1]}] is untouched — copy over the rest as-is.` });
      i++;
    }

    let idx;

    function reset() {
      idx = 0;
      inputHost.innerHTML = renderP1Timeline([...INTERVALS, NEW_INTERVAL_START], { colors: [...INTERVALS.map(() => '#3b82f6'), '#ef4444'] });
      outputHost.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:6px 0">(not started)</div>`;
      logEl.textContent = 'Scanning left to right — no sorting needed, the input is already sorted.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      outputHost.innerHTML = renderP1Timeline(s.res, { colors: s.res.map((_, i2) => COLORS[i2 % COLORS.length]) });
      logEl.textContent = s.note;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ` Done — final result: ${JSON.stringify(s.res)}.`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1NonOverlappingIntervals() {
    return `
    <div class="p0-section-title">Non-overlapping Intervals<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Greedy / Intervals — problem 3</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a list of intervals. Some of them overlap each other. Remove the smallest number of intervals so none of the ones left over overlap. You only need to say how many to remove, not which ones.</p>
      <p>Intervals that just touch at a point, like [1,2] and [2,3], do NOT count as overlapping.</p>
    </div>

    <div class="p0-card">
      <h4>Which one has to go</h4>
      <p>intervals = [1,2], [2,3], [3,4], [1,3]. [1,3] (in red) overlaps both [1,2] and [2,3] — removing it is enough to make everything else non-overlapping:</p>
      ${renderP1Timeline([[1, 2], [2, 3], [3, 4], [1, 3]], { colors: ['#3b82f6', '#3b82f6', '#3b82f6', '#ef4444'] })}
      <p style="margin-top:10px">Remove 1 interval, and the rest — [1,2], [2,3], [3,4] — don't overlap (touching at a point is fine):</p>
      ${renderP1Timeline([[1, 2], [2, 3], [3, 4]], { colors: ['#3b82f6', '#a855f7', '#f97316'] })}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you sort by start time, and you find two intervals that overlap, which is smarter to keep — the one that ends earlier, or the one that ends later? Why does ending earlier leave more room for what comes next?<br>
      2. Do you actually need to build the final list of kept intervals, or can you just count how many you remove as you go?<br>
      3. When two intervals overlap, what should happen to the "current end" you're tracking — does it stay the same, or shrink to the smaller of the two ends?<br>
      4. What should happen when intervals only touch at a point, like [1,2] and [2,3] — does that count as an overlap that forces a removal?</p>
    </div>

    ${renderP1Workflow('nonOverlappingIntervals.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — try every subset</h4>
        <p>Try every possible subset of intervals, keep only the subsets where nothing overlaps, and find the biggest one that survives. The answer is n minus the size of that biggest surviving subset.</p>
        <pre class="p0-code">function eraseOverlapIntervals(intervals) {
  const n = intervals.length;
  let maxKept = 0;

  for (let mask = 0; mask < (1 << n); mask++) {
    const subset = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(intervals[i]);
    }

    let valid = true;
    for (let i = 0; i < subset.length && valid; i++) {
      for (let j = i + 1; j < subset.length; j++) {
        const [s1, e1] = subset[i];
        const [s2, e2] = subset[j];
        if (s1 < e2 && s2 < e1) valid = false; // real overlap, touching is fine
      }
    }

    if (valid) maxKept = Math.max(maxKept, subset.length);
  }

  return n - maxKept;
}</pre>
        <p>Time: <strong>O(2<sup>n</sup> &middot; n<sup>2</sup>)</strong> — every subset of n intervals, each checked pairwise for overlaps. Space: <strong>O(n)</strong> per subset. Falls apart past a handful of intervals.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — sort by start, greedily keep whichever end is smaller</h4>
        <p>Sort by start time. Walk through once, tracking the end of the interval you're currently committed to (<code>prevEnd</code>). If the next interval starts before <code>prevEnd</code>, it overlaps — remove one (count it), and keep tracking whichever of the two ends earlier, since that leaves the most room for whatever comes next. If it starts at or after <code>prevEnd</code>, there's no overlap — just move <code>prevEnd</code> forward.</p>
        <pre class="p0-code">function eraseOverlapIntervals(intervals) {
  if (intervals.length === 0) return 0;
  intervals.sort((a, b) => a[0] - b[0]);

  let res = 0;
  let prevEnd = intervals[0][1];
  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    if (start >= prevEnd) {
      prevEnd = end;
    } else {
      res++;
      prevEnd = Math.min(end, prevEnd);
    }
  }
  return res;
}</pre>
        <p>Time: <strong>O(n log n)</strong> — dominated by the sort. Space: <strong>O(1)</strong> extra — sorting in place, just counting.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — intervals = [1,2], [2,3], [3,4], [1,3] (sorted by start: [1,2], [1,3], [2,3], [3,4])</div>
        <div id="p1-noi-timeline"></div>
        <div class="p0-sim-log" id="p1-noi-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-noi-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty input:</strong> nothing to remove — return 0 immediately.<br>
        <strong>Single interval:</strong> nothing can overlap it — return 0.<br>
        <strong>Touching intervals</strong> (like [1,2] and [2,3]): not an overlap — the check is <code>start &gt;= prevEnd</code>, so touching at a point still counts as "no overlap."<br>
        <strong>Many intervals sharing the same start</strong> (like three copies of [1,2]): all but one get removed, one at a time, since each new one still starts before the shrinking <code>prevEnd</code>.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (try every subset)</td><td class="num">O(2<sup>n</sup>)</td><td class="num">O(n)</td></tr>
          <tr><td>Sort by start + greedy keep-earlier-end</td><td class="num">O(n log n)</td><td class="num">O(1)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1NonOverlappingIntervalsStepper() {
    const btn = document.getElementById('p1-noi-step-btn');
    if (!btn) return;
    const timelineHost = document.getElementById('p1-noi-timeline');
    const logEl = document.getElementById('p1-noi-log');

    const SORTED = [[1, 2], [1, 3], [2, 3], [3, 4]];
    const KEEP = '#22c55e', REMOVE = '#ef4444', PENDING = '#94a3b8';

    const colors = SORTED.map((_, i) => (i === 0 ? KEEP : PENDING));
    let prevEnd = SORTED[0][1];
    let removed = 0;
    const steps = [{ colors: [...colors], removed, note: `Start with [${SORTED[0][0]}, ${SORTED[0][1]}] kept. Tracking prevEnd = ${prevEnd}.` }];

    for (let i = 1; i < SORTED.length; i++) {
      const [start, end] = SORTED[i];
      const oldPrevEnd = prevEnd;
      if (start >= oldPrevEnd) {
        colors[i] = KEEP;
        prevEnd = end;
        steps.push({ colors: [...colors], removed, note: `[${start}, ${end}] starts at or after prevEnd (${start} ≥ ${oldPrevEnd}) — just touching or clear, no overlap. Keep it, prevEnd becomes ${end}.` });
      } else {
        colors[i] = REMOVE;
        removed++;
        prevEnd = Math.min(end, oldPrevEnd);
        steps.push({ colors: [...colors], removed, note: `[${start}, ${end}] starts before prevEnd (${start} < ${oldPrevEnd}) — overlap, remove it. prevEnd stays the smaller end: min(${end}, ${oldPrevEnd}) = ${prevEnd}.` });
      }
    }

    let idx;

    function reset() {
      idx = 0;
      timelineHost.innerHTML = renderP1Timeline(SORTED, { colors: SORTED.map(() => PENDING) });
      logEl.textContent = 'Sorted by start time. Green = kept, red = removed, gray = not decided yet.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      timelineHost.innerHTML = renderP1Timeline(SORTED, { colors: s.colors });
      logEl.textContent = s.note;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ` Done — ${s.removed} interval${s.removed === 1 ? '' : 's'} removed.`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1MeetingRoomsII() {
    return `
    <div class="p0-section-title">Meeting Rooms II<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Greedy / Intervals — problem 4</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get a list of meeting times, each written as <code>[start, end]</code>. Meetings that overlap can't share a room. Figure out the smallest number of rooms you'd need to book so every meeting has a room, with no two overlapping meetings in the same room at once.</p>
    </div>

    <div class="p0-card">
      <h4>Rows are rooms</h4>
      <p>meetings = [0,30], [5,10], [15,20]. When two meetings overlap in time, this picture stacks them into a new row — so the number of rows you see IS the number of rooms needed:</p>
      ${renderP1Timeline([[0, 30], [5, 10], [15, 20]], { colors: ['#3b82f6', '#a855f7', '#a855f7'] })}
      <p style="margin-top:6px">[0,30] overlaps both of the others, so they can't share its row — but [5,10] and [15,20] don't overlap each other, so they share row 2. That's <strong>2 rooms</strong>.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If every meeting start is "+1 room needed" and every meeting end is "-1 room freed," and you sort all of these moments by time, what does the running total at any moment tell you?<br>
      2. If one meeting ends at the exact same time another begins, should the room get freed before or after the new meeting claims a room? Why would getting this backwards overcount rooms?<br>
      3. Do you need to track which specific meeting is in which room, or just the busiest moment across the whole day?<br>
      4. Is the answer just the biggest number of meetings that are simultaneously in progress at any single instant?</p>
    </div>

    ${renderP1Workflow('intervals-meetingRoomsII.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — count overlaps for every meeting</h4>
        <p>For every meeting, count how many meetings (including itself) are already running at that meeting's start time — just compare it against every other meeting. The peak concurrency always happens at some meeting's start time, so the biggest count you see is the answer.</p>
        <pre class="p0-code">function minMeetingRooms(intervals) {
  if (intervals.length === 0) return 0;
  let maxRooms = 0;

  for (const a of intervals) {
    let count = 0;
    for (const b of intervals) {
      if (b.start <= a.start && a.start < b.end) count++;
    }
    maxRooms = Math.max(maxRooms, count);
  }

  return maxRooms;
}</pre>
        <p>Time: <strong>O(n&sup2;)</strong> — every meeting compared against every other meeting. Space: <strong>O(1)</strong> extra.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — sweep through start/end events in time order</h4>
        <p>Turn every meeting into two events: a <code>+1</code> at its start time and a <code>-1</code> at its end time. Sort all of these events by time — but if a start and an end land on the exact same time, process the <strong>end first</strong>, so a room freed at that instant can be reused instead of double-counted. Walk through the sorted events keeping a running total; the biggest total you ever see is the answer.</p>
        <pre class="p0-code">function minMeetingRooms(intervals) {
  if (intervals.length === 0) return 0;
  const time = [];
  for (const i of intervals) {
    time.push([i.start, 1]);
    time.push([i.end, -1]);
  }
  time.sort((a, b) => {
    if (a[0] === b[0]) return a[1] - b[1]; // end (-1) before start (+1) on a tie
    return a[0] - b[0];
  });

  let res = 0;
  let count = 0;
  for (const t of time) {
    count += t[1];
    res = Math.max(res, count);
  }
  return res;
}</pre>
        <p>Time: <strong>O(n log n)</strong> — dominated by sorting the 2n events. Space: <strong>O(n)</strong> for the events array.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — meetings = [0,30], [5,10], [15,20], [10,15]</div>
        <div class="p0-diagram-label" style="margin-top:6px;text-transform:none;font-size:11px">Meetings</div>
        <div id="p1-mr-input"></div>
        <div class="p0-diagram-label" style="margin-top:12px;text-transform:none;font-size:11px">Rooms in use right now (out of the eventual peak)</div>
        <div id="p1-mr-rooms"></div>
        <div class="p0-sim-log" id="p1-mr-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-mr-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>No meetings:</strong> return 0 immediately.<br>
        <strong>Single meeting:</strong> always needs exactly 1 room.<br>
        <strong>One meeting ends exactly when another starts</strong> (like [5,10] and [10,15]): the tie-break processes the end first, so they can share a room — this does NOT force an extra room.<br>
        <strong>Every meeting overlaps at one busy instant:</strong> the running count peaks at the total number of meetings — every single one needs its own room at that moment.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (pairwise overlap counting)</td><td class="num">O(n&sup2;)</td><td class="num">O(1)</td></tr>
          <tr><td>Sweep through sorted start/end events</td><td class="num">O(n log n)</td><td class="num">O(n)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1MeetingRoomsIIStepper() {
    const btn = document.getElementById('p1-mr-step-btn');
    if (!btn) return;
    const inputHost = document.getElementById('p1-mr-input');
    const roomsHost = document.getElementById('p1-mr-rooms');
    const logEl = document.getElementById('p1-mr-log');

    const INTERVALS = [[0, 30], [5, 10], [15, 20], [10, 15]];

    const events = [];
    INTERVALS.forEach(([s, e]) => {
      events.push([s, 1, `[${s},${e}]`]);
      events.push([e, -1, `[${s},${e}]`]);
    });
    events.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));

    let count = 0, peak = 0;
    const steps = [];
    for (const [t, type, label] of events) {
      count += type;
      peak = Math.max(peak, count);
      const note = type === 1
        ? `t=${t}: ${label} starts — a room is claimed. Rooms in use now: ${count}.`
        : `t=${t}: ${label} ends — a room is freed. Rooms in use now: ${count}.`;
      steps.push({ count, peak, note });
    }
    const finalPeak = peak;

    function renderRoomDots(active, total) {
      const dots = [];
      for (let i = 0; i < total; i++) {
        const on = i < active;
        dots.push(`<div style="width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-family:monospace;border:1.6px solid ${on ? '#3b82f6' : 'var(--muted)'};background:${on ? '#3b82f633' : 'transparent'};color:${on ? '#3b82f6' : 'var(--muted)'};margin-right:8px">${i + 1}</div>`);
      }
      return `<div>${dots.join('')}</div>`;
    }

    let idx;

    function reset() {
      idx = 0;
      inputHost.innerHTML = renderP1Timeline(INTERVALS, { colors: ['#3b82f6', '#a855f7', '#f97316', '#eab308'] });
      roomsHost.innerHTML = renderRoomDots(0, finalPeak);
      logEl.textContent = `Sweeping start/end events in time order. Peak rooms needed will turn out to be ${finalPeak}.`;
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      roomsHost.innerHTML = renderRoomDots(s.count, finalPeak);
      logEl.textContent = s.note;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ` Done — peak rooms in use at any one moment: ${s.peak}.`;
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1ImplementTrie() {
    return `
    <div class="p0-section-title">Implement Trie (Prefix Tree)<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Tries — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>Build a data structure that stores a set of words, one character at a time, as a tree. Each node is one letter, and a path from the root down through several nodes spells out a word. You need three operations: <code>insert(word)</code> adds a word, <code>search(word)</code> checks whether that exact word was inserted, and <code>startsWith(prefix)</code> checks whether any inserted word begins with that prefix.</p>
    </div>

    <div class="p0-card">
      <h4>What the tree looks like</h4>
      <p>After inserting "cat", "car", and "card" — shared letters share a path, and green rings mark nodes where a real word ends. Notice "car" (green, at depth 3) still has a child "d" for "card" — a word can end in the middle of a longer branch:</p>
      ${renderP1Trie(['cat', 'car', 'card'])}
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. When inserting a word, if a character's child node doesn't exist yet, what should you do? What if it already exists, like the shared "c" and "a" in "cat" and "car"?<br>
      2. How do you mark that a complete word ends at a node, given that the same node might still have children going deeper (like "car" ending partway along the path to "card")?<br>
      3. <code>search</code> and <code>startsWith</code> both just walk down the trie one character at a time — what's the one extra check <code>search</code> needs that <code>startsWith</code> doesn't?<br>
      4. What should happen if, partway through walking a word, you hit a character with no matching child at all?</p>
    </div>

    ${renderP1Workflow('trie-implementTrie.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — just keep a list of every inserted word</h4>
        <p>Store every inserted word in a plain array. <code>search</code> checks whether the word is anywhere in that array; <code>startsWith</code> checks whether any stored word begins with the prefix. Both have to scan every stored word to be sure.</p>
        <pre class="p0-code">class Trie {
  constructor() {
    this.words = [];
  }
  insert(word) {
    this.words.push(word);
  }
  search(word) {
    return this.words.includes(word);
  }
  startsWith(prefix) {
    return this.words.some(w => w.startsWith(prefix));
  }
}</pre>
        <p>Time: <strong>insert O(1)</strong> amortized, but <strong>search/startsWith O(N &middot; L)</strong> — comparing against every one of the N stored words, each comparison up to L characters. Space: <strong>O(N &middot; L)</strong> total characters stored.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — an actual tree of characters</h4>
        <p>Each node holds a map from character to child node, plus a flag for "a word ends here." <code>insert</code> walks the word one character at a time, creating any node that doesn't exist yet, then flags the last node. <code>search</code> and <code>startsWith</code> share the same walk — the only difference is <code>search</code> also requires the final node's end-of-word flag to be true.</p>
        <pre class="p0-code">class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.isEnd = true;
  }

  search(word) {
    const node = this._traverse(word);
    return node !== null && node.isEnd;
  }

  startsWith(prefix) {
    return this._traverse(prefix) !== null;
  }

  _traverse(str) {
    let node = this.root;
    for (const ch of str) {
      if (!node.children[ch]) return null;
      node = node.children[ch];
    }
    return node;
  }
}</pre>
        <p>Time: <strong>O(L)</strong> per operation, where L is the length of the word/prefix — each character is one hop down the tree, no scanning other words. Space: <strong>O(total characters inserted)</strong>, since shared prefixes only cost one path, not one per word.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — insert "cat", "car", "card", then run a few lookups</div>
        <div id="p1-trie-diagram"></div>
        <div class="p0-sim-log" id="p1-trie-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-trie-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty trie:</strong> <code>search</code> and <code>startsWith</code> on any string just fail immediately — the root has no children.<br>
        <strong>Inserting the same word twice:</strong> harmless — the walk finds every node already exists and just re-flags the last one as end-of-word.<br>
        <strong>Empty string as a "word":</strong> insert("") marks the root itself as end-of-word; search("") and startsWith("") both return true without walking anywhere.<br>
        <strong>One word is a prefix of another</strong> (like "car" and "card"): the shorter word's last node is flagged end-of-word AND still has children — both facts have to be tracked independently, one doesn't cancel the other.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time (search/startsWith)</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (array of words)</td><td class="num">O(N &middot; L)</td><td class="num">O(N &middot; L)</td></tr>
          <tr><td>Trie (tree of characters)</td><td class="num">O(L)</td><td class="num">O(total chars)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1ImplementTrieStepper() {
    const btn = document.getElementById('p1-trie-step-btn');
    if (!btn) return;
    const diagramHost = document.getElementById('p1-trie-diagram');
    const logEl = document.getElementById('p1-trie-log');

    const steps = [
      { words: ['cat'], note: `insert("cat") — walk c → a → t, creating all three nodes since the trie is empty, then flag "t" as end-of-word.` },
      { words: ['cat', 'car'], note: `insert("car") — "c" and "a" already exist (shared with "cat"), so only "r" is newly created and flagged end-of-word.` },
      { words: ['cat', 'car', 'card'], note: `insert("card") — "c", "a", "r" already exist; only "d" is newly created and flagged end-of-word. Note "r" stays flagged too — "car" is still a real word even though the trie keeps going.` },
      { words: ['cat', 'car', 'card'], query: 'car', requireEnd: true, note: `search("car") walks c → a → r successfully and finds "r" flagged end-of-word → true.` },
      { words: ['cat', 'car', 'card'], query: 'ca', requireEnd: true, note: `search("ca") walks c → a successfully, but "a" is NOT flagged end-of-word (no word ends exactly at "ca") → false.` },
      { words: ['cat', 'car', 'card'], query: 'ca', requireEnd: false, note: `startsWith("ca") only needs the path to exist — it does — so → true, even though "ca" was never inserted as its own word.` },
      { words: ['cat', 'car', 'card'], query: 'care', requireEnd: true, note: `search("care") walks c → a → r, but "r" has no "e" child — dead end → false.` },
    ];

    let idx;

    function draw(step) {
      const opts = step.query !== undefined ? { highlightPath: step.query, requireEnd: step.requireEnd } : {};
      diagramHost.innerHTML = renderP1Trie(step.words, opts);
      logEl.textContent = step.note;
    }

    function reset() {
      idx = 0;
      diagramHost.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:6px 0">(empty trie)</div>`;
      logEl.textContent = 'Nothing inserted yet — step through building the trie, then a few lookups.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      draw(steps[idx]);
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Done.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1AddAndSearchWords() {
    return `
    <div class="p0-section-title">Design Add and Search Words Data Structure<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Tries — problem 2</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>Same idea as a trie: <code>addWord</code> stores a word, <code>search</code> checks whether a matching word exists. The twist — <code>search</code>'s string can contain <code>.</code> as a wildcard that matches ANY single letter. So instead of always following one exact path down the tree, sometimes you have to try every branch at once.</p>
    </div>

    <div class="p0-card">
      <h4>Why this isn't just a straight walk anymore</h4>
      <p>addWord("bad"), addWord("dad"), addWord("mad") — these three don't share any prefix at all, so they form three completely separate chains from the root:</p>
      ${renderP1Trie(['bad', 'dad', 'mad'])}
      <p style="margin-top:6px">search(".ad") has to check the root's "b", "d", AND "m" children before it can say true — a single fixed path won't do.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. When <code>search</code> hits a literal letter, it just follows one child — same as the plain Trie. What should happen instead when it hits a <code>.</code>?<br>
      2. If a <code>.</code> has several children to try and the first one doesn't lead anywhere, what do you do next? Does this remind you of an approach you've used before?<br>
      3. What's the worst-case time if the search word is ALL dots, like <code>"...."</code>? How does that compare to a plain Trie's usual O(L) search?<br>
      4. Do you still need the same "did I reach the end of the word at a node flagged end-of-word" check as before?</p>
    </div>

    ${renderP1Workflow('trie-addAndSearchWords.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — keep a list, compare character by character</h4>
        <p>Store every added word in a plain array. For <code>search</code>, check every stored word of the same length, comparing character by character and letting <code>.</code> match anything.</p>
        <pre class="p0-code">class WordDictionary {
  constructor() {
    this.words = [];
  }
  addWord(word) {
    this.words.push(word);
  }
  search(word) {
    return this.words.some(w => {
      if (w.length !== word.length) return false;
      for (let i = 0; i < word.length; i++) {
        if (word[i] !== '.' && word[i] !== w[i]) return false;
      }
      return true;
    });
  }
}</pre>
        <p>Time: <strong>O(N &middot; L)</strong> per search — every stored word compared, up to L characters each. Space: <strong>O(N &middot; L)</strong> total characters stored.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — trie, with a DFS that branches on '.'</h4>
        <p>Build the same trie as before. <code>search</code> walks it recursively: a literal letter follows exactly one child, same as always. A <code>.</code> tries EVERY child at that node — recurse into each one, and return true the moment any of them leads to a full match. This is backtracking: explore a branch, and if it doesn't pan out, fall back and try the next one.</p>
        <pre class="p0-code">class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
  }
}

class WordDictionary {
  constructor() {
    this.root = new TrieNode();
  }

  addWord(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.isEnd = true;
  }

  search(word) {
    const dfs = (node, i) => {
      if (!node) return false;
      if (i === word.length) return node.isEnd;

      const ch = word[i];
      if (ch === '.') {
        for (const key in node.children) {
          if (dfs(node.children[key], i + 1)) return true;
        }
        return false;
      }
      if (!node.children[ch]) return false;
      return dfs(node.children[ch], i + 1);
    };
    return dfs(this.root, 0);
  }
}</pre>
        <p>Time: <strong>O(L)</strong> for a search with no dots — same as a plain Trie. Worst case with all dots: <strong>O(26<sup>D</sup> &middot; L)</strong>, where D is the number of dots, since each one branches into every child. In practice it's usually much better, bounded by how many words actually share those prefixes. Space: <strong>O(total characters added)</strong> for the trie, plus O(L) recursion depth per search.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — addWord("bad"), "dad", "mad", then a few searches</div>
        <div id="p1-aasw-diagram"></div>
        <div class="p0-sim-log" id="p1-aasw-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-aasw-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty dictionary:</strong> any search fails immediately — the root has no children to branch into.<br>
        <strong>Search word longer or shorter than every stored word:</strong> naturally fails — either you run out of trie before reaching the word's end, or you reach a node with no <code>isEnd</code> flag when the word "ends" too early.<br>
        <strong>All dots</strong> (like <code>"..."</code>): every branch at every level gets tried — correct, but this is the slow path, bounded by the alphabet size at each level.<br>
        <strong>Repeated addWord of the same word:</strong> harmless, identical to the plain Trie's insert.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time (search)</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (array of words)</td><td class="num">O(N &middot; L)</td><td class="num">O(N &middot; L)</td></tr>
          <tr><td>Trie + DFS with '.' branching</td><td class="num">O(L) typical, O(26<sup>D</sup>&middot;L) worst case</td><td class="num">O(total chars)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1AddAndSearchWordsStepper() {
    const btn = document.getElementById('p1-aasw-step-btn');
    if (!btn) return;
    const diagramHost = document.getElementById('p1-aasw-diagram');
    const logEl = document.getElementById('p1-aasw-log');

    const steps = [
      { words: ['bad'], note: `addWord("bad") — the trie is empty, so all of b → a → d are newly created, and "d" is flagged end-of-word.` },
      { words: ['bad', 'dad'], note: `addWord("dad") — no letters shared with "bad" at all (different first letter), so a whole separate d → a → d chain is created.` },
      { words: ['bad', 'dad', 'mad'], note: `addWord("mad") — same story, a third separate chain m → a → d. The trie now has three totally unconnected branches from the root.` },
      { words: ['bad', 'dad', 'mad'], note: `search("pad") — position 0 is the literal "p". The root only has children "b", "d", "m" — no "p" — dead end immediately → false.` },
      { words: ['bad', 'dad', 'mad'], note: `search("bad") — no dots at all, so this is just a plain walk: b → a → d, and "d" is flagged end-of-word → true.` },
      { words: ['bad', 'dad', 'mad'], note: `search(".ad") — position 0 is a wildcard. Try root's "b" first: b → a → d reaches end-of-word → true immediately, without even trying "d" or "m".` },
      { words: ['bad', 'dad', 'mad'], note: `search("b..") — position 0 "b" matches root's "b" child directly. Position 1 "." — "b" only has one child, "a" — try it, matches. Position 2 "." — "a" only has one child, "d", which is end-of-word → true.` },
    ];

    let idx;

    function reset() {
      idx = 0;
      diagramHost.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:6px 0">(empty trie)</div>`;
      logEl.textContent = 'Nothing added yet — step through building the trie, then a few searches (some with wildcards).';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      diagramHost.innerHTML = renderP1Trie(s.words);
      logEl.textContent = s.note;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Done.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // Non-spoiler concept visual for Kth Largest in a Stream: shows what "kth largest so far" means
  // (sort everything seen, highlight the kth position) without hinting at the heap technique.
  function renderP1KthLargestConcept(nums, k) {
    const sorted = [...nums].sort((a, b) => b - a);
    const cells = sorted.map((v, i) => {
      const isKth = i === k - 1;
      const style = isKth ? 'border-color:#22c55e;background:#22c55e22' : '';
      return `<div class="p0-arr-cell" style="${style}">${v}</div>`;
    }).join('');
    return `<div class="p0-arr-row">${cells}</div>`;
  }

  function renderP1KthLargestStream() {
    return `
    <div class="p0-section-title">Kth Largest Element in a Stream<span class="p1-badge easy">Easy</span></div>
    <div class="p0-section-sub">Heap / Priority Queue — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>Build a class that keeps track of a growing stream of numbers, and can always answer "what's the kth largest number I've seen so far?" — <code>k</code> is fixed when you create the object. Every time <code>add(val)</code> is called, a new number joins the stream, and you return the kth largest across everything seen up to that point (including the initial <code>nums</code> you started with).</p>
    </div>

    <div class="p0-card">
      <h4>What "kth largest so far" means</h4>
      <p>Say k = 3. After seeing [4, 5, 8, 2], sort what you've seen from biggest to smallest — the 3rd one (green) is the answer right now:</p>
      ${renderP1KthLargestConcept([4, 5, 8, 2], 3)}
      <p style="margin-top:6px">Now a new number, 10, streams in. "Everything seen" grows to [4, 5, 8, 2, 10] — sort again, and the 3rd-largest position now points at a different value:</p>
      ${renderP1KthLargestConcept([4, 5, 8, 2, 10], 3)}
      <p style="margin-top:6px">Re-sorting the whole list from scratch every time a number arrives works, but it's wasteful. The real question this problem is testing: can you answer "what's the kth largest so far" after every single new number, without re-sorting everything each time?</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. If you kept every number ever seen and re-sorted after each <code>add()</code>, what's the time complexity of one <code>add()</code> call? Of <code>n</code> calls total?<br>
      2. You only ever care about the top k numbers. Once a number is clearly outside the top k, do you need to remember it at all?<br>
      3. If you only kept the k largest values seen so far, what's the cheapest way to know instantly which ONE of those k is the smallest — the one that gets kicked out the moment something bigger shows up?<br>
      4. What kind of structure keeps its smallest (or largest) element instantly reachable, without a full re-sort every time something is added or removed?</p>
    </div>

    ${renderP1Workflow('heap-kthLargestElementInStream.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — keep everything, re-sort on every add</h4>
        <p>Store every number ever seen in a plain array. On every <code>add(val)</code>, push the new value, sort the whole array descending, and return the element at index <code>k - 1</code>.</p>
        <pre class="p0-code">class KthLargest {
  constructor(k, nums) {
    this.k = k;
    this.stream = [...nums];
  }
  add(val) {
    this.stream.push(val);
    this.stream.sort((a, b) => b - a);
    return this.stream[this.k - 1];
  }
}</pre>
        <p>Time: <strong>O(n log n)</strong> per <code>add()</code> call, where n is how many numbers have been seen so far — and n only grows, so later calls get slower and slower. Space: <strong>O(n)</strong> — every number ever seen is kept around forever.</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — a min-heap that never holds more than k values</h4>
        <p>Keep a min-heap capped at size k, holding only the k largest numbers seen so far. Its root (the smallest of those k) is always the answer, because anything smaller than the root can't possibly be in the top k. On <code>add(val)</code>: push val in, and if the heap now has more than k values, pop the smallest one straight back out. JS has no built-in heap, so it's implemented directly on an array with bubble-up (on push) and bubble-down (on pop).</p>
        <pre class="p0-code">class MinHeap {
  constructor() {
    this.data = [];
  }
  size() {
    return this.data.length;
  }
  peek() {
    return this.data[0];
  }
  push(val) {
    this.data.push(val);
    let i = this.data.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.data[parent] <= this.data[i]) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      let i = 0;
      const n = this.data.length;
      while (true) {
        let smallest = i;
        const left = 2 * i + 1, right = 2 * i + 2;
        if (left < n && this.data[left] < this.data[smallest]) smallest = left;
        if (right < n && this.data[right] < this.data[smallest]) smallest = right;
        if (smallest === i) break;
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      }
    }
    return top;
  }
}

class KthLargest {
  constructor(k, nums) {
    this.k = k;
    this.heap = new MinHeap();
    for (const num of nums) this.add(num);
  }
  add(val) {
    this.heap.push(val);
    if (this.heap.size() > this.k) this.heap.pop();
    return this.heap.peek();
  }
}</pre>
        <p>Time: <strong>O(log k)</strong> per <code>add()</code> call — the heap never holds more than k elements, so both push's bubble-up and pop's bubble-down are bounded by the heap's height, log k. Space: <strong>O(k)</strong> — the heap only ever stores the k largest values.</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — KthLargest(3, [4,5,8,2]), then add(3), add(5), add(10), add(9), add(4)</div>
        <div id="p1-klis-diagram"></div>
        <div class="p0-sim-log" id="p1-klis-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-klis-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>k equal to or larger than the initial nums length:</strong> the heap simply grows until it reaches k, popping nothing along the way — the problem's constraints guarantee <code>add()</code> is only called once at least k numbers are already in the stream, so <code>peek()</code> on a not-yet-full heap never needs to be handled.<br>
        <strong>Duplicate values:</strong> the heap's comparisons (<code>&lt;</code>, <code>&lt;=</code>) treat equal values consistently — no special-casing needed, ties just stack up in the heap.<br>
        <strong>Negative numbers:</strong> comparisons work the same regardless of sign, so nothing changes.<br>
        <strong>k = 1:</strong> the heap of size 1 always holds just the current maximum — every <code>add()</code> either replaces the root with a bigger value or immediately evicts the new value if it's smaller.</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time (add)</th><th style="text-align:right">Space</th></tr></thead>
        <tbody>
          <tr><td>Brute force (re-sort every add)</td><td class="num">O(n log n)</td><td class="num">O(n)</td></tr>
          <tr><td>Min-heap capped at size k</td><td class="num">O(log k)</td><td class="num">O(k)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1KthLargestStreamStepper() {
    const btn = document.getElementById('p1-klis-step-btn');
    if (!btn) return;
    const diagramHost = document.getElementById('p1-klis-diagram');
    const logEl = document.getElementById('p1-klis-log');

    const steps = [
      { data: [4], note: `Construction starts: build with nums=[4,5,8,2], k=3. Push 4 → heap=[4]. Size 1 ≤ k=3, nothing to pop. Root (kth largest so far) = 4.` },
      { data: [4, 5], note: `Push 5 → heap=[4,5]. Size 2 ≤ 3, no pop. Root = 4, still the smaller of the two.` },
      { data: [4, 5, 8], note: `Push 8 → heap=[4,5,8]. Size 3 ≤ 3 — exactly k, the last push that needs no pop. Root = 4.` },
      { data: [4, 5, 8], note: `Push 2 → temporarily [2,4,8,5] (2 bubbles up past 5 and 4 since it's smaller than both). Size 4 > k=3, so the minimum (2) — the value just added — gets popped straight back off. Final heap=[4,5,8]. Root = 4. Construction is done.` },
      { data: [4, 5, 8], note: `add(3): push 3 → temporarily [3,4,8,5]. Size 4 > 3, pop the minimum (3) — again the value just added. Final heap unchanged: [4,5,8]. Root = 4 → that's the answer.` },
      { data: [5, 5, 8], note: `add(5): push 5 → [4,5,8,5]. Size 4 > 3, pop the minimum (4) — this time an OLD value gets evicted, not the new one. Final heap=[5,5,8]. Root = 5 → that's the answer.` },
      { data: [5, 10, 8], note: `add(10): push 10 → [5,5,8,10]. Size 4 > 3, pop the minimum (5). Final heap=[5,10,8]. Root = 5 → that's the answer.` },
      { data: [8, 9, 10], note: `add(9): push 9 → [5,9,8,10]. Size 4 > 3, pop the minimum (5). Final heap=[8,9,10]. Root = 8 → that's the answer.` },
      { data: [8, 9, 10], note: `add(4): push 4 → [4,8,10,9]. Size 4 > 3, pop the minimum (4) — the value just added, since it's smaller than everything already in the top 3. Final heap unchanged: [8,9,10]. Root = 8 → that's the answer.` },
    ];

    let idx;

    function reset() {
      idx = 0;
      diagramHost.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:6px 0">(empty heap)</div>`;
      logEl.textContent = 'Nothing added yet — step through the construction, then five explicit add() calls.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      diagramHost.innerHTML = renderP1Heap(s.data, { highlight: { 0: '#22c55e' } });
      logEl.textContent = s.note;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' Done.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  function renderP1Subsets() {
    return `
    <div class="p0-section-title">Subsets<span class="p1-badge medium">Medium</span></div>
    <div class="p0-section-sub">Backtracking — problem 1</div>

    <div class="p0-card">
      <h4>The problem, in plain English</h4>
      <p>You get an array of numbers, all different from each other. Return every possible subset you could make from it — the "power set." That includes the empty set (pick nothing) and the whole array (pick everything). Order doesn't matter, inside a subset or between subsets.</p>
    </div>

    <div class="p0-card">
      <h4>What a "subset" means here</h4>
      <p>A subset is just a yes/no choice for every number — include it, or don't. For nums = [1,2,3], here's every subset, grouped by how many numbers it has (digits shown = which numbers are in it, so "13" means {1,3}):</p>
      <div class="p0-diagram-label">0 numbers chosen</div>
      <div class="p0-arr-row">${renderP1ArrayRow(['∅'])}</div>
      <div class="p0-diagram-label" style="margin-top:10px">1 number chosen</div>
      <div class="p0-arr-row">${renderP1ArrayRow(['1', '2', '3'])}</div>
      <div class="p0-diagram-label" style="margin-top:10px">2 numbers chosen</div>
      <div class="p0-arr-row">${renderP1ArrayRow(['12', '13', '23'])}</div>
      <div class="p0-diagram-label" style="margin-top:10px">3 numbers chosen</div>
      <div class="p0-arr-row">${renderP1ArrayRow(['123'])}</div>
      <p style="margin-top:10px;font-size:12.5px;color:var(--sublabel)">8 subsets total for 3 numbers — each number is independently "in" or "out," so 2 &times; 2 &times; 2 = 2&sup3; = 8.</p>
    </div>

    <div class="p0-card">
      <h4>Before you code — think about these</h4>
      <p>1. What's the simplest way to generate every subset if you numbered every subset 0 through 2<sup>n</sup>-1, and looked at each number's binary representation?<br>
      2. If instead you walked through the numbers one at a time, making an "include or exclude" decision at each one — how would you track "what's currently included" as you go deeper, and undo that decision once you've explored both branches?<br>
      3. When exactly does a partial decision become a finished subset worth recording — after every single choice, or only once you've made a choice for <em>every</em> number?<br>
      4. What has to happen to your "currently included" list right after a recursive call returns, before you try the other choice?</p>
    </div>

    ${renderP1Workflow('backtracking-subsets.js')}

    <details class="p0-reveal">
      <summary>Brute force &amp; optimal — open only after you've attempted it</summary>

      <div class="p0-card">
        <h4>Brute force — count from 0 to 2<sup>n</sup>-1, read off the bits</h4>
        <p>There are exactly 2<sup>n</sup> subsets. Number them 0 through 2<sup>n</sup>-1. For each number, look at its binary form — bit i tells you whether <code>nums[i]</code> is in that subset. Looping the counter through every value and reading its bits generates every subset exactly once.</p>
        <pre class="p0-code">function subsets(nums) {
  const n = nums.length;
  const result = [];
  for (let mask = 0; mask < (1 << n); mask++) {
    const subset = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(nums[i]);
    }
    result.push(subset);
  }
  return result;
}</pre>
        <p>Time: <strong>O(n &middot; 2<sup>n</sup>)</strong> — 2<sup>n</sup> masks, and building each subset costs up to O(n). Space: <strong>O(n &middot; 2<sup>n</sup>)</strong> for the output (unavoidable — that's how many numbers appear across all subsets combined).</p>
      </div>

      <div class="p0-card">
        <h4>Optimal — backtracking: include or exclude, then undo</h4>
        <p>Recurse through the numbers one index at a time. At each index, try both choices: skip to the next index without <code>nums[i]</code>, then add <code>nums[i]</code> to the current list, recurse again, and remove it again ("backtrack") before returning. Once the index reaches the end of the array, the current list is a finished subset — record a copy of it. This isn't a faster Big-O than the bitmask version (there are still 2<sup>n</sup> subsets to produce, so it can't be), but it's the general template — the same include/exclude/undo shape reappears in Combination Sum, Permutations, and Word Search, where a bitmask trick doesn't apply.</p>
        <pre class="p0-code">function subsets(nums) {
  const result = [];
  const current = [];
  const backtrack = (i) => {
    if (i === nums.length) {
      result.push([...current]);
      return;
    }
    backtrack(i + 1);        // exclude nums[i]
    current.push(nums[i]);
    backtrack(i + 1);        // include nums[i]
    current.pop();           // undo before returning
  };
  backtrack(0);
  return result;
}</pre>
        <p>Time: <strong>O(n &middot; 2<sup>n</sup>)</strong> — 2<sup>n</sup> leaves in the recursion tree, and copying <code>current</code> into the result at each one costs up to O(n). Space: <strong>O(n)</strong> extra for the recursion stack and the <code>current</code> array (not counting the output itself, which is O(n &middot; 2<sup>n</sup>) either way).</p>

        <div class="p0-diagram-label" style="margin-top:14px">Step through it — subsets([1,2,3]), one leaf at a time</div>
        <div id="p1-sub-current"></div>
        <div class="p0-diagram-label" style="margin-top:10px">Results found so far</div>
        <div id="p1-sub-results"></div>
        <div class="p0-sim-log" id="p1-sub-log"></div>
        <button class="p0-next-btn p0-sim-btn" id="p1-sub-step-btn">▶ Step</button>
      </div>

      <div class="p0-card">
        <h4>Edge cases</h4>
        <p><strong>Empty input:</strong> <code>nums = []</code> — the recursion's base case (<code>i === nums.length</code>) is true immediately, so the only subset recorded is the empty one, <code>[[]]</code>.<br>
        <strong>Single element:</strong> exactly 2 subsets — <code>[]</code> and the element itself.<br>
        <strong>Negative numbers:</strong> no special handling needed — the algorithm never compares values, only decides include/exclude per index.<br>
        <strong>Forgetting to copy <code>current</code>:</strong> pushing <code>current</code> itself (instead of <code>[...current]</code>) into <code>result</code> stores a reference — every later <code>push</code>/<code>pop</code> would then silently mutate subsets you already "recorded."<br>
        <strong>Duplicate values:</strong> this problem's constraints guarantee unique elements — with duplicates allowed, this exact code would produce duplicate subsets (that's a different problem, Subsets II, which needs sorting + skip-duplicate logic).</p>
      </div>

      <table class="p0-table">
        <thead><tr><th>Approach</th><th style="text-align:right">Time</th><th style="text-align:right">Space (excl. output)</th></tr></thead>
        <tbody>
          <tr><td>Brute force (bitmask)</td><td class="num">O(n&middot;2<sup>n</sup>)</td><td class="num">O(n)</td></tr>
          <tr><td>Backtracking (include/exclude)</td><td class="num">O(n&middot;2<sup>n</sup>)</td><td class="num">O(n)</td></tr>
        </tbody>
      </table>
    </details>

    <div class="p0-footer-next" id="p1-next-footer"></div>`;
  }

  function initP1SubsetsStepper() {
    const btn = document.getElementById('p1-sub-step-btn');
    if (!btn) return;
    const currentHost = document.getElementById('p1-sub-current');
    const resultsHost = document.getElementById('p1-sub-results');
    const logEl = document.getElementById('p1-sub-log');

    const nums = [1, 2, 3];
    const steps = [
      { chosenIdx: [], subset: [], note: '1: exclude, 2: exclude, 3: exclude' },
      { chosenIdx: [2], subset: [3], note: '1: exclude, 2: exclude, 3: include' },
      { chosenIdx: [1], subset: [2], note: '1: exclude, 2: include, 3: exclude' },
      { chosenIdx: [1, 2], subset: [2, 3], note: '1: exclude, 2: include, 3: include' },
      { chosenIdx: [0], subset: [1], note: '1: include, 2: exclude, 3: exclude' },
      { chosenIdx: [0, 2], subset: [1, 3], note: '1: include, 2: exclude, 3: include' },
      { chosenIdx: [0, 1], subset: [1, 2], note: '1: include, 2: include, 3: exclude' },
      { chosenIdx: [0, 1, 2], subset: [1, 2, 3], note: '1: include, 2: include, 3: include' },
    ];

    let idx;

    function reset() {
      idx = 0;
      currentHost.innerHTML = renderP1ChosenRow(nums, []);
      resultsHost.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:6px 0">(no results yet)</div>`;
      logEl.textContent = 'Nothing explored yet — step through the 8 leaves of the recursion, in the order the code actually visits them.';
      btn.textContent = '▶ Step';
      btn.disabled = false;
      btn.onclick = step;
    }

    function step() {
      if (idx >= steps.length) return;
      const s = steps[idx];
      currentHost.innerHTML = renderP1ChosenRow(nums, s.chosenIdx);
      const found = steps.slice(0, idx + 1).map(st => st.subset.length ? st.subset.join('') : '∅');
      resultsHost.innerHTML = `<div class="p0-arr-row">${renderP1ArrayRow(found)}</div>`;
      const label = s.subset.length ? `[${s.subset.join(',')}]` : '[]';
      logEl.textContent = `${s.note} → subset = ${label} pushed to result. (${idx + 1}/${steps.length})`;
      idx++;
      if (idx >= steps.length) {
        logEl.textContent += ' All 8 subsets found — done.';
        btn.textContent = '↺ Reset';
        btn.onclick = reset;
      }
    }

    reset();
  }

  // Minimal markdown → HTML: ### headings, bullet/numbered lists, paragraphs (inline handled by mdInline)
  function renderMarkdown(md) {
    return md.split(/\n\s*\n/).map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed === '<!-- LIVE_ROADMAP_CHECKLIST -->') return trimmed;
      if (trimmed.startsWith('### ')) return `<h3>${mdInline(trimmed.slice(4).trim())}</h3>`;

      const lines = trimmed.split('\n').map(l => l.trim());
      if (lines.every(l => /^-\s+/.test(l))) {
        return `<ul>${lines.map(l => `<li>${mdInline(l.replace(/^-\s+/, ''))}</li>`).join('')}</ul>`;
      }
      if (lines.every(l => /^\d+\.\s+/.test(l))) {
        return `<ol>${lines.map(l => `<li>${mdInline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
      }
      return `<p>${mdInline(lines.join(' '))}</p>`;
    }).join('\n');
  }

  function renderStats(roadmap) {
    const done    = roadmap.filter(r => r.status === 'x').length;
    const partial = roadmap.filter(r => r.status === '~').length;
    const todo    = roadmap.filter(r => r.status === ' ').length;
    document.getElementById('dashboard-stats').innerHTML = `
      <div class="stat-tile"><div class="num">${allFiles.length}</div><div class="label">Solution Files</div></div>
      <div class="stat-tile green"><div class="num">${done}</div><div class="label">Patterns Mastered</div></div>
      <div class="stat-tile yellow"><div class="num">${partial}</div><div class="label">In Progress</div></div>
      <div class="stat-tile muted"><div class="num">${todo}</div><div class="label">Not Started</div></div>`;
  }

  // Parses the fixed structure Claude maintains in co-founder/state.md + co-founder/roadmap.md
  function parseMentorFiles(stateMd, roadmapMd) {
    const state = { lastSession: [], nextMove: '', roadmap: [] };

    const lastMatch = stateMd.match(/## Last Session\n([\s\S]*?)(?=\n## |$)/);
    if (lastMatch) {
      state.lastSession = lastMatch[1].split('\n')
        .filter(l => l.trim().startsWith('- '))
        .map(l => l.replace(/^- /, '').trim());
    }

    const nextMatch = stateMd.match(/## Next Session Starting Point\n([\s\S]*?)(?=\n## |$)/);
    if (nextMatch) state.nextMove = nextMatch[1].trim();

    state.roadmap = parseRoadmapChecklist(roadmapMd);

    return state;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function mdInline(str) {
    return escapeHtml(str)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
