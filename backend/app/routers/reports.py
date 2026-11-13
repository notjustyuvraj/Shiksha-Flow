"""Report, teacher summary, and officer summary endpoints."""
from datetime import date as _date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Attendance, Meal, Student, School, User, AuditLog
from ..schemas import TeacherDashboardOut, TeachTimeStats, PendingTask, AuditOut
from ..deps import get_current_user, resolve_school_id, require_roles

report_router = APIRouter(prefix="/api/reports", tags=["reports"])
officer_router = APIRouter(prefix="/api/officer", tags=["officer"])
teacher_router = APIRouter(prefix="/api/teacher", tags=["teacher"])

MIN_PER_ATTENDANCE_DAY = 5
MIN_PER_MEAL_DAY = 3


@teacher_router.get("/summary", response_model=TeacherDashboardOut)
def teacher_summary(
    school_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sid = resolve_school_id(user, school_id)
    school = db.get(School, sid)
    school_name = school.name if school else "Primary School"
    today_str = _date.today().isoformat()

    # Active students in this school
    active_students = db.query(Student).filter(
        Student.school_id == sid, Student.is_active == 1
    ).all()
    total_students = len(active_students)
    valid_ids = {s.id for s in active_students}

    # Today's attendance
    att_today_rows = db.query(Attendance).filter(
        Attendance.school_id == sid, Attendance.date == today_str
    ).all()

    present_today = sum(1 for r in att_today_rows if r.student_id in valid_ids and r.status == "present")
    absent_today = sum(1 for r in att_today_rows if r.student_id in valid_ids and r.status == "absent")
    leave_today = sum(1 for r in att_today_rows if r.student_id in valid_ids and r.status == "leave")
    marked_count = present_today + absent_today + leave_today
    unmarked_today = max(0, total_students - marked_count)
    attendance_marked = len(att_today_rows) > 0
    attendance_pct = round((marked_count / total_students) * 100) if total_students > 0 else 0

    # Today's meal
    meal_today = db.query(Meal).filter(
        Meal.school_id == sid, Meal.date == today_str
    ).first()
    meal_marked = meal_today is not None
    meal_qty = meal_today.qty if meal_today else 0

    # Pending tasks
    pending_tasks = [
        PendingTask(
            id="attendance",
            title="Mark Morning Attendance",
            desc=f"{unmarked_today} student(s) unmarked" if unmarked_today > 0 else "All students marked",
            action_tab="attendance",
            completed=attendance_marked and unmarked_today == 0
        ),
        PendingTask(
            id="meal",
            title="Submit Mid-Day Meal Count",
            desc=f"{meal_qty} meals logged" if meal_marked else "Daily meal count pending",
            action_tab="meals",
            completed=meal_marked
        ),
        PendingTask(
            id="report",
            title="Review Weekly Summary Report",
            desc="Ready for preview or print",
            action_tab="reports",
            completed=attendance_marked and meal_marked
        )
    ]

    # Teach-Time Reclaim calculations
    # Distinct dates with attendance
    all_att_dates = db.query(Attendance.date).filter(
        Attendance.school_id == sid
    ).distinct().all()
    att_days_count = len(all_att_dates)

    all_meal_dates = db.query(Meal.date).filter(
        Meal.school_id == sid
    ).distinct().all()
    meal_days_count = len(all_meal_dates)

    # Today's reclaimed minutes
    mins_today = (MIN_PER_ATTENDANCE_DAY if attendance_marked else 0) + (MIN_PER_MEAL_DAY if meal_marked else 0)

    # Week's reclaimed minutes (last 7 days)
    today_date = _date.today()
    week_window = [(today_date - timedelta(days=i)).isoformat() for i in range(7)]
    week_att = db.query(Attendance.date).filter(
        Attendance.school_id == sid, Attendance.date.in_(week_window)
    ).distinct().count()
    week_meals = db.query(Meal.date).filter(
        Meal.school_id == sid, Meal.date.in_(week_window)
    ).distinct().count()
    mins_week = (week_att * MIN_PER_ATTENDANCE_DAY) + (week_meals * MIN_PER_MEAL_DAY)

    # All-time reclaimed minutes
    mins_all = (att_days_count * MIN_PER_ATTENDANCE_DAY) + (meal_days_count * MIN_PER_MEAL_DAY)

    teach_stats = TeachTimeStats(
        minutes_today=mins_today,
        minutes_this_week=mins_week,
        minutes_all_time=mins_all,
        attendance_days=att_days_count,
        meal_days=meal_days_count
    )

    # Next Best Action
    if not attendance_marked:
        next_action = "Mark today's morning roll call for your active roster."
    elif unmarked_today > 0:
        next_action = f"Complete attendance: {unmarked_today} student(s) still unmarked."
    elif not meal_marked:
        next_action = "Record Mid-Day Meals served today to complete daily compliance."
    else:
        next_action = "All daily duties done! Reclaimed instruction time for teaching."

    # Recent activity
    audit_rows = db.query(AuditLog).filter(
        AuditLog.school_id == sid
    ).order_by(AuditLog.id.desc()).limit(6).all()
    recent = [AuditOut.from_row(r) for r in audit_rows]

    return TeacherDashboardOut(
        today=today_str,
        school_id=sid,
        school_name=school_name,
        total_students=total_students,
        present_today=present_today,
        absent_today=absent_today,
        leave_today=leave_today,
        unmarked_today=unmarked_today,
        attendance_marked=attendance_marked,
        attendance_completion_pct=attendance_pct,
        meal_marked=meal_marked,
        meal_today_qty=meal_qty,
        pending_tasks=pending_tasks,
        recent_activity=recent,
        teach_time=teach_stats,
        next_best_action=next_action
    )


@report_router.get("")
def report(
    type: str = "combined",
    start: str = "",
    end: str = "",
    school_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sid = resolve_school_id(user, school_id)
    school = db.get(School, sid)
    school_name = school.name if school else "School"
    if start and end and start > end:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "start must be on or before end")

    att_days, meals = [], []
    total_students = db.query(Student).filter(
        Student.school_id == sid, Student.is_active == 1
    ).count()

    if type != "meals":
        rows = db.query(Attendance).filter(
            Attendance.school_id == sid,
            Attendance.date >= start,
            Attendance.date <= end
        ).all()
        by_date: dict[str, dict] = {}
        for r in rows:
            d = by_date.setdefault(r.date, {
                "date": r.date, "present": 0, "absent": 0, "leave": 0
            })
            if r.status in ("present", "absent", "leave"):
                d[r.status] += 1
        att_days = sorted(by_date.values(), key=lambda x: x["date"])
        for d in att_days:
            d["marked"] = d["present"] + d["absent"] + d["leave"]
            d["total"] = total_students
            d["pct"] = round((d["marked"] / total_students) * 100) if total_students > 0 else 0

    if type != "attendance":
        meals = [
            {"date": m.date, "qty": m.qty, "menu": m.menu, "notes": m.notes}
            for m in db.query(Meal).filter(
                Meal.school_id == sid,
                Meal.date >= start,
                Meal.date <= end
            ).order_by(Meal.date).all()
        ]

    reclaimed_minutes = (len(att_days) * MIN_PER_ATTENDANCE_DAY) + (len(meals) * MIN_PER_MEAL_DAY) + 10

    return {
        "type": type,
        "start": start,
        "end": end,
        "school_id": sid,
        "school_name": school_name,
        "total_students": total_students,
        "attendance": att_days,
        "meals": meals,
        "total_meals": sum(m["qty"] for m in meals),
        "reclaimed_minutes": reclaimed_minutes
    }


@officer_router.get("/summary")
def officer_summary(
    user: User = Depends(require_roles("officer", "admin", "headmaster")),
    db: Session = Depends(get_db)
):
    schools = db.query(School).order_by(School.name).all()
    if user.role == "headmaster":
        schools = [s for s in schools if s.id == user.school_id]

    today = _date.today()
    window = [(today - timedelta(days=i)).isoformat() for i in range(7)]
    out = []
    for s in schools:
        students = db.query(Student).filter(
            Student.school_id == s.id, Student.is_active == 1
        ).count()
        recorded_days = db.query(Attendance.date).filter(
            Attendance.school_id == s.id,
            Attendance.date.in_(window)
        ).distinct().count()
        meal_days = db.query(Meal.date).filter(
            Meal.school_id == s.id,
            Meal.date.in_(window)
        ).distinct().count()
        completion = round(recorded_days / 7 * 100)
        out.append({
            "id": s.id,
            "name": s.name,
            "district": s.district,
            "code": s.code,
            "students": students,
            "completion": completion,
            "missing": 7 - recorded_days,
            "meal_days": meal_days
        })

    avg = round(sum(x["completion"] for x in out) / len(out)) if out else 0
    return {
        "schools": out,
        "avg_completion": avg,
        "total_missing": sum(x["missing"] for x in out),
        "needs_followup": sum(1 for x in out if x["completion"] < 80)
    }
