import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Suspense, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import earthUrl from "@/assets/earth.jpg";
import moonUrl from "@/assets/moon.jpg";
import saturnUrl from "@/assets/saturn.jpg";
import { SEGMENTS } from "./journey";

type V3 = [number, number, number];
const KEYS: { pos: V3; look: V3 }[] = [
  { pos: [0, 0.4, 11.5], look: [0, 2.6, 0] },
  { pos: [-3.8, 0.6, 6.2], look: [1.8, 0.2, -2] },
  { pos: [-1.2, 1.4, -18.5], look: [-8.6, 1.6, -24] },
  { pos: [0.8, 0.2, -44], look: [-0.5, -0.5, -62] },
  { pos: [-3, 3.4, -79], look: [3.4, -0.6, -100] },
  { pos: [0, 34, -175], look: [0, -14, -262] },
];

const EARTH: V3 = [0, 0, 0];
const MOON: V3 = [-5.2, 1.6, -24];
const SATURN: V3 = [10, -1, -100];
const GALAXY: V3 = [0, -14, -262];

const smooth = (t: number) => t * t * (3 - 2 * t);

function roundSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.6)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

function CameraRig({ progress, pointer, reduced }: Props) {
  const { camera } = useThree();
  const cur = useRef(progress.current);
  const look = useRef(new THREE.Vector3());
  const p = useRef(new THREE.Vector2());
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const k = reduced ? 1 : 1 - Math.exp(-3.2 * dt);
    cur.current += (progress.current - cur.current) * k;
    p.current.lerp(pointer.current, reduced ? 0 : 1 - Math.exp(-2 * dt));
    const s = Math.min(cur.current, 0.99999) * SEGMENTS;
    const i = Math.floor(s);
    const t = smooth(s - i);
    const A = KEYS[i], B = KEYS[Math.min(i + 1, SEGMENTS)];
    a.set(...A.pos).lerp(b.set(...B.pos), t);
    // lift the path mid-segment so objects sweep past rather than through
    a.y += Math.sin(t * Math.PI) * 1.5;
    camera.position.set(a.x + p.current.x * 0.6, a.y + p.current.y * 0.4, a.z);
    a.set(...A.look).lerp(b.set(...B.look), t);
    look.current.lerp(a, cur.current === progress.current ? 1 : 0.25);
    look.current.copy(a);
    camera.lookAt(look.current);
  });
  return null;
}

function Stars({ sprite }: { sprite: THREE.Texture }) {
  const layers = useMemo(
    () =>
      [
        { n: 4000, r: 400, size: 0.9, color: "#ffffff" },
        { n: 1500, r: 250, size: 1.4, color: "#cfefff" },
        { n: 400, r: 160, size: 2.2, color: "#ffe6c4" },
      ].map((l) => {
        const arr = new Float32Array(l.n * 3);
        for (let i = 0; i < l.n; i++) {
          const v = new THREE.Vector3().randomDirection().multiplyScalar(l.r * (0.6 + Math.random() * 0.4));
          v.z -= 120;
          arr.set([v.x, v.y, v.z], i * 3);
        }
        return { ...l, arr };
      }),
    [],
  );
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.004;
  });
  return (
    <group ref={g}>
      {layers.map((l, i) => (
        <points key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[l.arr, 3]} />
          </bufferGeometry>
          <pointsMaterial map={sprite} size={l.size} color={l.color} transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation={false} />
        </points>
      ))}
    </group>
  );
}

function Atmosphere({ radius, color, power = 3, intensity = 1.2 }: { radius: number; color: string; power?: number; intensity?: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { c: { value: new THREE.Color(color) }, p: { value: power }, i: { value: intensity } },
        vertexShader: `varying vec3 vN; varying vec3 vV;
          void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `uniform vec3 c; uniform float p; uniform float i; varying vec3 vN; varying vec3 vV;
          void main(){ float f = pow(1. - abs(dot(vN, vV)), p); gl_FragColor = vec4(c, f*i); }`,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [color, power, intensity],
  );
  return (
    <mesh scale={1.12} material={mat}>
      <sphereGeometry args={[radius, 64, 64]} />
    </mesh>
  );
}

function Planets({ reduced }: { reduced: boolean }) {
  const [earthTex, moonTex, saturnTex] = useTexture([earthUrl, moonUrl, saturnUrl]);
  [earthTex, moonTex, saturnTex].forEach((t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
  });
  const earth = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Mesh>(null);
  const saturn = useRef<THREE.Group>(null);

  const ring = useMemo(() => {
    const inner = 7.6, outer = 14;
    const geo = new THREE.RingGeometry(inner, outer, 160, 1);
    const pos = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
    }
    const c = document.createElement("canvas");
    c.width = 512; c.height = 1;
    const g = c.getContext("2d")!;
    for (let x = 0; x < 512; x++) {
      const t = x / 512;
      const gap = t > 0.55 && t < 0.6 ? 0.05 : 1;
      const a = (0.35 + 0.5 * Math.abs(Math.sin(t * 40) * Math.sin(t * 7.3))) * gap * (t < 0.04 ? t / 0.04 : 1) * (t > 0.95 ? (1 - t) / 0.05 : 1);
      const l = 70 + 20 * Math.sin(t * 23);
      g.fillStyle = `rgba(${230 * l / 90 | 0},${205 * l / 90 | 0},${160 * l / 90 | 0},${a})`;
      g.fillRect(x, 0, 1, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { geo, tex };
  }, []);

  useFrame((_, raw) => {
    if (reduced) return;
    const dt = Math.min(raw, 0.05);
    if (earth.current) earth.current.rotation.y += dt * 0.05;
    if (moon.current) moon.current.rotation.y += dt * 0.03;
    if (saturn.current) saturn.current.rotation.y += dt * 0.02;
  });

  return (
    <>
      <group position={EARTH} rotation={[0.2, 0, 0.41]}>
        <mesh ref={earth}>
          <sphereGeometry args={[3, 96, 96]} />
          <meshStandardMaterial map={earthTex} roughness={0.85} metalness={0.05} />
        </mesh>
        <Atmosphere radius={3} color="#5fd4ff" power={2.6} intensity={1.6} />
      </group>
      <mesh ref={moon} position={MOON}>
        <sphereGeometry args={[1.3, 64, 64]} />
        <meshStandardMaterial map={moonTex} bumpMap={moonTex} bumpScale={0.03} roughness={1} />
      </mesh>
      <group position={SATURN} rotation={[0.42, 0, 0.18]}>
        <group ref={saturn}>
          <mesh>
            <sphereGeometry args={[6, 96, 96]} />
            <meshStandardMaterial map={saturnTex} roughness={0.9} />
          </mesh>
        </group>
        <Atmosphere radius={6} color="#ffc98a" power={3.5} intensity={0.9} />
        <mesh geometry={ring.geo} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial map={ring.tex} transparent side={THREE.DoubleSide} depthWrite={false} roughness={1} />
        </mesh>
      </group>
    </>
  );
}

function Asteroids({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 420;
  const data = useMemo(() => {
    return Array.from({ length: count }, () => {
      const ang = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 16;
      return {
        p: new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r * 0.55, -30 - Math.random() * 45),
        s: Math.pow(Math.random(), 3) * 0.9 + 0.08,
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
        w: (Math.random() - 0.5) * 0.6,
      };
    });
  }, []);
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = 0.75 + 0.35 * Math.sin(v.x * 3.1 + v.y * 1.7) * Math.cos(v.z * 2.3);
      v.multiplyScalar(n);
      pos.setXYZ(i, v.x, v.y * 0.8, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const m = useMemo(() => new THREE.Object3D(), []);
  useFrame((st) => {
    if (!ref.current) return;
    const t = reduced ? 0 : st.clock.elapsedTime;
    data.forEach((d, i) => {
      m.position.copy(d.p);
      m.position.y += Math.sin(t * 0.2 + i) * 0.15;
      m.rotation.set(d.r.x + t * d.w, d.r.y + t * d.w * 0.7, 0);
      m.scale.setScalar(d.s);
      m.updateMatrix();
      ref.current!.setMatrixAt(i, m.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[geo, undefined, count]}>
      <meshStandardMaterial color="#8a7f74" roughness={0.95} flatShading />
    </instancedMesh>
  );
}

function Galaxy({ sprite, reduced }: { sprite: THREE.Texture; reduced: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const { pos, col } = useMemo(() => {
    const n = 26000, arms = 4;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const core = new THREE.Color("#ffd9a8"), edge = new THREE.Color("#4fd8ff"), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const r = Math.pow(Math.random(), 1.6) * 70;
      const arm = ((i % arms) / arms) * Math.PI * 2;
      const spin = r * 0.09;
      const rnd = () => Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (3 + r * 0.15);
      pos.set([Math.cos(arm + spin) * r + rnd(), rnd() * 0.3, Math.sin(arm + spin) * r + rnd()], i * 3);
      c.copy(core).lerp(edge, Math.min(r / 55, 1));
      col.set([c.r, c.g, c.b], i * 3);
    }
    return { pos, col };
  }, []);
  useFrame((_, dt) => {
    if (ref.current && !reduced) ref.current.rotation.y += Math.min(dt, 0.05) * 0.03;
  });
  return (
    <group position={GALAXY} rotation={[0.35, 0, 0.12]}>
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[col, 3]} />
        </bufferGeometry>
        <pointsMaterial map={sprite} size={0.9} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <sprite scale={[38, 38, 1]}>
        <spriteMaterial map={sprite} color="#ffcf96" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    </group>
  );
}

type Props = {
  progress: MutableRefObject<number>;
  pointer: MutableRefObject<THREE.Vector2>;
  reduced: boolean;
};

export default function SpaceScene(props: Props) {
  const sprite = useMemo(() => roundSprite(), []);
  return (
    <Canvas dpr={[1, 1.75]} camera={{ fov: 50, near: 0.1, far: 1200, position: [0, 0.4, 11.5] }} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <color attach="background" args={["#05070b"]} />
      <ambientLight intensity={0.06} />
      <directionalLight position={[30, 8, 18]} intensity={2.8} color="#fff4e6" />
      <pointLight position={[-20, -5, -60]} intensity={60} distance={60} color="#4fd8ff" />
      <CameraRig {...props} />
      <Stars sprite={sprite} />
      <Galaxy sprite={sprite} reduced={props.reduced} />
      <Asteroids reduced={props.reduced} />
      <Suspense fallback={null}>
        <Planets reduced={props.reduced} />
      </Suspense>
    </Canvas>
  );
}
