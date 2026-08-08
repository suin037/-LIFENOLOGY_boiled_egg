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
    # Mobile result cards do not need a large source image. Override in .env when needed.
    cloudflare_image_width: int = 384
    cloudflare_image_height: int = 480
    # preprocess/preprocess_goms.py의 실제 출력 위치와 통일한다.
    goms_clean_path: str = "data/clean/goms_clean.csv"
    artifacts_dir: str = "backend/models/artifacts"
    # 데이터 루트. L5 궤적(KLIPS/YP)은 goms_clean 의 부모가 아니라 여기서 경로를 잡는다.
    # (goms_clean 이 data/clean/ 아래로 옮겨지면서 data/clean/raw/klips 같은
    #  존재하지 않는 경로가 계산돼 궤적이 통째로 비어 나오던 버그를 막는다.)
    data_dir: str = "data"

    # Claude 모델 — 서사 생성용. 저렴+적당 기본값(Haiku).
    # 환경변수 CLAUDE_MODEL 로 덮어쓸 수 있음(예: claude-sonnet-5 / claude-opus-4-8).
    claude_model: str = "claude-haiku-4-5"

    @property
    def goms_clean_abspath(self) -> Path:
        return ROOT / self.goms_clean_path

    @property
    def artifacts_abspath(self) -> Path:
        return ROOT / self.artifacts_dir

    @property
    def data_abspath(self) -> Path:
        return ROOT / self.data_dir


settings = Settings()
