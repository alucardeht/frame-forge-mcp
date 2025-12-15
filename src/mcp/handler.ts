import type { MCPTool, MCPToolCall, MCPToolResult } from '../types/index.js';
import { MLXEngine } from '../engines/mlx-engine.js';
import { SessionManager } from '../session/session-manager.js';
import { Logger } from '../utils/logger.js';
import { ALL_TOOLS, TOOL_HANDLERS } from './tools/index.js';
import { ErrorHandler } from './error-handler.js';

const logger = new Logger('MCPHandler');

export interface MCPHandler {
  listTools(): MCPTool[];
  callTool(call: MCPToolCall): Promise<MCPToolResult>;
}

export function createMCPHandler(
  engine: MLXEngine,
  sessionManager: SessionManager
): MCPHandler {
  return {
    listTools(): MCPTool[] {
      logger.debug('Listing available tools');
      return ALL_TOOLS;
    },

    async callTool(call: MCPToolCall): Promise<MCPToolResult> {
      try {
        const toolName = call.name;
        const args = call.arguments || {};

        logger.info(`Calling tool: ${toolName}`);

        const handler = TOOL_HANDLERS[toolName];

        if (!handler) {
          logger.warn(`Unknown tool requested: ${toolName}`);
          return {
            content: [
              {
                type: 'text',
                text: `Error: unknown tool: ${toolName}`,
              },
            ],
          };
        }

        const result = await handler(args, engine, sessionManager);

        logger.debug(`Tool ${toolName} completed successfully`);
        return result;
      } catch (error) {
        const structuredError = ErrorHandler.categorizeError(
          error instanceof Error ? error : new Error(String(error)),
          {
            tool: call.name,
            params: call.arguments,
          }
        );

        return ErrorHandler.formatForMCP(structuredError);
      }
    },
  };
}
