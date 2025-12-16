import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { WireframeComponent } from '../../types/index.js';
import { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('ShowComponentTool');

function findComponentById(
  components: WireframeComponent[],
  targetId: string
): WireframeComponent | null {
  for (const component of components) {
    if (component.id === targetId) {
      return component;
    }
    if (component.children) {
      const found = findComponentById(component.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

function findAllComponentsByType(
  components: WireframeComponent[],
  targetType: string
): WireframeComponent[] {
  const results: WireframeComponent[] = [];

  for (const component of components) {
    if (component.type === targetType) {
      results.push(component);
    }
    if (component.children) {
      results.push(...findAllComponentsByType(component.children, targetType));
    }
  }

  return results;
}

function formatComponentDetails(component: WireframeComponent): string {
  const lines: string[] = [];

  lines.push(`Component: ${component.type}`);
  lines.push(`ID: ${component.id}`);

  if (component.position) {
    lines.push(`Position: (${component.position.x}, ${component.position.y})`);
  }

  if (component.dimensions) {
    lines.push(`Dimensions: ${component.dimensions.width}x${component.dimensions.height}`);
  }

  if (component.properties && Object.keys(component.properties).length > 0) {
    lines.push(`Properties:`);
    for (const [key, value] of Object.entries(component.properties)) {
      lines.push(`  - ${key}: ${JSON.stringify(value)}`);
    }
  }

  if (component.children && component.children.length > 0) {
    lines.push(`Children: ${component.children.length} component(s)`);
    for (const child of component.children) {
      lines.push(`  - ${child.type} (${child.id})`);
    }
  }

  return lines.join('\n');
}

export async function handleShowComponent(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<CallToolResult> {
  const sessionId = args.sessionId as string;
  const componentId = args.componentId as string | undefined;
  const componentType = args.componentType as string | undefined;
  const showAll = (args.showAll as boolean) ?? false;

  logger.info(`Showing component(s) in session ${sessionId}`);

  const session = await sessionManager.loadSession(sessionId);
  if (!session) {
    return {
      content: [{
        type: 'text' as const,
        text: `Session ${sessionId} not found`,
      }],
    };
  }

  const mockWireframe = {
    id: 'temp-wireframe',
    sessionId,
    description: 'test',
    components: [] as WireframeComponent[],
    metadata: {
      width: 800,
      height: 600,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  if (componentId) {
    const component = findComponentById(mockWireframe.components, componentId);

    if (!component) {
      return {
        content: [{
          type: 'text' as const,
          text: `Component with ID '${componentId}' not found`,
        }],
      };
    }

    logger.info(`Found component ${component.id}`);

    return {
      content: [{
        type: 'text' as const,
        text: formatComponentDetails(component),
      }],
    };
  }

  if (componentType) {
    const components = findAllComponentsByType(mockWireframe.components, componentType);

    if (components.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: `No components of type '${componentType}' found`,
        }],
      };
    }

    logger.info(`Found ${components.length} component(s) of type '${componentType}'`);

    if (showAll) {
      const details = components.map(comp => formatComponentDetails(comp)).join('\n\n---\n\n');
      return {
        content: [{
          type: 'text' as const,
          text: `Found ${components.length} '${componentType}' component(s):\n\n${details}`,
        }],
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: formatComponentDetails(components[0]),
      }],
    };
  }

  return {
    content: [{
      type: 'text' as const,
      text: 'Error: Must provide either componentId or componentType',
    }],
  };
}

export const showComponentSchema = {
  type: 'function' as const,
  function: {
    name: 'show_component',
    description: 'Show detailed information about a specific wireframe component',
    parameters: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string' as const,
          description: 'Session identifier',
        },
        componentId: {
          type: 'string' as const,
          description: 'Component ID to show (optional if componentType provided)',
        },
        componentType: {
          type: 'string' as const,
          description: 'Component type to show (sidebar, header, footer, grid, card, content, container)',
        },
        showAll: {
          type: 'boolean' as const,
          description: 'Show all components of specified type (default: false, shows only first)',
        },
      },
      required: ['sessionId'],
    },
  },
};
