"""앱 전역 설정. .env 에서 값을 읽어옵니다."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ 의 부모 = 프로젝트 루트
ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    anthropic_api_key: str = ""
    goms_clean_path: str = "data/goms_clean.csv"
    artifacts_dir: str = "backend/models/artifacts"

    # Claude 모델 (최신 권장)
    claude_model: str = "claude-opus-4-8"

    @property
    def goms_clean_abspath(self) -> Path:
        return ROOT / self.goms_clean_path

    @property
    def artifacts_abspath(self) -> Path:
        return ROOT / self.artifacts_dir


settings = Settings()
