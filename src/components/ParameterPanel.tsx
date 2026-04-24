import { useDesignStore } from '@/store/designStore';
import {
  BaseplateParamsSchema,
  BinParamsSchema,
  type LabelStyle,
} from '@/lib/params/schema';
import { STANDARD, isStandardSpec } from '@/lib/gridfinity/spec';

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 py-3 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between">
        <h3 className="label">{title}</h3>
        {right}
      </div>
      {children}
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
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label flex justify-between normal-case">
        <span>{label}</span>
        <span className="tabular text-text">
          {value}
          {suffix ? ` ${suffix}` : ''}
        </span>
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
    <div className="grid grid-flow-col auto-cols-fr gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`btn ${value === opt.value ? 'btn-primary' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ParameterPanel() {
  const { design, setModel, switchKind, setSpec } = useDesignStore();
  const { model, spec } = design;
  const specIsStandard = isStandardSpec(spec.gridUnit, spec.heightUnit);

  return (
    <aside className="w-80 shrink-0 panel border-r flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide">Parameters</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-4 divide-y divide-border">
        <Section title="Model type">
          <SegmentedControl
            value={model.kind}
            onChange={(k) => switchKind(k)}
            options={[
              { value: 'bin', label: 'Bin' },
              { value: 'baseplate', label: 'Baseplate' },
            ]}
          />
        </Section>

        <Section
          title="Grid"
          right={!specIsStandard ? <span className="warn-badge">non-standard</span> : null}
        >
          <NumberField
            label="Cell size"
            value={spec.gridUnit}
            min={10}
            max={120}
            step={0.5}
            onChange={(v) => setSpec({ gridUnit: v })}
            suffix="mm"
          />
          <NumberField
            label="Height unit"
            value={spec.heightUnit}
            min={2}
            max={30}
            step={0.5}
            onChange={(v) => setSpec({ heightUnit: v })}
            suffix="mm"
          />
          {!specIsStandard && (
            <p className="text-xs text-warn leading-snug">
              Deviates from Gridfinity spec ({STANDARD.gridUnit} mm × {STANDARD.heightUnit} mm).
              Parts won't mate with stock bins, but everything you generate here will be
              self-consistent.
            </p>
          )}
        </Section>

        {model.kind === 'bin' ? (
          <>
            <Section title="Bin size">
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
                suffix={`= ${(model.heightUnits * spec.heightUnit).toFixed(1)} mm`}
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
                suffix="mm"
              />
              <Toggle
                label="Stacking lip"
                value={model.stackingLip}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, stackingLip: v }))}
              />
            </Section>

            <Section title="Compartments">
              <NumberField
                label="Dividers X"
                value={model.divX}
                min={1}
                max={10}
                disabled={!model.hollow}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, divX: v }))}
                suffix={`= ${model.divX} compartment${model.divX === 1 ? '' : 's'}`}
              />
              <NumberField
                label="Dividers Y"
                value={model.divY}
                min={1}
                max={10}
                disabled={!model.hollow}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, divY: v }))}
                suffix={`= ${model.divY} compartment${model.divY === 1 ? '' : 's'}`}
              />
              <Toggle
                label="Scoop ramp (front)"
                value={model.scoopRamp}
                disabled={!model.hollow}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, scoopRamp: v }))}
              />
            </Section>

            <Section title="Label">
              <SegmentedControl<LabelStyle>
                value={model.labelStyle}
                onChange={(v) => setModel(BinParamsSchema.parse({ ...model, labelStyle: v }))}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'paperPocket', label: 'Paper' },
                  { value: 'clipTab', label: 'Clip tab' },
                ]}
              />
              <p className="text-xs text-text-dim leading-snug">
                Paper: recessed pocket on the front wall. Clip tab: slot at the top front lip
                for printed swap labels. Embossed text coming next.
              </p>
            </Section>

            <Section title="Mounting">
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
            <Section title="Baseplate size">
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

            <Section title="Mounting">
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
