from datetime import datetime, timezone
from urllib.parse import quote

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.email import send_account_link
from app.core.rate_limit import enforce_rate_limit
from app.core.security import as_utc, create_opaque_token, expires_in, hash_password, hash_token, verify_password
from app.models import AuthSession, EmailToken, User
from app.schemas.auth import (
    EmailRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    UserResponse,
    VerifyEmailRequest,
)

router = APIRouter(prefix="/auth", tags=["authentication"])
_DUMMY_PASSWORD_HASH = hash_password("NotARealPassword-ForTimingOnly-7231")


def _build_action_url(path: str, token: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}{path}?token={quote(token)}"


def _issue_session(response: Response, db: Session, user: User, remember_me: bool) -> None:
    raw_token = create_opaque_token()
    expires = expires_in(days=settings.remember_session_days) if remember_me else expires_in(hours=settings.session_hours)
    db.add(AuthSession(token_hash=hash_token(raw_token), user_id=user.id, expires_at=expires))
    max_age = settings.remember_session_days * 86400 if remember_me else settings.session_hours * 3600
    response.set_cookie(
        key=settings.session_cookie_name,
        value=raw_token,
        max_age=max_age,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="strict",
        path="/api",
    )


def get_current_user(
    db: Session = Depends(get_db),
    session_cookie: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> User:
    if not session_cookie:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to continue.")
    auth_session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(session_cookie)))
    if auth_session is None or as_utc(auth_session.expires_at) <= datetime.now(timezone.utc):
        if auth_session is not None:
            db.delete(auth_session)
            db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session has expired. Please sign in again.")
    user = db.get(User, auth_session.user_id)
    if user is None or not user.email_verified:
        db.delete(auth_session)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to continue.")
    return user


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> RegisterResponse:
    enforce_rate_limit(request, action="register", limit=5, window_seconds=600)
    email = str(payload.email).lower()
    duplicate = db.scalar(select(User.id).where(User.email == email))
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with that email address already exists.")

    user = User(
        full_name=payload.full_name,
        email=email,
        phone=None,
        password_hash=hash_password(payload.password),
        email_verified=False,
    )
    raw_token = create_opaque_token()
    token_record = EmailToken(
        token_hash=hash_token(raw_token),
        user=user,
        purpose="verify",
        expires_at=expires_in(hours=settings.verification_hours),
    )
    db.add_all([user, token_record])
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with that email address already exists.") from error

    verification_url = _build_action_url("/verify-email", raw_token)
    background_tasks.add_task(
        send_account_link,
        recipient=email,
        subject="Verify your FinTech email",
        url=verification_url,
    )
    development_token = raw_token if settings.app_env in {"development", "test"} and not settings.email_delivery_configured else None
    return RegisterResponse(
        user=UserResponse.model_validate(user),
        message="Account created. Verify your email before signing in.",
        development_verification_token=development_token,
    )


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(
    payload: VerifyEmailRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> MessageResponse:
    token_record = db.scalar(select(EmailToken).where(
        EmailToken.token_hash == hash_token(payload.token),
        EmailToken.purpose == "verify",
    ))
    if token_record is None or as_utc(token_record.expires_at) <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This verification link is invalid or expired.")

    user = db.get(User, token_record.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This verification link is invalid or expired.")
    user.email_verified = True
    db.delete(token_record)
    db.commit()
    _issue_session(response, db, user, remember_me=False)
    db.commit()
    return MessageResponse(message="Email verified. Your account is ready.")


@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> UserResponse:
    enforce_rate_limit(request, action="login", limit=8, window_seconds=60)
    identifier = payload.identifier.strip().lower()
    phone = "".join(character for character in identifier if character.isdigit())
    phone_match = f"+91{phone[-10:]}" if len(phone) in {10, 12} and phone[-10:].isdigit() else identifier
    user = db.scalar(select(User).where(or_(User.email == identifier, User.phone == phone_match)))
    encoded = user.password_hash if user is not None else _DUMMY_PASSWORD_HASH
    password_matches = verify_password(payload.password, encoded)
    if user is None or not password_matches or not user.email_verified:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign-in failed. Check your details and email verification.")

    _issue_session(response, db, user, remember_me=payload.remember_me)
    db.commit()
    return UserResponse.model_validate(user)


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    session_cookie: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> MessageResponse:
    if session_cookie:
        auth_session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(session_cookie)))
        if auth_session is not None:
            db.delete(auth_session)
            db.commit()
    response.delete_cookie(key=settings.session_cookie_name, httponly=True, secure=settings.app_env == "production", samesite="strict", path="/api")
    return MessageResponse(message="Signed out.")


@router.get("/me", response_model=UserResponse)
def current_user(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(user)


@router.get("/session", response_model=UserResponse | None)
def current_session(
    response: Response,
    db: Session = Depends(get_db),
    session_cookie: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> UserResponse | None:
    if not session_cookie:
        return None
    auth_session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(session_cookie)))
    if auth_session is None:
        response.delete_cookie(key=settings.session_cookie_name, httponly=True, secure=settings.app_env == "production", samesite="strict", path="/api")
        return None
    if as_utc(auth_session.expires_at) <= datetime.now(timezone.utc):
        db.delete(auth_session)
        db.commit()
        response.delete_cookie(key=settings.session_cookie_name, httponly=True, secure=settings.app_env == "production", samesite="strict", path="/api")
        return None
    user = db.get(User, auth_session.user_id)
    if user is None or not user.email_verified:
        db.delete(auth_session)
        db.commit()
        response.delete_cookie(key=settings.session_cookie_name, httponly=True, secure=settings.app_env == "production", samesite="strict", path="/api")
        return None
    return UserResponse.model_validate(user)


@router.post("/forgot-password", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    payload: EmailRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> MessageResponse:
    enforce_rate_limit(request, action="forgot-password", limit=5, window_seconds=300)
    email = str(payload.email).lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is not None:
        raw_token = create_opaque_token()
        db.query(EmailToken).filter(EmailToken.user_id == user.id, EmailToken.purpose == "reset").delete()
        db.add(EmailToken(
            token_hash=hash_token(raw_token),
            user_id=user.id,
            purpose="reset",
            expires_at=expires_in(minutes=settings.password_reset_minutes),
        ))
        db.commit()
        background_tasks.add_task(
            send_account_link,
            recipient=email,
            subject="Reset your FinTech password",
            url=_build_action_url("/reset-password", raw_token),
        )
    return MessageResponse(
        message="If an account matches that email, recovery instructions will be sent. In local development, no email is sent; check the backend console."
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    token_record = db.scalar(select(EmailToken).where(
        EmailToken.token_hash == hash_token(payload.token),
        EmailToken.purpose == "reset",
    ))
    if token_record is None or as_utc(token_record.expires_at) <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or expired.")
    user = db.get(User, token_record.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or expired.")
    user.password_hash = hash_password(payload.new_password)
    db.delete(token_record)
    db.query(AuthSession).filter(AuthSession.user_id == user.id).delete()
    db.commit()
    return MessageResponse(message="Password updated. You can now sign in.")
