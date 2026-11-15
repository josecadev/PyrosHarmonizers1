from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://pyros_user:pyros_password@localhost:5001/pyrosharmonizer_db"
    api_version: str = "1.0.0"

    model_config = SettingsConfigDict(env_file=(".env", "backend/.env"), extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
