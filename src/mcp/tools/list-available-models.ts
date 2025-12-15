import type { MCPTool, MCPToolResult } from '../../types/index.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('list-available-models');

export const listAvailableModelsTool: MCPTool = {
  name: 'list-available-models',
  description: 'List available Stable Diffusion models compatible with MLX',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  size: string;
  recommended: boolean;
  huggingfaceId: string;
}

export async function handleListAvailableModels(): Promise<MCPToolResult> {
  logger.info('Listing available models');

  try {
    const models: ModelInfo[] = [
      {
        id: 'sd-2.1',
        name: 'Stable Diffusion 2.1',
        description: 'High-quality text-to-image generation (default)',
        size: '~5GB',
        recommended: true,
        huggingfaceId: 'stabilityai/stable-diffusion-2-1',
      },
      {
        id: 'sd-2.1-base',
        name: 'Stable Diffusion 2.1 Base',
        description: 'Faster generation with slightly lower quality',
        size: '~3.5GB',
        recommended: false,
        huggingfaceId: 'stabilityai/stable-diffusion-2-1-base',
      },
      {
        id: 'sd-1.5',
        name: 'Stable Diffusion 1.5',
        description: 'Earlier version, good compatibility',
        size: '~4GB',
        recommended: false,
        huggingfaceId: 'runwayml/stable-diffusion-v1-5',
      },
    ];

    const formattedList = models
      .map(model => {
        const badge = model.recommended ? ' [RECOMMENDED]' : '';
        return `
**${model.name}${badge}**
- ID: ${model.id}
- Description: ${model.description}
- Size: ${model.size}
- Hugging Face: ${model.huggingfaceId}`;
      })
      .join('\n\n');

    const summary = `Found ${models.length} available models for MLX:\n${formattedList}`;

    logger.info(`Listed ${models.length} models`);

    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to list models', error as Error);
    return {
      content: [
        {
          type: 'text',
          text: `Error listing models: ${(error as Error).message}`,
        },
      ],
    };
  }
}
