import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { flushOfflineQueue, getOfflineQueue } from "../lib/offline";
import type { Language } from "../lib/types";
import { getTranslation } from "../lib/i18n";

interface NavbarProps {
  pageTitle: string;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  pageTitle,
  lang,
  onLanguageChange,
  onToggleSidebar,
}) => {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(getOfflineQueue().length);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);
    const handleQueueChange = () => setOfflineCount(getOfflineQueue().length);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("sf_offline_change", handleQueueChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("sf_offline_change", handleQueueChange);
    };
  }, []);

  const handleSync = async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    await flushOfflineQueue();
    setSyncing(false);
    setOfflineCount(getOfflineQueue().length);
  };

  return (
    <header className="top-bar">
      <div className="top-left">
        <button
          className="mobile-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          ☰
        </button>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <strong style={{ fontSize: "16px", letterSpacing: "-0.2px" }}>
            {pageTitle}
          </strong>
          <small style={{ color: "var(--muted)", fontSize: "11px" }}>
            SFIC · Teach-Time Reclaim™
          </small>
        </div>
      </div>

      <div className="top-right">
        {/* Offline / Online Sync Indicator */}
        {!isOnline ? (
          <span className="tag red" title="No network connectivity">
            ● Offline ({offlineCount} queued)
          </span>
        ) : offlineCount > 0 ? (
          <button
            className="btn small"
            onClick={handleSync}
            disabled={syncing}
            style={{ fontSize: "11.5px", background: "var(--amber-bg)", color: "var(--amber)" }}
          >
            {syncing ? "Syncing..." : `⟳ Sync ${offlineCount} draft(s)`}
          </button>
        ) : (
          <span className="tag green" title="All changes saved to server">
            ● Online
          </span>
        )}

        {/* Language Switcher */}
        <select
          value={lang}
          onChange={(e) => onLanguageChange(e.target.value as Language)}
          style={{
            fontSize: "12px",
            padding: "4px 8px",
            minHeight: "32px",
            width: "auto",
            borderRadius: "8px",
          }}
          aria-label="Select Language"
        >
          <option value="en">English</option>
          <option value="hi">हिन्दी</option>
          <option value="gu">ગુજરાતી</option>
        </select>

        {/* User Pill */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              className="tag blue"
              style={{ textTransform: "capitalize" }}
            >
              {user.role}
            </span>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#334155",
                maxWidth: "130px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.full_name || user.username}
            </span>
            <button
              className="btn small"
              onClick={logout}
              style={{ padding: "4px 9px", fontSize: "12px" }}
            >
              {getTranslation(lang, "signOut")}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
