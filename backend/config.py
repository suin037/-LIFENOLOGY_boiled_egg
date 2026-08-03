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
    cloudflare_account_id: str = ""
    cloudflare_api_token: str = ""
    cloudflare_reference_model: str = "@cf/black-forest-labs/flux-2-klein-4b"
    goms_clean_path: str = "data/goms_clean.csv"
    artifacts_dir: str = "backend/models/artifacts"

    # Claude 모델 — 서사 생성용. 저렴+적당 기본값(Haiku).
    # 환경변수 CLAUDE_MODEL 로 덮어쓸 수 있음(예: claude-sonnet-5 / claude-opus-4-8).
    claude_model: str = "claude-haiku-4-5"

    @property
    def goms_clean_abspath(self) -> Path:
        return ROOT / self.goms_clean_path

    @property
    def artifacts_abspath(self) -> Path:
        return ROOT / self.artifacts_dir


settings = Settings()
