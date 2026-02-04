"""Configuration management using pydantic-settings."""

from typing import Literal, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database settings
    database_url: str = "sqlite+aiosqlite:///./interview_assistant.db"
    database_echo: bool = False  # Set to True for SQL query logging

    # Auth settings
    jwt_secret_key: str = "your-secret-key-change-in-production"  # Generate with: openssl rand -hex 32
    jwt_expire_minutes: int = 10080  # 7 days
    jwt_algorithm: str = "HS256"

    # Google OAuth settings
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_redirect_uri: str = "http://localhost:3000/auth/callback"

    # Encryption for API keys (Fernet key)
    encryption_key: Optional[str] = None  # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

    # LLM Provider configuration
    llm_provider: Literal["openai", "gemini", "adaptive", "mock"] = "mock"

    # OpenAI settings
    openai_api_key: str = ""

    # Gemini settings
    gemini_api_key: str = ""

    # Groq settings (for Adaptive provider)
    groq_api_key: str = ""

    # Rate limiting settings (for Gemini free tier testing)
    dev_mode: bool = False  # Enable rate-limit-safe testing mode (disable for faster responses)
    rate_limit_rpm: int = 4  # Requests per minute (4 for free tier with buffer)
    audio_buffer_seconds: int = 3  # Seconds of audio to buffer (reduced for faster responses)

    # Semantic turn detection settings
    turn_detection_enabled: bool = True  # Enable semantic turn detection (reduces jittery suggestions)
    turn_silence_threshold_ms: int = 1500  # Silence duration to consider turn complete (ms)
    turn_min_words: int = 3  # Minimum words for a valid turn

    # Transcript grouping settings (for visual separation in UI)
    # Option A (legacy): Use transcript arrival time - less accurate due to audio buffering
    # Option B1 (recommended): Use frontend VAD speech timing - more accurate
    use_speech_timing_for_turns: bool = True  # True = B1 (VAD timing), False = A (transcript timing)
    speech_silence_threshold_ms: int = 3000  # Silence duration to consider new turn (ms) - for B1

    # General settings
    allowed_origins: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003"

    # Legacy setting for backwards compatibility
    use_mock_openai: bool = True  # Deprecated: use llm_provider instead

    @property
    def origins_list(self) -> list[str]:
        """Parse comma-separated origins into a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    @property
    def effective_provider(self) -> str:
        """Get the effective provider, considering legacy settings."""
        # If llm_provider is explicitly set to something other than mock, use it
        if self.llm_provider != "mock":
            return self.llm_provider
        # Fall back to legacy use_mock_openai setting
        if not self.use_mock_openai:
            return "openai"
        return "mock"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
