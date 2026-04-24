import { create } from 'zustand';
import {
  DEFAULT_DESIGN,
  type Design,
  type GridSpec,
  type ModelParams,
  BaseplateParamsSchema,
  BinParamsSchema,
  DrillBitHolderParamsSchema,
} from '@/lib/params/schema';
import { writeDesignToUrl, readDesignFromUrl } from '@/lib/params/url';

type DesignState = {
  design: Design;
  setDesign: (next: Design) => void;
  setModel: (model: ModelParams) => void;
  switchKind: (kind: ModelParams['kind']) => void;
  setUnits: (units: Design['units']) => void;
  setSpec: (spec: Partial<GridSpec>) => void;
};

const initial = readDesignFromUrl() ?? DEFAULT_DESIGN;

export const useDesignStore = create<DesignState>((set, get) => ({
  design: initial,
  setDesign: (next) => {
    set({ design: next });
    writeDesignToUrl(next);
  },
  setModel: (model) => {
    const next = { ...get().design, model };
    set({ design: next });
    writeDesignToUrl(next);
  },
  switchKind: (kind) => {
    let model: ModelParams;
    if (kind === 'baseplate') model = BaseplateParamsSchema.parse({ kind: 'baseplate' });
    else if (kind === 'drillBitHolder') model = DrillBitHolderParamsSchema.parse({ kind: 'drillBitHolder' });
    else model = BinParamsSchema.parse({ kind: 'bin' });
    const next = { ...get().design, model };
    set({ design: next });
    writeDesignToUrl(next);
  },
  setUnits: (units) => {
    const next = { ...get().design, units };
    set({ design: next });
    writeDesignToUrl(next);
  },
  setSpec: (patch) => {
    const next = { ...get().design, spec: { ...get().design.spec, ...patch } };
    set({ design: next });
    writeDesignToUrl(next);
  },
}));
