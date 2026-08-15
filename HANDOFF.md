# 인수인계 — 2026-08-15

새 세션에서 이 파일부터 읽으면 이어서 작업할 수 있습니다.
현재 브랜치: `integration-2026-08-14`

---

## 지금 살아있는 것

| | 주소 |
|---|---|
| 프론트 (Vercel) | https://parallel-me-theta.vercel.app |
| 백엔드 (Railway) | https://parallel-me-api-production.up.railway.app |
| Railway 프로젝트 | https://railway.com/project/c6258526-a258-4f2a-aa67-6f6009fd9b08 |

배포는 **GitHub 연결 없이 로컬에서 CLI로** 올린 상태입니다. 재배포 방법:

```bash
# 프론트
cd frontend && npx vercel --prod
# 백엔드
npx @railway/cli up
```

Railway 환경변수는 `ANTHROPIC_API_KEY`, `CORS_ORIGIN_REGEX` 두 개가 설정돼 있습니다.
(대시보드 저장이 두 번 실패해서 CLI `railway variables --set` 으로 넣었습니다.)

---

## 진행 중인 작업 — 아바타 고도화

**끝난 것**: 남성 헤어가 7종뿐이라 여성(21종)에 비해 부족하던 문제를 21종으로 맞췄습니다(`05a4d0c`).

이때 드러난 라이브러리 제약이 중요합니다. `react-nice-avatar` 의 남성 헤어
`thick`·`mohawk` 은 **`hairColorRandom: true` 가 있어야만 `hairColor` 가 반영**됩니다
(없으면 thick 은 대부분, mohawk 은 전부 고정 검정). 실제 렌더링으로 확인했고,
이 플래그는 색만 바꾸고 모양은 건드리지 않습니다. 여성 헤어는 반대로 플래그가 없어야
제대로 칠해져서, **남성 프리셋에만** 붙였습니다. → `frontend/src/data/avatarOptions.js`

**다음**: DiceBear 로 교체를 검토 중이었습니다. 이유는 `react-nice-avatar` 의 한계 —
남성 헤어가 3종(숏·덥수룩·모히칸)이 전부이고 수염이 없으며, 색 처리도 스타일마다 제각각.

교체 시 영향받는 파일:

- `frontend/src/components/Avatar.jsx` — 렌더링
- `frontend/src/components/AvatarBuilder.jsx` — 화살표 스테퍼 UI
- `frontend/src/data/avatarOptions.js` — 프리셋 정의
- `frontend/src/data/avatarImage.js` — 결과 카드용 이미지 변환
- `frontend/src/components/result/AvatarComparison.jsx` — 결과 화면 비교
- 기존 사용자에게 저장된 아바타 설정 마이그레이션 (`profile.avatarConfig`)

---

## 남은 과제

1. **학습 모델 `.pkl` 이 저장소에 없습니다.** `python scripts/check_model_assets.py` 로
   확인 가능. KNN·EconML·lifelines 서빙 모델이 전부 MISSING 이라 예측이 폴백(데모) 값으로
   나옵니다. 배포된 백엔드도 같은 상태입니다.
2. **SQLite → Neon 마이그레이션.** 일기·리포트가 `diary_module/qmode/qmode_store.db`
   파일에 저장되는데, Railway 는 재배포마다 파일시스템이 초기화됩니다. 즉 **지금은 배포할
   때마다 사용자 일기가 사라집니다.** 실사용자를 받기 전에 옮겨야 합니다.
   (`diary_module/qmode/api.py` 가 `sqlite3` 를 직접 호출 — 31개 라우트)
3. **공개 저장소에 개인 단위 데이터.** `data/clean/` 의 3개 파일(goms_clean.csv,
   yp_clean.csv, yp_spells.csv — 약 6.8MB, 11,499행)이 `origin/main` 에 올라가 있습니다.
   `.gitignore` 규칙보다 먼저 커밋돼서 무시가 안 먹은 상태입니다.
   → 최종본은 **새 저장소를 파서** 올릴 계획이며, 기존 저장소는 그때 정리 예정.

---

## 통합 시 적용한 규칙 (참고)

팀 브랜치 6개를 병합할 때 **"파일별로 실제 최종 수정이 더 최신인 쪽"** 을 기준으로 했습니다.
단, 머지 커밋의 committer 날짜는 병합 시각이라 무의미하므로 `--no-merges` + author 날짜로
판정했습니다.

규칙만으로 정할 수 없어 따로 판단한 곳:

- **`UniverseMap`** — 2D 달띠 지도(jiyunjung0)와 3D three.js 우주(sohyunio) 두 구현이
  충돌. `App.jsx` 가 `MyUniverseV2.jsx`(3D)를 라우팅하므로 3D 세트를 채택.
  → `frontend/src/screens/MyUniverse.jsx`(2D판)는 **라우팅 안 된 레거시**로 남아 있습니다.
  import 하는 곳이 없어 번들에서 빠지지만, 다시 라우팅하면 옛 props 로 호출해 깨집니다.
- **`.gitignore`** — jy-model 쪽의 `*.csv`·`data/vectordb/` 전면 차단이 기존 정책(공개
  집계표·팀 공유 카드 DB 추적 유지)과 충돌해 그 두 줄만 제외하고 합집합 처리.

---

## 배포하며 잡은 버그 3건

1. `cryptography` 미설치 → `backend/main.py:99` 가 qmode 마운트를 `try/except` 로 조용히
   삼켜서 일기·챗·성향 API 26개가 통째로 사라져 있었음
2. CORS 가 localhost 전용 → 배포 프론트에서 API 호출 100% 차단. `CORS_ORIGIN_REGEX`
   환경변수로 열 수 있게 수정
3. `VITE_QMODE_BASE` 기본값에 `/qmode` 누락 → 성향 리포트·회사분석·채용공고 분석·관계분석·
   커리어 검사가 로컬에서도 404 였음

---

## 설치된 도구

프로젝트 `.claude/skills/`: `agent-browser`, `find-skills`, `design-taste-frontend`, `mcp-builder`
전역 `~/.claude/`: GSD v1.10.0 (스킬 71개 + 훅 17개 + 스테이터스라인)

GSD 가 전역 `settings.json` 을 새로 만들었으므로 **모든 Claude Code 세션의 동작이 달라집니다.**
