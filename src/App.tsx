import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { Header } from './components/Header';
import { ParameterPanel } from './components/ParameterPanel';
import { Viewport } from './components/Viewport';
import { InfoOverlay } from './components/InfoOverlay';
import { DesignLibraryModal } from './components/DesignLibraryModal';
import { useDesignStore } from './store/designStore';
import { useViewportStore } from './store/viewportStore';
import { getWorker } from './lib/geometry/workerClient';
import type { Bbox, BuildStats, ExportFormat, MeshData } from './lib/geometry/types';
import { downloadBlob } from './lib/geometry/stl';

export default function App() {
  const design = useDesignStore((s) => s.design);
  const duoSidebar = useViewportStore((s) => s.duoView);
  const fit = useViewportStore((s) => s.fit);
  const recenter = useViewportStore((s) => s.recenter);
  const undo = useStore(useDesignStore.temporal, (s) => s.undo);
  const redo = useStore(useDesignStore.temporal, (s) => s.redo);

  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [stats, setStats] = useState<BuildStats | null>(null);
  const [building, setBuilding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      if (target?.isContentEditable) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo(1);
      } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo(1);
      } else if (!mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        fit();
      } else if (!mod && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        recenter();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, fit, recenter]);

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
      <Header
        onExport={onExport}
        exporting={exporting}
        onOpenLibrary={() => setLibraryOpen(true)}
      />
      <div className="flex-1 flex min-h-0">
        <ParameterPanel mode={duoSidebar ? 'core' : 'all'} side="left" />
        <main className="flex-1 relative min-w-0">
          <Viewport mesh={mesh} loading={building} gridUnit={design.spec.gridUnit} />
          <InfoOverlay bbox={bbox} stats={stats} />
          {stats && stats.droppedHoles !== undefined && stats.droppedHoles > 0 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 panel rounded px-3 py-2 text-xs">
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
        {duoSidebar && <ParameterPanel mode="finish" side="right" />}
      </div>
      <DesignLibraryModal open={libraryOpen} onClose={() => setLibraryOpen(false)} />
    </div>
  );
}

function filenameFor(
  model: { kind: string; cellsX: number; cellsY: number },
  format: ExportFormat,
): string {
  return `gridsmith-${model.kind}-${model.cellsX}x${model.cellsY}.${format}`;
}
