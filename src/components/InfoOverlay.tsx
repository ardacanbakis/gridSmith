import { useDesignStore } from '@/store/designStore';
import { useViewportStore } from '@/store/viewportStore';
import { findPrinter, printerLabel } from '@/lib/printers';
import { fmtLength } from '@/lib/units';
import type { Bbox, BuildStats } from '@/lib/geometry/types';

type Props = {
  bbox: Bbox | null;
  stats: BuildStats | null;
};

/** Density in g/cm³ for typical filaments. PLA is the assumed default. */
const PLA_DENSITY = 1.24;

/**
 * Rough print-time estimate.
 * Assumes 0.4 mm nozzle / 0.2 mm layers / 50 mm/s → peak 4 mm³/s,
 * discounted by ~50% for acceleration, retracts, and travel → ~2 mm³/s average.
 */
function estimatePrintMinutes(volumeMm3: number): number {
  return volumeMm3 / (2 * 60); // 2 mm³/s → mm³/min
}

function fmtMinutes(min: number): string {
  const rounded = Math.max(1, Math.round(min));
  if (rounded < 60) return `${rounded} min`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function InfoOverlay({ bbox, stats }: Props) {
  const { design } = useDesignStore();
  const { printerId, customPlate } = useViewportStore();
  const printer = findPrinter(printerId);
  const plateW = printerId === 'custom' ? customPlate.x : printer.x;
  const plateD = printerId === 'custom' ? customPlate.y : printer.y;

  const { units } = design;

  const dimText = bbox
    ? `${fmtLength(bbox.max[0] - bbox.min[0], units, 1)} × ${fmtLength(
        bbox.max[1] - bbox.min[1],
        units,
        1,
      )} × ${fmtLength(bbox.max[2] - bbox.min[2], units, 1)}`
    : '—';

  const content = describeContent(design.model);

  const fitsPlate =
    bbox != null &&
    bbox.max[0] - bbox.min[0] <= plateW &&
    bbox.max[1] - bbox.min[1] <= plateD;

  const volumeText = stats?.volumeMm3
    ? `${(stats.volumeMm3 / 1000).toFixed(1)} cm³ · ~${
        ((stats.volumeMm3 / 1000) * PLA_DENSITY).toFixed(1)
      } g PLA · ~${fmtMinutes(estimatePrintMinutes(stats.volumeMm3))}`
    : null;

  return (
    <div className="absolute bottom-3 left-3 panel rounded-md px-3 py-2 text-xs font-mono leading-tight pointer-events-none">
      <div className="text-text">{dimText}</div>
      {content && <div className="text-text-muted">{content}</div>}
      {volumeText && <div className="text-text-dim">{volumeText}</div>}
      <div className={fitsPlate ? 'text-text-dim' : 'text-warn'}>
        {printerLabel(printer)} ({plateW}×{plateD})
        {!fitsPlate && bbox && ' — exceeds plate'}
      </div>
    </div>
  );
}

function describeContent(model: ReturnType<typeof useDesignStore.getState>['design']['model']): string | null {
  if (model.kind === 'baseplate') {
    return `Baseplate ${model.cellsX}×${model.cellsY}, ${model.style}`;
  }
  if (model.kind === 'bin') {
    const parts: string[] = [`Bin ${model.cellsX}×${model.cellsY}×${model.heightUnits}u`];
    if (model.divX > 1 || model.divY > 1) parts.push(`${model.divX * model.divY} compartments`);
    if (model.scoopRamp) parts.push('scoop');
    if (model.labelStyle === 'embossText') parts.push(`emboss "${model.labelText}"`);
    if (model.labelStyle === 'engraveText') parts.push(`engrave "${model.labelText}"`);
    return parts.join(' · ');
  }
  if (model.kind === 'drillBitHolder') {
    return `Drill bits · ${model.bitSet} · ${model.holeDepth}mm deep`;
  }
  if (model.kind === 'screwOrganizer') {
    return `Screws · ${model.cols}×${model.rows} compartments · ${model.tiltDegrees}° tilt`;
  }
  if (model.kind === 'partsTray') {
    return `Parts tray ${model.cellsX}×${model.cellsY}×${model.heightUnits}u · ${model.pocketCols}×${model.pocketRows} ${model.pocketShape} pockets Ø${model.pocketSize}mm`;
  }
  if (model.kind === 'lid') {
    return `Lid ${model.cellsX}×${model.cellsY} · ${model.lidClearance}mm clearance`;
  }
  return null;
}
