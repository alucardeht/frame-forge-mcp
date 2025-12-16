import type { MCPTool } from '../../types/index.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('SelectVariantTool');

export const selectVariantTool: MCPTool = {
  name: 'select-variant',
  description: 'Select a specific variant for subsequent refinement operations',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID containing the variants',
      },
      variantId: {
        type: 'string',
        description: 'Variant ID to select (from generate_variants output)',
      },
    },
    required: ['sessionId', 'variantId'],
  },
};

export async function handleSelectVariant(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<CallToolResult> {
  try {
    const sessionId = args.sessionId as string;
    const variantId = args.variantId as string;

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
            text: 'No variants found in this session. Generate variants first using generate-variants.',
          },
        ],
      };
    }

    const variant = session.currentAsset.allVariants.find((v) => v.id === variantId);

    if (!variant) {
      const availableIds = session.currentAsset.allVariants.map((v) => v.id).join(', ');
      return {
        content: [
          {
            type: 'text',
            text: `Variant ${variantId} not found. Available variants: ${availableIds}`,
          },
        ],
      };
    }

    session.currentAsset.selectedVariantId = variantId;
    await sessionManager.saveSession(session);

    logger.info(`Selected variant ${variantId} in session ${sessionId}`);

    return {
      content: [
        {
          type: 'text',
          text: `Selected variant ${variantId}\n\nPrompt: "${variant.prompt}"\nSeed: ${variant.seed}\nDimensions: ${variant.metadata.width}x${variant.metadata.height}`,
        },
        {
          type: 'image',
          data: variant.imageBase64,
          mimeType: 'image/png',
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to select variant', error);
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
