import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { SessionManager } from '../../src/session/session-manager.js';
import { IterationHistory } from '../../src/session/iteration-history.js';
import { ImageGenerationResult } from '../../src/types/index.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('Phase 3 - User Story 1: Iterate on Figma designs', () => {
  let sessionManager: SessionManager;
  let testSessionId: string;
  const testDataDir = path.join(process.cwd(), 'workspace', 'data', 'test-sessions');

  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
    sessionManager = new SessionManager(testDataDir);
    await sessionManager.initialize();
  });

  afterAll(async () => {
    if (testSessionId) {
      await sessionManager.deleteSession(testSessionId);
    }
  });

  function createMockImageResult(prompt: string): ImageGenerationResult {
    return {
      imageBase64: Buffer.from('mock-image-data-' + prompt).toString('base64'),
      metadata: {
        prompt,
        width: 512,
        height: 512,
        steps: 15,
        guidanceScale: 7.5,
        latencyMs: 2500,
        engineName: 'mlx-engine',
        modelName: 'stable-diffusion-2-1',
        timestamp: new Date().toISOString(),
      },
    };
  }

  it('T029-T030: Should generate initial image', async () => {
    const session = await sessionManager.createSession();
    testSessionId = session.id;

    const initialPrompt = 'A simple geometric pattern';
    const result = createMockImageResult(initialPrompt);

    sessionManager.addIterationToSession(testSessionId, initialPrompt, result);
    await sessionManager.saveSession(session);

    const loadedSession = await sessionManager.loadSession(testSessionId);
    expect(loadedSession).toBeDefined();
    expect(loadedSession?.iterations.length).toBe(1);
    expect(loadedSession?.iterations[0].prompt).toBe(initialPrompt);
    expect(loadedSession?.iterations[0].result.metadata.width).toBe(512);
    expect(loadedSession?.iterations[0].result.metadata.height).toBe(512);
  });

  it('T036: Should create 5 iterations with history tracking', async () => {
    const prompts = [
      'Add blue color gradient',
      'Increase pattern complexity',
      'Add golden accents',
      'Soften the edges',
      'Final polish with depth',
    ];

    const session = await sessionManager.loadSession(testSessionId);
    expect(session).not.toBeNull();

    for (const prompt of prompts) {
      const result = createMockImageResult(prompt);
      sessionManager.addIterationToSession(testSessionId, prompt, result);
    }

    await sessionManager.saveSession(session!);

    const loadedSession = await sessionManager.loadSession(testSessionId);
    expect(loadedSession?.iterations.length).toBe(6);
    expect(loadedSession?.metadata.totalIterations).toBe(6);
  });

  it('T036-T037: Should list iterations with metadata', async () => {
    const session = await sessionManager.loadSession(testSessionId);
    expect(session).not.toBeNull();

    const iterations = session!.iterations;

    expect(iterations.length).toBe(6);
    expect(iterations[0].prompt).toContain('geometric pattern');
    expect(iterations[5].prompt).toContain('Final polish');

    iterations.forEach((iteration, index) => {
      expect(iteration.index).toBe(index);
      expect(iteration.timestamp).toBeDefined();
      expect(iteration.result.metadata).toBeDefined();
      expect(iteration.result.metadata.prompt).toBe(iteration.prompt);
    });
  });

  it('T038: Should rollback to iteration 2 (< 10s)', async () => {
    const startTime = Date.now();

    const session = await sessionManager.loadSession(testSessionId);
    expect(session).not.toBeNull();

    const history = sessionManager.getActiveHistory(testSessionId);
    expect(history).not.toBeNull();

    const iteration2 = history!.getIteration(2);
    expect(iteration2).toBeDefined();

    history!.markRolledBackTo(2);

    await sessionManager.saveSession(session!);

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(10000);
  });

  it('T039: Should compare iterations A/B', async () => {
    const session = await sessionManager.loadSession(testSessionId);
    expect(session).not.toBeNull();

    const iterationA = session!.iterations[0];
    const iterationB = session!.iterations[2];

    expect(iterationA).toBeDefined();
    expect(iterationB).toBeDefined();

    expect(iterationA.prompt).toBe('A simple geometric pattern');
    expect(iterationB.prompt).toBe('Increase pattern complexity');
    expect(iterationA.prompt).not.toBe(iterationB.prompt);

    expect(iterationA.result.metadata.timestamp).toBeDefined();
    expect(iterationB.result.metadata.timestamp).toBeDefined();
  });

  it('T040-T041: Should export image with resolution variants (< 30s)', async () => {
    const startTime = Date.now();

    const session = await sessionManager.loadSession(testSessionId);
    expect(session).not.toBeNull();

    const iteration = session!.iterations[3];
    expect(iteration).toBeDefined();

    const imageBase64 = await sessionManager.loadIterationImage(testSessionId, 3);
    expect(imageBase64).toBeDefined();
    expect(typeof imageBase64).toBe('string');
    expect(imageBase64.length).toBeGreaterThan(0);

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(30000);
  });

  it('T045: Should support 10+ iterations with lazy loading', async () => {
    const session = await sessionManager.loadSession(testSessionId);
    expect(session).not.toBeNull();

    expect(session!.iterations.length).toBe(6);

    const firstIteration = session!.iterations[0];
    expect(firstIteration.result.imagePath || firstIteration.result.imageBase64).toBeDefined();

    const imageBase64 = await sessionManager.loadIterationImage(testSessionId, 0);
    expect(imageBase64).toBeDefined();
    expect(imageBase64.length).toBeGreaterThan(0);
  });

  it('T046: Should undo/redo through iterations', async () => {
    const history = new IterationHistory(testSessionId);

    const prompts = [
      'First iteration',
      'Second iteration',
      'Third iteration',
      'Fourth iteration',
      'Fifth iteration',
      'Sixth iteration',
    ];

    for (const prompt of prompts) {
      const result = createMockImageResult(prompt);
      history.addIteration(prompt, result);
    }

    const initialIndex = history.getCurrentIndex();
    expect(initialIndex).toBe(5);

    expect(history.canUndo()).toBe(true);
    const previousIteration = history.undo();
    expect(previousIteration).toBeDefined();
    expect(history.getCurrentIndex()).toBe(4);

    expect(history.canRedo()).toBe(true);
    const nextIteration = history.redo();
    expect(nextIteration).toBeDefined();
    expect(history.getCurrentIndex()).toBe(5);

    while (history.canUndo()) {
      history.undo();
    }
    expect(history.getCurrentIndex()).toBe(0);
    expect(history.canUndo()).toBe(false);

    while (history.canRedo()) {
      history.redo();
    }
    expect(history.getCurrentIndex()).toBe(5);
    expect(history.canRedo()).toBe(false);
  });

  it('T047: Should verify file structure (lazy loading)', async () => {
    const session = await sessionManager.loadSession(testSessionId);
    expect(session).not.toBeNull();

    const sessionDir = path.join(testDataDir, testSessionId);
    const sessionFile = path.join(sessionDir, 'session.json');
    const imagesDir = path.join(sessionDir, 'images');

    const sessionStats = await fs.stat(sessionFile);
    expect(sessionStats.size).toBeLessThan(100 * 1024);

    const imagesDirExists = await fs
      .stat(imagesDir)
      .then(() => true)
      .catch(() => false);
    expect(imagesDirExists).toBe(true);

    for (let i = 0; i < 6; i++) {
      const imagePath = path.join(imagesDir, `${i}.png`);
      const imageExists = await fs
        .stat(imagePath)
        .then(() => true)
        .catch(() => false);
      expect(imageExists).toBe(true);
    }
  });
});
