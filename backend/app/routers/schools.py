"""School listing and admin management."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import School, User
from ..schemas import SchoolOut, SchoolCreate, SchoolUpdate
from ..deps import get_current_user, require_roles, log

router = APIRouter(prefix="/api/schools", tags=["schools"])


@router.get("", response_model=list[SchoolOut])
def list_schools(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(School)
    if user.role in ("teacher", "headmaster"):
        q = q.filter(School.id == user.school_id)
    return q.order_by(School.name).all()


@router.post("", response_model=SchoolOut, status_code=201)
def create_school(data: SchoolCreate, user: User = Depends(require_roles("admin")),
                  db: Session = Depends(get_db)):
    school = School(name=data.name.strip(), district=data.district.strip(), code=data.code.strip())
    db.add(school)
    db.flush()
    log(db, user, "create_school", school.name, school.id)
    db.commit()
    db.refresh(school)
    return school


@router.put("/{school_id}", response_model=SchoolOut)
def update_school(
    school_id: int,
    data: SchoolUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user.role in ("teacher", "headmaster") and user.school_id != school_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot edit another school's profile")
    if user.role not in ("admin", "headmaster"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only admins or headmasters may edit school profile")

    school = db.get(School, school_id)
    if not school:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "School not found")

    if data.name is not None:
        school.name = data.name.strip()
    if data.district is not None:
        school.district = data.district.strip()
    if data.code is not None:
        school.code = data.code.strip()

    log(db, user, "update_school", f"Updated {school.name}", school_id)
    db.commit()
    db.refresh(school)
    return school


@router.delete("/{school_id}", status_code=204)
def delete_school(school_id: int, user: User = Depends(require_roles("admin")),
                  db: Session = Depends(get_db)):
    school = db.get(School, school_id)
    if not school:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "School not found")
    log(db, user, "delete_school", school.name, school_id)
    db.delete(school)
    db.commit()
