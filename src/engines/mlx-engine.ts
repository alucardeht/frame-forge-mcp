import { BaseEngine } from './base-engine.js';
import { MLXSubprocess } from './mlx-subprocess.js';
import { DependencyChecker, SystemRequirements } from '../setup/dependency-checker.js';
import { ModelDownloader } from '../setup/model-downloader.js';
import { AutoInstaller } from '../setup/auto-installer.js';
import {
  ImageGenerationOptions,
  ImageGenerationResult,
  EngineStatus,
  ProgressCallback,
} from '../types/index.js';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Logger } from '../utils/logger.js';
import { PerformanceProfiler } from '../lib/profiler.js';

export interface MLXEngineConfig {
  pythonPath: string;
  modelName: string;
  cacheDir?: string;
  timeout: number;
  minPythonVersion: string;
  nonInteractive?: boolean;
  nonInteractiveAction?: 'install' | 'skip' | 'cancel';
}

export class MLXEngine extends BaseEngine {
  protected config: MLXEngineConfig;
  private subprocess: MLXSubprocess;
  private dependencyChecker: DependencyChecker;
  private modelDownloader: ModelDownloader;
  private logger: Logger;
  private initialized: boolean = false;

  constructor(config: MLXEngineConfig) {
    super('MLX');
    this.config = config;
    this.logger = new Logger('MLXEngine');
    this.subprocess = new MLXSubprocess({
      pythonPath: config.pythonPath,
      modelName: config.modelName,
      timeout: config.timeout,
    });
    this.dependencyChecker = new DependencyChecker(config.pythonPath);
    this.modelDownloader = new ModelDownloader(
      config.pythonPath,
      config.modelName,
      config.cacheDir
    );
  }

  async checkStatus(): Promise<EngineStatus> {
    try {
      const requirements = await this.dependencyChecker.checkAll();
      const modelDownloaded = await this.modelDownloader.isModelDownloaded();
      const pythonVersionOk = await this.dependencyChecker.checkMinPythonVersion(
        this.config.minPythonVersion
      );

      const allReady =
        requirements.pythonAvailable &&
        pythonVersionOk &&
        requirements.allSatisfied &&
        modelDownloaded;

      return {
        ready: allReady,
        engineName: this.engineName,
        modelPath: modelDownloaded ? this.modelDownloader.getModelPath() : undefined,
        dependencies: requirements.dependencies,
        error: !allReady ? this.getStatusError(requirements, pythonVersionOk, modelDownloaded) : undefined,
      };
    } catch (error) {
      return {
        ready: false,
        engineName: this.engineName,
        dependencies: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const status = await this.checkStatus();
    if (!status.ready) {
      const missingDeps = status.dependencies?.filter((d) => !d.installed) || [];
      const pythonAvailable = status.dependencies !== undefined;

      if (missingDeps.length > 0 && pythonAvailable) {
        try {
          const requirements = await this.dependencyChecker.checkAll();
          const installResult = await this.handleMissingDependencies(requirements);

          if (installResult.installed && installResult.missingDeps.length === 0) {
            const retryStatus = await this.checkStatus();
            if (retryStatus.ready) {
              this.initialized = true;
              return;
            }
          }

          throw new Error(
            `MLX Engine not ready after installation attempt. Still missing: ${installResult.missingDeps.join(', ')}`
          );
        } catch (error) {
          throw new Error(`MLX Engine not ready: ${status.error}`);
        }
      }

      throw new Error(`MLX Engine not ready: ${status.error}`);
    }

    this.initialized = true;
  }

  async generate(
    options: ImageGenerationOptions,
    onProgress?: ProgressCallback
  ): Promise<ImageGenerationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const tempDir = join(tmpdir(), 'visualai-mcp');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    const outputPath = join(tempDir, `image-${Date.now()}.png`);
    const startTime = Date.now();
    const profiler = new PerformanceProfiler();

    try {
      const result = await this.subprocess.generate(options, outputPath, onProgress, profiler);

      if (result.exitCode !== 0) {
        throw new Error(`MLX generation failed: ${result.stderr}`);
      }

      const imageBuffer = readFileSync(outputPath);
      const imageBase64 = imageBuffer.toString('base64');

      const profilingData = result.pid ? profiler.stopMonitoring() : undefined;

      return {
        imageBase64,
        metadata: {
          prompt: options.prompt,
          width: options.width,
          height: options.height,
          steps: options.steps || 20,
          guidanceScale: options.guidanceScale || 7.5,
          seed: options.seed,
          latencyMs: Date.now() - startTime,
          engineName: this.engineName,
          modelName: this.config.modelName,
          timestamp: new Date().toISOString(),
        },
        profiling: profilingData,
      };
    } catch (error) {
      profiler.cleanup();
      throw new Error(
        `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async cleanup(): Promise<void> {
    this.initialized = false;
  }

  private async handleMissingDependencies(
    requirements: SystemRequirements
  ): Promise<{ installed: boolean; missingDeps: string[] }> {
    const missing = requirements.dependencies
      .filter((d) => !d.installed)
      .map((d) => d.name);

    if (missing.length === 0) {
      return { installed: true, missingDeps: [] };
    }

    try {
      const installer = new AutoInstaller(this.config.pythonPath);
      const result = await installer.suggestAndInstall({
        missingDeps: missing,
        enableAutoRetry: true,
        nonInteractive: this.config.nonInteractive,
        nonInteractiveAction: this.config.nonInteractiveAction,
      });

      if (result.userCancelled) {
        throw new Error('Installation cancelled by user');
      }

      return {
        installed: result.success,
        missingDeps: result.failed,
      };
    } catch (error) {
      this.logger.error('Auto-install failed', error as Error);
      return { installed: false, missingDeps: missing };
    }
  }

  private getStatusError(
    requirements: any,
    pythonVersionOk: boolean,
    modelDownloaded: boolean
  ): string {
    if (!requirements.pythonAvailable) {
      return `Python not found at ${this.config.pythonPath}`;
    }
    if (!pythonVersionOk) {
      return `Python ${this.config.minPythonVersion}+ required, found ${requirements.pythonVersion}`;
    }
    const missing = requirements.dependencies.filter((d: any) => !d.installed);
    if (missing.length > 0) {
      return `Missing dependencies: ${missing.map((d: any) => d.name).join(', ')}. Run setup wizard with 'npm start' to install them.`;
    }
    if (!modelDownloaded) {
      return `Model ${this.config.modelName} not downloaded`;
    }
    return 'Unknown error';
  }
}
