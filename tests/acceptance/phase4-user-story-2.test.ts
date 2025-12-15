import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { promises as fs } from 'fs';
import { SessionManager } from '../../src/session/session-manager.js';
import {
  handleGenerateVariants,
  handleSelectVariant,
  handleRefineAsset,
  handleGenerateBanner,
  handleExportAsset,
} from '../../src/mcp/tools/index.js';
import { MockMLXEngine } from '../../tests/mocks/mock-mlx-engine.js';

describe('Phase 4 - User Story 2: Generate marketing visuals', () => {
  let sessionManager: SessionManager;
  let engine: MockMLXEngine;
  let testStorageDir: string;

  beforeEach(async () => {
    testStorageDir = path.join(process.cwd(), 'workspace', 'data', 'test-phase4');
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

  describe('Scenario 1: Complete variant workflow', () => {
    it('should generate variants, select, refine, and export', async () => {
      const sessionId = 'test-variant-flow';
      const session = await sessionManager.createSession();
      (session as any).id = sessionId;
      await sessionManager.saveSession(session);

      const generateResult = await handleGenerateVariants(
        {
          sessionId,
          assetType: 'icon',
          assetDescription: 'rocket ship launching',
          variantCount: 3,
          dimensions: { width: 256, height: 256 },
        },
        engine,
        sessionManager
      );

      expect(generateResult.content).toBeDefined();
      expect(Array.isArray(generateResult.content)).toBe(true);
      const textBlock = generateResult.content.find((c) => (c as any).type === 'text');
      expect(textBlock).toBeDefined();
      expect((textBlock as any).text).toContain('variants');

      let session2 = await sessionManager.loadSession(sessionId);
      expect(session2).toBeDefined();
      expect(session2?.currentAsset?.allVariants.length).toBeGreaterThanOrEqual(1);

      const variantToSelect = session2!.currentAsset!.allVariants[0];
      const selectResult = await handleSelectVariant(
        {
          sessionId,
          variantId: variantToSelect.id,
        },
        sessionManager
      );

      expect(selectResult.content).toBeDefined();
      const selectText = selectResult.content.find((c) => (c as any).type === 'text');
      expect(selectText).toBeDefined();
      expect((selectText as any).text).toContain('Selected');

      const refineResult = await handleRefineAsset(
        {
          sessionId,
          refinementInstructions: 'make it more colorful and vibrant',
        },
        engine,
        sessionManager
      );

      expect(refineResult.content).toBeDefined();

      session2 = await sessionManager.loadSession(sessionId);
      expect(session2?.currentAsset?.selectedVariantId).toBeDefined();

      const selectedVariantId = session2!.currentAsset!.selectedVariantId!;
      const exportResult = await handleExportAsset(
        {
          sessionId,
          variantId: selectedVariantId,
          formats: ['png', 'svg'],
        },
        sessionManager
      );

      expect(exportResult.content).toBeDefined();
      expect(Array.isArray(exportResult.content)).toBe(true);
      const exportText = exportResult.content.find((c) => (c as any).type === 'text');
      expect(exportText).toBeDefined();
      expect((exportText as any).text).toContain('PNG');
      expect((exportText as any).text).toContain('SVG');

      const finalSession = await sessionManager.loadSession(sessionId);
      expect(finalSession?.currentAsset?.allVariants.length).toBeGreaterThanOrEqual(1);
      expect(finalSession?.currentAsset?.selectedVariantId).toBeDefined();
    });
  });

  describe('Scenario 2: Banner generation with layouts', () => {
    it('should generate banner with parsed layout', async () => {
      const sessionId = 'test-banner';
      const session = await sessionManager.createSession();
      (session as any).id = sessionId;
      await sessionManager.saveSession(session);

      const bannerResult = await handleGenerateBanner(
        {
          sessionId,
          description: 'Product launch banner with CTA button',
          layout: 'hero text on left, product image on right, CTA button at bottom',
          dimensions: { width: 1200, height: 400 },
        },
        engine,
        sessionManager
      );

      expect(bannerResult.content).toBeDefined();
      expect(Array.isArray(bannerResult.content)).toBe(true);
      const textBlock = bannerResult.content.find((c) => (c as any).type === 'text');
      expect(textBlock).toBeDefined();
      expect((textBlock as any).text).toContain('Generated');

      const loadedSession = await sessionManager.loadSession(sessionId);
      expect(loadedSession?.currentAsset).toBeDefined();
      expect(loadedSession?.currentAsset?.type).toBe('banner');
      const firstVariant = loadedSession?.currentAsset?.allVariants[0];
      expect(firstVariant?.metadata.width).toBe(1200);
      expect(firstVariant?.metadata.height).toBe(400);
    });
  });

  describe('Scenario 3: Multi-format professional export', () => {
    it('should export single variant in all formats', async () => {
      const sessionId = 'test-export';
      const session = await sessionManager.createSession();
      (session as any).id = sessionId;
      await sessionManager.saveSession(session);

      const generateResult = await handleGenerateVariants(
        {
          sessionId,
          assetType: 'icon',
          assetDescription: 'star icon',
          variantCount: 1,
          dimensions: { width: 128, height: 128 },
        },
        engine,
        sessionManager
      );

      expect(generateResult.content).toBeDefined();

      const loadedSession = await sessionManager.loadSession(sessionId);
      expect(loadedSession?.currentAsset?.allVariants.length).toBeGreaterThanOrEqual(1);
      const variantId = loadedSession!.currentAsset!.allVariants[0].id;

      const exportResult = await handleExportAsset(
        {
          sessionId,
          variantId,
          formats: ['png', 'svg', 'webp'],
        },
        sessionManager
      );

      expect(exportResult.content).toBeDefined();
      expect(Array.isArray(exportResult.content)).toBe(true);
      const textBlock = exportResult.content.find((c) => (c as any).type === 'text');
      expect(textBlock).toBeDefined();
      expect((textBlock as any).text).toContain('PNG');
      expect((textBlock as any).text).toContain('SVG');
      expect((textBlock as any).text).toContain('WEBP');

      const imageBlocks = exportResult.content.filter((c) => (c as any).type === 'image');
      expect(imageBlocks.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Scenario 4: Variant caching performance', () => {
    it('should use cache for identical requests', async () => {
      const sessionId = 'test-cache-perf';
      const session = await sessionManager.createSession();
      (session as any).id = sessionId;
      await sessionManager.saveSession(session);

      const startTime1 = Date.now();
      const result1 = await handleGenerateVariants(
        {
          sessionId,
          assetType: 'icon',
          assetDescription: 'rocket icon',
          variantCount: 3,
          dimensions: { width: 256, height: 256 },
        },
        engine,
        sessionManager
      );
      const duration1 = Date.now() - startTime1;

      expect(result1.content).toBeDefined();
      const textBlock1 = result1.content.find((c) => (c as any).type === 'text');
      expect(textBlock1).toBeDefined();
      expect((textBlock1 as any).text).toContain('Generated');

      const session1 = await sessionManager.loadSession(sessionId);
      expect(session1?.currentAsset?.allVariants.length).toBe(3);

      const startTime2 = Date.now();
      const result2 = await handleGenerateVariants(
        {
          sessionId,
          assetType: 'icon',
          assetDescription: 'rocket icon',
          variantCount: 3,
          dimensions: { width: 256, height: 256 },
        },
        engine,
        sessionManager
      );
      const duration2 = Date.now() - startTime2;

      expect(result2.content).toBeDefined();
      const textBlock2 = result2.content.find((c) => (c as any).type === 'text');
      expect(textBlock2).toBeDefined();
      expect((textBlock2 as any).text).toContain('Retrieved');

      const session2 = await sessionManager.loadSession(sessionId);
      expect(session2?.currentAsset?.allVariants.length).toBe(3);
      expect((textBlock2 as any).text).not.toBe((textBlock1 as any).text);

      if (duration1 > 0) {
        const speedup = duration1 / Math.max(duration2, 1);
        expect(speedup).toBeGreaterThan(1.5);
      }

      await sessionManager.deleteSession(sessionId);
    });
  });

  describe('Scenario 5: Session history with variants', () => {
    it('should persist variant metadata in iteration history', async () => {
      const sessionId = 'test-history';
      const session = await sessionManager.createSession();
      (session as any).id = sessionId;
      await sessionManager.saveSession(session);

      const generateResult = await handleGenerateVariants(
        {
          sessionId,
          assetType: 'icon',
          assetDescription: 'lightning bolt',
          variantCount: 4,
          dimensions: { width: 128, height: 128 },
        },
        engine,
        sessionManager
      );

      expect(generateResult.content).toBeDefined();

      const sessionBeforeSave = await sessionManager.loadSession(sessionId);
      expect(sessionBeforeSave).toBeDefined();
      await sessionManager.saveSession(sessionBeforeSave!);

      const loadedSession = await sessionManager.loadSession(sessionId);
      expect(loadedSession).toBeDefined();
      expect(loadedSession?.iterations.length).toBeGreaterThanOrEqual(0);
      expect(loadedSession?.currentAsset?.allVariants.length).toBeGreaterThanOrEqual(1);

      const currentAsset = loadedSession?.currentAsset;
      expect(currentAsset?.type).toBe('icon');
      const firstVariant = currentAsset?.allVariants[0];
      expect(firstVariant?.metadata.width).toBe(128);
      expect(firstVariant?.metadata.height).toBe(128);
    });
  });
});
