import { useEffect } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
};

const SHORTCUTS: Array<{ key: string; description: string }> = [
  { key: 'T', description: 'Open template gallery' },
  { key: 'L', description: 'Open design library' },
  { key: 'Ctrl Z', description: 'Undo' },
  { key: 'Ctrl Shift Z', description: 'Redo' },
  { key: 'Esc', description: 'Close modal' },
  { key: '?', description: 'Show this help' },
];

export function ShortcutHelp({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 grid place-items-center"
      onClick={onClose}
    >
      <div
        className="panel rounded-lg w-80 max-w-[95vw] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text">
            <X size={14} />
          </button>
        </div>
        <div className="px-4 py-3 flex flex-col gap-2">
          {SHORTCUTS.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-xs text-text-muted">{description}</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-bg-elevated text-[11px] font-mono text-text shrink-0">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t border-border text-[10px] text-text-dim">
          Press <kbd className="px-1 py-0.5 rounded border border-border bg-bg-elevated font-mono">Esc</kbd> to dismiss.
        </div>
      </div>
    </div>
  );
}
