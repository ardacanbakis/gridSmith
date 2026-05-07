import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  DEFAULT_DESIGN,
  type Design,
  type GridSpec,
  type ModelParams,
  BaseplateParamsSchema,
  BinParamsSchema,
  DrillBitHolderParamsSchema,
  ScrewOrganizerParamsSchema,
  PartsTrayParamsSchema,
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

export const useDesignStore = create<DesignState>()(
  temporal(
    (set, get) => ({
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
        else if (kind === 'screwOrganizer') model = ScrewOrganizerParamsSchema.parse({ kind: 'screwOrganizer' });
        else if (kind === 'partsTray') model = PartsTrayParamsSchema.parse({ kind: 'partsTray' });
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
    }),
    {
      // Track only the design payload — action methods aren't snapshot data.
      partialize: (state) => ({ design: state.design }),
      // Coalesce rapid slider drags into one undo step.
      handleSet: (handleSet) => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        return (state) => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => handleSet(state), 350);
        };
      },
      limit: 50,
    },
  ),
);
