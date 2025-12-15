import { spawn } from 'child_process';
import prompts from 'prompts';
import { DependencyChecker } from './dependency-checker.js';

export interface InstallProgress {
  dependency: string;
  step: 'pending' | 'installing' | 'completed' | 'failed';
  completed: boolean;
  progress?: number;
  duration?: number;
  error?: string;
  suggestedFix?: string;
}

export interface InstallResult {
  success: boolean;
  installed: string[];
  failed: string[];
  durationMs: number;
}

export interface AutoInstallResult extends InstallResult {
  shouldRetry: boolean;
  userCancelled: boolean;
}

export class AutoInstaller {
  private pythonPath: string;
  private pipCommand: string;

  constructor(pythonPath: string = 'python3') {
    this.pythonPath = pythonPath;
    this.pipCommand = `${pythonPath} -m pip`;
  }

  async installAll(
    onProgress?: (progress: InstallProgress) => void
  ): Promise<InstallResult> {
    const startTime = Date.now();
    const checker = new DependencyChecker(this.pythonPath);
    const requirements = await checker.checkAll();

    if (!requirements.pythonAvailable) {
      return {
        success: false,
        installed: [],
        failed: ['Python not available'],
        durationMs: Date.now() - startTime,
      };
    }

    const missing = requirements.dependencies
      .filter(dep => !dep.installed)
      .map(dep => dep.name);

    if (missing.length === 0) {
      return {
        success: true,
        installed: [],
        failed: [],
        durationMs: Date.now() - startTime,
      };
    }

    const installed: string[] = [];
    const failed: string[] = [];

    for (const dependency of missing) {
      if (onProgress) {
        onProgress({
          dependency,
          step: 'installing',
          completed: false,
        });
      }

      const result = await this.installDependency(dependency);

      if (result.success) {
        installed.push(dependency);
        if (onProgress) {
          onProgress({
            dependency,
            step: 'completed',
            completed: true,
          });
        }
      } else {
        failed.push(dependency);
        if (onProgress) {
          onProgress({
            dependency,
            step: 'failed',
            completed: true,
            error: result.error,
          });
        }
      }
    }

    return {
      success: failed.length === 0,
      installed,
      failed,
      durationMs: Date.now() - startTime,
    };
  }

  private async installDependency(name: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const args = this.pipCommand.split(' ').concat(['install', name]);
      const process = spawn(args[0], args.slice(1));

      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: stderr.trim() || `Exit code ${code}`,
          });
        }
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });
    });
  }

  async upgradePip(): Promise<boolean> {
    return new Promise((resolve) => {
      const args = this.pipCommand.split(' ').concat(['install', '--upgrade', 'pip']);
      const process = spawn(args[0], args.slice(1));

      process.on('close', (code) => resolve(code === 0));
      process.on('error', () => resolve(false));
    });
  }

  async suggestAndInstall(options: {
    missingDeps: string[];
    enableAutoRetry?: boolean;
    onProgress?: (progress: InstallProgress) => void;
    nonInteractive?: boolean;
    nonInteractiveAction?: 'install' | 'skip' | 'cancel';
  }): Promise<AutoInstallResult> {
    const { missingDeps, enableAutoRetry = true, onProgress, nonInteractive = false, nonInteractiveAction = 'skip' } = options;

    if (missingDeps.length === 0) {
      return {
        success: true,
        installed: [],
        failed: [],
        durationMs: 0,
        shouldRetry: false,
        userCancelled: false,
      };
    }

    console.log(`\n⚠️  Missing dependencies detected: ${missingDeps.join(', ')}\n`);

    let action: 'install' | 'skip' | 'cancel';

    if (nonInteractive) {
      action = nonInteractiveAction;
      console.log(`[Non-Interactive Mode] Auto-selecting action: ${action}`);
    } else {
      const response = await prompts({
        type: 'select',
        name: 'action',
        message: 'Would you like to install missing dependencies now?',
        choices: [
          { title: 'Yes - Install now and retry', value: 'install' },
          { title: 'No - Skip installation', value: 'skip' },
          { title: 'Cancel operation', value: 'cancel' },
        ],
        initial: 0,
      });
      action = response.action || 'cancel';
    }

    if (action === 'cancel' || !action) {
      return {
        success: false,
        installed: [],
        failed: missingDeps,
        durationMs: 0,
        shouldRetry: false,
        userCancelled: true,
      };
    }

    if (action === 'skip') {
      return {
        success: false,
        installed: [],
        failed: missingDeps,
        durationMs: 0,
        shouldRetry: false,
        userCancelled: false,
      };
    }

    const result = await this.installAll(onProgress);

    return {
      ...result,
      shouldRetry: result.success && enableAutoRetry,
      userCancelled: false,
    };
  }

  async checkPipAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const args = this.pipCommand.split(' ').concat(['--version']);
      const process = spawn(args[0], args.slice(1));

      process.on('close', (code) => resolve(code === 0));
      process.on('error', () => resolve(false));
    });
  }
}
