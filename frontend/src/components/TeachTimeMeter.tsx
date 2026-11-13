import React, { useState } from "react";
import type { TeachTimeStats } from "../lib/types";

interface TeachTimeMeterProps {
  stats: TeachTimeStats;
  nextBestAction?: string;
  onActionClick?: () => void;
}

export const TeachTimeMeter: React.FC<TeachTimeMeterProps> = ({
  stats,
  nextBestAction,
  onActionClick,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const hours = Math.floor(stats.minutes_all_time / 60);
  const mins = stats.minutes_all_time % 60;

  return (
    <div className="usp-banner">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span
            className="tag"
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              marginBottom: "8px",
              fontSize: "11px",
              letterSpacing: "0.5px",
            }}
          >
            SFIC UNIQUE USP · TEACH-TIME RECLAIM™
          </span>
          <h2>
            {hours > 0 ? `${hours}h ` : ""}
            {mins}m Administrative Time Reclaimed
          </h2>
          <p>
            Automating roll calls, mid-day meal logs, and compliance filings saves valuable teacher minutes every school day.
          </p>
        </div>

        <button
          className="btn small"
          onClick={() => setShowDetails(!showDetails)}
          style={{ background: "rgba(255, 255, 255, 0.15)", color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.3)" }}
        >
          {showDetails ? "Hide Formula" : "How is this calculated?"}
        </button>
      </div>

      {/* Metric Breakdown Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "12px",
          marginTop: "12px",
          padding: "12px",
          background: "rgba(0, 0, 0, 0.15)",
          borderRadius: "10px",
        }}
      >
        <div>
          <small style={{ color: "#bfdbfe", fontSize: "11px" }}>Saved Today</small>
          <div style={{ fontSize: "18px", fontWeight: 800 }}>{stats.minutes_today} mins</div>
        </div>
        <div>
          <small style={{ color: "#bfdbfe", fontSize: "11px" }}>This Week</small>
          <div style={{ fontSize: "18px", fontWeight: 800 }}>{stats.minutes_this_week} mins</div>
        </div>
        <div>
          <small style={{ color: "#bfdbfe", fontSize: "11px" }}>Attendance Days</small>
          <div style={{ fontSize: "18px", fontWeight: 800 }}>{stats.attendance_days} days</div>
        </div>
        <div>
          <small style={{ color: "#bfdbfe", fontSize: "11px" }}>Meal Records</small>
          <div style={{ fontSize: "18px", fontWeight: 800 }}>{stats.meal_days} days</div>
        </div>
      </div>

      {/* Next Best Action */}
      {nextBestAction && (
        <div
          style={{
            marginTop: "14px",
            background: "rgba(255, 255, 255, 0.95)",
            color: "var(--ink)",
            padding: "10px 14px",
            borderRadius: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <strong style={{ fontSize: "12.5px", color: "var(--blue-ink)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Next Best Action:{" "}
            </strong>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>{nextBestAction}</span>
          </div>
          {onActionClick && (
            <button
              className="btn small primary"
              onClick={onActionClick}
              style={{ fontSize: "12px" }}
            >
              Take Action →
            </button>
          )}
        </div>
      )}

      {/* Formula Transparency Modal/Accordion */}
      {showDetails && (
        <div
          style={{
            marginTop: "14px",
            padding: "14px",
            background: "rgba(0, 0, 0, 0.25)",
            borderRadius: "10px",
            fontSize: "12px",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ display: "block", marginBottom: "4px" }}>Transparent Estimation Methodology:</strong>
          <ul style={{ paddingLeft: "18px", margin: "4px 0" }}>
            <li><b>Daily Roll Call:</b> 5 minutes estimated vs. traditional paper register computation & manual headcounts.</li>
            <li><b>Mid-Day Meal Logging:</b> 3 minutes estimated vs. manual kitchen log register and duplicate reporting.</li>
            <li><b>Automated Reporting:</b> 10 minutes saved per report generated directly from saved database records.</li>
            <li><b>Deduplication:</b> Repeated saves on the same date update existing rows and never artificially inflate reclaimed minutes.</li>
          </ul>
          <p style={{ marginTop: "6px", fontSize: "11px", color: "#bfdbfe", fontStyle: "italic" }}>
            Note: These values are transparent illustrative estimates modeled for the SFIC challenge and should be distinguished from experimentally measured pilot figures.
          </p>
        </div>
      )}
    </div>
  );
};
