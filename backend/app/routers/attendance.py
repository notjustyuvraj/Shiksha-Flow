"""Date-wise attendance endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Attendance, Student, User
from ..schemas import AttendanceSaveIn
from ..deps import get_current_user, resolve_school_id, log

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


def _counts(entries: dict, total: int) -> dict:
    present = sum(1 for v in entries.values() if v == "present")
    absent = sum(1 for v in entries.values() if v == "absent")
    leave = sum(1 for v in entries.values() if v == "leave")
    pending = max(0, total - present - absent - leave)
    marked = present + absent + leave
    pct = round((marked / total) * 100) if total > 0 else 0
    return {
        "total": total,
        "present": present,
        "absent": absent,
        "leave": leave,
        "pending": pending,
        "marked": marked,
        "completion_pct": pct
    }


@router.get("")
def get_attendance(
    date: str,
    school_id: int | None = None,
    cls: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sid = resolve_school_id(user, school_id)
    student_q = db.query(Student).filter(Student.school_id == sid, Student.is_active == 1)
    if cls and cls != "All classes":
        student_q = student_q.filter(Student.cls == cls)
    students = student_q.all()
    valid_ids = {s.id for s in students}

    rows = db.query(Attendance).filter(
        Attendance.school_id == sid, Attendance.date == date
    ).all()

    entries = {r.student_id: r.status for r in rows if r.student_id in valid_ids}
    total = len(students)
    return {
        "date": date,
        "school_id": sid,
        "cls": cls or "all",
        "entries": entries,
        "counts": _counts(entries, total),
        "saved": len(rows) > 0
    }


@router.post("")
def save_attendance(
    data: AttendanceSaveIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sid = resolve_school_id(user, data.school_id)
    students = db.query(Student).filter(Student.school_id == sid, Student.is_active == 1).all()
    valid_ids = {s.id for s in students}

    # Delete existing rows for date to ensure clean overwrite
    db.query(Attendance).filter(
        Attendance.school_id == sid, Attendance.date == data.date
    ).delete()

    saved = {}
    for e in data.entries:
        if e.student_id in valid_ids and e.status in ("present", "absent", "leave"):
            db.add(Attendance(
                school_id=sid,
                student_id=e.student_id,
                date=data.date,
                status=e.status
            ))
            saved[e.student_id] = e.status

    total = len(valid_ids)
    c = _counts(saved, total)
    log(db, user, "save_attendance",
        f"{data.date}: {c['present']} present, {c['absent']} absent, {c['leave']} leave (out of {total})",
        sid)
    db.commit()
    return {"date": data.date, "school_id": sid, "counts": c}


@router.get("/range")
def attendance_range(
    start: str,
    end: str,
    school_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sid = resolve_school_id(user, school_id)
    total_active = db.query(Student).filter(Student.school_id == sid, Student.is_active == 1).count()

    rows = db.query(Attendance).filter(
        Attendance.school_id == sid,
        Attendance.date >= start,
        Attendance.date <= end
    ).all()

    by_date: dict[str, dict] = {}
    for r in rows:
        d = by_date.setdefault(r.date, {
            "date": r.date,
            "present": 0,
            "absent": 0,
            "leave": 0,
            "total_students": total_active
        })
        if r.status == "present":
            d["present"] += 1
        elif r.status == "absent":
            d["absent"] += 1
        elif r.status == "leave":
            d["leave"] += 1

    out = sorted(by_date.values(), key=lambda x: x["date"])
    for d in out:
        d["marked"] = d["present"] + d["absent"] + d["leave"]
        d["pct"] = round((d["marked"] / total_active * 100)) if total_active > 0 else 0

    return {"school_id": sid, "start": start, "end": end, "days": out}
