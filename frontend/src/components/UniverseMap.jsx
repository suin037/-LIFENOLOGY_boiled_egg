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

function Galaxy({ reduced }) {
  const ref = useRef();
  const geometry = useMemo(() => {
    const count = reduced ? 2300 : 5200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const random = seeded(17.31);
    const inner = new THREE.Color("#fff4dc"), outer = new THREE.Color("#7557ba");
    for (let i = 0; i < count; i++) {
      const radius = Math.pow(random(), .62) * 8.8;
      const arm = i % 4;
      const angle = arm * Math.PI / 2 + radius * .78 + (random() - .5) * (.3 + radius * .07);
      const spread = .12 + radius * .035;
      positions[i * 3] = Math.cos(angle) * radius + (random() - .5) * spread;
      positions[i * 3 + 1] = (random() - .5) * (.18 + radius * .055);
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
  return <group rotation={[-.22, 0, .08]}>
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={reduced ? .035 : .045} vertexColors transparent opacity={.83} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending}/>
    </points>
    <mesh rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[1.25, 64]}/><meshBasicMaterial color="#fff0d5" transparent opacity={.055} blending={THREE.AdditiveBlending} depthWrite={false}/></mesh>
    <pointLight color="#cbb3ff" intensity={9} distance={13}/>
  </group>;
}

function StarLayer({ count, radius, size, opacity, seed }) {
  const geometry = useMemo(() => {
    const random = seeded(seed), positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * (.55 + random() * .45), theta = random() * Math.PI * 2, phi = Math.acos(2 * random() - 1);
      positions.set([r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * .62, r * Math.sin(phi) * Math.sin(theta)], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(positions, 3)); return geo;
  }, [count, radius, seed]);
  return <points geometry={geometry}><pointsMaterial color="#e9ecff" size={size} transparent opacity={opacity} sizeAttenuation depthWrite={false}/></points>;
}

function OrbitRings() {
  return <group rotation={[-Math.PI / 2 + .12, 0, .08]}>{[3.2,4.7,6.2,7.8].map((r)=><mesh key={r}><ringGeometry args={[r-.012,r+.012,160]}/><meshBasicMaterial color="#9275d2" transparent opacity={.13} side={THREE.DoubleSide} depthWrite={false}/></mesh>)}</group>;
}

function Planet({ planet, index, selected, onSelect, skin }) {
  const group = useRef();
  const mesh = useRef();
  const position = PLANET_POSITIONS[index];
  const size = PLANET_SIZES[index];
  useFrame((state, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * (.045 + index * .008);
    if (group.current) group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * .28 + index) * .08;
  });
  return <group ref={group} position={position}>
    <mesh ref={mesh} onClick={(e)=>{e.stopPropagation();onSelect(planet.key);}} onDoubleClick={(e)=>{e.stopPropagation();onSelect(planet.key);}}>
      <sphereGeometry args={[size, 64, 64]}/>
      <meshPhysicalMaterial
        color={planet.from}
        roughness={skin === "glow" ? .14 : skin === "stripe" ? .3 : .24}
        metalness={skin === "glow" ? .2 : .08}
        clearcoat={skin === "glow" ? 1 : .82}
        clearcoatRoughness={skin === "glow" ? .06 : .14}
        sheen={.72}
        sheenColor={planet.to}
        emissive={planet.from}
        emissiveIntensity={skin === "glow" ? .16 : selected ? .08 : .035}
      />
    </mesh>
    <mesh scale={1.042}><sphereGeometry args={[size,48,48]}/><meshBasicMaterial color={planet.to} side={THREE.BackSide} transparent opacity={skin === "glow" ? .13 : .065} blending={THREE.AdditiveBlending} depthWrite={false}/></mesh>
    <mesh position={[-size*.34,size*.38,size*.86]} scale={[size*.3,size*.19,size*.07]}>
      <sphereGeometry args={[1,32,16]}/>
      <meshBasicMaterial color="#fffaf2" transparent opacity={skin === "glow" ? .48 : .32} blending={THREE.AdditiveBlending} depthWrite={false}/>
    </mesh>
    <pointLight position={[-2,2,3]} color={planet.to} intensity={selected ? 3.1 : 1.45} distance={6.5} decay={2}/>
    {(index===0||skin==="ring")&&<mesh rotation={[Math.PI/2.3,.15,0]}><ringGeometry args={[size*1.28,size*1.48,96]}/><meshBasicMaterial color={planet.to} transparent opacity={.24} side={THREE.DoubleSide} depthWrite={false}/></mesh>}
    {skin==="stripe"&&[-.5,-.18,.18,.5].map((y)=><mesh key={y} position={[0,y*size,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[Math.sqrt(Math.max(.05,size*size-(y*size)*(y*size))),.025,8,64]}/><meshBasicMaterial color={planet.to} transparent opacity={.32}/></mesh>)}
    <Html center position={[0,-size-0.5,0]} distanceFactor={10} style={{pointerEvents:"none"}}><div className={`whitespace-nowrap text-center drop-shadow-[0_2px_8px_#000] ${selected?"text-white":"text-white/80"}`}><b className="text-[13px]">{planet.label}</b></div></Html>
  </group>;
}

function Constellation3D({ group, index, anchorIndex, onOpen }) {
  const orbit = useRef();
  const root = PLANET_POSITIONS[anchorIndex];
  const visible = group.stars.filter((s)=>!s.empty).slice(0,7);
  const orbitRadius = 2.25 + index * .28;
  const points = useMemo(() => visible.map((_, i)=>{
    const a = i * 1.71 + index;
    const radius = .32 + i * .035;
    return [Math.cos(a)*radius, Math.sin(a)*radius*.72, (i-3)*.055];
  }), [group.weekStart, visible.length, index]);
  const geometry = useMemo(()=>new THREE.BufferGeometry().setFromPoints(points.map((p)=>new THREE.Vector3(...p))),[points]);
  useFrame((state,delta)=>{
    if (!orbit.current) return;
    orbit.current.rotation.y += delta * (.055 + index * .006);
    orbit.current.rotation.z = Math.sin(state.clock.elapsedTime * .08 + index) * .09;
  });
  if (!visible.length) return null;
  return <group ref={orbit} position={root} rotation={[.18,index*.7,.12]}>
    <group position={[orbitRadius,0,0]} onClick={(e)=>{e.stopPropagation();onOpen?.(group);}}>
      <mesh visible={false}><sphereGeometry args={[.72,12,12]}/><meshBasicMaterial transparent opacity={0}/></mesh>
      <line geometry={geometry}><lineBasicMaterial color="#bda8ee" transparent opacity={.55}/></line>
      {points.map((p,i)=><mesh key={visible[i].date||visible[i].label||i} position={p} onClick={(e)=>{e.stopPropagation();onOpen?.({...group,selectedPoint:visible[i]});}}><sphereGeometry args={[.05+(visible[i].mood||3)*.008,12,12]}/><meshBasicMaterial color="#f5f2ff"/><pointLight color="#ad91ed" intensity={.2} distance={1}/></mesh>)}
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

function Scene({ planets, groups, selectedKey, onPlanetSelect, onConstellationOpen, resetSignal, reduced, skin }) {
  const controls = useRef();
  const selectedIndex = Math.max(0, planets.findIndex((planet)=>planet.key===selectedKey));
  return <>
    <color attach="background" args={["#01040c"]}/><fog attach="fog" args={["#01040c",18,52]}/>
    <hemisphereLight color="#f4f1ff" groundColor="#111325" intensity={.58}/><directionalLight position={[-7,9,12]} color="#fff4e8" intensity={3.1}/>
    <StarLayer count={reduced?500:1100} radius={44} size={.055} opacity={.55} seed={2}/>
    <StarLayer count={reduced?240:600} radius={25} size={.075} opacity={.7} seed={7}/>
    <StarLayer count={reduced?90:220} radius={14} size={.1} opacity={.8} seed={13}/>
    <Sparkles count={reduced?35:75} scale={[24,13,24]} size={1.1} speed={.08} opacity={.24} color="#9374d7" noise={1.5}/>
    <Galaxy reduced={reduced}/><OrbitRings/>
    {planets.map((planet,i)=><Planet key={planet.key} planet={planet} index={i} selected={planet.key===selectedKey} onSelect={onPlanetSelect} skin={skin}/>) }
    {groups.slice(-5).map((group,i)=>{
      const domainIndex=planets.findIndex((planet)=>planet.key===group.domain);
      const anchorIndex=selectedKey?selectedIndex:(domainIndex>=0?domainIndex:i%planets.length);
      return <Constellation3D key={group.weekStart||i} group={group} index={i} anchorIndex={anchorIndex} onOpen={(pickedGroup)=>{
        onPlanetSelect?.(planets[anchorIndex]?.key);
        onConstellationOpen?.(pickedGroup, planets[anchorIndex]?.key);
      }}/>;
    }) }
    <OrbitControls ref={controls} target={UNIVERSE_TARGET.toArray()} makeDefault enableDamping dampingFactor={.055} enablePan screenSpacePanning minDistance={2.8} maxDistance={34} rotateSpeed={.42} zoomSpeed={.7} panSpeed={.8} mouseButtons={{LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN}}/>
    <CameraRig selectedKey={selectedKey} planets={planets} controlsRef={controls} resetSignal={resetSignal}/>
  </>;
}

export default function UniverseMap({ planets, groups=[], selectedKey, onPlanetSelect, onConstellationOpen, skin="basic" }) {
  const [resetSignal,setResetSignal]=useState(0);
  const reduced = typeof window!=="undefined" && (window.innerWidth<760 || (navigator.hardwareConcurrency||8)<=4);
  return <div className="relative h-[calc(100dvh-112px)] min-h-[540px] w-full overflow-hidden bg-[#01040c] md:h-[calc(100dvh-104px)] md:min-h-[600px]">
    <Canvas dpr={reduced?[1,1.25]:[1,1.75]} camera={{position:INITIAL_CAMERA.toArray(),fov:48,near:.1,far:100}} gl={{antialias:!reduced,powerPreference:"high-performance"}} onPointerMissed={()=>onPlanetSelect?.(null)}>
      <Suspense fallback={null}><Scene planets={planets} groups={groups} selectedKey={selectedKey} onPlanetSelect={onPlanetSelect} onConstellationOpen={onConstellationOpen} resetSignal={resetSignal} reduced={reduced} skin={skin}/></Suspense>
    </Canvas>
    <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-[#050914]/70 px-4 py-2 text-[9px] tracking-[.08em] text-white/55 backdrop-blur">왼쪽 드래그 회전 · Shift+드래그/오른쪽 드래그 이동 · 휠/핀치 접근</div>
    <button onClick={()=>{onPlanetSelect?.(null);setResetSignal((v)=>v+1);}} className="tap absolute bottom-5 right-5 flex items-center gap-2 rounded-full border border-white/10 bg-[#050914]/75 px-3 text-[10px] text-white/65 backdrop-blur"><RotateCcw size={13}/> 우주 중심</button>
  </div>;
}
