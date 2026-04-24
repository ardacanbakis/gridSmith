import { useDesignStore } from '@/store/designStore';
import { BaseplateParamsSchema, BinParamsSchema } from '@/lib/params/schema';

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label flex justify-between">
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
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-text">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          value ? 'bg-accent' : 'bg-bg-elevated border border-border'
        }`}
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

export function ParameterPanel() {
  const { design, setModel, switchKind } = useDesignStore();
  const { model } = design;

  return (
    <aside className="w-80 shrink-0 panel border-r flex flex-col">
      <header className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold tracking-wide">Parameters</h2>
      </header>

      <div className="px-4 py-3 border-b border-border">
        <span className="label block mb-2">Model type</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`btn ${model.kind === 'bin' ? 'btn-primary' : ''}`}
            onClick={() => switchKind('bin')}
          >
            Bin
          </button>
          <button
            className={`btn ${model.kind === 'baseplate' ? 'btn-primary' : ''}`}
            onClick={() => switchKind('baseplate')}
          >
            Baseplate
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {model.kind === 'bin' ? (
          <>
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
              label="Height (units of 7 mm)"
              value={model.heightUnits}
              min={2}
              max={20}
              onChange={(v) => setModel(BinParamsSchema.parse({ ...model, heightUnits: v }))}
              suffix={`= ${model.heightUnits * 7} mm`}
            />
            <NumberField
              label="Wall thickness"
              value={model.wallThickness}
              min={0.8}
              max={3}
              step={0.1}
              onChange={(v) => setModel(BinParamsSchema.parse({ ...model, wallThickness: v }))}
              suffix="mm"
            />
            <Toggle
              label="Hollow"
              value={model.hollow}
              onChange={(v) => setModel(BinParamsSchema.parse({ ...model, hollow: v }))}
            />
            <Toggle
              label="Stacking lip"
              value={model.stackingLip}
              onChange={(v) => setModel(BinParamsSchema.parse({ ...model, stackingLip: v }))}
            />
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
          </>
        ) : (
          <>
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
            <div>
              <span className="label block mb-2">Style</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`btn ${model.style === 'minimal' ? 'btn-primary' : ''}`}
                  onClick={() =>
                    setModel(BaseplateParamsSchema.parse({ ...model, style: 'minimal' }))
                  }
                >
                  Minimal
                </button>
                <button
                  className={`btn ${model.style === 'rigid' ? 'btn-primary' : ''}`}
                  onClick={() =>
                    setModel(BaseplateParamsSchema.parse({ ...model, style: 'rigid' }))
                  }
                >
                  Rigid
                </button>
              </div>
            </div>
            <Toggle
              label="Magnet holes"
              value={model.magnetHoles}
              onChange={(v) => setModel(BaseplateParamsSchema.parse({ ...model, magnetHoles: v }))}
            />
            <Toggle
              label="Screw holes"
              value={model.screwHoles}
              onChange={(v) => setModel(BaseplateParamsSchema.parse({ ...model, screwHoles: v }))}
            />
          </>
        )}
      </div>
    </aside>
  );
}
