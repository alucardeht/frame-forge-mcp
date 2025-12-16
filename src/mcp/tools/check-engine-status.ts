import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MCPTool } from '../../types/index.js';
import { MLXEngine } from '../../engines/mlx-engine.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('CheckEngineStatusTool');

export const checkEngineStatusTool: MCPTool = {
  name: 'check-engine-status',
  description: 'Check status of the image generation engine and its dependencies',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export async function handleCheckEngineStatus(engine: MLXEngine): Promise<CallToolResult> {
  try {
    logger.info('Checking engine status');
    const status = await engine.checkStatus();

    const dependencyLines = status.dependencies
      .map((dep) => {
        const statusText = dep.installed ? '✓' : '✗';
        const versionText = dep.version ? ` (v${dep.version})` : '';
        return `  ${statusText} ${dep.name}${versionText}`;
      })
      .join('\n');

    const readyText = status.ready ? 'Ready' : 'Not Ready';
    const errorText = status.error ? `\nError: ${status.error}` : '';

    const statusMessage = `
Engine Status: ${readyText}
Engine Name: ${status.engineName}
${status.modelPath ? `Model Path: ${status.modelPath}` : ''}

Dependencies:
${dependencyLines}${errorText}
    `.trim();

    logger.info(`Engine status: ${status.ready ? 'ready' : 'not ready'}`);

    return {
      content: [
        {
          type: 'text',
          text: statusMessage,
        },
        {
          type: 'text',
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to check engine status', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error checking engine status: ${errorMessage}`,
        },
      ],
    };
  }
}
