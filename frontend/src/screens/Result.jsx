import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { useDiary } from "../data/DiaryContext.jsx";
import { labelOf } from "../data/prediction.js";
import { detectLifeDomains } from "../data/choices.js";
import { redactPII, redactEntries } from "../data/piiRedact.js";
import { saveMe, getScenario, getThirdPath } from "../data/api.js";
import { Eyebrow, Button } from "../components/ui.jsx";
import LifeView from "../components/result/LifeView.jsx";
import ChangeView from "../components/result/ChangeView.jsx";
import EvidenceView from "../components/result/EvidenceView.jsx";
import ActionView from "../components/result/ActionView.jsx";
import AvatarComparison from "../components/result/AvatarComparison.jsx";
import DiarySignalCard from "../components/result/DiarySignalCard.jsx";

export default function Result() {
  const navigate = useNavigate();
  const { result, profile, scenarioDomains, retryVisuals } = useResult();
  const { a, b } = result;

  const tabs = [
    { key: "indicators", label: "핵심 지표", View: LifeView },
    { key: "change", label: "변화 흐름", View: ChangeView },
    { key: "evidence", label: "분석 상세", View: EvidenceView },
    { key: "next", label: "다음 단계", View: ActionView },
  ];

  const [tab, setTab] = useState("indicators");
  const Active = (tabs.find((t) => t.key === tab) || tabs[0]).View;

  return (
    <div>
      <Eyebrow>결과 · CHART No.0427</Eyebrow>
      <h1 className="text-[21px] font-bold leading-[1.2]">
        {a.meta.age}세 · {a.meta.occupation}
      </h1>
      <p className="mt-1 text-[13px]">
        <span className="font-bold text-cyan">{labelOf(a.choice)}</span>
        <span className="text-mut"> vs </span>
        <span className="font-bold text-gold">{labelOf(b.choice)}</span>
      </p>

      <AvatarComparison
        avatar={profile.avatarConfig}
        a={a}
        b={b}
        visuals={result.visuals}
        narrative={result.narrative}
        narrativeLoading={result.narrativeLoading}
        loading={result.imageLoading}
        error={result.visualError || result.narrativeError}
        onRetry={result.visualError ? retryVisuals : null}
      />

      {/* 3층: ① 통계(아래 탭) · ② 내 기록 기반 상태 · ③ 개인화 해석 */}
      <DiarySignalCard />
      <PersonaScenario a={a} b={b} />
      <ThirdPath a={a} b={b} />

      {/* 서브뷰 칩 */}
      <div className="no-scrollbar my-2.5 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`tap whitespace-nowrap rounded-2xl border px-3.5 py-2 text-xs transition-colors ${
                on ? "border-[#3a4a70] bg-[#2b3859] text-white" : "border-line bg-[#0E1424] text-sub"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div key={tab} className="animate-fade">
        <Active a={a} b={b} domains={result.domains || scenarioDomains} dataMode={result.dataMode || "demo"} />
      </div>

      <Button variant="ghost" className="mt-4" onClick={() => navigate("/input")}>
        다른 갈림길로 다시 해보기
      </Button>
    </div>
  );
}

// A/B 외의 '제3의 길' — 성향+일기신호로 LLM이 생성 (재구성 제안, 수치 예측 아님)
function ThirdPath({ a, b }) {
  const { profile } = useResult();
  const { entries } = useDiary();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [res, setRes] = useState(null);

  async function run() {
    setBusy(true); setErr(null); setRes(null);
    try {
      // 진로 계열일 때만 일기 entries(→ 이직 신호)를 넘긴다. 관계 등은 선택지만으로
      // 제안받아 이직 프레임이 섞이지 않게 한다(LLM은 선택지를 보고 해당 분야로 제안).
      const isJob = detectLifeDomains(`${a.choice} ${b.choice}`).some((k) => ["career", "finance", "business"].includes(k))
        || /이직|퇴사|유지|창업|진학|직장|커리어/.test(`${a.choice}${b.choice}`);
      // 외부 AI 전송 전 PII 마스킹 — 이름·연봉·연락처 등 원문 개인정보를 가린다.
      const known = { name: profile.name, company: "" };
      const rawEntries = entries.map((e) => ({
        date: e.date, mood: e.mood, text: e.text, answers: e.answers || {},
        energy: e.energy, competency: e.competency, emotion: e.emotion,
      }));
      const r = await getThirdPath({
        choice_a: redactPII(a.choice, known).masked,
        choice_b: redactPII(b.choice, known).masked,
        age: a.meta?.age,
        major: a.meta?.occupation,
        entries: isJob ? redactEntries(rawEntries, known).entries : [],
      });
      if (!r.ok) throw new Error(r.reason === "no_api_key" ? "서버에 ANTHROPIC_API_KEY 미설정" : r.reason || "생성 실패");
      setRes(r);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-3 rounded-2xl border border-gold/50 bg-[#211a10] p-3.5">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-bold text-gold">💡 생각지 못한 제3의 길</div>
        <button
          onClick={run}
          disabled={busy}
          className="tap rounded-xl bg-gold px-3 py-1.5 text-[11px] font-bold text-[#2a1e05] disabled:opacity-60"
        >
          {busy ? "찾는 중…" : res ? "다시" : "제안 받기"}
        </button>
      </div>
      {err && <p className="mt-2 text-[10px] text-[#F0736F]">API 실패 — 서버(:8000) 켜졌나요? {err}</p>}
      {res ? (
        <>
          <p className="mt-2 text-[13px] font-semibold leading-relaxed text-ink">{res.title}</p>
          {res.rationale && <p className="mt-1.5 whitespace-pre-line text-[12px] leading-relaxed text-sub">{res.rationale}</p>}
          <p className="mt-1.5 text-[10px] text-mut">
            {res.signal_used ? "✓ 내 일기 신호 반영 · " : ""}정답이 아니라 재구성 제안이에요 — 수치 예측이 아닙니다.
          </p>
        </>
      ) : (
        !busy && (
          <p className="mt-2 text-[11px] leading-relaxed text-mut">
            {a.choice} vs {b.choice} 두 갈래 말고, 내 성향·일기에 맞는 제3의 길을 제안받아요.
          </p>
        )
      )}
    </div>
  );
}

// 저장된 내 성향(온보딩+일기) → 이 이직 예측 서사에 반영 (수치 불변, 순서·톤만)
function PersonaScenario({ a, b }) {
  const { profile } = useResult();
  const { entries } = useDiary();
  const jc = a.choice === "이직" ? a : b.choice === "이직" ? b : null;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [res, setRes] = useState(null);

  if (!jc) return null; // 이직 시나리오 없으면 표시 안 함

  async function run() {
    setBusy(true); setErr(null); setRes(null);
    try {
      await saveMe({
        ranked_cards: profile.values,
        mbti: profile.mbti,
        profile: { age: profile.age, occupation: profile.occupation, income: profile.income },
        entries: entries.map((e) => ({
          date: e.date, mood: e.mood, text: e.text, answers: e.answers || {},
          energy: e.energy, competency: e.competency, emotion: e.emotion,
        })),
      });
      const r = await getScenario({
        uid: "me", choice: "이직",
        expected_wage: jc.expected_wage || 0,
        causal_effect: jc.causal_effect || 0,
        survival_months: jc.survival_months || 0,
        age: jc.meta?.age, major: jc.meta?.occupation,
      });
      setRes(r);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-3 mt-1 rounded-2xl border border-cyan bg-[#12203a] p-3.5">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-bold text-cyan">🔮 내 성향이 반영된 이직 서사</div>
        <button
          onClick={run}
          disabled={busy}
          className="tap rounded-xl bg-cyan px-3 py-1.5 text-[11px] font-bold text-[#04203a] disabled:opacity-60"
        >
          {busy ? "생성 중…" : res ? "다시" : "생성"}
        </button>
      </div>
      {err && <p className="mt-2 text-[10px] text-[#F0736F]">API 실패 — 서버(:8000) 켜졌나요? {err}</p>}
      {res ? (
        <>
          <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-sub">{res.narrative}</p>
          <p className="mt-1.5 text-[10px] text-mut">
            {res.persona_used
              ? "✓ 저장된 내 성향(온보딩+일기) 반영 — 예측 수치는 동일, 서술 순서·톤만 조정"
              : "성향 미반영(저장된 데이터 없음)"}
          </p>
        </>
      ) : (
        !busy && (
          <p className="mt-2 text-[11px] text-mut">
            온보딩+일기로 만든 내 성향을 저장하고, 이 이직 예측에 반영한 서사를 생성해요.
          </p>
        )
      )}
    </div>
  );
}
