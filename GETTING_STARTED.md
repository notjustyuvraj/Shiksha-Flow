# ShikshaFlow — Getting Started

This guide explains how to run ShikshaFlow locally on your computer. The commands below use **Windows PowerShell**, including the integrated terminal in Visual Studio Code.

> **Demo-data notice:** Use fictional student information only. The demo accounts are for local evaluation and must not be used as production credentials.

## 1. What you need

Install these tools before starting:

- **Python 3** and `pip`
- **Node.js** and `npm`
- **Git** (only if you are cloning the repository)
- **Visual Studio Code** (recommended, but not required)

Check that Python, Node.js and npm are available by opening a terminal and running:

```powershell
python --version
node --version
npm --version
```

If `python` is not recognised on Windows, try `py --version` and use `py` instead of `python` in the commands below.

## 2. Get the project

If you have not downloaded the project yet, clone your repository:

```powershell
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_FOLDER>
```

Replace the placeholders with your Git repository URL and the folder created by Git. If you already have the project on your computer, open its root folder in VS Code instead.

The project root should contain at least these folders/files:

```text
shiksha-web/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   └── package.json
├── README.md
└── test-logic.mjs
```

Your local project may contain additional files and folders.

## 3. Start the backend (Terminal 1)

In VS Code, open **Terminal → New Terminal**. Make sure the terminal is at the project root, then run:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python main.py
```

Keep this terminal open while you use the application.

The backend should start at:

- Application/API server: <http://127.0.0.1:8000>
- Interactive API documentation: <http://127.0.0.1:8000/docs>
- Lightweight admin console: <http://127.0.0.1:8000/admin>

The root application URL serves the compiled frontend when a production frontend build is available.

### If PowerShell blocks virtual-environment activation

Run this in the same terminal, then activate the environment again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

This changes the execution policy only for the current PowerShell process.

## 4. Start the frontend (Terminal 2)

Open a **second terminal** in VS Code. It should start at the project root. Then run:

```powershell
cd frontend
npm install
npm run dev
```

When Vite starts, open the local URL printed in the terminal. The default address in the project setup is:

<http://localhost:5173>

Keep both terminals running while using the development version of ShikshaFlow:

- Terminal 1 runs the FastAPI backend.
- Terminal 2 runs the React/Vite frontend.

## 5. Sign in with a demo account

The project README lists these seeded demo credentials:

| Role | Username | Password |
|---|---|---|
| Teacher | `teacher` | `teach123` |
| Education Officer | `officer` | `officer123` |
| Headmaster / System Admin | `admin` | `admin123` |

**Account note:** The project README lists the same `admin` credentials for both Headmaster and System Admin. The actual role assigned to that username is determined by the seed data in your checked-out version. If you need to verify or change demo roles, inspect the backend seed/user configuration; do not assume one username represents two separate accounts.

For the main teacher workflow demonstration, start with the **Teacher** account.

## 6. Build the frontend for serving through FastAPI (optional)

For a production-style local build, run these commands from the project root:

```powershell
cd frontend
npm install
npm run build
```

Then start the backend as described in Step 3. The backend's root URL is documented as serving the compiled React application:

<http://127.0.0.1:8000>

Use the Vite development URL (`http://localhost:5173`) while actively developing the frontend.

## 7. Run the tests

### Backend integration smoke tests

Open a terminal and run:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python smoke_test.py
```

### Frontend-independent logic tests

From the project root, run:

```powershell
node test-logic.mjs
```

Check the output of each test command. Do not assume the application is fully verified just because the development servers start successfully.

## 8. Stop the application

In each terminal running the backend or frontend, press:

```text
Ctrl + C
```

## 9. Common problems

### `python` is not recognised

Try the Windows Python launcher:

```powershell
py --version
py -m venv .venv
```

If that works, use `py` instead of `python` for the remaining Python commands.

### `npm` or `node` is not recognised

Install Node.js, close and reopen VS Code, then check again:

```powershell
node --version
npm --version
```

### PowerShell says scripts are disabled

Run the process-scoped command in Step 3:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then activate the virtual environment again.

### Port 8000 is already in use

Another process may already be using the backend port. Stop that process or close the other application, then run `python main.py` again.

### The frontend cannot reach the backend

1. Check that the backend terminal is still running.
2. Open <http://127.0.0.1:8000/docs> to confirm the API server responds.
3. Check the browser developer console for the exact network or CORS error.
4. Verify the frontend's API base URL and the backend's allowed-origin configuration for your local setup.

### A package installation fails

Read the first error reported by `pip` or `npm`, confirm that Python/Node.js are available, and retry the relevant install command. Do not delete lock files or project configuration as a first troubleshooting step.

## 10. Important project limitations

- Demo credentials are public examples, not secure production accounts. Change or remove them before deployment.
- Use fictional student data in local demonstrations.
- A local SQLite database is suitable for development/demo use but is not, by itself, a production backup or multi-instance database strategy.
- Government portal connectivity must not be assumed unless an authorised integration has actually been configured and tested.
- Browser speech recognition and OCR behaviour may depend on browser support and the configured implementation.

For feature details, architecture notes and the production roadmap, see the main [`README.md`](README.md).

---

**Need help?** Open an issue in the repository and include your operating system, the command you ran, and the complete error message. Never include passwords, secret keys, access tokens or real student information in an issue.
