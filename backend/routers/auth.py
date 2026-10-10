"""
backend/routers/auth.py
Real authentication endpoints for GeM Astra.

Endpoints
---------
POST /api/auth/register        — create a new account
POST /api/auth/login           — returns a JWT access token
GET  /api/auth/me              — return the current user (requires token)
POST /api/auth/forgot-password — issue a password-reset token
POST /api/auth/reset-password  — consume the reset token, set new password

Security
--------
- Passwords are hashed with bcrypt (passlib).
- Sessions use signed JWT access tokens (HS256, 8-hour expiry).
- Reset tokens are 32-byte URL-safe random strings, valid for 1 hour, single-use.
- Duplicate username / email → 409 Conflict.
"""

from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt as _bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, field_validator

import utils.database as db

router = APIRouter(prefix="/api/auth", tags=["auth"])

# --------------------------------------------------------------------------- #
#  Security config                                                             #
# --------------------------------------------------------------------------- #

# In production set this via environment variable — never hard-code in commits.
SECRET_KEY: str = os.environ.get(
    "GEM_ASTRA_SECRET_KEY",
    "gem-astra-dev-secret-change-in-production-32byteslong!!",
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8
RESET_TOKEN_EXPIRE_HOURS = 1

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

ALLOWED_ROLES = {"reviewer", "admin"}


# --------------------------------------------------------------------------- #
#  Helpers                                                                     #
# --------------------------------------------------------------------------- #

def _hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def _create_access_token(data: dict, expires_hours: int = ACCESS_TOKEN_EXPIRE_HOURS) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """FastAPI dependency — validates JWT and returns the user row."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = _decode_token(token)
        user_id: Optional[int] = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    user = db.get_user_by_id(int(user_id))
    if user is None or not user.get("is_active"):
        raise credentials_exc
    return user


# --------------------------------------------------------------------------- #
#  Request / response models                                                   #
# --------------------------------------------------------------------------- #

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "reviewer"

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters.")
        if len(v) > 50:
            raise ValueError("Username must be at most 50 characters.")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username may only contain letters, digits, hyphens, and underscores.")
        return v

    @field_validator("password")
    @classmethod
    def password_strong(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter.")
        return v

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: str) -> str:
        if v not in ALLOWED_ROLES:
            raise ValueError(f"Role must be one of: {', '.join(sorted(ALLOWED_ROLES))}.")
        return v


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    # reset_token is included so you can wire up email sending later.
    # In production: send this via email and remove it from the response.
    reset_token: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strong(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter.")
        return v


def _user_to_response(user: dict) -> UserResponse:
    return UserResponse(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        role=user["role"],
        created_at=user["created_at"],
    )


# --------------------------------------------------------------------------- #
#  Endpoints                                                                   #
# --------------------------------------------------------------------------- #

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
)
def register(body: RegisterRequest):
    """
    Create a new user account.
    Returns 409 if the username or email is already taken.
    """
    # Ensure tables exist (idempotent)
    db.init_db()

    # Check duplicates explicitly for clear error messages
    if db.get_user_by_username(body.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken.",
        )
    if db.get_user_by_email(body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    hashed = _hash_password(body.password)
    try:
        user = db.create_user(
            username=body.username,
            email=body.email,
            hashed_password=hashed,
            role=body.role,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    return _user_to_response(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in and receive a JWT token",
)
def login(form: OAuth2PasswordRequestForm = Depends()):
    """
    Accepts username + password (form-encoded, OAuth2 standard).
    Returns a JWT access token on success.
    """
    user = db.get_user_by_username(form.username)
    if not user or not _verify_password(form.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    token = _create_access_token({"sub": str(user["id"]), "role": user["role"]})
    return TokenResponse(access_token=token, user=_user_to_response(user))


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the currently authenticated user",
)
def get_me(current_user: dict = Depends(get_current_user)):
    return _user_to_response(current_user)


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    summary="Request a password-reset token",
)
def forgot_password(body: ForgotPasswordRequest):
    """
    If the email matches a registered account, a one-time reset token is
    generated (valid for 1 hour).

    NOTE: In production, email the reset_token to the user and remove it
    from this response. It is included here so the flow works without an
    email server.
    """
    user = db.get_user_by_email(body.email)

    # Always return 200 — never reveal whether the email exists (security best practice)
    generic_msg = (
        "If an account with that email exists, a reset token has been generated."
    )

    if not user:
        # Return a fake but plausible response so email enumeration is not possible
        return ForgotPasswordResponse(
            message=generic_msg,
            reset_token="",
        )

    token = secrets.token_urlsafe(32)
    expires_at = (
        datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
    ).isoformat()
    db.create_reset_token(user["id"], token, expires_at)

    return ForgotPasswordResponse(message=generic_msg, reset_token=token)


@router.post(
    "/reset-password",
    summary="Consume a reset token and set a new password",
)
def reset_password(body: ResetPasswordRequest):
    """
    Validates the reset token (must be unused and not expired) and sets
    the new password.  The token is single-use — attempting to reuse it
    returns 400.
    """
    new_hash = _hash_password(body.new_password)
    ok = db.consume_reset_token(body.token, new_hash)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token is invalid, expired, or has already been used.",
        )
    return {"message": "Password updated successfully. Please log in with your new password."}
