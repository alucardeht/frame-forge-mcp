import type { MCPTool, MCPToolResult } from '../../types/index.js';
import { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('PreviewIterationTool');

export const previewIterationTool: MCPTool = {
  name: 'preview-iteration',
  description: 'Preview a specific iteration from a session without rolling back',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID',
      },
      iterationIndex: {
        type: 'number',
        description: 'Index of the iteration to preview',
      },
    },
    required: ['sessionId', 'iterationIndex'],
  },
};

export async function handlePreviewIteration(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<MCPToolResult> {
  try {
    const sessionId = args.sessionId as string;
    const iterationIndex = args.iterationIndex as number;

    if (!sessionId || sessionId.trim() === '') {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: sessionId is required',
          },
        ],
      };
    }

    if (typeof iterationIndex !== 'number' || iterationIndex < 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: iterationIndex must be a non-negative number',
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

    const history = sessionManager.getActiveHistory(sessionId);

    if (!history) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: session history not found for: ${sessionId}`,
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
            text: `Error: iteration index out of range: ${iterationIndex}`,
          },
        ],
      };
    }

    const imageBase64 = await sessionManager.loadIterationImage(sessionId, iterationIndex);

    logger.info(`Previewed iteration ${iterationIndex} from session ${sessionId}`);

    return {
      content: [
        {
          type: 'image',
          data: imageBase64,
          mimeType: 'image/png',
        },
        {
          type: 'text',
          text: JSON.stringify(
            {
              sessionId,
              iterationIndex,
              prompt: iteration.prompt,
              timestamp: iteration.timestamp,
              rolledBackTo: iteration.rolledBackTo || false,
              metadata: iteration.result.metadata,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to preview iteration', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error previewing iteration: ${errorMessage}`,
        },
      ],
    };
  }
}
