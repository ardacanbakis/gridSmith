import { useState, type ReactNode } from 'react';
import { Box, ChevronDown, ChevronRight, Drill, LayoutGrid, Plus, Wrench, X } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import {
  BaseplateParamsSchema,
  BinParamsSchema,
  DrillBitHolderParamsSchema,
  ScrewOrganizerParamsSchema,
  type LabelStyle,
  type BitSetId,
} from '@/lib/params/schema';
import { STANDARD, isStandardSpec } from '@/lib/gridfinity/spec';
import { BIT_SETS } from '@/lib/gridfinity/bitSets';
import { fmtLength } from '@/lib/units';

type ModelKind = ReturnType<typeof useDesignStore.getState>['design']['model']['kind'];

const MODEL_OPTIONS: Array<{ kind: ModelKind; label: string; icon: ReactNode }> = [
  { kind: 'bin', label: 'Bin', icon: <Box size={16} /> },
  { kind: 'baseplate', label: 'Plate', icon: <LayoutGrid size={16} /> },
  { kind: 'drillBitHolder', label: 'Drill bits', icon: <Drill size={16} /> },
  { kind: 'screwOrganizer', label: 'Screws', icon: <Wrench size={16} /> },
];

function ModelTypePicker({
  value,
  onChange,
}: {
  value: ModelKind;
  onChange: (k: ModelKind) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1 p-1 bg-bg-elevated rounded-md border border-border">
      {MODEL_OPTIONS.map((opt) => (
        <button
          key={opt.kind}
          onClick={() => onChange(opt.kind)}
          className={[
            'flex flex-col items-center justify-center gap-1 py-2 rounded-md text-[11px] font-medium transition-colors',
            value === opt.kind
              ? 'bg-accent text-accent-fg shadow-sm'
              : 'text-text-muted hover:text-text hover:bg-bg-panel',
          ].join(' ')}
          title={opt.label}
        >
          {opt.icon}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

function Section({
  title,
  defaultOpen = true,
  right,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  right?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-2.5 group"
      >
        <span className="flex items-center gap-1.5 label">
          {open ? (
            <ChevronDown size={12} className="text-text-dim group-hover:text-text-muted" />
          ) : (
            <ChevronRight size={12} className="text-text-dim group-hover:text-text-muted" />
          )}
          {title}
        </span>
        {right}
      </button>
      {open && <div className="flex flex-col gap-3 pb-3">{children}</div>}
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
  disabled,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  disabled?: boolean;
  format?: (v: number) => string;
}) {
  const display = format ? format(value) : `${value}${suffix ? ` ${suffix}` : ''}`;
  return (
    <label className="flex flex-col gap-1">
      <span className="label flex justify-between normal-case">
        <span>{label}</span>
        <span className="tabular text-text">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-accent"
      />
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-2 py-0.5">
      <span className={`text-sm ${disabled ? 'text-text-dim' : 'text-text'}`}>{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          value ? 'bg-accent' : 'bg-bg-elevated border border-border'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-bg transition-transform ${
            value ? 'translate-x-4' : ''
          }`}
        />
      </button>
    </label>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-1 p-1 bg-bg-elevated rounded-md border border-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={[
            'px-2 py-1 rounded text-xs font-medium transition-colors',
            value === opt.value
              ? 'bg-accent text-accent-fg shadow-sm'
              : 'text-text-muted hover:text-text',
          ].join(' ')}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CustomBitsEditor({
  bits,
  onChange,
}: {
  bits: number[];
  onChange: (b: number[]) => void;
}) {
  const update = (i: number, v: number) => {
    const next = [...bits];
    next[i] = v;
    onChange(next);
  };
  const remove = (i: number) => onChange(bits.filter((_, j) => j !== i));
  const add = () => onChange([...bits, bits.length > 0 ? bits[bits.length - 1] : 5]);

  return (
    <div className="flex flex-col gap-1.5">
      {bits.length === 0 && (
        <p className="text-xs text-text-dim">No custom bits — add one to start.</p>
      )}
      {bits.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-text-dim tabular w-6">#{i + 1}</span>
          <input
            type="number"
            className="input flex-1"
            value={b}
            min={0.3}
            max={25}
            step={0.1}
            onChange={(e) => update(i, Number(e.target.value))}
          />
          <span className="text-xs text-text-dim">mm</span>
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-text-dim hover:text-text p-1"
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="btn text-xs flex items-center gap-1 self-start mt-1"
      >
        <Plus size={12} /> Add bit
      </button>
    </div>
  );
}

export function ParameterPanel() {
  const { design, setModel, switchKind, setSpec } = useDesignStore();
  const { model, spec, units } = design;
  const specIsStandard = isStandardSpec(spec.gridUnit, spec.heightUnit);
  const len = (digits = 1) => (v: number) => fmtLength(v, units, digits);

  return (
    <aside className="w-72 shrink-0 panel border-r flex flex-col">
      <div className="p-3 border-b border-border">
        <ModelTypePicker value={model.kind} onChange={(k) => switchKind(k)} />
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <Section
          title="Grid"
          defaultOpen={!specIsStandard}
          right={!specIsStandard && <span className="warn-badge">non-standard</span>}
        >
          <NumberField
            label="Cell size"
            value={spec.gridUnit}
            min={10}
            max={120}
            step={0.5}
            onChange={(v) => setSpec({ gridUnit: v })}
            format={len(1)}
          />
          <NumberField
            label="Height unit"
            value={spec.heightUnit}
            min={2}
            max={30}
            step={0.5}
            onChange={(v) => setSpec({ heightUnit: v })}
            format={len(1)}
          />
          {!specIsStandard && (
            <p className="text-xs text-warn leading-snug">
              Deviates from Gridfinity spec ({STANDARD.gridUnit} mm × {STANDARD.heightUnit} mm).
              Parts won't mate with stock bins.
            </p>
          )}
        </Section>

        {model.kind === 'screwOrganizer' ? (
          <>
            <Section title="Size">
              <NumberField
                label="Cells X"
                value={model.cellsX}
                min={1}
                max={10}
                onChange={(v) => setModel(ScrewOrganizerParamsSchema.parse({ ...model, cellsX: v }))}
              />
              <NumberField
                label="Cells Y"
                value={model.cellsY}
                min={1}
                max={10}
                onChange={(v) => setModel(ScrewOrganizerParamsSchema.parse({ ...model, cellsY: v }))}
              />
              <NumberField
                label="Height (units)"
                value={model.heightUnits}
                min={2}
                max={20}
                onChange={(v) => setModel(ScrewOrganizerParamsSchema.parse({ ...model, heightUnits: v }))}
                format={(v) => `${v}u = ${fmtLength(v * spec.heightUnit, units, 1)}`}
              />
            </Section>

            <Section title="Compartments">
              <NumberField
                label="Columns"
                value={model.cols}
                min={1}
                max={10}
                onChange={(v) => setModel(ScrewOrganizerParamsSchema.parse({ ...model, cols: v }))}
                suffix={`= ${model.cols} across`}
              />
              <NumberField
                label="Rows"
                value={model.rows}
                min={1}
                max={10}
                onChange={(v) => setModel(ScrewOrganizerParamsSchema.parse({ ...model, rows: v }))}
                suffix={`= ${model.rows} deep`}
              />
              <NumberField
                label="Wall thickness"
                value={model.wallThickness}
                min={0.8}
                max={3}
                step={0.1}
                onChange={(v) => setModel(ScrewOrganizerParamsSchema.parse({ ...model, wallThickness: v }))}
                format={len(2)}
              />
              <NumberField
                label="Back tilt"
                value={model.tiltDegrees}
                min={0}
                max={20}
                step={0.5}
                onChange={(v) => setModel(ScrewOrganizerParamsSchema.parse({ ...model, tiltDegrees: v }))}
                suffix="°"
              />
            </Section>

            <Section title="Label" defaultOpen={false}>
              <SegmentedControl<LabelStyle>
                value={model.labelStyle}
                onChange={(v) => setModel(ScrewOrganizerParamsSchema.parse({ ...model, labelStyle: v }))}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'paperPocket', label: 'Paper' },
                  { value: 'clipTab', label: 'Clip' },
                  { value: 'embossText', label: 'Emboss' },
                  { value: 'engraveText', label: 'Engrave' },
                ]}
              />
              {(model.labelStyle === 'embossText' || model.labelStyle === 'engraveText') && (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="label normal-case">Text</span>
                    <input
                      className="input"
                      type="text"
                      maxLength={40}
                      value={model.labelText}
                      onChange={(e) =>
                        setModel(ScrewOrganizerParamsSchema.parse({ ...model, labelText: e.target.value }))
                      }
                    />
                  </label>
                  <NumberField
                    label="Text height"
                    value={model.labelHeight}
                    min={2}
                    max={20}
                    step={0.5}
                    onChange={(v) => setModel(ScrewOrganizerParamsSchema.parse({ ...model, labelHeight: v }))}
                    format={len(1)}
                  />
                  <NumberField
                    label={model.labelStyle === 'engraveText' ? 'Engrave depth' : 'Emboss height'}
                    value={model.labelDepth}
                    min={0.2}
                    max={2.5}
                    step={0.1}
                    onChange={(v) => setModel(ScrewOrganizerParamsSchema.parse({ ...model, labelDepth: v }))}
                    format={len(2)}
                  />
                </>
              )}
            </Section>

            <Section title="Finish" defaultOpen={false}>
              <Toggle
                label="Stacking lip"
                value={model.stackingLip}
                onChange={(v) => setModel(ScrewOrganizerParamsSchema.parse({ ...model, stackingLip: v }))}
              />
              <Toggle
                label="Magnet holes"
                value={model.magnetHoles}
                onChange={(v) => setModel(ScrewOrganizerParamsSchema.parse({ ...model, magnetHoles: v }))}
              />
              <Toggle
                label="Screw holes"
                value={model.screwHoles}
                onChange={(v) => setModel(ScrewOrganizerParamsSchema.parse({ ...model, screwHoles: v }))}
              />
            </Section>
          </>
        ) : model.kind === 'drillBitHolder' ? (
          <>
            <Section title="Size">
              <NumberField
                label="Cells X"
                value={model.cellsX}
                min={1}
                max={10}
                onChange={(v) => setModel(DrillBitHolderParamsSchema.parse({ ...model, cellsX: v }))}
              />
              <NumberField
                label="Cells Y"
                value={model.cellsY}
                min={1}
                max={10}
                onChange={(v) => setModel(DrillBitHolderParamsSchema.parse({ ...model, cellsY: v }))}
              />
              <NumberField
                label="Height (units)"
                value={model.heightUnits}
                min={2}
                max={20}
                onChange={(v) => setModel(DrillBitHolderParamsSchema.parse({ ...model, heightUnits: v }))}
                format={(v) => `${v}u = ${fmtLength(v * spec.heightUnit, units, 1)}`}
              />
            </Section>

            <Section title="Bit set">
              <label className="flex flex-col gap-1">
                <span className="label normal-case">Preset</span>
                <select
                  className="input"
                  value={model.bitSet}
                  onChange={(e) =>
                    setModel(
                      DrillBitHolderParamsSchema.parse({
                        ...model,
                        bitSet: e.target.value as BitSetId,
                      }),
                    )
                  }
                >
                  {Object.values(BIT_SETS).map((bs) => (
                    <option key={bs.id} value={bs.id}>
                      {bs.label} — {bs.diameters.length} bits
                    </option>
                  ))}
                  <option value="custom">Custom list…</option>
                </select>
              </label>
              {model.bitSet === 'custom' && (
                <CustomBitsEditor
                  bits={model.customBits}
                  onChange={(b) =>
                    setModel(DrillBitHolderParamsSchema.parse({ ...model, customBits: b }))
                  }
                />
              )}
            </Section>

            <Section title="Holes">
              <NumberField
                label="Hole depth"
                value={model.holeDepth}
                min={2}
                max={50}
                step={0.5}
                onChange={(v) =>
                  setModel(DrillBitHolderParamsSchema.parse({ ...model, holeDepth: v }))
                }
                format={len(1)}
              />
              <NumberField
                label="Radial clearance"
                value={model.clearance}
                min={0}
                max={0.5}
                step={0.05}
                onChange={(v) =>
                  setModel(DrillBitHolderParamsSchema.parse({ ...model, clearance: v }))
                }
                format={(v) => `+${v.toFixed(2)} mm`}
              />
              <NumberField
                label="Hole spacing"
                value={model.spacing}
                min={0.5}
                max={10}
                step={0.1}
                onChange={(v) =>
                  setModel(DrillBitHolderParamsSchema.parse({ ...model, spacing: v }))
                }
                format={len(2)}
              />
              <NumberField
                label="Edge clearance"
                value={model.edgeClearance}
                min={1}
                max={10}
                step={0.5}
                onChange={(v) =>
                  setModel(DrillBitHolderParamsSchema.parse({ ...model, edgeClearance: v }))
                }
                format={len(1)}
              />
            </Section>

            <Section title="Finish" defaultOpen={false}>
              <Toggle
                label="Stacking lip"
                value={model.stackingLip}
                onChange={(v) =>
                  setModel(DrillBitHolderParamsSchema.parse({ ...model, stackingLip: v }))
                }
              />
              <Toggle
                label="Magnet holes"
                value={model.magnetHoles}
                onChange={(v) =>
                  setModel(DrillBitHolderParamsSchema.parse({ ...model, magnetHoles: v }))
                }
              />
              <Toggle
                label="Screw holes"
                value={model.screwHoles}
                onChange={(v) =>
                  setModel(DrillBitHolderParamsSchema.parse({ ...model, screwHoles: v }))
                }
              />
            </Section>
          </>
        ) : model.kind === 'bin' ? (
          <>
            <Section title="Size">
              <NumberField
                label="Cells X"
                value={model.cellsX}
                min={1}
                max={10}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, cellsX: v }))}
              />
              <NumberField
                label="Cells Y"
                value={model.cellsY}
                min={1}
                max={10}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, cellsY: v }))}
              />
              <NumberField
                label="Height (units)"
                value={model.heightUnits}
                min={2}
                max={20}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, heightUnits: v }))}
                format={(v) => `${v}u = ${fmtLength(v * spec.heightUnit, units, 1)}`}
              />
            </Section>

            <Section title="Shell">
              <Toggle
                label="Hollow"
                value={model.hollow}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, hollow: v }))}
              />
              <NumberField
                label="Wall thickness"
                value={model.wallThickness}
                min={0.8}
                max={3}
                step={0.1}
                disabled={!model.hollow}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, wallThickness: v }))}
                format={len(2)}
              />
              <Toggle
                label="Stacking lip"
                value={model.stackingLip}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, stackingLip: v }))}
              />
            </Section>

            <Section title="Compartments" defaultOpen={false}>
              <NumberField
                label="Dividers X"
                value={model.divX}
                min={1}
                max={10}
                disabled={!model.hollow}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, divX: v }))}
                suffix={`= ${model.divX}`}
              />
              <NumberField
                label="Dividers Y"
                value={model.divY}
                min={1}
                max={10}
                disabled={!model.hollow}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, divY: v }))}
                suffix={`= ${model.divY}`}
              />
              <Toggle
                label="Scoop ramp (front)"
                value={model.scoopRamp}
                disabled={!model.hollow}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, scoopRamp: v }))}
              />
            </Section>

            <Section title="Label" defaultOpen={false}>
              <SegmentedControl<LabelStyle>
                value={model.labelStyle}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, labelStyle: v }))}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'paperPocket', label: 'Paper' },
                  { value: 'clipTab', label: 'Clip' },
                  { value: 'embossText', label: 'Emboss' },
                  { value: 'engraveText', label: 'Engrave' },
                ]}
              />
              {(model.labelStyle === 'embossText' || model.labelStyle === 'engraveText') && (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="label normal-case">Text</span>
                    <input
                      className="input"
                      type="text"
                      maxLength={40}
                      value={model.labelText}
                      onChange={(e) =>
                        setModel(BinParamsSchema.parse({ ...model, labelText: e.target.value }))
                      }
                    />
                  </label>
                  <NumberField
                    label="Text height"
                    value={model.labelHeight}
                    min={2}
                    max={20}
                    step={0.5}
                    onChange={(v) =>
                      setModel(BinParamsSchema.parse({ ...model, labelHeight: v }))
                    }
                    format={len(1)}
                  />
                  <NumberField
                    label={model.labelStyle === 'engraveText' ? 'Engrave depth' : 'Emboss height'}
                    value={model.labelDepth}
                    min={0.2}
                    max={2.5}
                    step={0.1}
                    onChange={(v) =>
                      setModel(BinParamsSchema.parse({ ...model, labelDepth: v }))
                    }
                    format={len(2)}
                  />
                </>
              )}
            </Section>

            <Section title="Mounting" defaultOpen={false}>
              <Toggle
                label="Magnet holes"
                value={model.magnetHoles}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, magnetHoles: v }))}
              />
              <Toggle
                label="Screw holes"
                value={model.screwHoles}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, screwHoles: v }))}
              />
            </Section>
          </>
        ) : (
          <>
            <Section title="Size">
              <NumberField
                label="Cells X"
                value={model.cellsX}
                min={1}
                max={20}
                onChange={(v) => setModel(BaseplateParamsSchema.parse({ ...model, cellsX: v }))}
              />
              <NumberField
                label="Cells Y"
                value={model.cellsY}
                min={1}
                max={20}
                onChange={(v) => setModel(BaseplateParamsSchema.parse({ ...model, cellsY: v }))}
              />
            </Section>

            <Section title="Style">
              <SegmentedControl
                value={model.style}
                onChange={(v) =>
                  setModel(BaseplateParamsSchema.parse({ ...model, style: v as 'minimal' | 'rigid' }))
                }
                options={[
                  { value: 'minimal', label: 'Minimal' },
                  { value: 'rigid', label: 'Rigid' },
                ]}
              />
            </Section>

            <Section title="Mounting" defaultOpen={false}>
              <Toggle
                label="Magnet holes"
                value={model.magnetHoles}
                onChange={(v) =>
                  setModel(BaseplateParamsSchema.parse({ ...model, magnetHoles: v }))
                }
              />
              <Toggle
                label="Screw holes"
                value={model.screwHoles}
                onChange={(v) =>
                  setModel(BaseplateParamsSchema.parse({ ...model, screwHoles: v }))
                }
              />
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}
