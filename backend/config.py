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

    # 아바타 실사 이미지 생성용. Claude API 는 이미지 생성을 지원하지 않아
    # 별도 서비스의 키가 필요하다. 비워두면 아바타는 SVG 로만 동작한다.
    avatar_image_provider: str = ""
    avatar_image_api_key: str = ""

    @property
    def goms_clean_abspath(self) -> Path:
        return ROOT / self.goms_clean_path

    @property
    def artifacts_abspath(self) -> Path:
        return ROOT / self.artifacts_dir


settings = Settings()
