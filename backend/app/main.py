"""FastAPI application factory."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import Base, engine, SessionLocal, BASE_DIR, migrate_db
from .seed import seed, print_credentials
from .routers import auth, schools, students, attendance, meals, reports, admin

STATIC_DIR = os.path.join(BASE_DIR, "static")
FRONTEND_DIST = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")
ASSETS_DIR = os.path.join(FRONTEND_DIST, "assets")


def create_app() -> FastAPI:
    Base.metadata.create_all(bind=engine)
    migrate_db()

    db = SessionLocal()
    try:
        if seed(db):
            print_credentials()
    finally:
        db.close()

    app = FastAPI(
        title="ShikshaFlow API",
        version="1.1.0",
        description="Backend for ShikshaFlow — Teach-Time Reclaim"
    )

    allowed_env = os.environ.get("ALLOWED_ORIGINS", "").strip()
    origins = [o.strip() for o in allowed_env.split(",") if o.strip()] if allowed_env else [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "*"
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True if allowed_env and "*" not in origins else False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for module in (auth, schools, students, attendance, meals, admin):
        app.include_router(module.router)
    app.include_router(reports.report_router)
    app.include_router(reports.officer_router)
    app.include_router(reports.teacher_router)

    if os.path.exists(ASSETS_DIR):
        app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="frontend_assets")

    @app.get("/api/health")
    def health():
        return {"status": "ok", "app": "ShikshaFlow", "version": "1.1.0"}

    @app.get("/", include_in_schema=False)
    def index_root():
        if os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
            return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
        return FileResponse(os.path.join(STATIC_DIR, "admin.html"))

    @app.get("/admin", include_in_schema=False)
    def admin_panel():
        return FileResponse(os.path.join(STATIC_DIR, "admin.html"))

    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
    return app


app = create_app()
