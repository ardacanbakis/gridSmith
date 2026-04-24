import { useDesignStore } from '@/store/designStore';
import { shareableUrl } from '@/lib/params/url';

type Props = {
  onExportStl: () => void;
  exporting: boolean;
};

export function Header({ onExportStl, exporting }: Props) {
  const { design, setUnits } = useDesignStore();

  const onShare = async () => {
    const url = shareableUrl(design);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy share link', url);
    }
  };

  return (
    <header className="flex items-center justify-between px-4 h-12 border-b border-border bg-bg-panel shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-accent grid place-items-center">
          <span className="text-bg font-bold text-xs">G</span>
        </div>
        <h1 className="text-sm font-semibold tracking-wide">Gridsmith</h1>
        <span className="text-xs text-text-dim ml-2">Custom bins, built your way.</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded border border-border overflow-hidden text-xs">
          <button
            className={`px-2 py-1 ${design.units === 'metric' ? 'bg-accent text-bg' : 'text-text-muted'}`}
            onClick={() => setUnits('metric')}
          >
            mm
          </button>
          <button
            className={`px-2 py-1 ${design.units === 'imperial' ? 'bg-accent text-bg' : 'text-text-muted'}`}
            onClick={() => setUnits('imperial')}
          >
            in
          </button>
        </div>
        <button className="btn" onClick={onShare}>
          Share
        </button>
        <button className="btn-primary" onClick={onExportStl} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export STL'}
        </button>
      </div>
    </header>
  );
}
