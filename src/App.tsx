import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ParameterPanel } from './components/ParameterPanel';
import { Viewport } from './components/Viewport';
import { useDesignStore } from './store/designStore';
import { getWorker } from './lib/geometry/workerClient';
import type { BuildStats, MeshData } from './lib/geometry/types';
import { downloadBlob } from './lib/geometry/stl';

export default function App() {
  const design = useDesignStore((s) => s.design);
  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [stats, setStats] = useState<BuildStats | null>(null);
  const [building, setBuilding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buildSeq = useRef(0);

  useEffect(() => {
    const seq = ++buildSeq.current;
    setBuilding(true);
    setError(null);

    getWorker()
      .build({ model: design.model, spec: design.spec })
      .then((res) => {
        if (seq !== buildSeq.current) return;
        if (res.ok) {
          setMesh(res.mesh);
          setStats(res.stats ?? null);
        } else {
          setError(res.error);
        }
      })
      .catch((err) => {
        if (seq !== buildSeq.current) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (seq === buildSeq.current) setBuilding(false);
      });
  }, [design.model, design.spec]);

  const onExportStl = async () => {
    setExporting(true);
    try {
      const buffer = await getWorker().exportStl({ model: design.model, spec: design.spec });
      const name = filenameFor(design.model);
      downloadBlob(buffer, name, 'model/stl');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Header onExportStl={onExportStl} exporting={exporting} />
      <div className="flex-1 flex min-h-0">
        <ParameterPanel />
        <main className="flex-1 relative">
          <Viewport mesh={mesh} loading={building} gridUnit={design.spec.gridUnit} />
          {stats && stats.droppedHoles !== undefined && stats.droppedHoles > 0 && (
            <div className="absolute top-3 left-3 panel rounded px-3 py-2 text-xs">
              <span className="warn-badge mr-2">too many bits</span>
              <span className="text-text-muted">
                {stats.placedHoles} placed · {stats.droppedHoles} dropped — increase bin size or reduce spacing.
              </span>
            </div>
          )}
          {error && (
            <div className="absolute bottom-3 left-3 right-3 panel rounded px-3 py-2 text-xs text-red-400 border border-red-500/40">
              {error}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function filenameFor(model: { kind: string; cellsX: number; cellsY: number }): string {
  return `gridsmith-${model.kind}-${model.cellsX}x${model.cellsY}.stl`;
}
