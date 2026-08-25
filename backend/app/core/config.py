"""
Application settings, loaded from environment variables (see .env.example).

Phase 1 only needs DATABASE_URL. SECRET_KEY is reserved for Phase 2
(authentication) and is not used by anything yet.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str = "change_me_in_phase_2"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
