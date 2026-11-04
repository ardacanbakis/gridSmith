import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import {
  Check,
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
  MoreHorizontal,
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
  className = '',
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** Extra classes — typically responsive visibility such as `hidden xl:grid`. */
  className?: string;
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
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Group({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`flex items-center gap-0.5 ${className}`}>{children}</div>;
}

function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-5 w-px bg-border mx-1.5 ${className}`} />;
}

/** A row in the overflow menu. `className` sets when it shows (it hides once the control is inline). */
function MenuItem({
  icon,
  label,
  onClick,
  active,
  className = '',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-bg-elevated ${
        active ? 'text-accent' : 'text-text'
      } ${className}`}
    >
      <span className="shrink-0 text-text-muted">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {active && <Check size={14} className="shrink-0" />}
    </button>
  );
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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== 'undefined' && document.fullscreenElement != null,
  );

  useEffect(() => {
    if (!printerOpen && !exportOpen && !moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!printerRef.current?.contains(e.target as Node)) setPrinterOpen(false);
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [printerOpen, exportOpen, moreOpen]);

  /** Run a menu action, then close the menu. Toggles call their action directly so the menu stays open. */
  const closeAfter = (action: () => void) => () => {
    action();
    setMoreOpen(false);
  };

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

  const [linkCopied, setLinkCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  const onShare = async () => {
    const url = shareableUrl(design);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy share link', url);
      return;
    }
    setLinkCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setLinkCopied(false), 1800);
  };

  const grouped = PRINTERS.reduce<Record<string, typeof PRINTERS[number][]>>((acc, p) => {
    (acc[p.brand] ??= []).push(p);
    return acc;
  }, {});

  // Rendered both inline and in the More menu, depending on screen width.
  const unitsToggle = (className: string) => (
    <div className={`rounded border border-border overflow-hidden text-xs ${className}`}>
      <button
        className={`flex-1 px-2 py-1 ${design.units === 'metric' ? 'bg-accent text-accent-fg' : 'text-text-muted'}`}
        onClick={() => setUnits('metric')}
      >
        {t('header.unitMm')}
      </button>
      <button
        className={`flex-1 px-2 py-1 ${design.units === 'imperial' ? 'bg-accent text-accent-fg' : 'text-text-muted'}`}
        onClick={() => setUnits('imperial')}
      >
        {t('header.unitIn')}
      </button>
    </div>
  );

  const customPlateInputs = (
    <div className="flex gap-2">
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
  );

  return (
    <header className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 h-12 border-b border-border bg-bg-panel shrink-0">
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
        <span className="hidden xl:inline">Templates</span>
      </button>

      <div className="flex-1" />

      {/*
        As the screen narrows, controls move into the More menu: zoom, dual
        sidebar and fullscreen below xl; printer, units, theme, library and
        share below lg; camera and view toggles below md (touch handles those).
      */}
      <Group className="hidden md:flex">
        <IconButton title={t('header.recenter')} onClick={recenter}>
          <Home size={16} />
        </IconButton>
        <IconButton title={t('header.fit')} onClick={fit}>
          <Maximize2 size={16} />
        </IconButton>
        <IconButton title={t('header.zoomIn')} onClick={zoomIn} className="hidden xl:grid">
          <ZoomIn size={16} />
        </IconButton>
        <IconButton title={t('header.zoomOut')} onClick={zoomOut} className="hidden xl:grid">
          <ZoomOut size={16} />
        </IconButton>
      </Group>

      <Divider className="hidden md:block" />

      <Group className="hidden md:flex">
        <IconButton title={t('header.toggleGrid')} active={gridVisible} onClick={toggleGrid}>
          <Grid2x2 size={16} />
        </IconButton>
        <IconButton title={t('header.togglePlate')} active={plateVisible} onClick={togglePlate}>
          {plateVisible ? <Square size={16} /> : <SquareDashed size={16} />}
        </IconButton>
        <IconButton
          title={duoView ? t('header.duoSingle') : t('header.duoDual')}
          active={duoView}
          onClick={toggleDuoView}
          className="hidden xl:grid"
        >
          <Columns2 size={16} />
        </IconButton>
        <IconButton
          title={isFullscreen ? t('header.exitFullscreen') : t('header.fullscreen')}
          onClick={onFullscreen}
          className="hidden xl:grid"
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </IconButton>
      </Group>

      <Divider className="hidden md:block" />

      <Group>
        <IconButton title={t('header.undo')} disabled={past === 0} onClick={() => undo(1)}>
          <Undo2 size={16} />
        </IconButton>
        <IconButton title={t('header.redo')} disabled={future === 0} onClick={() => redo(1)}>
          <Redo2 size={16} />
        </IconButton>
      </Group>

      <Divider className="hidden lg:block" />

      <div ref={printerRef} className="relative shrink-0 hidden lg:block">
        <button
          className="h-8 px-2 flex items-center gap-2 text-xs rounded hover:bg-bg-elevated"
          onClick={() => setPrinterOpen((o) => !o)}
        >
          <span className="font-medium text-text">{printerLabel(printer)}</span>
          <ChevronDown size={14} className="text-text-muted" />
          <span className="text-text-dim tabular hidden xl:inline">
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
              <div className="px-3 py-2 border-t border-border">{customPlateInputs}</div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 hidden lg:block" />

      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {unitsToggle('hidden lg:flex')}

        <IconButton
          title={t(theme === 'dark' ? 'header.themeLight' : 'header.themeDark')}
          onClick={toggle}
          className="hidden lg:grid"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>

        <IconButton title={t('header.savedDesigns')} onClick={onOpenLibrary} className="hidden lg:grid">
          <FolderOpen size={16} />
        </IconButton>

        <IconButton
          title={linkCopied ? t('header.linkCopied') : t('header.copyShareLink')}
          active={linkCopied}
          onClick={onShare}
          className="hidden lg:grid"
        >
          {linkCopied ? <Check size={16} /> : <Share2 size={16} />}
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

        <div ref={moreRef} className="relative xl:hidden">
          <IconButton title={t('header.more')} active={moreOpen} onClick={() => setMoreOpen((o) => !o)}>
            <MoreHorizontal size={16} />
          </IconButton>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 panel rounded-md shadow-lg w-64 max-h-[80vh] overflow-y-auto z-30 py-1">
              <MenuItem className="md:hidden" icon={<Home size={15} />} label={t('header.recenter')} onClick={closeAfter(recenter)} />
              <MenuItem className="md:hidden" icon={<Maximize2 size={15} />} label={t('header.fit')} onClick={closeAfter(fit)} />
              <MenuItem icon={<ZoomIn size={15} />} label={t('header.zoomIn')} onClick={zoomIn} />
              <MenuItem icon={<ZoomOut size={15} />} label={t('header.zoomOut')} onClick={zoomOut} />
              <MenuItem
                className="md:hidden"
                icon={<Grid2x2 size={15} />}
                label={t('header.toggleGrid')}
                active={gridVisible}
                onClick={toggleGrid}
              />
              <MenuItem
                className="md:hidden"
                icon={plateVisible ? <Square size={15} /> : <SquareDashed size={15} />}
                label={t('header.togglePlate')}
                active={plateVisible}
                onClick={togglePlate}
              />
              {/* Dual sidebar needs room for three columns, so it only exists from lg up. */}
              <MenuItem
                className="hidden lg:flex"
                icon={<Columns2 size={15} />}
                label={t('header.duoDual')}
                active={duoView}
                onClick={toggleDuoView}
              />
              <MenuItem
                icon={isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
                label={isFullscreen ? t('header.exitFullscreen') : t('header.fullscreen')}
                onClick={closeAfter(onFullscreen)}
              />

              <div className="lg:hidden border-t border-border mt-1 pt-2 px-3 pb-1 flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                  <span className="label normal-case">{t('header.printer')}</span>
                  <select
                    className="input text-xs"
                    value={printerId}
                    onChange={(e) => setPrinterId(e.target.value)}
                  >
                    {Object.entries(grouped).map(([brand, models]) => (
                      <optgroup key={brand} label={brand}>
                        {models.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.model} — {p.x}×{p.y}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                {printerId === 'custom' && customPlateInputs}
                <div className="flex items-center justify-between gap-2">
                  <span className="label normal-case">{t('header.units')}</span>
                  {unitsToggle('flex w-24')}
                </div>
              </div>
              <MenuItem
                className="lg:hidden"
                icon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                label={t(theme === 'dark' ? 'header.themeLight' : 'header.themeDark')}
                onClick={toggle}
              />
              <MenuItem
                className="lg:hidden"
                icon={<FolderOpen size={15} />}
                label={t('header.savedDesigns')}
                onClick={closeAfter(onOpenLibrary)}
              />
              <MenuItem
                className="lg:hidden"
                icon={linkCopied ? <Check size={15} /> : <Share2 size={15} />}
                label={linkCopied ? t('header.linkCopied') : t('header.copyShareLink')}
                onClick={onShare}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
