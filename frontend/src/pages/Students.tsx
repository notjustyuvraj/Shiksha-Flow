import React, { useEffect, useState, useMemo } from "react";
import {
  addStudent,
  deleteStudent,
  getStudentAttendanceHistory,
  getStudents,
  importStudents,
  updateStudent,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Language, Student, StudentHistoryEntry } from "../lib/types";
import { getTranslation } from "../lib/i18n";

interface StudentsPageProps {
  lang: Language;
}

export const Students: React.FC<StudentsPageProps> = ({ lang }) => {
  const { user } = useAuth();
  const schoolId = user?.school_id || undefined;

  const [students, setStudents] = useState<Student[]>([]);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("All classes");
  const [message, setMessage] = useState<string | null>(null);

  // Add / Edit Modal State
  const [editModal, setEditModal] = useState<{
    open: boolean;
    student?: Student;
    name: string;
    cls: string;
  }>({ open: false, name: "", cls: "Class 3A" });

  // History Modal State
  const [historyModal, setHistoryModal] = useState<{
    open: boolean;
    studentName?: string;
    history: StudentHistoryEntry[];
    loading: boolean;
  }>({ open: false, history: [], loading: false });

  // CSV Import Modal State
  const [csvModal, setCsvModal] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<Array<{ name: string; cls: string }>>([]);

  const loadStudents = () => {
    setLoading(true);
    getStudents(schoolId, includeInactive)
      .then(setStudents)
      .catch((err) => setMessage("Error: " + err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStudents();
  }, [schoolId, includeInactive]);

  const classes = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.cls))).filter(Boolean);
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = selectedClass === "All classes" || s.cls === selectedClass;
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [students, selectedClass, search]);

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.name.trim()) return;

    try {
      if (editModal.student) {
        await updateStudent(editModal.student.id, {
          name: editModal.name.trim(),
          cls: editModal.cls.trim() || "Class 3A",
        });
        setMessage("Student details updated.");
      } else {
        await addStudent({
          name: editModal.name.trim(),
          cls: editModal.cls.trim() || "Class 3A",
          school_id: schoolId,
        });
        setMessage("Student added to active roster.");
      }
      setEditModal({ open: false, name: "", cls: "Class 3A" });
      loadStudents();
    } catch (err: any) {
      setMessage("Error saving student: " + err.message);
    }
  };

  const handleToggleActive = async (student: Student) => {
    try {
      const res = await deleteStudent(student.id, false);
      setMessage(`Student ${student.name} is now ${res.status}.`);
      loadStudents();
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
  };

  const handleViewHistory = async (student: Student) => {
    setHistoryModal({ open: true, studentName: student.name, history: [], loading: true });
    try {
      const history = await getStudentAttendanceHistory(student.id);
      setHistoryModal({ open: true, studentName: student.name, history, loading: false });
    } catch (err: any) {
      setMessage("Error loading history: " + err.message);
      setHistoryModal({ open: false, history: [], loading: false });
    }
  };

  const handleParseCSV = (raw: string) => {
    setCsvText(raw);
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: Array<{ name: string; cls: string }> = [];

    lines.forEach((line, index) => {
      // Skip header if it contains 'name'
      if (index === 0 && line.toLowerCase().includes("name")) return;
      const parts = line.split(",").map((p) => p.replace(/^["']|["']$/g, "").trim());
      if (parts[0]) {
        parsed.push({
          name: parts[0],
          cls: parts[1] || "Class 3A",
        });
      }
    });
    setCsvPreview(parsed);
  };

  const handleCommitCSV = async () => {
    if (csvPreview.length === 0) return;
    try {
      const res = await importStudents(csvPreview, schoolId);
      setMessage(`Imported ${res.imported} new student(s). Skipped ${res.skipped} existing duplicate(s).`);
      setCsvModal(false);
      setCsvText("");
      setCsvPreview([]);
      loadStudents();
    } catch (err: any) {
      setMessage("Import error: " + err.message);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1>{getTranslation(lang, "students")}</h1>
          <p>Single-source student registry. Used across attendance, meals, and compliance reports.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn" onClick={() => setCsvModal(true)}>
            📥 {getTranslation(lang, "importCSV")}
          </button>
          <button
            className="btn primary"
            onClick={() => setEditModal({ open: true, name: "", cls: "Class 3A" })}
          >
            ＋ {getTranslation(lang, "addStudent")}
          </button>
        </div>
      </div>

      {message && (
        <div className="notice-box" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{message}</span>
          <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Roster Controls */}
      <div className="card">
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Search by Name</label>
            <input
              type="text"
              className="input"
              placeholder={getTranslation(lang, "search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ minWidth: "160px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Class Filter</label>
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

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "18px" }}>
            <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              Show Inactive
            </label>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>Loading roster…</div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "35px", color: "var(--muted)" }}>No students match your query.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Class / Section</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.65 }}>
                    <td>
                      <strong>{s.name}</strong>
                      <small style={{ display: "block", color: "var(--muted)" }}>ID #{s.id}</small>
                    </td>
                    <td>{s.cls}</td>
                    <td>
                      <span className={`tag ${s.is_active ? "green" : "amber"}`}>
                        {s.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          className="btn small"
                          onClick={() => setEditModal({ open: true, student: s, name: s.name, cls: s.cls })}
                        >
                          Edit
                        </button>
                        <button
                          className="btn small"
                          onClick={() => handleViewHistory(s)}
                        >
                          History
                        </button>
                        <button
                          className={`btn small ${s.is_active ? "danger" : "success"}`}
                          onClick={() => handleToggleActive(s)}
                        >
                          {s.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {editModal.open && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>{editModal.student ? "Edit Student Details" : "Add Student to Roster"}</h2>
            <form onSubmit={handleSaveStudent} style={{ marginTop: "14px" }}>
              <div style={{ display: "grid", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Student Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={editModal.name}
                    onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                    required
                    maxLength={120}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Class / Section *</label>
                  <input
                    type="text"
                    className="input"
                    value={editModal.cls}
                    onChange={(e) => setEditModal({ ...editModal, cls: e.target.value })}
                    required
                    maxLength={60}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setEditModal({ open: false, name: "", cls: "Class 3A" })}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn primary">
                    {editModal.student ? "Save Changes" : "Add to Roster"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance History Modal */}
      {historyModal.open && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>Attendance History: {historyModal.studentName}</h2>
            {historyModal.loading ? (
              <div style={{ textAlign: "center", padding: "20px" }}>Loading records…</div>
            ) : historyModal.history.length === 0 ? (
              <div style={{ padding: "20px", color: "var(--muted)", textAlign: "center" }}>
                No past attendance records on file for this student.
              </div>
            ) : (
              <div className="table-wrap" style={{ marginTop: "12px", maxHeight: "300px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyModal.history.map((h, i) => (
                      <tr key={i}>
                        <td>{h.date}</td>
                        <td>
                          <span className={`tag ${h.status === "present" ? "green" : h.status === "absent" ? "red" : "amber"}`}>
                            {h.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button className="btn" onClick={() => setHistoryModal({ open: false, history: [], loading: false })}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {csvModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: "600px" }}>
            <h2>Import Students from CSV</h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 14px" }}>
              Paste comma-separated rows: <code>Name, Class</code> (one student per line).
            </p>

            <textarea
              className="input"
              rows={5}
              placeholder="Aarav Patel, Class 3A&#10;Diya Shah, Class 3A&#10;Vivaan Mehta, Class 3B"
              value={csvText}
              onChange={(e) => handleParseCSV(e.target.value)}
            />

            {csvPreview.length > 0 && (
              <div style={{ marginTop: "14px" }}>
                <strong>Preview ({csvPreview.length} students to import):</strong>
                <div className="table-wrap" style={{ maxHeight: "180px", marginTop: "6px" }}>
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Class</th></tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((item, idx) => (
                        <tr key={idx}><td>{item.name}</td><td>{item.cls}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button className="btn" onClick={() => setCsvModal(false)}>Cancel</button>
              <button
                className="btn primary"
                disabled={csvPreview.length === 0}
                onClick={handleCommitCSV}
              >
                Import {csvPreview.length} Students
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
