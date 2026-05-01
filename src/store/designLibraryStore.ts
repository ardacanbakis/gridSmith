import { create } from 'zustand';
import { DesignSchema, type Design } from '@/lib/params/schema';

const STORAGE_KEY = 'gridsmith-saved-designs';

export type SavedDesign = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  design: Design;
};

function load(): SavedDesign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const e = entry as Record<string, unknown>;
        const designResult = DesignSchema.safeParse(e.design);
        if (!designResult.success) return null;
        return {
          id: String(e.id),
          name: typeof e.name === 'string' ? e.name : 'Untitled',
          createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
          updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : Date.now(),
          design: designResult.data,
        } satisfies SavedDesign;
      })
      .filter((d): d is SavedDesign => d !== null);
  } catch {
    return [];
  }
}

function persist(items: SavedDesign[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function newId(): string {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type LibraryState = {
  items: SavedDesign[];
  save: (name: string, design: Design) => SavedDesign;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
};

export const useDesignLibraryStore = create<LibraryState>((set, get) => ({
  items: load(),
  save: (name, design) => {
    const item: SavedDesign = {
      id: newId(),
      name: name.trim() || 'Untitled',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      design,
    };
    const items = [item, ...get().items];
    set({ items });
    persist(items);
    return item;
  },
  rename: (id, name) => {
    const items = get().items.map((it) =>
      it.id === id ? { ...it, name: name.trim() || it.name, updatedAt: Date.now() } : it,
    );
    set({ items });
    persist(items);
  },
  remove: (id) => {
    const items = get().items.filter((it) => it.id !== id);
    set({ items });
    persist(items);
  },
}));
