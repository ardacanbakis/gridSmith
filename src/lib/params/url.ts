import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { DesignSchema, type Design } from './schema';

const PARAM_KEY = 'd';

export function encodeDesign(design: Design): string {
  return compressToEncodedURIComponent(JSON.stringify(design));
}

export function decodeDesign(encoded: string): Design | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json);
    return DesignSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function readDesignFromUrl(): Design | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get(PARAM_KEY);
  if (!encoded) return null;
  return decodeDesign(encoded);
}

const URL_WRITE_DELAY_MS = 250;
let pendingWrite: ReturnType<typeof setTimeout> | null = null;

/**
 * Mirror the design into the address bar. Debounced: browsers rate-limit
 * history.replaceState (Safari throws past 100 calls / 30 s) and a single
 * slider drag fires far more updates than that.
 */
export function writeDesignToUrl(design: Design): void {
  if (typeof window === 'undefined') return;
  if (pendingWrite) clearTimeout(pendingWrite);
  pendingWrite = setTimeout(() => {
    pendingWrite = null;
    const params = new URLSearchParams(window.location.search);
    params.set(PARAM_KEY, encodeDesign(design));
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, URL_WRITE_DELAY_MS);
}

export function shareableUrl(design: Design): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}?${PARAM_KEY}=${encodeDesign(design)}`;
}
