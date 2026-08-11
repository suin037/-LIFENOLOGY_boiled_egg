import { useEffect, useRef, useState } from "react";

const PLANET_POSITIONS = [
  [-1.55, .75, -.45], [1.35, .9, .65], [0, -.05, 1.15],
  [-1.35, -.95, .35], [1.45, -.85, -.75],
];
const GROUP_POSITIONS = [[-1.9,1.25,.5],[1.8,1.35,-.3],[-1.8,-1.45,-.8],[1.85,-1.35,.65],[.15,1.65,-1.1]];

function hexRgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
}
function rotate([x, y, z], yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
  return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
}

export default function UniverseMap({ planets, groups = [], scenarios = [], selectedKey, onPlanetSelect, onConstellationOpen }) {
  const canvasRef = useRef(null);
  const dataRef = useRef({});
  const [hint, setHint] = useState(true);
  dataRef.current = { planets, groups: groups.filter((g) => g.stars.some((s) => !s.empty)).slice(-5), scenarios, selectedKey, onPlanetSelect, onConstellationOpen };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const state = { yaw: -.35, pitch: -.18, zoom: 1, drift: 0, dragging: false, moved: 0, lastX: 0, lastY: 0, hits: [], pointers: new Map(), pinch: 0, raf: 0 };
    const bgStars = Array.from({ length: 125 }, (_, i) => ({ x: ((i * 73) % 997) / 997, y: ((i * 193) % 991) / 991, r: .35 + (i % 5) * .18, a: .2 + (i % 7) * .08 }));

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function project(point) {
      const [x, y, z] = rotate(point, state.yaw, state.pitch);
      const camera = 4.35, depth = camera - z, focal = Math.min(canvas.clientWidth, canvas.clientHeight) * .9 * state.zoom;
      return { x: canvas.clientWidth / 2 + x * focal / depth, y: canvas.clientHeight * .47 - y * focal / depth, z, scale: focal / depth };
    }
    function sphere(item) {
      const { p, planet, radius, selected } = item, [r, g, b] = hexRgb(planet.from);
      const glow = ctx.createRadialGradient(p.x, p.y, radius * .72, p.x, p.y, radius * 1.55);
      glow.addColorStop(0, `rgba(${r},${g},${b},.18)`); glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, radius * 1.55, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.clip();
      const body = ctx.createRadialGradient(p.x - radius * .38, p.y - radius * .42, radius * .04, p.x + radius * .28, p.y + radius * .3, radius * 1.15);
      body.addColorStop(0, "rgba(255,255,255,.94)"); body.addColorStop(.18, planet.to); body.addColorStop(.68, planet.from); body.addColorStop(1, `rgb(${Math.round(r*.28)},${Math.round(g*.28)},${Math.round(b*.28)})`);
      ctx.fillStyle = body; ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
      ctx.restore();
      ctx.strokeStyle = selected ? "rgba(255,255,255,.38)" : "rgba(255,255,255,.12)"; ctx.lineWidth = selected ? 1 : .5;
      ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = selected ? "#fff" : "rgba(220,229,247,.8)"; ctx.font = `${selected ? 700 : 600} ${Math.max(9, Math.min(12, radius * .22))}px sans-serif`; ctx.textAlign = "center";
      ctx.fillText(planet.label, p.x, p.y + radius + 16);
      state.hits.push({ type: "planet", x: p.x, y: p.y, radius: radius + 12, value: planet });
    }
    function constellation(group, index) {
      // 별자리만 우주 중심을 아주 천천히 공전한다. 행성의 위치와 사용자 카메라는 건드리지 않는다.
      const origin = rotate(GROUP_POSITIONS[index], state.drift, Math.sin(state.drift * .55) * .06);
      const points = group.stars.map((star, i) => {
        const angle = -Math.PI / 2 + i * Math.PI * 2 / group.stars.length;
        const mood = star.mood || 3, spread = .18 + mood * .025;
        return { star, p: project([origin[0] + Math.cos(angle) * spread, origin[1] + Math.sin(angle) * spread, origin[2] + (i % 2 ? .08 : -.08)]) };
      });
      const avgZ = points.reduce((sum, x) => sum + x.p.z, 0) / points.length;
      return { kind: "group", group, points, z: avgZ };
    }
    function paintConstellation(item) {
      const visible = item.points.filter(({ star }) => !star.empty);
      if (!visible.length) return;
      ctx.strokeStyle = `rgba(220,230,250,${.3 + (item.z + 2) * .055})`; ctx.lineWidth = .65;
      ctx.beginPath(); visible.forEach(({ p }, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
      visible.forEach(({ p, star }) => { const r = Math.max(1.25, Math.min(2.6, p.scale * .012 * (2 + (star.mood || 3) * .18))); ctx.fillStyle = "#f3f6ff"; ctx.shadowColor = "rgba(185,210,255,.7)"; ctx.shadowBlur = 3; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; });
      const x = visible.reduce((s, v) => s + v.p.x, 0) / visible.length, y = visible.reduce((s, v) => s + v.p.y, 0) / visible.length;
      state.hits.push({ type: "group", x, y, radius: 38, value: item.group });
    }
    function draw() {
      if (!state.dragging) state.drift += .00022;
      const w = canvas.clientWidth, h = canvas.clientHeight; ctx.clearRect(0, 0, w, h); state.hits = [];
      const nebula = ctx.createRadialGradient(w * .52, h * .5, 10, w * .52, h * .5, w * .65);
      nebula.addColorStop(0, "rgba(111,91,169,.3)"); nebula.addColorStop(.42, "rgba(83,69,139,.17)"); nebula.addColorStop(1, "rgba(2,5,14,0)"); ctx.fillStyle = nebula; ctx.fillRect(0, 0, w, h);
      bgStars.forEach((s) => { ctx.globalAlpha = s.a; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
      // 모든 행성의 실제 반지름은 같다. 화면 크기는 오직 카메라와의 거리(p.scale)로 정한다.
      const items = dataRef.current.planets.map((planet, i) => { const p = project(PLANET_POSITIONS[i]); return { kind: "planet", planet, p, z: p.z, radius: Math.max(14, p.scale * .3), selected: planet.key === dataRef.current.selectedKey }; });
      dataRef.current.groups.forEach((group, i) => items.push(constellation(group, i)));
      items.sort((a, b) => a.z - b.z).forEach((item) => item.kind === "planet" ? sphere(item) : paintConstellation(item));
      state.raf = requestAnimationFrame(draw);
    }
    function down(e) { canvas.setPointerCapture(e.pointerId); state.pointers.set(e.pointerId, [e.clientX, e.clientY]); state.dragging = true; state.moved = 0; state.lastX = e.clientX; state.lastY = e.clientY; if (state.pointers.size === 2) { const p = [...state.pointers.values()]; state.pinch = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); } setHint(false); }
    function move(e) { if (!state.pointers.has(e.pointerId)) return; state.pointers.set(e.pointerId, [e.clientX, e.clientY]); if (state.pointers.size === 2) { const p = [...state.pointers.values()], distance = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); if (state.pinch) state.zoom = Math.max(.55, Math.min(2.2, state.zoom * distance / state.pinch)); state.pinch = distance; return; } const dx = e.clientX - state.lastX, dy = e.clientY - state.lastY; state.moved += Math.hypot(dx, dy); state.yaw += dx * .009; state.pitch += dy * .009; state.lastX = e.clientX; state.lastY = e.clientY; }
    function up(e) { state.pointers.delete(e.pointerId); state.dragging = state.pointers.size > 0; if (state.moved < 5) { const rect = canvas.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top; const hit = [...state.hits].reverse().find((v) => Math.hypot(v.x - x, v.y - y) <= v.radius); if (hit?.type === "planet") dataRef.current.onPlanetSelect?.(hit.value.key); if (hit?.type === "group") dataRef.current.onConstellationOpen?.(hit.value); } }
    function wheel(e) { e.preventDefault(); state.zoom = Math.max(.55, Math.min(2.2, state.zoom * Math.exp(-e.deltaY * .001))); setHint(false); }
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up); canvas.addEventListener("wheel", wheel, { passive: false }); window.addEventListener("resize", resize); resize(); draw();
    return () => { cancelAnimationFrame(state.raf); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); canvas.removeEventListener("wheel", wheel); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="relative -mx-5 h-[440px] w-[calc(100%+40px)] overflow-hidden bg-[linear-gradient(180deg,#050a18,#080b20_58%,#040711)] md:h-[360px] lg:h-[clamp(300px,43vh,400px)]">
      <canvas ref={canvasRef} className="block h-full w-full cursor-grab touch-none active:cursor-grabbing" aria-label="회전과 확대가 가능한 3D 나의 우주" />
      {hint && <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] tracking-[.08em] text-white/55">드래그로 회전 · 핀치/휠로 확대</div>}
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[9px] text-white/40">3D VIEW</div>
    </div>
  );
}
