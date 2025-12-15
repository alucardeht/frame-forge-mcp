import type { MCPTool, MCPToolResult } from '../../types/index.js';
import { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('ListSessionsTool');

export const listSessionsTool: MCPTool = {
  name: 'list-sessions',
  description: 'List all available sessions with their metadata',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export async function handleListSessions(sessionManager: SessionManager): Promise<MCPToolResult> {
  try {
    logger.info('Listing all sessions');
    const sessions = await sessionManager.listSessions();

    if (sessions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No sessions found',
          },
        ],
      };
    }

    const sessionSummaries = sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      totalIterations: session.metadata.totalIterations,
      lastPrompt: session.metadata.lastPrompt,
    }));

    const sessionLines = sessionSummaries
      .map(
        (s) =>
          `• Session: ${s.id}\n  Created: ${s.createdAt}\n  Updated: ${s.updatedAt}\n  Iterations: ${s.totalIterations}${s.lastPrompt ? `\n  Last Prompt: ${s.lastPrompt}` : ''}`
      )
      .join('\n\n');

    const summaryMessage = `Found ${sessions.length} session${sessions.length === 1 ? '' : 's'}:\n\n${sessionLines}`;

    logger.info(`Listed ${sessions.length} sessions`);

    return {
      content: [
        {
          type: 'text',
          text: summaryMessage,
        },
        {
          type: 'text',
          text: JSON.stringify(sessionSummaries, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to list sessions', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error listing sessions: ${errorMessage}`,
        },
      ],
    };
  }
}
