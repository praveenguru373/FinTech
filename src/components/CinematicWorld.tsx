import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface CinematicSceneState {
  progress: number;
  persona: number;
  dimension: string;
}

const dimensionNames = ["Income", "Spending", "Savings", "Debt", "Protection", "Investments"];

function makeGlobeNetwork(): THREE.BufferGeometry {
  const positions: number[] = [];
  const radius = 1.008;
  const segments = 72;
  for (let line = 0; line < 16; line++) {
    const longitude = (line / 16) * Math.PI * 2;
    for (let index = 0; index < segments; index++) {
      const first = (index / segments) * Math.PI - Math.PI / 2;
      const second = ((index + 1) / segments) * Math.PI - Math.PI / 2;
      positions.push(
        radius * Math.cos(first) * Math.cos(longitude), radius * Math.sin(first), radius * Math.cos(first) * Math.sin(longitude),
        radius * Math.cos(second) * Math.cos(longitude), radius * Math.sin(second), radius * Math.cos(second) * Math.sin(longitude),
      );
    }
  }
  for (let latitude = -5; latitude <= 5; latitude++) {
    const angle = latitude * (Math.PI / 12);
    for (let index = 0; index < segments; index++) {
      const first = (index / segments) * Math.PI * 2;
      const second = ((index + 1) / segments) * Math.PI * 2;
      positions.push(
        radius * Math.cos(angle) * Math.cos(first), radius * Math.sin(angle), radius * Math.cos(angle) * Math.sin(first),
        radius * Math.cos(angle) * Math.cos(second), radius * Math.sin(angle), radius * Math.cos(angle) * Math.sin(second),
      );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function makeParticleGeometry(count: number, innerRadius: number, outerRadius: number): THREE.BufferGeometry {
  let seed = 7331;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const positions: number[] = [];
  for (let index = 0; index < count; index++) {
    const latitude = Math.acos(2 * random() - 1);
    const longitude = random() * Math.PI * 2;
    const radius = innerRadius + random() * (outerRadius - innerRadius);
    positions.push(
      radius * Math.sin(latitude) * Math.cos(longitude),
      radius * Math.cos(latitude),
      radius * Math.sin(latitude) * Math.sin(longitude),
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function makeOrbitPaths(): THREE.BufferGeometry[] {
  return dimensionNames.map((_, index) => {
    const points: THREE.Vector3[] = [];
    const angle = (index / dimensionNames.length) * Math.PI * 2;
    const radius = 1.35 + (index % 2) * 0.17;
    for (let step = 0; step <= 72; step++) {
      const t = (step / 72) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(t) * radius * Math.cos(angle) - Math.sin(t) * 0.25 * Math.sin(angle),
        Math.sin(t * 1.3 + angle) * 0.25,
        Math.cos(t) * radius * Math.sin(angle) + Math.sin(t) * 0.25 * Math.cos(angle),
      ));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  });
}

function RouteField({ scene, mobile, reducedMotion }: { scene: React.RefObject<CinematicSceneState>; mobile: boolean; reducedMotion: boolean }) {
  const lines = useRef<THREE.Line[]>([]);
  const curves = useMemo(() => Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2;
    const start = new THREE.Vector3(Math.cos(angle) * 0.72, Math.sin(angle) * 0.44, Math.sin(angle) * 0.72);
    const end = new THREE.Vector3(Math.cos(angle + 0.9) * 2.7, Math.sin(angle + 0.9) * 1.5, Math.sin(angle + 0.9) * 2.7);
    return new THREE.QuadraticBezierCurve3(start, new THREE.Vector3(0, Math.sin(angle * 2) * 1.9, 0), end);
  }), []);
  const routes = useMemo(() => curves.map((curve, index) => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),
    new THREE.LineBasicMaterial({ color: index < 4 ? "#59d39b" : "#3f6571", transparent: true, opacity: 0.2 }),
  )), [curves]);
  const elapsed = useRef(0);
  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(curves.length * 3);
    const colors = new Float32Array(curves.length * 3);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [curves]);

  useEffect(() => () => {
    routes.forEach((route) => {
      route.geometry.dispose();
      (route.material as THREE.Material).dispose();
    });
    particleGeometry.dispose();
  }, [routes, particleGeometry]);

  useFrame((_, delta) => {
    if (!reducedMotion) elapsed.current += Math.min(delta, 0.05);
    const progress = scene.current?.progress ?? 0;
    const clarity = THREE.MathUtils.smoothstep(progress, 0.38, 0.58);
    const selectedRoute = ((scene.current?.persona ?? 0) * 2) % curves.length;
    lines.current.forEach((line, index) => {
      const lineMaterial = line.material as THREE.LineBasicMaterial;
      lineMaterial.opacity = (0.025 + clarity * 0.34) * (index === selectedRoute || index === selectedRoute + 1 ? 1.65 : 1);
      lineMaterial.color.set(index < 3 + Math.floor(clarity * 5) ? "#59d39b" : "#3f6571");
    });
    const positionAttribute = particleGeometry.getAttribute("position") as THREE.BufferAttribute;
    const colorAttribute = particleGeometry.getAttribute("color") as THREE.BufferAttribute;
    curves.forEach((curve, index) => {
      const offset = (elapsed.current * (mobile ? 0.025 : 0.04) + index * 0.113) % 1;
      const point = curve.getPointAt(offset);
      positionAttribute.setXYZ(index, point.x, point.y, point.z);
      const active = index === selectedRoute || index === selectedRoute + 1;
      colorAttribute.setXYZ(index, active ? 0.58 : 0.16, active ? 1 : 0.44, active ? 0.72 : 0.34);
    });
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  });

  return <group>
    {routes.map((line, index) => <primitive key={index} object={line} ref={(node: THREE.Line | null) => { if (node) lines.current[index] = node; }} />)}
    <points geometry={particleGeometry}>
      <pointsMaterial vertexColors size={mobile ? 0.065 : 0.075} transparent opacity={0.9} depthWrite={false} />
    </points>
  </group>;
}

function FinancialOrbit({ scene, reducedMotion }: { scene: React.RefObject<CinematicSceneState>; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const orbitLines = useMemo(() => makeOrbitPaths().map((geometry, index) => new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: index % 2 === 0 ? "#5bce92" : "#4cae94", transparent: true, opacity: 0.26 }),
  )), []);
  const nodePositions = useMemo(() => dimensionNames.map((_, index) => {
    const angle = (index / dimensionNames.length) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * 1.55, Math.sin(angle * 1.5) * 0.72, Math.sin(angle) * 1.55);
  }), []);

  useEffect(() => () => orbitLines.forEach((line) => {
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
  }), [orbitLines]);

  useFrame((_, delta) => {
    const progress = scene.current?.progress ?? 0;
    const visible = THREE.MathUtils.smoothstep(progress, 0.25, 0.4) * (1 - THREE.MathUtils.smoothstep(progress, 0.54, 0.69));
    if (group.current) {
      group.current.visible = visible > 0.015;
      if (!reducedMotion) group.current.rotation.y += delta * 0.035;
      group.current.scale.setScalar(0.75 + visible * 0.25);
    }
    const selected = dimensionNames.indexOf(scene.current?.dimension ?? "Income");
    nodeRefs.current.forEach((node, index) => {
      if (!node) return;
      const material = node.material as THREE.MeshStandardMaterial;
      const isSelected = selected === index;
      material.emissiveIntensity = isSelected ? 1.15 : 0.23;
      node.scale.setScalar(isSelected ? 1.22 : 1);
    });
  });

  return <group ref={group}>
    <mesh>
      <sphereGeometry args={[0.52, 32, 24]} />
      <meshStandardMaterial color="#071d22" emissive="#0d694b" emissiveIntensity={0.55} metalness={0.4} roughness={0.35} />
    </mesh>
    {orbitLines.map((line, index) => <primitive key={index} object={line} />)}
    {nodePositions.map((position, index) => <mesh key={dimensionNames[index]} ref={(node) => { nodeRefs.current[index] = node; }} position={position}>
      <sphereGeometry args={[0.13, 20, 16]} />
      <meshStandardMaterial color="#9fe9bc" emissive="#168656" emissiveIntensity={0.35} metalness={0.22} roughness={0.3} />
    </mesh>)}
  </group>;
}

function Horizon({ scene }: { scene: React.RefObject<CinematicSceneState> }) {
  const group = useRef<THREE.Group>(null);
  const lines = useMemo(() => {
    const curves: THREE.Vector3[][] = [];
    for (let ray = -5; ray <= 5; ray++) {
      const edge = ray * 0.63;
      curves.push([
        new THREE.Vector3(edge * 1.75, -1.34, 1.1),
        new THREE.Vector3(edge * 0.35, -1.2, -3.2),
        new THREE.Vector3(edge * 0.1, -1.15, -8),
      ]);
    }
    for (const depth of [-5.5, -3.7, -2.2, -1, -0.15, 0.55]) {
      const width = 0.35 + ((depth + 8) / 9.1) * 3.2;
      curves.push([
        new THREE.Vector3(-width, -1.34, depth),
        new THREE.Vector3(0, -1.34, depth),
        new THREE.Vector3(width, -1.34, depth),
      ]);
    }
    return curves.map((points, index) => new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(points).getPoints(32)),
      new THREE.LineBasicMaterial({
        color: index < 11 ? "#54d094" : "#398b70",
        transparent: true,
        opacity: 0,
      }),
    ));
  }, []);

  useEffect(() => () => lines.forEach((line) => {
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
  }), [lines]);

  useFrame(() => {
    const progress = scene.current?.progress ?? 0;
    const visibility = THREE.MathUtils.smoothstep(progress, 0.73, 0.92);
    if (group.current) group.current.visible = visibility > 0.005;
    lines.forEach((line) => {
      (line.material as THREE.LineBasicMaterial).opacity = visibility * 0.43;
    });
  });

  return <group ref={group} visible={false}>{lines.map((line, index) => <primitive key={index} object={line} />)}</group>;
}

function Globe({ scene, mobile, reducedMotion }: { scene: React.RefObject<CinematicSceneState>; mobile: boolean; reducedMotion: boolean }) {
  const globe = useRef<THREE.Group>(null);
  const globeMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const globeNetwork = useMemo(makeGlobeNetwork, []);
  const starGeometry = useMemo(() => makeParticleGeometry(mobile ? 110 : 300, 24, 65), [mobile]);

  useEffect(() => () => {
    globeNetwork.dispose();
    starGeometry.dispose();
  }, [globeNetwork, starGeometry]);

  useFrame((state, delta) => {
    const progress = scene.current?.progress ?? 0;
    const orbitIntro = THREE.MathUtils.smoothstep(progress, 0.2, 0.44);
    const orbitOutro = THREE.MathUtils.smoothstep(progress, 0.56, 0.8);
    const transformAmount = Math.max(orbitIntro * (1 - orbitOutro), THREE.MathUtils.smoothstep(progress, 0.08, 0.25) * 0.28);
    const targetX = mobile ? 0 : Math.sin(progress * Math.PI * 2.2) * 0.9 + (progress < 0.16 ? 1.35 : -0.85);
    const targetY = mobile ? 0.15 : Math.sin(progress * Math.PI * 2.4) * 0.3;
    const targetScale = 1.05 + Math.sin(progress * Math.PI) * 0.27 - transformAmount * 0.46;
    if (globe.current) {
      globe.current.position.x = THREE.MathUtils.damp(globe.current.position.x, targetX, 1.45, delta);
      globe.current.position.y = THREE.MathUtils.damp(globe.current.position.y, targetY, 1.2, delta);
      globe.current.scale.setScalar(THREE.MathUtils.damp(globe.current.scale.x, targetScale, 1.3, delta));
      if (!reducedMotion) globe.current.rotation.y += Math.min(delta, 0.05) * (0.08 + (1 - transformAmount) * 0.06);
    }
    if (globeMaterial.current) {
      globeMaterial.current.opacity = 1 - transformAmount * 0.78;
      globeMaterial.current.emissiveIntensity = 0.38 + transformAmount * 0.22;
    }

    const cameraTargetZ = 6.8 - Math.sin(progress * Math.PI) * 1.55 + THREE.MathUtils.smoothstep(progress, 0.7, 1) * 0.55;
    const cameraTargetX = mobile ? 0 : (progress - 0.5) * 0.9;
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, cameraTargetX, 0.9, delta);
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, cameraTargetZ, 1.05, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, Math.sin(progress * Math.PI * 2) * 0.2, 0.8, delta);
    state.camera.lookAt(0, 0, 0);
  });

  return <group>
    <points geometry={starGeometry}>
      <pointsMaterial color="#c8dedc" size={0.045} transparent opacity={0.58} sizeAttenuation depthWrite={false} />
    </points>
    <RouteField scene={scene} mobile={mobile} reducedMotion={reducedMotion} />
    <group ref={globe} position={[mobile ? 0 : 1.35, 0, 0]} scale={1.05}>
      <mesh>
        <sphereGeometry args={[1, mobile ? 40 : 64, mobile ? 32 : 48]} />
        <meshStandardMaterial ref={globeMaterial} color="#06141e" emissive="#042c28" emissiveIntensity={0.42} metalness={0.3} roughness={0.5} transparent />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.013, 32, 24]} />
        <meshBasicMaterial color="#54bd96" wireframe transparent opacity={0.12} />
      </mesh>
      <lineSegments geometry={globeNetwork}>
        <lineBasicMaterial color="#3b9b78" transparent opacity={0.25} />
      </lineSegments>
      <mesh>
        <sphereGeometry args={[1.035, 40, 28]} />
        <meshBasicMaterial color="#24ad78" side={THREE.BackSide} transparent opacity={0.16} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.13, 40, 28]} />
        <meshBasicMaterial color="#1a745c" side={THREE.BackSide} transparent opacity={0.055} />
      </mesh>
    </group>
    <FinancialOrbit scene={scene} reducedMotion={reducedMotion} />
    <Horizon scene={scene} />
  </group>;
}

export default function CinematicWorld({ scene, mobile, reducedMotion }: { scene: React.RefObject<CinematicSceneState>; mobile: boolean; reducedMotion: boolean }) {
  return <Canvas
    dpr={mobile ? [1, 1.1] : [1, 1.3]}
    frameloop="always"
    camera={{ position: [0, 0, 6.8], fov: 43 }}
    gl={{ alpha: true, antialias: !mobile, powerPreference: "low-power", failIfMajorPerformanceCaveat: true }}
    fallback={<div className="world-static-fallback" aria-hidden="true" />}
    aria-label="A glowing financial world with connected pathways"
  >
    <color attach="background" args={["#030810"]} />
    <fog attach="fog" args={["#030810", 10, 70]} />
    <ambientLight intensity={mobile ? 0.52 : 0.65} />
    <pointLight position={[-4, 2, 3]} color="#c0d7e7" intensity={mobile ? 3 : 5} distance={11} />
    <pointLight position={[3, -1, 4]} color="#18865e" intensity={mobile ? 4 : 7} distance={9} />
    <pointLight position={[1, 4, -3]} color="#2d736f" intensity={mobile ? 2 : 4} distance={9} />
    <Globe scene={scene} mobile={mobile} reducedMotion={reducedMotion} />
  </Canvas>;
}
