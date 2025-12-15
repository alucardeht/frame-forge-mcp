import prompts from 'prompts';
import ora from 'ora';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { DependencyChecker } from '../setup/dependency-checker.js';
import { ModelDownloader } from '../setup/model-downloader.js';
import { AutoInstaller } from '../setup/auto-installer.js';
import { MLXEngine } from '../engines/mlx-engine.js';
import { Logger } from '../utils/logger.js';
import { ConfigManager } from '../utils/config.js';

export interface SetupWizardOptions {
  pythonPath?: string;
  modelName?: string;
  skipConfirmation?: boolean;
}

export interface SetupResult {
  success: boolean;
  pythonPath: string;
  modelName: string;
  dependenciesInstalled: boolean;
  modelDownloaded: boolean;
  error?: Error;
}

const logger = new Logger('setup-wizard');

async function autoDetectEnvironment(pythonPath: string): Promise<{
  pythonAvailable: boolean;
  pythonVersion?: string;
  mlxInstalled: boolean;
  modelDownloaded: boolean;
  appleChip: boolean;
}> {
  try {
    const checker = new DependencyChecker(pythonPath);
    const requirements = await checker.checkAll();

    const mlxInstalled = requirements.dependencies.find(d => d.name === 'mlx')?.installed || false;

    const config = ConfigManager.load();
    const downloader = new ModelDownloader(pythonPath, config.model.name);
    const modelDownloaded = await downloader.isModelDownloaded();

    let appleChip = false;
    try {
      const { execSync } = await import('child_process');
      const result = execSync('sysctl hw.optional.arm64', { encoding: 'utf-8' });
      appleChip = result.includes('1');
    } catch {
      appleChip = false;
    }

    return {
      pythonAvailable: requirements.pythonAvailable,
      pythonVersion: requirements.pythonVersion,
      mlxInstalled,
      modelDownloaded,
      appleChip,
    };
  } catch (error) {
    logger.error('Auto-detection failed', error as Error);
    return {
      pythonAvailable: false,
      mlxInstalled: false,
      modelDownloaded: false,
      appleChip: false,
    };
  }
}

async function runHealthCheck(pythonPath: string, modelName: string): Promise<{
  success: boolean;
  generationTime?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const engine = new MLXEngine({
      pythonPath,
      modelName,
      timeout: 30000,
      minPythonVersion: '3.9',
    });

    await engine.initialize();

    await engine.generate({
      prompt: 'simple geometric shape',
      width: 512,
      height: 512,
      steps: 20,
      guidanceScale: 7.5,
    });

    const generationTime = Date.now() - startTime;

    return {
      success: true,
      generationTime,
    };
  } catch (error) {
    logger.error('Health check failed', error as Error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

function formatBytes(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

function formatETA(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

async function detectPython(): Promise<string | null> {
  const paths = ['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3'];
  for (const path of paths) {
    try {
      const checker = new DependencyChecker(path);
      const requirements = await checker.checkAll();
      if (requirements.pythonAvailable && requirements.pythonVersion) {
        return path;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function checkExistingSetup(pythonPath: string, modelName: string): Promise<boolean> {
  try {
    const checker = new DependencyChecker(pythonPath);
    const requirements = await checker.checkAll();
    if (!requirements.allSatisfied) return false;

    const downloader = new ModelDownloader(pythonPath, modelName);
    const isDownloaded = await downloader.isModelDownloaded();
    return isDownloaded;
  } catch {
    return false;
  }
}

async function injectClaudeDesktopConfig(pythonPath: string, modelCacheDir: string): Promise<{
  success: boolean;
  configPath?: string;
  error?: string;
}> {
  try {
    const homeDir = os.homedir();
    let configDir: string;

    switch (os.platform()) {
      case 'darwin':
        configDir = path.join(homeDir, 'Library', 'Application Support', 'Claude');
        break;
      case 'win32':
        configDir = path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'Claude');
        break;
      default:
        configDir = path.join(homeDir, '.config', 'Claude');
    }

    const configPath = path.join(configDir, 'claude_desktop_config.json');

    await fs.mkdir(configDir, { recursive: true });

    let config: any = { mcpServers: {} };
    try {
      const existing = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(existing);
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
    } catch {
      // Config não existe, usar objeto vazio
    }

    const backupPath = configPath + '.backup';
    try {
      await fs.copyFile(configPath, backupPath);
    } catch {
      // Arquivo original não existe, sem necessidade de backup
    }

    const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
    const indexPath = path.join(projectRoot, 'dist', 'index.js');

    config.mcpServers.visualai = {
      command: 'node',
      args: [indexPath],
      env: {
        PYTHON_PATH: pythonPath,
        MODEL_CACHE_DIR: modelCacheDir,
      },
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    const written = await fs.readFile(configPath, 'utf-8');
    JSON.parse(written);

    return {
      success: true,
      configPath,
    };
  } catch (error) {
    logger.error('Failed to inject Claude Desktop config', error as Error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

export async function runSetupWizard(options: SetupWizardOptions = {}): Promise<SetupResult> {
  try {
    console.log('\n🚀 VisualAI Setup Wizard');
    console.log('━'.repeat(40) + '\n');

    const config = ConfigManager.load();
    let pythonPath = options.pythonPath || config.python.path;
    const modelName = options.modelName || config.model.name;

    const detectedPython = await detectPython();
    if (detectedPython) {
      pythonPath = detectedPython;
      logger.info(`Detected Python at ${pythonPath}`);
    } else if (!options.pythonPath) {
      const response = await prompts({
        type: 'text',
        name: 'pythonPath',
        message: 'Enter Python 3.9+ path:',
        initial: 'python3',
      });
      if (!response.pythonPath) {
        throw new Error('Python path is required');
      }
      pythonPath = response.pythonPath;
    }

    const alreadySetup = await checkExistingSetup(pythonPath, modelName);
    if (alreadySetup) {
      console.log('✅ Setup already complete! VisualAI is ready to use.\n');
      return {
        success: true,
        pythonPath,
        modelName,
        dependenciesInstalled: true,
        modelDownloaded: true,
      };
    }

    const spinner = ora('Checking Python and dependencies...').start();
    const checker = new DependencyChecker(pythonPath);
    const requirements = await checker.checkAll();

    if (!requirements.pythonAvailable) {
      spinner.fail('Python not found');
      throw new Error(`Python not found at ${pythonPath}`);
    }

    spinner.succeed(`Found Python ${requirements.pythonVersion}`);

    const envInfo = await autoDetectEnvironment(pythonPath);
    console.log(`${envInfo.mlxInstalled ? '✓' : '⚠'} MLX ${envInfo.mlxInstalled ? 'installed' : 'not installed'}`);
    console.log(`${envInfo.modelDownloaded ? '✓' : '⚠'} Model ${envInfo.modelDownloaded ? 'found' : 'not found'}`);
    if (!envInfo.appleChip) {
      console.log('⚠ Warning: MLX requires Apple Silicon (M1+)');
    }

    let dependenciesInstalled = requirements.allSatisfied;

    if (!requirements.allSatisfied) {
      const missing = requirements.dependencies.filter(d => !d.installed);
      console.log(`⚠ Missing dependencies: ${missing.map(d => d.name).join(', ')}`);

      const confirmInstall = options.skipConfirmation || (await prompts({
        type: 'confirm',
        name: 'value',
        message: 'Install missing Python dependencies?',
        initial: true,
      })).value;

      if (confirmInstall) {
        const installSpinner = ora('Installing dependencies...').start();
        const installer = new AutoInstaller(pythonPath);

        const pipUpgraded = await installer.upgradePip();
        if (pipUpgraded) {
          installSpinner.text = 'Upgraded pip';
        }

        const result = await installer.installAll((progress) => {
          installSpinner.text = `Installing ${progress.dependency || progress.step}...`;
        });

        if (result.success) {
          installSpinner.succeed('All dependencies installed!');
          dependenciesInstalled = true;
        } else {
          installSpinner.fail(`Failed to install: ${result.failed.join(', ')}`);
          throw new Error('Dependency installation failed');
        }
      } else {
        console.log('⚠ Skipping dependency installation');
      }
    }

    const downloader = new ModelDownloader(pythonPath, modelName);
    const isDownloaded = await downloader.isModelDownloaded();
    let modelDownloaded = isDownloaded;

    if (!isDownloaded) {
      const confirmDownload = options.skipConfirmation || (await prompts({
        type: 'confirm',
        name: 'value',
        message: `Download model '${modelName}'? (~5GB)`,
        initial: true,
      })).value;

      if (confirmDownload) {
        const downloadSpinner = ora('Downloading model...').start();
        let lastUpdate = Date.now();
        let lastBytes = 0;
        let downloadSpeed = 0;

        const downloadResult = await downloader.downloadModel((progress) => {
          if (progress.bytesDownloaded && progress.totalBytes) {
            const now = Date.now();
            const elapsed = (now - lastUpdate) / 1000;

            if (elapsed >= 1) {
              const bytesSinceLastUpdate = progress.bytesDownloaded - lastBytes;
              downloadSpeed = bytesSinceLastUpdate / elapsed;
              lastUpdate = now;
              lastBytes = progress.bytesDownloaded;
            }

            const percent = Math.floor((progress.bytesDownloaded / progress.totalBytes) * 100);
            const mbDownloaded = formatBytes(progress.bytesDownloaded);
            const mbTotal = formatBytes(progress.totalBytes);

            let etaText = '';
            if (downloadSpeed > 0) {
              const remaining = progress.totalBytes - progress.bytesDownloaded;
              const etaSeconds = Math.ceil(remaining / downloadSpeed);
              etaText = ` ~${formatETA(etaSeconds)}`;
            }

            downloadSpinner.text = `Downloading model... ${percent}% (${mbDownloaded}MB/${mbTotal}MB)${etaText}`;
          } else {
            downloadSpinner.text = progress.step;
          }
        });

        if (downloadResult.success) {
          downloadSpinner.succeed('Model downloaded successfully!');
          modelDownloaded = true;
        } else {
          downloadSpinner.fail('Model download failed');
          throw downloadResult.error || new Error('Model download failed');
        }
      } else {
        console.log('⚠ Skipping model download');
      }
    }

    const validationSpinner = ora('Validating setup...').start();
    const engine = new MLXEngine({
      pythonPath,
      modelName,
      timeout: 30000,
      minPythonVersion: '3.9',
    });

    const status = await engine.checkStatus();

    if (status.ready) {
      validationSpinner.succeed('Setup validated');

      const healthSpinner = ora('Running health check (test generation)...').start();
      const healthResult = await runHealthCheck(pythonPath, modelName);

      if (healthResult.success) {
        healthSpinner.succeed(`Health check passed! (${healthResult.generationTime}ms)`);
      } else {
        healthSpinner.fail('Health check failed');
        logger.warn('Health check error:', healthResult.error);
        console.log('⚠ Setup is functional but health check failed. You may experience issues.');
      }

      const config = ConfigManager.load();
      const configSpinner = ora('Configuring Claude Desktop...').start();
      const injectResult = await injectClaudeDesktopConfig(pythonPath, config.model.cacheDir);

      if (injectResult.success) {
        configSpinner.succeed(`Claude Desktop configured at ${injectResult.configPath}`);
      } else {
        configSpinner.warn('Could not auto-configure Claude Desktop');
        logger.warn('Config injection failed:', injectResult.error);
      }

      console.log('\n✅ Setup complete! VisualAI is ready to use.');
      console.log('\nNext steps:');
      if (injectResult.success) {
        console.log('  1. Restart Claude Desktop to activate the VisualAI MCP server');
        console.log('  2. Open Claude and check MCP servers list (should show "visualai")');
        console.log('  3. Start using VisualAI tools!\n');
      } else {
        console.log('  1. Manually add VisualAI to claude_desktop_config.json');
        console.log('  2. See documentation for manual setup instructions');
        console.log('  3. Restart Claude Desktop\n');
      }

      return {
        success: true,
        pythonPath,
        modelName,
        dependenciesInstalled,
        modelDownloaded,
      };
    } else {
      validationSpinner.fail('Setup validation failed');
      logger.error('Validation error:', status.error);
      throw new Error(status.error || 'Validation failed');
    }
  } catch (error) {
    logger.error('Setup failed', error as Error);
    return {
      success: false,
      pythonPath: options.pythonPath || '',
      modelName: options.modelName || '',
      dependenciesInstalled: false,
      modelDownloaded: false,
      error: error as Error,
    };
  }
}
