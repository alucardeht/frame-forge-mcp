import type { MCPTool } from '../../types/index.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('UndoTool');

export const undoTool: MCPTool = {
  name: 'undo',
  description: 'Undo the last operation in a session',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID',
      },
    },
    required: ['sessionId'],
  },
};

export async function handleUndo(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<CallToolResult> {
  const startTime = Date.now();

  try {
    const sessionId = args.sessionId as string;

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

    if (!history.canUndo()) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: cannot undo, no previous iterations available',
          },
        ],
      };
    }

    const undidIteration = history.undo();

    if (!undidIteration) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: failed to undo iteration',
          },
        ],
      };
    }

    await sessionManager.saveSession(session);

    const imageBase64 = await sessionManager.loadIterationImage(
      sessionId,
      undidIteration.index
    );

    const elapsed = Date.now() - startTime;
    logger.info(`Undid session ${sessionId} to iteration ${undidIteration.index} in ${elapsed}ms`);

    if (elapsed > 10000) {
      logger.warn(`Undo took ${elapsed}ms (exceeds 10s threshold)`);
    }

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
              message: `Undid to iteration ${undidIteration.index}`,
              sessionId,
              iterationIndex: undidIteration.index,
              prompt: undidIteration.prompt,
              timestamp: undidIteration.timestamp,
              metadata: undidIteration.result.metadata,
              canUndo: history.canUndo(),
              canRedo: history.canRedo(),
              undoLatencyMs: elapsed,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const elapsed = Date.now() - startTime;
    logger.error(`Failed to undo (${elapsed}ms)`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error undoing: ${errorMessage}`,
        },
      ],
    };
  }
}
