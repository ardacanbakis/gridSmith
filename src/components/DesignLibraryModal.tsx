import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, Box, Download, FileInput, Layers, LayoutGrid, PanelTop, Save, Trash2, Upload, Wrench, X } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { useDesignLibraryStore, type SavedDesign } from '@/store/designLibraryStore';
import { DesignSchema } from '@/lib/params/schema';
import type { ModelParams } from '@/lib/params/schema';

type Props = {
  open: boolean;
  onClose: () => void;
};

const KIND_ORDER: Array<ModelParams['kind']> = [
  'bin', 'lid', 'drillBitHolder', 'screwOrganizer', 'partsTray', 'baseplate',
];

const KIND_LABEL: Record<ModelParams['kind'], string> = {
  bin:            'Bins',
  lid:            'Lids',
  baseplate:      'Baseplates',
  drillBitHolder: 'Organizers',
  screwOrganizer: 'Screw organizers',
  partsTray:      'Parts trays',
};

const KIND_ICON: Record<ModelParams['kind'], React.ReactNode> = {
  bin:            <Box size={12} />,
  lid:            <PanelTop size={12} />,
  baseplate:      <LayoutGrid size={12} />,
  drillBitHolder: <Archive size={12} />,
  screwOrganizer: <Wrench size={12} />,
  partsTray:      <Layers size={12} />,
};

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function describe(saved: SavedDesign): string {
  const m = saved.design.model;
  if (m.kind === 'baseplate') return `${m.cellsX}×${m.cellsY} · ${m.style}`;
  if (m.kind === 'bin') {
    const comps = m.divX * m.divY;
    return `${m.cellsX}×${m.cellsY}×${m.heightUnits}u${comps > 1 ? ` · ${comps} comp.` : ''}`;
  }
  if (m.kind === 'lid') return `${m.cellsX}×${m.cellsY} · ${m.lidClearance}mm clearance`;
  if (m.kind === 'drillBitHolder')
    return `${m.cellsX}×${m.cellsY}×${m.heightUnits}u · ${m.bitSet}`;
  if (m.kind === 'screwOrganizer') return `${m.cellsX}×${m.cellsY} · ${m.cols}×${m.rows}`;
  return `${m.cellsX}×${m.cellsY}×${m.heightUnits}u · ${m.pocketCols}×${m.pocketRows} pockets`;
}

export function DesignLibraryModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const design = useDesignStore((s) => s.design);
  const setDesign = useDesignStore((s) => s.setDesign);
  const { items, save, rename, remove } = useDesignLibraryStore();
  const [name, setName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onSave = () => {
    save(name || `Design ${items.length + 1}`, design);
    setName('');
  };

  const onLoad = (saved: SavedDesign) => {
    setDesign(saved.design);
    onClose();
  };

  const onRename = (saved: SavedDesign) => {
    const next = window.prompt(t('library.renamePrompt'), saved.name);
    if (next != null) rename(saved.id, next);
  };

  const onDelete = (saved: SavedDesign) => {
    if (window.confirm(t('library.deleteConfirm', { name: saved.name }))) remove(saved.id);
  };

  const onExport = () => {
    const json = JSON.stringify(items, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gridsmith-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(String(ev.target?.result));
        if (!Array.isArray(raw)) return;
        let imported = 0;
        for (const entry of raw) {
          const designResult = DesignSchema.safeParse(entry?.design);
          if (!designResult.success) continue;
          save(
            typeof entry.name === 'string' && entry.name ? entry.name : 'Imported',
            designResult.data,
          );
          imported++;
        }
        if (imported === 0) alert('No valid designs found in the file.');
      } catch {
        alert('Could not read the file. Make sure it is a valid Gridsmith library export.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 grid place-items-center"
      onClick={onClose}
    >
      <div
        className="panel rounded-lg w-[28rem] max-w-[95vw] max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">{t('library.title')}</h2>
          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button
                onClick={onExport}
                title="Export library as JSON"
                className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
              >
                <Download size={14} />
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import designs from JSON file"
              className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
            >
              <FileInput size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={onImport}
            />
            <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-border flex gap-2">
          <input
            className="input flex-1"
            type="text"
            placeholder={t('library.namePlaceholder')}
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
            }}
          />
          <button className="btn-primary flex items-center gap-1.5" onClick={onSave}>
            <Save size={14} />
            {t('library.save')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-text-dim">
              {t('library.empty')}
            </p>
          ) : (
            <div>
              {KIND_ORDER.map((kind) => {
                const group = items.filter((it) => it.design.model.kind === kind);
                if (group.length === 0) return null;
                return (
                  <div key={kind}>
                    <div className="px-4 py-1.5 flex items-center gap-1.5 bg-bg-elevated border-b border-t border-border sticky top-0 z-10">
                      <span className="text-text-dim">{KIND_ICON[kind]}</span>
                      <span className="text-[10px] font-semibold text-text-dim uppercase tracking-wide">
                        {KIND_LABEL[kind]}
                      </span>
                      <span className="ml-auto text-[10px] text-text-dim tabular">{group.length}</span>
                    </div>
                    <ul className="divide-y divide-border">
                      {group.map((it) => (
                        <li key={it.id} className="px-4 py-2.5 hover:bg-bg-elevated group">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onRename(it)}
                              className="text-sm text-text font-medium truncate text-left"
                              title={t('library.renameTitle')}
                            >
                              {it.name}
                            </button>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                title={t('library.loadTitle')}
                                onClick={() => onLoad(it)}
                                className="p-1 text-text-muted hover:text-accent"
                              >
                                <Upload size={14} />
                              </button>
                              <button
                                title={t('library.deleteTitle')}
                                onClick={() => onDelete(it)}
                                className="p-1 text-text-muted hover:text-red-400"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-text-dim tabular">
                            <span>{describe(it)}</span>
                            <span>{formatTimestamp(it.updatedAt)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
