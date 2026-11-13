# ShikshaFlow — Smart Automation of Non-Teaching Duties

> **SFIC Challenge:** Smart Automation of Non-Teaching and Administrative Duties to Maximize Classroom Instruction Time for Teachers.  
> **USP:** Teach-Time Reclaim™ — Enter data once, reuse across workflows, automate filings, reclaim classroom instruction time.

---

## 🚀 Quick Start Guide (Run in 2 Steps)

### Step 1: Start the Backend Server (FastAPI)

```powershell
cd backend
pip install -r requirements.txt
python main.py
```
Backend runs at: **http://127.0.0.1:8000**
- Primary Teacher & Management App: **http://127.0.0.1:8000/** (Serves compiled React app)
- Lightweight Admin Console: **http://127.0.0.1:8000/admin**
- Interactive Swagger API Docs: **http://127.0.0.1:8000/docs**

### Step 2: (Optional) Frontend Development Server (React + Vite)

If developing or modifying frontend components:
```powershell
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** (automatically connects to the FastAPI backend).

To rebuild the production distribution:
```powershell
cd frontend
npm run build
```

---

## 🔑 Demo Accounts (Pre-Seeded)

| Role | Username | Password | Jurisdiction & Access |
|---|---|---|---|
| **Teacher** | `teacher` | `teach123` | Assigned to *Pragati Primary School*. Daily roll call, MDM, Voice/OCR, Teach-Time Reclaim™. |
| **Headmaster** | `admin` | `admin123` | Pragati Primary School duty verification, school-level approvals, compliance monitoring. |
| **Education Officer** | `officer` | `officer123` | Block/District oversight: all schools' 7-day completion, missing filings, follow-up priorities. |
| **System Admin** | `admin` | `admin123` | Complete system access: user provisioning, school registration, audit log, backup/restore. |

---

## 🌟 Implemented Core Modules

### 1. Teacher Dashboard & Teach-Time Reclaim™ (Module A & H)
- **Live Statistics:** Active roster, Present today, Absent today, Leave today, and Attendance completion %.
- **Teach-Time Reclaim™ Meter:** Displays estimated hours and minutes reclaimed today, this week, and all-time.
- **Transparent Methodology:** 5 mins per roll call + 3 mins per MDM record + 10 mins per report. Deduplication prevents false inflation on re-saves.
- **Next Best Action Engine:** Proactively prompts teachers on what administrative duty is pending.
- **Pending Duties Checklist:** Interactive list of today's roll-call, meal log, and weekly reporting filings.

### 2. Student Roster & CSV Import (Module B)
- **Persistent Student Records:** Single source of truth across all modules.
- **Class / Section Assignment:** Search and filter by name or class (e.g. Class 3A, Class 2).
- **Safe Deactivation:** Soft-delete toggle keeps historical attendance records intact.
- **Individual Attendance History:** View any student's complete historical attendance log.
- **CSV Bulk Import:** Upload or paste student lists with instant preview and automatic duplicate detection.

### 3. Date-Wise Attendance Management (Module C)
- **Date Navigation:** Historical attendance loading and editing without overwriting other days.
- **Statuses Supported:** Present, Absent, On Leave, and Unmarked.
- **One-Click Quick Actions:** "Mark All Present" and individual status toggle buttons (P/A/L/Clear).
- **Incomplete Submission Safeguard:** Prompts a warning before submitting if unmarked students remain.
- **Idempotent Saves:** Re-submitting updates the existing record cleanly via database unique constraints.

### 4. Mid-Day Meal Management (Module D)
- **Daily Meal Entry Form:** Record meals served, daily menu, and kitchen remarks.
- **Period Summaries:** Instant Weekly (last 7d), Monthly, and All-Time summaries.
- **Accurate Averages:** Calculates true daily average over recorded days, excluding missing days.
- **Historical Records:** Complete date-wise meal log with delete and update capabilities.

### 5. AI Voice-Assisted Data Entry (Module E)
- **Multi-Lingual Dictation:** Web Speech API supporting Hindi (`hi-IN`), English (`en-IN`), and Gujarati (`gu-IN`).
- **Human-in-the-Loop Safeguard:** Live editable transcript draft with fuzzy student name and attendance status extraction.
- **Explicit Confirmation:** Displays preview table of high/medium/unmatched names before applying to student records.

### 6. OCR Document Processing (Module F)
- **Document / Photo Upload:** Validates file types (JPG, PNG, WEBP) and size limits (max 5MB).
- **OCR Text Extraction:** Extracts tabular student rosters, roll-call sheets, and meal receipts.
- **Editable Raw Text & Structured Preview:** Teachers verify and correct extracted rows before committing.

### 7. Smart Reports & Exports (Module G)
- **Report Types:** Unified Administrative Overview, Student Attendance Report, and Mid-Day Meal Summary.
- **Zero Duplicate Entry:** Formats existing database records into print-ready layouts.
- **Export Capabilities:** One-click Print / Save PDF via `@media print` stylesheets.
- **Formula Injection Protected CSV:** Automatically sanitizes cells starting with `=`, `+`, `-`, `@` to prevent spreadsheet exploits.

### 8. Headmaster & Education Officer Consoles (Module I & J)
- **Headmaster Portal:** School statistics, class attendance, teacher duty verification, and approval workflow.
- **Education Officer Portal:** District-level oversight table, 7-day reporting completion percentages, missing filings, and follow-up priority filters (`Action Needed` <75%, `Follow Up` 75-89%, `On Track` ≥90%).
- **Privacy Assurance:** Officers view school-level aggregate statistics without exposing sensitive student PII.

### 9. Settings, Backup & Regional Languages (Module K)
- **Multi-Language Interface:** Seamless UI toggling between English, Hindi (हिन्दी), and Gujarati (ગુજરાતી).
- **School Profile Management:** Update school name, district, and U-DISE code.
- **JSON Backup & Recovery:** Export operational backups (excluding credentials) and validated restoration.
- **Controlled Demo Reset:** One-click demo data reset button.

### 10. Practical Offline Capabilities (Module L)
- **Network Status Detection:** Instant visual feedback when working offline.
- **Offline Draft Queue:** Stores offline attendance and meal entries in client storage.
- **Automatic Sync:** Flushes and commits pending offline drafts to the server upon reconnection.

---

## 🔒 Security & Data Integrity

- **Password Hashing:** PBKDF2 HMAC SHA-256 with 200,000 iterations and 16-byte random salts.
- **Session Tokens:** 12-hour HS256 JWTs validated server-side.
- **Tenant Isolation:** Teachers and Headmasters are strictly locked to their assigned `school_id`.
- **Database Constraints:** Multi-column unique constraints (`uq_att`, `uq_meal`) eliminate duplicate filings.
- **Audit Logging:** Every login, create, update, and delete operation is permanently logged.
- **CORS Configuration:** Configurable origins via `ALLOWED_ORIGINS` environment variable.

---

## 🧪 Running Automated Tests

Run backend integration smoke tests (38 checks):
```powershell
cd backend
python smoke_test.py
```

Run pure logic tests (date math, deduplication, Teach-Time calculations):
```powershell
node test-logic.mjs
```

---

## 🛣️ Production Deployment Roadmap

1. **Database Migration:** Transition SQLite (`shikshaflow.db`) to PostgreSQL with managed connection pooling.
2. **State & District Portals:** Integrate national U-DISE+ / state portal APIs for two-way synchronization.
3. **PWA & Offline Service Worker:** Register service workers with CacheStorage for zero-network rural primary schools.
4. **Hardware-Accelerated OCR:** Deploy server-side PaddleOCR/Tesseract container for skewed handwritten registers.
5. **TLS & Row-Level Security:** Enforce HTTPS, strict cookie sessions, and PostgreSQL Row-Level Security policies.
