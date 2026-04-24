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

export function writeDesignToUrl(design: Design): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.set(PARAM_KEY, encodeDesign(design));
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', url);
}

export function shareableUrl(design: Design): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}?${PARAM_KEY}=${encodeDesign(design)}`;
}
