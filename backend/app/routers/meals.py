"""Mid-Day Meal endpoints (one record per date per school)."""
from datetime import date as _date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Meal, User
from ..schemas import MealIn, MealOut, MealSummaryOut
from ..deps import get_current_user, resolve_school_id, log

router = APIRouter(prefix="/api/meals", tags=["meals"])


@router.get("", response_model=list[MealOut])
def list_meals(school_id: int | None = None, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    sid = resolve_school_id(user, school_id)
    return db.query(Meal).filter(Meal.school_id == sid).order_by(Meal.date.desc()).all()


@router.post("", response_model=MealOut)
def save_meal(data: MealIn, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    sid = resolve_school_id(user, data.school_id)
    meal = db.query(Meal).filter(Meal.school_id == sid, Meal.date == data.date).first()
    if meal:
        meal.qty, meal.menu, meal.notes = data.qty, data.menu.strip(), data.notes.strip()
    else:
        meal = Meal(school_id=sid, date=data.date, qty=data.qty,
                    menu=data.menu.strip(), notes=data.notes.strip())
        db.add(meal)
    db.flush()
    log(db, user, "save_meal", f"{data.date}: {data.qty} meals, menu: {data.menu}", sid)
    db.commit()
    db.refresh(meal)
    return meal


@router.get("/summary", response_model=MealSummaryOut)
def meal_summary(
    period: str = Query(default="week"),
    school_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sid = resolve_school_id(user, school_id)
    today = _date.today()
    if period == "week":
        start = (today - timedelta(days=6)).isoformat()
        total_calendar_days = 7
    elif period == "month":
        start = today.replace(day=1).isoformat()
        total_calendar_days = today.day
    else:
        start = "0001-01-01"
        total_calendar_days = 0

    meals = db.query(Meal).filter(
        Meal.school_id == sid,
        Meal.date >= start,
        Meal.date <= today.isoformat()
    ).all()

    total_records = len(meals)
    total_meals = sum(m.qty for m in meals)
    daily_avg = round(total_meals / total_records) if total_records > 0 else 0
    missing = max(0, total_calendar_days - total_records) if total_calendar_days > 0 else 0

    return MealSummaryOut(
        period=period,
        total_records=total_records,
        total_meals=total_meals,
        daily_avg=daily_avg,
        missing_days=missing
    )


@router.delete("/{meal_id}", status_code=204)
def delete_meal(meal_id: int, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    meal = db.get(Meal, meal_id)
    if not meal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meal record not found")
    if user.role in ("teacher", "headmaster") and meal.school_id != user.school_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Record belongs to another school")
    log(db, user, "delete_meal", meal.date, meal.school_id)
    db.delete(meal)
    db.commit()
