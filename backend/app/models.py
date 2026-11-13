"""SQLAlchemy ORM models."""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Date, DateTime, ForeignKey, UniqueConstraint, Text
)
from .database import Base

ROLES = ("admin", "officer", "headmaster", "teacher")


class School(Base):
    __tablename__ = "schools"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    district = Column(String(100), default="")
    code = Column(String(50), default="")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(60), unique=True, nullable=False, index=True)
    full_name = Column(String(120), default="")
    role = Column(String(20), nullable=False)          # admin/officer/headmaster/teacher
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="SET NULL"), nullable=True)
    password_salt = Column(String(64), nullable=False)
    password_hash = Column(String(128), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    cls = Column(String(60), default="")
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    is_active = Column(Integer, default=1, nullable=False)


class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)   # YYYY-MM-DD
    status = Column(String(10), nullable=False)             # present/absent
    __table_args__ = (UniqueConstraint("school_id", "date", "student_id", name="uq_att"),)


class Meal(Base):
    __tablename__ = "meals"
    id = Column(Integer, primary_key=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)   # YYYY-MM-DD
    qty = Column(Integer, nullable=False)
    menu = Column(String(120), default="")
    notes = Column(Text, default="")
    __table_args__ = (UniqueConstraint("school_id", "date", name="uq_meal"),)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(60), default="")
    action = Column(String(60), nullable=False)
    detail = Column(String(255), default="")
    school_id = Column(Integer, nullable=True)
    at = Column(DateTime, default=datetime.utcnow)
