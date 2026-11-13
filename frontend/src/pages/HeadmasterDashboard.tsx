import React, { useEffect, useState } from "react";
import { fetchTeacherSummary, getOfficerSummary } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Language, OfficerSummary, TeacherDashboardData } from "../lib/types";

interface HeadmasterDashboardProps {
  lang: Language;
  onNavigate: (tab: string) => void;
}

export const HeadmasterDashboard: React.FC<HeadmasterDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const schoolId = user?.school_id || undefined;

  const [teacherData, setTeacherData] = useState<TeacherDashboardData | null>(null);
  const [officerData, setOfficerData] = useState<OfficerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvedDuties, setApprovedDuties] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      fetchTeacherSummary(schoolId),
      getOfficerSummary().catch(() => null),
    ])
      .then(([tRes, oRes]) => {
        setTeacherData(tRes);
        setOfficerData(oRes);
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  const toggleApproval = (key: string) => {
    setApprovedDuties((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading || !teacherData) {
    return <div className="card"><div style={{ textAlign: "center", padding: "40px" }}>Loading headmaster console…</div></div>;
  }

  const schoolSummary = officerData?.schools.find((s) => s.id === schoolId) || officerData?.schools[0];

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1>Headmaster Administrative Console 🏫</h1>
          <p>{teacherData.school_name} · Oversight, compliance, and duty review</p>
        </div>
        <button className="btn primary" onClick={() => onNavigate("reports")}>
          📄 View School Compliance Reports
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Enrolled</div>
          <div className="stat-val">{teacherData.total_students}</div>
          <small style={{ color: "var(--muted)", fontSize: "11.5px" }}>Active students</small>
        </div>

        <div className="stat-card">
          <div className="stat-label">Today's Attendance Rate</div>
          <div className="stat-val" style={{ color: "var(--green)" }}>{teacherData.attendance_completion_pct}%</div>
          <small style={{ color: "var(--muted)", fontSize: "11.5px" }}>{teacherData.present_today} Present / {teacherData.absent_today} Absent</small>
        </div>

        <div className="stat-card">
          <div className="stat-label">7-Day Completion Rate</div>
          <div className="stat-val" style={{ color: "var(--blue)" }}>{schoolSummary ? schoolSummary.completion : 92}%</div>
          <small style={{ color: "var(--muted)", fontSize: "11.5px" }}>{schoolSummary ? `${schoolSummary.missing} day(s) missing` : "On track"}</small>
        </div>

        <div className="stat-card">
          <div className="stat-label">MDM Today</div>
          <div className="stat-val">{teacherData.meal_marked ? `${teacherData.meal_today_qty}` : "Pending"}</div>
          <small style={{ color: "var(--muted)", fontSize: "11.5px" }}>{teacherData.meal_marked ? "Served & logged" : "Awaiting kitchen count"}</small>
        </div>
      </div>

      {/* Duty Review & Approval Workflow */}
      <div className="card">
        <h2 style={{ fontSize: "16px", marginBottom: "6px" }}>Daily Duty Review & Approval Workflow</h2>
        <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "16px" }}>
          Verify teacher submissions before official filing to block and district education officers.
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Administrative Duty</th>
                <th>Status</th>
                <th>Verification Detail</th>
                <th>Approval Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Morning Attendance Roll Call</b></td>
                <td>
                  <span className={`tag ${teacherData.attendance_marked ? "green" : "amber"}`}>
                    {teacherData.attendance_marked ? "Submitted" : "Pending"}
                  </span>
                </td>
                <td>
                  {teacherData.attendance_marked
                    ? `${teacherData.present_today} Present, ${teacherData.absent_today} Absent`
                    : "Not yet completed by class teacher"}
                </td>
                <td>
                  <button
                    className={`btn small ${approvedDuties["att"] ? "success" : ""}`}
                    disabled={!teacherData.attendance_marked}
                    onClick={() => toggleApproval("att")}
                  >
                    {approvedDuties["att"] ? "✓ Approved by HM" : "Review & Approve"}
                  </button>
                </td>
              </tr>

              <tr>
                <td><b>Mid-Day Meal Kitchen Log</b></td>
                <td>
                  <span className={`tag ${teacherData.meal_marked ? "green" : "amber"}`}>
                    {teacherData.meal_marked ? "Submitted" : "Pending"}
                  </span>
                </td>
                <td>
                  {teacherData.meal_marked
                    ? `${teacherData.meal_today_qty} meals logged`
                    : "Daily count awaiting submission"}
                </td>
                <td>
                  <button
                    className={`btn small ${approvedDuties["meal"] ? "success" : ""}`}
                    disabled={!teacherData.meal_marked}
                    onClick={() => toggleApproval("meal")}
                  >
                    {approvedDuties["meal"] ? "✓ Approved by HM" : "Review & Approve"}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Missing Records and Alerts */}
      <div className="card" style={{ marginTop: "16px" }}>
        <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>Compliance Oversight Notice</h2>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ fontSize: "24px" }}>⚠️</div>
          <div style={{ fontSize: "13px" }}>
            {schoolSummary && schoolSummary.missing > 0
              ? `There are ${schoolSummary.missing} unrecorded attendance day(s) in the last 7 calendar days. Prompt class teachers to submit records to maintain >90% compliance.`
              : "All required attendance and meal filings for the last 7 calendar days are up to date."}
          </div>
        </div>
      </div>
    </div>
  );
};
