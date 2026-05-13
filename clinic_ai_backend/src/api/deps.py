"""FastAPI dependencies (auth, DB session hooks)."""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from src.adapters.db.mongo.client import get_database
from src.core.auth import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Validate bearer JWT and return the Mongo user document."""
    payload = verify_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    user_id = str(payload.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    db = get_database()
    user_doc = db.users.find_one({"id": user_id})
    if not user_doc:
        email = str(payload.get("email") or "").strip()
        if email:
            user_doc = db.users.find_one({"email": email})
    if not user_doc or not bool(user_doc.get("is_active", True)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user_doc
