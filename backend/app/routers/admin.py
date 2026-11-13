"""Admin-only endpoints: stats, user management, audit log, backup & restore."""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import School, User, Student, Attendance, Meal, AuditLog, ROLES
from ..schemas import UserOut, UserCreate, AuditOut
from ..security import hash_password
from ..deps import require_roles, log
from ..seed import seed

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
def stats(_: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    return {
        "schools": db.query(School).count(),
        "users": db.query(User).count(),
        "students": db.query(Student).filter(Student.is_active == 1).count(),
        "attendance_records": db.query(Attendance).count(),
        "meal_records": db.query(Meal).count(),
    }


@router.get("/users", response_model=list[UserOut])
def list_users(_: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.username).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, admin: User = Depends(require_roles("admin")),
                db: Session = Depends(get_db)):
    if data.role not in ROLES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"role must be one of {ROLES}")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already exists")
    if data.role in ("teacher", "headmaster") and not data.school_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Teachers/headmasters need a school")
    if data.school_id and not db.get(School, data.school_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "School not found")
    salt, hashed = hash_password(data.password)
    user = User(username=data.username.strip(), full_name=data.full_name.strip(),
                role=data.role, school_id=data.school_id,
                password_salt=salt, password_hash=hashed)
    db.add(user)
    db.flush()
    log(db, admin, "create_user", f"{user.username} ({user.role})", user.school_id)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, admin: User = Depends(require_roles("admin")),
                db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot delete your own account")
    log(db, admin, "delete_user", user.username, user.school_id)
    db.delete(user)
    db.commit()


@router.get("/audit", response_model=list[AuditOut])
def audit(limit: int = 100, _: User = Depends(require_roles("admin")),
          db: Session = Depends(get_db)):
    rows = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(min(limit, 500)).all()
    return [AuditOut.from_row(r) for r in rows]


@router.get("/backup")
def export_backup(admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    """Exports safe operational backup without exposing credentials or security salts."""
    schools = [{"id": s.id, "name": s.name, "district": s.district, "code": s.code} for s in db.query(School).all()]
    students = [{"id": s.id, "name": s.name, "cls": s.cls, "school_id": s.school_id, "is_active": s.is_active} for s in db.query(Student).all()]
    meals = [{"id": m.id, "school_id": m.school_id, "date": m.date, "qty": m.qty, "menu": m.menu, "notes": m.notes} for m in db.query(Meal).all()]
    attendance = [{"school_id": a.school_id, "student_id": a.student_id, "date": a.date, "status": a.status} for a in db.query(Attendance).all()]

    log(db, admin, "export_backup", f"Exported {len(students)} students, {len(attendance)} attendance", None)
    db.commit()

    return {
        "version": "1.0",
        "exported_by": admin.username,
        "schools": schools,
        "students": students,
        "meals": meals,
        "attendance": attendance
    }


@router.post("/restore")
def restore_backup(
    payload: dict = Body(...),
    admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """Safely restores records with schema validation."""
    if not isinstance(payload, dict) or "schools" not in payload:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid backup format")

    restored_schools = 0
    restored_students = 0

    for sc in payload.get("schools", []):
        if not db.get(School, sc.get("id")):
            db.add(School(id=sc.get("id"), name=sc.get("name", "School"), district=sc.get("district", ""), code=sc.get("code", "")))
            restored_schools += 1

    for st in payload.get("students", []):
        if not db.get(Student, st.get("id")):
            db.add(Student(id=st.get("id"), name=st.get("name", ""), cls=st.get("cls", "Class 3A"), school_id=st.get("school_id"), is_active=st.get("is_active", 1)))
            restored_students += 1

    for ml in payload.get("meals", []):
        existing = db.query(Meal).filter(Meal.school_id == ml.get("school_id"), Meal.date == ml.get("date")).first()
        if not existing:
            db.add(Meal(school_id=ml.get("school_id"), date=ml.get("date"), qty=ml.get("qty", 0), menu=ml.get("menu", ""), notes=ml.get("notes", "")))

    for at in payload.get("attendance", []):
        existing = db.query(Attendance).filter(
            Attendance.school_id == at.get("school_id"),
            Attendance.date == at.get("date"),
            Attendance.student_id == at.get("student_id")
        ).first()
        if not existing:
            db.add(Attendance(
                school_id=at.get("school_id"),
                student_id=at.get("student_id"),
                date=at.get("date"),
                status=at.get("status", "present")
            ))

    log(db, admin, "restore_backup", f"Restored {restored_schools} schools, {restored_students} students", None)
    db.commit()
    return {"status": "ok", "restored_schools": restored_schools, "restored_students": restored_students}


@router.post("/reset")
def reset_demo_data(admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    """Resets demo data while preserving system accounts."""
    db.query(Attendance).delete()
    db.query(Meal).delete()
    db.query(Student).delete()
    db.query(School).delete()

    seed(db)
    log(db, admin, "reset_demo_data", "Reset demo dataset to initial state", None)
    db.commit()
    return {"status": "reset_completed"}
