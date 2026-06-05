import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import {
  ChevronDown,
  Columns2,
  Download,
  FolderOpen,
  Grid2x2,
  Home,
  LayoutTemplate,
  Maximize,
  Maximize2,
  Minimize,
  Moon,
  Redo2,
  Share2,
  Square,
  SquareDashed,
  Sun,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { useThemeStore } from '@/store/themeStore';
import { useViewportStore } from '@/store/viewportStore';
import { shareableUrl } from '@/lib/params/url';
import { findPrinter, PRINTERS, printerLabel } from '@/lib/printers';
import type { ExportFormat } from '@/lib/geometry/types';

type Props = {
  onExport: (format: ExportFormat) => void;
  exporting: boolean;
  onOpenLibrary: () => void;
  onOpenWelcome: () => void;
  onOpenTemplates: () => void;
};

const FORMAT_IDS: ExportFormat[] = ['stl', '3mf', 'step'];

function IconButton({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        'h-8 w-8 grid place-items-center rounded transition-colors shrink-0',
        active
          ? 'bg-accent text-accent-fg'
          : 'text-text-muted hover:text-text hover:bg-bg-elevated',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <div className="h-5 w-px bg-border mx-1.5" />;
}

export function Header({ onExport, exporting, onOpenLibrary, onOpenWelcome, onOpenTemplates }: Props) {
  const { t } = useTranslation();
  const formats = FORMAT_IDS.map((id) => ({
    id,
    label: t(`format.${id}`),
    hint: t(`format.${id}Hint`),
  }));
  const { design, setUnits } = useDesignStore();
  const { theme, toggle } = useThemeStore();
  const {
    printerId,
    customPlate,
    plateVisible,
    gridVisible,
    duoView,
    setPrinterId,
    setCustomPlate,
    togglePlate,
    toggleGrid,
    toggleDuoView,
    recenter,
    fit,
    zoomIn,
    zoomOut,
  } = useViewportStore();

  const past = useStore(useDesignStore.temporal, (s) => s.pastStates.length);
  const future = useStore(useDesignStore.temporal, (s) => s.futureStates.length);
  const undo = useStore(useDesignStore.temporal, (s) => s.undo);
  const redo = useStore(useDesignStore.temporal, (s) => s.redo);

  const printer = findPrinter(printerId);
  const plateW = printerId === 'custom' ? customPlate.x : printer.x;
  const plateD = printerId === 'custom' ? customPlate.y : printer.y;

  const [printerOpen, setPrinterOpen] = useState(false);
  const printerRef = useRef<HTMLDivElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<ExportFormat>('stl');
  const activeFormat = formats.find((f) => f.id === format)!;

  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== 'undefined' && document.fullscreenElement != null,
  );

  useEffect(() => {
    if (!printerOpen && !exportOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!printerRef.current?.contains(e.target as Node)) setPrinterOpen(false);
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [printerOpen, exportOpen]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const onFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // ignore
    }
  };

  const onShare = async () => {
    const url = shareableUrl(design);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy share link', url);
    }
  };

  const grouped = PRINTERS.reduce<Record<string, typeof PRINTERS[number][]>>((acc, p) => {
    (acc[p.brand] ??= []).push(p);
    return acc;
  }, {});

  return (
    <header className="flex items-center gap-2 px-3 h-12 border-b border-border bg-bg-panel shrink-0">
      <button
        onClick={onOpenWelcome}
        title="About Gridsmith"
        className="flex items-center gap-2 shrink-0 rounded hover:opacity-80 transition-opacity"
      >
        <div className="w-6 h-6 rounded bg-accent grid place-items-center">
          <span className="text-accent-fg font-bold text-xs">G</span>
        </div>
        <h1 className="text-sm font-semibold tracking-wide hidden md:block">Gridsmith</h1>
      </button>

      <button
        onClick={onOpenTemplates}
        title="Browse starter templates"
        className="flex items-center gap-1.5 h-8 px-2.5 rounded text-xs font-medium text-text-muted hover:text-text hover:bg-bg-elevated transition-colors shrink-0"
      >
        <LayoutTemplate size={14} />
        <span className="hidden lg:inline">Templates</span>
      </button>

      <div className="flex-1" />

      <Group>
        <IconButton title={t('header.recenter')} onClick={recenter}>
          <Home size={16} />
        </IconButton>
        <IconButton title={t('header.fit')} onClick={fit}>
          <Maximize2 size={16} />
        </IconButton>
        <IconButton title={t('header.zoomIn')} onClick={zoomIn}>
          <ZoomIn size={16} />
        </IconButton>
        <IconButton title={t('header.zoomOut')} onClick={zoomOut}>
          <ZoomOut size={16} />
        </IconButton>
      </Group>

      <Divider />

      <Group>
        <IconButton title={t('header.toggleGrid')} active={gridVisible} onClick={toggleGrid}>
          <Grid2x2 size={16} />
        </IconButton>
        <IconButton title={t('header.togglePlate')} active={plateVisible} onClick={togglePlate}>
          {plateVisible ? <Square size={16} /> : <SquareDashed size={16} />}
        </IconButton>
        <IconButton title={duoView ? t('header.duoSingle') : t('header.duoDual')} active={duoView} onClick={toggleDuoView}>
          <Columns2 size={16} />
        </IconButton>
        <IconButton title={isFullscreen ? t('header.exitFullscreen') : t('header.fullscreen')} onClick={onFullscreen}>
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </IconButton>
      </Group>

      <Divider />

      <Group>
        <IconButton title={t('header.undo')} disabled={past === 0} onClick={() => undo(1)}>
          <Undo2 size={16} />
        </IconButton>
        <IconButton title={t('header.redo')} disabled={future === 0} onClick={() => redo(1)}>
          <Redo2 size={16} />
        </IconButton>
      </Group>

      <Divider />

      <div ref={printerRef} className="relative shrink-0">
        <button
          className="h-8 px-2 flex items-center gap-2 text-xs rounded hover:bg-bg-elevated"
          onClick={() => setPrinterOpen((o) => !o)}
        >
          <span className="font-medium text-text">{printerLabel(printer)}</span>
          <ChevronDown size={14} className="text-text-muted" />
          <span className="text-text-dim tabular hidden lg:inline">
            {plateW.toFixed(0)}×{plateD.toFixed(0)}mm
          </span>
        </button>
        {printerOpen && (
          <div className="absolute top-full left-0 mt-1 panel rounded-md shadow-lg w-72 max-h-96 overflow-y-auto z-20">
            {Object.entries(grouped).map(([brand, models]) => (
              <div key={brand} className="py-1">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-text-dim font-semibold">
                  {brand}
                </div>
                {models.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPrinterId(p.id);
                      setPrinterOpen(false);
                    }}
                    className={[
                      'w-full text-left px-3 py-1.5 text-xs flex justify-between items-center hover:bg-bg-elevated',
                      printerId === p.id ? 'text-accent' : 'text-text',
                    ].join(' ')}
                  >
                    <span>{p.model}</span>
                    <span className="text-text-dim tabular">
                      {p.x}×{p.y}
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {printerId === 'custom' && (
              <div className="px-3 py-2 border-t border-border flex gap-2">
                <input
                  type="number"
                  className="input"
                  value={customPlate.x}
                  min={50}
                  max={1000}
                  onChange={(e) => setCustomPlate(Number(e.target.value), customPlate.y)}
                />
                <span className="text-text-dim text-xs self-center">×</span>
                <input
                  type="number"
                  className="input"
                  value={customPlate.y}
                  min={50}
                  max={1000}
                  onChange={(e) => setCustomPlate(customPlate.x, Number(e.target.value))}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex rounded border border-border overflow-hidden text-xs">
          <button
            className={`px-2 py-1 ${design.units === 'metric' ? 'bg-accent text-accent-fg' : 'text-text-muted'}`}
            onClick={() => setUnits('metric')}
          >
            {t('header.unitMm')}
          </button>
          <button
            className={`px-2 py-1 ${design.units === 'imperial' ? 'bg-accent text-accent-fg' : 'text-text-muted'}`}
            onClick={() => setUnits('imperial')}
          >
            {t('header.unitIn')}
          </button>
        </div>

        <IconButton title={t(theme === 'dark' ? 'header.themeLight' : 'header.themeDark')} onClick={toggle}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>

        <IconButton title={t('header.savedDesigns')} onClick={onOpenLibrary}>
          <FolderOpen size={16} />
        </IconButton>

        <IconButton title={t('header.copyShareLink')} onClick={onShare}>
          <Share2 size={16} />
        </IconButton>

        <div ref={exportRef} className="relative flex">
          <button
            className="btn-primary rounded-r-none flex items-center gap-2"
            onClick={() => onExport(format)}
            disabled={exporting}
          >
            <Download size={14} />
            {exporting ? t('header.exporting') : activeFormat.label}
          </button>
          <button
            className="btn-primary rounded-l-none border-l border-accent-fg/30 px-2"
            onClick={() => setExportOpen((o) => !o)}
            disabled={exporting}
            aria-label={t('header.pickFormat')}
          >
            <ChevronDown size={14} />
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 panel rounded shadow-lg w-56 z-20">
              {formats.map((f) => (
                <button
                  key={f.id}
                  className="w-full text-left px-3 py-2 hover:bg-bg-elevated flex flex-col gap-0.5"
                  onClick={() => {
                    setFormat(f.id);
                    setExportOpen(false);
                  }}
                >
                  <span className="text-sm font-medium">
                    {f.label}
                    {format === f.id && <span className="ml-2 text-xs text-accent">✓</span>}
                  </span>
                  <span className="text-xs text-text-dim">{f.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
