import { SessionManager } from '../../session/session-manager.js';
import type { Wireframe } from '../../types/index.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('UndoWireframeTool');

interface WireframeHistory {
  past: Wireframe[];
  present: Wireframe;
  future: Wireframe[];
}

const sessionHistories = new Map<string, Map<string, WireframeHistory>>();

function getHistory(sessionId: string, wireframeId: string): WireframeHistory | null {
  const sessionHistory = sessionHistories.get(sessionId);
  if (!sessionHistory) return null;
  return sessionHistory.get(wireframeId) || null;
}

export async function initializeHistory(
  sessionId: string,
  wireframe: Wireframe,
  _sessionManager: SessionManager
): Promise<void> {
  let sessionHistory = sessionHistories.get(sessionId);
  if (!sessionHistory) {
    sessionHistory = new Map();
    sessionHistories.set(sessionId, sessionHistory);
  }

  if (!sessionHistory.has(wireframe.id)) {
    sessionHistory.set(wireframe.id, {
      past: [],
      present: JSON.parse(JSON.stringify(wireframe)),
      future: [],
    });
  }
}

export async function pushHistory(
  sessionId: string,
  wireframe: Wireframe,
  _sessionManager: SessionManager
): Promise<void> {
  let sessionHistory = sessionHistories.get(sessionId);
  if (!sessionHistory) {
    sessionHistory = new Map();
    sessionHistories.set(sessionId, sessionHistory);
  }

  const history = sessionHistory.get(wireframe.id);
  if (!history) {
    sessionHistory.set(wireframe.id, {
      past: [],
      present: JSON.parse(JSON.stringify(wireframe)),
      future: [],
    });
    return;
  }

  history.past.push(JSON.parse(JSON.stringify(history.present)));
  history.present = JSON.parse(JSON.stringify(wireframe));
  history.future = [];

  if (history.past.length > 50) {
    history.past.shift();
  }
}

export async function handleUndoWireframe(
  args: { sessionId?: string; wireframeId?: string; action?: string },
  sessionManager: SessionManager
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const sessionId = args.sessionId as string;
  const action = (args.action as string) ?? 'undo';

  logger.info(`${action} action for session ${sessionId}`);

  const wireframeIds = await sessionManager.listWireframes(sessionId);
  if (!wireframeIds || wireframeIds.length === 0) {
    return {
      content: [{
        type: 'text',
        text: 'No wireframes found for this session',
      }],
    };
  }

  const wireframeId = args.wireframeId || wireframeIds[0];
  const wireframe = await sessionManager.loadWireframe(sessionId, wireframeId);
  if (!wireframe) {
    return {
      content: [{
        type: 'text',
        text: `Wireframe ${wireframeId} not found`,
      }],
    };
  }

  await initializeHistory(sessionId, wireframe, sessionManager);

  const history = getHistory(sessionId, wireframeId);
  if (!history) {
    return {
      content: [{
        type: 'text',
        text: 'No undo/redo history available for this wireframe',
      }],
    };
  }

  let newState: Wireframe;

  if (action === 'undo') {
    if (history.past.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'Nothing to undo',
        }],
      };
    }

    history.future.unshift(JSON.parse(JSON.stringify(history.present)));
    newState = history.past.pop()!;
    history.present = JSON.parse(JSON.stringify(newState));

  } else if (action === 'redo') {
    if (history.future.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'Nothing to redo',
        }],
      };
    }

    history.past.push(JSON.parse(JSON.stringify(history.present)));
    newState = history.future.shift()!;
    history.present = JSON.parse(JSON.stringify(newState));

  } else if (action === 'status') {
    return {
      content: [{
        type: 'text',
        text: `Undo/Redo Status:\n- Undo available: ${history.past.length > 0 ? 'Yes' : 'No'} (${history.past.length} states)\n- Redo available: ${history.future.length > 0 ? 'Yes' : 'No'} (${history.future.length} states)`,
      }],
    };

  } else {
    return {
      content: [{
        type: 'text',
        text: `Unknown action: ${action}. Use 'undo', 'redo', or 'status'`,
      }],
    };
  }

  await sessionManager.saveWireframe(sessionId, newState);

  return {
    content: [{
      type: 'text',
      text: `${action === 'undo' ? 'Undo' : 'Redo'} successful\n\nSession ID: ${sessionId}\nWireframe ID: ${wireframeId}\nUndo stack depth: ${history.past.length}\nRedo stack depth: ${history.future.length}`,
    }],
  };
}

export const undoWireframeSchema = {
  type: 'function' as const,
  function: {
    name: 'undo_wireframe',
    description: 'Undo or redo wireframe component changes',
    parameters: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string' as const,
          description: 'Session identifier',
        },
        action: {
          type: 'string' as const,
          description: 'Action to perform: undo, redo, or status (default: undo)',
        },
      },
      required: ['sessionId'],
    },
  },
};
