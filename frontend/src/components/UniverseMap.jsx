import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { RotateCcw } from "lucide-react";

const PLANET_POSITIONS = [
  [-5.2, 2.2, -1.2], [0, -1.1, 1.5], [-5.3, -3.1, -6.4],
  [5.1, -3, -1.8], [5.2, 2.2, -5.2],
];
const PLANET_SIZES = [1.05, 1.35, .9, 1, 1.12];
const INITIAL_CAMERA = new THREE.Vector3(0, 4.8, 18);
const UNIVERSE_TARGET = new THREE.Vector3(0, -1.1, 0);

function seeded(seed) {
  let value = seed;
  return () => ((value = Math.sin(value * 999.91) * 43758.5453) - Math.floor(value));
}

function makeSoftTexture(stops) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([position, color]) => gradient.addColorStop(position, color));
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 별 알갱이 — Points 로 한 번에 그리므로 모양은 이 스프라이트가 낸다.
// 모듈에 한 번만 만든다(별자리마다 캔버스를 만들면 그것도 비용이다).
let _starSprite = null;
function starSprite() {
  if (_starSprite) return _starSprite;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(.35, "rgba(255,255,255,.72)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _starSprite = new THREE.CanvasTexture(canvas);
  _starSprite.colorSpace = THREE.SRGBColorSpace;
  return _starSprite;
}

function makePlanetTexture(from, to, seed) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const context = canvas.getContext("2d");
  const image = context.createImageData(canvas.width, canvas.height);
  const base = new THREE.Color(from), accent = new THREE.Color(to);
  const random = seeded(seed + 10);
  const phases = Array.from({ length: 8 }, () => random() * Math.PI * 2);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width, v = y / canvas.height;
      const broad = Math.sin(u * 12 + phases[0]) * .35 + Math.sin(v * 16 + phases[1]) * .28;
      const detail = Math.sin((u + v) * 37 + phases[2]) * .16 + Math.sin((u - v) * 61 + phases[3]) * .09;
      const cloud = Math.sin(u * 5 + Math.sin(v * 9 + phases[4]) * 1.8) * .22;
      const mix = THREE.MathUtils.clamp(.34 + broad + detail + cloud, 0, 1);
      const shade = base.clone().lerp(accent, mix * .55).multiplyScalar(.62 + mix * .42);
      const at = (y * canvas.width + x) * 4;
      image.data[at] = shade.r * 255; image.data[at + 1] = shade.g * 255;
      image.data[at + 2] = shade.b * 255; image.data[at + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function Nebulae({ reduced }) {
  const texture = useMemo(() => makeSoftTexture([
    [0, "rgba(91,111,210,.24)"], [.28, "rgba(67,51,147,.16)"],
    [.62, "rgba(35,23,91,.07)"], [1, "rgba(0,0,0,0)"],
  ]), []);
  const warm = useMemo(() => makeSoftTexture([
    [0, "rgba(255,213,155,.18)"], [.22, "rgba(152,93,143,.10)"], [1, "rgba(0,0,0,0)"],
  ]), []);
  const clouds = reduced ? [[-9,5,-18,18,8,texture],[10,-5,-24,23,10,texture]] : [
    [-11,6,-20,22,9,texture],[12,-6,-27,27,12,texture],[-3,-9,-15,16,7,warm],[5,9,-32,22,9,texture],
  ];
  return <group>{clouds.map(([x,y,z,w,h,map],index)=><sprite key={index} position={[x,y,z]} scale={[w,h,1]}>
    <spriteMaterial map={map} transparent opacity={.7} depthWrite={false} blending={THREE.AdditiveBlending}/>
  </sprite>)}</group>;
}

function Galaxy({ reduced }) {
  const ref = useRef();
  const geometry = useMemo(() => {
    const count = reduced ? 3000 : 7200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const random = seeded(17.31);
    const inner = new THREE.Color("#fff4dc"), outer = new THREE.Color("#7557ba");
    for (let i = 0; i < count; i++) {
      const radius = Math.pow(random(), .72) * 9.8;
      const arm = i % 4;
      const angle = arm * Math.PI / 2 + radius * .78 + (random() - .5) * (.3 + radius * .07);
      const spread = .08 + radius * .045;
      positions[i * 3] = Math.cos(angle) * radius + (random() - .5) * spread;
      positions[i * 3 + 1] = (random() - .5) * (.28 + radius * .075);
      positions[i * 3 + 2] = Math.sin(angle) * radius + (random() - .5) * spread;
      const color = inner.clone().lerp(outer, Math.min(1, radius / 8.8));
      color.offsetHSL((random() - .5) * .035, 0, (random() - .5) * .12);
      colors.set(color.toArray(), i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [reduced]);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * .012; });
  const core = useMemo(() => makeSoftTexture([[0,"rgba(255,247,217,.95)"],[.12,"rgba(255,219,162,.45)"],[.42,"rgba(147,112,214,.12)"],[1,"rgba(0,0,0,0)"]]), []);
  return <group rotation={[-.36, 0, .12]} position={[0,-.3,-3]}>
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={reduced ? .025 : .034} vertexColors transparent opacity={.72} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending}/>
    </points>
    <sprite scale={[5.2,5.2,1]}><spriteMaterial map={core} transparent opacity={.68} depthWrite={false} blending={THREE.AdditiveBlending}/></sprite>
    <pointLight color="#ffe3ba" intensity={7} distance={12}/>
  </group>;
}

function StarLayer({ count, radius, size, opacity, seed, color="#e9ecff" }) {
  const geometry = useMemo(() => {
    const random = seeded(seed), positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * (.55 + random() * .45), theta = random() * Math.PI * 2, phi = Math.acos(2 * random() - 1);
      positions.set([r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * .62, r * Math.sin(phi) * Math.sin(theta)], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(positions, 3)); return geo;
  }, [count, radius, seed]);
  const ref = useRef();
  useFrame((state) => { if (ref.current) ref.current.material.opacity = opacity * (.92 + Math.sin(state.clock.elapsedTime * .38 + seed) * .08); });
  return <points ref={ref} geometry={geometry}><pointsMaterial color={color} size={size} transparent opacity={opacity} sizeAttenuation depthWrite={false}/></points>;
}

function OrbitRings() {
  return <group rotation={[-Math.PI / 2 + .19, 0, .1]}>{[3.2,4.7,6.2,7.8].map((r,i)=><mesh key={r} rotation={[0,i*.025,i*.018]}><ringGeometry args={[r-.006,r+.006,160]}/><meshBasicMaterial color="#8f8eb0" transparent opacity={.055+i*.008} side={THREE.DoubleSide} depthWrite={false}/></mesh>)}</group>;
}

function Planet({ planet, index, selected, onSelect, skin }) {
  const group = useRef();
  const mesh = useRef();
  const position = PLANET_POSITIONS[index];
  const size = PLANET_SIZES[index];
  const texture = useMemo(() => makePlanetTexture(planet.from, planet.to, index * 13.7), [planet.from, planet.to, index]);
  useFrame((state, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * (.045 + index * .008);
    if (group.current) group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * .28 + index) * .08;
  });
  return <group ref={group} position={position}>
    <mesh ref={mesh} onClick={(e)=>{e.stopPropagation();onSelect(planet.key);}} onDoubleClick={(e)=>{e.stopPropagation();onSelect(planet.key);}}>
      <sphereGeometry args={[size, 64, 64]}/>
      <meshPhysicalMaterial
        map={texture}
        bumpMap={texture}
        bumpScale={.045}
        color="#ffffff"
        roughness={skin === "glow" ? .34 : skin === "stripe" ? .64 : .52}
        metalness={.03}
        clearcoat={skin === "glow" ? .42 : .18}
        clearcoatRoughness={.28}
        sheen={.28}
        sheenColor={planet.to}
        emissive={planet.from}
        emissiveIntensity={skin === "glow" ? .065 : selected ? .035 : .012}
      />
    </mesh>
    <mesh scale={1.028}><sphereGeometry args={[size,48,48]}/><meshBasicMaterial color={planet.to} side={THREE.BackSide} transparent opacity={skin === "glow" ? .09 : .04} blending={THREE.AdditiveBlending} depthWrite={false}/></mesh>
    <mesh position={[-size*.34,size*.38,size*.86]} scale={[size*.3,size*.19,size*.07]}>
      <sphereGeometry args={[1,32,16]}/>
      <meshBasicMaterial color="#fffaf2" transparent opacity={skin === "glow" ? .28 : .16} blending={THREE.AdditiveBlending} depthWrite={false}/>
    </mesh>
    <pointLight position={[-2,2,3]} color={planet.to} intensity={selected ? 1.5 : .55} distance={5.5} decay={2}/>
    {(index===0||skin==="ring")&&<mesh rotation={[Math.PI/2.3,.15,0]}><ringGeometry args={[size*1.28,size*1.48,96]}/><meshBasicMaterial color={planet.to} transparent opacity={.24} side={THREE.DoubleSide} depthWrite={false}/></mesh>}
    {skin==="stripe"&&[-.5,-.18,.18,.5].map((y)=><mesh key={y} position={[0,y*size,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[Math.sqrt(Math.max(.05,size*size-(y*size)*(y*size))),.025,8,64]}/><meshBasicMaterial color={planet.to} transparent opacity={.32}/></mesh>)}
    <Html center position={[0,-size-0.5,0]} distanceFactor={10} style={{pointerEvents:"none"}}><div className={`whitespace-nowrap text-center drop-shadow-[0_2px_8px_#000] ${selected?"text-white":"text-white/80"}`}><b className="text-[13px]">{planet.label}</b></div></Html>
  </group>;
}

function Constellation3D({ group, index, anchorIndex, onOpen }) {
  const orbit = useRef();
  const root = PLANET_POSITIONS[anchorIndex];
  // 별자리 하나는 최대 7별로 끊어 넘어온다(starGroupsOf). 여기서 또 자르면 별이 사라진다.
  const visible = group.stars.filter((s)=>!s.empty);
  // 그 행성 안에서 몇 번째 별자리인지로 궤도를 잡는다.
  // 전엔 '전체 배열에서 몇 번째'를 썼는데, 다섯 행성 것이 한 배열로 들어오면서
  // 뒤쪽 별자리가 행성에서 7 이상 떨어져 나가 우주에 흩뿌려진 것처럼 보였다.
  const ord = group.index ?? index;
  const planetSize = PLANET_SIZES[anchorIndex] ?? 1;
  const orbitRadius = planetSize + .75 + (ord % 3) * .3;   // 행성에 붙어 도는 좁은 띠
  const points = useMemo(() => visible.map((_, i)=>{
    const a = i * 1.71 + ord;
    const radius = .32 + i * .035;
    return [Math.cos(a)*radius, Math.sin(a)*radius*.72, (i-3)*.055];
  }), [group.weekStart, visible.length, ord]);
  const geometry = useMemo(()=>new THREE.BufferGeometry().setFromPoints(points.map((p)=>new THREE.Vector3(...p))),[points]);
  // 별을 Points 하나로 그린다 — 별마다 mesh + pointLight 를 두면 기록이 늘수록
  // 드로우콜과 동적 광원이 같이 늘어난다(1년치면 광원만 100개가 넘어 프레임이 무너졌다).
  const starGeo = useMemo(()=>{
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
    return g;
  },[points]);
  useFrame((state,delta)=>{
    if (!orbit.current) return;
    orbit.current.rotation.y += delta * (.055 + (ord % 5) * .006);
    orbit.current.rotation.z = Math.sin(state.clock.elapsedTime * .08 + ord) * .09;
  });
  if (!visible.length) return null;
  // 황금각(2.4rad)으로 돌려 별자리가 몇 개든 행성 둘레에 고르게 퍼지게 한다.
  return <group ref={orbit} position={root} rotation={[.18+(ord%3)*.24, ord*2.39996, .12]}>
    <group position={[orbitRadius,0,0]} onClick={(e)=>{e.stopPropagation();onOpen?.(group);}}>
      <mesh visible={false}><sphereGeometry args={[.5,10,10]}/><meshBasicMaterial transparent opacity={0}/></mesh>
      <line geometry={geometry}><lineBasicMaterial color="#B9C7E4" transparent opacity={.55}/></line>
      {/* 기록은 하얀 별. 시나리오(마름모)와 한눈에 갈라지도록 색을 섞지 않는다.
          별 하나를 세 겹으로 겹쳐 그린다 — 넓은 번짐 → 가까운 무리 → 알맹이.
          광원을 쓰지 않고도 별 주위가 밝게 퍼져 보이는 건 이 겹침이다
          (동적 광원은 기록 수만큼 늘어나 프레임을 무너뜨린다). */}
      <points geometry={starGeo}>
        <pointsMaterial
          color="#9FC4FF" size={.86} sizeAttenuation transparent opacity={.26}
          map={starSprite()} depthWrite={false} blending={THREE.AdditiveBlending}
        />
      </points>
      <points geometry={starGeo}>
        <pointsMaterial
          color="#DCE8FF" size={.46} sizeAttenuation transparent opacity={.55}
          map={starSprite()} depthWrite={false} blending={THREE.AdditiveBlending}
        />
      </points>
      <points geometry={starGeo}>
        <pointsMaterial
          color="#ffffff" size={.24} sizeAttenuation transparent opacity={1}
          map={starSprite()} depthWrite={false} blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  </group>;
}

// 시나리오 = 마름모(정팔면체). 기록(하얀 별)과 모양·색으로 갈라 놓아야
// "지나온 것"과 "탐색한 미래"가 한 행성 위에서 섞이지 않는다.
function ScenarioMark({ scenario, index, anchorIndex, onOpen }) {
  const spin = useRef();
  const root = PLANET_POSITIONS[anchorIndex];
  useFrame((state,delta)=>{
    if (!spin.current) return;
    spin.current.rotation.y += delta * .5;
    spin.current.position.y = Math.sin(state.clock.elapsedTime * .5 + index) * .12;
  });
  const angle = index * 1.9 + .6;
  const radius = 1.62;
  return <group position={root}>
    <group position={[Math.cos(angle)*radius, 1.15 + (index%2)*.34, Math.sin(angle)*radius]}>
      <mesh ref={spin} onClick={(e)=>{e.stopPropagation();onOpen?.(scenario);}}>
        <octahedronGeometry args={[.135,0]}/>
        <meshStandardMaterial color="#C9A6FF" emissive="#8B6CCF" emissiveIntensity={2.4} roughness={.3}/>
      </mesh>
    </group>
  </group>;
}

function CameraRig({ selectedKey, planets, controlsRef, resetSignal }) {
  const { camera } = useThree();
  const flight = useRef(null);
  useEffect(()=>{
    const index = planets.findIndex((p)=>p.key===selectedKey);
    const target = index >= 0 ? new THREE.Vector3(...PLANET_POSITIONS[index]) : UNIVERSE_TARGET.clone();
    // 선택된 행성이 화면 중앙보다 살짝 위에 놓이도록 시선 중심을 아래로 내린다.
    if (index >= 0) target.y -= .9;
    const direction = camera.position.clone().sub(target).normalize();
    flight.current = { target, position: index>=0 ? target.clone().add(direction.multiplyScalar(12)) : INITIAL_CAMERA.clone() };
  },[selectedKey, resetSignal]);
  useFrame((_, delta)=>{
    if (!flight.current || !controlsRef.current) return;
    const cameraEase = 1 - Math.exp(-delta * 10.5);
    const targetEase = 1 - Math.exp(-delta * 12.5);
    camera.position.lerp(flight.current.position, cameraEase);
    controlsRef.current.target.lerp(flight.current.target, targetEase);
    controlsRef.current.update();
    if (camera.position.distanceTo(flight.current.position)<.018) {
      camera.position.copy(flight.current.position);
      controlsRef.current.target.copy(flight.current.target);
      flight.current=null;
    }
  });
  return null;
}

function Scene({ planets, groups, scenarios = [], selectedKey, onPlanetSelect, onConstellationOpen, onScenarioOpen, resetSignal, reduced, skin }) {
  const controls = useRef();
  const selectedIndex = Math.max(0, planets.findIndex((planet)=>planet.key===selectedKey));
  return <>
    <color attach="background" args={["#01030a"]}/><fog attach="fog" args={["#02050d",20,58]}/>
    <ambientLight color="#536080" intensity={.18}/>
    <hemisphereLight color="#bfcaf0" groundColor="#050611" intensity={.3}/>
    <directionalLight position={[-9,10,13]} color="#fff1dc" intensity={3.7}/>
    <directionalLight position={[11,-5,-9]} color="#617bd1" intensity={.42}/>
    <Nebulae reduced={reduced}/>
    <StarLayer count={reduced?700:1500} radius={48} size={.025} opacity={.38} seed={2} color="#bfc9e8"/>
    <StarLayer count={reduced?320:760} radius={27} size={.052} opacity={.58} seed={7} color="#e1e8ff"/>
    <StarLayer count={reduced?95:260} radius={14} size={.095} opacity={.78} seed={13} color="#fff5df"/>
    <Sparkles count={reduced?22:48} scale={[25,14,25]} size={.72} speed={.045} opacity={.16} color="#bac8ff" noise={1.8}/>
    <Galaxy reduced={reduced}/><OrbitRings/>
    {planets.map((planet,i)=><Planet key={planet.key} planet={planet} index={i} selected={planet.key===selectedKey} onSelect={onPlanetSelect} skin={skin}/>) }
    {/* 자르지 않는다 — 여기서 잘라내면 띄운 별 수가 실제 기록 수와 어긋난다.
        (전에는 .slice(-5) 로 별자리를 5개만 그려 오래된 기록이 조용히 사라졌다.) */}
    {groups.map((group,i)=>{
      const domainIndex=planets.findIndex((planet)=>planet.key===group.domain);
      const anchorIndex=selectedKey?selectedIndex:(domainIndex>=0?domainIndex:i%planets.length);
      return <Constellation3D key={group.weekStart||i} group={group} index={i} anchorIndex={anchorIndex} onOpen={(pickedGroup)=>{
        onPlanetSelect?.(planets[anchorIndex]?.key);
        onConstellationOpen?.(pickedGroup, planets[anchorIndex]?.key);
      }}/>;
    }) }
    {/* 그 영역에서 만든 미래 — 행성 위쪽에 마름모로 뜬다. */}
    {(selectedKey ? scenarios.filter((s)=>s.domain===selectedKey) : scenarios).map((scenario,i)=>{
      const domainIndex=planets.findIndex((planet)=>planet.key===scenario.domain);
      if (domainIndex<0) return null;
      return <ScenarioMark key={`${scenario.domain}-${scenario.date}-${i}`} scenario={scenario} index={i} anchorIndex={domainIndex} onOpen={(picked)=>{
        onPlanetSelect?.(scenario.domain);
        onScenarioOpen?.(picked);
      }}/>;
    }) }
    <OrbitControls ref={controls} target={UNIVERSE_TARGET.toArray()} makeDefault enableDamping dampingFactor={.11} enablePan screenSpacePanning minDistance={2.8} maxDistance={34} rotateSpeed={.22} zoomSpeed={.62} panSpeed={.48} mouseButtons={{LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN}}/>
    <CameraRig selectedKey={selectedKey} planets={planets} controlsRef={controls} resetSignal={resetSignal}/>
  </>;
}

export default function UniverseMap({ planets, groups=[], scenarios=[], selectedKey, onPlanetSelect, onConstellationOpen, onScenarioOpen, skin="basic" }) {
  const [resetSignal,setResetSignal]=useState(0);
  const reduced = typeof window!=="undefined" && (window.innerWidth<760 || (navigator.hardwareConcurrency||8)<=4);
  return <div className="relative h-[calc(100dvh-112px)] min-h-[540px] w-full overflow-hidden bg-[#01040c] md:h-[calc(100dvh-104px)] md:min-h-[600px]">
    <Canvas dpr={reduced?[1,1.25]:[1,1.75]} camera={{position:INITIAL_CAMERA.toArray(),fov:48,near:.1,far:100}} gl={{antialias:!reduced,powerPreference:"high-performance"}} onPointerMissed={()=>onPlanetSelect?.(null)}>
      <Suspense fallback={null}><Scene planets={planets} groups={groups} scenarios={scenarios} selectedKey={selectedKey} onPlanetSelect={onPlanetSelect} onConstellationOpen={onConstellationOpen} onScenarioOpen={onScenarioOpen} resetSignal={resetSignal} reduced={reduced} skin={skin}/></Suspense>
    </Canvas>
    <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-[#050914]/70 px-4 py-2 text-[9px] tracking-[.08em] text-white/55 backdrop-blur">왼쪽 드래그 회전 · Shift+드래그/오른쪽 드래그 이동 · 휠/핀치 접근</div>
    <button onClick={()=>{onPlanetSelect?.(null);setResetSignal((v)=>v+1);}} className="tap absolute bottom-5 right-5 flex items-center gap-2 rounded-full border border-white/10 bg-[#050914]/75 px-3 text-[10px] text-white/65 backdrop-blur"><RotateCcw size={13}/> 우주 중심</button>
  </div>;
}
