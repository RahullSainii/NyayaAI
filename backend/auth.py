import json
import logging
import os
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib
import bcrypt
import jwt
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from backend.config import (
    EMAIL_FROM,
    JWT_ALGORITHM,
    JWT_EXPIRATION_HOURS,
    JWT_SECRET,
    RESET_TOKEN_EXPIRATION_HOURS,
    SMTP_HOST,
    SMTP_PASS,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    USERS_FILE,
)
from backend.db import (
    create_or_replace_user,
    get_all_users,
    get_user_by_email,
    initialize_database,
    migrate_users_from_legacy_json,
    update_user_password,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

_DB_READY = False
_LEGACY_MIGRATED = False


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class AuthResponse(BaseModel):
    message: str


class LoginResponse(BaseModel):
    token: str
    user: dict


def _ensure_db_ready() -> None:
    """Create tables and migrate legacy users if possible."""
    global _DB_READY, _LEGACY_MIGRATED

    if not _DB_READY:
        initialize_database()
        _DB_READY = True

    if not _LEGACY_MIGRATED:
        migrate_users_from_legacy_json(USERS_FILE)
        _LEGACY_MIGRATED = True


def _read_users() -> dict:
    """Read users from SQLite first, then fall back to the legacy JSON store."""
    try:
        _ensure_db_ready()
        users = {}
        for row in get_all_users():
            users[row["email"]] = {
                "name": row["name"],
                "email": row["email"],
                "password_hash": row["password_hash"],
                "created_at": row["created_at"],
            }
        return users
    except Exception:
        if not os.path.exists(USERS_FILE):
            return {}
        try:
            with open(USERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}


def _write_users(users: dict) -> None:
    """Persist user data to SQLite, with JSON as a safety fallback."""
    try:
        _ensure_db_ready()
        for email, user in users.items():
            if not isinstance(user, dict):
                continue
            name = str(user.get("name", "")).strip()
            password_hash = str(user.get("password_hash", "")).strip()
            if not name or not password_hash:
                continue
            create_or_replace_user(name, email, password_hash)
        return
    except Exception:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2, ensure_ascii=False)


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def _create_token(email: str, expiration_hours: int = JWT_EXPIRATION_HOURS) -> str:
    payload = {
        "sub": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=expiration_hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def _send_reset_email(to_email: str, reset_token: str) -> None:
    """Send password reset email via SMTP."""
    reset_link = f"http://localhost:5173/reset-password?token={reset_token}"

    html_body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #07101d 0%, #0f1828 100%); border-radius: 16px; overflow: hidden;">
        <div style="padding: 40px 30px; text-align: center;">
            <h1 style="color: #e3bb56; font-size: 28px; margin: 0 0 8px 0;">NyayaAI</h1>
            <p style="color: #8fa4cb; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Legal Chatbot For Everyone</p>
        </div>
        <div style="padding: 0 30px 40px;">
            <h2 style="color: #f5f7ff; font-size: 22px; margin: 0 0 16px 0;">Password Reset Request</h2>
            <p style="color: #8fa4cb; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                We received a request to reset your password. Click the button below to create a new password.
                This link will expire in {RESET_TOKEN_EXPIRATION_HOURS} hour(s).
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{reset_link}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #f1cf75 0%, #e3bb56 50%, #c99433 100%); color: #0b1322; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 999px; box-shadow: 0 8px 24px rgba(227,187,86,0.3);">
                    Reset Password
                </a>
            </div>
            <p style="color: #8fa4cb; font-size: 13px; line-height: 1.5; margin: 0;">
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
            </p>
            <hr style="border: none; border-top: 1px solid #24324f; margin: 30px 0;" />
            <p style="color: #5a6f8f; font-size: 11px; text-align: center; margin: 0;">&copy; 2025 NyayaAI - AI-Powered Legal Assistant</p>
        </div>
    </div>
    """

    message = MIMEMultipart("alternative")
    message["From"] = EMAIL_FROM
    message["To"] = to_email
    message["Subject"] = "NyayaAI - Reset Your Password"
    message.attach(MIMEText(f"Reset your password: {reset_link}", "plain"))
    message.attach(MIMEText(html_body, "html"))

    await aiosmtplib.send(
        message,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_USER,
        password=SMTP_PASS,
        start_tls=not SMTP_SECURE,
        use_tls=SMTP_SECURE,
    )


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    if not req.name or not req.email or not req.password:
        raise HTTPException(status_code=400, detail="All fields are required")

    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    email_lower = req.email.lower().strip()
    password_hash = _hash_password(req.password)

    try:
        _ensure_db_ready()
        if get_user_by_email(email_lower):
            raise HTTPException(status_code=409, detail="An account with this email already exists")
        create_or_replace_user(req.name, email_lower, password_hash)
        logger.info("New user registered in SQLite: %s", email_lower)
        return AuthResponse(message="Account created successfully. Please log in.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("SQLite register failed, using legacy JSON store: %s", exc)

    users = _read_users()
    if email_lower in users:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    users[email_lower] = {
        "name": req.name.strip(),
        "email": email_lower,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_users(users)
    logger.info("New user registered in legacy JSON store: %s", email_lower)
    return AuthResponse(message="Account created successfully. Please log in.")


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    email_lower = req.email.lower().strip()
    user = None

    try:
        _ensure_db_ready()
        user = get_user_by_email(email_lower)
    except Exception as exc:
        logger.warning("SQLite login lookup failed, falling back to JSON store: %s", exc)

    if user is None:
        user = _read_users().get(email_lower)

    if not user or not _verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _create_token(email_lower)
    return LoginResponse(
        token=token,
        user={"name": user["name"], "email": user["email"]},
    )


@router.post("/forgot-password", response_model=AuthResponse)
async def forgot_password(req: ForgotPasswordRequest):
    email_lower = req.email.lower().strip()
    user = None

    try:
        _ensure_db_ready()
        user = get_user_by_email(email_lower)
    except Exception as exc:
        logger.warning("SQLite forgot-password lookup failed, falling back to JSON store: %s", exc)

    if user is None:
        user = _read_users().get(email_lower)

    if not user:
        return AuthResponse(message="If an account with that email exists, we've sent a password reset link.")

    reset_token = _create_token(email_lower, expiration_hours=RESET_TOKEN_EXPIRATION_HOURS)
    await _send_reset_email(email_lower, reset_token)
    return AuthResponse(message="If an account with that email exists, we've sent a password reset link.")


@router.post("/reset-password", response_model=AuthResponse)
async def reset_password(req: ResetPasswordRequest):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    email = _verify_token(req.token)
    new_hash = _hash_password(req.password)

    try:
        _ensure_db_ready()
        if not get_user_by_email(email):
            raise HTTPException(status_code=404, detail="User not found")
        update_user_password(email, new_hash)
        logger.info("Password reset for SQLite user: %s", email)
        return AuthResponse(message="Password reset successfully. You can now log in with your new password.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("SQLite reset-password update failed, falling back to JSON store: %s", exc)

    users = _read_users()
    if email not in users:
        raise HTTPException(status_code=404, detail="User not found")

    users[email]["password_hash"] = new_hash
    _write_users(users)
    logger.info("Password reset for legacy JSON user: %s", email)
    return AuthResponse(message="Password reset successfully. You can now log in with your new password.")
