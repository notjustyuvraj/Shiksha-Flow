import React, { useEffect, useState } from "react";
import { deleteMeal, getMeals, getMealSummary, saveMeal } from "../lib/api";
import { saveOfflineMealDraft } from "../lib/offline";
import { useAuth } from "../lib/auth";
import type { Language, Meal, MealSummary } from "../lib/types";
import { getTranslation } from "../lib/i18n";

interface MidDayMealProps {
  lang: Language;
}

export const MidDayMeal: React.FC<MidDayMealProps> = ({ lang }) => {
  const { user } = useAuth();
  const schoolId = user?.school_id || undefined;

  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [qty, setQty] = useState<number | "">("");
  const [menu, setMenu] = useState("Khichdi, Dal & Vegetables");
  const [notes, setNotes] = useState("");

  const [meals, setMeals] = useState<Meal[]>([]);
  const [summary, setSummary] = useState<MealSummary | null>(null);
  const [period, setPeriod] = useState("week");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getMeals(schoolId),
      getMealSummary(period, schoolId),
    ])
      .then(([mealRes, sumRes]) => {
        setMeals(mealRes);
        setSummary(sumRes);
      })
      .catch((err) => setMessage("Error: " + err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [schoolId, period]);

  // When date changes, prefill if already recorded
  useEffect(() => {
    const existing = meals.find((m) => m.date === date);
    if (existing) {
      setQty(existing.qty);
      setMenu(existing.menu || "");
      setNotes(existing.notes || "");
    }
  }, [date, meals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qty === "" || Number(qty) < 0) {
      setMessage("Please enter a valid whole-number meal quantity ≥ 0.");
      return;
    }

    setSaving(true);
    if (!navigator.onLine) {
      saveOfflineMealDraft(date, Number(qty), menu.trim(), notes.trim(), schoolId);
      setSaving(false);
      setMessage("Saved as offline draft. Will sync automatically when network returns.");
      return;
    }

    try {
      await saveMeal({
        date,
        qty: Number(qty),
        menu: menu.trim(),
        notes: notes.trim(),
        school_id: schoolId,
      });
      setMessage("✓ Mid-Day Meal record saved successfully! (+3 min Teach-Time Reclaimed).");
      loadData();
    } catch (err: any) {
      setMessage("Error saving meal record: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this meal record?")) return;
    try {
      await deleteMeal(id);
      setMessage("Meal record deleted.");
      loadData();
    } catch (err: any) {
      setMessage("Error deleting: " + err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{getTranslation(lang, "meals")}</h1>
        <p>Capture daily meal counts and generate period summaries for compliance.</p>
      </div>

      {message && (
        <div className="notice-box" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{message}</span>
          <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Main Grid: Entry Form + Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginBottom: "18px" }}>
        {/* Entry Form */}
        <div className="card">
          <h2 style={{ fontSize: "16px", marginBottom: "14px" }}>
            Daily Meal Entry Form
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Date *</label>
                <input
                  type="date"
                  className="input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  {getTranslation(lang, "mealsServed")} *
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 128"
                  min="0"
                  value={qty}
                  onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  {getTranslation(lang, "menu")}
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Khichdi, Dal, Veggies"
                  value={menu}
                  onChange={(e) => setMenu(e.target.value)}
                  maxLength={120}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  {getTranslation(lang, "notes")} (optional)
                </label>
                <textarea
                  className="input"
                  placeholder="Quality check remarks, vendor notes, or inspections"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={255}
                />
              </div>

              <button type="submit" className="btn primary" disabled={saving} style={{ marginTop: "6px" }}>
                {saving ? "Saving..." : `✓ ${getTranslation(lang, "saveMealRecord")}`}
              </button>
            </div>
          </form>
        </div>

        {/* Period Summary Card */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "16px" }}>Period Summary</h2>
            <select
              className="input"
              style={{ width: "auto", minHeight: "34px", padding: "4px 8px" }}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="all">All Records</option>
            </select>
          </div>

          {summary ? (
            <div className="grid stats-grid" style={{ marginBottom: "0" }}>
              <div className="stat-card" style={{ padding: "12px" }}>
                <div className="stat-label">Days Recorded</div>
                <div className="stat-val" style={{ fontSize: "22px" }}>{summary.total_records}</div>
              </div>

              <div className="stat-card" style={{ padding: "12px" }}>
                <div className="stat-label">Total Meals</div>
                <div className="stat-val" style={{ fontSize: "22px", color: "var(--blue)" }}>
                  {summary.total_meals.toLocaleString("en-IN")}
                </div>
              </div>

              <div className="stat-card" style={{ padding: "12px" }}>
                <div className="stat-label">Daily Average</div>
                <div className="stat-val" style={{ fontSize: "22px" }}>{summary.daily_avg}</div>
                <small style={{ color: "var(--muted)", fontSize: "10.5px" }}>Per recorded day</small>
              </div>

              <div className="stat-card" style={{ padding: "12px" }}>
                <div className="stat-label">Missing Days</div>
                <div className="stat-val" style={{ fontSize: "22px", color: summary.missing_days > 0 ? "var(--amber)" : "var(--green)" }}>
                  {summary.missing_days}
                </div>
              </div>
            </div>
          ) : (
            <div>Loading summary…</div>
          )}

          <div className="notice-box" style={{ marginTop: "16px", marginBottom: "0", fontSize: "12px" }}>
            Unrecorded days are excluded from average calculations so missing filings do not skew meal metrics.
          </div>
        </div>
      </div>

      {/* Historical Records Table */}
      <div className="card">
        <h2 style={{ fontSize: "16px", marginBottom: "12px" }}>Saved Mid-Day Meal Records</h2>
        {loading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>Loading records…</div>
        ) : meals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "35px", color: "var(--muted)" }}>No meal records saved yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Meals Served</th>
                  <th>Menu</th>
                  <th>Notes</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {meals.map((m) => (
                  <tr key={m.id}>
                    <td><b>{m.date}</b></td>
                    <td><strong style={{ color: "var(--blue)" }}>{m.qty.toLocaleString("en-IN")}</strong></td>
                    <td>{m.menu || "—"}</td>
                    <td style={{ color: "var(--muted)" }}>{m.notes || "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn small danger"
                        onClick={() => handleDelete(m.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
