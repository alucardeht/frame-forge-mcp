import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SessionManager } from '../../src/session/session-manager.js';
import { handleExportAsset } from '../../src/mcp/tools/export-asset.js';
import type { Variant, AssetSession } from '../../src/types/index.js';
import { promises as fs } from 'fs';
import path from 'path';

const MOCK_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('T055 - Export Asset Integration Tests', () => {
  let sessionManager: SessionManager;
  let testSessionId: string;
  const testDataDir = path.join(process.cwd(), 'workspace', 'data', 'test-sessions');

  beforeEach(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
    sessionManager = new SessionManager(testDataDir);
    await sessionManager.initialize();

    const session = await sessionManager.createSession();
    testSessionId = session.id;

    const assetSession: AssetSession = {
      type: 'icon',
      allVariants: [],
      refinements: [],
    };

    session.currentAsset = assetSession;
    await sessionManager.saveSession(session);
  });

  afterEach(async () => {
    if (testSessionId) {
      await sessionManager.deleteSession(testSessionId);
    }
  });

  function createMockVariant(id: string, prompt: string, width: number = 256, height: number = 256): Variant {
    return {
      id,
      imageBase64: MOCK_PNG_BASE64,
      seed: 12345,
      prompt,
      metadata: {
        width,
        height,
        steps: 20,
        latencyMs: 3000,
      },
    };
  }

  async function addVariantToSession(variant: Variant): Promise<void> {
    const session = await sessionManager.loadSession(testSessionId);
    if (!session || !session.currentAsset) {
      throw new Error('Session or asset not found');
    }

    session.currentAsset.allVariants.push(variant);
    session.currentAsset.selectedVariantId = variant.id;
    await sessionManager.saveSession(session);
  }

  it('should export variant in PNG format', async () => {
    const variant = createMockVariant('variant-1', 'test icon design');
    await addVariantToSession(variant);

    const result = await handleExportAsset(
      {
        sessionId: testSessionId,
        variantId: 'variant-1',
        formats: ['png'],
      },
      sessionManager
    );

    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);

    const textBlock = result.content.find(block => block.type === 'text');
    expect(textBlock).toBeDefined();
    expect(textBlock?.type).toBe('text');

    const imageBlocks = result.content.filter(block => block.type === 'image');
    expect(imageBlocks.length).toBeGreaterThanOrEqual(1);

    const pngBlock = imageBlocks.find(block => block.mimeType === 'image/png');
    expect(pngBlock).toBeDefined();
    expect(pngBlock?.mimeType).toBe('image/png');
    expect(pngBlock?.data).toBeDefined();
  });

  it('should export variant in SVG format', async () => {
    const variant = createMockVariant('variant-2', 'vector icon');
    await addVariantToSession(variant);

    const result = await handleExportAsset(
      {
        sessionId: testSessionId,
        variantId: 'variant-2',
        formats: ['svg'],
      },
      sessionManager
    );

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    const imageBlocks = result.content.filter(block => block.type === 'image');
    expect(imageBlocks.length).toBeGreaterThanOrEqual(1);

    const svgBlock = imageBlocks.find(block => block.mimeType === 'image/svg+xml');
    expect(svgBlock).toBeDefined();
    expect(svgBlock?.mimeType).toBe('image/svg+xml');
  });

  it('should export variant in WebP format', async () => {
    const variant = createMockVariant('variant-3', 'optimized icon');
    await addVariantToSession(variant);

    const result = await handleExportAsset(
      {
        sessionId: testSessionId,
        variantId: 'variant-3',
        formats: ['webp'],
      },
      sessionManager
    );

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    const imageBlocks = result.content.filter(block => block.type === 'image');
    expect(imageBlocks.length).toBeGreaterThanOrEqual(1);

    const webpBlock = imageBlocks.find(block => block.mimeType === 'image/webp');
    expect(webpBlock).toBeDefined();
    expect(webpBlock?.mimeType).toBe('image/webp');
  });

  it('should export variant in multiple formats (batch)', async () => {
    const variant = createMockVariant('variant-4', 'multi-format export');
    await addVariantToSession(variant);

    const result = await handleExportAsset(
      {
        sessionId: testSessionId,
        variantId: 'variant-4',
        formats: ['png', 'svg', 'webp'],
      },
      sessionManager
    );

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    const textBlock = result.content.find(block => block.type === 'text');
    expect(textBlock).toBeDefined();
    expect(textBlock?.text).toContain('PNG');
    expect(textBlock?.text).toContain('SVG');
    expect(textBlock?.text).toContain('WEBP');

    const imageBlocks = result.content.filter(block => block.type === 'image');
    expect(imageBlocks.length).toBe(3);

    const mimeTypes = imageBlocks.map(block => block.mimeType).sort();
    expect(mimeTypes).toEqual(['image/png', 'image/svg+xml', 'image/webp'].sort());
  });

  it('should apply resolution scaling (2x)', async () => {
    const variant = createMockVariant('variant-5', 'scaled icon', 128, 128);
    await addVariantToSession(variant);

    const result = await handleExportAsset(
      {
        sessionId: testSessionId,
        variantId: 'variant-5',
        formats: ['png'],
        resolution: '2x',
      },
      sessionManager
    );

    expect(result.content).toBeDefined();

    const textBlock = result.content.find(block => block.type === 'text');
    expect(textBlock).toBeDefined();
    expect(textBlock?.text).toContain('@2x');
    expect(textBlock?.text).toContain('256x256');
  });

  it('should apply resolution scaling (3x)', async () => {
    const variant = createMockVariant('variant-6', 'triple scaled icon', 128, 128);
    await addVariantToSession(variant);

    const result = await handleExportAsset(
      {
        sessionId: testSessionId,
        variantId: 'variant-6',
        formats: ['png'],
        resolution: '3x',
      },
      sessionManager
    );

    expect(result.content).toBeDefined();

    const textBlock = result.content.find(block => block.type === 'text');
    expect(textBlock).toBeDefined();
    expect(textBlock?.text).toContain('@3x');
    expect(textBlock?.text).toContain('384x384');
  });

  it('should validate dimensions and include warnings', async () => {
    const variant = createMockVariant('variant-7', 'oversized icon', 1024, 1024);
    await addVariantToSession(variant);

    const result = await handleExportAsset(
      {
        sessionId: testSessionId,
        variantId: 'variant-7',
        formats: ['png'],
      },
      sessionManager
    );

    expect(result.content).toBeDefined();

    const textBlock = result.content.find(block => block.type === 'text');
    expect(textBlock).toBeDefined();
    expect(textBlock?.text).toContain('Validation Warning');
  });

  it('should return error if variant not found', async () => {
    const result = await handleExportAsset(
      {
        sessionId: testSessionId,
        variantId: 'non-existent-variant',
        formats: ['png'],
      },
      sessionManager
    );

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    const textBlock = result.content.find(block => block.type === 'text');
    expect(textBlock).toBeDefined();
    expect(textBlock?.type).toBe('text');
    expect(textBlock?.text).toContain('not found');
  });

  it('should include AssetMetadata in response', async () => {
    const variant = createMockVariant('variant-8', 'metadata test');
    await addVariantToSession(variant);

    const result = await handleExportAsset(
      {
        sessionId: testSessionId,
        variantId: 'variant-8',
        formats: ['png', 'svg'],
      },
      sessionManager
    );

    expect(result.content).toBeDefined();

    const textBlock = result.content.find(block => block.type === 'text');
    expect(textBlock).toBeDefined();
    expect(textBlock?.text).toContain('Metadata');
    expect(textBlock?.text).toContain('dimensions');
    expect(textBlock?.text).toContain('formats');
    expect(textBlock?.text).toContain('sourceVariantId');
    expect(textBlock?.text).toContain('exportedAt');
  });

  it('should handle empty session gracefully', async () => {
    const newSession = await sessionManager.createSession();
    const newSessionId = newSession.id;

    try {
      const result = await handleExportAsset(
        {
          sessionId: newSessionId,
          variantId: 'any-variant',
          formats: ['png'],
        },
        sessionManager
      );

      expect(result.content).toBeDefined();

      const textBlock = result.content.find(block => block.type === 'text');
      expect(textBlock).toBeDefined();
      expect(textBlock?.text).toContain('No asset found in this session');
    } finally {
      await sessionManager.deleteSession(newSessionId);
    }
  });

  it('should validate invalid resolution format', async () => {
    const variant = createMockVariant('variant-9', 'resolution test');
    await addVariantToSession(variant);

    const result = await handleExportAsset(
      {
        sessionId: testSessionId,
        variantId: 'variant-9',
        formats: ['png'],
        resolution: '4x',
      },
      sessionManager
    );

    expect(result.content).toBeDefined();

    const textBlock = result.content.find(block => block.type === 'text');
    expect(textBlock).toBeDefined();
    expect(textBlock?.text).toContain('Error');
    expect(textBlock?.text).toContain('resolution');
  });

  it('should include file sizes in metadata', async () => {
    const variant = createMockVariant('variant-10', 'file size test');
    await addVariantToSession(variant);

    const result = await handleExportAsset(
      {
        sessionId: testSessionId,
        variantId: 'variant-10',
        formats: ['png', 'webp'],
      },
      sessionManager
    );

    expect(result.content).toBeDefined();

    const textBlock = result.content.find(block => block.type === 'text');
    expect(textBlock).toBeDefined();
    expect(textBlock?.text).toContain('File Sizes');
    expect(textBlock?.text).toContain('PNG');
    expect(textBlock?.text).toContain('WEBP');
    expect(textBlock?.text).toContain('KB');
  });
});
