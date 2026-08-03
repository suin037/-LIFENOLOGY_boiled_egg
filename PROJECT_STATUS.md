# Parallel Me — 프로젝트 현황 & 인수인계 (2026-07-24)

> **목적**: 이 파일 하나로 새 채팅/새 세션이 사전지식 없이 맥락을 잡고 바로 이어서 작업할 수 있게 정리한 마스터 문서. (팀 병합 → 전체 파이프라인 배선 → 일기모듈 → 프론트 연결 → 지표계약 정리까지 완료 상태)

---

## 1. 프로젝트 한 줄
**Parallel Me** = 삶의 갈림길(이직/창업/진학)에 선 청년에게, **"너와 데이터가 비슷한 실제 사람들이 각 선택을 갔을 때 어떻게 살았는지"**(만족도·소득·후회)를 **공공·패널 데이터로 계산**해 **두 선택지를 평행우주로 비교**해주는 인생 시뮬레이터. (삼성생명 라이프놀로지 랩 3기)
**차별점**: AI가 지어내는 게 아니라 **실데이터에서 도출** + 심리학 RAG로 서사·근거 제공.

## 2. 팀 4파트 & 담당
| # | 파트 | 담당 | 산출물 |
|---|---|---|---|
| 1 | **예측 엔진**(수치 백엔드) | 수인(나) | `backend/`(엔진 L1~L5, /simulate), `indicators.py` |
| 2 | **일기 분석 모듈** | jy(jiyunjung) | `diary_module/`, 브리지 `backend/diary_bridge.py` |
| 3 | **심리학 RAG(서사 근거)** | 민주(minjub) + sohyun | `backend/rag/`(psych_retriever·narrative·safety), 이론카드 |
| 4 | **사이트+입력 설계** | sohyun | `frontend/`(React/Vite) |

## 3. 엔진 구조 (5레이어 + 지표 산출기)
| 레이어 | 방법 | 데이터 | 출력 | 아티팩트(pkl) |
|---|---|---|---|---|
| **L1** 룰베이스 | pandas 집계/lookup | GOMS·dgroup | 생활지표(경제·삶의질·건강·창업 생존율·진학 취업률) | (lookup csv/json) |
| **L2** KNN 매칭 | NearestNeighbors | GOMS+YP | 유사인물(이웃) 리스트 | `knn.pkl`,`knn_yp.pkl`,`encoders.pkl` |
| **L3** 인과추론 | EconML(LinearDML) | KLIPS/YP | 이직 순효과 ATE+CI | `econml.pkl`,`econml_klips.pkl`,`econml_yp.pkl` |
| **L4** 생존분석 | lifelines | KLIPS/YP | 후회/이탈 리스크 곡선 + C-index | `lifelines*.pkl` |
| **L5** 종단 궤적 | KLIPS 추적 | KLIPS | 소득·만족도 궤적, 평행우주(유지 vs 이직) | (klips_base.pkl 런타임) |
| **지표 산출기** ⭐신설 | 위 출력 집계 | — | **경제적안정도/성장가능성/삶의질 0~1** | `backend/indicators.py` |

> ⭐ "지표 산출기"는 이번에 새로 만든 컴포넌트. 자세한 배경은 §7(레이어2 XGBoost 정리) 참고.

**엔드포인트**: `/health`, `/predict`(선택 1개), `/compare`(선택 A/B 비교뷰), **`/simulate`(전체 파이프라인)**

## 4. /simulate 전체 파이프라인 (핵심)
```
입력(프로필 + 선택A/B + [일기])
  └▶ (일기모듈) 일기→감정신호(valence) → satis_* 개인화 + 서사 컨텍스트, 위기 시 상담 분기
  └▶ 엔진 L1~L5 수치(/compare)
       └▶ 지표 산출기 → 3지표(경제적안정도/성장가능성/삶의질, 0~1)
            └▶ [민주 psych RAG] 초점지표 → 심리 이론카드 top-k (근거+개입+출처)
            └▶ [stat_evidence] 통계 근거 청크(생존율·소득만족 등)
                 └▶ Claude 서사(A/B/비교) — "제공된 수치·근거 안에서만, 숫자 창작 금지"
                      └▶ 프론트 5탭 렌더(요약/비교/유사인물/인과/곡선)
```
- 기본 서사 모델 **Haiku 4.5**(`claude-haiku-4-5`), `.env`의 `CLAUDE_MODEL`로 변경. 호출당 ≈8~9원.
- **키(.env) 없으면**: 수치·3지표·근거는 반환, 서사만 skip(`api_used:false`).
- **안전분기**(민주 `rag/safety`): 위기 신호 시 서사 대신 상담 안내(109·1577-0199·1388).

## 5. 활용 데이터셋
**커리어(핵심)**
- **GOMS** 대졸자직업이동경로조사 (횡단면, L1/L2, `data/clean/goms_clean.csv`, ~11,318명)
- **YP2021** 청년패널 (25~35 매칭, L2/L3/L4, `yp_clean.csv`·`yp_spells.csv`)
- **KLIPS** 한국노동패널 (종단, L3/L4/L5, `data/raw/klips/klips_base.pkl`). ⚠️ 이직은 변수가 아니라 **도출값**: 신호A(일자리 시작연도 늦어짐)+신호B(직종코드 변경).
- **KEDI** 교육통계 (진학 취업률/진학률 lookup)
- **KOSIS**: 기업생멸행정통계(창업 생존율/폐업률), 고용형태별근로실태조사(임금), 사회통합실태조사, 청년삶의질2025, 정신건강실태조사, 지표누리 국민삶의질 → `data/dgroup/`

**건강(보조, 민주)** — `data/lanollab/`: KNHANES 국민건강영양조사, CHS 지역사회건강조사, KWCS 근로환경조사

**심리학(RAG 근거)** — 이론카드+청크: Lazarus & Folkman 스트레스-대처, Fredrickson 확장-구축(긍정정서), Connor-Davidson 회복탄력성(CD-RISC), Ryff 심리적 웰빙, LIWC/KLIWC 언어분석

**일기 감정(모듈2 학습용)** — AI Hub 감성대화말뭉치(60감정 27만문장)·웰니스 대화

> ⚠️ 개인단위 원자료(KLIPS/YP raw, *.sav, data/clean, *.pkl)는 **gitignore**(재배포 금지). 각 환경에서 학습 스크립트 재실행 or 로컬 보유분 사용.

## 6. 지금까지 한 것 (실험·작업 이력)
1. **팀 4브랜치 병합** → `integration`/`suin-model`. 브랜치들이 **공통 조상 없는 독립 히스토리**라, octopus 대신 **경로별 오버레이**로 통합(충돌 0). (엔진=suin-model, 프론트+데이터+심리RAG=sohyun, 건강데이터=lanollab, 일기모듈=jy-model)
2. **엔진 스모크 테스트**(실데이터): `test_compare.py` 통과, `/predict`·`/compare` HTTP 200, L1~L5 정상. **L3 이직 ATE +27.8만원(95% CI +21.0~+34.6, LinearDML), L4 C-index 0.754**(5-fold, n=10,173).
3. **전체 파이프라인 배선**: RAG 런타임 검색 + `/simulate`(수치→근거→서사) 신설.
4. **실 API 검증**(Haiku): 서사가 엔진 수치·RAG 통계에만 근거(숫자 창작 없음) 확인. 일기 넣으면 회피/긍정 등 신호가 서사에 반영.
5. **일기모듈 연결**: `diary_bridge.py` — valence→satis 개인화 + 위기 L3 상담/L2 지원첨부. 감정모델(HF ckpt+torch) 있으면 사용, 없으면 규칙기반(kiwipiepy) 폴백.
6. **프론트 풀스택 연결**: `api.js` 어댑터로 /simulate→화면 매핑, 결과 5탭 실데이터 렌더 확인(스크린샷).
7. **민주 psych RAG 정본화 + 지표 산출기 신설**: 중복 RAG 정리, 3지표 계약 확정(§7).

## 7. "레이어2 XGBoost" 이슈 정리 (중요)
- **XGBoost는 구현된 적 없음** — 초기 기획안(life2vec+XGBoost)에만 있던 표현. 실제 스택 = KNN(L2)+EconML(L3)+lifelines(L4). 코드·requirements에 XGBoost 없음.
- **진짜 문제 = ①용어 충돌 ②담당자 없던 3지표 산출기**. "레이어2"가 (모델팀)KNN 매칭 vs (RAG팀)3지표 산출기 두 뜻으로 쓰임.
- **해결**: 용어를 **L2=KNN 매칭 / "지표 산출기"=별개 단계**로 확정. 3지표 산출기를 `backend/indicators.py`로 **신설**(수인 담당).
- **3지표 계약(확정)**: 키 **`경제적안정도/성장가능성/삶의질`(언더스코어 없음)**, 값 **연속 0~1**, 버킷팅은 `psych_retriever.INDICATOR_THRESHOLDS`(로더)에서. `indicator_scores` override 가능.
- 상세: 프로젝트 문서 `claude/지표계약_레이어2정리_2026-07-24.md`.

## 8. Git / 브랜치 / 실행 상태
- **정본 브랜치**: `suin-model`(=통합 최종). 클라우드 최신 커밋 `a286eae`.
  - 히스토리: engine → sohyun → lanollab → diary(jy) → pipeline → Haiku → diary배선 → frontend → psych정본화+indicators → requirements ASCII.
- **내 로컬(C:\projects\parallel-me)**: `integration-final` 브랜치 체크아웃됨(통합본 있음). 시스템 **Python 3.11**로 실행.
  - `.env`(루트, gitignore)에 `ANTHROPIC_API_KEY` 넣음. 데이터·pkl 로컬 보유.
  - 실행: `cd backend` → `python -m uvicorn main:app --reload` → 브라우저 `http://127.0.0.1:8000/docs`.
  - ⚠️ `pip install -r`이 한글 주석 때문에 cp949 에러났었음 → 클라우드에서 ASCII로 수정(`a286eae`). 로컬은 패키지 직접 설치로 우회함.
- **GitHub(origin)**: **아직 push 안 함**. `origin/suin-model`은 옛 revert 히스토리(db15371). 통합본으로 올리려면 팀 합의 후 `git push --force-with-lease origin suin-model`.
- **번들**: `parallel-me-suin-model.bundle`(레포에 넣어둠). 새로 받을 땐 `git fetch <bundle> suin-model:<브랜치>` → `git stash -u`(로컬 untracked 팀파일 회피) → `git checkout`.

## 9. 알려진 한계
- 만족도는 선택 A/B로 안 갈림(YP 직무만족=취업자만; 배경 지표로 표시).
- 10년 궤적 그리드는 데이터 한계로 일부 빔(없는 시점은 정직하게 빈칸).
- 진학/창업은 개인단위 인과·매칭 미제공(추적 데이터 부재) → L1 통계로만.
- `indicators.py` 산출식은 **초안**(엔진값 파생 인덱스) — 임계값·가중치 튜닝 필요.
- 심리카드 정본 검색은 chromadb+sentence-transformers 벡터DB 필요; 없으면 카드 JSON **폴백**으로 동작(검증/데모용).

## 10. 다음 할 것 (TODO)
- [ ] 온보딩/입력 화면(`InputScreen`)에서 사용자 입력(프로필·선택·일기) → `runSimulation` 연결 (현재는 기본 프로필 데모).
- [ ] 일기 감정모델 체크포인트 연결(`DIARY_CKPT`=best.pt, transformers/torch) — 현재 규칙기반 폴백.
- [ ] 심리카드 벡터DB 빌드(`preprocess/build_psych_cards_db.py`, chromadb) + `indicators` 임계값 튜닝.
- [ ] 민주 `SCHEMA.md`의 "레이어 2(XGBoost)" → "지표 산출기"로 문구 정정.
- [ ] GitHub push(팀 합의 후) + 원격 정리.
- [ ] (선택) 프론트 온보딩→결과 흐름 GIF, 원본 raw 재전처리(로컬).

## 11. 로컬 실행 요약 (빠른 참조)
```
# 1) 최신 코드 (이미 integration-final 체크아웃 상태면 생략)
git fetch parallel-me-suin-model.bundle suin-model:integration-final
git stash -u && git checkout integration-final
# 2) 패키지 (시스템 Python 3.11)
python -m pip install fastapi "uvicorn[standard]" pydantic pydantic-settings python-dotenv pandas numpy scikit-learn econml lifelines pyreadstat anthropic joblib kiwipiepy
# 3) .env (루트): ANTHROPIC_API_KEY=sk-ant-...
# 4) 백엔드
cd backend
python -m uvicorn main:app --reload      # → http://127.0.0.1:8000/docs
# 5) (선택) 프론트 — 새 터미널
cd frontend && npm install && npm run dev # → http://localhost:5173
```

## 12. 프로젝트 내 참고 문서
- `claude/지표계약_레이어2정리_2026-07-24.md` — 3지표 계약 & XGBoost 정리
- `claude/병합결과_integration_2026-07-24.md` — 병합·파이프라인 상세
- `claude/예측엔진_현황_인수인계.md` — 엔진 레이어·데이터·아티팩트 키
- `claude/프로젝트_개요_및_병합브리핑.md` — 초기 개요
- `모델 학습 layer` — 레이어별 방법 요약
- (레포) `docs/API.md`(계약), `docs/compare_example.json`(샘플), `docs/FRONTEND_CONTRACT_TODO.md`
