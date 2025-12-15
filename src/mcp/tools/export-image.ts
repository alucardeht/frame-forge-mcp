import type { MCPTool, MCPToolResult } from '../../types/index.js';
import type { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('export-image');

const exportCache = new Map<string, { data: string; mimeType: string; timestamp: number }>();

function buildCacheKey(sessionId: string, iterationIndex: number, resolution: string, format: string): string {
  return `${sessionId}:${iterationIndex}:${resolution}:${format}`;
}

function convertPngToSvg(pngBase64: string, width: number, height: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="data:image/png;base64,${pngBase64}" width="${width}" height="${height}"/>
</svg>`;
}

export function clearSessionCache(sessionId: string): void {
  const keysToDelete = Array.from(exportCache.keys()).filter((key) => key.startsWith(sessionId));
  keysToDelete.forEach((key) => exportCache.delete(key));
  if (keysToDelete.length > 0) {
    logger.info(`Cleared ${keysToDelete.length} cached exports for session ${sessionId}`);
  }
}

export const exportImageTool: MCPTool = {
  name: 'export-image',
  description: 'Export iteration image in different formats and resolutions',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID',
      },
      iterationIndex: {
        type: 'number',
        description: 'Iteration index to export',
      },
      format: {
        type: 'string',
        description: 'Export format (png or svg, default: png)',
      },
      resolution: {
        type: 'string',
        description: 'Resolution variant (1x, 2x, or 3x, default: 1x)',
      },
    },
    required: ['sessionId', 'iterationIndex'],
  },
};

export async function handleExportImage(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<MCPToolResult> {
  const sessionId = args.sessionId as string;
  const iterationIndex = args.iterationIndex as number;
  const format = (args.format as string) || 'png';
  const resolution = (args.resolution as string) || '1x';

  const startTime = Date.now();

  logger.info(`Exporting iteration ${iterationIndex} from session ${sessionId} as ${format} @${resolution}`);

  try {
    const cacheKey = buildCacheKey(sessionId, iterationIndex, resolution, format);
    const cached = exportCache.get(cacheKey);

    if (cached) {
      const elapsed = Date.now() - startTime;
      logger.info(`Using cached export (${elapsed}ms)`);

      return {
        content: [
          {
            type: 'text',
            text: `Export from cache (instant)`,
          },
          {
            type: 'image',
            data: cached.data,
            mimeType: cached.mimeType,
          },
        ],
      };
    }

    const session = await sessionManager.loadSession(sessionId);

    if (!session) {
      return {
        content: [
          {
            type: 'text',
            text: `Session not found: ${sessionId}`,
          },
        ],
      };
    }

    const history = sessionManager.getActiveHistory(sessionId);
    if (!history) {
      return {
        content: [
          {
            type: 'text',
            text: `No iteration history found for session ${sessionId}`,
          },
        ],
      };
    }

    const iteration = history.getIteration(iterationIndex);
    if (!iteration) {
      return {
        content: [
          {
            type: 'text',
            text: `Iteration ${iterationIndex} not found`,
          },
        ],
      };
    }

    const imageBase64 = await sessionManager.loadIterationImage(sessionId, iterationIndex);

    const originalWidth = iteration.result.metadata.width;
    const originalHeight = iteration.result.metadata.height;
    let exportedWidth = originalWidth;
    let exportedHeight = originalHeight;
    let exportedImage = imageBase64;
    let exportedFormat = 'png';
    let mimeType = 'image/png';

    if (resolution === '1x' && format === 'png') {
      exportedFormat = 'png';
      mimeType = 'image/png';
      logger.info('Using original image (no processing)');
    } else {
      if (resolution === '2x') {
        exportedWidth = originalWidth * 2;
        exportedHeight = originalHeight * 2;
        logger.info(`Scaling to @2x: ${exportedWidth}x${exportedHeight}`);
      } else if (resolution === '3x') {
        exportedWidth = originalWidth * 3;
        exportedHeight = originalHeight * 3;
        logger.info(`Scaling to @3x: ${exportedWidth}x${exportedHeight}`);
      }

      if (format === 'svg') {
        const isSimpleImage = originalWidth <= 128 && originalHeight <= 128;
        if (!isSimpleImage) {
          logger.warn(`Image ${originalWidth}x${originalHeight} is too complex for SVG, using PNG`);
          exportedFormat = 'png';
          mimeType = 'image/png';
        } else {
          exportedFormat = 'svg';
          mimeType = 'image/svg+xml';
          exportedImage = convertPngToSvg(exportedImage, exportedWidth, exportedHeight);
          logger.info('Converted to SVG (simple icon detected)');
        }
      }
    }

    exportCache.set(cacheKey, {
      data: exportedImage,
      mimeType,
      timestamp: Date.now(),
    });

    const elapsed = Date.now() - startTime;

    logger.info(`Export completed in ${elapsed}ms`);

    if (elapsed > 30000) {
      logger.warn(`Export took ${elapsed}ms (>30s threshold)`);
    }

    const exportSummary = `
**Export Complete**

Session: ${sessionId}
Iteration: ${iterationIndex}
Format: ${exportedFormat.toUpperCase()}
Resolution: @${resolution} (${exportedWidth}x${exportedHeight})
Export Time: ${elapsed}ms

Original Prompt: "${iteration.prompt}"
`;

    return {
      content: [
        {
          type: 'text',
          text: exportSummary,
        },
        {
          type: 'image',
          data: exportedImage,
          mimeType,
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to export image', error as Error);
    return {
      content: [
        {
          type: 'text',
          text: `Error exporting image: ${(error as Error).message}`,
        },
      ],
    };
  }
}
