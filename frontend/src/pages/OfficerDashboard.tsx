import React, { useEffect, useState, useMemo } from "react";
import { downloadSafeCSV, getOfficerSummary } from "../lib/api";
import type { Language, OfficerSummary } from "../lib/types";

interface OfficerDashboardProps {
  lang: Language;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = () => {
  const [data, setData] = useState<OfficerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "attention" | "followup" | "ontrack">("all");

  useEffect(() => {
    getOfficerSummary()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredSchools = useMemo(() => {
    if (!data) return [];
    if (filter === "attention") return data.schools.filter((s) => s.completion < 75);
    if (filter === "followup") return data.schools.filter((s) => s.completion >= 75 && s.completion < 90);
    if (filter === "ontrack") return data.schools.filter((s) => s.completion >= 90);
    return data.schools;
  }, [data, filter]);

  const handleExportCSV = () => {
    if (!data) return;
    const headers = ["School Name", "District", "School Code", "Students Enrolled", "7-Day Completion %", "Missing Days", "Status"];
    const rows = data.schools.map((s) => [
      s.name,
      s.district,
      s.code,
      s.students,
      s.completion,
      s.missing,
      s.completion >= 90 ? "On Track" : s.completion >= 75 ? "Follow Up" : "Action Needed",
    ]);
    downloadSafeCSV(`district_school_compliance_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  if (loading) {
    return <div className="card"><div style={{ textAlign: "center", padding: "40px" }}>Loading officer district view…</div></div>;
  }

  if (error || !data) {
    return <div className="notice-box">Failed to load officer summary: {error || "Permission denied"}</div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1>Education Officer District Oversight 🏛️</h1>
          <p>Monitor reporting completeness, missing records, and compliance across assigned schools.</p>
        </div>
        <button className="btn primary" onClick={handleExportCSV}>
          📥 Export District Compliance CSV
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid stats-grid">
        <div className="stat-card">
          <div className="stat-label">Schools in Jurisdiction</div>
          <div className="stat-val">{data.schools.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Average 7-Day Completion</div>
          <div className="stat-val" style={{ color: "var(--blue)" }}>{data.avg_completion}%</div>
          <small style={{ color: "var(--muted)", fontSize: "11px" }}>Across all assigned schools</small>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Missing Filings</div>
          <div className="stat-val" style={{ color: data.total_missing > 0 ? "var(--amber)" : "var(--green)" }}>
            {data.total_missing}
          </div>
          <small style={{ color: "var(--muted)", fontSize: "11px" }}>Unrecorded days (last 7d)</small>
        </div>

        <div className="stat-card">
          <div className="stat-label">Follow-up Priority Schools</div>
          <div className="stat-val" style={{ color: "var(--red)" }}>{data.needs_followup}</div>
          <small style={{ color: "var(--muted)", fontSize: "11px" }}>Below 80% completion</small>
        </div>
      </div>

      {/* Comparative Table */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
          <h2 style={{ fontSize: "16px" }}>School Reporting Performance</h2>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              className={`btn small ${filter === "all" ? "primary" : ""}`}
              onClick={() => setFilter("all")}
            >
              All ({data.schools.length})
            </button>
            <button
              className={`btn small ${filter === "attention" ? "danger" : ""}`}
              onClick={() => setFilter("attention")}
            >
              Action Needed ({data.schools.filter((s) => s.completion < 75).length})
            </button>
            <button
              className={`btn small ${filter === "followup" ? "primary" : ""}`}
              onClick={() => setFilter("followup")}
            >
              Follow Up ({data.schools.filter((s) => s.completion >= 75 && s.completion < 90).length})
            </button>
            <button
              className={`btn small ${filter === "ontrack" ? "success" : ""}`}
              onClick={() => setFilter("ontrack")}
            >
              On Track ({data.schools.filter((s) => s.completion >= 90).length})
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>School Name</th>
                <th>District</th>
                <th>Code</th>
                <th>Enrolled</th>
                <th>7-Day Completion</th>
                <th>Missing Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchools.map((s) => {
                const badge =
                  s.completion >= 90
                    ? { tag: "green", label: "On Track" }
                    : s.completion >= 75
                    ? { tag: "amber", label: "Follow Up" }
                    : { tag: "red", label: "Action Needed" };

                return (
                  <tr key={s.id}>
                    <td><b>{s.name}</b></td>
                    <td>{s.district || "—"}</td>
                    <td><code>{s.code || "—"}</code></td>
                    <td>{s.students}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 700 }}>{s.completion}%</span>
                        <div className="progress-bar" style={{ width: "90px", margin: 0 }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${s.completion}%`,
                              background: s.completion < 75 ? "var(--red)" : s.completion < 90 ? "var(--amber)" : "var(--green)",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>{s.missing}</td>
                    <td>
                      <span className={`tag ${badge.tag}`}>{badge.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "14px", fontSize: "12px", color: "var(--muted)" }}>
          <b>Privacy Assurance:</b> This dashboard aggregates school attendance compliance rates. Individual student names and private student records are protected from unnecessary exposure.
        </div>
      </div>
    </div>
  );
};
