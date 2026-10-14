import re
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Password = Annotated[str, Field(min_length=12, max_length=128)]


class RegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: Annotated[str, Field(min_length=2, max_length=100)]
    email: EmailStr
    password: Password

    @field_validator("password")
    @classmethod
    def enforce_password_strength(cls, value: str) -> str:
        if not re.search(r"[a-z]", value) or not re.search(r"[A-Z]", value) or not re.search(r"\d", value):
            raise ValueError("Use at least one uppercase letter, one lowercase letter, and one number.")
        return value


class LoginRequest(BaseModel):
    identifier: Annotated[str, Field(min_length=3, max_length=254)]
    password: Annotated[str, Field(min_length=1, max_length=128)]
    remember_me: bool = False


class EmailRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    token: Annotated[str, Field(min_length=32, max_length=128)]


class ResetPasswordRequest(BaseModel):
    token: Annotated[str, Field(min_length=32, max_length=128)]
    new_password: Password

    @field_validator("new_password")
    @classmethod
    def enforce_password_strength(cls, value: str) -> str:
        if not re.search(r"[a-z]", value) or not re.search(r"[A-Z]", value) or not re.search(r"\d", value):
            raise ValueError("Use at least one uppercase letter, one lowercase letter, and one number.")
        return value


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: str | None
    email_verified: bool

    model_config = ConfigDict(from_attributes=True)


class RegisterResponse(BaseModel):
    user: UserResponse
    message: str
    development_verification_token: str | None = None


class MessageResponse(BaseModel):
    message: str
