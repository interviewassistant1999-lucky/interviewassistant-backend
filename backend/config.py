"""Configuration management using pydantic-settings."""

from typing import Literal
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # LLM Provider configuration
    llm_provider: Literal["openai", "gemini", "mock"] = "mock"

    # OpenAI settings
    openai_api_key: str = ""

    # Gemini settings
    gemini_api_key: str = ""

    # General settings
    allowed_origins: str = "http://localhost:3000"

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
