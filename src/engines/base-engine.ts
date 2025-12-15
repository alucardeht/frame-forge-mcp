import { ImageGenerationOptions, ImageGenerationResult, EngineStatus, ProgressCallback } from '../types/index.js';

export abstract class BaseEngine {
  protected engineName: string;

  constructor(engineName: string) {
    this.engineName = engineName;
  }

  abstract checkStatus(): Promise<EngineStatus>;

  abstract generate(
    options: ImageGenerationOptions,
    onProgress?: ProgressCallback
  ): Promise<ImageGenerationResult>;

  abstract initialize(): Promise<void>;

  abstract cleanup(): Promise<void>;

  getName(): string {
    return this.engineName;
  }
}
