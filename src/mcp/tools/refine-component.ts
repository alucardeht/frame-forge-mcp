import { MCPToolResult, WireframeComponent } from '../../types/index.js';
import { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';
import { pushHistory } from './undo-wireframe.js';

const logger = new Logger('RefineComponentTool');

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

function findFirstComponentByType(
  components: WireframeComponent[],
  targetType: string
): WireframeComponent | null {
  for (const component of components) {
    if (component.type === targetType) {
      return component;
    }
    if (component.children) {
      const found = findFirstComponentByType(component.children, targetType);
      if (found) return found;
    }
  }
  return null;
}

function parseRefinementDescription(description: string): {
  properties?: Record<string, unknown>;
  dimensions?: { width?: number; height?: number };
  newChildren?: Array<{ type: string; slot: string }>;
} {
  const normalized = description.toLowerCase().trim();
  const result: {
    properties?: Record<string, unknown>;
    dimensions?: { width?: number; height?: number };
    newChildren?: Array<{ type: string; slot: string }>;
  } = {};

  if (
    normalized.includes('profile section') ||
    normalized.includes('user section')
  ) {
    result.newChildren = [{ type: 'content', slot: 'profile' }];
  }

  if (
    normalized.includes('narrower') ||
    normalized.includes('smaller width')
  ) {
    result.dimensions = { width: 200 };
  }

  if (normalized.includes('wider') || normalized.includes('larger width')) {
    result.dimensions = { width: 300 };
  }

  if (normalized.includes('taller') || normalized.includes('larger height')) {
    result.dimensions = { height: 800 };
  }

  const columnMatch = normalized.match(/(\d+)\s*columns?/);
  if (columnMatch) {
    result.properties = { columns: parseInt(columnMatch[1], 10) };
  }

  const spacingMatch = normalized.match(/spacing\s*:?\s*(\d+)/);
  if (spacingMatch) {
    result.properties = {
      ...result.properties,
      spacing: parseInt(spacingMatch[1], 10),
    };
  }

  return result;
}

function applyRefinement(
  component: WireframeComponent,
  refinement: ReturnType<typeof parseRefinementDescription>
): WireframeComponent {
  const refined = { ...component };

  if (refinement.properties) {
    refined.properties = {
      ...refined.properties,
      ...refinement.properties,
    };
  }

  if (refinement.dimensions) {
    refined.dimensions = {
      width: refined.dimensions?.width ?? 0,
      height: refined.dimensions?.height ?? 0,
      ...refinement.dimensions,
    };
  }

  if (refinement.newChildren) {
    refined.children = refined.children || [];
    for (const childDesc of refinement.newChildren) {
      refined.children.push({
        id: `${refined.id}-${childDesc.slot}`,
        type: childDesc.type as WireframeComponent['type'],
        properties: { slot: childDesc.slot },
      });
    }
  }

  return refined;
}

function updateComponentInTree(
  components: WireframeComponent[],
  updatedComponent: WireframeComponent
): WireframeComponent[] {
  return components.map((component) => {
    if (component.id === updatedComponent.id) {
      return updatedComponent;
    }
    if (component.children) {
      return {
        ...component,
        children: updateComponentInTree(component.children, updatedComponent),
      };
    }
    return component;
  });
}

export async function handleRefineComponent(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<MCPToolResult> {
  const sessionId = args.sessionId as string;
  const componentId = args.componentId as string | undefined;
  const componentType = args.componentType as string | undefined;
  const refinementDescription = args.refinementDescription as string;

  logger.info(`Refining component in session ${sessionId}`);

  const session = await sessionManager.loadSession(sessionId);
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

  const wireframeIds = await sessionManager.listWireframes(sessionId);
  if (!wireframeIds || wireframeIds.length === 0) {
    throw new Error(`No wireframes found for session ${sessionId}`);
  }

  const wireframeId = wireframeIds[0];
  const wireframe = await sessionManager.loadWireframe(sessionId, wireframeId);
  if (!wireframe) {
    throw new Error(`Failed to load wireframe ${wireframeId}`);
  }

  let targetComponent: WireframeComponent | null = null;

  if (componentId) {
    targetComponent = findComponentById(wireframe.components, componentId);
  } else if (componentType) {
    targetComponent = findFirstComponentByType(wireframe.components, componentType);
  }

  if (!targetComponent) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Component not found (id: ${componentId}, type: ${componentType})`,
        },
      ],
    };
  }

  const refinement = parseRefinementDescription(refinementDescription);
  const refinedComponent = applyRefinement(targetComponent, refinement);

  wireframe.components = updateComponentInTree(wireframe.components, refinedComponent);

  await pushHistory(sessionId, wireframe, sessionManager);

  await sessionManager.saveWireframe(sessionId, wireframe);

  logger.info(`Component ${targetComponent.id} refined successfully`);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Refined component '${targetComponent.type}'\n\nSession ID: ${sessionId}\nWireframe ID: ${wireframeId}\nComponent ID: ${componentId}\nRefinement: ${refinementDescription}`,
      },
    ],
  };
}

export const refineComponentSchema = {
  type: 'function' as const,
  function: {
    name: 'refine_component',
    description: 'Refine a specific component in the wireframe by ID or type',
    parameters: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string' as const,
          description: 'Session identifier',
        },
        componentId: {
          type: 'string' as const,
          description:
            'Component ID to refine (optional if componentType provided)',
        },
        componentType: {
          type: 'string' as const,
          description:
            'Component type to refine (sidebar, header, footer, grid, card, content, container)',
        },
        refinementDescription: {
          type: 'string' as const,
          description:
            'Natural language description of refinement (e.g., "add profile section at top", "make it narrower", "change to 4 columns")',
        },
      },
      required: ['sessionId', 'refinementDescription'],
    },
  },
};
