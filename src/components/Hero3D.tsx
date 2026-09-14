import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

const CYAN = "#22D3EE";
const VIOLET = "#A78BFA";

/** Slowly rotating faceted core with an aurora shell. */
function Core() {
  const inner = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    if (inner.current) {
      inner.current.rotation.y += dt * 0.35;
      inner.current.rotation.x += dt * 0.12;
    }
    if (shell.current) {
      shell.current.rotation.y -= dt * 0.18;
      shell.current.rotation.z += dt * 0.08;
    }
  });

  return (
    <group>
      <mesh ref={inner}>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshStandardMaterial
          color={VIOLET}
          roughness={0.15}
          metalness={0.85}
          emissive={VIOLET}
          emissiveIntensity={0.28}
          flatShading
        />
      </mesh>
      <mesh ref={shell} scale={1.55}>
        <icosahedronGeometry args={[1.15, 2]} />
        <meshBasicMaterial color={CYAN} wireframe transparent opacity={0.28} />
      </mesh>
    </group>
  );
}

/** Orbiting question-card tiles, like papers circling the core. */
function Orbit({ count = 7, radius = 2.45 }: { count?: number; radius?: number }) {
  const group = useRef<THREE.Group>(null);
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        return {
          a,
          y: Math.sin(a * 2) * 0.55,
          color: i % 2 === 0 ? CYAN : VIOLET,
          scale: 0.34 + (i % 3) * 0.06,
        };
      }),
    [count]
  );

  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    if (!group.current) return;
    group.current.rotation.y += dt * 0.22;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25) * 0.14;
  });

  return (
    <group ref={group}>
      {items.map((it, i) => (
        <group key={i} position={[Math.cos(it.a) * radius, it.y, Math.sin(it.a) * radius]}>
          <mesh rotation={[0, -it.a, 0.25]} scale={it.scale}>
            <boxGeometry args={[1.35, 1.75, 0.08]} />
            <meshStandardMaterial
              color={it.color}
              roughness={0.25}
              metalness={0.6}
              emissive={it.color}
              emissiveIntensity={0.35}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} color={CYAN} />
      <directionalLight position={[-5, -2, -4]} intensity={0.9} color={VIOLET} />
      <Float speed={1.2} rotationIntensity={0.35} floatIntensity={0.7}>
        <Core />
      </Float>
      <Orbit />
      <Sparkles count={60} scale={7} size={2.4} speed={0.3} color={CYAN} opacity={0.7} />
      <Environment>
        <Lightformer intensity={2} position={[0, 5, 2]} scale={[10, 10, 1]} color={VIOLET} />
        <Lightformer
          intensity={1.4}
          color={CYAN}
          position={[-6, 1, -1]}
          rotation-y={Math.PI / 2}
          scale={[18, 1.5, 1]}
        />
      </Environment>
    </>
  );
}

const Hero3D = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <div className="aurora-orb" />
      <Canvas
        camera={{ position: [0, 0.6, 6.2], fov: 48 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Hero3D;
