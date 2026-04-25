import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
  Bounds,
  useBounds,
} from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { MeshData } from '@/lib/geometry/types';
import { useThemeStore, readCssVarRgb } from '@/store/themeStore';
import { useViewportStore } from '@/store/viewportStore';
import { findPrinter } from '@/lib/printers';

type Props = {
  mesh: MeshData | null;
  loading: boolean;
  gridUnit: number;
  /** Camera initial position; lets the duo viewport place a second view at a different angle. */
  cameraPosition?: [number, number, number];
};

function PartMesh({ data, color }: { data: MeshData; color: string }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.vertices, 3));
    g.setIndex(new THREE.BufferAttribute(data.indices, 1));
    g.computeVertexNormals();
    g.computeBoundingBox();
    return g;
  }, [data]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        metalness={0.1}
        roughness={0.5}
        envMapIntensity={0.6}
      />
    </mesh>
  );
}

function ExtendedGrid({
  cellSize,
  themeKey,
}: {
  cellSize: number;
  themeKey: string;
}) {
  const colors = useMemo(
    () => ({
      gridMinor: readCssVarRgb('grid-minor', '#2A2F3A'),
      gridMajor: readCssVarRgb('grid-major', '#3A4150'),
    }),
    [themeKey],
  );
  return (
    <Grid
      position={[0, -0.02, 0]}
      args={[10000, 10000]}
      cellSize={cellSize}
      cellThickness={0.4}
      cellColor={colors.gridMinor}
      sectionSize={cellSize * 5}
      sectionThickness={0.7}
      sectionColor={colors.gridMajor}
      fadeDistance={1200}
      fadeStrength={1.5}
      followCamera={false}
      infiniteGrid
    />
  );
}

function BuildPlate({
  width,
  depth,
  cellSize,
  showGrid,
  themeKey,
}: {
  width: number;
  depth: number;
  cellSize: number;
  showGrid: boolean;
  themeKey: string;
}) {
  const colors = useMemo(
    () => ({
      slab: readCssVarRgb('bg-elevated', '#1E232C'),
      edge: readCssVarRgb('border-strong', '#3A4150'),
      gridMinor: readCssVarRgb('grid-minor', '#2A2F3A'),
      gridMajor: readCssVarRgb('grid-major', '#3A4150'),
    }),
    [themeKey],
  );

  return (
    <group>
      <mesh receiveShadow position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={colors.slab} roughness={0.95} metalness={0} />
      </mesh>
      <lineSegments position={[0, 0.005, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(width, 0.0001, depth)]} />
        <lineBasicMaterial color={colors.edge} />
      </lineSegments>
      {showGrid && (
        <Grid
          position={[0, 0.01, 0]}
          args={[width, depth]}
          cellSize={cellSize}
          cellThickness={0.7}
          cellColor={colors.gridMinor}
          sectionSize={cellSize * 5}
          sectionThickness={1.2}
          sectionColor={colors.gridMajor}
          fadeDistance={Math.max(width, depth) * 1.6}
          fadeStrength={1.0}
          followCamera={false}
          infiniteGrid={false}
        />
      )}
    </group>
  );
}

function CameraDirector() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const recenterNonce = useViewportStore((s) => s.recenterNonce);
  const zoomNonce = useViewportStore((s) => s.zoomNonce);
  const zoomDir = useViewportStore((s) => s.zoomDir);

  useEffect(() => {
    if (recenterNonce === 0) return;
    const c = controlsRef.current;
    if (!c) return;
    c.target.set(0, 0, 0);
    camera.position.set(180, 180, 180);
    c.update();
  }, [recenterNonce, camera]);

  useEffect(() => {
    if (zoomNonce === 0 || zoomDir === 0) return;
    const c = controlsRef.current;
    if (!c) return;
    const factor = zoomDir > 0 ? 1 / 1.2 : 1.2;
    const offset = camera.position.clone().sub(c.target);
    offset.multiplyScalar(factor);
    camera.position.copy(c.target).add(offset);
    c.update();
  }, [zoomNonce, zoomDir, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={20}
      maxDistance={1500}
    />
  );
}

function FitToBoundsTrigger({ trigger }: { trigger: number }) {
  const bounds = useBounds();
  useEffect(() => {
    if (trigger === 0) return;
    bounds.refresh().fit();
  }, [trigger, bounds]);
  return null;
}

export function Viewport({ mesh, loading, gridUnit, cameraPosition }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const { printerId, customPlate, plateVisible, gridVisible, shadowsEnabled, fitNonce } =
    useViewportStore();

  const printer = findPrinter(printerId);
  const plateW = printerId === 'custom' ? customPlate.x : printer.x;
  const plateD = printerId === 'custom' ? customPlate.y : printer.y;

  const colors = useMemo(
    () => ({
      canvasBg: readCssVarRgb('canvas-bg', '#0F1115'),
      material: readCssVarRgb('material', '#F59E0B'),
    }),
    [theme],
  );

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        camera={{ position: cameraPosition ?? [180, 180, 180], fov: 35, near: 0.1, far: 4000 }}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
      >
        <color attach="background" args={[colors.canvasBg]} />

        <hemisphereLight args={[0xffffff, 0x1a1f2c, theme === 'light' ? 0.9 : 0.55]} />
        <directionalLight
          position={[plateW * 0.5, 280, plateD * 0.4]}
          intensity={theme === 'light' ? 1.4 : 1.1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-300}
          shadow-camera-right={300}
          shadow-camera-top={300}
          shadow-camera-bottom={-300}
          shadow-camera-near={0.5}
          shadow-camera-far={1500}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-150, 60, -100]} intensity={0.35} />

        {gridVisible && <ExtendedGrid cellSize={gridUnit} themeKey={theme} />}

        {plateVisible && (
          <BuildPlate
            width={plateW}
            depth={plateD}
            cellSize={gridUnit}
            showGrid={gridVisible}
            themeKey={theme}
          />
        )}

        <Bounds clip={false} margin={1.4}>
          {mesh && <PartMesh data={mesh} color={colors.material} />}
          <FitToBoundsTrigger trigger={fitNonce} />
        </Bounds>

        {shadowsEnabled && (
          <ContactShadows
            position={[0, 0.02, 0]}
            opacity={theme === 'light' ? 0.55 : 0.7}
            scale={Math.max(plateW, plateD) * 1.1}
            blur={2.4}
            far={120}
            resolution={1024}
            color={theme === 'light' ? '#0F172A' : '#000000'}
          />
        )}

        <CameraDirector />

        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport
            axisColors={['#F87171', '#34D399', '#60A5FA']}
            labelColor={theme === 'light' ? '#0F172A' : '#E5E7EB'}
          />
        </GizmoHelper>
      </Canvas>

      {loading && (
        <div className="absolute top-3 right-3 px-3 py-1.5 panel rounded text-xs text-text-muted">
          Building geometry…
        </div>
      )}
    </div>
  );
}
