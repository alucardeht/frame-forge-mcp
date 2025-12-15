import type { MCPTool, MCPToolResult } from '../../types/index.js';
import { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('RollbackIterationTool');

export const rollbackIterationTool: MCPTool = {
  name: 'rollback-iteration',
  description: 'Rollback to a previous iteration in a session',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID',
      },
      iterationIndex: {
        type: 'number',
        description: 'Index of the iteration to rollback to',
      },
    },
    required: ['sessionId', 'iterationIndex'],
  },
};

export async function handleRollbackIteration(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<MCPToolResult> {
  const startTime = Date.now();

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

    history.markRolledBackTo(iterationIndex);
    await sessionManager.saveSession(session);

    const imageBase64 = await sessionManager.loadIterationImage(sessionId, iterationIndex);

    const elapsed = Date.now() - startTime;
    logger.info(`Rolled back session ${sessionId} to iteration ${iterationIndex} in ${elapsed}ms`);

    if (elapsed > 10000) {
      logger.warn(`Rollback took ${elapsed}ms (exceeds 10s threshold)`);
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
              message: `Rolled back to iteration ${iterationIndex}`,
              sessionId,
              iterationIndex,
              prompt: iteration.prompt,
              timestamp: iteration.timestamp,
              metadata: iteration.result.metadata,
              rollbackLatencyMs: elapsed,
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
    logger.error(`Failed to rollback iteration (${elapsed}ms)`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error rolling back iteration: ${errorMessage}`,
        },
      ],
    };
  }
}
