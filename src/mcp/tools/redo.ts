import type { MCPTool, MCPToolResult } from '../../types/index.js';
import { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('RedoTool');

export const redoTool: MCPTool = {
  name: 'redo',
  description: 'Redo the last undone operation in a session',
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

export async function handleRedo(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<MCPToolResult> {
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

    if (!history.canRedo()) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: cannot redo, no undone iterations available',
          },
        ],
      };
    }

    const redidIteration = history.redo();

    if (!redidIteration) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: failed to redo iteration',
          },
        ],
      };
    }

    await sessionManager.saveSession(session);

    const imageBase64 = await sessionManager.loadIterationImage(
      sessionId,
      redidIteration.index
    );

    const elapsed = Date.now() - startTime;
    logger.info(`Redid session ${sessionId} to iteration ${redidIteration.index} in ${elapsed}ms`);

    if (elapsed > 10000) {
      logger.warn(`Redo took ${elapsed}ms (exceeds 10s threshold)`);
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
              message: `Redid to iteration ${redidIteration.index}`,
              sessionId,
              iterationIndex: redidIteration.index,
              prompt: redidIteration.prompt,
              timestamp: redidIteration.timestamp,
              metadata: redidIteration.result.metadata,
              canUndo: history.canUndo(),
              canRedo: history.canRedo(),
              redoLatencyMs: elapsed,
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
    logger.error(`Failed to redo (${elapsed}ms)`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error redoing: ${errorMessage}`,
        },
      ],
    };
  }
}
