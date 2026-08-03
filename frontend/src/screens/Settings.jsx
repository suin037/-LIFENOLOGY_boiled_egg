import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { Eyebrow, Card, Row } from "../components/ui.jsx";
import { MASCOTS } from "../data/result.js";
import ValueRankingInput from "../components/ValueRankingInput.jsx";
import { topAxes } from "../data/valueCards.js";
import { loadPrefs, savePrefs } from "../data/prefs.js";
import { PSYCH_QUESTIONS } from "../data/psychQuestions.js";
import Avatar from "../components/Avatar.jsx";
import AvatarBuilder from "../components/AvatarBuilder.jsx";
import Mascot from "../components/Mascot.jsx";
import { universeSummary } from "../data/myUniverse.js";

// 작은 on/off 토글 (track h-6/w-11 · thumb h-4/w-4 · translate 로 이동 — 크기 균형)
function Toggle({ on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-cyan" : "bg-[#28324D]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// MBTI 16개 목록 대신 네 가지 축을 각각 이지선다로 선택한다.
const MBTI_AXES = [["E", "I"], ["N", "S"], ["T", "F"], ["J", "P"]];

function MbtiPicker({ value, onChange }) {
  const valid = /^[EI][NS][TF][JP]$/.test(value || "");
  const letters = valid ? value.split("") : [null, null, null, null];

  function pick(axisIndex, letter) {
    const next = valid ? value.split("") : ["I", "N", "T", "J"];
    next[axisIndex] = letter;
    onChange(next.join(""));
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {MBTI_AXES.map((pair, axisIndex) => (
          <div key={pair.join("")} className="flex overflow-hidden rounded-xl border border-line">
            {pair.map((letter) => {
              const selected = letters[axisIndex] === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => pick(axisIndex, letter)}
                  className={`tap flex-1 py-2.5 text-[14px] font-bold ${
                    selected ? "bg-cyan text-[#08131f]" : "bg-[#0E1424] text-sub"
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">{valid ? value : "미설정"}</span>
        <button
          type="button"
          onClick={() => onChange("모름")}
          className={`tap rounded-full border px-3 py-1 text-[11px] ${
            valid ? "border-line text-mut" : "border-cyan text-cyan"
          }`}
        >
          모름
        </button>
      </div>
    </div>
  );
}

const NOTIF_LABELS = {
  checkin: "데일리 체크인 리마인더",
  actionBridge: "오늘의 할 일 (Action Bridge)",
  weekly: "주간 리포트",
};

export default function Settings() {
  const navigate = useNavigate();
  const { profile, setProfile, setOnboarded } = useResult();
  const [prefs, setPrefs] = useState(loadPrefs);
  const unlockLevel = universeSummary().highestLevel;

  function update(patch) {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      savePrefs(next);
      return next;
    });
  }
  function toggleNotif(key) {
    update({ notifications: { ...prefs.notifications, [key]: !prefs.notifications[key] } });
  }
  function setAnswer(qid, v) {
    setProfile((p) => ({ ...p, psych_answers: { ...(p.psych_answers || {}), [qid]: v } }));
  }
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
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-mut">
          <Avatar config={profile.avatarConfig} size={24} ring={false} /> 내 프로필
        </div>
        <Row label="나이">{profile.age}세</Row>
        <Row label="직종">{profile.occupation}</Row>
        <Row label="현재 월소득">{profile.income}만원</Row>
        <Row label="MBTI">{profile.mbti && profile.mbti !== "모름" ? profile.mbti : "—"}</Row>
        <Row label="중요 가치">{topAxes(profile.value_ranking, 3).join(" · ") || "—"}</Row>
        <button
          onClick={() => navigate("/onboarding")}
          className="tap mt-3 w-full rounded-2xl border border-line bg-[#0E1424] py-2.5 text-[13px] text-cyan"
        >
          프로필 수정 (온보딩 다시하기)
        </button>
      </Card>

      {/* 내 아바타 — 사람 빌더 + 우주 프레임 */}
      <Card>
        <div className="mb-3 text-xs font-semibold text-mut">내 아바타 만들기</div>
        <AvatarBuilder
          config={profile.avatarConfig}
          onChange={(cfg) => setProfile((p) => ({ ...p, avatarConfig: cfg }))}
          unlockLevel={unlockLevel}
        />
      </Card>

      {/* 가치 우선순위 — 성향 개인화 입력 (백엔드 personalize 로 전달) */}
      <Card>
        <div className="mb-2 text-xs font-semibold text-mut">가치 우선순위</div>
        <ValueRankingInput
          value={profile.value_ranking}
          onChange={(v) => setProfile((p) => ({ ...p, value_ranking: v }))}
        />
      </Card>

      {/* 심리 성향 — MBTI + 서술형 질문 (→ disposition_block 으로 서사 개인화) */}
      <Card>
        <div className="mb-2 text-xs font-semibold text-mut">심리 성향</div>

        <label className="mb-1.5 block text-[11px] text-sub">MBTI</label>
        <MbtiPicker
          value={profile.mbti}
          onChange={(value) => setProfile((p) => ({ ...p, mbti: value }))}
        />

        <p className="mb-1 mt-4 text-[11px] text-sub">
          성향 질문 <span className="text-mut"></span>
        </p>
        <div className="space-y-3">
          {PSYCH_QUESTIONS.map((q) => (
            <div key={q.id}>
              <div className="mb-1 text-[12px] leading-snug text-ink">{q.prompt}</div>
              <textarea
                rows={2}
                value={(profile.psych_answers || {})[q.id] || ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="자유롭게…"
                className="w-full resize-none rounded-lg border border-line bg-[#0E1424] px-2.5 py-2 text-[13px] text-ink outline-none focus:border-cyan"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* 알림 설정 */}
      <Card>
        <div className="mb-1 text-xs font-semibold text-mut">알림</div>
        {Object.keys(NOTIF_LABELS).map((key) => (
          <div key={key} className="mt-2.5 flex items-center justify-between">
            <span className="text-[13px] text-sub">{NOTIF_LABELS[key]}</span>
            <Toggle on={!!prefs.notifications[key]} onClick={() => toggleNotif(key)} />
          </div>
        ))}
      </Card>

      {/* 가이드 마스코트 */}
      <Card>
        <div className="mb-3 text-xs font-semibold text-mut">가이드 마스코트</div>
        <div className="space-y-3">
          {Object.values(MASCOTS).map((m) => (
            <div key={m.key} className="flex items-center gap-3">
              <Mascot which={m.key} size={48} />
              <div className="min-w-0">
                <div className="text-[11px] font-bold" style={{ color: m.color }}>{m.name} <span className="text-[9px] text-mut">· {m.tag}</span></div>
                <p className="mt-0.5 text-[10px] leading-relaxed text-sub">{m.desc}</p>
                <div className="mt-1 flex gap-1">{m.traits.map((t) => <span key={t} className="rounded-full border border-line px-1.5 py-0.5 text-[8px] text-mut">{t}</span>)}</div>
              </div>
            </div>
          ))}
        </div>
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
