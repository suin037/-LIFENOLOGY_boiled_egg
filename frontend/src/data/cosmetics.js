const KEY = "pm.cosmetics.v1";

const DEFAULTS = {
  avatarBackground: null,
  constellationTheme: "default",
  mascotSkin: "default",
  universeTheme: "default",
  profileFrame: "default",
};

export function loadCosmetics() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveCosmetics(patch) {
  const next = { ...loadCosmetics(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장이 막힌 환경에서는 현재 세션의 profile 상태만 사용한다.
  }
  return next;
}
