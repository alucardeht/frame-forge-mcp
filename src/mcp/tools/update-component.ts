import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SessionManager } from '../../session/session-manager.js';
import { WireframeComponent } from '../../types/index.js';
import { Logger } from '../../utils/logger.js';
import { pushHistory } from './undo-wireframe.js';

const logger = new Logger('UpdateComponentTool');

interface UpdateComponentArgs {
  sessionId: string;
  targetComponentType: string;
  updates: {
    properties?: Record<string, unknown>;
    dimensions?: { width?: number; height?: number };
  };
}

function updateComponentsRecursive(
  components: WireframeComponent[],
  targetType: string,
  updates: UpdateComponentArgs['updates']
): { components: WireframeComponent[]; count: number } {
  let updateCount = 0;

  const updated = components.map((component) => {
    let newComponent = { ...component };

    if (component.type === targetType) {
      updateCount++;

      if (updates.properties) {
        newComponent.properties = {
          ...newComponent.properties,
          ...updates.properties,
        };
      }

      if (updates.dimensions) {
        newComponent.dimensions = {
          width: newComponent.dimensions?.width ?? 0,
          height: newComponent.dimensions?.height ?? 0,
          ...updates.dimensions,
        };
      }
    }

    if (component.children && component.children.length > 0) {
      const childResult = updateComponentsRecursive(
        component.children,
        targetType,
        updates
      );
      newComponent.children = childResult.components;
      updateCount += childResult.count;
    }

    return newComponent;
  });

  return { components: updated, count: updateCount };
}

export async function handleUpdateComponent(
  args: Record<string, unknown>,
  _sessionManager: SessionManager
): Promise<CallToolResult> {
  const sessionId = args.sessionId as string;
  const targetComponentType = args.targetComponentType as string;
  const updates = args.updates as UpdateComponentArgs['updates'];

  logger.info(`Updating components of type '${targetComponentType}' in session ${sessionId}`);

  const session = await _sessionManager.loadSession(sessionId);
  if (!session) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Session ${sessionId} not found`,
        },
      ],
    };
  }

  const wireframeIds = await _sessionManager.listWireframes(sessionId);
  if (!wireframeIds || wireframeIds.length === 0) {
    throw new Error(`No wireframes found for session ${sessionId}`);
  }

  const wireframeId = wireframeIds[0];
  const wireframe = await _sessionManager.loadWireframe(sessionId, wireframeId);
  if (!wireframe) {
    throw new Error(`Failed to load wireframe ${wireframeId}`);
  }

  const result = updateComponentsRecursive(
    wireframe.components,
    targetComponentType,
    updates
  );

  wireframe.components = result.components;

  await pushHistory(sessionId, wireframe, _sessionManager);

  await _sessionManager.saveWireframe(sessionId, wireframe);

  logger.info(`Updated ${result.count} '${targetComponentType}' component(s) in wireframe ${wireframeId}`);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Updated ${result.count} '${targetComponentType}' component(s)\n\nSession ID: ${sessionId}\nWireframe ID: ${wireframeId}\nTarget Type: ${targetComponentType}\n\nUpdates applied:\n${JSON.stringify(updates, null, 2)}`,
      },
    ],
  };
}

export const updateComponentSchema = {
  type: 'function' as const,
  function: {
    name: 'update_component',
    description:
      'Update all instances of a specific component type in the wireframe (mass update)',
    parameters: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string' as const,
          description: 'Session identifier',
        },
        targetComponentType: {
          type: 'string' as const,
          description:
            'Component type to update (card, sidebar, header, footer, grid, content, container)',
        },
        updates: {
          type: 'object' as const,
          description: 'Updates to apply to all matching components',
          properties: {
            properties: {
              type: 'object' as const,
              description: 'Property updates (slots, columns, spacing, etc)',
            },
            dimensions: {
              type: 'object' as const,
              description: 'Dimension updates',
              properties: {
                width: { type: 'number' as const },
                height: { type: 'number' as const },
              },
            },
          },
        },
      },
      required: ['sessionId', 'targetComponentType', 'updates'],
    },
  },
};
