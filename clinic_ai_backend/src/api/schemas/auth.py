"""Authentication API schemas."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class UserRegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=256)
    full_name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    role: str = Field(default="doctor", min_length=1, max_length=40)
    job_title: str | None = Field(default=None, max_length=160)
    medical_license_number: str | None = Field(default=None, max_length=80)
    opd_morning_start: str | None = Field(default=None, max_length=20)
    opd_morning_end: str | None = Field(default=None, max_length=20)
    opd_evening_enabled: bool = Field(default=False)
    opd_evening_start: str | None = Field(default=None, max_length=20)
    opd_evening_end: str | None = Field(default=None, max_length=20)


class UserLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=120, description="Username or email")
    password: str = Field(min_length=1, max_length=256)


class UserRoleUpdateRequest(BaseModel):
    role: str = Field(min_length=1, max_length=40)


class UserProfileUpdateRequest(BaseModel):
    """Partial update for the authenticated provider profile."""

    full_name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    job_title: str | None = Field(default=None, max_length=160)
    medical_license_number: str | None = Field(default=None, max_length=80)
    avatar_url: str | None = Field(default=None, max_length=2048)
    opd_morning_start: str | None = Field(default=None, max_length=20)
    opd_morning_end: str | None = Field(default=None, max_length=20)
    opd_evening_enabled: bool | None = Field(default=None)
    opd_evening_start: str | None = Field(default=None, max_length=20)
    opd_evening_end: str | None = Field(default=None, max_length=20)


class UserResponse(BaseModel):
    id: str
    doctor_id: str | None = None
    email: str
    username: str
    full_name: str
    phone: str | None = None
    role: str
    job_title: str | None = None
    medical_license_number: str | None = None
    avatar_url: str | None = None
    is_active: bool
    is_verified: bool
    tenant_id: str | None = None
    opd_morning_start: str | None = None
    opd_morning_end: str | None = None
    opd_evening_enabled: bool = False
    opd_evening_start: str | None = None
    opd_evening_end: str | None = None


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int

