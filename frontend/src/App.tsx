import React, { useState } from "react";
import { useAuth } from "./lib/auth";
import type { Language } from "./lib/types";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { Login } from "./pages/Login";
import { TeacherDashboard } from "./pages/TeacherDashboard";
import { HeadmasterDashboard } from "./pages/HeadmasterDashboard";
import { OfficerDashboard } from "./pages/OfficerDashboard";
import { Attendance } from "./pages/Attendance";
import { MidDayMeal } from "./pages/MidDayMeal";
import { Students } from "./pages/Students";
import { SmartReports } from "./pages/SmartReports";
import { VoiceEntry } from "./pages/VoiceEntry";
import { OCRScanner } from "./pages/OCRScanner";
import { Settings } from "./pages/Settings";
import { getTranslation } from "./lib/i18n";

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem("sf_lang") as Language) || "en";
  });

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("sf_lang", newLang);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "var(--muted)" }}>
          <div className="logo-badge" style={{ margin: "0 auto 12px" }}>S</div>
          <div>Loading ShikshaFlow…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        if (user.role === "headmaster") {
          return <HeadmasterDashboard lang={lang} onNavigate={setCurrentPage} />;
        }
        if (user.role === "officer") {
          return <OfficerDashboard lang={lang} />;
        }
        return <TeacherDashboard lang={lang} onNavigate={setCurrentPage} />;
      case "attendance":
        return <Attendance lang={lang} />;
      case "meals":
        return <MidDayMeal lang={lang} />;
      case "students":
        return <Students lang={lang} />;
      case "reports":
        return <SmartReports lang={lang} />;
      case "voice":
        return <VoiceEntry lang={lang} onNavigate={setCurrentPage} />;
      case "ocr":
        return <OCRScanner lang={lang} onNavigate={setCurrentPage} />;
      case "officer":
        return <OfficerDashboard lang={lang} />;
      case "settings":
        return <Settings lang={lang} onLanguageChange={handleLanguageChange} />;
      default:
        return <TeacherDashboard lang={lang} onNavigate={setCurrentPage} />;
    }
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case "dashboard": return getTranslation(lang, "dashboard");
      case "attendance": return getTranslation(lang, "attendance");
      case "meals": return getTranslation(lang, "meals");
      case "students": return getTranslation(lang, "students");
      case "reports": return getTranslation(lang, "reports");
      case "voice": return getTranslation(lang, "voiceEntry");
      case "ocr": return getTranslation(lang, "ocrScanner");
      case "officer": return getTranslation(lang, "officer");
      case "settings": return getTranslation(lang, "settings");
      default: return getTranslation(lang, "dashboard");
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        lang={lang}
      />

      <div className="main-content">
        <Navbar
          pageTitle={getPageTitle()}
          lang={lang}
          onLanguageChange={handleLanguageChange}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="page-container">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};
