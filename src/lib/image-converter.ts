interface PotraceOptions {
  turnPolicy?: string;
  turdSize?: number;
  alphaMax?: number;
  optCurve?: boolean;
  optTolerance?: number;
}

interface Potrace {
  trace: (
    input: Buffer,
    options: PotraceOptions,
    callback: (err: Error | null, svg: string) => void
  ) => void;
}

let potraceModule: any = null;

async function loadPotrace(): Promise<Potrace> {
  if (!potraceModule) {
    potraceModule = await import('potrace');
  }
  return potraceModule.default || potraceModule;
}

const MAX_TRACEABLE_DIMENSION = 256;
const TRACE_TIMEOUT_MS = 5000;

const POTRACE_CONFIG = {
  turnPolicy: 'minority',
  turdSize: 2,
  alphaMax: 1.0,
  optCurve: true,
  optTolerance: 0.2,
};

function base64ToBuffer(base64String: string): Buffer {
  const matches = base64String.match(/^data:image\/png;base64,(.*)$/);
  const base64Data = matches ? matches[1] : base64String;
  return Buffer.from(base64Data, 'base64');
}

function createEmbeddedSvg(pngBase64: string, width: number, height: number): string {
  const dataUri = pngBase64.includes('data:image/png;base64,')
    ? pngBase64
    : `data:image/png;base64,${pngBase64}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><image href="${dataUri}" width="${width}" height="${height}"/></svg>`;
}

async function traceWithTimeout(buffer: Buffer): Promise<string> {
  const potrace = await loadPotrace();

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Potrace timeout exceeded'));
    }, TRACE_TIMEOUT_MS);

    potrace.trace(buffer, POTRACE_CONFIG, (err: Error | null, svg: string) => {
      clearTimeout(timeoutId);
      if (err) {
        reject(err);
      } else {
        resolve(svg);
      }
    });
  });
}

export async function convertPngToVectorizedSvg(
  pngBase64: string,
  width: number,
  height: number
): Promise<string> {
  try {
    if (width > MAX_TRACEABLE_DIMENSION || height > MAX_TRACEABLE_DIMENSION) {
      return createEmbeddedSvg(pngBase64, width, height);
    }

    const buffer = base64ToBuffer(pngBase64);
    const svg = await traceWithTimeout(buffer);
    return svg;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during vectorization';
    console.warn(`Failed to vectorize image: ${errorMessage}. Using embedded PNG fallback.`);
    return createEmbeddedSvg(pngBase64, width, height);
  }
}

export function compressPng(pngBase64: string): string {
  return pngBase64;
}

export function minifySvg(svgString: string): string {
  return svgString
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function optimizeWebp(pngBase64: string): string {
  return pngBase64;
}
