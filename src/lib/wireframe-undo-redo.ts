import { WireframeComponent } from '../types/index.js';
import { ComponentVersionManager } from './version-history.js';

export interface UndoRedoState {
  wireframeId: string;
  componentId: string;
  versionId: string;
}

export class WireframeUndoRedoManager {
  private undoStack: UndoRedoState[] = [];
  private redoStack: UndoRedoState[] = [];
  private versionManager: ComponentVersionManager;
  private sessionId: string;

  constructor(sessionId: string, versionManager: ComponentVersionManager) {
    this.sessionId = sessionId;
    this.versionManager = versionManager;
  }

  async recordChange(
    wireframeId: string,
    component: WireframeComponent,
    changeDescription: string
  ): Promise<void> {
    const version = await this.versionManager.recordVersion(
      this.sessionId,
      wireframeId,
      component,
      'updated',
      changeDescription
    );

    this.undoStack.push({
      wireframeId,
      componentId: component.id,
      versionId: version.versionId,
    });

    this.redoStack = [];
  }

  async undo(): Promise<WireframeComponent | null> {
    if (this.undoStack.length === 0) {
      return null;
    }

    const currentState = this.undoStack.pop()!;
    this.redoStack.push(currentState);

    if (this.undoStack.length === 0) {
      return null;
    }

    const previousState = this.undoStack[this.undoStack.length - 1];
    const version = await this.versionManager.getVersion(
      this.sessionId,
      previousState.wireframeId,
      previousState.componentId,
      previousState.versionId
    );

    return version ? version.componentState : null;
  }

  async redo(): Promise<WireframeComponent | null> {
    if (this.redoStack.length === 0) {
      return null;
    }

    const nextState = this.redoStack.pop()!;
    this.undoStack.push(nextState);

    const version = await this.versionManager.getVersion(
      this.sessionId,
      nextState.wireframeId,
      nextState.componentId,
      nextState.versionId
    );

    return version ? version.componentState : null;
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  getRedoStackSize(): number {
    return this.redoStack.length;
  }
}

export function createUndoRedoManager(
  sessionId: string,
  versionManager: ComponentVersionManager
): WireframeUndoRedoManager {
  return new WireframeUndoRedoManager(sessionId, versionManager);
}
