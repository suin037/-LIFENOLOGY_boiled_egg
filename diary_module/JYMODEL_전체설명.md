# jy-model 브랜치 전체 설명서

> LIFENOLOGY / "Parallel Me" 프로젝트 · `jy-model` 브랜치의 모든 내용과 중요 사실을 정리한 문서.
> 작성 2026-07-26. 저장소: github.com/suin037/-LIFENOLOGY_boiled_egg

---

## 0. 한눈에

`jy-model`은 두 덩어리로 구성된다.

1. **일기 감정분석 + 심리 RAG + 웰빙 리포트 시스템** — `diary_module/` (이 문서의 핵심)
2. **인생 선택 시뮬레이션(Parallel Me) 엔진** — `backend/`, `klips_module/`, `frontend/`, `data/` (기존 작업)

핵심 흐름(1번):

```
일기 텍스트
  → [감정 모델] 6종 감정·세부감정·VAD(valence)      (로컬, HuggingFace 모델)
  → [하이브리드] 애매/저확신만 Claude API로 재확인    (정확도 보정)
  → [심리 RAG] 감정에 맞는 이론카드 검색·근거 생성     (ChromaDB, 논문 기반)
  → [리포트] 단건 / 주간 웰빙 리포트(Claude 서사)      (선택: 수면·운동 지표)
```

---

## ⚡ 빠른 시작 (Quickstart — 처음 세팅부터 실행까지)

```bash
# 1) 클론 & 브랜치
git clone https://github.com/suin037/-LIFENOLOGY_boiled_egg.git
cd -LIFENOLOGY_boiled_egg && git checkout jy-model

# 2) 패키지 설치
pip install torch transformers kiwipiepy chromadb sentence-transformers scikit-learn numpy anthropic

# 3) 감정 모델 받기 (HuggingFace) — git엔 없음(*.pt gitignore)
python -c "from huggingface_hub import hf_hub_download; \
print(hf_hub_download('JY0/lifenology-diary-emotion','best.pt'))"
#   → 출력 경로를 --ckpt 로 넘기거나, 파일을 루트에 model_v3_e6.pt 로 둔다.

# 4) RAG 백엔드 확보 — lanollab-data 브랜치에서 복사(수정 없이)
git checkout origin/lanollab-data -- backend/rag "data/lanollab/심리학_이론카드" \
  preprocess/build_psych_cards_db.py

# 5) 벡터DB 빌드 (임베딩 모델 ko-sroberta 최초 1회 자동 다운로드)
python preprocess/build_psych_cards_db.py

# 6) API 키 — .env 파일 생성(gitignore됨). API 서사 안 쓰면 생략 가능
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# 7) 실행
python diary_module/hybrid.py --text "이직을 괜히 했나 계속 후회된다."
python diary_module/weekly_report.py --sample
```

**최소 동작(감정 모델만, RAG·API 없이)**: 3)까지만 하면 아래가 된다.
```bash
python diary_module/compare_api_vs_model.py --no-api   # 감정 분류 정확도만
```

### 코드에서 불러 쓰기 (앱에 붙일 때)

```python
import sys; sys.path.insert(0, "diary_module")
from infer import DiaryAnalyzer
from hybrid import analyze_hybrid          # 로컬 우선 + 조건부 API 재확인

az = DiaryAnalyzer(ckpt="model_v3_e6.pt")  # HF에서 받은 best.pt 경로
r = analyze_hybrid(az, "오늘 발표를 망쳤다. 계속 후회된다.")

r["final_coarse"]            # 최종 감정 (예: '슬픔')
r["valence_mean"]            # 긍·부정도 (-1~1)
r["escalation"]              # API 재확인 여부·사유
r["psych"]["cards"]          # 매칭된 심리 이론카드
r["psych"]["prompt_block"]   # Claude 서사 생성용 근거 텍스트
```
`analyze_hybrid`는 `backend/rag`+벡터DB가 필요하다. 감정만 필요하면 `az.analyze(text)`만 써도 된다
(RAG·API 불필요).

---

## 1. 브랜치 파일 구조

```
diary_module/                 ← 일기 감정분석 시스템 (이 문서의 주역)
  # ── 감정 모델 (기존) ──
  train_v2.py                 멀티태스크 분류기 모델 정의·학습 (klue/roberta-large)
  infer.py                    DiaryAnalyzer — 추론 진입점 ★
  emotion_taxonomy.json       6 대분류 / 60 세부 / 12 상황 / 병합맵
  metrics.py                  언어지표(Kiwi 형태소): 1인칭·절대어·통찰·대처균형·정서극성
  slang.py                    신조어·슬랭 정규화 + 극성
  crisis.py                   위기(자살·자해) 신호 탐지
  preprocess_v2.py            학습 데이터 전처리(AIHub 감성대화)
  run_eval.py / eval_merge.py / test_real.py   평가 스크립트
  weekly.py                   (기존) 주간 감정 집계
  SCHEMA.md                   일기 모듈 인터페이스 명세

  # ── 심리 RAG 연동 + 리포트 (2026-07 신규, JY) ──
  psych_link.py               감정분석 → 심리 이론카드 RAG 브리지 ★
  hybrid.py                   로컬 우선 + 조건부 API 재확인 ★
  compare_api_vs_model.py     로컬 vs API vs gold 비교 하네스(+--hybrid)
  report_one.py               단건 일기 리포트
  weekly_report.py            주간 감정변화·웰빙 리포트 ★
  sample_metrics.json         주간 리포트용 건강지표 예시(수면·운동)
  RAG_연동_작업노트.md         작업 기록(worklog)
  JYMODEL_전체설명.md          이 문서

backend/                      ← Parallel Me 시뮬레이션 API (FastAPI, 기존)
  main.py, config.py, schemas.py, rulebase.py, trajectory.py
  models/{knn_model, econml_model, lifelines_model}.py
  utils/{claude_api, scoring}.py
klips_module/                 ← KLIPS 4계층 예측 모델 학습(기존)
  train_layer1~4.py, check_*.py
frontend/                     ← Vite + React 웹앱(기존)
data/dgroup/                  ← D그룹 전처리 산출물 32개(RAG 청크·lookup, 기존)
docs/API.md                   /predict API 계약
klips_train.py, train_models.py, train_yp.py, preprocess*.py   (루트 학습 스크립트)
```

`★` = 시스템 이해에 가장 중요한 파일.

---

## 2. 일기 감정 모델 (로컬)

- **모델**: `klue/roberta-large` 백본의 멀티태스크 분류기 ([train_v2.py](train_v2.py)의 `Model`).
  4개 헤드 — 대분류(6) · 세부감정(60) · 상황(12) · VAD 회귀(valence, arousal).
  세부감정은 예측된 대분류 내부로 **계층 마스킹**됨.
- **체크포인트**: 로컬 파일 `model_v3_e6.pt`(1.3GB, 6 epochs). **git에 없음**(`*.pt` gitignore).
  → **HuggingFace에 공개 배포**: `JY0/lifenology-diary-emotion` (`best.pt`). 이것이 정본.
- **진입점**: [infer.py](infer.py)의 `DiaryAnalyzer.analyze(text)` → dict 반환
  (dominant.coarse/fine/conf, valence_mean/series, situation, coarse_dist,
   linguistic, interpret, rag_triggers, crisis_level, chunks …).
- **성능 (자체 gold n=58)**: 정확도 0.672, 6종 macro F1 0.636, 긍/부정 F1 0.952.
  약점은 **상처·당황**(F1 0.31 / 0.38) — 원 데이터 라벨 중복이 원인(문서화된 한계).
- 학습 데이터: AIHub 감성대화말뭉치(대화 단위 54k). 대화체→일기체 도메인 갭 존재.

---

## 3. 심리 RAG 연동 (신규)

### 3.1 psych_link.py — 브리지
감정분석 출력을 심리 이론카드 검색에 연결해 **"해석 근거 + 행동 제안" 재료**를 만든다.
최종 문장은 만들지 않는다(재료 제공형). 흐름:

1. **안전 게이트** — 위기 신호(일기 crisis_level 또는 rag.safety)면 카드 대신 상담자원 안내로 하드 분기.
2. **감정 → 삶의질 프록시 점수** — 부정 감정=낮음, 기쁨=중간(현 카드셋이 전부 '낮을수록 적용'이라
   높음은 두지 않음).
3. **이론카드 검색** — 감정어로 top-k 검색(지표 불일치도 유사도로 허용).
4. **근거 블록 생성** — Claude 프롬프트에 그대로 넣을 한국어 텍스트.

### 3.2 RAG 백엔드 (⚠️ 중요: jy-model에 없음)
- 검색기·카드 가공·안전 로직은 **`backend/rag/`**(psych_retriever·psych_narrative·safety)에 있고,
  이는 **minjub423 님의 `lanollab-data` 브랜치 파일**이다. 관할 규칙에 따라 **jy-model엔 안 올림**
  (로컬에는 복사돼 있어 지금 PC에선 동작).
- 벡터DB: `data/vectordb/`(ChromaDB) — 이론카드 11장(대처 3 + 긍정정서 8) 적재.
  임베딩 `jhgan/ko-sroberta-multitask`. 빌드: `preprocess/build_psych_cards_db.py`
  (역시 lanollab-data 파일). **git 미추적**(재생성 가능).
- 근거 카드 출처: Lazarus & Folkman(1984) 대처이론, Fredrickson 확장-구축이론 등 **심리학 논문**.
  → 웰빙/건강 코멘트는 **학습 모델이 아니라 논문 기반 RAG 인용**으로만 나온다.

**결론**: `psych_link`·`hybrid`·`report_one`·`weekly_report`는 `backend/rag`가 있어야 실행됨.
없으면 `import rag`에서 에러. (순수 감정모델·비교(비하이브리드)는 그것 없이도 됨.)

---

## 4. 하이브리드 운영 (hybrid.py)

**검증 결론**: 긍/부정·valence는 로컬이 API만큼 정확. 6종 세분류만 API가 앞섬
(로컬 0.672 → API 0.793). 특히 상처·당황.

→ **로컬을 먼저 돌리고, 예측이 상처/당황이거나 확신도<0.5일 때만 Claude API로 재확인**.
그 외엔 로컬 신뢰(무료). 최종 감정으로 psych_link RAG 연결. 위기는 상담자원 분기.

- 튜닝: `ESCALATE_LABELS`, `CONF_THRESHOLD`(또는 `--conf`).
- 효과: 전량 API 대비 **약 1/3만 호출** → 정확도 이득 대부분 확보 + 비용·프라이버시↓.
- 측정: `python diary_module/compare_api_vs_model.py --hybrid`
  → 하이브리드 F1, API 호출률, 정정/훼손 순이득.

---

## 5. 리포트 (report_one.py / weekly_report.py)

### 단건 — report_one.py
일기 1편 → 감정 요약(+valence 스파크라인) + 심리 근거 카드 + (선택)Claude 서사.

### 주간 — weekly_report.py
일주일치 → 요일별 감정 궤적 + 추세/변동성 + 웰빙 서사(Claude).
- **선택 건강지표** `--metrics <json>`(수면점수·수면시간·운동분, 삼성헬스류): 주면 감정과
  연결해 서술하고 **수면↔기분 상관**까지 계산. 안 주면 무시. 없는 수치는 지어내지 않음.
- `--long`: 상세본(토큰 많이 씀). 기본은 짧은 요약본.

### 입력 옵션 (공통)
`--text "..."` · `--stdin`(붙여넣기, 끝에 Ctrl+Z) · `--file <path>`(주간, 항목 `---`/빈 줄 구분)
· `--index`/`--index-range`(gold 검증셋, 테스트용) · `--no-api`(로컬만) · `--out`(저장).

---

## 6. 실행 방법 모음

```bash
# 0) (최초 1회) 벡터DB 빌드 — backend/rag가 로컬에 있어야 함
python preprocess/build_psych_cards_db.py

# 1) 감정+심리 연동 데모
python diary_module/hybrid.py --text "이직을 괜히 했나 계속 후회된다."

# 2) 로컬 vs API 정확도 비교(전체 58건)
python diary_module/compare_api_vs_model.py            # 로컬+API
python diary_module/compare_api_vs_model.py --no-api   # 로컬만(키 불필요)
python diary_module/compare_api_vs_model.py --hybrid   # 하이브리드 성능·호출률

# 3) 단건 리포트
python diary_module/report_one.py --text "..." 
python diary_module/report_one.py --no-api            # 서사 없이 분석·근거만

# 4) 주간 웰빙 리포트
python diary_module/weekly_report.py --sample                                   # 짧게
python diary_module/weekly_report.py --sample --long                            # 상세
python diary_module/weekly_report.py --file 내일기.txt --metrics 건강.json --out 리포트.md
```

---

## 7. 의존성 · 필수 파일 (git에 없는 것들)

| 필요 파일 | 상태 | 확보 방법 |
|---|---|---|
| `model_v3_e6.pt` (감정 체크포인트) | gitignore(*.pt) | **HuggingFace `JY0/lifenology-diary-emotion`** 에서 다운로드 |
| `diary_eval.py` (gold n=58) | gitignore | 로컬 보관 — 검증셋(공개 블로그 재작성본) |
| `.env` (`ANTHROPIC_API_KEY`) | gitignore | 직접 생성. 형식은 `.env.example` 참조 |
| `data/vectordb/` (ChromaDB) | 미추적 | `build_psych_cards_db.py`로 빌드 |
| `backend/rag/`, 이론카드 | **jy-model에 없음** | `lanollab-data` 브랜치에서 옴(복사 or 통합) |

패키지: `torch, transformers, kiwipiepy`(감정·언어지표), `chromadb, sentence-transformers`(RAG),
`scikit-learn, numpy`(비교), `anthropic`(API). 임베딩 모델(ko-sroberta)은 최초 실행 시 자동 다운로드.

---

## 8. Claude API 사용 주의 (sonnet-5 등 최신 모델)

- `temperature`·`top_p`·`top_k` **파라미터 거부(400)** → 넣지 않는다. 재현성은 프롬프트로.
- **기본으로 thinking(생각)이 켜져 있음** → 짧은 생성에서 `max_tokens`를 생각에 소진해 본문이
  잘린다. 리포트 생성기는 `thinking={"type":"disabled"}`로 끈다(잘림 방지 + 비용↓).
- 키는 코드·명령어에 넣지 말고 `.env`(gitignore)에서만 로드.

## 9. 비용 (참고)

sonnet-5 인트로가 $2/$10 per 1M(2026-08-31까지). 리포트 1회 ≈ **1~2센트**. 비교 58건 ≈ 10센트.
더 싸게: `--model claude-haiku-4-5`(절반) 또는 하이브리드로 호출 수 줄이기.

## 10. 검증 수치 (gold n=58)

| | 정확도 | macro F1 | 긍/부정 |
|---|---|---|---|
| 로컬 모델 | 0.672 | 0.636 | 0.952 |
| API(sonnet-5) | 0.793 | 0.770 | 0.952 |

모델↔API 일치 κ=0.535(보통), valence 상관 0.878. 격차는 상처·당황에 집중.

---

## 11. 관할 규칙 (협업)

- 내 관할 = `jy-model`(diary_module, klips_module). 다른 브랜치/사람 파일은 **복사만 OK, 수정 금지**.
- 이번 신규·수정은 전부 `diary_module/` 안. `infer.py`는 torch 로딩 1줄만 수정(내 파일).
- `backend/rag/`·이론카드는 원본 그대로 복사만 함(내용 무수정). jy-model엔 미포함(위 §3.2·§7).

## 12. 중요 사실 / 함정

1. **루트에 옛 `infer.py`(미커밋)** 존재 → import 섀도잉 위험. 스크립트들은 `diary_module`을
   sys.path 우선으로 두어 회피. (정리 권장)
2. 감정 모델은 **진단 도구가 아님**. 세부감정은 확정이 아닌 제안.
3. `emotion_taxonomy.json` 파일은 UTF-8. 콘솔 인코딩에 따라 깨져 보일 수 있음(내용은 정상).
4. 세부감정명이 형용사형(좌절한·실망한)이라 카드 키워드와 문자열 불일치 → 임베딩 유사도로 매칭.
5. 현 이론카드셋은 전부 '낮을수록 적용'(고통 개입용) → 긍정 일기에도 강화용 카드가 붙음(의도).

## 13. 다음 단계(TODO)

- `backend/utils/claude_api.py`가 `psych_link`의 근거 블록을 실제 주입하도록 연동(다른 관할, 조율).
- 건강 RAG 청크(KNHANES·정신건강·웰빙논문, lanollab-data 소재)를 벡터DB에 추가하면 웰빙 근거 강화.
- 회복탄력성 카드(`_handoff_sohyunio/`)를 로더 대상 폴더로 올려 재빌드하면 카드 확장.

---

## 부록: 기존 시뮬레이션 모듈 개요 (참고)

- **backend/** — FastAPI `/predict`. GOMS/KLIPS/YP 데이터로 이직·창업·진학 선택의
  경제·삶의질·건강·궤적을 4계층(L1 룰베이스 조회 / L2 KNN 매칭 / L3 인과 EconML / L4 생존 lifelines)으로
  추정. `utils/claude_api.py`가 수치를 내러티브로 변환.
- **klips_module/** — KLIPS 한국노동패널 4계층 예측 모델 학습·검증 스크립트.
- **data/dgroup/** — 임금·창업생존·취업률·삶의질·정신건강·웰빙논문 8종에서 뽑은 RAG 청크 123개 +
  lookup 8개 + 변수사전(§ `data/dgroup/README.md`).
- **frontend/** — Vite + React 6화면 웹앱 + 결과 대시보드.
```
