"""로컬 테스트 — 서버/ API 키 없이 /predict 로직을 직접 호출해 결과를 출력.

실행:  python test_predict.py
  · 서버(uvicorn) 안 켜도 됨
  · narrative(Claude API)는 스텁 처리 → ANTHROPIC_API_KEY 불필요
  · 산출물 pkl 과 data/ lookup 이 제자리에 있어야 함
"""

import sys
import types
from pathlib import Path

BACKEND = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(BACKEND))

# narrative(Claude API) 스텁 — 실제 API 호출 없이 테스트
_stub = types.ModuleType("utils.claude_api")
_stub.generate_narrative = lambda *a, **k: "(narrative 생략 — 테스트 모드)"
sys.modules["utils.claude_api"] = _stub

from schemas import PredictRequest   # noqa: E402
import main                          # noqa: E402

CASES = [
    {"age": 27, "sex": "2", "major": "사회", "choice": "이직", "monthly_wage": 250, "satis_overall": 3},
    {"age": 30, "sex": "1", "major": "공학", "choice": "창업"},
    {"age": 26, "sex": "2", "major": "자연", "choice": "대학원 진학"},
    {"age": 41, "sex": "1", "major": "경영", "choice": "이직", "monthly_wage": 400},
]


def fmt(v):
    return "-" if v is None else (round(v, 1) if isinstance(v, float) else v)


def run(case: dict) -> None:
    r = main.predict(PredictRequest(**case))
    print("=" * 66)
    print(f"입력  {case}")
    print(f"coverage  {r.coverage}")
    print(f"  L2 기대월소득 {fmt(r.expected_wage)}만  |  "
          f"L3 이직→소득 {fmt(r.causal_effect)}만  |  "
          f"L4 재직중앙값 {fmt(r.survival_months)}개월")
    if r.neighbors:
        pool = ", ".join(f"{n.source}({n.similarity:.2f})" for n in r.neighbors)
        print(f"  이웃 {len(r.neighbors)}명: {pool}")
    if r.risk_timeline:
        print(f"  리스크 타임라인(연차:확률) {r.risk_timeline}")
    print(f"  생활지표 {len(r.life_indicators)}개:")
    for li in r.life_indicators:
        print(f"     [{li.dimension:9s}] {li.indicator}: {li.value}{li.unit}  ({li.group})")
    if r.trajectory:
        print(f"  종단 궤적(비슷한 사람들의 실제 경로) {len(r.trajectory)}개 시점:")
        print(f"     {'년차':>3} {'나이':>3} {'표본':>4} {'소득 p25~중앙~p75':>18} {'누적이직':>7}")
        for t in r.trajectory:
            band = f"{t.income_p25:.0f}~{t.income_p50:.0f}~{t.income_p75:.0f}"
            print(f"     {t.year:>3} {t.age:>3} {t.sample_n:>4} {band:>18} {str(t.job_change_cum):>7}")
    if r.scenario_trajectories:
        stay = {p.year: p for p in r.scenario_trajectories["유지"]}
        move = {p.year: p for p in r.scenario_trajectories["이직"]}
        print("  평행우주(유지 vs 이직 중앙소득, 격차=L3 인과효과):")
        for y in sorted(stay):
            print(f"     {y}년차: 유지 {stay[y].income_p50:.0f}만  /  이직 {move[y].income_p50:.0f}만")


if __name__ == "__main__":
    for c in CASES:
        run(c)
    print("=" * 66)
    print("[OK] 전체 케이스 통과")
