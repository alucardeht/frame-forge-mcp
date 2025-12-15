import type { MCPTool, MCPToolResult } from '../../types/index.js';
import type { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('compare-iterations');

export const compareIterationsTool: MCPTool = {
  name: 'compare-iterations',
  description: 'Compare two iterations side-by-side (A/B comparison)',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID containing the iterations',
      },
      iterationIndex1: {
        type: 'number',
        description: 'Index of first iteration (A)',
      },
      iterationIndex2: {
        type: 'number',
        description: 'Index of second iteration (B)',
      },
    },
    required: ['sessionId', 'iterationIndex1', 'iterationIndex2'],
  },
};

export async function handleCompareIterations(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<MCPToolResult> {
  const sessionId = args.sessionId as string;
  const index1 = args.iterationIndex1 as number;
  const index2 = args.iterationIndex2 as number;

  logger.info(`Comparing iterations ${index1} and ${index2} in session ${sessionId}`);

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

    const iteration1 = history.getIteration(index1);
    const iteration2 = history.getIteration(index2);

    if (!iteration1) {
      return {
        content: [
          {
            type: 'text',
            text: `Iteration ${index1} not found in session ${sessionId}`,
          },
        ],
      };
    }

    if (!iteration2) {
      return {
        content: [
          {
            type: 'text',
            text: `Iteration ${index2} not found in session ${sessionId}`,
          },
        ],
      };
    }

    const promptDiff = iteration1.prompt === iteration2.prompt
      ? '(same prompt)'
      : `A: "${iteration1.prompt}"\nB: "${iteration2.prompt}"`;

    const dimensionsDiff =
      iteration1.result.metadata.width === iteration2.result.metadata.width &&
      iteration1.result.metadata.height === iteration2.result.metadata.height
        ? '(same)'
        : `A: ${iteration1.result.metadata.width}x${iteration1.result.metadata.height} | B: ${iteration2.result.metadata.width}x${iteration2.result.metadata.height}`;

    const stepsDiff =
      iteration1.result.metadata.steps === iteration2.result.metadata.steps
        ? '(same)'
        : `A: ${iteration1.result.metadata.steps} | B: ${iteration2.result.metadata.steps}`;

    const guidanceDiff =
      iteration1.result.metadata.guidanceScale === iteration2.result.metadata.guidanceScale
        ? '(same)'
        : `A: ${iteration1.result.metadata.guidanceScale} | B: ${iteration2.result.metadata.guidanceScale}`;

    const image1Base64 = await sessionManager.loadIterationImage(sessionId, index1);
    const image2Base64 = await sessionManager.loadIterationImage(sessionId, index2);

    const comparisonSummary = `
**A/B Comparison**

Session: ${sessionId}
Iteration A: ${index1} (${iteration1.timestamp})
Iteration B: ${index2} (${iteration2.timestamp})

**Prompt Diff:**
${promptDiff}

**Parameters:**
- Dimensions: ${dimensionsDiff}
- Steps: ${stepsDiff}
- Guidance Scale: ${guidanceDiff}

**Latency:**
- A: ${iteration1.result.metadata.latencyMs}ms
- B: ${iteration2.result.metadata.latencyMs}ms
`;

    logger.info(`Compared iterations ${index1} and ${index2} successfully`);

    return {
      content: [
        {
          type: 'text',
          text: comparisonSummary,
        },
        {
          type: 'image',
          data: image1Base64,
          mimeType: 'image/png',
        },
        {
          type: 'image',
          data: image2Base64,
          mimeType: 'image/png',
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to compare iterations', error as Error);
    return {
      content: [
        {
          type: 'text',
          text: `Error comparing iterations: ${(error as Error).message}`,
        },
      ],
    };
  }
}
