import React, { useState } from "react";
import { useAuth } from "../lib/auth";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("teacher");
  const [password, setPassword] = useState("teach123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "20px",
        background: "var(--bg)",
      }}
    >
      <div className="card" style={{ maxWidth: "420px", width: "100%", padding: "30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div className="logo-badge">S</div>
          <div>
            <h1 style={{ fontSize: "20px", margin: 0 }}>ShikshaFlow</h1>
            <small style={{ color: "var(--muted)" }}>Teach-Time Reclaim™</small>
          </div>
        </div>

        <p style={{ color: "var(--muted)", fontSize: "13.5px", marginBottom: "18px" }}>
          Sign in to access school administration, roll calls, and mid-day meal records.
        </p>

        {error && <div className="notice-box" style={{ background: "var(--red-bg)", color: "var(--red)", borderColor: "#fecdd3" }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Username</label>
              <input
                type="text"
                className="input"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Password</label>
              <input
                type="password"
                className="input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn primary" disabled={loading} style={{ height: "42px", marginTop: "4px" }}>
              {loading ? "Signing in..." : "Sign in to Dashboard →"}
            </button>
          </div>
        </form>

        <div style={{ marginTop: "22px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", marginBottom: "8px" }}>
            ONE-CLICK DEMO ACCOUNTS:
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn small"
              onClick={() => setDemoAccount("teacher", "teach123")}
            >
              👩‍🏫 Teacher
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => setDemoAccount("officer", "officer123")}
            >
              🏛️ Officer
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => setDemoAccount("admin", "admin123")}
            >
              ⚙️ Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
