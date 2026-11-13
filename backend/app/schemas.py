"""Pydantic request/response schemas."""
from pydantic import BaseModel, ConfigDict, Field


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str
    role: str
    school_id: int | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    password: str = Field(min_length=6, max_length=128)
    full_name: str = ""
    role: str
    school_id: int | None = None


class SchoolOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    district: str
    code: str


class SchoolCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    district: str = ""
    code: str = ""


class SchoolUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=100)
    code: str | None = Field(default=None, max_length=50)


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    cls: str
    school_id: int
    is_active: int = 1


class StudentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    cls: str = "Class 3A"
    school_id: int | None = None


class StudentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    cls: str | None = Field(default=None, max_length=60)
    is_active: int | None = None


class StudentImportItem(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    cls: str = "Class 3A"


class StudentImportIn(BaseModel):
    students: list[StudentImportItem]
    school_id: int | None = None


class AttendanceEntry(BaseModel):
    student_id: int
    status: str  # present/absent/leave/unmarked


class AttendanceSaveIn(BaseModel):
    date: str
    school_id: int | None = None
    entries: list[AttendanceEntry]


class MealIn(BaseModel):
    date: str
    qty: int = Field(ge=0, le=100000)
    menu: str = ""
    notes: str = ""
    school_id: int | None = None


class MealOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    school_id: int
    date: str
    qty: int
    menu: str
    notes: str


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    action: str
    detail: str
    school_id: int | None = None
    at: str

    @classmethod
    def from_row(cls, row):
        return cls(id=row.id, username=row.username, action=row.action,
                   detail=row.detail, school_id=row.school_id,
                   at=row.at.isoformat() if row.at else "")


class TeachTimeStats(BaseModel):
    minutes_today: int = 0
    minutes_this_week: int = 0
    minutes_all_time: int = 0
    attendance_days: int = 0
    meal_days: int = 0


class PendingTask(BaseModel):
    id: str
    title: str
    desc: str
    action_tab: str
    completed: bool


class TeacherDashboardOut(BaseModel):
    today: str
    school_id: int
    school_name: str
    total_students: int
    present_today: int
    absent_today: int
    leave_today: int
    unmarked_today: int
    attendance_marked: bool
    attendance_completion_pct: int
    meal_marked: bool
    meal_today_qty: int
    pending_tasks: list[PendingTask]
    recent_activity: list[AuditOut]
    teach_time: TeachTimeStats
    next_best_action: str


class StudentHistoryEntry(BaseModel):
    date: str
    status: str


class MealSummaryOut(BaseModel):
    period: str
    total_records: int
    total_meals: int
    daily_avg: int
    missing_days: int
