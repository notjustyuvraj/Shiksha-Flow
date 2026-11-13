import React, { useEffect, useState, useMemo } from "react";
import { getAttendance, getStudents, saveAttendance } from "../lib/api";
import { saveOfflineAttendanceDraft } from "../lib/offline";
import { useAuth } from "../lib/auth";
import type { Language, Status, Student } from "../lib/types";
import { getTranslation } from "../lib/i18n";

interface AttendancePageProps {
  lang: Language;
}

export const Attendance: React.FC<AttendancePageProps> = ({ lang }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<Record<number, Status>>({});
  const [savedStatus, setSavedStatus] = useState(false);
  const [selectedClass, setSelectedClass] = useState("All classes");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const schoolId = user?.school_id || undefined;

  // Load students & attendance whenever date changes
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getStudents(schoolId, false),
      getAttendance(selectedDate, schoolId),
    ])
      .then(([stuRes, attRes]) => {
        setStudents(stuRes);
        const map: Record<number, Status> = {};
        stuRes.forEach((s) => {
          map[s.id] = attRes.entries[s.id] || "unmarked";
        });
        setEntries(map);
        setSavedStatus(attRes.saved);
      })
      .catch((err) => setMessage("Error: " + err.message))
      .finally(() => setLoading(false));
  }, [selectedDate, schoolId]);

  // Distinct classes
  const classes = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.cls))).filter(Boolean);
  }, [students]);

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = selectedClass === "All classes" || s.cls === selectedClass;
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [students, selectedClass, searchQuery]);

  // Calculated totals
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let pending = 0;

    filteredStudents.forEach((s) => {
      const st = entries[s.id] || "unmarked";
      if (st === "present") present++;
      else if (st === "absent") absent++;
      else if (st === "leave") leave++;
      else pending++;
    });

    const total = filteredStudents.length;
    const marked = present + absent + leave;
    const pct = total > 0 ? Math.round((marked / total) * 100) : 0;
    return { total, present, absent, leave, pending, marked, pct };
  }, [filteredStudents, entries]);

  const setStudentStatus = (id: number, status: Status) => {
    setEntries((prev) => ({ ...prev, [id]: status }));
  };

  const markAll = (status: Status) => {
    setEntries((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((s) => {
        next[s.id] = status;
      });
      return next;
    });
    setMessage(`All visible students marked as ${status}. Click 'Save Attendance' to persist.`);
  };

  const handleSave = async () => {
    if (counts.pending > 0) {
      const proceed = window.confirm(
        `${counts.pending} student(s) are still unmarked. Save roll call anyway?`
      );
      if (!proceed) return;
    }

    setSaving(true);
    const entryList = Object.keys(entries).map((idStr) => ({
      student_id: Number(idStr),
      status: entries[Number(idStr)],
    }));

    if (!navigator.onLine) {
      saveOfflineAttendanceDraft(selectedDate, schoolId || 1, entryList);
      setSaving(false);
      setMessage("Saved locally as offline draft. Will sync automatically when connected.");
      return;
    }

    try {
      await saveAttendance({
        date: selectedDate,
        school_id: schoolId,
        entries: entryList,
      });
      setSavedStatus(true);
      setMessage("✓ Attendance saved successfully! Teach-Time Reclaim™ updated (+5 min).");
    } catch (err: any) {
      setMessage("Error saving attendance: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1>{getTranslation(lang, "attendance")}</h1>
          <p>Record daily roll call once. Reuse records across all reports automatically.</p>
        </div>
        <button
          className="btn primary"
          onClick={handleSave}
          disabled={saving || filteredStudents.length === 0}
        >
          {saving ? "Saving..." : `💾 ${getTranslation(lang, "saveAttendance")}`}
        </button>
      </div>

      {message && (
        <div className="notice-box" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{message}</span>
          <button
            onClick={() => setMessage(null)}
            style={{ background: "none", border: "none", fontWeight: 700, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid stats-grid">
        <div className="stat-card">
          <div className="stat-label">Students in View</div>
          <div className="stat-val">{counts.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{getTranslation(lang, "presentToday")}</div>
          <div className="stat-val" style={{ color: "var(--green)" }}>{counts.present}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{getTranslation(lang, "absentToday")}</div>
          <div className="stat-val" style={{ color: "var(--red)" }}>{counts.absent}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{getTranslation(lang, "onLeave")}</div>
          <div className="stat-val" style={{ color: "var(--amber)" }}>{counts.leave}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{getTranslation(lang, "unmarked")}</div>
          <div className="stat-val">{counts.pending}</div>
        </div>
      </div>

      {/* Filter and Action Toolbar */}
      <div className="card">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ minWidth: "150px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Date</label>
              <input
                type="date"
                className="input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div style={{ minWidth: "140px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Class / Section</label>
              <select
                className="input"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="All classes">{getTranslation(lang, "allClasses")}</option>
                {classes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: "180px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Search Student</label>
              <input
                type="text"
                className="input"
                placeholder={getTranslation(lang, "search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
            <button className="btn small" onClick={() => markAll("present")}>
              ✓ {getTranslation(lang, "markAllPresent")}
            </button>
            <button className="btn small" onClick={() => markAll("unmarked")}>
              Clear Marks
            </button>
          </div>
        </div>

        {/* Student Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
            Loading attendance records…
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "35px", color: "var(--muted)" }}>
            No students found matching your filters.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Current Status</th>
                  <th style={{ textAlign: "right" }}>Quick Mark</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const status = entries[student.id] || "unmarked";
                  return (
                    <tr key={student.id}>
                      <td>
                        <strong>{student.name}</strong>
                        <small style={{ display: "block", color: "var(--muted)" }}>ID #{student.id}</small>
                      </td>
                      <td>{student.cls}</td>
                      <td>
                        <span
                          className={`tag ${
                            status === "present"
                              ? "green"
                              : status === "absent"
                              ? "red"
                              : status === "leave"
                              ? "amber"
                              : ""
                          }`}
                        >
                          {status === "present"
                            ? "Present"
                            : status === "absent"
                            ? "Absent"
                            : status === "leave"
                            ? "Leave"
                            : "Not Marked"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            className={`btn small ${status === "present" ? "success" : ""}`}
                            onClick={() => setStudentStatus(student.id, "present")}
                          >
                            P
                          </button>
                          <button
                            className={`btn small ${status === "absent" ? "danger" : ""}`}
                            onClick={() => setStudentStatus(student.id, "absent")}
                          >
                            A
                          </button>
                          <button
                            className={`btn small ${status === "leave" ? "primary" : ""}`}
                            onClick={() => setStudentStatus(student.id, "leave")}
                          >
                            L
                          </button>
                          <button
                            className="btn small"
                            onClick={() => setStudentStatus(student.id, "unmarked")}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <span style={{ fontSize: "12.5px", color: "var(--muted)" }}>
            {savedStatus ? "✓ Saved record exists for this date." : "⚠ No record saved for this date yet."}
          </span>
          <span style={{ fontSize: "12.5px", fontWeight: 600 }}>
            {counts.marked} of {counts.total} marked ({counts.pct}%)
          </span>
        </div>
      </div>
    </div>
  );
};
