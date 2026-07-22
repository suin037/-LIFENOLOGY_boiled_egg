# Parallel Me — 예측 엔진 API 계약 (`/predict`)

시뮬레이션 예측 엔진(L1~L4)이 제공하는 HTTP API 스펙입니다.
**사이트(입력·화면)와 일기 모듈이 이 문서만 보고 붙일 수 있도록** 입력/출력/선택지별 동작을 정리했습니다.

- 담당: 예측 모델(시뮬레이션 엔진) — L1 룰베이스 / L2 KNN / L3 EconML / L4 lifelines
- 서버: FastAPI. 로컬 실행 시 기본 `http://localhost:8000`
- 프론트 CORS 허용 오리진: `http://localhost:5173` (Vite 기본)
- **자동 문서**: 서버 실행 후 `http://localhost:8000/docs` (Swagger UI) — 필드 목록·타입이 코드에서 자동 생성됩니다. 이 문서는 그 위에 "선택지별 동작·예시·연동법"을 얹은 사람용 설명서입니다.

---

## 1. 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/health` | 상태 확인. `{"status":"ok","model":"..."}` |
| `POST` | `/predict` | 현재의 나 + 진로 선택 → 평행우주 추정 결과 |

---

## 2. 입력 — `POST /predict` (JSON body)

| 필드 | 타입 | 필수 | 허용값 / 범위 | 설명 |
|---|---|---|---|---|
| `age` | int | ✅ | 18 ~ 70 | 나이 |
| `sex` | string | ✅ | `"1"`=남 / `"2"`=여 | 성별 (GOMS 코드, **문자열**) |
| `major` | string | ✅ | 전공 계열 (예: `"공학"`,`"사회"`,`"자연"`…) | 전공. 계열명이 들어오면 KEDI 취업률/진학률 매칭에 사용 |
| `choice` | string | ✅ | 이직 / 창업 / 진학 (자유 텍스트 OK) | 가정할 진로 선택. "대학원 진학","사업" 등도 자동 분류됨 |
| `gpa` | float | ❌ | 0 ~ 4.5 | 학점 (선택) |
| `monthly_wage` | float | ❌ | > 0 | 현재 월소득(만원) |
| `satis_overall` | int | ❌ | 1 ~ 5 | 직무 만족도 |
| `life_satis` | int | ❌ | 1 ~ 7 | 삶의 만족도 |
| `happy` | int | ❌ | 1 ~ 7 | 행복감 |
| `is_regular` | int | ❌ | 1=정규직 / 2=비정규직 | 고용형태 |
| `firm_size` | int | ❌ | 1 ~ 9 | 기업규모 코드 |

> 선택 항목(상태·성향)은 **안 보내도 됩니다.** 안 보내면 학습 데이터 중앙값으로 대체되고, 보낼수록 매칭이 개인화됩니다.

`choice` 분류 규칙: 텍스트에 `창업/사업/자영` → **창업**, `진학/대학원/유학/석사/박사` → **진학**, 그 외 → **이직**.

---

## 3. 출력 — `PredictResponse` (JSON)

| 필드 | 타입 | 설명 |
|---|---|---|
| `choice` | string | 적용된 선택지 (이직/창업/진학) |
| `coverage` | string | **이 선택지에 어떤 레이어가 제공됐는지 사람이 읽는 설명** (아래 4절) |
| `expected_wage` | float \| **null** | 유사집단 기대 월소득(L2). 이직만, 그 외 `null` |
| `causal_effect` | float \| **null** | 선택→소득 인과효과(L3, 만원). 이직만, 그 외 `null` |
| `survival_months` | float \| **null** | 평균 재직기간(L4, 개월). 이직만, 그 외 `null` |
| `neighbors` | `NeighborCase[]` | 유사 사례. 이직만 채워짐, 그 외 `[]` |
| `neighbor_changed_ratio` | float \| **null** | 유사집단 중 실제 이직 비율. 이직만 |
| `risk_timeline` | `{연차: 확률}` | 이직=이직 누적확률(L4) / 창업=폐업 누적확률 / 진학=`{}` |
| `life_indicators` | `LifeIndicator[]` | **Layer1 생활지표 패널** — 선택지 무관 항상 제공 (넓은 인생 차원) |
| `narrative` | string | 설명 문장 (**3번 팀원 RAG가 생성**) |

### `NeighborCase` (유사 사례 1건)

| 필드 | 타입 | 설명 |
|---|---|---|
| `source` | string | 매칭 풀 출처: `"GOMS"`(전공 매칭) / `"YP"`(청년패널). **점수는 출처끼리만 비교** |
| `similarity` | float | 유사도(1에 가까울수록 유사) |
| `monthly_wage` | float \| null | 월소득(만원) |
| `job_category` | string \| null | 직종/전공 (YP는 `null`) |
| `satis_overall` | float \| null | 직무 만족도 |
| `life_satis` | float \| null | 삶의 만족도 (YP는 `null`) |
| `job_changed` | int \| null | 이직 경험(0/1) |

### `LifeIndicator` (생활지표 1건)

| 필드 | 타입 | 설명 |
|---|---|---|
| `dimension` | string | 차원: 경제 / 삶의질 / 삶의질(청년) / 정신건강 / 신체건강 / 직업환경 / 진학·취업 / 창업 |
| `indicator` | string | 지표명 (예: "또래 평균 월임금") |
| `value` | float | 값 |
| `unit` | string | 단위 (%, 만원, 점 등) |
| `group` | string | 이 값의 기준 집단 (예: "성별×연령대", "29세이하·2025") |
| `source` | string | 출처 조사명 |

---

## 4. 선택지별 동작 (⚠️ 연동 시 핵심)

**개인단위 레이어(L2/L3/L4)는 '이직'에만 인과 데이터가 있어 제공됩니다.** 창업·진학은 집계 통계(L1) 중심이라 개인단위 필드가 `null`입니다. **`coverage` 필드를 보고 무엇이 있는지 판단하세요.**

| 항목 | 이직 | 창업 | 진학 |
|---|---|---|---|
| `expected_wage` / `causal_effect` / `survival_months` | ✅ 값 | `null` | `null` |
| `neighbors` | ✅ (GOMS+청년 YP) | `[]` | `[]` |
| `risk_timeline` | 이직 누적확률 | **폐업** 누적확률 | `{}` |
| `life_indicators` | ✅ | ✅ (+창업 생존율) | ✅ (+계열 취업률·진학률) |
| `narrative` | ✅ | ✅ | ✅ |

청년(≤31세)이면 `neighbors`에 GOMS와 YP(청년패널)가 **섞여서** 옵니다(`source`로 구분).

---

## 5. 예시

### 5-1) 이직 — `age 27, 사회`

**요청**
```json
{ "age": 27, "sex": "2", "major": "사회", "choice": "이직", "monthly_wage": 250, "satis_overall": 3 }
```
**응답** (일부 축약)
```json
{
  "choice": "이직",
  "coverage": "이직: 개인단위 매칭(L2)·인과(L3)·생존(L4) + 생활지표(L1)",
  "expected_wage": 246.0,
  "causal_effect": 7.95,
  "survival_months": 86.0,
  "neighbors": [
    { "source": "GOMS", "similarity": 0.76, "monthly_wage": 250.0, "job_category": "영업·판매·운전·운송", "satis_overall": 3.0, "life_satis": 5.0, "job_changed": 0 },
    { "source": "YP",   "similarity": 1.00, "monthly_wage": 250.0, "job_category": null, "satis_overall": 3.0, "life_satis": null, "job_changed": 0 }
  ],
  "neighbor_changed_ratio": 0.0,
  "risk_timeline": { "1": 0.028, "3": 0.18, "5": 0.336 },
  "life_indicators": [
    { "dimension": "경제", "indicator": "이직자 소득변화(중앙값)", "value": 11.1, "unit": "%", "group": "이직 경험자 2,449명", "source": "대졸자직업이동경로조사(GOMS)" },
    { "dimension": "경제", "indicator": "또래 평균 월임금(전체근로자)", "value": 269.1, "unit": "만원", "group": "29세이하·2025", "source": "고용형태별근로실태조사(KOSIS)" }
  ],
  "narrative": "(Claude 생성 — 3번 팀원 RAG)"
}
```

### 5-2) 창업 — `age 30, 공학`
```json
{
  "choice": "창업",
  "coverage": "창업: 생활지표(L1) + 창업 생존/폐업 통계. 개인단위 인과·매칭은 창업 추적 데이터 부재로 미제공",
  "expected_wage": null, "causal_effect": null, "survival_months": null,
  "neighbors": [], "neighbor_changed_ratio": null,
  "risk_timeline": { "1": 0.379, "3": 0.545, "5": 0.646 },
  "life_indicators": [ { "dimension": "창업", "indicator": "창업 3년 생존율", "value": 45.5, "unit": "%", "group": "전체 업종", "source": "기업생멸행정통계" } ],
  "narrative": "..."
}
```

### 5-3) 진학 — `age 26, 자연`
```json
{
  "choice": "진학",
  "coverage": "진학: 생활지표(L1) + 계열별 취업률·진학률(KEDI). 개인단위 인과·매칭은 진학 추적 데이터 부재로 미제공",
  "expected_wage": null, "causal_effect": null, "survival_months": null,
  "neighbors": [], "risk_timeline": {},
  "life_indicators": [ { "dimension": "진학/취업", "indicator": "자연 계열 진학률(대학원 등)", "value": 17.0, "unit": "%", "group": "자연·2024", "source": "KEDI 고등교육 졸업 후 상황" } ],
  "narrative": "..."
}
```

---

## 6. 연동 노트

### 사이트 담당 (입력·화면)
- 입력 폼 → 2절 필드로 매핑해 `POST /predict` 호출. 필수는 `age·sex·major·choice` 4개.
- **`coverage`를 먼저 읽고 화면을 그리세요.** 창업/진학이면 `expected_wage`·`causal_effect` 등이 `null`이니 그 카드는 숨기거나 "해당 선택지는 통계 기반" 안내로 대체.
- `life_indicators`는 개수가 가변(10~17개). `dimension`별로 묶어서 섹션 렌더링하면 깔끔합니다.
- `neighbors[].source`로 "비슷한 졸업자(GOMS) / 비슷한 청년(YP)"를 나눠 보여줄 수 있어요. **similarity 점수는 source가 다르면 직접 비교하지 마세요**(피처 수가 달라서).

### 일기 모듈 담당
- 현재 입력은 구조화 필드(age/sex/major/choice + 상태·성향)입니다. 일기에서 추출한 신호(예: 추정 만족도·행복감)를 **선택 항목**(`satis_overall`·`life_satis`·`happy` 등)으로 채워 보내면 매칭이 개인화됩니다.
- 일기 기반의 새 입력이 더 필요하면 스키마 확장을 논의해 주세요(입력 계약은 이 문서를 기준으로 함께 갱신).

### narrative 경계
- `narrative`는 이 엔진이 채우지 않고 **심리 RAG(3번)**가 생성합니다. 엔진은 위 수치(특히 `life_indicators`)를 근거로 넘겨줍니다.

---

## 7. 실행

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload         # http://localhost:8000
# 자동 문서: http://localhost:8000/docs
```

> 산출물 pkl(`backend/models/artifacts/*.pkl`)이 있어야 L2~L4가 동작합니다. 없으면 `python train_models.py`, `python klips_train.py`, `python train_yp.py`로 생성하세요. L1 지표는 `data/dgroup`·`data/lanollab` lookup CSV를 읽습니다(없는 소스는 자동 skip).

## 8. 확장 예정
- 진학: 개인단위 추적 모델(현재는 계열 취업률·진학률 집계만)
- 입력: 일기 모듈 연동에 따른 스키마 확장

---
_이 문서는 예측 엔진(suin-model 브랜치) 기준입니다. 스키마 변경 시 함께 갱신해 주세요._
