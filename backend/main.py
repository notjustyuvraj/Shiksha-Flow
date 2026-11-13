"""Entry point. Run:  python main.py   (then open http://127.0.0.1:8000)"""
import uvicorn
from app.main import app  # noqa: F401  (exposes `app` for `uvicorn main:app`)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
