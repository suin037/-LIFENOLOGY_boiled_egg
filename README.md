# parallel-me

GOMS(대졸자직업이동경로조사) 데이터 기반으로, 다른 진로 선택을 했을 때의
"평행우주 속 나"를 추정·비교해 보여주는 프로젝트.

## 구성

- **preprocess.py** — 원본 `.SAV` → 정제된 `goms_clean.csv` 변환
- **backend/** — FastAPI 서버
  - `models/` — KNN(유사 사례), EconML(인과효과), lifelines(생존분석)
  - `utils/` — 점수화(scoring), Claude API 내러티브 생성
- **frontend/** — Vite + React UI

## 빠른 시작

### 1. 백엔드

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows(Git Bash). PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp ../.env.example ../.env       # 그리고 ANTHROPIC_API_KEY 채우기
uvicorn main:app --reload
```

### 2. 데이터 전처리 (최초 1회)

```bash
python preprocess.py
```

### 3. 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

## 데이터

`data/raw/GP19__2020.SAV` 는 용량/라이선스 문제로 git 에 포함하지 않습니다.
별도로 받아 해당 위치에 두세요.
