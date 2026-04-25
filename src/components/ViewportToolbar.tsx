import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import {
  ChevronDown,
  Grid2x2,
  Home,
  Maximize2,
  Maximize,
  Minimize,
  Redo2,
  SunMedium,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useViewportStore } from '@/store/viewportStore';
import { useDesignStore } from '@/store/designStore';
import { findPrinter, PRINTERS, printerLabel } from '@/lib/printers';

function ToolButton({
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
        'h-8 w-8 grid place-items-center rounded transition-colors',
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
  return (
    <div className="flex items-center gap-0.5 panel rounded-md px-1 py-1 shadow-sm">
      {children}
    </div>
  );
}

export function ViewportToolbar() {
  const {
    printerId,
    customPlate,
    plateVisible,
    gridVisible,
    shadowsEnabled,
    setPrinterId,
    setCustomPlate,
    togglePlate,
    toggleGrid,
    toggleShadows,
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
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== 'undefined' && document.fullscreenElement != null,
  );

  useEffect(() => {
    if (!printerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!printerRef.current?.contains(e.target as Node)) setPrinterOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [printerOpen]);

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

  const grouped = PRINTERS.reduce<Record<string, typeof PRINTERS[number][]>>((acc, p) => {
    (acc[p.brand] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
      <Group>
        <ToolButton title="Recenter view" onClick={recenter}>
          <Home size={16} />
        </ToolButton>
        <ToolButton title="Fit to model" onClick={fit}>
          <Maximize2 size={16} />
        </ToolButton>
      </Group>

      <Group>
        <ToolButton title="Zoom in" onClick={zoomIn}>
          <ZoomIn size={16} />
        </ToolButton>
        <ToolButton title="Zoom out" onClick={zoomOut}>
          <ZoomOut size={16} />
        </ToolButton>
      </Group>

      <Group>
        <ToolButton title="Toggle grid" active={gridVisible} onClick={toggleGrid}>
          <Grid2x2 size={16} />
        </ToolButton>
        <ToolButton title="Toggle build plate" active={plateVisible} onClick={togglePlate}>
          {plateVisible ? '◼' : '▢'}
        </ToolButton>
        <ToolButton title="Toggle contact shadows" active={shadowsEnabled} onClick={toggleShadows}>
          <SunMedium size={16} />
        </ToolButton>
        <ToolButton title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={onFullscreen}>
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </ToolButton>
      </Group>

      <div ref={printerRef} className="relative">
        <button
          className="h-8 panel rounded-md px-2 flex items-center gap-2 text-xs hover:bg-bg-elevated"
          onClick={() => setPrinterOpen((o) => !o)}
        >
          <span className="font-medium text-text">{printerLabel(printer)}</span>
          <ChevronDown size={14} className="text-text-muted" />
          <span className="text-text-dim tabular">
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

      <Group>
        <ToolButton title="Undo" disabled={past === 0} onClick={() => undo(1)}>
          <Undo2 size={16} />
        </ToolButton>
        <ToolButton title="Redo" disabled={future === 0} onClick={() => redo(1)}>
          <Redo2 size={16} />
        </ToolButton>
      </Group>
    </div>
  );
}
