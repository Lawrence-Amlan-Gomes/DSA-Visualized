"use client";

import { useEffect } from "react";
import { initLiveCoding } from "../../lib/legacyApp";

export default function LiveCodingPage() {
  useEffect(() => {
    // Guards against React StrictMode's dev-only double-invoke: if cleanup
    // runs before initLiveCoding()'s promise resolves, close it as soon as
    // it does instead of leaking the EventSource it opened.
    let cancelled = false;
    let cleanup = null;
    initLiveCoding().then(fn => {
      if (cancelled) fn();
      else cleanup = fn;
    });
    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div id="view-livecoding" className="view active">
      <div id="sidebar">
        <div id="sidebar-header">
          <h1>DSA Visualized</h1>
          <p>Select a file → logs go to DevTools (F12)</p>
        </div>
        <div id="search-wrap">
          <input id="search" type="text" placeholder="Search files…" />
        </div>
        <div id="file-count"></div>
        <div id="file-list"></div>
      </div>

      <div id="main">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        <div id="main-file"></div>
        <div id="main-hint">Click a file to run it</div>
        <div id="main-sub">Open Chrome DevTools → Console (F12) to see logs</div>
        <button id="btn-rerun" onClick={() => window.rerun && window.rerun()}>&#8635; Re-run</button>
      </div>
    </div>
  );
}
