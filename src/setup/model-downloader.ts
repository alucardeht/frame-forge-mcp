import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface ModelDownloadProgress {
  step: string;
  bytesDownloaded?: number;
  totalBytes?: number;
  percentage?: number;
}

export interface ModelDownloadResult {
  success: boolean;
  modelPath?: string;
  error?: string;
  durationMs: number;
}

export class ModelDownloader {
  private pythonPath: string;
  private modelName: string;
  private cacheDir: string;

  constructor(pythonPath: string, modelName: string, cacheDir?: string) {
    this.pythonPath = pythonPath;
    this.modelName = modelName;
    this.cacheDir = cacheDir || join(homedir(), '.cache', 'huggingface', 'hub');
  }

  private validateModelName(modelName: string): void {
    const validPattern = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(modelName)) {
      throw new Error(`Invalid model name format: ${modelName}. Expected: username/model-name`);
    }
    if (modelName.length > 100) {
      throw new Error('Model name too long');
    }
  }

  private validateCacheDir(cacheDir: string): void {
    const dangerousChars = ['"', "'", ';', '`', '\\', '\n', '\r'];
    if (dangerousChars.some(char => cacheDir.includes(char))) {
      throw new Error('Invalid characters in cache directory path');
    }
  }

  async isModelDownloaded(): Promise<boolean> {
    const modelSlug = this.modelName.replace('/', '--');
    const modelPath = join(this.cacheDir, `models--${modelSlug}`);
    return existsSync(modelPath);
  }

  async downloadModel(
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<ModelDownloadResult> {
    const startTime = Date.now();

    if (await this.isModelDownloaded()) {
      return {
        success: true,
        modelPath: this.getModelPath(),
        durationMs: Date.now() - startTime,
      };
    }

    this.validateModelName(this.modelName);
    this.validateCacheDir(this.cacheDir);

    const config = JSON.stringify({
      model: this.modelName,
      cache_dir: this.cacheDir,
    });

    const script = `
import sys
import json
from huggingface_hub import snapshot_download

config = json.loads(sys.argv[1])

print(f"Downloading model {config['model']}...", file=sys.stderr)
try:
    path = snapshot_download(
        repo_id=config['model'],
        cache_dir=config['cache_dir'],
        resume_download=True
    )
    print(json.dumps({"success": True, "path": path}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    return new Promise((resolve) => {
      const process = spawn(this.pythonPath, ['-c', script, config]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;

        if (onProgress) {
          if (output.includes('Downloading')) {
            onProgress({ step: 'Downloading model files...' });
          } else if (output.includes('Fetching')) {
            onProgress({ step: 'Fetching model metadata...' });
          }
        }
      });

      process.on('close', (code) => {
        const durationMs = Date.now() - startTime;

        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim());
            if (result.success) {
              resolve({
                success: true,
                modelPath: result.path,
                durationMs,
              });
            } else {
              resolve({
                success: false,
                error: result.error || 'Unknown error during model download',
                durationMs,
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: `Failed to parse download result: ${stdout}`,
              durationMs,
            });
          }
        } else {
          try {
            const errorResult = JSON.parse(stderr.trim());
            resolve({
              success: false,
              error: errorResult.error || stderr,
              durationMs,
            });
          } catch {
            resolve({
              success: false,
              error: stderr || 'Unknown error during model download',
              durationMs,
            });
          }
        }
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
          durationMs: Date.now() - startTime,
        });
      });
    });
  }

  getModelPath(): string {
    const modelSlug = this.modelName.replace('/', '--');
    return join(this.cacheDir, `models--${modelSlug}`);
  }

  async getModelSize(): Promise<number | null> {
    if (!(await this.isModelDownloaded())) return null;

    return new Promise((resolve) => {
      const modelPath = this.getModelPath();
      const process = spawn('du', ['-sb', modelPath]);

      let output = '';
      process.stdout.on('data', (data) => output += data.toString());

      process.on('close', (code) => {
        if (code === 0) {
          const sizeMatch = output.match(/^(\d+)/);
          resolve(sizeMatch ? parseInt(sizeMatch[1]) : null);
        } else {
          resolve(null);
        }
      });

      process.on('error', () => resolve(null));
    });
  }
}
