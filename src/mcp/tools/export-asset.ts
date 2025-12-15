import type { MCPTool, MCPToolResult, AssetMetadata } from '../../types/index.js';
import { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';
import { validateAssetDimensions } from '../../lib/validators.js';
import {
  convertPngToVectorizedSvg,
  minifySvg,
  compressPng,
  optimizeWebp,
} from '../../lib/image-converter.js';

const logger = new Logger('ExportAssetTool');

export const exportAssetTool: MCPTool = {
  name: 'export-asset',
  description: 'Export asset variant in multiple formats (PNG, SVG, WebP) with optimization',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID containing the asset',
      },
      variantId: {
        type: 'string',
        description: 'Variant ID to export',
      },
      formats: {
        type: 'array',
        description: 'Array of formats to export (png, svg, webp). Default: [png]',
      },
      resolution: {
        type: 'string',
        description: 'Resolution variant: 1x, 2x, or 3x. Default: 1x',
      },
    },
    required: ['sessionId', 'variantId'],
  },
};

function calculateFileSizeApproximation(base64String: string): number {
  return Math.ceil(base64String.length * 0.75);
}

function getScaledDimensions(
  width: number,
  height: number,
  resolution: string
): { width: number; height: number } {
  if (resolution === '2x') {
    return { width: width * 2, height: height * 2 };
  }
  if (resolution === '3x') {
    return { width: width * 3, height: height * 3 };
  }
  return { width, height };
}

function buildExportMetadata(
  assetType: string,
  dimensions: { width: number; height: number },
  formats: string[],
  variantId: string,
  variant: any,
  fileSizes: Record<string, number>
): AssetMetadata {
  return {
    type: assetType as 'icon' | 'banner' | 'mockup',
    dimensions,
    formats: formats as Array<'png' | 'svg' | 'webp'>,
    sourceVariantId: variantId,
    generatedAt: new Date().toISOString(),
    basePrompt: variant.prompt,
    exportedAt: new Date().toISOString(),
    fileSizes,
  };
}

export async function handleExportAsset(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<MCPToolResult> {
  const operationStart = Date.now();
  const startTime = Date.now();

  try {
    const sessionId = args.sessionId as string;
    const variantId = args.variantId as string;
    const rawFormats = (args.formats as string[]) || ['png'];
    const resolution = (args.resolution as string) || '1x';

    if (!sessionId || sessionId.trim() === '') {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: sessionId is required and cannot be empty',
          },
        ],
      };
    }

    if (!variantId || variantId.trim() === '') {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: variantId is required and cannot be empty',
          },
        ],
      };
    }

    const validFormats = rawFormats.filter(
      (f) => f === 'png' || f === 'svg' || f === 'webp'
    );

    if (validFormats.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: formats must include at least one of: png, svg, webp',
          },
        ],
      };
    }

    if (!['1x', '2x', '3x'].includes(resolution)) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: resolution must be 1x, 2x, or 3x',
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
            text: `Error: session not found: ${sessionId}`,
          },
        ],
      };
    }

    if (!session.currentAsset) {
      return {
        content: [
          {
            type: 'text',
            text: 'No asset found in this session. Generate variants first using generate-variants.',
          },
        ],
      };
    }

    const variant = session.currentAsset.allVariants.find(
      (v) => v.id === variantId
    );

    if (!variant) {
      const availableIds = session.currentAsset.allVariants
        .map((v) => v.id)
        .join(', ');
      return {
        content: [
          {
            type: 'text',
            text: `Variant ${variantId} not found. Available variants: ${availableIds}`,
          },
        ],
      };
    }

    const originalWidth = variant.metadata.width;
    const originalHeight = variant.metadata.height;

    const validationResult = validateAssetDimensions(
      session.currentAsset.type,
      originalWidth,
      originalHeight
    );

    let validationWarning = '';
    if (!validationResult.valid) {
      validationWarning = `\nValidation Warning: ${validationResult.reason}`;
      logger.warn(
        `Asset dimensions validation failed for ${session.currentAsset.type}: ${validationResult.reason}`
      );
    }

    const scaledDimensions = getScaledDimensions(
      originalWidth,
      originalHeight,
      resolution
    );

    const exportedFormats: Record<
      string,
      { data: string; mimeType: string }
    > = {};
    const fileSizes: Record<string, number> = {};

    let basePngData = variant.imageBase64;

    const formatTimings: Record<string, number> = {};

    for (const format of validFormats) {
      const formatStartTime = Date.now();
      logger.info(`Processing format: ${format}`);

      if (format === 'png') {
        const compressedPng = compressPng(basePngData);
        exportedFormats['png'] = {
          data: compressedPng,
          mimeType: 'image/png',
        };
        fileSizes['png'] = calculateFileSizeApproximation(compressedPng);
      } else if (format === 'svg') {
        const vectorizedSvg = await convertPngToVectorizedSvg(
          basePngData,
          scaledDimensions.width,
          scaledDimensions.height
        );
        const minifiedSvg = minifySvg(vectorizedSvg);
        exportedFormats['svg'] = {
          data: minifiedSvg,
          mimeType: 'image/svg+xml',
        };
        fileSizes['svg'] = calculateFileSizeApproximation(minifiedSvg);
      } else if (format === 'webp') {
        const optimizedWebp = optimizeWebp(basePngData);
        exportedFormats['webp'] = {
          data: optimizedWebp,
          mimeType: 'image/webp',
        };
        fileSizes['webp'] = calculateFileSizeApproximation(optimizedWebp);
      }

      formatTimings[format] = Date.now() - formatStartTime;
    }

    const metadata = buildExportMetadata(
      session.currentAsset.type,
      scaledDimensions,
      validFormats,
      variantId,
      variant,
      fileSizes
    );

    const elapsed = Date.now() - startTime;

    const exportSummary = `
**Asset Export Complete**

Session: ${sessionId}
Variant: ${variantId}
Asset Type: ${session.currentAsset.type}
Formats: ${validFormats.map((f) => f.toUpperCase()).join(', ')}
Resolution: @${resolution} (${scaledDimensions.width}x${scaledDimensions.height})
Export Time: ${elapsed}ms${validationWarning}

**Format Timings:**
${Object.entries(formatTimings).map(([fmt, time]) => `- ${fmt.toUpperCase()}: ${time}ms`).join('\n')}

**Dimensions:** ${scaledDimensions.width} x ${scaledDimensions.height}px
**File Sizes:** ${Object.entries(fileSizes).map(([fmt, size]) => `${fmt.toUpperCase()}: ~${Math.round(size / 1024)}KB`).join(', ')}

**Metadata:**
\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`
`;

    const content: Array<
      | { type: 'text'; text: string }
      | { type: 'image'; data: string; mimeType: string }
    > = [
      {
        type: 'text' as const,
        text: exportSummary,
      },
    ];

    for (const format of validFormats) {
      const exported = exportedFormats[format];
      if (exported) {
        content.push({
          type: 'image' as const,
          data: exported.data,
          mimeType: exported.mimeType,
        });
      }
    }

    logger.info(
      `Exported variant ${variantId} in ${validFormats.length} formats in ${elapsed}ms`
    );

    sessionManager.getMetricsCollector().recordOperation(
      'asset-export',
      elapsed,
      true,
      undefined,
      sessionId
    );

    return { content };
  } catch (error) {
    const operationDuration = Date.now() - operationStart;
    const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
    sessionManager.getMetricsCollector().recordOperation(
      'asset-export',
      operationDuration,
      false,
      errorType,
      args.sessionId as string
    );

    logger.error('Failed to export asset', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}
