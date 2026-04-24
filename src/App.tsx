import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ParameterPanel } from './components/ParameterPanel';
import { Viewport } from './components/Viewport';
import { useDesignStore } from './store/designStore';
import { getWorker } from './lib/geometry/workerClient';
import type { MeshData } from './lib/geometry/types';
import { downloadBlob } from './lib/geometry/stl';

export default function App() {
  const design = useDesignStore((s) => s.design);
  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [building, setBuilding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buildSeq = useRef(0);

  useEffect(() => {
    const seq = ++buildSeq.current;
    setBuilding(true);
    setError(null);

    getWorker()
      .build({ model: design.model })
      .then((res) => {
        if (seq !== buildSeq.current) return;
        if (res.ok) {
          setMesh(res.mesh);
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
  }, [design.model]);

  const onExportStl = async () => {
    setExporting(true);
    try {
      const buffer = await getWorker().exportStl({ model: design.model });
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
          <Viewport mesh={mesh} loading={building} />
          {error && (
            <div className="absolute bottom-3 left-3 right-3 panel rounded px-3 py-2 text-xs text-red-300 border-red-500/40">
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
