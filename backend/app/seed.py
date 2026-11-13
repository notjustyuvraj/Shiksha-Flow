"""Seed the database with fictional demo data and default accounts (first run only)."""
from .models import School, User, Student
from .security import hash_password

DEMO_CREDENTIALS = [
    ("admin", "admin123", "System Admin", "admin", None),
    ("teacher", "teach123", "Meena Teacher", "teacher", "Pragati Primary School"),
    ("officer", "officer123", "District Officer", "officer", None),
]

SCHOOLS = [
    ("Pragati Primary School", "Ahmedabad", "GJ-AMD-014"),
    ("Saraswati Primary School", "Ahmedabad", "GJ-AMD-021"),
    ("Narmada Primary School", "Ahmedabad", "GJ-AMD-033"),
]

STUDENTS = ["Aarav Patel", "Diya Shah", "Vivaan Mehta", "Anaya Desai",
            "Reyansh Joshi", "Myra Trivedi", "Kabir Parmar", "Sara Dave"]


def _make_user(username, password, full_name, role, school_id):
    salt, hashed = hash_password(password)
    return User(username=username, full_name=full_name, role=role,
                school_id=school_id, password_salt=salt, password_hash=hashed)


def seed(db) -> bool:
    if db.query(School).count() > 0:
        return False
    schools = {}
    for name, district, code in SCHOOLS:
        s = School(name=name, district=district, code=code)
        db.add(s)
        db.flush()
        schools[name] = s.id
    for username, password, full_name, role, school_name in DEMO_CREDENTIALS:
        sid = schools.get(school_name) if school_name else None
        db.add(_make_user(username, password, full_name, role, sid))
    first_school = schools["Pragati Primary School"]
    for name in STUDENTS:
        db.add(Student(name=name, cls="Class 3A", school_id=first_school))
    db.commit()
    return True


def print_credentials():
    print("\n  ShikshaFlow backend — demo accounts (change before any real use):")
    for username, password, _, role, _s in DEMO_CREDENTIALS:
        print(f"    {role:<10} username: {username:<10} password: {password}")
    print()
