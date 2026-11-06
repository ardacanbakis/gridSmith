import { useState } from 'react';
import { useThemeStore } from '@/store/themeStore';

// ── persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'gridsmith-welcomed';

export function useWelcomeScreen() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const dismiss = () => { localStorage.setItem(STORAGE_KEY, '1'); setDismissed(true); };
  const show    = () => setDismissed(false);
  return { showWelcome: !dismissed, dismiss, show };
}

// ── social icons (inline SVGs, same set as stlSmith) ─────────────────────────

function GithubIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}
function YoutubeIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}
function SpotifyIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
function LinkedinIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

// ── data ─────────────────────────────────────────────────────────────────────

const SOCIAL_LINKS = [
  { href: 'https://ardacanbakis.com',                      icon: <GlobeIcon />,     label: 'Website'   },
  { href: 'https://github.com/ardacanbakis',               icon: <GithubIcon />,    label: 'GitHub'    },
  { href: 'https://www.instagram.com/arda.canbakiss/',     icon: <InstagramIcon />, label: 'Instagram' },
  { href: 'https://www.youtube.com/@arda.canbakis',        icon: <YoutubeIcon />,   label: 'YouTube'   },
  { href: 'https://open.spotify.com/user/11146430303',     icon: <SpotifyIcon />,   label: 'Spotify'   },
  { href: 'http://linkedin.com/in/ardacanbakis',           icon: <LinkedinIcon />,  label: 'LinkedIn'  },
];

const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Pick a Model Type',
    desc: 'Choose from Bin, Baseplate, Drill-bit Organizer, Screw Organizer, or Parts Tray. Each has its own parameter set.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Customize Parameters',
    desc: 'Dial in grid size, height, compartments, labels, scoop ramps, mounting holes, and more using sliders or direct input.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Preview Live in 3D',
    desc: 'Every change rebuilds the mesh instantly in your browser using Manifold CSG. Orbit, zoom, and check dimensions before you print.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Export & Print',
    desc: 'Download STL for slicers, 3MF for multi-material workflows, or STEP for Fusion 360, FreeCAD, and SolidWorks. All client-side.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: '5 Model Types',
    desc: 'Bin, Baseplate, Drill-bit Organizer, Screw Organizer, and Parts Tray — all Gridfinity-spec compatible.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'STL · 3MF · STEP',
    desc: 'Three export formats in one click. STEP is CAD-ready for Fusion 360, FreeCAD, and SolidWorks.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Gridfinity Standard',
    desc: 'Exact 42 mm cell, 7 mm height unit spec by default. Adjust grid and height units for custom systems.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    title: 'Works Offline',
    desc: 'Installable as a PWA. All geometry runs in a Web Worker — no server, no sign-up, no data ever leaves your device.',
  },
];

// ── keyframe animations ───────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes gs-grid-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes gs-cell-pulse {
  0%, 100% { opacity: 0.12; transform: scale(0.88); }
  50%       { opacity: 1;    transform: scale(1);    }
}
@keyframes gs-logo-in {
  0%   { opacity: 0; transform: scale(2.4); filter: blur(10px); }
  60%  { opacity: 1; filter: blur(0px); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes gs-glow {
  0%, 100% { text-shadow: 0 0 6px var(--gs-neon), 0 0 16px var(--gs-neon-soft); }
  50%       { text-shadow: 0 0 16px var(--gs-neon), 0 0 32px var(--gs-neon-soft); }
}
@keyframes gs-fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes gs-bounce-tl {
  0%   { opacity:0; transform: translate(-120%,-120%) scale(0.4); }
  65%  { opacity:1; transform: translate(4%,4%)       scale(1.05); }
  82%  {            transform: translate(-2%,-2%)     scale(0.97); }
  100% { opacity:1; transform: translate(0,0)         scale(1); }
}
@keyframes gs-bounce-tr {
  0%   { opacity:0; transform: translate(120%,-120%) scale(0.4); }
  65%  { opacity:1; transform: translate(-4%,4%)     scale(1.05); }
  82%  {            transform: translate(2%,-2%)     scale(0.97); }
  100% { opacity:1; transform: translate(0,0)        scale(1); }
}
@keyframes gs-bounce-bl {
  0%   { opacity:0; transform: translate(-120%,120%) scale(0.4); }
  65%  { opacity:1; transform: translate(4%,-4%)     scale(1.05); }
  82%  {            transform: translate(-2%,2%)     scale(0.97); }
  100% { opacity:1; transform: translate(0,0)        scale(1); }
}
@keyframes gs-bounce-br {
  0%   { opacity:0; transform: translate(120%,120%) scale(0.4); }
  65%  { opacity:1; transform: translate(-4%,-4%)   scale(1.05); }
  82%  {            transform: translate(2%,2%)     scale(0.97); }
  100% { opacity:1; transform: translate(0,0)       scale(1); }
}
`;

// ── Animated background grid — spells "THEO" across a 16 × 14 grid ──────────
// Layout mirrors stlSmith exactly.

const ACTIVE_CELLS: Array<[number, number]> = [
  // T — top-left
  [1,1],[2,1],[3,1],[4,1],[5,1],
  [3,2],[3,3],[3,4],[3,5],
  // H — top-right
  [10,1],[14,1],[10,2],[14,2],
  [10,3],[11,3],[12,3],[13,3],[14,3],
  [10,4],[14,4],[10,5],[14,5],
  // E — bottom-left
  [1,8],[2,8],[3,8],[4,8],[5,8],
  [1,9],
  [1,10],[2,10],[3,10],[4,10],
  [1,11],
  [1,12],[2,12],[3,12],[4,12],[5,12],
  // O — bottom-right
  [11,8],[12,8],[13,8],
  [10,9],[14,9],
  [10,10],[14,10],
  [10,11],[14,11],
  [11,12],[12,12],[13,12],
];

function NeonGrid({ dark }: { dark: boolean }) {
  const accent     = dark ? '#22c55e' : '#16a34a';
  const accentSoft = dark ? 'rgba(34,197,94,0.55)' : 'rgba(22,163,74,0.45)';
  const lineColor  = dark ? 'rgba(148,163,184,0.07)' : 'rgba(71,85,105,0.09)';
  const cols = 16;
  const rows = 14;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* subtle grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`,
          backgroundSize: '6vmin 6vmin',
          animation: 'gs-grid-fade 1.5s ease-out both',
        }}
      />
      {/* pulsing cells */}
      <div
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
      >
        {ACTIVE_CELLS.map(([c, r], i) => {
          const delay = (i % 6) * 0.17 + (r % 3) * 0.11;
          const dur   = 2.0 + ((i * 11) % 9) / 10;
          return (
            <div
              key={`${c}-${r}`}
              style={{
                gridColumn: c + 1,
                gridRow:    r + 1,
                margin: '14%',
                background: accent,
                borderRadius: '3px',
                boxShadow: `0 0 10px ${accent}, 0 0 22px ${accentSoft}`,
                opacity: 0,
                animation: `gs-cell-pulse ${dur}s ease-in-out ${0.5 + delay}s infinite`,
              }}
            />
          );
        })}
      </div>
      {/* radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: dark
            ? 'radial-gradient(circle at 50% 55%, transparent 0%, rgba(10,15,25,0.55) 65%, rgba(10,15,25,0.88) 100%)'
            : 'radial-gradient(circle at 50% 55%, transparent 0%, rgba(248,250,252,0.6) 65%, rgba(248,250,252,0.92) 100%)',
        }}
      />
    </div>
  );
}

// ── footer ────────────────────────────────────────────────────────────────────

function Footer({ dark }: { dark: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-3 mb-3">
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={link.label}
            className={`p-2 rounded-full transition-colors ${
              dark
                ? 'text-gray-500 hover:text-white hover:bg-gray-800'
                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            {link.icon}
          </a>
        ))}
      </div>
      <p className={`text-center text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
        Created with{' '}
        <svg className="inline w-3 h-3 -mt-0.5" viewBox="0 0 24 24" fill="#ef4444">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>{' '}
        by{' '}
        <a
          href="https://ardacanbakis.com"
          target="_blank"
          rel="noopener noreferrer"
          className={`transition-colors ${dark ? 'text-gray-500 hover:text-amber-400' : 'text-gray-500 hover:text-green-600'}`}
        >
          Arda Canbakis
        </a>
        {' '}&copy; 2026
      </p>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

type Props = { onDismiss: () => void };

export function WelcomeScreen({ onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const { theme, toggle } = useThemeStore();
  const dark = theme === 'dark';

  const accent     = dark ? '#f59e0b' : '#16a34a';
  const accentSoft = dark ? 'rgba(245,158,11,0.55)' : 'rgba(22,163,74,0.45)';
  const gradBg     = dark
    ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
    : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
  const gradShadow = `0 0 28px ${accentSoft}`;

  const bg        = dark ? 'bg-[#0a0f19]' : 'bg-slate-50';
  const textColor = dark ? 'text-white'   : 'text-gray-900';
  const textMuted = dark ? 'text-gray-300' : 'text-gray-600';
  const textFaint = dark ? 'text-gray-400' : 'text-gray-500';
  const iconColor = dark ? 'text-amber-400' : 'text-green-600';
  const skipColor = dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700';
  const cardBg    = dark
    ? 'bg-gray-900/70 border-gray-700/60 backdrop-blur-sm'
    : 'bg-white/80 border-gray-200 shadow-sm backdrop-blur-sm';
  const themeBtnCls = dark
    ? 'text-gray-400 hover:text-yellow-300 hover:bg-white/10'
    : 'text-gray-500 hover:text-green-700 hover:bg-black/5';

  const cssVars = { '--gs-neon': accent, '--gs-neon-soft': accentSoft } as React.CSSProperties;

  const PrimaryBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className="font-semibold py-3 px-8 rounded-lg text-base text-white transition-all hover:opacity-90 active:scale-95"
      style={{ background: gradBg, boxShadow: gradShadow }}
    >
      {children}
    </button>
  );

  const SkipBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className={`text-sm transition-colors ${skipColor}`}>
      Skip intro
    </button>
  );

  return (
    <div
      className={`fixed inset-0 z-50 ${bg} flex flex-col items-center justify-center p-4 transition-colors duration-500 overflow-hidden`}
      style={cssVars}
    >
      <style>{KEYFRAMES}</style>
      <NeonGrid dark={dark} />

      {/* theme toggle */}
      <button
        onClick={toggle}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-colors ${themeBtnCls}`}
      >
        {dark ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <circle cx="12" cy="12" r="5" />
            <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </button>

      <div className="relative z-10 max-w-lg w-full flex-1 flex items-center justify-center">

        {/* ── step 0: hero ── */}
        {step === 0 && (
          <div className="text-center space-y-5">
            <div style={{ animation: 'gs-fade-up 0.6s ease-out 1.2s both' }}>
              <h1 className={`text-4xl font-bold tracking-tight ${textColor}`}>Gridsmith</h1>
            </div>

            <p
              className="text-lg font-medium tracking-wide"
              style={{
                color: accent,
                animation: 'gs-fade-up 0.6s ease-out 1.5s both, gs-glow 3.2s ease-in-out 2.2s infinite',
              }}
            >
              Custom Gridfinity bins, built your way.
            </p>

            <p
              className={`text-sm max-w-sm mx-auto leading-relaxed ${textMuted}`}
              style={{ animation: 'gs-fade-up 0.6s ease-out 1.8s both' }}
            >
              Design parametric bins, baseplates, organizers, and parts trays.
              Export STL, 3MF, or STEP — entirely in your browser, no sign-up needed.
            </p>

            <div className="flex flex-col items-center gap-3 pt-2" style={{ animation: 'gs-fade-up 0.6s ease-out 2.1s both' }}>
              <PrimaryBtn onClick={() => setStep(1)}>How It Works</PrimaryBtn>
              <SkipBtn onClick={onDismiss} />
            </div>
          </div>
        )}

        {/* ── step 1: process ── */}
        {step === 1 && (
          <div className="text-center space-y-4 w-full">
            <div style={{ animation: 'gs-fade-up 0.5s ease-out both' }}>
              <h2 className={`text-xl font-semibold ${textColor}`}>The Process</h2>
              <p className={`text-sm ${textFaint} mt-1`}>From idea to print-ready file in four steps</p>
            </div>

            <div className="space-y-2.5 mt-2">
              {PROCESS_STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`${cardBg} border rounded-xl p-4 flex items-start gap-4 text-left`}
                  style={{ opacity: 0, animation: `gs-fade-up 0.5s ease-out ${0.15 + i * 0.18}s both` }}
                >
                  <div
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white"
                    style={{ background: gradBg, boxShadow: `0 0 10px ${accentSoft}` }}
                  >
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold tracking-widest" style={{ color: accent }}>{s.number}</span>
                      <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{s.title}</h3>
                    </div>
                    <p className={`text-xs ${textFaint} mt-0.5 leading-relaxed`}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="flex items-center justify-center gap-5 pt-1"
              style={{ opacity: 0, animation: 'gs-fade-up 0.5s ease-out 1.0s both' }}
            >
              <PrimaryBtn onClick={() => setStep(2)}>See All Features</PrimaryBtn>
              <SkipBtn onClick={onDismiss} />
            </div>
          </div>
        )}

        {/* ── step 2: features ── */}
        {step === 2 && (
          <div className="text-center space-y-5 w-full">
            <div style={{ animation: 'gs-fade-up 0.5s ease-out both' }}>
              <h2 className={`text-xl font-semibold ${textColor}`}>Everything Included</h2>
              <p className={`text-sm ${textFaint} mt-1`}>Open source · runs offline · no account needed</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              {FEATURES.map((f, i) => {
                const anims = ['gs-bounce-tl','gs-bounce-tr','gs-bounce-bl','gs-bounce-br'];
                return (
                  <div
                    key={i}
                    className={`${cardBg} border rounded-xl p-4 flex gap-3 text-left`}
                    style={{ opacity: 0, animation: `${anims[i]} 0.65s cubic-bezier(0.22,1,0.36,1) ${0.2 + i * 0.3}s both` }}
                  >
                    <div className={`${iconColor} shrink-0 mt-0.5`}>{f.icon}</div>
                    <div>
                      <h3 className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{f.title}</h3>
                      <p className={`text-xs ${textFaint} mt-1 leading-relaxed`}>{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="flex justify-center pt-1"
              style={{ opacity: 0, animation: 'gs-fade-up 0.6s ease-out 1.6s both' }}
            >
              <PrimaryBtn onClick={onDismiss}>Get Started</PrimaryBtn>
            </div>
          </div>
        )}
      </div>

      {/* pinned footer */}
      <div className="relative z-10 shrink-0 pb-4">
        <Footer dark={dark} />
      </div>
    </div>
  );
}
