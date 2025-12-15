import { MCPToolResult, WireframeComponent } from '../../types/index.js';
import { SessionManager } from '../../session/session-manager.js';
import { Logger } from '../../utils/logger.js';
import { pushHistory } from './undo-wireframe.js';

const logger = new Logger('AdjustProportionsTool');

interface ProportionAdjustment {
  targetComponentId?: string;
  targetComponentType?: string;
  adjustments: {
    widthDelta?: number;
    heightDelta?: number;
    widthPercent?: number;
    heightPercent?: number;
    spacingDelta?: number;
  };
}

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

function adjustComponentProportions(
  component: WireframeComponent,
  adjustments: ProportionAdjustment['adjustments'],
  canvasWidth: number,
  canvasHeight: number
): WireframeComponent {
  const adjusted = { ...component };

  if (!adjusted.dimensions) {
    adjusted.dimensions = { width: 0, height: 0 };
  }

  if (!adjusted.properties) {
    adjusted.properties = {};
  }

  const currentWidth = adjusted.dimensions.width ?? 0;
  const currentHeight = adjusted.dimensions.height ?? 0;

  if (adjustments.widthDelta !== undefined) {
    adjusted.dimensions.width = Math.max(50, currentWidth + adjustments.widthDelta);
  }

  if (adjustments.heightDelta !== undefined) {
    adjusted.dimensions.height = Math.max(50, currentHeight + adjustments.heightDelta);
  }

  if (adjustments.widthPercent !== undefined) {
    adjusted.dimensions.width = Math.floor(canvasWidth * (adjustments.widthPercent / 100));
    adjusted.properties = {
      ...adjusted.properties,
      widthPercent: adjustments.widthPercent,
    };
  }

  if (adjustments.heightPercent !== undefined) {
    adjusted.dimensions.height = Math.floor(canvasHeight * (adjustments.heightPercent / 100));
    adjusted.properties = {
      ...adjusted.properties,
      heightPercent: adjustments.heightPercent,
    };
  }

  if (adjustments.spacingDelta !== undefined && adjusted.properties) {
    const currentSpacing = (adjusted.properties.spacing as number) ?? 16;
    adjusted.properties = {
      ...adjusted.properties,
      spacing: Math.max(0, currentSpacing + adjustments.spacingDelta),
    };
  }

  return adjusted;
}

function updateComponentInTree(
  components: WireframeComponent[],
  targetId: string,
  updatedComponent: WireframeComponent
): WireframeComponent[] {
  return components.map(component => {
    if (component.id === targetId) {
      return updatedComponent;
    }
    if (component.children) {
      return {
        ...component,
        children: updateComponentInTree(component.children, targetId, updatedComponent),
      };
    }
    return component;
  });
}

function recomputeAdjacentPositions(
  components: WireframeComponent[],
  adjustedComponentId: string,
  widthDelta: number
): WireframeComponent[] {
  const adjustedComponent = findComponentById(components, adjustedComponentId);
  if (!adjustedComponent || !adjustedComponent.position) {
    return components;
  }

  const adjustedX = adjustedComponent.position.x;

  return components.map(component => {
    if (component.id === adjustedComponentId || !component.position) {
      return component;
    }

    const compX = component.position.x;

    if (compX > adjustedX) {
      return {
        ...component,
        position: {
          ...component.position,
          x: compX + widthDelta,
        },
      };
    }

    return component;
  });
}

export async function handleAdjustProportions(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<MCPToolResult> {
  const sessionId = args.sessionId as string;
  const targetComponentId = args.targetComponentId as string | undefined;
  const targetComponentType = args.targetComponentType as string | undefined;
  const adjustments = args.adjustments as ProportionAdjustment['adjustments'];

  logger.info(`Adjusting proportions in session ${sessionId}`);

  const session = await sessionManager.loadSession(sessionId);
  if (!session) {
    return {
      content: [{
        type: 'text' as const,
        text: `Session ${sessionId} not found`,
      }],
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

  if (targetComponentId) {
    targetComponent = findComponentById(wireframe.components, targetComponentId);
  } else if (targetComponentType) {
    targetComponent = findFirstComponentByType(wireframe.components, targetComponentType);
  }

  if (!targetComponent) {
    return {
      content: [{
        type: 'text' as const,
        text: `Component not found (id: ${targetComponentId}, type: ${targetComponentType})`,
      }],
    };
  }

  const adjustedComponent = adjustComponentProportions(
    targetComponent,
    adjustments,
    wireframe.metadata.width,
    wireframe.metadata.height
  );

  let updatedComponents = updateComponentInTree(
    wireframe.components,
    targetComponent.id,
    adjustedComponent
  );

  if (adjustments.widthDelta !== undefined && adjustments.widthDelta !== 0) {
    updatedComponents = recomputeAdjacentPositions(
      updatedComponents,
      targetComponent.id,
      adjustments.widthDelta
    );
  }

  wireframe.components = updatedComponents;

  await pushHistory(sessionId, wireframe, sessionManager);

  await sessionManager.saveWireframe(sessionId, wireframe);

  logger.info(`Proportions adjusted for component ${targetComponent.id}`);

  return {
    content: [{
      type: 'text' as const,
      text: `Adjusted proportions for '${targetComponent.type}' (id: ${targetComponent.id}).\n\nSession ID: ${sessionId}\nWireframe ID: ${wireframeId}\nComponent ID: ${targetComponentId}\n\nAdjustments applied:\n${JSON.stringify(adjustments, null, 2)}`,
    }],
  };
}

export const adjustProportionsSchema = {
  type: 'function' as const,
  function: {
    name: 'adjust_proportions',
    description: 'Adjust dimensions and spacing of wireframe components while maintaining layout integrity',
    parameters: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string' as const,
          description: 'Session identifier',
        },
        targetComponentId: {
          type: 'string' as const,
          description: 'Component ID to adjust (optional if targetComponentType provided)',
        },
        targetComponentType: {
          type: 'string' as const,
          description: 'Component type to adjust (sidebar, header, footer, grid, card, content, container)',
        },
        adjustments: {
          type: 'object' as const,
          description: 'Proportion adjustments to apply',
          properties: {
            widthDelta: {
              type: 'number' as const,
              description: 'Change in width (pixels, can be negative)',
            },
            heightDelta: {
              type: 'number' as const,
              description: 'Change in height (pixels, can be negative)',
            },
            widthPercent: {
              type: 'number' as const,
              description: 'Set width as percentage of canvas width (0-100)',
            },
            heightPercent: {
              type: 'number' as const,
              description: 'Set height as percentage of canvas height (0-100)',
            },
            spacingDelta: {
              type: 'number' as const,
              description: 'Change in spacing for grid components (pixels, can be negative)',
            },
          },
        },
      },
      required: ['sessionId', 'adjustments'],
    },
  },
};
