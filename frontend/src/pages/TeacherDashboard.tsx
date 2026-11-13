import React, { useEffect, useState } from "react";
import { fetchTeacherSummary } from "../lib/api";
import type { TeacherDashboardData, Language } from "../lib/types";
import { TeachTimeMeter } from "../components/TeachTimeMeter";
import { getTranslation } from "../lib/i18n";

interface TeacherDashboardProps {
  onNavigate: (tab: string) => void;
  lang: Language;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigate, lang }) => {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeacherSummary()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
          Loading teacher dashboard…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="notice-box">
        Failed to load teacher summary: {error || "Unknown error"}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1>{getTranslation(lang, "goodMorning")}, Teacher 👋</h1>
          <p>{data.school_name} · Daily operations overview for {data.today}</p>
        </div>
        <button className="btn primary" onClick={() => onNavigate("attendance")}>
          ＋ {getTranslation(lang, "markAttendance")}
        </button>
      </div>

      {/* Teach-Time Reclaim Banner */}
      <TeachTimeMeter
        stats={data.teach_time}
        nextBestAction={data.next_best_action}
        onActionClick={() => {
          if (!data.attendance_marked) onNavigate("attendance");
          else if (!data.meal_marked) onNavigate("meals");
          else onNavigate("reports");
        }}
      />

      {/* Daily Stats Grid */}
      <div className="grid stats-grid">
        <div className="stat-card">
          <div className="stat-label">{getTranslation(lang, "totalStudents")}</div>
          <div className="stat-val">{data.total_students}</div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>Active roster</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">{getTranslation(lang, "presentToday")}</div>
          <div className="stat-val" style={{ color: "var(--green)" }}>{data.present_today}</div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            {data.total_students ? Math.round((data.present_today / data.total_students) * 100) : 0}% of roster
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">{getTranslation(lang, "absentToday")}</div>
          <div className="stat-val" style={{ color: "var(--red)" }}>{data.absent_today}</div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            {data.leave_today > 0 ? `+ ${data.leave_today} on leave` : "Recorded absences"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Attendance Capture</div>
          <div className="stat-val">{data.attendance_completion_pct}%</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${data.attendance_completion_pct}%` }} />
          </div>
        </div>
      </div>

      {/* Tasks and Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        {/* Pending Duties */}
        <div className="card">
          <h2 style={{ fontSize: "16px", marginBottom: "14px" }}>
            {getTranslation(lang, "todayTasks")}
          </h2>
          <div style={{ display: "grid", gap: "10px" }}>
            {data.pending_tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  background: task.completed ? "#f8fafc" : "#ffffff",
                }}
              >
                <div>
                  <strong style={{ fontSize: "13.5px", display: "block" }}>{task.title}</strong>
                  <small style={{ color: "var(--muted)", fontSize: "12px" }}>{task.desc}</small>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className={`tag ${task.completed ? "green" : "amber"}`}>
                    {task.completed ? "Completed" : "Pending"}
                  </span>
                  <button className="btn small" onClick={() => onNavigate(task.action_tab)}>
                    Open →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Workflow Actions */}
        <div className="card">
          <h2 style={{ fontSize: "16px", marginBottom: "14px" }}>
            {getTranslation(lang, "quickActions")}
          </h2>
          <div style={{ display: "grid", gap: "10px" }}>
            <button
              className="btn"
              style={{ justifyContent: "flex-start", padding: "12px 16px" }}
              onClick={() => onNavigate("meals")}
            >
              <span style={{ fontSize: "18px" }}>♨</span>
              <div style={{ textAlign: "left" }}>
                <strong>{getTranslation(lang, "recordMeals")}</strong>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>Log daily count and menu served</div>
              </div>
            </button>

            <button
              className="btn"
              style={{ justifyContent: "flex-start", padding: "12px 16px" }}
              onClick={() => onNavigate("voice")}
            >
              <span style={{ fontSize: "18px" }}>🎙️</span>
              <div style={{ textAlign: "left" }}>
                <strong>{getTranslation(lang, "voiceEntry")}</strong>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>Dictate attendance with speech-to-text</div>
              </div>
            </button>

            <button
              className="btn"
              style={{ justifyContent: "flex-start", padding: "12px 16px" }}
              onClick={() => onNavigate("ocr")}
            >
              <span style={{ fontSize: "18px" }}>📷</span>
              <div style={{ textAlign: "left" }}>
                <strong>{getTranslation(lang, "ocrScanner")}</strong>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>Scan paper registers or meal slips</div>
              </div>
            </button>

            <button
              className="btn"
              style={{ justifyContent: "flex-start", padding: "12px 16px" }}
              onClick={() => onNavigate("reports")}
            >
              <span style={{ fontSize: "18px" }}>📄</span>
              <div style={{ textAlign: "left" }}>
                <strong>{getTranslation(lang, "generateReport")}</strong>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>Instant PDF print or CSV export</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {data.recent_activity.length > 0 && (
        <div className="card" style={{ marginTop: "16px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "12px" }}>Recent School Administrative Logs</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_activity.map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td><b>{a.username}</b></td>
                    <td><span className="tag blue">{a.action}</span></td>
                    <td>{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
