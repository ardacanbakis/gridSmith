import { useEffect, useMemo, useState } from 'react';
import { Archive, Box, Layers, LayoutGrid, PanelTop, Search, X, Zap } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { BIT_SETS } from '@/lib/gridfinity/bitSets';
import {
  CATEGORIES,
  CATEGORY_META,
  GALLERY_TEMPLATES,
  isImperialOnly,
  templateSpec,
  type TemplateCategory,
  type GalleryTemplate,
} from '@/lib/templates/gallery';
import type { ModelParams } from '@/lib/params/schema';

type Props = {
  open: boolean;
  onClose: () => void;
};

// ── Schematic SVG icons ────────────────────────────────────────────────────

function ModelSchematic({ model }: { model: ModelParams }) {
  if (model.kind === 'bin') {
    const comps = model.divX * model.divY;
    return (
      <svg viewBox="0 0 44 36" fill="none" className="h-10 w-auto text-text-muted">
        <rect x="3" y="6" width="38" height="27" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 13h38" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
        {model.divX > 1 && Array.from({ length: model.divX - 1 }, (_, i) => {
          const x = 3 + ((i + 1) * 38) / model.divX;
          return <line key={`x${i}`} x1={x} y1={13} x2={x} y2={33} stroke="currentColor" strokeWidth="1" />;
        })}
        {model.divY > 1 && Array.from({ length: model.divY - 1 }, (_, i) => {
          const y = 13 + ((i + 1) * 20) / model.divY;
          return <line key={`y${i}`} x1={3} y1={y} x2={41} y2={y} stroke="currentColor" strokeWidth="1" />;
        })}
        {comps <= 1 && model.scoopRamp && (
          <path d="M3 33 Q20 18 41 33" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        )}
      </svg>
    );
  }

  if (model.kind === 'drillBitHolder') {
    const count = model.bitSet === 'custom' ? 5 : Math.min(BIT_SETS[model.bitSet].diameters.length, 9);
    const spacing = 38 / count;
    return (
      <svg viewBox="0 0 44 30" fill="none" className="h-10 w-auto text-text-muted">
        <rect x="3" y="5" width="38" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        {Array.from({ length: count }, (_, i) => {
          const cx = 3 + spacing * (i + 0.5);
          const r = Math.max(1.5, Math.min(4, spacing * 0.38));
          return <circle key={i} cx={cx} cy={15} r={r} stroke="currentColor" strokeWidth="1.3" />;
        })}
      </svg>
    );
  }

  if (model.kind === 'partsTray') {
    const cols = Math.min(model.pocketCols, 6);
    const rows = Math.min(model.pocketRows, 4);
    const sx = 38 / cols;
    const sy = 28 / rows;
    return (
      <svg viewBox="0 0 44 34" fill="none" className="h-10 w-auto text-text-muted">
        <rect x="3" y="3" width="38" height="28" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const cx = 3 + sx * (c + 0.5);
            const cy = 3 + sy * (r + 0.5);
            const sz = Math.min(sx, sy) * 0.38;
            return model.pocketShape === 'circle' ? (
              <circle key={`${r}-${c}`} cx={cx} cy={cy} r={sz} stroke="currentColor" strokeWidth="1.2" />
            ) : (
              <rect key={`${r}-${c}`} x={cx - sz} y={cy - sz} width={sz * 2} height={sz * 2} stroke="currentColor" strokeWidth="1.2" />
            );
          })
        )}
      </svg>
    );
  }

  if (model.kind === 'lid') {
    return (
      <svg viewBox="0 0 44 30" fill="none" className="h-10 w-auto text-text-muted">
        {/* Outer plate */}
        <rect x="3" y="3" width="38" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
        {/* Grip ring (hollow, below plate) */}
        <rect x="9" y="11" width="26" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="13" y="13" width="18" height="9" rx="1" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5" />
      </svg>
    );
  }

  if (model.kind === 'screwOrganizer') {
    const cols = Math.min(model.cols, 7);
    return (
      <svg viewBox="0 0 44 30" fill="none" className="h-10 w-auto text-text-muted">
        <rect x="3" y="5" width="38" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        {Array.from({ length: cols - 1 }, (_, i) => {
          const x = 3 + ((i + 1) * 38) / cols;
          return <line key={i} x1={x} y1={5} x2={x} y2={25} stroke="currentColor" strokeWidth="1.1" />;
        })}
        {model.tiltDegrees > 0 && (
          <path d="M3 25 L41 20" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        )}
      </svg>
    );
  }

  // baseplate
  const cols = Math.min(model.cellsX, 5);
  const rows = Math.min(model.cellsY, 4);
  const sx = 38 / cols;
  const sy = 28 / rows;
  return (
    <svg viewBox="0 0 44 34" fill="none" className="h-10 w-auto text-text-muted">
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <rect
            key={`${r}-${c}`}
            x={3 + c * sx + 1.5}
            y={3 + r * sy + 1.5}
            width={sx - 3}
            height={sy - 3}
            rx="2"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        ))
      )}
    </svg>
  );
}

// ── Category sidebar ───────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<TemplateCategory, React.ReactNode> = {
  all:           <LayoutGrid size={13} />,
  'quick-start': <Zap size={13} />,
  bins:          <Box size={13} />,
  lids:          <PanelTop size={13} />,
  organizers:    <Archive size={13} />,
  trays:         <Layers size={13} />,
  baseplates:    <LayoutGrid size={13} />,
};

function CategorySidebar({
  active,
  counts,
  onChange,
}: {
  active: TemplateCategory;
  counts: Record<TemplateCategory, number>;
  onChange: (c: TemplateCategory) => void;
}) {
  return (
    <nav className="w-36 shrink-0 border-r border-border overflow-y-auto py-1">
      {CATEGORIES.map((cat) => {
        const { label, emoji } = CATEGORY_META[cat];
        const isActive = cat === active;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={[
              'w-full text-left px-3 py-2 flex items-center gap-2 text-xs font-medium transition-colors',
              isActive
                ? 'bg-accent/10 text-accent border-r-2 border-accent'
                : 'text-text-muted hover:text-text hover:bg-bg-elevated',
            ].join(' ')}
          >
            <span className="shrink-0">{CATEGORY_ICONS[cat]}</span>
            <span className="flex-1 truncate">
              {emoji ? `${emoji} ${label}` : label}
            </span>
            <span className="text-[10px] text-text-dim tabular shrink-0">
              {counts[cat]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Template card ──────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onUse,
}: {
  template: GalleryTemplate;
  onUse: (model: ModelParams) => void;
}) {
  const spec = templateSpec(template.model);
  return (
    <button
      type="button"
      onClick={() => onUse(template.model)}
      className="text-left w-full flex flex-col rounded-lg border border-border hover:border-accent/60 hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
    >
      <div className="w-full h-20 bg-bg-elevated flex items-center justify-center group-hover:bg-accent/5 transition-colors">
        <ModelSchematic model={template.model} />
      </div>
      <div className="px-3 py-2.5 flex flex-col gap-0.5 flex-1">
        <p className="text-sm font-semibold text-text group-hover:text-accent transition-colors leading-tight">
          {template.name}
        </p>
        <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
          {template.description}
        </p>
        <p className="text-[10px] text-accent/70 font-mono tabular mt-1">
          {spec}
        </p>
      </div>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function TemplateGallery({ open, onClose }: Props) {
  const setModel = useDesignStore((s) => s.setModel);
  const units = useDesignStore((s) => s.design.units);

  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('quick-start');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Reset search when category changes
  useEffect(() => { setSearch(''); }, [activeCategory]);

  const allVisible = useMemo(
    () => GALLERY_TEMPLATES.filter((t) => units === 'imperial' || !isImperialOnly(t.model)),
    [units],
  );

  const counts = useMemo(() => {
    const result = {} as Record<TemplateCategory, number>;
    result.all = allVisible.length;
    for (const cat of CATEGORIES.slice(1)) {
      result[cat] = allVisible.filter((t) => t.category === cat).length;
    }
    return result;
  }, [allVisible]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = activeCategory === 'all'
      ? allVisible
      : allVisible.filter((t) => t.category === activeCategory);
    if (q) {
      base = base.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)),
      );
    }
    return base;
  }, [allVisible, activeCategory, search]);

  const onUse = (model: ModelParams) => {
    setModel(model);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="panel rounded-xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">Choose a starter template</h2>
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
            <input
              type="text"
              className="input pl-7 pr-3 py-1 text-xs w-full max-w-64"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 rounded transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          <CategorySidebar
            active={activeCategory}
            counts={counts}
            onChange={(cat) => { setActiveCategory(cat); setSearch(''); }}
          />

          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-xs text-text-dim">
                No templates match your search.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map((t) => (
                  <TemplateCard key={t.id} template={t} onUse={onUse} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border text-[11px] text-text-dim shrink-0">
          Click any card to apply. All parameters can be adjusted afterward.
        </div>
      </div>
    </div>
  );
}
