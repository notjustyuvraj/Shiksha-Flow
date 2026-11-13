import React, { useEffect, useState } from "react";
import { getStudents, saveAttendance } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Language, Status, Student } from "../lib/types";
import { getTranslation } from "../lib/i18n";

interface VoiceEntryProps {
  lang: Language;
  onNavigate: (tab: string) => void;
}

interface ParsedItem {
  raw: string;
  matchedStudent?: Student;
  status: Status;
  confidence: "high" | "medium" | "low" | "unmatched";
}

export const VoiceEntry: React.FC<VoiceEntryProps> = ({ lang, onNavigate }) => {
  const { user } = useAuth();
  const schoolId = user?.school_id || undefined;

  const [students, setStudents] = useState<Student[]>([]);
  const [speechLang, setSpeechLang] = useState<"hi-IN" | "en-IN" | "gu-IN">("hi-IN");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [supported, setSupported] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStudents(schoolId, false).then(setStudents).catch(console.error);
    const hasSpeech = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    setSupported(hasSpeech);
  }, [schoolId]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage("Speech recognition is not supported in this browser. You can type your draft manually below.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = speechLang;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setMessage("Listening… Speak attendance (e.g., 'Aarav present, Diya absent')");
      };

      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript;
        setTranscript((prev) => (prev ? prev + ", " + spoken : spoken));
        setIsListening(false);
        setMessage("Spoken text captured. Click 'Parse Draft' to review matches.");
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setMessage("Speech recognition notice: " + (event.error || "Could not process audio. Try typing draft manually."));
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e: any) {
      setIsListening(false);
      setMessage("Microphone permission or speech error: " + e.message);
    }
  };

  const handleParse = () => {
    if (!transcript.trim()) {
      setMessage("Please dictate or type a draft first.");
      return;
    }

    const segments = transcript
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const results: ParsedItem[] = segments.map((seg) => {
      let status: Status = "unmarked";
      if (/\b(present|उपस्थित|हाજર|here|yes)\b/i.test(seg)) status = "present";
      else if (/\b(absent|अनुपस्थित|ગેરહાજર|not here|no)\b/i.test(seg)) status = "absent";
      else if (/\b(leave|छुट्टी|रજા|sick)\b/i.test(seg)) status = "leave";

      // Strip status keywords to extract student name candidate
      const cleanName = seg
        .replace(/\b(present|absent|leave|उपस्थित|अनुपस्थित|छुट्टी|हाજર|ગેરહાજર|रજા|here|not here|yes|no|is|was|hai|tha)\b/gi, "")
        .trim()
        .toLowerCase();

      // Find closest student name match in roster
      const matched = students.find((s) => {
        const sName = s.name.toLowerCase();
        return sName.includes(cleanName) || cleanName.includes(sName.split(" ")[0]);
      });

      return {
        raw: seg,
        matchedStudent: matched,
        status,
        confidence: matched && status !== "unmarked" ? "high" : matched ? "medium" : "unmatched",
      };
    });

    setParsedItems(results);
    setMessage(`Parsed ${results.length} item(s). Review each suggestion before confirming.`);
  };

  const handleApplyAttendance = async () => {
    const validMatches = parsedItems.filter((p) => p.matchedStudent && p.status !== "unmarked");
    if (validMatches.length === 0) {
      setMessage("No valid student + status matches to apply.");
      return;
    }

    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const entries = validMatches.map((p) => ({
      student_id: p.matchedStudent!.id,
      status: p.status,
    }));

    try {
      await saveAttendance({
        date: today,
        school_id: schoolId,
        entries,
      });
      setMessage(`✓ Successfully applied ${entries.length} attendance records from voice draft!`);
      setConfirmModal(false);
      setTimeout(() => onNavigate("attendance"), 1200);
    } catch (err: any) {
      setMessage("Error applying attendance: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{getTranslation(lang, "voiceEntry")}</h1>
        <p>Dictate daily attendance using speech recognition with human-in-the-loop review.</p>
      </div>

      {message && <div className="notice-box">{message}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        {/* Voice Input Card */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "16px" }}>Speech Input</h2>
            <select
              className="input"
              style={{ width: "auto", minHeight: "34px", padding: "4px 8px" }}
              value={speechLang}
              onChange={(e) => setSpeechLang(e.target.value as any)}
            >
              <option value="hi-IN">Hindi (हिन्दी)</option>
              <option value="en-IN">English (India)</option>
              <option value="gu-IN">Gujarati (ગુજરાતી)</option>
            </select>
          </div>

          <div
            style={{
              padding: "24px",
              background: "var(--blue-bg)",
              border: "2px dashed #93c5fd",
              borderRadius: "14px",
              textAlign: "center",
              marginBottom: "16px",
            }}
          >
            <button
              onClick={startListening}
              disabled={isListening}
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                background: isListening ? "var(--red)" : "var(--blue)",
                color: "white",
                fontSize: "26px",
                border: "none",
                boxShadow: isListening ? "0 0 0 8px rgba(220, 38, 38, 0.2)" : "0 0 0 8px rgba(37, 99, 235, 0.15)",
                transition: "all 0.2s ease",
              }}
            >
              {isListening ? "⏹" : "🎙️"}
            </button>
            <strong style={{ display: "block", marginTop: "12px", fontSize: "14px" }}>
              {isListening ? getTranslation(lang, "listening") : getTranslation(lang, "startVoice")}
            </strong>
            <small style={{ color: "var(--muted)", display: "block", marginTop: "4px", fontSize: "12px" }}>
              {supported
                ? "Click microphone and speak names with statuses (e.g., 'Aarav present, Diya absent')"
                : "Speech recognition unavailable in this browser. Type below to test parsing."}
            </small>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
              Editable Voice Transcript Draft
            </label>
            <textarea
              className="input"
              rows={4}
              placeholder="e.g. Aarav present, Diya present, Vivaan absent, Kabir leave"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button className="btn" onClick={handleParse}>
              🔍 Parse Draft
            </button>
            <button
              className="btn primary"
              disabled={parsedItems.length === 0}
              onClick={() => setConfirmModal(true)}
            >
              ✓ Review & Confirm ({parsedItems.filter((p) => p.matchedStudent && p.status !== "unmarked").length})
            </button>
          </div>
        </div>

        {/* Human-in-the-Loop Safeguard */}
        <div className="card">
          <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>Human-in-the-Loop Safeguard</h2>
          <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "14px" }}>
            Voice recognition is an assistive drafting tool. No record is saved until explicitly inspected and confirmed.
          </p>

          <div style={{ display: "grid", gap: "10px" }}>
            <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <span className="tag blue" style={{ marginBottom: "4px" }}>Step 1: Dictate</span>
              <div style={{ fontSize: "12.5px" }}>Browser captures audio and creates an editable transcript.</div>
            </div>

            <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <span className="tag amber" style={{ marginBottom: "4px" }}>Step 2: Match & Verify</span>
              <div style={{ fontSize: "12.5px" }}>The parser matches spoken words against your active enrolled roster.</div>
            </div>

            <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <span className="tag green" style={{ marginBottom: "4px" }}>Step 3: Explicit Confirmation</span>
              <div style={{ fontSize: "12.5px" }}>Uncertain matches or misheard names are flagged for manual correction.</div>
            </div>
          </div>

          <div className="notice-box" style={{ marginTop: "16px", marginBottom: "0", fontSize: "12px" }}>
            <b>Privacy notice:</b> Browser speech services process audio according to your browser vendor's speech policy. Avoid speaking personal or sensitive details.
          </div>
        </div>
      </div>

      {/* Parsed Suggestions Table */}
      {parsedItems.length > 0 && (
        <div className="card" style={{ marginTop: "16px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "12px" }}>Parsed Voice Suggestions</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Spoken Segment</th>
                  <th>Matched Enrolled Student</th>
                  <th>Extracted Status</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {parsedItems.map((item, idx) => (
                  <tr key={idx}>
                    <td><code>{item.raw}</code></td>
                    <td>
                      {item.matchedStudent ? (
                        <strong>{item.matchedStudent.name} ({item.matchedStudent.cls})</strong>
                      ) : (
                        <span style={{ color: "var(--red)", fontStyle: "italic" }}>No roster match found</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`tag ${
                          item.status === "present"
                            ? "green"
                            : item.status === "absent"
                            ? "red"
                            : item.status === "leave"
                            ? "amber"
                            : ""
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`tag ${item.confidence === "high" ? "green" : item.confidence === "medium" ? "amber" : "red"}`}>
                        {item.confidence.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>Confirm Voice Attendance</h2>
            <p style={{ fontSize: "13.5px", color: "var(--muted)", margin: "6px 0 14px" }}>
              You are about to apply the following verified voice suggestions to today's attendance:
            </p>

            <div className="table-wrap" style={{ maxHeight: "200px" }}>
              <table>
                <thead>
                  <tr><th>Student</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {parsedItems
                    .filter((p) => p.matchedStudent && p.status !== "unmarked")
                    .map((p, i) => (
                      <tr key={i}>
                        <td><b>{p.matchedStudent!.name}</b></td>
                        <td><span className="tag green">{p.status.toUpperCase()}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button className="btn" onClick={() => setConfirmModal(false)}>
                Cancel
              </button>
              <button
                className="btn primary"
                disabled={saving}
                onClick={handleApplyAttendance}
              >
                {saving ? "Applying..." : "Confirm & Save Attendance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
