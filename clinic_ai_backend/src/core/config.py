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
    azure_storage_account_name: str = os.getenv("AZURE_STORAGE_ACCOUNT_NAME", "")
    azure_storage_account_key: str = os.getenv("AZURE_STORAGE_ACCOUNT_KEY", "")
    azure_blob_container_audio: str = os.getenv("AZURE_BLOB_CONTAINER_AUDIO", "audio")
    azure_queue_name: str = os.getenv("AZURE_QUEUE_NAME", "transcription-jobs")
    azure_speech_key: str = os.getenv("AZURE_SPEECH_KEY", "")
    azure_speech_region: str = os.getenv("AZURE_SPEECH_REGION", "")
    azure_speech_endpoint: str = os.getenv("AZURE_SPEECH_ENDPOINT", "")
    transcription_confidence_threshold: float = float(
        os.getenv("TRANSCRIPTION_CONFIDENCE_THRESHOLD", "0.75")
    )
    transcription_manual_review_ratio_threshold: float = float(
        os.getenv("TRANSCRIPTION_MANUAL_REVIEW_RATIO_THRESHOLD", "0.25")
    )
    max_audio_size_mb: int = int(os.getenv("MAX_AUDIO_SIZE_MB", "25"))
    allowed_audio_mime_types: list[str] = [
        value.strip()
        for value in os.getenv(
            "ALLOWED_AUDIO_MIME_TYPES",
            "audio/wav,audio/mpeg,audio/mp3,audio/x-wav,audio/mp4,audio/webm,audio/m4a,audio/x-m4a",
        ).split(",")
        if value.strip()
    ]
    transcription_max_retries: int = int(os.getenv("TRANSCRIPTION_MAX_RETRIES", "3"))
    transcription_timeout_sec: int = int(os.getenv("TRANSCRIPTION_TIMEOUT_SEC", "120"))
    use_local_adapters: bool = os.getenv("USE_LOCAL_ADAPTERS", "false").lower() == "true"
    local_audio_storage_path: str = os.getenv("LOCAL_AUDIO_STORAGE_PATH", "/tmp/clinic_audio")
    mongo_audio_bucket_name: str = os.getenv("MONGO_AUDIO_BUCKET_NAME", "audio_blobs")
    whisper_model_size: str = os.getenv("WHISPER_MODEL_SIZE", "medium")
    default_note_type: str = os.getenv("DEFAULT_NOTE_TYPE", "india_clinical")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
