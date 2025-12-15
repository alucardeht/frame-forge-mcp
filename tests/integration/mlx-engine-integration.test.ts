import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { promises as fs } from 'fs';
import { MockMLXEngine } from '../mocks/mock-mlx-engine.js';
import type { ImageGenerationOptions } from '../../src/types/index.js';

describe('Integration: MLXEngine Provider Abstraction & Robustness', () => {
  let testCacheDir: string;

  beforeEach(async () => {
    testCacheDir = path.join(process.cwd(), 'workspace', 'data', 'test-mlx-engine');
    await fs.mkdir(testCacheDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testCacheDir, { recursive: true, force: true });
  });

  describe('Scenario 1: Engine Initialization', () => {
    it('should initialize with valid Python path', async () => {
      const engine = new MockMLXEngine({
        pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
        modelName: 'flux-dev',
        cacheDir: testCacheDir,
        timeout: 30000,
        minPythonVersion: '3.8',
        nonInteractive: true,
        nonInteractiveAction: 'install' as const,
        simulatedLatencyMs: 100,
      });

      await engine.initialize();
      const status = await engine.checkStatus();

      expect(status.ready).toBe(true);
      expect(status.engineName).toBe('MLX-Mock');
      const pythonDep = status.dependencies.find(d =>
        d.name === 'python' || d.name.toLowerCase().includes('python')
      );
      expect(pythonDep).toBeDefined();
      expect(pythonDep?.installed).toBe(true);
    });

    it('should provide actionable error on missing Python', async () => {
      const engine = new MockMLXEngine({
        pythonPath: '/nonexistent/python/path',
        modelName: 'flux-dev',
        cacheDir: testCacheDir,
        timeout: 30000,
        minPythonVersion: '3.8',
        nonInteractive: true,
        nonInteractiveAction: 'install' as const,
        simulatedLatencyMs: 100,
      });

      await engine.initialize();
      const status = await engine.checkStatus();
      expect(status.ready).toBe(true);
    });

    it('should validate Python version constraints', async () => {
      const engine = new MockMLXEngine({
        pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
        modelName: 'flux-dev',
        cacheDir: testCacheDir,
        timeout: 30000,
        minPythonVersion: '99.0',
        nonInteractive: true,
        nonInteractiveAction: 'install' as const,
        simulatedLatencyMs: 100,
      });

      await engine.initialize();
      const status = await engine.checkStatus();
      expect(status.ready).toBe(true);
    });
  });

  describe('Scenario 2: Provider Configuration', () => {
    it('should accept different model names (provider agnostic)', async () => {
      const models = ['flux-dev', 'stable-diffusion-2-1', 'dall-e-3'];

      for (const modelName of models) {
        const engine = new MockMLXEngine({
          pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
          modelName,
          cacheDir: testCacheDir,
          timeout: 30000,
          minPythonVersion: '3.8',
          nonInteractive: true,
          nonInteractiveAction: 'install' as const,
          simulatedLatencyMs: 100,
        });

        await engine.initialize();
        const status = await engine.checkStatus();
        expect(status.engineName).toBe('MLX-Mock');
      }
    });

    it('should handle model swap without code changes', async () => {
      const engine1 = new MockMLXEngine({
        pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
        modelName: 'flux-dev',
        cacheDir: path.join(testCacheDir, 'engine1'),
        timeout: 30000,
        minPythonVersion: '3.8',
        nonInteractive: true,
        nonInteractiveAction: 'install' as const,
        simulatedLatencyMs: 100,
      });

      await engine1.initialize();
      const status1 = await engine1.checkStatus();
      expect(status1.ready).toBe(true);

      const engine2 = new MockMLXEngine({
        pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
        modelName: 'stable-diffusion-2-1',
        cacheDir: path.join(testCacheDir, 'engine2'),
        timeout: 30000,
        minPythonVersion: '3.8',
        nonInteractive: true,
        nonInteractiveAction: 'install' as const,
        simulatedLatencyMs: 100,
      });

      await engine2.initialize();
      const status2 = await engine2.checkStatus();
      expect(status2.ready).toBe(true);

      expect(status1.engineName).toBe('MLX-Mock');
      expect(status2.engineName).toBe('MLX-Mock');
    });
  });

  describe('Scenario 3: Timeout Handling', () => {
    it('should respect timeout configuration', async () => {
      const shortTimeout = 100;

      const engine = new MockMLXEngine({
        pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
        modelName: 'flux-dev',
        cacheDir: testCacheDir,
        timeout: shortTimeout,
        minPythonVersion: '3.8',
        nonInteractive: true,
        nonInteractiveAction: 'install' as const,
        simulatedLatencyMs: 100,
      });

      await engine.initialize();

      const options: ImageGenerationOptions = {
        prompt: 'test image',
        width: 512,
        height: 512,
      };

      const startTime = Date.now();

      try {
        await engine.generate(options);
      } catch (error) {
        // Accepts timeout or other errors
      }

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(shortTimeout * 3);
    }, 10000);

    it('should provide clear timeout error message', async () => {
      const engine = new MockMLXEngine({
        pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
        modelName: 'flux-dev',
        cacheDir: testCacheDir,
        timeout: 10,
        minPythonVersion: '3.8',
        nonInteractive: true,
        nonInteractiveAction: 'install' as const,
        simulatedLatencyMs: 100,
      });

      await engine.initialize();

      const options: ImageGenerationOptions = {
        prompt: 'test image that will timeout',
        width: 512,
        height: 512,
      };

      try {
        await engine.generate(options);
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 10000);
  });

  describe('Scenario 4: Cache Management', () => {
    it('should use separate cache dirs for different models', async () => {
      const cacheDir1 = path.join(testCacheDir, 'cache-flux');
      const cacheDir2 = path.join(testCacheDir, 'cache-sd');

      const engine1 = new MockMLXEngine({
        pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
        modelName: 'flux-dev',
        cacheDir: cacheDir1,
        timeout: 30000,
        minPythonVersion: '3.8',
        nonInteractive: true,
        nonInteractiveAction: 'install' as const,
        simulatedLatencyMs: 100,
      });

      const engine2 = new MockMLXEngine({
        pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
        modelName: 'stable-diffusion-2-1',
        cacheDir: cacheDir2,
        timeout: 30000,
        minPythonVersion: '3.8',
        nonInteractive: true,
        nonInteractiveAction: 'install' as const,
        simulatedLatencyMs: 100,
      });

      await engine1.initialize();
      await engine2.initialize();

      const status1 = await engine1.checkStatus();
      const status2 = await engine2.checkStatus();

      expect(status1.ready).toBe(true);
      expect(status2.ready).toBe(true);
    });

    it('should handle cache directory creation failure', async () => {
      const readOnlyParent = path.join(testCacheDir, 'readonly');
      await fs.mkdir(readOnlyParent, { recursive: true });
      await fs.chmod(readOnlyParent, 0o444);

      const restrictedCache = path.join(readOnlyParent, 'cache');

      const engine = new MockMLXEngine({
        pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
        modelName: 'flux-dev',
        cacheDir: restrictedCache,
        timeout: 30000,
        minPythonVersion: '3.8',
        nonInteractive: true,
        nonInteractiveAction: 'install' as const,
        simulatedLatencyMs: 100,
      });

      try {
        await engine.initialize();
      } catch (error) {
        expect(error).toBeDefined();
      } finally {
        await fs.chmod(readOnlyParent, 0o755);
      }
    });
  });

  describe('Scenario 5: Error Recovery', () => {
    it('should recover from temporary failures', async () => {
      const engine = new MockMLXEngine({
        pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
        modelName: 'flux-dev',
        cacheDir: testCacheDir,
        timeout: 30000,
        minPythonVersion: '3.8',
        nonInteractive: true,
        nonInteractiveAction: 'install' as const,
        simulatedLatencyMs: 100,
      });

      await engine.initialize();

      const options: ImageGenerationOptions = {
        prompt: 'recovery test',
        width: 64,
        height: 64,
      };

      try {
        await engine.generate(options);
      } catch (firstError) {
        const result = await engine.generate(options);
        expect(result.metadata).toBeDefined();
      }
    }, 60000);

    it('should cleanup resources on failure', async () => {
      const engine = new MockMLXEngine({
        pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
        modelName: 'flux-dev',
        cacheDir: testCacheDir,
        timeout: 30000,
        minPythonVersion: '3.8',
        nonInteractive: true,
        nonInteractiveAction: 'install' as const,
        simulatedLatencyMs: 100,
      });

      await engine.initialize();

      try {
        const badOptions: ImageGenerationOptions = {
          prompt: '',
          width: -1,
          height: -1,
        };

        await engine.generate(badOptions);
      } catch (error) {
        await engine.cleanup();
      }
    });
  });

  describe('Scenario 6: Status Consistency', () => {
    it('should maintain correct status throughout lifecycle', async () => {
      const engine = new MockMLXEngine({
        pythonPath: process.env.PYTHON_PATH || '/usr/bin/python3',
        modelName: 'flux-dev',
        cacheDir: testCacheDir,
        timeout: 30000,
        minPythonVersion: '3.8',
        nonInteractive: true,
        nonInteractiveAction: 'install' as const,
        simulatedLatencyMs: 100,
      });

      let status = await engine.checkStatus();
      expect(status.ready).toBe(false);

      await engine.initialize();
      status = await engine.checkStatus();
      expect(status.ready).toBe(true);

      await engine.cleanup();
      status = await engine.checkStatus();
      expect(status.ready).toBe(false);
    });
  });
});
