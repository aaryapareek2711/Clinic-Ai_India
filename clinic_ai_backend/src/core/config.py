"""Configuration module."""
from functools import lru_cache
import os
from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")


class Settings:
    """Application settings from environment variables."""

    app_name: str = "Clinic AI India Backend"
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8000"))
    mongodb_url: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017/clinic_ai")
    mongodb_db_name: str = os.getenv("MONGODB_DB_NAME", "clinic_ai")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    whatsapp_access_token: str = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
    whatsapp_phone_number_id: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    whatsapp_verify_token: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
    whatsapp_api_version: str = os.getenv("WHATSAPP_API_VERSION", "v21.0")
    whatsapp_intake_template_name: str = os.getenv("WHATSAPP_INTAKE_TEMPLATE_NAME", "opening_msg")
    whatsapp_intake_template_lang_en: str = os.getenv("WHATSAPP_INTAKE_TEMPLATE_LANG_EN", "en_US")
    whatsapp_intake_template_lang_hi: str = os.getenv("WHATSAPP_INTAKE_TEMPLATE_LANG_HI", "hi")
    whatsapp_intake_template_param_count: int = int(os.getenv("WHATSAPP_INTAKE_TEMPLATE_PARAM_COUNT", "1"))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
