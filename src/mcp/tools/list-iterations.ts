import type { MCPTool } from '../../types/index.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('list-iterations');

export const listIterationsTool: MCPTool = {
  name: 'list-iterations',
  description: 'List all iterations in a session with metadata',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID to list iterations from',
      },
      includeImages: {
        type: 'boolean',
        description: 'Include base64 images in response (default: false)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of iterations to return (default: all)',
      },
    },
    required: ['sessionId'],
  },
};

export async function handleListIterations(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<CallToolResult> {
  const sessionId = args.sessionId as string;
  const includeImages = (args.includeImages as boolean) || false;
  const limit = args.limit as number | undefined;

  logger.info(`Listing iterations for session ${sessionId}`);

  try {
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

    let iterations = history.getAllIterations();

    if (limit && limit > 0) {
      iterations = iterations.slice(0, limit);
    }

    const formattedIterations = iterations
      .map((iteration) => {
        const rolledBackBadge = iteration.rolledBackTo ? ' [ROLLED BACK TO]' : '';
        let imageInfo = '';
        if (includeImages) {
          const base64 = iteration.result.imageBase64;
          imageInfo = base64 ? `\n  Image: ${base64.substring(0, 50)}...` : '\n  Image: [Not loaded yet]';
        }

        return `
**Iteration ${iteration.index}${rolledBackBadge}**
- Prompt: "${iteration.prompt}"
- Timestamp: ${iteration.timestamp}
- Dimensions: ${iteration.result.metadata.width}x${iteration.result.metadata.height}
- Steps: ${iteration.result.metadata.steps}
- Latency: ${iteration.result.metadata.latencyMs}ms${imageInfo}`;
      })
      .join('\n\n');

    if (includeImages) {
      for (const iteration of iterations) {
        if (!iteration.result.imageBase64) {
          try {
            await sessionManager.loadIterationImage(sessionId, iteration.index);
          } catch (error) {
            logger.warn(`Failed to load image for iteration ${iteration.index}`, error);
          }
        }
      }
    }

    const summary = `Session: ${sessionId}
Total iterations: ${session.metadata.totalIterations}
Last updated: ${session.updatedAt}

${formattedIterations}`;

    logger.info(`Listed ${iterations.length} iterations for session ${sessionId}`);

    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to list iterations', error as Error);
    return {
      content: [
        {
          type: 'text',
          text: `Error listing iterations: ${(error as Error).message}`,
        },
      ],
    };
  }
}
