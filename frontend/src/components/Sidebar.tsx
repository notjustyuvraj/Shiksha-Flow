import React from "react";
import { useAuth } from "../lib/auth";
import type { Language } from "../lib/types";
import { getTranslation } from "../lib/i18n";

interface SidebarProps {
  currentPage: string;
  onSelectPage: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  isOpen,
  onClose,
  lang,
}) => {
  const { user } = useAuth();
  const role = user?.role || "teacher";

  const navItems = [
    {
      id: "dashboard",
      label: getTranslation(lang, "dashboard"),
      icon: "📊",
      roles: ["teacher", "headmaster", "admin", "officer"],
    },
    {
      id: "attendance",
      label: getTranslation(lang, "attendance"),
      icon: "✓",
      roles: ["teacher", "headmaster", "admin"],
    },
    {
      id: "meals",
      label: getTranslation(lang, "meals"),
      icon: "♨",
      roles: ["teacher", "headmaster", "admin"],
    },
    {
      id: "students",
      label: getTranslation(lang, "students"),
      icon: "👨‍🎓",
      roles: ["teacher", "headmaster", "admin"],
    },
    {
      id: "reports",
      label: getTranslation(lang, "reports"),
      icon: "📄",
      roles: ["teacher", "headmaster", "officer", "admin"],
    },
    {
      id: "voice",
      label: getTranslation(lang, "voiceEntry"),
      icon: "🎙️",
      roles: ["teacher", "headmaster", "admin"],
    },
    {
      id: "ocr",
      label: getTranslation(lang, "ocrScanner"),
      icon: "📷",
      roles: ["teacher", "headmaster", "admin"],
    },
    {
      id: "officer",
      label: getTranslation(lang, "officer"),
      icon: "🏛️",
      roles: ["officer", "headmaster", "admin"],
    },
    {
      id: "settings",
      label: getTranslation(lang, "settings"),
      icon: "⚙️",
      roles: ["teacher", "headmaster", "officer", "admin"],
    },
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="brand">
        <div className="logo-badge">S</div>
        <div className="brand-text">
          <strong>{getTranslation(lang, "appName")}</strong>
          <small>{getTranslation(lang, "tagline")}</small>
        </div>
      </div>

      <nav className="nav-group">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? "active" : ""}`}
            onClick={() => {
              onSelectPage(item.id);
              onClose();
            }}
          >
            <span style={{ fontSize: "16px" }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div
        style={{
          marginTop: "auto",
          paddingTop: "14px",
          borderTop: "1px solid var(--line)",
          fontSize: "11.5px",
          color: "var(--muted)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <span className="tag green" style={{ width: "fit-content", fontSize: "10px" }}>
          SFIC Challenge MVP
        </span>
        <div>Smart Automation of Duties</div>
        <div>v1.1.0 · Single Source Roster</div>
      </div>
    </aside>
  );
};
