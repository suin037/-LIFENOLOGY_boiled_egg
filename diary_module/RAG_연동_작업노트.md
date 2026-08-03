# 일기 감정분석 ↔ 심리 RAG 연동 작업노트

작성: 2026-07-26 · 브랜치: `jy-model`

일기 감정 분석 모델(diary_module)에 심리 이론 RAG를 연결하고, 로컬 모델과 Claude API의
감정 판단을 비교하는 하네스를 추가한 작업 기록.

---

## 1. 목적

- **연동**: 일기 텍스트 → 감정 분석(로컬 모델) → 감정에 맞는 **심리 이론 카드**를 근거로 검색
  → "심리 해석 + 행동 제안 후보" 재료 생성. (최종 서사 문장은 Claude API가 통합 — 재료 제공형)
- **검증**: 로컬 감정 모델 vs Claude API 판단의 **일치도·정확도** 측정.

---

## 2. 관할 규칙 (중요)

이 레포는 팀원별 브랜치로 나뉘어 있고, 내 관할은 `jy-model`(diary_module, klips_module).

- 남의 브랜치 파일(예: `backend/rag/`, 심리 이론카드)은 **원본 그대로 복사만** 함. 내용 수정 금지.
- 내가 **생성·수정한 것은 전부 `diary_module/` 안** (+ infer.py 호환 한 줄).

---

## 3. 파일별 작업 내역

### 내가 만든/고친 파일 (jy-model 관할)

| 파일 | 상태 | 내용 |
|---|---|---|
| `diary_module/psych_link.py` | **신규 작성** | 감정분석 출력 → 심리 RAG 브리지. 핵심 모듈. |
| `diary_module/compare_api_vs_model.py` | **신규 작성** | 로컬 vs Claude API vs gold 비교 하네스(+`--hybrid` 모드). |
| `diary_module/hybrid.py` | **신규 작성** | 로컬 우선 + 애매/저확신만 API 재확인 → 최종 감정으로 RAG. |
| `diary_module/report_one.py` | **신규 작성** | 일기 1편 → 감정+심리근거+(선택)Claude 서사 리포트. |
| `diary_module/weekly_report.py` | **신규 작성** | 일주일치 → 감정 변화·웰빙 리포트(선택 건강지표 `--metrics`). |
| `diary_module/infer.py` | **1줄 수정** | `torch.load(..., weights_only=False)` — torch≥2.6에서 자체 체크포인트 로딩되게. |

### 다른 브랜치(`lanollab-data`, minjub423)에서 **복사만** 한 파일 (수정 안 함)

| 파일 | 역할 |
|---|---|
| `backend/rag/psych_retriever.py` | ChromaDB 이론카드 검색기 (ko-sroberta 임베딩, 메타 게이팅 + 의미 유사도) |
| `backend/rag/psych_narrative.py` | 검색 카드 → 프롬프트 주입용 "근거 블록" 텍스트 가공 (LLM 호출 없음) |
| `backend/rag/safety.py` | 위기신호 안전 분기 (자살·자해 감지 → 상담자원 안내로 하드 분기) |
| `backend/rag/__init__.py`, `backend/test_psych_pipeline.py` | 패키지·테스트 |
| `preprocess/build_psych_cards_db.py` | 이론카드 JSON → ChromaDB 적재 스크립트 |
| `data/lanollab/심리학_이론카드/cards_coping_v1.json` (3장) | 스트레스-대처 교류이론 카드 |
| `data/lanollab/심리학_이론카드/cards_positive_emotion_v1.json` (8장) | 확장-구축(긍정정서) 카드 |

### 로컬 생성 산출물 (git 미추적)

- `data/vectordb/` — 위 카드 11장을 적재한 ChromaDB (빌드 결과물, 재생성 가능)
- `diary_module/compare_result.json` — 하네스 실행 결과

---

## 4. 동작 흐름

```
일기 텍스트
   │
   ▼
DiaryAnalyzer.analyze()        (diary_module/infer.py, 로컬 klue/roberta 모델)
   │  → 대분류 감정(슬픔/불안…), 세부감정, valence, 위기레벨, coarse_dist
   ▼
link_psych()                   (diary_module/psych_link.py)
   │  1) 안전 게이트: 위기 신호면 카드 대신 상담자원 안내로 분기
   │  2) 대분류 감정 → 삶의질 프록시 점수(부정=낮음, 기쁨=중간)
   │  3) 감정어로 이론카드 top-k 검색 (backend/rag)
   │  4) 근거 블록 텍스트 생성
   ▼
{ safety_level, focus_indicator, level, cards, prompt_block }
   │
   ▼
(다음 단계) Claude API가 prompt_block을 근거로 최종 서사 통합
```

**설계 포인트**
- 현 카드셋은 전부 `낮을수록_적용`(고통 개입용)이라, 부정 감정→낮음, 기쁨→중간으로 매핑
  (높음은 두지 않음)해야 카드가 매칭됨.
- 세부 감정명이 형용사형(좌절한·실망한)이라 카드 키워드(무력감·후회)와 문자열로는 안 맞지만
  **임베딩 의미 유사도**로 연결됨.

---

## 5. 실행 방법

### (1) 벡터DB 빌드 (최초 1회, ko-sroberta 임베딩 모델 자동 다운로드 ~500MB)

```bash
python preprocess/build_psych_cards_db.py
```

### (2) 연동 데모 (실제 모델로 일기 → 감정 → 심리 근거)

```bash
python -c "import os,sys; os.chdir('diary_module'); sys.path.insert(0,'.'); from infer import DiaryAnalyzer; from psych_link import analyze_and_link; az=DiaryAnalyzer(ckpt='../model_v3_e6.pt'); r=analyze_and_link(az,'이직을 괜히 했나 계속 후회된다.'); print(r['psych']['prompt_block'])"
```

### (3) 로컬 모델 vs Claude API 비교

```bash
pip install anthropic
```

`.env` 파일에 키 한 줄 (`.gitignore`됨):
```
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
python diary_module/compare_api_vs_model.py --limit 6     # 시범(몇 센트)
python diary_module/compare_api_vs_model.py               # 전체 58건(약 100원)
python diary_module/compare_api_vs_model.py --no-api      # API 없이 로컬만(키 불필요)
```

---

## 6. 검증 결과 (2026-07-26)

### 연동 (link_psych) — 정상 동작 확인

| 일기 | 감정 판정 | valence | 삶의질 | 매칭된 이론카드 |
|---|---|---|---|---|
| 발표 망침 | 슬픔/낙담한 | -0.357 | 낮음 | 인지적평가·정서중심대처·상승나선 |
| 이직 후회·자책 | 당황/열등감 | -0.741 | 중간 | 정서중심대처(후회)·인지적평가 |
| 친구와 즐거움 | 기쁨/만족스러운 | +0.758 | 중간 | 만족·기쁨·상승나선 |

### 로컬 모델 정확도 (gold 검증셋 n=58, `--no-api`)

- accuracy **0.672**, 6종 macro F1 **0.636**, 긍/부정 2분류 F1 **0.952**
- 클래스별 F1: 분노 .78 / 슬픔 .64 / 불안 .76 / **상처 .31 / 당황 .38** / 기쁨 .95
- → MODEL_CARD 수치와 일치. **상처·당황이 약점**(원 데이터 라벨 중복 때문, 문서에 경고됨).

### API 비교

- 하네스 준비 완료. 실행에 `anthropic` + `ANTHROPIC_API_KEY` 필요(사용자 직접 실행).
- 예상: 긍/부정은 거의 일치, **상처·당황에서 갈릴 가능성** 큼(모델 약점 구간 = Cohen's κ 낮은 지점).

---

## 7. 비용 (참고)

100만 토큰당 요금 · 전체 58건 실측 예상:

| 모델 | 입력/출력 | 58건 전체 |
|---|---|---|
| sonnet-5 (하네스 기본) | $3/$15 (인트로 $2/$10) | ≈ $0.08 (약 100원) |
| opus-4-8 | $5/$25 | ≈ $0.20 |
| haiku-4-5 | $1/$5 | ≈ $0.04 |

---

## 8. 알아둘 점 / TODO

- 루트에 옛 `infer.py`(미커밋)가 있어 import 섀도잉 위험 → 하네스는 `diary_module` 우선으로 회피.
  정리 권장(내 관할).
- `data/vectordb/`, `.env`, `model_v3_e6.pt`, `diary_eval.py`는 gitignore 대상(커밋 안 됨).
- 회복탄력성 카드(`cards_resilience_v1.json`)는 `_handoff_sohyunio/` 하위폴더라 로더가
  자동 제외 중. 필요 시 상위로 옮겨 재빌드하면 포함됨.
- 다음 단계: `backend/utils/claude_api.py`가 `prompt_block`을 실제로 주입해 서사 생성
  (해당 파일은 다른 관할 — 조율 필요).

---

## 9. 2026-07-26 추가 — 하이브리드 운영 · 리포트 · 입력 옵션

### 9.1 하이브리드 (로컬 우선 + 조건부 API)

검증 결론: 긍/부정·valence는 로컬이 API만큼 정확(F1 0.95). 6종 세분류만 API가 앞섬
(로컬 0.672 → API 0.793). 특히 **상처·당황**에서 격차가 큼.

→ `hybrid.py`: 로컬 예측이 **상처/당황이거나 확신도<0.5**일 때만 API로 재확인.
   그 외엔 로컬 신뢰(무료). 최종 감정으로 `psych_link` RAG 연결. 위기신호는 상담자원 분기.
   튜닝 손잡이: `ESCALATE_LABELS`, `CONF_THRESHOLD`(또는 `--conf`).

정확도 측정: `python diary_module/compare_api_vs_model.py --hybrid`
→ 하이브리드 F1, **API 호출률(≈전량의 1/3)**, 정정/훼손 순이득 출력.

### 9.2 리포트 2종

- `report_one.py` — 일기 1편 리포트(감정 요약 + valence 스파크라인 + 심리 근거 카드 + Claude 서사).
- `weekly_report.py` — 일주일 리포트(요일별 감정 궤적 + 추세/변동성 + 웰빙 서사).
  - 웰빙·건강 코멘트는 **심리 논문 카드(RAG) 인용 기반** — 학습된 건강모델 아님, 없는 수치 안 지어냄.
  - 선택 `--metrics`(수면·운동 JSON, 삼성헬스류)를 주면 감정과 연결해 서술(옵션, 미지정 시 무시).

### 9.3 입력 옵션 (공통)

- `--text "..."` 인라인 · `--stdin` 붙여넣기(Ctrl+Z) · `--file <path>`(주간, 항목 구분 `---`/빈 줄)
- `--index` / `--index-range`(gold 검증셋에서 선택, 테스트용) · `--no-api`(로컬만) · `--out`(저장)

### 9.4 API 호출 주의 (sonnet-5)

- 최신 모델은 `temperature` 등 샘플링 파라미터 거부(400) → 넣지 않음.
- **기본 thinking on** → 짧은 생성에서 `max_tokens`를 생각에 소진해 본문이 잘림.
  리포트 생성기는 `thinking={"type":"disabled"}`로 끔(잘림 방지 + 비용↓).
```
