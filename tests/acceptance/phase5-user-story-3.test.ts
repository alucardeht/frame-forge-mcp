import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { promises as fs } from 'fs';
import { SessionManager } from '../../src/session/session-manager.js';
import {
  handleGenerateWireframe,
  handleUpdateComponent,
  handleRefineComponent,
  handleAdjustProportions,
  handleUndoWireframe,
} from '../../src/mcp/tools/index.js';
import { exportComponent, batchExportComponents } from '../../src/lib/export-component.js';
import { MockMLXEngine } from '../../tests/mocks/mock-mlx-engine.js';

describe('Phase 5 - User Story 3: Create wireframes conversationally', () => {
  let sessionManager: SessionManager;
  let engine: MockMLXEngine;
  let testStorageDir: string;

  beforeEach(async () => {
    testStorageDir = path.join(process.cwd(), 'workspace', 'data', 'test-phase5');
    await fs.mkdir(testStorageDir, { recursive: true });
    sessionManager = new SessionManager(testStorageDir);
    await sessionManager.initialize();
    engine = new MockMLXEngine({
      modelName: 'flux-dev',
      cacheDir: path.join(testStorageDir, 'mlx-cache'),
      simulatedLatencyMs: 100,
    });
    await engine.initialize();
  });

  afterEach(async () => {
    await fs.rm(testStorageDir, { recursive: true, force: true });
  });

  describe('Scenario 1: Complete wireframe generation workflow', () => {
    it('should generate wireframe with layout description and dimensions', async () => {
      const sessionId = 'test-wireframe-generation';
      const session = await sessionManager.createSession();
      (session as any).id = sessionId;
      await sessionManager.saveSession(session);

      const result = await handleGenerateWireframe(
        {
          sessionId,
          layoutDescription: 'Dashboard with sidebar, header, and content area',
          dimensions: { width: 1200, height: 800 },
        },
        sessionManager
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const textBlock = result.content.find((c) => (c as any).type === 'text');
      expect(textBlock).toBeDefined();
      const textContent = (textBlock as any).text;
      expect(textContent).toMatch(/wireframe|created|generated/i);

      const loadedSession = await sessionManager.loadSession(sessionId);
      expect(loadedSession).toBeDefined();

      const wireframeIds = await sessionManager.listWireframes(sessionId);
      expect(wireframeIds.length).toBeGreaterThan(0);

      const wireframe = await sessionManager.loadWireframe(sessionId, wireframeIds[0]);
      expect(wireframe).toBeDefined();
      if (!wireframe) throw new Error('Wireframe not found');
      expect(wireframe.metadata.width).toBe(1200);
      expect(wireframe.metadata.height).toBe(800);
    });
  });

  describe('Scenario 2: Component update and refinement', () => {
    it('should update component properties and apply refinements', async () => {
      const sessionId = 'test-component-update';
      const session = await sessionManager.createSession();
      (session as any).id = sessionId;
      await sessionManager.saveSession(session);

      const generateResult = await handleGenerateWireframe(
        {
          sessionId,
          layoutDescription: 'Page with sidebar and 3 cards',
          dimensions: { width: 1200, height: 800 },
        },
        sessionManager
      );

      expect(generateResult).toBeDefined();

      const updateResult = await handleUpdateComponent(
        {
          sessionId,
          targetComponentType: 'card',
          updates: { properties: { color: 'blue' } },
        },
        sessionManager
      );

      expect(updateResult).toBeDefined();
      expect(updateResult.content).toBeDefined();
      const updateTextBlock = updateResult.content.find((c) => (c as any).type === 'text');
      expect(updateTextBlock).toBeDefined();
      expect((updateTextBlock as any).text).toMatch(/update|applied|modified/i);

      const wireframeIds = await sessionManager.listWireframes(sessionId);
      expect(wireframeIds.length).toBeGreaterThan(0);
      const wireframe = await sessionManager.loadWireframe(sessionId, wireframeIds[0]);
      expect(wireframe).toBeDefined();
      if (!wireframe) throw new Error('Wireframe not found');
      const grid = wireframe.components.find((c: any) => c.type === 'grid');
      expect(grid).toBeDefined();
      if (!grid) throw new Error('Grid component not found');
      const cardComponent = grid.children?.find((c: any) => c.type === 'card');
      expect(cardComponent).toBeDefined();
      if (!cardComponent) throw new Error('Card component not found');
      if (!cardComponent.properties) throw new Error('Card properties not defined');
      expect(cardComponent.properties.color).toBe('blue');

      const refineResult = await handleRefineComponent(
        {
          sessionId,
          componentId: cardComponent.id,
          refinementDescription: 'make it narrower',
        },
        sessionManager
      );

      expect(refineResult).toBeDefined();
      expect(refineResult.content).toBeDefined();
      const refineTextBlock = refineResult.content.find((c) => (c as any).type === 'text');
      expect(refineTextBlock).toBeDefined();
      expect((refineTextBlock as any).text).toMatch(/refine|narrow|adjust/i);
    });
  });

  describe('Scenario 3: Layout integrity and proportion adjustments', () => {
    it('should adjust component proportions while maintaining layout integrity', async () => {
      const sessionId = 'test-proportions';
      const session = await sessionManager.createSession();
      (session as any).id = sessionId;
      await sessionManager.saveSession(session);

      await handleGenerateWireframe(
        {
          sessionId,
          layoutDescription: 'Simple two-column layout',
          dimensions: { width: 1200, height: 800 },
        },
        sessionManager
      );

      const wireframeIds = await sessionManager.listWireframes(sessionId);
      expect(wireframeIds.length).toBeGreaterThan(0);
      const wireframe = await sessionManager.loadWireframe(sessionId, wireframeIds[0]);
      expect(wireframe).toBeDefined();
      if (!wireframe) throw new Error('Wireframe not found');
      const firstComponent = wireframe.components[0];

      const adjustResult = await handleAdjustProportions(
        {
          sessionId,
          targetComponentId: firstComponent.id,
          adjustments: { widthPercent: 50 },
        },
        sessionManager
      );

      expect(adjustResult).toBeDefined();
      expect(adjustResult.content).toBeDefined();

      const reloadedWireframeIds = await sessionManager.listWireframes(sessionId);
      expect(reloadedWireframeIds.length).toBeGreaterThan(0);
      const updatedWireframe = await sessionManager.loadWireframe(sessionId, reloadedWireframeIds[0]);
      expect(updatedWireframe).toBeDefined();
      if (!updatedWireframe) throw new Error('Updated wireframe not found');
      const updatedComponent = updatedWireframe.components.find(
        (c: any) => c.id === firstComponent.id
      );

      expect(updatedComponent?.properties?.widthPercent).toBe(50);

      const totalWidth = updatedWireframe.components.reduce(
        (sum: number, c: any) => sum + (c.properties?.widthPercent || 0),
        0
      );
      expect(totalWidth).toBeLessThanOrEqual(100);
    });
  });

  describe('Scenario 4: Component export to Figma SVG', () => {
    it('should export wireframe components as SVG and create batch export manifest', async () => {
      const sessionId = 'test-export';
      const session = await sessionManager.createSession();
      (session as any).id = sessionId;
      await sessionManager.saveSession(session);

      await handleGenerateWireframe(
        {
          sessionId,
          layoutDescription: 'Export test layout',
          dimensions: { width: 1200, height: 800 },
        },
        sessionManager
      );

      const wireframeIds = await sessionManager.listWireframes(sessionId);
      expect(wireframeIds.length).toBeGreaterThan(0);
      const wireframe = await sessionManager.loadWireframe(sessionId, wireframeIds[0]);
      expect(wireframe).toBeDefined();
      if (!wireframe) throw new Error('Wireframe not found');
      const firstComponent = wireframe.components[0];

      const exportDir = path.join(testStorageDir, 'exports');
      await fs.mkdir(exportDir, { recursive: true });

      const svgResult = await exportComponent(firstComponent, exportDir);
      expect(svgResult).toBeDefined();
      expect(svgResult.svgPath).toBeDefined();

      const svgExists = await fs
        .stat(svgResult.svgPath)
        .then(() => true)
        .catch(() => false);
      expect(svgExists).toBe(true);

      const svgContent = await fs.readFile(svgResult.svgPath, 'utf-8');
      expect(svgContent).toContain('<svg');
      expect(svgContent).toContain('</svg>');

      const batchResult = await batchExportComponents(
        wireframe,
        exportDir
      );
      expect(batchResult).toBeDefined();
      expect(batchResult.exportedComponents).toBeDefined();
      expect(Array.isArray(batchResult.exportedComponents)).toBe(true);
      expect(batchResult.exportedComponents.length).toBeGreaterThan(0);

      const manifestPath = path.join(exportDir, 'export-manifest.json');
      const manifestExists = await fs
        .stat(manifestPath)
        .then(() => true)
        .catch(() => false);
      expect(manifestExists).toBe(true);
    });
  });

  describe('Scenario 5: Undo/redo and version history', () => {
    it('should manage undo/redo stack and maintain version history', async () => {
      const sessionId = 'test-undo-redo';
      const session = await sessionManager.createSession();
      (session as any).id = sessionId;
      await sessionManager.saveSession(session);

      await handleGenerateWireframe(
        {
          sessionId,
          layoutDescription: 'Undo/redo test layout',
          dimensions: { width: 1200, height: 800 },
        },
        sessionManager
      );

      const wireframeIds = await sessionManager.listWireframes(sessionId);
      expect(wireframeIds.length).toBeGreaterThan(0);
      const wireframe = await sessionManager.loadWireframe(sessionId, wireframeIds[0]);
      expect(wireframe).toBeDefined();
      if (!wireframe) throw new Error('Wireframe not found');
      const componentId = wireframe.components[0].id;

      await handleUpdateComponent(
        {
          sessionId,
          targetComponentType: wireframe.components[0].type,
          updates: { properties: { backgroundColor: 'red' } },
        },
        sessionManager
      );

      const statusResult = await handleUndoWireframe(
        { sessionId, action: 'status' },
        sessionManager
      );
      expect(statusResult).toBeDefined();
      expect(statusResult.content).toBeDefined();
      const statusText = (statusResult.content.find((c) => (c as any).type === 'text') as any)
        .text;
      expect(statusText).toMatch(/undo|redo|history|stack/i);

      const undoResult = await handleUndoWireframe(
        { sessionId, action: 'undo' },
        sessionManager
      );
      expect(undoResult).toBeDefined();
      expect(undoResult.content).toBeDefined();

      const afterUndoWireframeIds = await sessionManager.listWireframes(sessionId);
      expect(afterUndoWireframeIds.length).toBeGreaterThan(0);
      const wireframeAfterUndo = await sessionManager.loadWireframe(sessionId, afterUndoWireframeIds[0]);
      expect(wireframeAfterUndo).toBeDefined();
      if (!wireframeAfterUndo) throw new Error('Wireframe after undo not found');
      const componentAfterUndo = wireframeAfterUndo.components.find(
        (c: any) => c.id === componentId
      );
      if (!componentAfterUndo) throw new Error('Component not found after undo');
      if (!componentAfterUndo.properties) throw new Error('Component properties not found');
      expect(componentAfterUndo.properties.backgroundColor).not.toBe('red');

      const redoResult = await handleUndoWireframe(
        { sessionId, action: 'redo' },
        sessionManager
      );
      expect(redoResult).toBeDefined();
      expect(redoResult.content).toBeDefined();

      const afterRedoWireframeIds = await sessionManager.listWireframes(sessionId);
      expect(afterRedoWireframeIds.length).toBeGreaterThan(0);
      const wireframeAfterRedo = await sessionManager.loadWireframe(sessionId, afterRedoWireframeIds[0]);
      expect(wireframeAfterRedo).toBeDefined();
      if (!wireframeAfterRedo) throw new Error('Wireframe after redo not found');
      const componentAfterRedo = wireframeAfterRedo.components.find(
        (c: any) => c.id === componentId
      );
      if (!componentAfterRedo) throw new Error('Component not found after redo');
      if (!componentAfterRedo.properties) throw new Error('Component properties not found');
      expect(componentAfterRedo.properties.backgroundColor).toBe('red');
    });
  });
});
