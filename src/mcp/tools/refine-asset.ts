import type { MCPTool, MCPToolResult, Variant } from '../../types/index.js';
import type { BaseEngine } from '../../engines/base-engine.js';
import { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';
import { randomBytes } from 'crypto';
import { retryWithBackoff } from '../../lib/retry.js';
import { withTimeout } from '../../lib/timeout.js';
import { TIMEOUTS } from '../../config/timeouts.js';

const logger = new Logger('RefineAssetTool');

export const refineAssetTool: MCPTool = {
  name: 'refine-asset',
  description: 'Refine the selected variant with additional instructions (e.g., "make it more minimalist", "add shadow")',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID with selected variant',
      },
      refinement: {
        type: 'string',
        description: 'Refinement instruction (e.g., "make it more minimalist", "add shadow")',
      },
    },
    required: ['sessionId', 'refinement'],
  },
};

function generateVariantId(): string {
  return `variant-${randomBytes(16).toString('hex')}`;
}

function generateSeed(): number {
  return Math.floor(Math.random() * 1000000);
}

export async function handleRefineAsset(
  args: Record<string, unknown>,
  engine: BaseEngine,
  sessionManager: SessionManager
): Promise<MCPToolResult> {
  const operationStart = Date.now();
  const startTime = Date.now();

  try {
    const sessionId = args.sessionId as string;
    const refinementPrompt = args.refinement as string;

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

    if (!refinementPrompt || refinementPrompt.trim() === '') {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: refinement instruction is required and cannot be empty',
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
            text: 'No asset in this session. Generate variants first using generate-variants.',
          },
        ],
      };
    }

    if (!session.currentAsset.selectedVariantId) {
      return {
        content: [
          {
            type: 'text',
            text: 'No variant selected. Select a variant first using select-variant.',
          },
        ],
      };
    }

    const selectedVariant = session.currentAsset.allVariants.find(
      (v) => v.id === session.currentAsset!.selectedVariantId
    );

    if (!selectedVariant) {
      return {
        content: [
          {
            type: 'text',
            text: `Selected variant ${session.currentAsset.selectedVariantId} not found.`,
          },
        ],
      };
    }

    const fullPrompt = `${selectedVariant.prompt}, ${refinementPrompt}`;
    const seed = generateSeed();

    logger.info(`Refining variant ${selectedVariant.id} with: "${refinementPrompt}"`);

    const retryOptions = {
      maxAttempts: 3,
      baseDelayMs: 2000,
      maxDelayMs: 30000,
      onRetry: (attempt: number, error: Error, delayMs: number) => {
        logger.info('Retrying generation after error', {
          attempt,
          totalAttempts: 3,
          delayMs: Math.round(delayMs),
          error: error.message,
        });
      },
    };

    const result = await withTimeout(
      retryWithBackoff(
        () => engine.generate({
          prompt: fullPrompt,
          width: selectedVariant.metadata.width,
          height: selectedVariant.metadata.height,
          steps: 20,
          seed,
        }),
        retryOptions
      ),
      {
        timeoutMs: TIMEOUTS.IMAGE_GENERATION,
        operationName: 'asset-refinement',
        heartbeatIntervalMs: 3000,
        onHeartbeat: (elapsed, total) => {
          logger.debug('Asset refinement progress', {
            elapsedMs: elapsed,
            totalMs: total,
            progressPercent: Math.round((elapsed / total) * 100),
          });
        },
      }
    );

    const latency = Date.now() - startTime;

    const refinedVariant: Variant = {
      id: generateVariantId(),
      imageBase64: result.imageBase64 || '',
      seed,
      prompt: fullPrompt,
      metadata: {
        width: selectedVariant.metadata.width,
        height: selectedVariant.metadata.height,
        steps: 20,
        latencyMs: latency,
      },
    };

    session.currentAsset.allVariants.push(refinedVariant);

    session.currentAsset.refinements.push({
      variantId: refinedVariant.id,
      refinementPrompt,
      baseVariantId: selectedVariant.id,
      timestamp: new Date().toISOString(),
    });

    session.currentAsset.selectedVariantId = refinedVariant.id;

    await sessionManager.saveSession(session);

    logger.info(
      `Refined variant ${selectedVariant.id} → ${refinedVariant.id} in ${latency}ms`
    );

    sessionManager.getMetricsCollector().recordOperation(
      'asset-refinement',
      latency,
      true,
      undefined,
      sessionId
    );

    return {
      content: [
        {
          type: 'text',
          text: `Refined variant ${selectedVariant.id}\n\nRefinement: "${refinementPrompt}"\nNew variant ID: ${refinedVariant.id}\nSeed: ${seed}\nLatency: ${latency}ms`,
        },
        {
          type: 'image',
          data: refinedVariant.imageBase64,
          mimeType: 'image/png',
        },
      ],
    };
  } catch (error) {
    const operationDuration = Date.now() - operationStart;
    const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
    sessionManager.getMetricsCollector().recordOperation(
      'asset-refinement',
      operationDuration,
      false,
      errorType,
      args.sessionId as string
    );

    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to refine asset', error);

    const isTimeout = errorMessage.toLowerCase().includes('timeout') ||
                      errorMessage.includes('90000') ||
                      errorMessage.toLowerCase().includes('sigterm');

    let userMessage: string;
    if (isTimeout) {
      userMessage = `Refinement took too long (>90s). Please try with:
- Simpler refinement prompt
- Lower resolution
- Fewer steps

Original error: ${errorMessage}`;
    } else {
      userMessage = `Error refining asset: ${errorMessage}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: userMessage,
        },
      ],
    };
  }
}
