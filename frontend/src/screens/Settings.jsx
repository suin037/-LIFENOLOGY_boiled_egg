import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { Eyebrow, Card, Row } from "../components/ui.jsx";
import { MASCOTS } from "../data/result.js";

export default function Settings() {
  const navigate = useNavigate();
  const { profile, setOnboarded } = useResult();

  function resetToStart() {
    setOnboarded(false); // 랜딩으로 되돌림 (데모: 세션 한정)
    navigate("/");
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Eyebrow>SETTINGS · 설정</Eyebrow>
        <button onClick={() => navigate(-1)} className="tap text-[13px] text-sub">
          닫기
        </button>
      </div>
      <h1 className="mb-3 text-[22px] font-bold">프로필 · 설정</h1>

      {/* 프로필 */}
      <Card>
        <div className="mb-2 text-xs font-semibold text-mut">내 프로필</div>
        <Row label="나이">{profile.age}세</Row>
        <Row label="직종">{profile.occupation}</Row>
        <Row label="현재 월소득">{profile.income}만원</Row>
        <Row label="중요 가치">{profile.values.join(", ") || "—"}</Row>
        <button
          onClick={() => navigate("/onboarding")}
          className="tap mt-3 w-full rounded-2xl border border-line bg-[#0E1424] py-2.5 text-[13px] text-cyan"
        >
          프로필 수정 (온보딩 다시하기)
        </button>
      </Card>

      {/* 가이드 마스코트 */}
      <Card>
        <div className="mb-3 text-xs font-semibold text-mut">가이드 마스코트</div>
        <div className="flex justify-between gap-2">
          {Object.values(MASCOTS).map((m) => (
            <div key={m.name} className="flex flex-1 flex-col items-center gap-1.5 text-center">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                style={{ background: "#12203a", border: `1.5px solid ${m.color}` }}
              >
                {m.emoji}
              </span>
              <span className="text-[11px] font-bold" style={{ color: m.color }}>
                {m.name.split(" · ")[0]}
              </span>
              <span className="text-[9px] text-mut">{m.role}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 데이터 출처·한계 고지 */}
      <Card>
        <div className="mb-2 text-xs font-semibold text-mut">데이터 출처 · 한계</div>
        <p className="text-[12px] leading-relaxed text-sub">
          GOMS2019 · YP2021 / 25~30세 대졸자 306명 기준 / 관찰 3년.
          <br />
          모든 수치는 <span className="text-ink">중앙값</span>이며 표본 수를 함께 표시합니다. 이
          서비스는 미래를 예측하거나 이직을 권유하지 않습니다 — 비슷한 사람들의 실측 기록을 비추는
          거울입니다. 관찰기간(3년)을 넘는 예측은 제공하지 않습니다.
        </p>
      </Card>

      <button
        onClick={resetToStart}
        className="tap mt-2 w-full rounded-2xl border border-line py-3 text-[13px] text-mut"
      >
        처음 화면으로 (로그아웃)
      </button>
    </div>
  );
}
