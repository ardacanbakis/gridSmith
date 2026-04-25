import { useEffect, useRef, useState } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useThemeStore } from '@/store/themeStore';
import { shareableUrl } from '@/lib/params/url';
import type { ExportFormat } from '@/lib/geometry/types';

type Props = {
  onExport: (format: ExportFormat) => void;
  exporting: boolean;
};

const FORMATS: Array<{ id: ExportFormat; label: string; hint: string }> = [
  { id: 'stl', label: 'STL', hint: 'Universal slicer-ready mesh.' },
  { id: '3mf', label: '3MF', hint: 'Lossless, multi-material capable.' },
];

export function Header({ onExport, exporting }: Props) {
  const { design, setUnits } = useDesignStore();
  const { theme, toggle } = useThemeStore();
  const [format, setFormat] = useState<ExportFormat>('stl');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  const onShare = async () => {
    const url = shareableUrl(design);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy share link', url);
    }
  };

  const activeFormat = FORMATS.find((f) => f.id === format)!;

  return (
    <header className="flex items-center justify-between px-4 h-12 border-b border-border bg-bg-panel shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-accent grid place-items-center">
          <span className="text-accent-fg font-bold text-xs">G</span>
        </div>
        <h1 className="text-sm font-semibold tracking-wide">Gridsmith</h1>
        <span className="text-xs text-text-dim ml-2 hidden sm:inline">
          Custom bins, built your way.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded border border-border overflow-hidden text-xs">
          <button
            className={`px-2 py-1 ${design.units === 'metric' ? 'bg-accent text-accent-fg' : 'text-text-muted'}`}
            onClick={() => setUnits('metric')}
          >
            mm
          </button>
          <button
            className={`px-2 py-1 ${design.units === 'imperial' ? 'bg-accent text-accent-fg' : 'text-text-muted'}`}
            onClick={() => setUnits('imperial')}
          >
            in
          </button>
        </div>

        <button
          className="btn"
          onClick={toggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Theme: ${theme}`}
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        <button className="btn" onClick={onShare}>
          Share
        </button>

        <div ref={menuRef} className="relative flex">
          <button
            className="btn-primary rounded-r-none"
            onClick={() => onExport(format)}
            disabled={exporting}
          >
            {exporting ? 'Exporting…' : `Export ${activeFormat.label}`}
          </button>
          <button
            className="btn-primary rounded-l-none border-l border-accent-fg/30 px-2"
            onClick={() => setMenuOpen((o) => !o)}
            disabled={exporting}
            aria-label="Pick export format"
          >
            ▾
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 panel rounded shadow-lg w-56 z-10">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  className="w-full text-left px-3 py-2 hover:bg-bg-elevated flex flex-col gap-0.5"
                  onClick={() => {
                    setFormat(f.id);
                    setMenuOpen(false);
                  }}
                >
                  <span className="text-sm font-medium">
                    {f.label}
                    {format === f.id && <span className="ml-2 text-xs text-accent">✓</span>}
                  </span>
                  <span className="text-xs text-text-dim">{f.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
