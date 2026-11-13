"""Shared dependencies: auth, role checks, school scoping, audit helper."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, AuditLog
from .security import decode_token

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    cred: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if cred is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_token(cred.credentials)
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    return user


def require_roles(*roles: str):
    def dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this action")
        return user
    return dep


def resolve_school_id(user: User, requested: int | None) -> int:
    """Teachers/headmasters are locked to their own school; officers/admins may target any."""
    if user.role in ("teacher", "headmaster"):
        if user.school_id is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Your account is not linked to a school")
        return user.school_id
    if requested is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "school_id is required for this role")
    return requested


def log(db: Session, user: User, action: str, detail: str = "", school_id: int | None = None):
    db.add(AuditLog(user_id=user.id, username=user.username, action=action,
                    detail=detail[:255], school_id=school_id))
