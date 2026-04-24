import { useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { MeshData } from '@/lib/geometry/types';
import { useThemeStore, readCssVarRgb } from '@/store/themeStore';

type Props = {
  mesh: MeshData | null;
  loading: boolean;
  gridUnit: number;
};

function Mesh({ data, color }: { data: MeshData; color: string }) {
  const ref = useRef<THREE.Mesh>(null);

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
    <mesh ref={ref} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={color} metalness={0.05} roughness={0.55} />
    </mesh>
  );
}

export function Viewport({ mesh, loading, gridUnit }: Props) {
  const theme = useThemeStore((s) => s.theme);

  const colors = useMemo(() => ({
    canvasBg: readCssVarRgb('canvas-bg', '#0F1115'),
    gridMinor: readCssVarRgb('grid-minor', '#2A2F3A'),
    gridMajor: readCssVarRgb('grid-major', '#3A4150'),
    material: readCssVarRgb('material', '#F59E0B'),
  }), [theme]);

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        camera={{ position: [120, 120, 120], fov: 35, near: 0.1, far: 2000 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[colors.canvasBg]} />
        <ambientLight intensity={theme === 'light' ? 0.85 : 0.5} />
        <directionalLight position={[100, 200, 100]} intensity={theme === 'light' ? 1.0 : 1.2} castShadow />
        <directionalLight position={[-100, 50, -50]} intensity={0.4} />

        <Grid
          args={[gridUnit * 10, gridUnit * 10]}
          cellSize={gridUnit}
          cellThickness={0.5}
          cellColor={colors.gridMinor}
          sectionSize={gridUnit * 5}
          sectionThickness={1}
          sectionColor={colors.gridMajor}
          fadeDistance={Math.max(600, gridUnit * 15)}
          fadeStrength={1.5}
          followCamera={false}
          infiniteGrid
        />

        {mesh && <Mesh data={mesh} color={colors.material} />}

        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      </Canvas>

      {loading && (
        <div className="absolute top-3 right-3 px-3 py-1.5 panel rounded text-xs text-text-muted">
          Building geometry…
        </div>
      )}
    </div>
  );
}
