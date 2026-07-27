# qmode → 예측 서사 연결 인수인계

질문형 일기(qmode)가 뽑아낸 **성향·취향·언어신호**를, 예측(평행우주 시나리오) 서사에
반영하기 위한 연결 명세. **backend 원본은 수정하지 말 것** — qmode가 주는 '재료'를
예측 서사 프롬프트에 주입만 하면 된다(재료 제공형).

---

## 0. 한 줄 요약

qmode는 세 덩어리의 **재료(텍스트 블록 + 수치)** 를 준다.
예측 서사 생성 프롬프트에 **그대로 끼워 넣으면** 개인화된 시나리오가 나온다.
예측 **모델(KNN·EconML·lifelines)의 피처로는 넣지 않는다**(학습 피처 고정).

---

## 1. qmode가 주는 재료 (호출법)

모두 `diary_module/qmode/` 안. `sessions`는 `session.analyze_session()` 결과 리스트
(보통 1주일치). `diary_metrics`는 아래 ①에서 나온다.

```python
import sys; sys.path.insert(0, "diary_module")
from qmode.session import build_diary_metrics
from qmode import disposition, interests, value_ranking

# ① 언어신호 누적 (답변만 반영, 길이게이트·부러움 분기 적용)
agg = build_diary_metrics(sessions)
#   agg["diary_metrics"]  → {emotion_valence, coping_balance, insight_ratio, ...} 또는 None(<5답변)
#   agg["per_question"]   → 질문별 평균 신호
#   agg["envy"]           → 부러움 판정(benign만 가치축 신호)

# ② 온보딩 가치순위 → 5축 가중치 (유저가 매긴 순위 리스트)
vw = value_ranking.axis_weights(ranked_card_ids)   # {"경제":0.30, "관계":0.30, ...} 합=1

# ③ 성향(가치+전달스타일) 통합 블록
disp = disposition.analyze_disposition(sessions, agg["diary_metrics"], value_weights=vw)
#   disp["block"]           → 프롬프트에 넣을 텍스트(내용 강조순서 + 전달스타일)
#   disp["delivery_style"]  → {flags, guide}  (톤 조절용)

# ④ 취향·관심사(라포)
interest_block = interests.build_block(interests.collect(sessions))   # 텍스트(없으면 "")
```

---

## 2. 예측 서사 프롬프트에 넣는 법

예측 서사를 만드는 Claude 프롬프트(backend/utils/claude_api.py의 서사 생성부)에
**아래 두 블록을 컨텍스트로 추가**하면 된다. 형식은 이미 사람이 읽는 지시문이라 가공 불필요.

```
[예측 결과 요약 … 기존 그대로 …]

{disp["block"]}          # ← 내용 강조 순서 + 전달 스타일
{interest_block}         # ← 취향(라포·비유 재료)

지시: 위 '서술 우선순위'가 높은 축부터 시나리오를 서술하고,
      '전달 스타일'에 맞춰 톤을 잡아라. 취향은 자연스러울 때만 비유로.
      단정하지 말 것(성향은 초기값이며 갱신됨).
```

**효과**: 관계·안정 1순위 유저 → 관계·안정 결과부터 서술 / 회피경향 유저 →
"작은 한 걸음"으로 제안 / 클라이밍 좋아하면 "한 홀드씩 잡듯" 같은 비유.

---

## 3. 가치 축 → 예측 지표 매핑

`value_ranking.AXIS_TO_INDICATOR`:

| 가치 축 | 예측 지표 |
|---|---|
| 경제 | 경제적안정도 |
| 성장 | 성장가능성 |
| 관계 / 자기실현 / 안정 | 삶의질(프록시) |

→ "이 유저는 경제 1순위" 면 예측의 **경제적안정도·소득 궤적을 먼저·비중 있게** 서술.

---

## 4. ⚠️ confidence / recency (아직 미구현 — 예측 쪽에서 함께 설계 요망)

지금 재료엔 **"얼마나 쌓였는지"** 가중치가 없다. 예측에서 얕은 데이터로 확신하면 안 되므로:

- `agg["n_answers"]` 적으면(예: <10) → 서사를 **"아직 단정 어렵지만…"** 톤으로.
- 가치순위는 **온보딩 초기값** → 일기 쌓일수록 언어지표로 갱신. 데이터 적으면 순위 위주,
  많으면 일기신호 위주로 무게 이동.
- 오래된 신호는 **감쇠(recency)** 권장(최근 주가 더 무겁게).

이 층은 예측 파이프라인에서 `n_answers`·기간을 보고 톤/가중치를 조절하는 게 자연스럽다.

---

## 5. 절대 하지 말 것

- ❌ 예측 **모델(KNN/EconML/lifelines)의 입력 피처**로 넣기 → 학습 피처 고정. 재학습 필요.
      성향·취향·건강은 **서사·톤에만** 반영.
- ❌ **진단 라벨**("우울장애입니다") / **또래 % 수치**를 유저 서사 본문에.
- ❌ 성향을 **고정 특성**으로 단정. 항상 "초기값·갱신됨" 전제.
- ❌ `backend/` 원본 수정. qmode 재료를 주입만.

---

## 6. 참고 — 조립 예시가 이미 있음

`diary_module/qmode/report.py`의 `build_narrative_prompt()`가 위 재료들을 실제로
조립해 Claude 서사를 만드는 **동작하는 예시**다. 예측 서사도 같은 방식으로 조립하면 된다.
샘플 출력: `diary_module/qmode/samples/sample_report.txt`.
