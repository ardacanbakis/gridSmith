import { useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { MeshData } from '@/lib/geometry/types';

type Props = {
  mesh: MeshData | null;
  loading: boolean;
};

function Mesh({ data }: { data: MeshData }) {
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
      <meshStandardMaterial color="#F59E0B" metalness={0.05} roughness={0.55} />
    </mesh>
  );
}

export function Viewport({ mesh, loading }: Props) {
  return (
    <div className="relative w-full h-full bg-bg">
      <Canvas
        shadows
        camera={{ position: [120, 120, 120], fov: 35, near: 0.1, far: 2000 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0F1115']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 200, 100]} intensity={1.2} castShadow />
        <directionalLight position={[-100, 50, -50]} intensity={0.4} />

        <Grid
          args={[420, 420]}
          cellSize={42}
          cellThickness={0.5}
          cellColor="#2A2F3A"
          sectionSize={210}
          sectionThickness={1}
          sectionColor="#3A4150"
          fadeDistance={600}
          fadeStrength={1.5}
          followCamera={false}
          infiniteGrid
        />

        {mesh && <Mesh data={mesh} />}

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
