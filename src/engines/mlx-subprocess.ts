import { spawn } from 'child_process';
import path from 'path';
import { ImageGenerationOptions, ProgressCallback } from '../types/index.js';
import { PerformanceProfiler } from '../lib/profiler.js';

export interface MLXSubprocessOptions {
  pythonPath: string;
  modelName: string;
  timeout: number;
}

export interface MLXSubprocessResult {
  imagePath: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  pid?: number;
}

export class MLXSubprocess {
  private pythonPath: string;
  private modelName: string;
  private timeout: number;

  constructor(options: MLXSubprocessOptions) {
    if (options.pythonPath.startsWith('.')) {
      this.pythonPath = path.resolve(process.cwd(), options.pythonPath);
    } else {
      this.pythonPath = options.pythonPath;
    }
    this.modelName = options.modelName;
    this.timeout = options.timeout;
  }

  private sanitizePrompt(prompt: string): string {
    const cleaned = prompt
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/[`$\\]/g, '')
      .trim();

    if (cleaned.length > 1000) {
      return cleaned.substring(0, 1000);
    }

    return cleaned;
  }

  async generate(
    options: ImageGenerationOptions,
    outputPath: string,
    onProgress?: ProgressCallback,
    profiler?: PerformanceProfiler
  ): Promise<MLXSubprocessResult> {
    const startTime = Date.now();

    const isSDXL = this.modelName.toLowerCase().includes('sdxl') ||
                   this.modelName.toLowerCase().includes('xl');
    const modelArg = isSDXL ? 'sdxl' : 'sd';

    const sanitizedPrompt = this.sanitizePrompt(options.prompt);
    if (!sanitizedPrompt) {
      throw new Error('Invalid or empty prompt after sanitization');
    }

    const args = [
      '-m', 'mlx_examples.stable_diffusion',
      '--model', modelArg,
      '--steps', (options.steps || 20).toString(),
      '--cfg', (options.guidanceScale || 7.5).toString(),
      '--output', outputPath,
      '--',
      sanitizedPrompt,
    ];

    if (options.seed !== undefined) {
      args.push('--seed', options.seed.toString());
    }

    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, args);
      const pythonPid = process.pid;

      if (profiler && pythonPid) {
        profiler.startMonitoring(pythonPid).catch(() => {
        });
      }

      let stdout = '';
      let stderr = '';
      let timeoutHandle: NodeJS.Timeout | null = null;

      if (this.timeout > 0) {
        timeoutHandle = setTimeout(() => {
          process.kill('SIGTERM');
          reject(new Error(`MLX subprocess timeout after ${this.timeout}ms`));
        }, this.timeout);
      }

      process.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;

        if (onProgress) {
          const progressMatch = output.match(/Step (\d+)\/(\d+)/);
          if (progressMatch) {
            const current = parseInt(progressMatch[1]);
            const total = parseInt(progressMatch[2]);
            onProgress(`Generating (step ${current}/${total})`, current, total);
          }
        }
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);

        const durationMs = Date.now() - startTime;

        resolve({
          imagePath: outputPath,
          stdout,
          stderr,
          exitCode: code || 0,
          durationMs,
          pid: pythonPid,
        });
      });

      process.on('error', (error) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  async checkPythonAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn(this.pythonPath, ['--version']);
      process.on('close', (code) => resolve(code === 0));
      process.on('error', () => resolve(false));
    });
  }

  async checkMLXInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn(this.pythonPath, ['-c', 'import mlx.core']);
      process.on('close', (code) => resolve(code === 0));
      process.on('error', () => resolve(false));
    });
  }
}
