import { create } from 'zustand';
import {
  DEFAULT_DESIGN,
  type Design,
  type ModelParams,
  BaseplateParamsSchema,
  BinParamsSchema,
} from '@/lib/params/schema';
import { writeDesignToUrl, readDesignFromUrl } from '@/lib/params/url';

type DesignState = {
  design: Design;
  setDesign: (next: Design) => void;
  setModel: (model: ModelParams) => void;
  switchKind: (kind: ModelParams['kind']) => void;
  setUnits: (units: Design['units']) => void;
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
    const model: ModelParams =
      kind === 'baseplate'
        ? BaseplateParamsSchema.parse({ kind: 'baseplate' })
        : BinParamsSchema.parse({ kind: 'bin' });
    const next = { ...get().design, model };
    set({ design: next });
    writeDesignToUrl(next);
  },
  setUnits: (units) => {
    const next = { ...get().design, units };
    set({ design: next });
    writeDesignToUrl(next);
  },
}));
