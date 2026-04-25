import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ParameterPanel } from './components/ParameterPanel';
import { Viewport } from './components/Viewport';
import { InfoOverlay } from './components/InfoOverlay';
import { useDesignStore } from './store/designStore';
import { useViewportStore } from './store/viewportStore';
import { getWorker } from './lib/geometry/workerClient';
import type { Bbox, BuildStats, ExportFormat, MeshData } from './lib/geometry/types';
import { downloadBlob } from './lib/geometry/stl';

export default function App() {
  const design = useDesignStore((s) => s.design);
  const duoView = useViewportStore((s) => s.duoView);
  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [bbox, setBbox] = useState<Bbox | null>(null);
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
          setBbox(res.bbox);
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

  const onExport = async (format: ExportFormat) => {
    setExporting(true);
    try {
      const worker = getWorker();
      const request = { model: design.model, spec: design.spec };
      const buffer = format === '3mf'
        ? await worker.exportThreeMf(request)
        : await worker.exportStl(request);
      const name = filenameFor(design.model, format);
      const mime = format === '3mf' ? 'model/3mf' : 'model/stl';
      downloadBlob(buffer, name, mime);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Header onExport={onExport} exporting={exporting} />
      <div className="flex-1 flex min-h-0">
        <ParameterPanel />
        <main className="flex-1 relative flex">
          <div className="flex-1 relative">
            <Viewport mesh={mesh} loading={building} gridUnit={design.spec.gridUnit} />
            <InfoOverlay bbox={bbox} />
          </div>
          {duoView && (
            <div className="flex-1 relative border-l border-border">
              <Viewport
                mesh={mesh}
                loading={false}
                gridUnit={design.spec.gridUnit}
                cameraPosition={[0, 280, 0.001]}
              />
            </div>
          )}
          {stats && stats.droppedHoles !== undefined && stats.droppedHoles > 0 && (
            <div className="absolute top-3 left-3 panel rounded px-3 py-2 text-xs">
              <span className="warn-badge mr-2">too many bits</span>
              <span className="text-text-muted">
                {stats.placedHoles} placed · {stats.droppedHoles} dropped — increase bin size or reduce spacing.
              </span>
            </div>
          )}
          {error && (
            <div className="absolute bottom-3 right-3 panel rounded px-3 py-2 text-xs text-red-400 border border-red-500/40">
              {error}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function filenameFor(
  model: { kind: string; cellsX: number; cellsY: number },
  format: ExportFormat,
): string {
  return `gridsmith-${model.kind}-${model.cellsX}x${model.cellsY}.${format}`;
}
