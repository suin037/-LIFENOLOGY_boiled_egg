import { useRef, useEffect, useState } from "react";

// 도메인(행성) 지구본 — 중앙=행성색 가스행성, 주위=주별 별자리, 시나리오=◆.
// jy 저작. props:
//   planet     : PLANETS 원소 { key, label, from, to } — from 색으로 행성 톤 결정
//   groups     : constellationGroups() 결과(도메인 필터된 것). group.stars[7] = { date, valence, mood, empty }
//   scenarios  : [{ date, title, dateLabel, br:[A,B], id }] — 그 날짜 별에 ◆ 표식
//   onOpen(sc) : ◆/목록 클릭 시 시나리오 다시 열기 콜백
const PAL = ["#E24B4A", "#D85A30", "#EDA100", "#5DCAA5", "#378ADD"]; // Constellation COL과 동일

function hexToHsl(hex) {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255,
    g = parseInt(m.slice(2, 4), 16) / 255,
    b = parseInt(m.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b);
  let h = 0;
  const l = (mx + mn) / 2,
    d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100) };
}

function level(s) {
  if (s.empty) return 0;
  if (s.mood != null) return Math.max(1, Math.min(5, Math.round(s.mood)));
  if (s.valence != null) return Math.max(1, Math.min(5, Math.round(s.valence * 2 + 3)));
  return 3;
}

export default function PlanetGlobe({ planet, groups, scenarios = [], skin = "basic", trait = {}, fill = false, onOpen, onConstellationOpen, onPlanetTap }) {
  const cvRef = useRef(null);
  const dataRef = useRef({});
  const [sel, setSel] = useState(null);

  const src = (groups || []).filter((g) =>
    g.stars.some((s) => !s.empty),
  );
  // 성단 전부 표시(adaptiveGroups 최대 8묶음) — 별 합계 = 그 영역 기록 수와 일치해야 한다.
  const disp = src.slice(-8);
  const scByDate = {};
  scenarios.forEach((s) => (scByDate[s.date] = s));
  const tone = planet ? hexToHsl(planet.from) : { h: 262, s: 46 };

  dataRef.current = { disp, scByDate, scList: scenarios, tone, skin, trait, label: planet?.label || "관계", onConstellationOpen, onPlanetTap };

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    let raf;
    const st = { rot: 0, tilt: 0, auto: true, dragging: false, lastX: 0, lastY: 0, moved: 0, pinned: null, hit: [], groupHit: [] };

    function resize() {
      const w = cv.clientWidth,
        h = cv.clientHeight,
        d = Math.min(2, window.devicePixelRatio || 1);
      cv.width = w * d;
      cv.height = h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    const nrm = (v) => {
      const l = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / l, v[1] / l, v[2] / l];
    };
    const crs = (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
    const rotateX = (p, angle) => {
      const c = Math.cos(angle), s = Math.sin(angle);
      return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
    };
    function diamond(x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.rect(-s, -s, 2 * s, 2 * s);
      ctx.fillStyle = "#f2ddb0";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,252,245,0.9)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
    function planetOrb(cx, cy, pr) {
      const { tone, label, skin, trait } = dataRef.current;
      const H = tone.h,
        S = tone.s;
      const c = (l) => `hsl(${H},${S}%,${l}%)`;
      const deco = skin !== "basic";
      // 행성 특징: 기울어진 고리 — 별자리를 가리지 않게 행성 바로 둘레(반경 1.5pr)만.
      function ringHalf(back) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((-18 * Math.PI) / 180);
        ctx.beginPath();
        ctx.ellipse(0, 0, pr * 1.5, pr * 0.48, 0, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI);
        ctx.strokeStyle = `hsla(${H},${S}%,72%,${back ? 0.35 : 0.7})`;
        ctx.lineWidth = pr * (back ? 0.1 : 0.13);
        ctx.stroke();
        ctx.restore();
      }
      if (deco && trait?.ring) ringHalf(true);
      let ag = ctx.createRadialGradient(cx, cy, pr * 0.9, cx, cy, pr * 1.7);
      ag.addColorStop(0, `hsla(${H},${S}%,72%,0.18)`);
      ag.addColorStop(1, `hsla(${H},${S}%,72%,0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, pr * 1.7, 0, Math.PI * 2);
      ctx.fillStyle = ag;
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, pr, 0, Math.PI * 2);
      ctx.clip();
      // 구체 표면 — 지도의 행성 스킨과 일치: 줄무늬 스킨일 때만 가스 밴드, 아니면 민무늬 구체.
      if (skin === "stripe") {
        let bg = ctx.createLinearGradient(0, cy - pr, 0, cy + pr);
        [
          [0, 82],
          [0.14, 71],
          [0.27, 85],
          [0.4, 70],
          [0.5, 88],
          [0.6, 70],
          [0.74, 84],
          [0.88, 71],
          [1, 83],
        ].forEach(([p, l]) => bg.addColorStop(p, c(l)));
        ctx.fillStyle = bg;
        ctx.fillRect(cx - pr, cy - pr, 2 * pr, 2 * pr);
      } else {
        let bg = ctx.createRadialGradient(cx - pr * 0.35, cy - pr * 0.32, pr * 0.1, cx, cy, pr * 1.08);
        bg.addColorStop(0, c(80));
        bg.addColorStop(0.55, c(66));
        bg.addColorStop(1, c(56));
        ctx.fillStyle = bg;
        ctx.fillRect(cx - pr, cy - pr, 2 * pr, 2 * pr);
      }
      const spx = cx + pr * 0.3,
        spy = cy + pr * 0.24;
      let sp = ctx.createRadialGradient(spx, spy, 1, spx, spy, pr * 0.19);
      sp.addColorStop(0, `hsla(${(H + 18) % 360},${S + 10}%,48%,0.45)`);
      sp.addColorStop(1, `hsla(${(H + 18) % 360},${S + 10}%,48%,0)`);
      ctx.beginPath();
      ctx.ellipse(spx, spy, pr * 0.19, pr * 0.12, 0, 0, Math.PI * 2);
      ctx.fillStyle = sp;
      ctx.fill();
      const lx = cx - pr * 0.4,
        ly = cy - pr * 0.46;
      let g3 = ctx.createRadialGradient(lx, ly, pr * 0.05, lx, ly, pr * 1.3);
      g3.addColorStop(0, "rgba(255,252,246,0.28)");
      g3.addColorStop(1, "rgba(255,252,246,0)");
      ctx.fillStyle = g3;
      ctx.fillRect(cx - pr, cy - pr, 2 * pr, 2 * pr);
      let g2 = ctx.createRadialGradient(cx + pr * 0.5, cy + pr * 0.55, pr * 0.1, cx + pr * 0.5, cy + pr * 0.55, pr * 1.6);
      g2.addColorStop(0, `hsla(${H},30%,14%,0.28)`);
      g2.addColorStop(1, `hsla(${H},30%,14%,0)`);
      ctx.fillStyle = g2;
      ctx.fillRect(cx - pr, cy - pr, 2 * pr, 2 * pr);
      let g1 = ctx.createRadialGradient(cx, cy, pr * 0.66, cx, cy, pr);
      g1.addColorStop(0, `hsla(${H},30%,10%,0)`);
      g1.addColorStop(1, `hsla(${H},30%,10%,0.42)`);
      ctx.fillStyle = g1;
      ctx.fillRect(cx - pr, cy - pr, 2 * pr, 2 * pr);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, pr - 0.6, Math.PI * 0.86, Math.PI * 1.52);
      ctx.strokeStyle = "rgba(255,250,244,0.46)";
      ctx.lineWidth = 1.1;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, pr, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${H},${S}%,40%,0.2)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      // 고리 앞쪽 반 + 위성 — 지도의 행성 특징을 3D에서도. 작게 유지해 별자리를 안 가린다.
      if (deco && trait?.ring) ringHalf(false);
      if (deco && trait?.moon) {
        const ma = st.rot * 1.6 + 1.1; // 천천히 행성을 도는 작은 달
        const mx2 = cx + Math.cos(ma) * pr * 1.45;
        const my2 = cy - Math.sin(ma) * pr * 0.6;
        ctx.beginPath();
        ctx.arc(mx2, my2, pr * 0.14, 0, Math.PI * 2);
        ctx.fillStyle = c(78);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mx2 + pr * 0.04, my2 + pr * 0.05, pr * 0.14, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${H},30%,12%,0.35)`;
        ctx.fill();
      }
      ctx.fillStyle = "rgba(245,240,232,0.8)";
      ctx.font = "500 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(label, cx, cy + pr + 7);
    }
    function draw() {
      const { disp, scByDate } = dataRef.current;
      const w = cv.clientWidth,
        h = cv.clientHeight;
      ctx.clearRect(0, 0, w, h);
      st.hit = [];
      st.groupHit = [];
      const cx = w / 2,
        cy = h / 2,
        Rsky = Math.min(w, h) * 0.35,
        scale = Math.min(w, h) * 0.12,
        pr = Math.min(w, h) * 0.115; // 지도 줌인 행성과 크기 연속성 — 전환 시 덜 튀게
      const C = disp.length;
      const PH = [0.3, -0.22, 0.24, -0.32, 0.16];
      ctx.beginPath();
      ctx.arc(cx, cy, Rsky + scale * 0.75, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(159,176,206,0.09)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      const cl = [];
      for (let g = 0; g < C; g++) {
        const th = (g / C) * Math.PI * 2 + st.rot,
          ph = PH[g % PH.length];
        const A = rotateX([Math.cos(ph) * Math.sin(th), Math.sin(ph), Math.cos(ph) * Math.cos(th)], st.tilt);
        // 빌보드 — 별자리를 접평면에 눕히지 않고 화면과 평행하게 그린다.
        // 시트(Constellation)와 같은 모양이 유지되고, 깊이는 크기·투명도로만 표현.
        const scx = cx + A[0] * Rsky;
        const scy = cy - A[1] * Rsky * 0.92;
        const depF = (A[2] + 1) / 2;
        const S = scale * (0.72 + 0.42 * depF);
        const stars = [];
        const grp = disp[g].stars;
        for (let j = 0; j < grp.length; j++) {
          const lv = level(grp[j]),
            mn = lv ? (lv - 1) / 4 : 0,
            lr = 0.21 + mn * 0.79; // 시트의 R_MIN(16)/R_SPREAD(60) 비율 그대로
          const ang = (-90 + j * (360 / 7)) * (Math.PI / 180);
          stars.push({
            sx: scx + Math.cos(ang) * lr * S,
            sy: scy + Math.sin(ang) * lr * S,
            z: A[2] * Rsky,
            lv,
            date: grp[j].date,
          });
        }
        cl.push({ c: g, z: A[2], stars, cxs: scx, cys: scy });
      }
      // 시간의 실 — 성단들을 오래된 순서대로 잇는다(순서 표현). 실이 끊긴 곳이 시작↔최근.
      const centers = cl.map((k) => ({ x: k.cxs, y: k.cys, z: k.z }));
      if (centers.length > 1) {
        for (let i = 0; i < centers.length - 1; i++) {
          const p1 = centers[i],
            p2 = centers[i + 1];
          const dep2 = ((p1.z + p2.z) / 2 + 1) / 2;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(159,176,206,${(0.05 + 0.14 * dep2).toFixed(3)})`;
          ctx.lineWidth = 0.7;
          ctx.setLineDash([3, 5]);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
      cl.sort((a, b) => a.z - b.z);
      const focus = st.pinned != null ? st.pinned : (cl.length ? cl[cl.length - 1].c : null);
      function paint(grp) {
        const dep = (grp.z + 1) / 2,
          foc = grp.c === focus;
        for (let j = 0; j < grp.stars.length; j++) {
          const a = grp.stars[j],
            b = grp.stars[(j + 1) % grp.stars.length];
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.strokeStyle = "rgba(159,176,206," + (0.09 + 0.4 * dep) + ")";
          ctx.lineWidth = foc ? 1 : 0.6;
          ctx.stroke();
          for (let t = 1; t <= 2; t++) {
            const f = t / 3;
            ctx.beginPath();
            ctx.arc(a.sx + (b.sx - a.sx) * f, a.sy + (b.sy - a.sy) * f, 0.8, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(159,176,206," + (0.12 + 0.28 * dep) + ")";
            ctx.fill();
          }
        }
        for (let k = 0; k < grp.stars.length; k++) {
          const s = grp.stars[k],
            sc = scByDate[s.date],
            rad = (s.lv ? 2 + (s.lv / 5) * 3 : 1.6) * (0.55 + 0.7 * dep);
          if (sc) {
            if (grp.z > -0.2) st.hit.push({ x: s.sx, y: s.sy, sc });
            ctx.beginPath();
            ctx.arc(s.sx, s.sy, rad + 7, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(225,190,140,0.16)";
            ctx.fill();
            diamond(s.sx, s.sy, 3.4 * (0.7 + 0.5 * dep));
          } else if (s.lv) {
            if (foc) {
              ctx.beginPath();
              ctx.arc(s.sx, s.sy, rad + 5, 0, Math.PI * 2);
              ctx.fillStyle = "rgba(235,220,190,0.1)";
              ctx.fill();
            }
            ctx.globalAlpha = 0.35 + 0.65 * dep;
            ctx.beginPath();
            ctx.arc(s.sx, s.sy, rad, 0, Math.PI * 2);
            ctx.fillStyle = PAL[s.lv - 1];
            ctx.fill();
            ctx.globalAlpha = 1;
          } else {
            ctx.beginPath();
            ctx.arc(s.sx, s.sy, 1.6, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(120,135,165,0.4)";
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
        const visibleStars = grp.stars.filter((star) => star.lv);
        if (visibleStars.length && grp.z > -0.35) {
          const gx = visibleStars.reduce((sum, star) => sum + star.sx, 0) / visibleStars.length;
          const gy = visibleStars.reduce((sum, star) => sum + star.sy, 0) / visibleStars.length;
          st.groupHit.push({ x: gx, y: gy, z: grp.z, group: disp[grp.c] });
        }
        // 순번·기간 라벨 — 몇 번째 시기의 별자리인지. 최근 성단은 시안색으로 강조.
        const src = disp[grp.c];
        if (src && grp.stars.length) {
          const gx2 = grp.stars.reduce((sum, star) => sum + star.sx, 0) / grp.stars.length;
          const gyMax = Math.max(...grp.stars.map((star) => star.sy));
          const isLatest = grp.c === disp.length - 1;
          const first = String(src.label || (src.weekStart ? src.weekStart.slice(5) : "")).split("~")[0];
          ctx.font = "500 9px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = isLatest
            ? `rgba(127,212,255,${(0.5 + 0.5 * dep).toFixed(2)})`
            : `rgba(159,176,206,${(0.22 + 0.42 * dep).toFixed(2)})`;
          ctx.fillText(`${grp.c + 1}·${first}~${isLatest ? " 최근" : ""}`, gx2, gyMax + 6);
        }
      }
      for (let i = 0; i < cl.length; i++) if (cl[i].z < 0) paint(cl[i]);
      // 시나리오 궤도(뒤쪽 선) — 시뮬레이션 = 이 영역의 '추가 별'(◆).
      const scs = dataRef.current.scList || [];
      const Rsc = Math.min(w, h) * 0.205;
      if (scs.length) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, Rsc, Rsc * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(242,221,176,0.16)";
        ctx.lineWidth = 0.6;
        ctx.setLineDash([2, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      planetOrb(cx, cy, pr);
      for (let i = 0; i < cl.length; i++) if (cl[i].z >= 0) paint(cl[i]);
      // 시나리오 ◆ 들 — 앞궤도를 돌며, 누르면 내용(sel)이 열린다.
      for (let i = 0; i < scs.length; i++) {
        const a2 = (i / scs.length) * Math.PI * 2 + st.rot * 1.35 + 0.7;
        const sx = cx + Math.cos(a2) * Rsc;
        const sy = cy - Math.sin(a2) * Rsc * 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 9, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(225,190,140,0.14)";
        ctx.fill();
        diamond(sx, sy, 4);
        st.hit.push({ x: sx, y: sy, sc: scs[i] });
      }
    }
    function loop() {
      if (st.auto && !st.dragging && st.pinned == null) st.rot += 0.005;
      // Canvas animation errors must not escape into Vite's full-screen runtime overlay.
      // The rest of My Universe remains usable even if a malformed legacy record is found.
      try {
        draw();
      } catch (error) {
        console.warn("PlanetGlobe draw skipped", error);
        dataRef.current = { ...dataRef.current, disp: [] };
      }
      raf = requestAnimationFrame(loop);
    }
    const onDown = (e) => {
      st.dragging = true;
      st.auto = false; // 사용자가 건들면 자동 회전 정지 — 이후 드래그로만 움직인다
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      st.moved = 0;
      cv.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      if (!st.dragging) return;
      const dx = e.clientX - st.lastX;
      const dy = e.clientY - st.lastY;
      st.moved += Math.hypot(dx, dy);
      st.rot += dx * 0.01;
      st.tilt += dy * 0.01;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      st.pinned = null;
    };
    const onUp = (e) => {
      st.dragging = false;
      if (st.moved < 10) {
        const r = cv.getBoundingClientRect(),
          mx = e.clientX - r.left,
          my = e.clientY - r.top;
        // 1) 탭 지점에 '아주 가까운' 앞쪽 별자리 — 행성 위를 지나는 성단도 정확히 겨누면 열린다.
        let tight = null;
        for (const hit of st.groupHit) {
          const distance = Math.hypot(hit.x - mx, hit.y - my);
          const front = (hit.z ?? 1) > -0.1;
          if (distance < 28 && front && (!tight || distance < tight.distance)) tight = { ...hit, distance };
        }
        if (tight?.group) {
          dataRef.current.onConstellationOpen?.(tight.group);
          return;
        }
        // 2) 시나리오 ◆
        for (let i = 0; i < st.hit.length; i++) {
          if (Math.hypot(st.hit[i].x - mx, st.hit[i].y - my) < 14) {
            setSel(st.hit[i].sc);
            return;
          }
        }
        // 3) 가운데 행성 탭 = 우주 전경 복귀 — 넉넉하게.
        const pcx = cv.clientWidth / 2,
          pcy = cv.clientHeight / 2,
          ppr = Math.min(cv.clientWidth, cv.clientHeight) * 0.115;
        if (Math.hypot(mx - pcx, my - pcy) <= ppr + 14) {
          dataRef.current.onPlanetTap?.();
          return;
        }
        // 4) 느슨한 별자리 판정 — 행성 밖 빈 하늘을 눌러도 가까운 성단이 열린다.
        let nearest = null;
        for (const hit of st.groupHit) {
          const distance = Math.hypot(hit.x - mx, hit.y - my);
          if (distance < 52 && (!nearest || distance < nearest.distance)) nearest = { ...hit, distance };
        }
        if (nearest?.group) dataRef.current.onConstellationOpen?.(nearest.group);
      }
    };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    window.addEventListener("resize", resize);
    resize();
    loop();
    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className={fill ? "h-full" : undefined}>
      <canvas
        ref={cvRef}
        style={{ width: "100%", height: fill ? "100%" : "320px", display: "block", touchAction: "none", cursor: "grab" }}
      />
      {disp.length === 0 && (
        <div className="pointer-events-none -mt-[178px] mb-[128px] text-center">
          <p className="text-[12px] font-semibold text-sub">아직 이 행성에서 발견한 별이 없어요</p>
          <p className="mt-1 text-[10px] text-mut">관련 기록이나 시뮬레이션이 생기면 궤도에 표시돼요.</p>
        </div>
      )}
      {sel ? (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          <div style={{ fontWeight: 500 }}>
            {sel.title} · {sel.dateLabel || sel.date}
          </div>
          {sel.br && (
            <div className="text-sub">
              선택지 A. {sel.br[0]} / B. {sel.br[1]}
            </div>
          )}
          <button className="tap mt-1 text-[12px] text-cyan" onClick={() => onOpen?.(sel)}>
            다시 열기 ↗
          </button>
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-mut">별자리 위 ◆(시나리오 만든 날)를 누르면 정리가 열려요.</p>
      )}
    </div>
  );
}
