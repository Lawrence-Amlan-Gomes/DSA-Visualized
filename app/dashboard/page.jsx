"use client";

import { useEffect } from "react";
import { initDashboard } from "../../lib/legacyApp";

export default function DashboardPage() {
  useEffect(() => {
    initDashboard();
  }, []);

  return (
    <div id="view-dashboard" className="view active">
      <div id="dashboard">
        <div id="dashboard-header">
          <h1>Dashboard</h1>
          <p>Your co-founder &amp; mentor&rsquo;s live status — from skills/skillCoFounderMentor.md</p>
        </div>
        <div id="dashboard-stats"></div>
        <div id="dash-last-session" className="dash-card"></div>
        <div id="dash-next-move" className="dash-card"></div>
        <div id="dash-roadmap" className="dash-card"></div>
      </div>
    </div>
  );
}
