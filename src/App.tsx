import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { Header } from './components/Header';
import { ParameterPanel } from './components/ParameterPanel';
import { Viewport } from './components/Viewport';
import { InfoOverlay } from './components/InfoOverlay';
import { DesignLibraryModal } from './components/DesignLibraryModal';
import { TemplateGallery } from './components/TemplateGallery';
import { ShortcutHelp } from './components/ShortcutHelp';
import { WelcomeScreen, useWelcomeScreen } from './components/WelcomeScreen';
import { useDesignStore } from './store/designStore';
import { useViewportStore } from './store/viewportStore';
import { useMediaQuery } from './lib/useMediaQuery';
import { getWorker } from './lib/geometry/workerClient';
import type { Bbox, BuildStats, ExportFormat, GeometryRequest, MeshData } from './lib/geometry/types';
import { downloadBlob } from './lib/geometry/stl';

export default function App() {
  const { t } = useTranslation();
  const { showWelcome, dismiss, show: showWelcomeScreen } = useWelcomeScreen();
  const design = useDesignStore((s) => s.design);
  const duoSidebar = useViewportStore((s) => s.duoView);
  // Two sidebars plus a viewport need laptop width; below that, one sidebar holds everything.
  const wide = useMediaQuery('(min-width: 1024px)');
  const duo = duoSidebar && wide;
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
  const [templateOpen, setTemplateOpen] = useState(false);
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const pendingBuild = useRef<GeometryRequest | null>(null);
  const buildLoopRunning = useRef(false);
  const firstBuild = useRef(true);

  useEffect(() => {
    pendingBuild.current = { model: design.model, spec: design.spec };
    if (buildLoopRunning.current) return;
    buildLoopRunning.current = true;
    setBuilding(true);

    // Latest-wins: one build at a time, and edits that land mid-build replace
    // whatever was queued — a slider drag never piles up stale rebuilds.
    void (async () => {
      while (pendingBuild.current) {
        const request = pendingBuild.current;
        pendingBuild.current = null;
        try {
          const res = await getWorker().build(request);
          if (res.ok) {
            setMesh(res.mesh);
            setBbox(res.bbox);
            setStats(res.stats ?? null);
            setError(null);
            if (firstBuild.current) {
              firstBuild.current = false;
              // Defer one frame so Bounds has the new mesh registered.
              requestAnimationFrame(() => fit());
            }
          } else if (!pendingBuild.current) {
            setError(res.error);
          }
        } catch (err) {
          if (!pendingBuild.current) setError(err instanceof Error ? err.message : String(err));
        }
      }
      buildLoopRunning.current = false;
      setBuilding(false);
    })();
  }, [design.model, design.spec, fit]);

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
      } else if (!mod && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setTemplateOpen((v) => !v);
      } else if (!mod && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setLibraryOpen((v) => !v);
      } else if (!mod && e.key === '?') {
        e.preventDefault();
        setShortcutOpen((v) => !v);
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
      const buffer =
        format === '3mf'  ? await worker.exportThreeMf(request) :
        format === 'step' ? await worker.exportStep(request) :
                            await worker.exportStl(request);
      const mime =
        format === '3mf'  ? 'model/3mf' :
        format === 'step' ? 'application/octet-stream' :
                            'model/stl';
      downloadBlob(buffer, filenameFor(design.model, format), mime);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
    {showWelcome && <WelcomeScreen onDismiss={dismiss} />}
    <TemplateGallery open={templateOpen} onClose={() => setTemplateOpen(false)} />
    <ShortcutHelp open={shortcutOpen} onClose={() => setShortcutOpen(false)} />
    <div className="h-full flex flex-col">
      <Header
        onExport={onExport}
        exporting={exporting}
        onOpenLibrary={() => setLibraryOpen(true)}
        onOpenWelcome={showWelcomeScreen}
        onOpenTemplates={() => setTemplateOpen(true)}
      />
      {/* Phones: viewport on top, parameters scroll below. md and up: side by side. */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <ParameterPanel mode={duo ? 'core' : 'all'} side="left" />
        <main className="relative min-w-0 order-first h-[42vh] min-h-[240px] shrink-0 md:order-none md:h-auto md:min-h-0 md:shrink md:flex-1">
          <Viewport mesh={mesh} loading={building} gridUnit={design.spec.gridUnit} />
          <InfoOverlay bbox={bbox} stats={stats} />
          {stats && stats.droppedHoles !== undefined && stats.droppedHoles > 0 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-max max-w-[calc(100%-1.5rem)] panel rounded px-3 py-2 text-xs">
              <span className="warn-badge mr-2">{t('warning.tooManyBits')}</span>
              <span className="text-text-muted">
                {t('warning.tooManyBitsDetail', { placed: stats.placedHoles, dropped: stats.droppedHoles })}
              </span>
            </div>
          )}
          {error && (
            <div className="absolute bottom-3 right-3 max-w-[calc(100%-1.5rem)] panel rounded px-3 py-2 text-xs text-red-400 border border-red-500/40">
              {error}
            </div>
          )}
        </main>
        {duo && <ParameterPanel mode="finish" side="right" />}
      </div>
      <DesignLibraryModal open={libraryOpen} onClose={() => setLibraryOpen(false)} />
    </div>
    </>
  );
}

function filenameFor(
  model: { kind: string; cellsX: number; cellsY: number },
  format: ExportFormat,
): string {
  return `gridsmith-${model.kind}-${model.cellsX}x${model.cellsY}.${format}`;
}
