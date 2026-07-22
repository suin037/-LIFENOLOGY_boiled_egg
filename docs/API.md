# Parallel Me — 예측 엔진 API 계약 (`/predict`)

시뮬레이션 예측 엔진(L1~L5)이 제공하는 HTTP API 스펙입니다.
**사이트(입력·화면)와 일기 모듈이 이 문서만 보고 붙일 수 있도록** 입력/출력/선택지별 동작을 정리했습니다.

레이어 구성:
- **L1** 룰베이스 생활지표(경제·삶의질·건강·창업·진학) · **L2** KNN 유사사례(GOMS+청년 YP) · **L3** EconML 인과효과 · **L4** lifelines 생존 · **L5** 종단 궤적(10년 소득 경로 + 청년 만족도 궤적 + 선택지 평행우주)
- 서버: FastAPI. 로컬 실행 시 기본 `http://localhost:8000`, 자동 문서 `http://localhost:8000/docs`
- 프론트 CORS 허용: `http://localhost:5173`

---

## 1. 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/health` | 상태 확인 |
| `POST` | `/predict` | 현재의 나 + 진로 선택 → 평행우주 추정 결과 |

---

## 2. 입력 — `POST /predict` (JSON body)

| 필드 | 타입 | 필수 | 허용값 / 범위 | 설명 |
|---|---|---|---|---|
| `age` | int | ✅ | 18 ~ 70 | 나이 |
| `sex` | string | ✅ | `"1"`=남 / `"2"`=여 | 성별 (**문자열**) |
| `major` | string | ✅ | 전공 계열 (예: `"공학"`,`"사회"`,`"자연"`) | 전공. 계열명이면 KEDI 취업률/진학률 매칭에 사용 |
| `choice` | string | ✅ | 이직 / 창업 / 진학 (자유 텍스트 OK) | 가정할 진로 선택 |
| `gpa` | float | ❌ | 0 ~ 4.5 | 학점 (현재 미사용) |
| `monthly_wage` | float | ❌ | > 0 | 현재 월소득(만원) |
| `satis_overall` | int | ❌ | 1 ~ 5 | 직무 만족도 |
| `life_satis` | int | ❌ | 1 ~ 7 | 삶의 만족도 |
| `happy` | int | ❌ | 1 ~ 7 | 행복감 |
| `is_regular` | int | ❌ | 1=정규직 / 2=비정규직 | 고용형태 (**궤적 매칭에도 사용**) |
| `firm_size` | int | ❌ | 1 ~ 9 | 기업규모 코드 |
| `edu_level` | int | ❌ | 5=고졸 6=전문대 7=대졸 8=석사 9=박사 | **교육수준 — 종단 궤적 개인화에 강력. 사이트 입력에 추가 권장** |

> 선택 항목은 안 보내도 됩니다(학습 데이터 중앙값으로 대체). 특히 **`edu_level`은 궤적을 가장 크게 가르는 변수**라, 받으면 예측 개인화가 크게 좋아집니다.
> `choice` 분류: `창업/사업/자영`→창업, `진학/대학원/유학/석사/박사`→진학, 그 외→이직.

---

## 3. 출력 — `PredictResponse` (JSON)

| 필드 | 타입 | 설명 |
|---|---|---|
| `choice` | string | 적용된 선택지 (이직/창업/진학) |
| `coverage` | string | **이 선택지에 어떤 레이어가 제공됐는지 사람이 읽는 설명** (4절) |
| `expected_wage` | float \| **null** | 유사집단 기대 월소득(L2). 이직만 |
| `causal_effect` | float \| **null** | 선택→소득 인과효과(L3, 만원). 이직만 |
| `survival_months` | float \| **null** | 평균 재직기간(L4, 개월). 이직만 |
| `neighbors` | `NeighborCase[]` | 유사 사례(L2). 이직만 채워짐 |
| `neighbor_changed_ratio` | float \| **null** | 유사집단 중 실제 이직 비율. 이직만 |
| `risk_timeline` | `{연차: 확률}` | 이직=이직확률(L4) / 창업=폐업확률 / 진학=`{}` |
| `life_indicators` | `LifeIndicator[]` | Layer1 생활지표 패널 — **선택지 무관 항상 제공** |
| `trajectory` | `TrajectoryPoint[]` | **L5 종단 소득 궤적** — 비슷한 사람들의 향후 N년(≈10년, KLIPS) 소득·이직 실제 분포 |
| `wellbeing_trajectory` | `WellbeingPoint[]` | **만족도 궤적** — 종합 만족도(1~5)의 시간 변화(청년·YP, ≈4년). 소득 궤적과 짝지어 해석. **청년 범위 밖이면 `[]`** |
| `scenario_trajectories` | `{시나리오: TrajectoryPoint[]}` | **선택지 평행우주** — `{"유지":…, "이직":…}`. **이직 choice에서만** |
| `narrative` | string | 설명 문장 (**3번 팀원 RAG가 생성**. 미설정 시 `""`) |

### `NeighborCase` (유사 사례 1건 — L2)

| 필드 | 타입 | 설명 |
|---|---|---|
| `source` | string | `"GOMS"`(전공 매칭) / `"YP"`(청년패널). **점수는 출처끼리만 비교** |
| `similarity` | float | 유사도(1에 가까울수록 유사) |
| `monthly_wage` | float \| null | 월소득(만원) |
| `job_category` | string \| null | 직종/전공 (YP는 null) |
| `satis_overall` | float \| null | 직무 만족도 |
| `life_satis` | float \| null | 삶의 만족도 (YP는 null) |
| `job_changed` | int \| null | 이직 경험(0/1) |

### `LifeIndicator` (생활지표 1건 — L1)

| 필드 | 타입 | 설명 |
|---|---|---|
| `dimension` | string | 경제 / 삶의질 / 삶의질(청년) / 정신건강 / 신체건강 / 직업환경 / 진학·취업 / 창업 |
| `indicator` / `value` / `unit` | | 지표명 / 값 / 단위 |
| `group` | string | 기준 집단 (예: "성별×연령대", "29세이하·2025") |
| `source` | string | 출처 조사명 |

### `TrajectoryPoint` (궤적 한 시점 — L5)

| 필드 | 타입 | 설명 |
|---|---|---|
| `year` | int | 시작 기준 경과 연수(0=현재) |
| `age` | int | 그 시점 나이 |
| `sample_n` | int | **이 시점까지 추적된 유사인 수 (작을수록 불확실 — 그래프에 표시 권장)** |
| `income_p25` / `income_p50` / `income_p75` | float | 월소득 하위25% / 중앙값 / 상위25% (만원) |
| `job_change_cum` | float \| null | 시작 이후 누적 이직 경험 비율 |

### `WellbeingPoint` (만족도 궤적 한 시점 — L5)

| 필드 | 타입 | 설명 |
|---|---|---|
| `year` / `age` / `sample_n` | int | 경과 연수 / 나이 / 추적 표본 수 |
| `satis_p25` / `satis_p50` / `satis_p75` | float | 종합 만족도 하위25% / 중앙값 / 상위25% (**1~5**) |

---

## 4. 선택지별 동작 (⚠️ 연동 핵심)

개인단위 레이어(L2/L3/L4)와 평행우주는 **'이직'에만** 데이터가 있어 제공됩니다. **`coverage`를 보고 판단하세요.**

| 항목 | 이직 | 창업 | 진학 |
|---|---|---|---|
| `expected_wage`/`causal_effect`/`survival_months` | ✅ | null | null |
| `neighbors` | ✅ (GOMS+YP) | `[]` | `[]` |
| `risk_timeline` | 이직확률 | 폐업확률 | `{}` |
| `life_indicators` | ✅ | ✅(+창업 생존율) | ✅(+계열 취업률·진학률) |
| `trajectory` (소득) | ✅ | ✅ | ✅ (연령대만 맞으면 항상) |
| `wellbeing_trajectory` (만족도) | 청년만 ✅ | 청년만 ✅ | 청년만 ✅ (그 외 `[]`) |
| `scenario_trajectories` | ✅ `{유지, 이직}` | `{}` | `{}` |

---

## 5. 예시 (이직, `age 27·사회·250만원`)

**요청**
```json
{ "age": 27, "sex": "2", "major": "사회", "choice": "이직", "monthly_wage": 250, "edu_level": 7 }
```
**응답** (핵심 발췌)
```json
{
  "choice": "이직",
  "coverage": "이직: 개인단위 매칭(L2)·인과(L3)·생존(L4) + 생활지표(L1)",
  "expected_wage": 246.0,
  "causal_effect": 7.9,
  "survival_months": 86.0,
  "risk_timeline": { "1": 0.028, "3": 0.18, "5": 0.336 },
  "trajectory": [
    { "year": 0, "age": 27, "sample_n": 300, "income_p25": 228, "income_p50": 240, "income_p75": 256, "job_change_cum": null },
    { "year": 3, "age": 30, "sample_n": 131, "income_p25": 228, "income_p50": 256, "income_p75": 286, "job_change_cum": 0.185 }
  ],
  "scenario_trajectories": {
    "유지": [ { "year": 0, "income_p50": 240 }, { "year": 3, "income_p50": 256 } ],
    "이직": [ { "year": 0, "income_p50": 248 }, { "year": 3, "income_p50": 264 } ]
  },
  "life_indicators": [ { "dimension": "경제", "indicator": "또래 평균 월임금(전체근로자)", "value": 269.1, "unit": "만원", "group": "29세이하·2025", "source": "고용형태별근로실태조사(KOSIS)" } ],
  "narrative": ""
}
```
> 창업/진학은 `expected_wage`·`causal_effect`·`neighbors`·`scenario_trajectories`가 비고, `life_indicators`(+창업 생존율/계열 취업률)와 `trajectory`가 채워집니다.

---

## 6. 연동 노트

### 사이트 담당 (입력·화면)
- 필수 입력 `age·sex·major·choice`. **`edu_level`(최종학력) 한 칸 추가 강력 권장** — 궤적 개인화의 핵심.
- **`coverage` 먼저 읽고** 화면 구성. 창업/진학이면 개인단위 카드는 숨기거나 "통계 기반" 안내로.
- **`trajectory`** → 소득 궤적 곡선(p25~p75 밴드 포함). `sample_n`이 작아지는 뒤 연차는 흐리게/불확실 표시.
- **`scenario_trajectories`** → 유지 vs 이직 **두 곡선 겹쳐** 평행우주 시각화. 두 선의 격차 = L3 인과효과.
- `neighbors[].source`로 "비슷한 졸업자(GOMS)/청년(YP)" 구분. similarity는 source 다르면 직접 비교 금지.

### 일기 모듈 담당
- 일기에서 추출한 신호(만족도·감정 등)를 **선택 입력**(`satis_overall`·`life_satis`·`happy`)으로 채워 개인화.
- 새 입력이 필요하면 이 문서 기준으로 스키마 확장 협의.

### narrative 경계
- `narrative`는 엔진이 아니라 **심리 RAG(3번)** 담당. 엔진은 위 수치(특히 `life_indicators`·`trajectory`)를 근거로 제공.

---

## 7. 실행
```bash
cd backend
uvicorn main:app --reload         # http://localhost:8000/docs
```
> 산출물 pkl(`backend/models/artifacts/*.pkl`)·`data/` lookup·`data/raw/klips/klips_base.pkl`(궤적용)이 있어야 각 레이어가 동작합니다. 없는 소스는 자동 skip. 서버 첫 요청 시 KLIPS 로드로 잠깐 느릴 수 있음(이후 캐시).

## 8. 확장 예정
- 진학: 개인단위 추적 모델 (현재는 계열 취업률·진학률 집계)
- 궤적: 소득 외 차원(만족도·삶의질) 시간 변화
- 입력: 일기 모듈 연동에 따른 스키마 확장

---
_예측 엔진(suin-model 브랜치) 기준. 스키마 변경 시 함께 갱신._
