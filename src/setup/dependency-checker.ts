import { spawn } from 'child_process';

export interface DependencyStatus {
  name: string;
  installed: boolean;
  version?: string;
  error?: string;
}

export interface SystemRequirements {
  pythonAvailable: boolean;
  pythonVersion?: string;
  dependencies: DependencyStatus[];
  allSatisfied: boolean;
}

const REQUIRED_DEPENDENCIES = [
  'mlx',
  'huggingface_hub',
  'pillow',
  'numpy',
  'tqdm',
  'regex',
];

export class DependencyChecker {
  private pythonPath: string;

  constructor(pythonPath: string = 'python3') {
    this.pythonPath = pythonPath;
  }

  async checkAll(): Promise<SystemRequirements> {
    const pythonCheck = await this.checkPython();

    if (!pythonCheck.available) {
      return {
        pythonAvailable: false,
        dependencies: [],
        allSatisfied: false,
      };
    }

    const dependencies = await Promise.all(
      REQUIRED_DEPENDENCIES.map(dep => this.checkDependency(dep))
    );

    const allSatisfied = dependencies.every(dep => dep.installed);

    return {
      pythonAvailable: true,
      pythonVersion: pythonCheck.version,
      dependencies,
      allSatisfied,
    };
  }

  private async checkPython(): Promise<{ available: boolean; version?: string }> {
    return new Promise((resolve) => {
      const process = spawn(this.pythonPath, ['--version']);

      let output = '';
      process.stdout.on('data', (data) => output += data.toString());
      process.stderr.on('data', (data) => output += data.toString());

      process.on('close', (code) => {
        if (code === 0) {
          const versionMatch = output.match(/Python (\d+\.\d+\.\d+)/);
          resolve({
            available: true,
            version: versionMatch ? versionMatch[1] : undefined,
          });
        } else {
          resolve({ available: false });
        }
      });

      process.on('error', () => resolve({ available: false }));
    });
  }

  private async checkDependency(name: string): Promise<DependencyStatus> {
    return new Promise((resolve) => {
      // Map package names to their Python import names
      const packageToImportMap: Record<string, string> = {
        'pillow': 'PIL',
      };

      const importName = packageToImportMap[name] || name.replace('-', '_');
      const command = `
try:
    import ${importName}
    try:
        version = ${importName}.__version__
    except AttributeError:
        version = 'installed'
    print(version)
except ImportError as e:
    print('IMPORT_ERROR')
    exit(1)
`.trim();

      const process = spawn(this.pythonPath, ['-c', command]);

      let output = '';
      let error = '';

      process.stdout.on('data', (data) => output += data.toString());
      process.stderr.on('data', (data) => error += data.toString());

      process.on('close', (code) => {
        if (code === 0 && !output.includes('IMPORT_ERROR')) {
          resolve({
            name,
            installed: true,
            version: output.trim() || undefined,
          });
        } else {
          resolve({
            name,
            installed: false,
            error: error.trim() || undefined,
          });
        }
      });

      process.on('error', (err) => {
        resolve({
          name,
          installed: false,
          error: err.message,
        });
      });
    });
  }

  async checkMinPythonVersion(minVersion: string): Promise<boolean> {
    const pythonCheck = await this.checkPython();
    if (!pythonCheck.available || !pythonCheck.version) return false;

    const [major, minor] = pythonCheck.version.split('.').map(Number);
    const [minMajor, minMinor] = minVersion.split('.').map(Number);

    return major > minMajor || (major === minMajor && minor >= minMinor);
  }
}
