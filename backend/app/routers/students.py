"""Student roster endpoints (school-scoped)."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Student, User, Attendance
from ..schemas import StudentOut, StudentCreate, StudentUpdate, StudentImportIn, StudentHistoryEntry
from ..deps import get_current_user, resolve_school_id, log

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("", response_model=list[StudentOut])
def list_students(
    school_id: int | None = None,
    include_inactive: bool = Query(default=False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sid = resolve_school_id(user, school_id)
    q = db.query(Student).filter(Student.school_id == sid)
    if not include_inactive:
        q = q.filter(Student.is_active == 1)
    return q.order_by(Student.cls, Student.name).all()


@router.post("", response_model=StudentOut, status_code=201)
def add_student(data: StudentCreate, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    sid = resolve_school_id(user, data.school_id)
    student = Student(
        name=data.name.strip(),
        cls=data.cls.strip() or "Class 3A",
        school_id=sid,
        is_active=1
    )
    db.add(student)
    db.flush()
    log(db, user, "add_student", f"{student.name} ({student.cls})", sid)
    db.commit()
    db.refresh(student)
    return student


@router.put("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    data: StudentUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found")
    if user.role in ("teacher", "headmaster") and student.school_id != user.school_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Student belongs to another school")

    if data.name is not None:
        student.name = data.name.strip()
    if data.cls is not None:
        student.cls = data.cls.strip()
    if data.is_active is not None:
        student.is_active = data.is_active

    log(db, user, "update_student", f"{student.name} ({student.cls})", student.school_id)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    permanent: bool = Query(default=False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found")
    if user.role in ("teacher", "headmaster") and student.school_id != user.school_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Student belongs to another school")

    if permanent:
        log(db, user, "delete_student_permanent", student.name, student.school_id)
        db.delete(student)
        db.commit()
        return {"status": "deleted_permanently", "id": student_id}
    else:
        # Safe toggle / deactivation
        student.is_active = 0 if student.is_active == 1 else 1
        new_state = "active" if student.is_active == 1 else "deactivated"
        log(db, user, f"student_{new_state}", student.name, student.school_id)
        db.commit()
        return {"status": new_state, "id": student_id, "is_active": student.is_active}


@router.post("/import")
def import_students(
    data: StudentImportIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sid = resolve_school_id(user, data.school_id)
    existing = db.query(Student).filter(Student.school_id == sid).all()
    existing_keys = {(s.name.strip().lower(), s.cls.strip().lower()) for s in existing}

    created = 0
    skipped = 0
    for item in data.students:
        nm = item.name.strip()
        cl = item.cls.strip() or "Class 3A"
        key = (nm.lower(), cl.lower())
        if not nm or key in existing_keys:
            skipped += 1
            continue
        st = Student(name=nm, cls=cl, school_id=sid, is_active=1)
        db.add(st)
        existing_keys.add(key)
        created += 1

    log(db, user, "import_students", f"Imported {created}, skipped {skipped}", sid)
    db.commit()
    return {"imported": created, "skipped": skipped, "total_submitted": len(data.students)}


@router.get("/{student_id}/attendance", response_model=list[StudentHistoryEntry])
def student_attendance_history(
    student_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found")
    if user.role in ("teacher", "headmaster") and student.school_id != user.school_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Student belongs to another school")

    records = db.query(Attendance).filter(
        Attendance.student_id == student_id
    ).order_by(Attendance.date.desc()).all()

    return [{"date": r.date, "status": r.status} for r in records]
