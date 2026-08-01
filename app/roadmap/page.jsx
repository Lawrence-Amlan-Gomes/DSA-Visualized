"use client";

import { useEffect } from "react";
import { initRoadmap } from "../../lib/legacyApp";

export default function RoadmapPage() {
  useEffect(() => {
    initRoadmap();
  }, []);

  return (
    <div id="view-roadmap" className="view active">
      <div id="phase-nav">
        <div id="phase-nav-header">
          <h1>Roadmap</h1>
          <p>Zero → interview-ready, in 5 phases</p>
        </div>
        <div id="phase-list"></div>
      </div>
      <div id="roadmap-content">
        <div id="roadmap-content-inner"></div>
      </div>
    </div>
  );
}
