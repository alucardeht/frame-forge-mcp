import type { MCPTool, MCPToolResult } from '../../types/index.js';
import { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('ResolveIterationReferenceTool');

export const resolveIterationReferenceTool: MCPTool = {
  name: 'resolve-iteration-reference',
  description: 'Resolve iteration reference (number or prompt substring) to iteration index',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID',
      },
      reference: {
        type: 'string',
        description: 'Iteration reference (e.g., "2", "version 2", "glassmorphism")',
      },
    },
    required: ['sessionId', 'reference'],
  },
};

export async function handleResolveIterationReference(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<MCPToolResult> {
  const sessionId = args.sessionId as string;
  const reference = args.reference as string;

  logger.info(`Resolving reference "${reference}" in session ${sessionId}`);

  try {
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

    if (!reference || reference.trim() === '') {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: reference is required',
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
            text: `Error: no iteration history found for session ${sessionId}`,
          },
        ],
      };
    }

    const parsedNumber = parseInt(reference, 10);

    if (!isNaN(parsedNumber)) {
      const iteration = history.getIteration(parsedNumber);

      if (iteration) {
        logger.info(`Resolved numeric reference ${parsedNumber}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  resolved: true,
                  iterationIndex: parsedNumber,
                  prompt: iteration.prompt,
                  timestamp: iteration.timestamp,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Error: iteration ${parsedNumber} not found`,
          },
        ],
      };
    }

    const allIterations = history.getAllIterations();
    const searchTerm = reference.toLowerCase();

    const matches = allIterations.filter(iteration => iteration.prompt.toLowerCase().includes(searchTerm));

    if (matches.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: no iterations found matching "${reference}"`,
          },
        ],
      };
    }

    if (matches.length === 1) {
      const match = matches[0];
      logger.info(`Resolved reference to iteration ${match.index}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                resolved: true,
                iterationIndex: match.index,
                prompt: match.prompt,
                timestamp: match.timestamp,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const matchList = matches.map(m => `- Iteration ${m.index}: "${m.prompt}"`).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Error: multiple matches found for "${reference}":\n\n${matchList}\n\nPlease use a more specific reference.`,
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to resolve iteration reference', error as Error);
    return {
      content: [
        {
          type: 'text',
          text: `Error resolving reference: ${(error as Error).message}`,
        },
      ],
    };
  }
}
