import React, { useState } from "react";
import { downloadSafeCSV, getReport } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Language, ReportData } from "../lib/types";
import { getTranslation } from "../lib/i18n";

interface SmartReportsProps {
  lang: Language;
}

export const SmartReports: React.FC<SmartReportsProps> = ({ lang }) => {
  const { user } = useAuth();
  const schoolId = user?.school_id || undefined;

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [type, setType] = useState("combined");
  const [period, setPeriod] = useState("month");
  const [start, setStart] = useState(() => todayStr().slice(0, 7) + "-01");
  const [end, setEnd] = useState(todayStr);

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    const now = new Date();
    const today = todayStr();
    if (val === "today") {
      setStart(today);
      setEnd(today);
    } else if (val === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setStart(d.toISOString().slice(0, 10));
      setEnd(today);
    } else if (val === "month") {
      setStart(today.slice(0, 7) + "-01");
      setEnd(today);
    } else if (val === "all") {
      setStart("2024-01-01");
      setEnd(today);
    }
  };

  const handleGenerate = async () => {
    if (start > end) {
      setMessage("Start date must be on or before end date.");
      return;
    }
    setLoading(true);
    try {
      const res = await getReport(type, start, end, schoolId);
      setReportData(res);
      setMessage(null);
    } catch (err: any) {
      setMessage("Error generating report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const filename = `shikshaflow_report_${reportData.type}_${reportData.start}_to_${reportData.end}.csv`;

    if (reportData.type === "attendance") {
      const headers = ["Date", "Present", "Absent", "On Leave", "Total Enrolled", "Attendance Rate %"];
      const rows = reportData.attendance.map((a) => [
        a.date,
        a.present,
        a.absent,
        a.leave || 0,
        reportData.total_students,
        a.pct || 0,
      ]);
      downloadSafeCSV(filename, headers, rows);
    } else if (reportData.type === "meals") {
      const headers = ["Date", "Meals Served", "Menu", "Notes"];
      const rows = reportData.meals.map((m) => [m.date, m.qty, m.menu, m.notes]);
      downloadSafeCSV(filename, headers, rows);
    } else {
      const headers = ["Record Type", "Date", "Summary Metric", "Details"];
      const rows: (string | number)[][] = [
        ...reportData.attendance.map((a) => [
          "Attendance",
          a.date,
          `${a.present} Present / ${a.absent} Absent`,
          `${a.pct}% attendance rate`,
        ]),
        ...reportData.meals.map((m) => [
          "Mid-Day Meal",
          m.date,
          `${m.qty} Meals Served`,
          `Menu: ${m.menu || "Standard"} | Notes: ${m.notes || "None"}`,
        ]),
      ];
      downloadSafeCSV(filename, headers, rows);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1>{getTranslation(lang, "reports")}</h1>
          <p>Instant administrative filings generated from real database entries. Zero duplicate entry.</p>
        </div>
        {reportData && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn" onClick={() => window.print()}>
              ⎙ Print / Save PDF
            </button>
            <button className="btn primary" onClick={handleExportCSV}>
              📥 Download CSV
            </button>
          </div>
        )}
      </div>

      {message && <div className="notice-box">{message}</div>}

      {/* Setup Form */}
      <div className="card no-print">
        <h2 style={{ fontSize: "16px", marginBottom: "12px" }}>Report Parameters</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Report Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="combined">Administrative Overview (Combined)</option>
              <option value="attendance">Student Attendance Report</option>
              <option value="meals">Mid-Day Meal Summary</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Preset Period</label>
            <select className="input" value={period} onChange={(e) => handlePeriodChange(e.target.value)}>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="all">All Saved Records</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Start Date</label>
            <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>End Date</label>
            <input type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>

          <div>
            <button
              className="btn primary"
              style={{ width: "100%", height: "40px" }}
              disabled={loading}
              onClick={handleGenerate}
            >
              {loading ? "Generating..." : "Generate Report ↗"}
            </button>
          </div>
        </div>
      </div>

      {/* Report Rendered Layout */}
      {reportData ? (
        <div className="card" id="printable-report">
          <div style={{ borderBottom: "2px solid var(--line)", paddingBottom: "16px", marginBottom: "16px" }}>
            <span className="tag blue" style={{ marginBottom: "6px" }}>OFFICIAL ADMINISTRATIVE RECORD</span>
            <h2 style={{ fontSize: "22px", margin: "4px 0" }}>
              {reportData.type === "attendance"
                ? "Student Attendance Record"
                : reportData.type === "meals"
                ? "Mid-Day Meal Compliance Summary"
                : "Unified School Administrative Report"}
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "13.5px" }}>
              {reportData.school_name || "Primary School"} · Reporting Period: <b>{reportData.start}</b> to <b>{reportData.end}</b>
            </p>
          </div>

          {/* Report KPIs */}
          <div className="grid stats-grid" style={{ marginBottom: "20px" }}>
            <div className="stat-card">
              <div className="stat-label">Active Enrolled</div>
              <div className="stat-val">{reportData.total_students}</div>
            </div>

            {reportData.type !== "meals" && (
              <div className="stat-card">
                <div className="stat-label">Attendance Days</div>
                <div className="stat-val">{reportData.attendance.length}</div>
              </div>
            )}

            {reportData.type !== "attendance" && (
              <div className="stat-card">
                <div className="stat-label">Total Meals Logged</div>
                <div className="stat-val" style={{ color: "var(--blue)" }}>
                  {reportData.total_meals?.toLocaleString("en-IN") || 0}
                </div>
              </div>
            )}

            <div className="stat-card">
              <div className="stat-label">Teach-Time Reclaimed</div>
              <div className="stat-val" style={{ color: "var(--green)" }}>
                {reportData.reclaimed_minutes || 0}m
              </div>
            </div>
          </div>

          {/* Attendance Section */}
          {reportData.type !== "meals" && (
            <div style={{ marginBottom: "22px" }}>
              <h3 style={{ fontSize: "15px", marginBottom: "8px" }}>Attendance Breakdown</h3>
              {reportData.attendance.length === 0 ? (
                <div style={{ color: "var(--muted)", fontStyle: "italic" }}>No attendance recorded for this period.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Present</th>
                        <th>Absent</th>
                        <th>On Leave</th>
                        <th>Total Marked</th>
                        <th>Rate %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.attendance.map((a) => (
                        <tr key={a.date}>
                          <td><b>{a.date}</b></td>
                          <td style={{ color: "var(--green)" }}>{a.present}</td>
                          <td style={{ color: "var(--red)" }}>{a.absent}</td>
                          <td style={{ color: "var(--amber)" }}>{a.leave || 0}</td>
                          <td>{a.marked} / {reportData.total_students}</td>
                          <td><strong>{a.pct}%</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Meals Section */}
          {reportData.type !== "attendance" && (
            <div>
              <h3 style={{ fontSize: "15px", marginBottom: "8px" }}>Mid-Day Meal Entries</h3>
              {reportData.meals.length === 0 ? (
                <div style={{ color: "var(--muted)", fontStyle: "italic" }}>No meal entries recorded for this period.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Meals Served</th>
                        <th>Menu</th>
                        <th>Remarks / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.meals.map((m) => (
                        <tr key={m.date}>
                          <td><b>{m.date}</b></td>
                          <td><strong style={{ color: "var(--blue)" }}>{m.qty.toLocaleString("en-IN")}</strong></td>
                          <td>{m.menu || "—"}</td>
                          <td style={{ color: "var(--muted)" }}>{m.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: "24px", paddingTop: "12px", borderTop: "1px solid var(--line)", fontSize: "11.5px", color: "var(--muted)" }}>
            Generated automatically by ShikshaFlow on {new Date().toLocaleString()} · SFIC Compliant · Teach-Time Reclaim™
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
          Select parameters and click "Generate Report ↗" to preview your official administrative filing.
        </div>
      )}
    </div>
  );
};
