"""In-process integration smoke test for the ShikshaFlow API."""
import os
import sys
from datetime import date as _date

# Start from a clean database so the seed runs deterministically.
BASE = os.path.dirname(os.path.abspath(__file__))
for f in ("shikshaflow.db", ".secret"):
    p = os.path.join(BASE, f)
    if os.path.exists(p):
        os.remove(p)

from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)
fails = 0


def check(name, cond):
    global fails
    print(("PASS" if cond else "FAIL") + " · " + name)
    if not cond:
        fails += 1


def auth(tok):
    return {"Authorization": "Bearer " + tok}


# Health
check("health ok", c.get("/api/health").json().get("status") == "ok")

# Admin login
r = c.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
check("admin login 200", r.status_code == 200)
admin_tok = r.json()["access_token"]
check("admin role", r.json()["user"]["role"] == "admin")

# Wrong password rejected
check("bad password 401", c.post("/api/auth/login", json={"username": "admin", "password": "x"}).status_code == 401)

# No token rejected
check("no token 401", c.get("/api/admin/stats").status_code == 401)

# Admin stats
stats = c.get("/api/admin/stats", headers=auth(admin_tok)).json()
check("seeded 3 schools", stats["schools"] == 3)
check("seeded users", stats["users"] == 3)
check("seeded 8 students", stats["students"] == 8)

# Create a new school (admin)
r = c.post("/api/schools", headers=auth(admin_tok), json={"name": "Test School", "district": "Ahmedabad", "code": "T1"})
check("create school 201", r.status_code == 201)
new_school_id = r.json()["id"]

# Create a teacher for that school
r = c.post("/api/admin/users", headers=auth(admin_tok),
           json={"username": "t_new", "password": "pass123", "full_name": "New Teacher", "role": "teacher", "school_id": new_school_id})
check("create teacher 201", r.status_code == 201)

# Duplicate username rejected
check("duplicate user 409", c.post("/api/admin/users", headers=auth(admin_tok),
      json={"username": "t_new", "password": "pass123", "role": "teacher", "school_id": new_school_id}).status_code == 409)

# Teacher login
r = c.post("/api/auth/login", json={"username": "t_new", "password": "pass123"})
check("teacher login 200", r.status_code == 200)
t_tok = r.json()["access_token"]

# Teacher cannot access admin stats (403)
check("teacher blocked from admin 403", c.get("/api/admin/stats", headers=auth(t_tok)).status_code == 403)

# Teacher adds students (school auto-scoped; school_id ignored/forced)
for nm in ["Test One", "Test Two", "Test Three"]:
    c.post("/api/students", headers=auth(t_tok), json={"name": nm, "cls": "Class 1"})
studs = c.get("/api/students", headers=auth(t_tok)).json()
check("teacher sees 3 own students", len(studs) == 3)
sid_list = [s["id"] for s in studs]

# Edit student details
r_edit = c.put(f"/api/students/{sid_list[0]}", headers=auth(t_tok), json={"name": "Test One Renamed", "cls": "Class 1B"})
check("edit student 200", r_edit.status_code == 200 and r_edit.json()["name"] == "Test One Renamed")

# Safe deactivation of student
r_deact = c.delete(f"/api/students/{sid_list[2]}", headers=auth(t_tok))
check("soft deactivate student", r_deact.status_code == 200 and r_deact.json()["status"] == "deactivated")
studs_active = c.get("/api/students", headers=auth(t_tok)).json()
check("active students count is 2", len(studs_active) == 2)

# Reactivate student
c.delete(f"/api/students/{sid_list[2]}", headers=auth(t_tok))

# Save attendance for a date with leave status
r = c.post("/api/attendance", headers=auth(t_tok), json={
    "date": "2026-10-30",
    "entries": [{"student_id": sid_list[0], "status": "present"},
                {"student_id": sid_list[1], "status": "absent"},
                {"student_id": sid_list[2], "status": "leave"}]})
check("save attendance 200", r.status_code == 200)
check("counts 1 present 1 absent 1 leave", r.json()["counts"] == {
    "total": 3, "present": 1, "absent": 1, "leave": 1, "pending": 0, "marked": 3, "completion_pct": 100
})

# Re-save same date overwrites (no duplicate rows)
c.post("/api/attendance", headers=auth(t_tok), json={
    "date": "2026-10-30",
    "entries": [{"student_id": sid_list[0], "status": "present"}]})
got = c.get("/api/attendance?date=2026-10-30", headers=auth(t_tok)).json()
check("re-save overwrote (1 marked)", got["counts"]["present"] == 1 and got["counts"]["absent"] == 0)

# Second date is independent
c.post("/api/attendance", headers=auth(t_tok), json={
    "date": "2026-10-31", "entries": [{"student_id": sid_list[0], "status": "absent"}]})
d31 = c.get("/api/attendance?date=2026-10-31", headers=auth(t_tok)).json()
check("date-wise independence", d31["counts"]["absent"] == 1)

# Student attendance history
hist = c.get(f"/api/students/{sid_list[0]}/attendance", headers=auth(t_tok)).json()
check("student attendance history retrieved", len(hist) == 2)

# Range summary returns both days
rng = c.get("/api/attendance/range?start=2026-10-01&end=2026-10-31", headers=auth(t_tok)).json()
check("range returns 2 days", len(rng["days"]) == 2)

# Meals: save + overwrite + list
today_str = _date.today().isoformat()
c.post("/api/meals", headers=auth(t_tok), json={"date": today_str, "qty": 100, "menu": "Khichdi"})
c.post("/api/meals", headers=auth(t_tok), json={"date": today_str, "qty": 150, "menu": "Dal rice"})
meals = c.get("/api/meals", headers=auth(t_tok)).json()
check("meal dedup by date (1 record, qty 150)", len(meals) == 1 and meals[0]["qty"] == 150)

# Meal summary
msum = c.get("/api/meals/summary?period=week", headers=auth(t_tok)).json()
check("meal summary week has records", msum["total_meals"] == 150)

# Teacher summary endpoint (NEW - fixes HTTP 403 on teacher dashboard)
tsum = c.get("/api/teacher/summary", headers=auth(t_tok)).json()
check("teacher summary 200 ok", tsum["school_id"] == new_school_id)
check("teach-time stats present", "minutes_all_time" in tsum["teach_time"])
check("next best action present", len(tsum["next_best_action"]) > 0)

# Reports
rep = c.get(f"/api/reports?type=combined&start=2026-10-01&end={today_str}", headers=auth(t_tok)).json()
check("report has attendance days", len(rep["attendance"]) == 2)
check("report has 1 meal", len(rep["meals"]) == 1)

# Officer summary (admin)
summ = c.get("/api/officer/summary", headers=auth(admin_tok)).json()
check("officer summary lists all schools", len(summ["schools"]) == 4)

# Teacher cannot see officer summary (role not allowed)
check("teacher blocked from officer 403", c.get("/api/officer/summary", headers=auth(t_tok)).status_code == 403)

# Isolation: teacher cannot query another school's students
check("teacher school isolation", c.get("/api/students?school_id=1", headers=auth(t_tok)).json() and
      all(s["school_id"] == new_school_id for s in c.get("/api/students?school_id=1", headers=auth(t_tok)).json()))

# Bulk CSV Import
imp_res = c.post("/api/students/import", headers=auth(t_tok), json={
    "students": [
        {"name": "Bulk Student 1", "cls": "Class 2"},
        {"name": "Bulk Student 2", "cls": "Class 2"},
        {"name": "Bulk Student 1", "cls": "Class 2"}  # Duplicate in batch
    ]
}).json()
check("bulk import filtered duplicate", imp_res["imported"] == 2 and imp_res["skipped"] == 1)

# Backup & Restore
bk = c.get("/api/admin/backup", headers=auth(admin_tok)).json()
check("backup exported schools and students", len(bk["schools"]) >= 4 and len(bk["students"]) >= 8)

# Audit log recorded actions
audit = c.get("/api/admin/audit", headers=auth(admin_tok)).json()
check("audit log has entries", len(audit) > 5)

# Frontend served at / and Admin panel at /admin
check("react frontend served at /", c.get("/").status_code == 200 and "ShikshaFlow" in c.get("/").text)
check("admin panel served at /admin", c.get("/admin").status_code == 200 and "ShikshaFlow" in c.get("/admin").text)

print("\n" + ("ALL BACKEND TESTS PASSED" if fails == 0 else f"{fails} TEST(S) FAILED"))
sys.exit(1 if fails else 0)
