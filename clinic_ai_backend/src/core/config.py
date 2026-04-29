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
    intake_use_llm_message: bool = os.getenv("INTAKE_USE_LLM_MESSAGE", "true").lower() == "true"
    intake_require_all_agents: bool = os.getenv("INTAKE_REQUIRE_ALL_AGENTS", "true").lower() == "true"
    intake_strict_validation: bool = os.getenv("INTAKE_STRICT_VALIDATION", "true").lower() == "true"
    # Follow-up reminders (post-visit next visit). Defaults to dedicated Meta template `follow_up_1`.
    whatsapp_followup_template_name: str = os.getenv("WHATSAPP_FOLLOWUP_TEMPLATE_NAME", "follow_up_1")
    whatsapp_followup_template_lang_en: str = os.getenv(
        "WHATSAPP_FOLLOWUP_TEMPLATE_LANG_EN", os.getenv("WHATSAPP_INTAKE_TEMPLATE_LANG_EN", "en_US")
    )
    whatsapp_followup_template_lang_hi: str = os.getenv(
        "WHATSAPP_FOLLOWUP_TEMPLATE_LANG_HI", os.getenv("WHATSAPP_INTAKE_TEMPLATE_LANG_HI", "hi")
    )
    whatsapp_followup_template_param_count: int = int(os.getenv("WHATSAPP_FOLLOWUP_TEMPLATE_PARAM_COUNT", "1"))
    # If set, POST /workflow/follow-up-reminders/run requires header X-Cron-Secret with this value.
    follow_up_reminder_cron_secret: str = os.getenv("FOLLOW_UP_REMINDER_CRON_SECRET", "")
    # Post-visit summary WhatsApp: template body = generated whatsapp_payload. Empty name falls back to intake template only.
    whatsapp_post_visit_template_name: str = os.getenv("WHATSAPP_POST_VISIT_TEMPLATE_NAME", "")
    whatsapp_post_visit_template_lang_en: str = os.getenv(
        "WHATSAPP_POST_VISIT_TEMPLATE_LANG_EN",
        os.getenv("WHATSAPP_FOLLOWUP_TEMPLATE_LANG_EN", os.getenv("WHATSAPP_INTAKE_TEMPLATE_LANG_EN", "en_US")),
    )
    whatsapp_post_visit_template_lang_hi: str = os.getenv(
        "WHATSAPP_POST_VISIT_TEMPLATE_LANG_HI",
        os.getenv("WHATSAPP_FOLLOWUP_TEMPLATE_LANG_HI", os.getenv("WHATSAPP_INTAKE_TEMPLATE_LANG_HI", "hi")),
    )
    whatsapp_post_visit_template_param_count: int = int(os.getenv("WHATSAPP_POST_VISIT_TEMPLATE_PARAM_COUNT", "1"))
    azure_speech_key: str = os.getenv("AZURE_SPEECH_KEY", "") or os.getenv(
        "AZURE_SPEECH_SUBSCRIPTION_KEY", ""
    )
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
    # HTTP read/write timeout for a single Azure short-audio REST POST (one chunk).
    transcription_timeout_sec: int = int(os.getenv("TRANSCRIPTION_TIMEOUT_SEC", "120"))
    # Wall-clock cap for the whole job in the worker (download + ffmpeg + all chunks). Long visits need this >> single-chunk timeout.
    transcription_job_timeout_sec: int = int(os.getenv("TRANSCRIPTION_JOB_TIMEOUT_SEC", "3600"))
    # Azure "short audio" REST processes only the first ~60s; we split longer WAVs into chunks of this many seconds (requires ffmpeg).
    transcription_short_audio_max_seconds: float = float(
        os.getenv("TRANSCRIPTION_SHORT_AUDIO_MAX_SECONDS", "55")
    )
    transcription_chunk_seconds: float = float(os.getenv("TRANSCRIPTION_CHUNK_SECONDS", "50"))
    # Overlap between consecutive WAV windows sent to Azure (reduces word loss at chunk boundaries; requires ffmpeg).
    transcription_chunk_overlap_seconds: float = float(os.getenv("TRANSCRIPTION_CHUNK_OVERLAP_SECONDS", "1.5"))
    # Retries per chunk for transient HTTP errors or empty STT payloads (same bytes re-posted).
    transcription_chunk_max_stt_retries: int = int(os.getenv("TRANSCRIPTION_CHUNK_MAX_STT_RETRIES", "3"))
    # Set to "1" / "true" to log byte sizes and chunk counts at INFO (one line per job).
    transcription_debug_bytes: bool = os.getenv("TRANSCRIPTION_DEBUG_BYTES", "").lower() in {"1", "true", "yes"}
    # Raw transcript is split into contiguous slices <= this size before OpenAI structuring (ordered merge).
    structure_dialogue_max_chunk_chars: int = int(os.getenv("STRUCTURE_DIALOGUE_MAX_CHUNK_CHARS", "12000"))
    transcription_worker_concurrency: int = int(os.getenv("TRANSCRIPTION_WORKER_CONCURRENCY", "2"))
    transcription_worker_poll_interval_sec: float = float(os.getenv("TRANSCRIPTION_WORKER_POLL_INTERVAL_SEC", "1.0"))
    use_local_adapters: bool = os.getenv("USE_LOCAL_ADAPTERS", "false").lower() == "true"
    local_audio_storage_path: str = os.getenv("LOCAL_AUDIO_STORAGE_PATH", "/tmp/clinic_audio")
    mongo_audio_bucket_name: str = os.getenv("MONGO_AUDIO_BUCKET_NAME", "audio_blobs")
    default_note_type: str = os.getenv("DEFAULT_NOTE_TYPE", "india_clinical")
    encryption_key: str = os.getenv("ENCRYPTION_KEY", "")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-this-in-production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
