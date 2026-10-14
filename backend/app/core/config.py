from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FinTech API"
    app_env: str = "development"
    database_url: str = "sqlite:///./fintech.db"
    frontend_url: str = "http://localhost:5173"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    session_cookie_name: str = "fintech_session"
    session_hours: int = 12
    remember_session_days: int = 30
    verification_hours: int = 24
    password_reset_minutes: int = 30
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_starttls: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("app_env")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"development", "test", "production"}:
            raise ValueError("APP_ENV must be development, test, or production")
        return normalized

    @property
    def origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def email_delivery_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from_email)

    def validate_production_auth(self) -> None:
        if self.app_env == "production" and not self.email_delivery_configured:
            raise RuntimeError("Configure SMTP settings before starting authentication in production.")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
