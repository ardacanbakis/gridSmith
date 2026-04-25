import { create } from 'zustand';
import { DEFAULT_PRINTER_ID } from '@/lib/printers';

const STORAGE_KEY = 'gridsmith-viewport';

type Persisted = {
  printerId: string;
  customPlate: { x: number; y: number };
  plateVisible: boolean;
  gridVisible: boolean;
  shadowsEnabled: boolean;
};

const DEFAULTS: Persisted = {
  printerId: DEFAULT_PRINTER_ID,
  customPlate: { x: 256, y: 256 },
  plateVisible: true,
  gridVisible: true,
  shadowsEnabled: true,
};

function load(): Persisted {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Persisted>) };
  } catch {
    return DEFAULTS;
  }
}

function persist(state: Persisted) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

type ViewportState = Persisted & {
  setPrinterId: (id: string) => void;
  setCustomPlate: (x: number, y: number) => void;
  togglePlate: () => void;
  toggleGrid: () => void;
  toggleShadows: () => void;
  /** A monotonically incrementing nudge so the viewport recentres on demand. */
  recenterNonce: number;
  recenter: () => void;
  fitNonce: number;
  fit: () => void;
  zoomNonce: number;
  zoomDir: 1 | -1 | 0;
  zoomIn: () => void;
  zoomOut: () => void;
};

const initial = load();

export const useViewportStore = create<ViewportState>((set, get) => ({
  ...initial,
  recenterNonce: 0,
  fitNonce: 0,
  zoomNonce: 0,
  zoomDir: 0,

  setPrinterId: (printerId) => {
    const next = { ...current(get), printerId };
    set(next);
    persist(next);
  },
  setCustomPlate: (x, y) => {
    const next = { ...current(get), customPlate: { x, y } };
    set(next);
    persist(next);
  },
  togglePlate: () => {
    const next = { ...current(get), plateVisible: !get().plateVisible };
    set(next);
    persist(next);
  },
  toggleGrid: () => {
    const next = { ...current(get), gridVisible: !get().gridVisible };
    set(next);
    persist(next);
  },
  toggleShadows: () => {
    const next = { ...current(get), shadowsEnabled: !get().shadowsEnabled };
    set(next);
    persist(next);
  },

  recenter: () => set((s) => ({ recenterNonce: s.recenterNonce + 1 })),
  fit: () => set((s) => ({ fitNonce: s.fitNonce + 1 })),
  zoomIn: () => set((s) => ({ zoomNonce: s.zoomNonce + 1, zoomDir: 1 })),
  zoomOut: () => set((s) => ({ zoomNonce: s.zoomNonce + 1, zoomDir: -1 })),
}));

function current(get: () => ViewportState): Persisted {
  const s = get();
  return {
    printerId: s.printerId,
    customPlate: s.customPlate,
    plateVisible: s.plateVisible,
    gridVisible: s.gridVisible,
    shadowsEnabled: s.shadowsEnabled,
  };
}
