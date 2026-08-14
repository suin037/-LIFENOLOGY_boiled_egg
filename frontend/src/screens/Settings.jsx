import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { Eyebrow, Card } from "../components/ui.jsx";
import { MASCOTS } from "../data/result.js";
import ValueRankingInput from "../components/ValueRankingInput.jsx";
import { topAxes } from "../data/valueCards.js";
import { loadPrefs, savePrefs } from "../data/prefs.js";
import { PSYCH_QUESTIONS } from "../data/psychQuestions.js";
import Avatar from "../components/Avatar.jsx";
import AvatarBuilder from "../components/AvatarBuilder.jsx";
import Mascot from "../components/Mascot.jsx";
import PrivacyVault from "../components/PrivacyVault.jsx";
import { LEVEL_TITLES, XP_RULES, universeSummary } from "../data/myUniverse.js";
import { LEVEL_REWARDS } from "../data/unlocks.js";
import PetMascot from "../components/PetMascot.jsx";
import PetShop from "../components/PetShop.jsx";
import { domainRumination } from "../data/diarySignals.js";
import { Bell, ChevronRight, LockKeyhole, Palette, UserRound, LogOut } from "lucide-react";

const OCCUPATIONS = [
  "연구·공학기술",
  "경영·사무·금융·보험",
  "교육·법률·복지·공공",
  "보건·의료",
  "예술·디자인·방송",
  "영업·판매·서비스",
  "건설·생산·운송",
  "학생·취업준비",
  "기타",
];

// 작은 on/off 토글 (track h-6/w-11 · thumb h-4/w-4 · translate 로 이동 — 크기 균형)
function Toggle({ on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="tap inline-flex w-11 shrink-0 items-center justify-center"
    >
      <span className={`relative block h-5 w-9 rounded-full transition-colors ${on ? "bg-cyan" : "bg-[#28324D]"}`}>
        <span
          className={`absolute left-[3px] top-[3px] h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
            on ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function ProfileItem({ label, value }) {
  return (
    <div className="grid grid-cols-[54px_1fr] items-center gap-1 py-1 text-[11px]">
      <span className="shrink-0 text-mut">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-ink" title={String(value)}>{value}</span>
    </div>
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
const SETTINGS_META = {
  profile: ["프로필", "나를 표현하고 시뮬레이션 개인화에 사용할 정보를 관리합니다."],
  security: ["개인정보 · 보안", "저장된 개인정보의 보호 상태를 확인합니다."],
  personalize: ["개인화", "우주와 가이드, 탐험 경험을 내 취향에 맞게 설정합니다."],
  notifications: ["알림 · 가이드", "필요한 알림과 함께할 가이드 캐릭터를 설정합니다."],
};

function LevelRule({ label, xp }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-[#0B1423] px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-cyan">+{xp} XP</span>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { profile, setProfile, setOnboarded, setChoices } = useResult();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState(null);
  const [activeSection, setActiveSection] = useState("profile");
  const universe = universeSummary();
  const [rumination, setRumination] = useState(() => domainRumination({ windowDays: 28, threshold: 4 }));
  useEffect(() => {
    const refresh = () => setRumination(domainRumination({ windowDays: 28, threshold: 4 }));
    window.addEventListener("pm:universe", refresh);
    return () => window.removeEventListener("pm:universe", refresh);
  }, []);

  function startSuggestedCompare() {
    if (!rumination.compare) return;
    setChoices({ a: rumination.compare.a, b: rumination.compare.b });
    navigate("/input");
  }

  function startProfileEdit() {
    setProfileDraft({
      name: profile.name || "",
      age: profile.age ?? 29,
      occupation: profile.occupation || "",
      income: Number(profile.income) > 0 ? String(profile.income) : "",
    });
    setEditingProfile(true);
  }

  function saveProfileEdit() {
    if (!profileDraft) return;
    setProfile((current) => ({
      ...current,
      name: profileDraft.name.trim(),
      age: Number(profileDraft.age),
      occupation: profileDraft.occupation,
      income: profileDraft.income === "" ? 0 : Number(profileDraft.income),
    }));
    setEditingProfile(false);
    setProfileDraft(null);
  }

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
    <div className="pb-4 lg:pb-12">
      <div className="flex items-center justify-between lg:items-end">
        <Eyebrow>SETTINGS · 설정</Eyebrow>
        <button onClick={() => navigate(-1)} className="tap text-[13px] text-sub">
          닫기
        </button>
      </div>
      <h1 className="mb-1 text-[22px] font-bold tracking-[-.025em] lg:text-[34px]">{SETTINGS_META[activeSection][0]}</h1>
      <p className="mb-4 text-[11px] text-mut lg:mb-7 lg:text-[13px]">{SETTINGS_META[activeSection][1]}</p>

      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 lg:hidden">
        <SettingsNav active={activeSection === "profile"} onClick={() => setActiveSection("profile")} icon={UserRound}>프로필</SettingsNav>
        <SettingsNav active={activeSection === "security"} onClick={() => setActiveSection("security")} icon={LockKeyhole}>보안</SettingsNav>
        <SettingsNav active={activeSection === "personalize"} onClick={() => setActiveSection("personalize")} icon={Palette}>개인화</SettingsNav>
        <SettingsNav active={activeSection === "notifications"} onClick={() => setActiveSection("notifications")} icon={Bell}>알림</SettingsNav>
        <button type="button" onClick={resetToStart} aria-label="로그아웃" title="로그아웃" className="tap flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[.07] text-mut hover:border-danger/40 hover:bg-danger/10 hover:text-danger"><LogOut size={17}/></button>
      </div>

      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-12">
        <aside className="hidden lg:sticky lg:top-[108px] lg:block">
          <nav className="rounded-[20px] border border-white/[.07] bg-[#0D1828]/75 p-2 shadow-[0_18px_45px_rgba(0,0,0,.18)] backdrop-blur-xl">
            <SettingsNav active={activeSection === "profile"} onClick={() => setActiveSection("profile")} icon={UserRound}>프로필</SettingsNav>
            <SettingsNav active={activeSection === "security"} onClick={() => setActiveSection("security")} icon={LockKeyhole}>개인정보 · 보안</SettingsNav>
            <SettingsNav active={activeSection === "personalize"} onClick={() => setActiveSection("personalize")} icon={Palette}>개인화</SettingsNav>
            <SettingsNav active={activeSection === "notifications"} onClick={() => setActiveSection("notifications")} icon={Bell}>알림 · 가이드</SettingsNav>
          </nav>
          <button type="button" onClick={resetToStart} className="tap mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-mut transition-colors hover:bg-danger/10 hover:text-danger"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[.04]"><LogOut size={15}/></span>로그아웃</button>
          <p className="mt-3 px-3 text-[10px] leading-relaxed text-mut">변경한 설정은 이 기기의 사용자 환경에 바로 반영됩니다.</p>
        </aside>

        <div className="min-w-0 lg:[&_.bg-card]:rounded-[22px] lg:[&_.bg-card]:border lg:[&_.bg-card]:border-white/[.06] lg:[&_.bg-card]:bg-[#0D1828]/80 lg:[&_.bg-card]:p-5 lg:[&_.bg-card]:shadow-[0_18px_45px_rgba(0,0,0,.18)]">

      {/* 생활 관리 친구 — 홈을 방해하지 않도록 설정에서 관리한다. */}
      {activeSection === "personalize" && <section className="animate-fade">
      <PetMascot rumination={rumination} onCompare={startSuggestedCompare} />

      <Card>
        <div className="flex items-center justify-between gap-4"><div><div className="text-xs font-semibold text-mut">꾸미기 상점</div><p className="mt-1 text-[10px] leading-relaxed text-sub">배경·소품·간식·행성 스킨을 코인으로 사서 꾸며요.</p></div><button type="button" onClick={()=>setShopOpen(true)} className="tap shrink-0 rounded-xl bg-[#8B6CCF] px-4 text-[11px] font-bold">상점 열기</button></div>
      </Card>
      </section>}

      {/* 개인정보 암호화 */}
      {activeSection === "security" && <section className="animate-fade">
      <PrivacyVault />
      </section>}

      {/* 프로필 */}
      {activeSection === "profile" && <section className="animate-fade">
      <Card>
        <div className="mb-3 text-xs font-semibold text-mut">내 프로필</div>
        <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-6">
          <div className="flex flex-col items-center">
            <Avatar config={profile.avatarConfig} size={100} />
            <button
              type="button"
              onClick={() => setEditingAvatar((open) => !open)}
              className="tap mt-2 w-full rounded-xl border border-line bg-[#0E1424] px-2 text-[10px] font-semibold text-cyan"
            >
              {editingAvatar ? "수정 닫기" : "아바타 수정"}
            </button>
          </div>

          <div className="min-w-0 divide-y divide-line/70">
            <ProfileItem label="나이" value={`${profile.age}세`} />
            <ProfileItem label="직종" value={profile.occupation || "—"} />
            <ProfileItem label="월소득" value={`${profile.income}만원`} />
            <ProfileItem label="MBTI" value={profile.mbti && profile.mbti !== "모름" ? profile.mbti : "—"} />
            <ProfileItem label="중요 가치" value={topAxes(profile.value_ranking, 2).join(" · ") || "—"} />
            <button
              type="button"
              onClick={startProfileEdit}
              className="tap w-full pt-2 text-right text-[10px] font-semibold text-sub"
            >
              기본 정보 수정
            </button>
          </div>
        </div>
      </Card>

      {/* 레벨의 의미와 적립 규칙은 설정에서 확인한다. 나의 우주에는 현재 진행률만 표시. */}
      <Card>
        <details className="group">
          <summary className="tap flex cursor-pointer list-none items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-mut">레벨 · 탐험 보상 안내</div>
              <div className="mt-1 text-[13px] font-bold text-ink">
                {universe.title} · Lv. {universe.level}
              </div>
            </div>
            <span className="text-[11px] text-cyan group-open:rotate-180">⌄</span>
          </summary>

          <div className="mt-4 border-t border-line pt-4">
            <div className="text-[11px] font-semibold text-sub">XP 적립 기준</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-mut">
              <LevelRule label="30초 체크인" xp={XP_RULES.checkin} />
              <LevelRule label="한 줄 기록" xp={XP_RULES.diary} />
              <LevelRule label="시뮬레이션" xp={XP_RULES.simulation} />
              <LevelRule label="평행우주 저장" xp={XP_RULES.universeSaved} />
              <LevelRule label="회고 작성" xp={XP_RULES.reflection} />
            </div>

            <div className="mt-4 text-[11px] font-semibold text-sub">레벨별 칭호</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {LEVEL_TITLES.map(([level, title]) => (
                <span key={level} className={`rounded-full border px-2.5 py-1 text-[10px] ${universe.level >= level ? "border-cyan/30 bg-cyan/10 text-cyan" : "border-line text-mut"}`}>
                  Lv.{level} {title}
                </span>
              ))}
            </div>

            <div className="mt-4 text-[11px] font-semibold text-sub">탐험 보상</div>
            <div className="mt-2 space-y-2">
              {LEVEL_REWARDS.map((reward) => (
                <div key={reward.id} className="flex items-center justify-between rounded-xl bg-[#0B1423] px-3 py-2.5">
                  <span className={universe.highestLevel >= reward.level ? "text-[11px] text-ink" : "text-[11px] text-mut"}>{reward.name}</span>
                  <span className="text-[10px] text-mut">Lv.{reward.level}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-mut">레벨과 XP는 앱 활동 지표이며 예측 결과나 정확도에는 영향을 주지 않아요.</p>
          </div>
        </details>
      </Card>

      {editingProfile && profileDraft && (
        <Card className="animate-fade">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-ink">기본 정보 수정</div>
            </div>
            <button
              type="button"
              onClick={() => { setEditingProfile(false); setProfileDraft(null); }}
              className="tap text-[11px] text-sub"
            >
              취소
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-[11px] text-sub">
              이름 또는 닉네임
              <input
                type="text"
                maxLength={20}
                value={profileDraft.name}
                onChange={(e) => setProfileDraft((p) => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-sm text-ink outline-none focus:border-cyan"
              />
            </label>

            <label className="block text-[11px] text-sub">
              나이 <span className="float-right font-semibold text-cyan">{profileDraft.age}세</span>
              <input
                type="range"
                min="18"
                max="70"
                value={profileDraft.age}
                onChange={(e) => setProfileDraft((p) => ({ ...p, age: Number(e.target.value) }))}
                className="mt-3 h-1 w-full cursor-pointer accent-cyan"
              />
            </label>

            <label className="block text-[11px] text-sub">
              직종
              <select
                value={profileDraft.occupation}
                onChange={(e) => setProfileDraft((p) => ({ ...p, occupation: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-sm text-ink outline-none focus:border-cyan"
              >
                <option value="">직종을 골라주세요</option>
                {OCCUPATIONS.map((occupation) => <option key={occupation}>{occupation}</option>)}
              </select>
            </label>

            <label className="block text-[11px] text-sub">
              월소득
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="예: 300"
                  value={profileDraft.income}
                  onChange={(e) => {
                    const income = e.target.value.replace(/^0+(?=\d)/, "");
                    setProfileDraft((p) => ({ ...p, income }));
                  }}
                  className="w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-sm text-ink outline-none focus:border-cyan"
                />
                <span className="whitespace-nowrap text-[11px] text-mut">만원 / 월</span>
              </div>
            </label>
          </div>

          <button
            type="button"
            onClick={saveProfileEdit}
            className="tap mt-4 w-full rounded-2xl bg-cyan py-3 text-sm font-bold text-[#08111f]"
          >
            변경사항 저장
          </button>
        </Card>
      )}

      {/* 내 아바타 — 사람 빌더 + 우주 프레임 */}
      {editingAvatar && (
        <Card className="animate-fade">
          <div className="mb-1 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-ink">아바타 수정</div>
              <p className="mt-0.5 text-[10px] text-mut">화살표로 원하는 모습을 선택하세요.</p>
            </div>
            <button type="button" onClick={() => setEditingAvatar(false)} className="tap text-[11px] text-sub">
              완료
            </button>
          </div>
          <AvatarBuilder
            config={profile.avatarConfig}
            onChange={(cfg) => setProfile((p) => ({ ...p, avatarConfig: cfg }))}
          />
        </Card>
      )}
      </section>}

      {/* 가치 우선순위 — 성향 개인화 입력 (백엔드 personalize 로 전달) */}
      {activeSection === "profile" && <section className="animate-fade">
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
      </Card>
      </section>}

      {/* 알림 설정 */}
      {activeSection === "notifications" && <section className="animate-fade">
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
      </section>}

      </div>
      </div>
      {shopOpen&&<PetShop onClose={()=>setShopOpen(false)}/>} 
    </div>
  );
}

function SettingsNav({ active, onClick, icon: Icon, children }) {
  return <button type="button" onClick={onClick} className={`tap group flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition-colors lg:w-full lg:gap-3 ${active ? "bg-violet-500/20 text-violet-200" : "text-sub hover:bg-violet-500/10 hover:text-violet-200"}`}><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? "bg-violet-500/20" : "bg-white/[.04] group-hover:bg-violet-500/15"}`}><Icon size={15}/></span><span className="flex-1 whitespace-nowrap text-left">{children}</span><ChevronRight size={14} className={`hidden lg:block ${active ? "opacity-80" : "opacity-30"}`} /></button>;
}
