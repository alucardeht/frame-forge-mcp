// @ts-nocheck
import { BaseEngine } from '../../src/engines/base-engine.js';
import {
  ImageGenerationOptions,
  ImageGenerationResult,
  EngineStatus,
  ProgressCallback,
} from '../../src/types/index.js';
import { Logger } from '../../src/utils/logger.js';

export interface MockMLXEngineConfig {
  pythonPath?: string;
  modelName?: string;
  cacheDir?: string;
  timeout?: number;
  minPythonVersion?: string;
  nonInteractive?: boolean;
  nonInteractiveAction?: 'install' | 'skip' | 'cancel';
  simulatedLatencyMs?: number;
}

export class MockMLXEngine extends BaseEngine {
  protected config: MockMLXEngineConfig;
  private initialized: boolean = false;
  private generationCount: number = 0;
  private _subprocess: any = null;
  private _dependencyChecker: any = null;
  private _modelDownloader: any = null;
  private _logger: Logger;

  constructor(config: MockMLXEngineConfig) {
    super('MLX-Mock');
    this.config = { simulatedLatencyMs: 100, ...config };
    this._logger = new Logger('MockMLXEngine');
  }

  async initialize(): Promise<void> {
    await this.delay(50);
    this.initialized = true;
  }

  async checkStatus(): Promise<EngineStatus> {
    return {
      ready: this.initialized,
      engineName: this.engineName,
      modelPath: this.config.cacheDir ? `${this.config.cacheDir}/mock-model` : undefined,
      dependencies: [
        { name: 'python', installed: true, version: '3.13.5' },
        { name: 'mlx', installed: true, version: 'installed' },
        { name: 'pillow', installed: true, version: '12.0.0' },
      ],
      error: this.initialized ? undefined : 'MockMLXEngine not initialized',
    };
  }

  async generate(
    options: ImageGenerationOptions,
    onProgress?: ProgressCallback
  ): Promise<ImageGenerationResult> {
    if (!this.initialized) {
      throw new Error('MockMLXEngine not initialized');
    }

    const startTime = Date.now();
    this.generationCount++;

    if (onProgress) {
      onProgress('loading_model', 0.1, 1.0);
      await this.delay(this.config.simulatedLatencyMs! * 0.3);

      onProgress('generating', 0.5, 1.0);
      await this.delay(this.config.simulatedLatencyMs! * 0.5);

      onProgress('saving', 0.9, 1.0);
      await this.delay(this.config.simulatedLatencyMs! * 0.2);
    } else {
      await this.delay(this.config.simulatedLatencyMs!);
    }

    const fakeImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    return {
      imageBase64: fakeImageBase64,
      metadata: {
        prompt: options.prompt,
        width: options.width,
        height: options.height,
        steps: options.steps || 20,
        guidanceScale: options.guidanceScale || 7.5,
        seed: options.seed || Math.floor(Math.random() * 1000000),
        latencyMs: Date.now() - startTime,
        engineName: this.engineName,
        modelName: this.config.modelName || 'mock-model',
        timestamp: new Date().toISOString(),
      },
      profiling: {
        duration: {
          startMs: startTime,
          endMs: Date.now(),
          totalMs: Date.now() - startTime,
        },
        memory: {
          baselineMb: 100,
          peakMb: 300,
          currentMb: 250,
          deltaPercent: 200.0,
        },
        cpu: {
          currentPercent: 15.0,
          averagePercent: 20.0,
          peakPercent: 30.0,
        },
        gpu: {
          estimatePercent: 85.0,
          method: 'latency' as const,
          confidence: 'medium' as const,
        },
        warnings: [],
      },
    };
  }

  async cleanup(): Promise<void> {
    this.initialized = false;
    this.generationCount = 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async _handleMissingDependencies(
    _requirements: any
  ): Promise<{ installed: boolean; missingDeps: string[] }> {
    return { installed: true, missingDeps: [] };
  }

  private _getStatusError(
    _requirements: any,
    _pythonVersionOk: boolean,
    _modelDownloaded: boolean
  ): string {
    return 'Mock error';
  }

  getGenerationCount(): number {
    return this.generationCount;
  }
}
