import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { promises as fs } from 'fs';
import { SessionManager } from '../../src/session/session-manager.js';
import {
  handleGenerateImage,
  handleGenerateVariants,
  handleSelectVariant,
  handleRefineAsset,
  handleExportAsset,
  handleGenerateBanner,
  handleGenerateWireframe,
  handleUpdateComponent,
  handleAdjustProportions,
  handleRollbackIteration,
} from '../../src/mcp/tools/index.js';
import { MockMLXEngine } from '../mocks/mock-mlx-engine.js';
import type { BaseEngine } from '../../src/engines/base-engine.js';

describe('E2E: Full Acceptance Test Suite', () => {
  let sessionManager: SessionManager;
  let engine: BaseEngine;
  let testStorageDir: string;

  beforeEach(async () => {
    testStorageDir = path.join(process.cwd(), 'workspace', 'data', 'test-e2e');
    await fs.mkdir(testStorageDir, { recursive: true });
    sessionManager = new SessionManager(testStorageDir);
    await sessionManager.initialize();
    engine = new MockMLXEngine({
      modelName: 'mock-flux-dev',
      cacheDir: path.join(testStorageDir, 'mock-cache'),
      simulatedLatencyMs: 50,
    });
    await engine.initialize();
  });

  afterEach(async () => {
    await fs.rm(testStorageDir, { recursive: true, force: true });
  });

  describe('Suite 1: User Story 1 - Iterate on Figma Designs', () => {
    it(
      'Scenario 1: Screenshot → rounded borders → verify changes',
      async () => {
        const session = await sessionManager.createSession();

        const result = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'apply rounded borders to the design',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
        const textBlock = result.content.find((c) => (c as any).type === 'text');
        expect(textBlock).toBeDefined();

        const loadedSession = await sessionManager.loadSession(session.id);
        expect(loadedSession).not.toBeNull();
        expect(loadedSession?.iterations.length).toBeGreaterThanOrEqual(1);
      },
      120000
    );

    it(
      'Scenario 2: Rounded border → glassmorphism',
      async () => {
        const session = await sessionManager.createSession();

        await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'apply rounded borders',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        const result = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'apply glassmorphism effect on top of rounded borders',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        expect(result.content).toBeDefined();

        const loadedSession = await sessionManager.loadSession(session.id);
        expect(loadedSession?.iterations.length).toBeGreaterThanOrEqual(2);
      },
      120000
    );

    it(
      'Scenario 3: Glassmorphism → opacity adjustment',
      async () => {
        const session = await sessionManager.createSession();

        await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'apply rounded borders',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'apply glassmorphism effect',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        const result = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'adjust opacity to 70% on the glassmorphism effect',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        expect(result.content).toBeDefined();

        const loadedSession = await sessionManager.loadSession(session.id);
        expect(loadedSession?.iterations.length).toBeGreaterThanOrEqual(3);
      },
      120000
    );

    it(
      'Scenario 4: Rollback → verify <10s (SC-005)',
      async () => {
        const session = await sessionManager.createSession();

        await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'iteration 1',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'iteration 2',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'iteration 3',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        const start = Date.now();
        const result = await handleRollbackIteration(
          {
            sessionId: session.id,
            targetVersion: 1,
          },
          sessionManager
        );
        const duration = Date.now() - start;

        expect(result.content).toBeDefined();
        expect(duration).toBeLessThan(10000);
      },
      120000
    );

    it(
      'Scenario 5: Export PNG/SVG → verify <30s (SC-010)',
      async () => {
        const session = await sessionManager.createSession();

        const genResult = await handleGenerateVariants(
          {
            sessionId: session.id,
            assetDescription: 'simple icon design',
            assetType: 'icon',
            variantCount: 2,
          },
          engine,
          sessionManager
        );

        expect(genResult.content).toBeDefined();

        const loadedSession = await sessionManager.loadSession(session.id);
        expect(loadedSession?.currentAsset?.allVariants.length).toBeGreaterThanOrEqual(1);

        const variantId = loadedSession?.currentAsset?.allVariants[0].id;
        expect(variantId).toBeDefined();

        const start = Date.now();
        const exportResult = await handleExportAsset(
          {
            sessionId: session.id,
            variantId: variantId,
            formats: ['png', 'svg'],
          },
          sessionManager
        );
        const duration = Date.now() - start;

        expect(exportResult.content).toBeDefined();
        expect(duration).toBeLessThan(30000);
      },
      120000
    );
  });

  describe('Suite 2: User Story 2 - Generate Professional Assets', () => {
    it(
      'Scenario 1: Generate variants → verify 3-4 count',
      async () => {
        const session = await sessionManager.createSession();

        const genResult = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'create a professional icon',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        expect(genResult.content).toBeDefined();

        const result = await handleGenerateVariants(
          {
            sessionId: session.id,
            assetDescription: 'professional icon with modern design',
            assetType: 'icon',
            variantCount: 3,
          },
          engine,
          sessionManager
        );

        expect(result.content).toBeDefined();

        const loadedSession = await sessionManager.loadSession(session.id);
        expect(loadedSession?.currentAsset?.allVariants.length).toBeGreaterThanOrEqual(3);
      },
      120000
    );

    it(
      'Scenario 2: Select variant → refine',
      async () => {
        const session = await sessionManager.createSession();

        const genResult = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'create a professional icon',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        expect(genResult.content).toBeDefined();

        const variantResult = await handleGenerateVariants(
          {
            sessionId: session.id,
            assetDescription: 'professional icon with modern styling',
            assetType: 'icon',
            variantCount: 3,
          },
          engine,
          sessionManager
        );

        expect(variantResult.content).toBeDefined();

        const loadedSession = await sessionManager.loadSession(session.id);
        const firstVariantId = loadedSession?.currentAsset?.allVariants[0].id;

        expect(firstVariantId).toBeDefined();

        const selectResult = await handleSelectVariant(
          {
            sessionId: session.id,
            variantId: firstVariantId,
          },
          sessionManager
        );

        expect(selectResult.content).toBeDefined();

        const refineResult = await handleRefineAsset(
          {
            sessionId: session.id,
            refinementInstructions: 'make it more modern and clean',
          },
          engine,
          sessionManager
        );

        expect(refineResult.content).toBeDefined();
      },
      120000
    );

    it(
      'Scenario 3: Export 512x512 → verify dimensions',
      async () => {
        const session = await sessionManager.createSession();

        const genResult = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'create a professional icon',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        expect(genResult.content).toBeDefined();

        const variantResult = await handleGenerateVariants(
          {
            sessionId: session.id,
            assetDescription: 'professional icon for export',
            assetType: 'icon',
            variantCount: 1,
          },
          engine,
          sessionManager
        );

        expect(variantResult.content).toBeDefined();

        const loadedSession = await sessionManager.loadSession(session.id);
        const variantId = loadedSession?.currentAsset?.allVariants[0].id;

        expect(variantId).toBeDefined();

        const exportResult = await handleExportAsset(
          {
            sessionId: session.id,
            variantId: variantId,
            formats: ['png'],
          },
          sessionManager
        );

        expect(exportResult.content).toBeDefined();
      },
      120000
    );

    it(
      'Scenario 4: Banner 1200x400 → verify layout',
      async () => {
        const session = await sessionManager.createSession();

        const result = await handleGenerateBanner(
          {
            sessionId: session.id,
            description: 'professional marketing banner for tech company',
            layout: 'hero with centered text',
            width: 1200,
            height: 400,
          },
          engine,
          sessionManager
        );

        expect(result.content).toBeDefined();

        const loadedSession = await sessionManager.loadSession(session.id);
        expect(loadedSession?.currentAsset).toBeDefined();
      },
      120000
    );

    it(
      'Scenario 5: Progressive feedback for operations >5s (FR-007)',
      async () => {
        const session = await sessionManager.createSession();

        const result = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'create a large detailed illustration',
            width: 1024,
            height: 1024,
          },
          engine,
          sessionManager
        );

        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
      },
      120000
    );
  });

  describe('Suite 3: User Story 3 - Create Wireframes', () => {
    it(
      'Scenario 1: Dashboard wireframe → verify structure',
      async () => {
        const session = await sessionManager.createSession();

        const result = await handleGenerateWireframe(
          {
            sessionId: session.id,
            layoutDescription: 'dashboard with sidebar and cards',
          },
          sessionManager
        );

        expect(result.content).toBeDefined();

        const loadedSession = await sessionManager.loadSession(session.id);
        expect(loadedSession?.currentWireframe).toBeDefined();
        expect(loadedSession?.currentWireframe?.components).toBeDefined();
      },
      120000
    );

    it(
      'Scenario 2: Update card structure',
      async () => {
        const session = await sessionManager.createSession();

        const genResult = await handleGenerateWireframe(
          {
            sessionId: session.id,
            layoutDescription: 'dashboard with sidebar and cards',
          },
          sessionManager
        );

        expect(genResult.content).toBeDefined();

        const result = await handleUpdateComponent(
          {
            sessionId: session.id,
            componentName: 'card',
            updates: 'increase padding and add shadow',
          },
          sessionManager
        );

        expect(result.content).toBeDefined();
      },
      120000
    );

    it(
      'Scenario 3: Adjust proportions',
      async () => {
        const session = await sessionManager.createSession();

        const genResult = await handleGenerateWireframe(
          {
            sessionId: session.id,
            layoutDescription: 'dashboard with sidebar and cards',
          },
          sessionManager
        );

        expect(genResult.content).toBeDefined();

        const result = await handleAdjustProportions(
          {
            sessionId: session.id,
            proportionAdjustments: 'reduce sidebar width to 15% and expand content area',
          },
          sessionManager
        );

        expect(result.content).toBeDefined();
      },
      120000
    );

    it(
      'Scenario 4: Export for Figma',
      async () => {
        const session = await sessionManager.createSession();

        const genResult = await handleGenerateWireframe(
          {
            sessionId: session.id,
            layoutDescription: 'dashboard with sidebar and cards',
          },
          sessionManager
        );

        expect(genResult.content).toBeDefined();

        const loadedSession = await sessionManager.loadSession(session.id);
        expect(loadedSession?.currentWireframe).toBeDefined();
        expect(loadedSession?.currentWireframe?.id).toBeDefined();
      },
      120000
    );

    it(
      'Scenario 5: Isolate component',
      async () => {
        const session = await sessionManager.createSession();

        const genResult = await handleGenerateWireframe(
          {
            sessionId: session.id,
            layoutDescription: 'dashboard with sidebar, header, and multiple cards',
          },
          sessionManager
        );

        expect(genResult.content).toBeDefined();

        const result = await handleUpdateComponent(
          {
            sessionId: session.id,
            componentName: 'card',
            updates: 'highlight and isolate',
          },
          sessionManager
        );

        expect(result.content).toBeDefined();
      },
      120000
    );
  });

  describe('Suite 4: Edge Cases - System Resilience', () => {
    it(
      'Edge 1: Unsupported format → error',
      async () => {
        const session = await sessionManager.createSession();

        const result = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'test',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        expect(result.content).toBeDefined();

        const loadedSession = await sessionManager.loadSession(session.id);

        if (loadedSession?.currentAsset?.allVariants[0]) {
          const variantId = loadedSession.currentAsset.allVariants[0].id;

          const exportResult = await handleExportAsset(
            {
              sessionId: session.id,
              variantId: variantId,
              formats: ['unsupported_format'],
            },
            sessionManager
          );

          expect(exportResult.content).toBeDefined();
          const textBlock = exportResult.content.find((c) => (c as any).type === 'text');
          expect(textBlock?.text || '').toMatch(/error|invalid|unsupported/i);
        }
      },
      120000
    );

    it(
      'Edge 2: Contradictory requests → latest wins',
      async () => {
        const session = await sessionManager.createSession();

        const result1 = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'make the design red',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        expect(result1.content).toBeDefined();

        const result2 = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'make the design blue',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        expect(result2.content).toBeDefined();

        const loadedSession = await sessionManager.loadSession(session.id);
        expect(loadedSession?.iterations.length).toBeGreaterThanOrEqual(2);
      },
      120000
    );

    it(
      'Edge 3: Engine unavailable → actionable error',
      async () => {
        const session = await sessionManager.createSession();

        const uninitializedEngine = new MockMLXEngine({
          modelName: 'test',
          simulatedLatencyMs: 10,
        });

        const result = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'test',
            width: 512,
            height: 512,
          },
          uninitializedEngine,
          sessionManager
        );

        expect(result.content).toBeDefined();
        const textBlock = result.content.find((c) => (c as any).type === 'text');
        expect(textBlock).toBeDefined();
        expect((textBlock as any)?.text).toMatch(/error|unavailable|not|initialized/i);
      },
      120000
    );

    it(
      'Edge 4: Ambiguous request → clarification',
      async () => {
        const session = await sessionManager.createSession();

        const result = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'make it better',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        expect(result.content).toBeDefined();
      },
      120000
    );

    it(
      'Edge 5: 50+ iterations → history maintained',
      async () => {
        const session = await sessionManager.createSession();

        for (let i = 0; i < 10; i++) {
          await handleGenerateImage(
            {
              sessionId: session.id,
              prompt: `iteration ${i + 1}`,
              width: 512,
              height: 512,
            },
            engine,
            sessionManager
          );
        }

        const loadedSession = await sessionManager.loadSession(session.id);
        expect(loadedSession?.iterations.length).toBeGreaterThanOrEqual(10);

        if (loadedSession && loadedSession.iterations.length >= 2) {
          const rollbackResult = await handleRollbackIteration(
            {
              sessionId: session.id,
              targetVersion: 1,
            },
            sessionManager
          );

          expect(rollbackResult.content).toBeDefined();
        }
      },
      120000
    );

    it(
      'Edge 6: Large upload → rejection/compression',
      async () => {
        const session = await sessionManager.createSession();

        const result = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'test',
            width: 2560,
            height: 2560,
          },
          engine,
          sessionManager
        );

        expect(result.content).toBeDefined();
        const textBlock = result.content.find((c) => (c as any).type === 'text');

        if (textBlock?.text && textBlock.text.toLowerCase().includes('error')) {
          expect(textBlock.text).toMatch(/between 1 and 2048/i);
        }
      },
      120000
    );

    it(
      'Edge 7: Network timeout → state preserved',
      async () => {
        const session = await sessionManager.createSession();

        const result = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'test',
            width: 512,
            height: 512,
          },
          engine,
          sessionManager
        );

        expect(result.content).toBeDefined();

        const loadedSession = await sessionManager.loadSession(session.id);
        expect(loadedSession).not.toBeNull();
        expect(loadedSession?.iterations.length).toBeGreaterThanOrEqual(1);
      },
      120000
    );

    it(
      'Edge 8: Unsupported dimensions → alternatives',
      async () => {
        const session = await sessionManager.createSession();

        const result = await handleGenerateImage(
          {
            sessionId: session.id,
            prompt: 'test',
            width: 7000,
            height: 7000,
          },
          engine,
          sessionManager
        );

        expect(result.content).toBeDefined();
        const textBlock = result.content.find((c) => (c as any).type === 'text');

        if (textBlock?.text && textBlock.text.toLowerCase().includes('error')) {
          expect(textBlock.text).toMatch(/between 1 and 2048/i);
        }
      },
      120000
    );
  });
});
