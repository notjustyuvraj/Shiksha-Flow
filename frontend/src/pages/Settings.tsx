import React, { useEffect, useState } from "react";
import { exportBackup, getSchools, resetDemoData, restoreBackup, updateSchool } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Language, School } from "../lib/types";
import { getTranslation } from "../lib/i18n";

interface SettingsProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const Settings: React.FC<SettingsProps> = ({ lang, onLanguageChange }) => {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [activeTab, setActiveTab] = useState<"profile" | "lang" | "backup" | "security">("profile");

  const [schoolName, setSchoolName] = useState("");
  const [schoolDistrict, setSchoolDistrict] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSchools().then((list) => {
      setSchools(list);
      const current = list.find((s) => s.id === user?.school_id) || list[0];
      if (current) {
        setSchoolName(current.name);
        setSchoolDistrict(current.district);
        setSchoolCode(current.code);
      }
    });
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSchoolId = user?.school_id || schools[0]?.id;
    if (!targetSchoolId) return;

    setLoading(true);
    try {
      await updateSchool(targetSchoolId, {
        name: schoolName.trim(),
        district: schoolDistrict.trim(),
        code: schoolCode.trim(),
      });
      setMessage("✓ School profile updated successfully.");
    } catch (err: any) {
      setMessage("Error updating school: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shikshaflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("✓ Backup exported successfully (credentials excluded).");
    } catch (err: any) {
      setMessage("Backup error: " + err.message);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const payload = JSON.parse(evt.target?.result as string);
        const res = await restoreBackup(payload);
        setMessage(`✓ Restored: ${res.restored_schools} schools, ${res.restored_students} students.`);
      } catch (err: any) {
        setMessage("Restore failed: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    if (!window.confirm("Reset all local records to initial seeded demonstration state?")) return;
    try {
      await resetDemoData();
      setMessage("✓ Demo dataset reset to initial state.");
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      setMessage("Reset error: " + err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{getTranslation(lang, "settings")}</h1>
        <p>Manage school profile, regional language preferences, and administrative backups.</p>
      </div>

      {message && <div className="notice-box">{message}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button
          className={`btn small ${activeTab === "profile" ? "primary" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          School Profile
        </button>
        <button
          className={`btn small ${activeTab === "lang" ? "primary" : ""}`}
          onClick={() => setActiveTab("lang")}
        >
          Language & Locale
        </button>
        <button
          className={`btn small ${activeTab === "backup" ? "primary" : ""}`}
          onClick={() => setActiveTab("backup")}
        >
          Backup & Recovery
        </button>
        <button
          className={`btn small ${activeTab === "security" ? "primary" : ""}`}
          onClick={() => setActiveTab("security")}
        >
          Security & Privacy
        </button>
      </div>

      {/* Tab 1: Profile */}
      {activeTab === "profile" && (
        <div className="card">
          <h2 style={{ fontSize: "16px", marginBottom: "14px" }}>School Institution Profile</h2>
          <form onSubmit={handleSaveProfile}>
            <div style={{ display: "grid", gap: "12px", maxWidth: "500px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>School Name *</label>
                <input
                  type="text"
                  className="input"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>District</label>
                <input
                  type="text"
                  className="input"
                  value={schoolDistrict}
                  onChange={(e) => setSchoolDistrict(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>School U-DISE / Code</label>
                <input
                  type="text"
                  className="input"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn primary"
                disabled={loading || (user?.role !== "admin" && user?.role !== "headmaster")}
                style={{ width: "fit-content", marginTop: "6px" }}
              >
                {loading ? "Saving..." : "Save School Profile"}
              </button>
              {user?.role !== "admin" && user?.role !== "headmaster" && (
                <small style={{ color: "var(--muted)" }}>* School profile editing is reserved for Headmasters and Admins.</small>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Language */}
      {activeTab === "lang" && (
        <div className="card">
          <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>Regional Language Selection</h2>
          <p style={{ fontSize: "13.5px", color: "var(--muted)", marginBottom: "16px" }}>
            Select the primary instruction language for interface labels, voice recognition, and reports.
          </p>

          <div style={{ display: "grid", gap: "12px", maxWidth: "400px" }}>
            {[
              { code: "en", name: "English (Default)", desc: "Full English terminology" },
              { code: "hi", name: "हिन्दी (Hindi)", desc: "हिंदी इंटरफ़ेस एवं वॉइस सपोर्ट" },
              { code: "gu", name: "ગુજરાતી (Gujarati)", desc: "ગુજરાતી ઇન્ટરફેસ અને રિપોર્ટ્સ" },
            ].map((l) => (
              <label
                key={l.code}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  border: `2px solid ${lang === l.code ? "var(--blue)" : "var(--line)"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  background: lang === l.code ? "var(--blue-bg)" : "white",
                }}
              >
                <input
                  type="radio"
                  name="langSelect"
                  checked={lang === l.code}
                  onChange={() => onLanguageChange(l.code as Language)}
                />
                <div>
                  <strong>{l.name}</strong>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>{l.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Backup & Recovery */}
      {activeTab === "backup" && (
        <div className="card">
          <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>Database Backup & Restoration</h2>
          <p style={{ fontSize: "13.5px", color: "var(--muted)", marginBottom: "16px" }}>
            Preserve school attendance and meal logs. Backups are exported in standard JSON format without exposing authentication credentials.
          </p>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
            <button className="btn primary" onClick={handleExportBackup}>
              📥 Export JSON Database Backup
            </button>

            <label className="btn" style={{ cursor: "pointer" }}>
              📤 Restore from JSON File
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                style={{ display: "none" }}
              />
            </label>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: "16px", marginTop: "16px" }}>
            <h3 style={{ fontSize: "15px", color: "var(--red)", marginBottom: "6px" }}>Demonstration Reset Zone</h3>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "12px" }}>
              Resets student roster, attendance, and mid-day meal logs back to clean prototype demo accounts.
            </p>
            <button className="btn danger" onClick={handleResetData}>
              ⚠️ Reset Demo Data
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Security & Privacy */}
      {activeTab === "security" && (
        <div className="card">
          <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>Data Isolation & Security Measures</h2>
          <div style={{ display: "grid", gap: "10px", fontSize: "13.5px" }}>
            <div style={{ padding: "10px 14px", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <b>Multi-Tenant School Isolation:</b> Teachers and headmasters are cryptographically bound to their own school IDs via server-side JWT session validation.
            </div>
            <div style={{ padding: "10px 14px", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <b>Password Security:</b> 200,000 rounds of PBKDF2 HMAC SHA-256 with unique 16-byte random salts per account.
            </div>
            <div style={{ padding: "10px 14px", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <b>Formula Injection Protection:</b> CSV exports automatically escape formulas starting with =, +, -, @ to prevent spreadsheet exploit execution.
            </div>
            <div style={{ padding: "10px 14px", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <b>Role-Based Access Control:</b> Strict route-level enforcement blocks teachers from officer oversight endpoints and restricts officer access to school-level statistical aggregates.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
