import { useResult } from "../../data/ResultContext.jsx";

// 결과 화면의 '공고 분석' 탭 — 입력에서 분석한 공고를 예측 수치와 나란히 다시 본다.
// 예측은 '비슷한 사람들이 어떻게 됐나'를, 이 탭은 '내가 가려는 그 자리는 어떤가'를 말한다.
export default function JobAnalysisView() {
  const { jobAnalysis: j, profile } = useResult();
  if (!j) return null;

  const values = (profile?.career_values || []).slice(0, 3).map((v) => v.name);

  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl border border-[#8B6CCF]/25 bg-[#8B6CCF]/[.07] px-3.5 py-3">
        <p className="text-[10px] tracking-[.12em] text-[#9F85DD]">JOB POSTING</p>
        <b className="mt-1 block text-[15px] text-ink">{j.role || "분석한 공고"}</b>
        {j.company && <span className="text-[11px] text-sub">{j.company}</span>}
        {values.length > 0 && (
          <p className="mt-1.5 text-[10px] text-mut">
            가치관 검사 반영: {values.join(" > ")}
          </p>
        )}
      </div>

      {j.requirements?.length > 0 && (
        <Block title="요구 역량">
          {j.requirements.map((item, i) => (
            <li key={i} className="text-[12px] leading-relaxed text-sub">· {item}</li>
          ))}
        </Block>
      )}

      {j.fit?.length > 0 && (
        <Block title="나와 맞는 지점" tone="#5DCAA5">
          {j.fit.map((item, i) => (
            <li key={i} className="text-[12px] leading-relaxed text-sub">
              <b className="text-ink">{item.point}</b> — {item.why}
            </li>
          ))}
        </Block>
      )}

      {j.friction?.length > 0 && (
        <Block title="부딪힐 수 있는 지점" tone="#F0A45E">
          {j.friction.map((item, i) => (
            <li key={i} className="text-[12px] leading-relaxed text-sub">
              <b className="text-ink">{item.point}</b> — {item.why}
            </li>
          ))}
        </Block>
      )}

      {j.prep?.length > 0 && (
        <Block title="지원 전 준비">
          {j.prep.map((item, i) => (
            <li key={i} className="text-[12px] leading-relaxed text-sub">· {item}</li>
          ))}
        </Block>
      )}

      {j.questions?.length > 0 && (
        <Block title="예상 면접 질문">
          {j.questions.map((item, i) => (
            <li key={i} className="text-[12px] leading-relaxed text-sub">
              <b className="text-ink">Q. {item.q}</b>
              <span className="mt-0.5 block text-[11px] text-mut">→ {item.angle}</span>
            </li>
          ))}
        </Block>
      )}

      <p className="text-[10px] leading-relaxed text-mut">
        왼쪽 수치는 비슷한 사람들의 실측 데이터에서 온 것이고, 이 탭은 공고 원문과 당신의 기록·가치관 검사에서
        정리한 것입니다. 합격 가능성이나 회사 내부 사정을 예측하지 않습니다.
      </p>
    </div>
  );
}

function Block({ title, tone = "#8B6CCF", children }) {
  return (
    <div className="rounded-2xl border border-white/[.07] bg-black/15 px-3.5 py-3">
      <p className="text-[11px] font-bold" style={{ color: tone }}>{title}</p>
      <ul className="mt-2 space-y-1.5">{children}</ul>
    </div>
  );
}
