import * as opentype from 'opentype.js';
import interBoldUrl from '@fontsource/inter/files/inter-latin-700-normal.woff?url';

let fontPromise: Promise<opentype.Font> | null = null;

export function getLabelFont(): Promise<opentype.Font> {
  if (!fontPromise) {
    fontPromise = (async () => {
      const buf = await fetch(interBoldUrl).then((r) => r.arrayBuffer());
      return opentype.parse(buf);
    })();
  }
  return fontPromise;
}
