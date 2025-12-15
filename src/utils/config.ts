import { resolve } from 'path';
import { homedir } from 'os';
import { readFileSync, existsSync } from 'fs';

interface PythonConfig {
  path: string;
  minVersion: string;
}

interface ModelConfig {
  name: string;
  cacheDir: string;
  quantization?: string;
}

interface ImageConfig {
  defaultWidth: number;
  defaultHeight: number;
  defaultSteps: number;
  defaultGuidanceScale?: number;
}

interface SessionConfig {
  storageDir: string;
}

interface PreviewServerConfig {
  port: number;
  enabled: boolean;
}

interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  file?: string;
}

interface PerformanceConfig {
  maxConcurrentGenerations: number;
  subprocessTimeoutMs: number;
}

export interface VisualAIConfig {
  python: PythonConfig;
  model: ModelConfig;
  image: ImageConfig;
  session: SessionConfig;
  previewServer: PreviewServerConfig;
  logging: LoggingConfig;
  performance: PerformanceConfig;
}

const DEFAULT_CONFIG: VisualAIConfig = {
  python: {
    path: 'python3',
    minVersion: '3.9',
  },
  model: {
    name: 'stabilityai/stable-diffusion-2-1',
    cacheDir: resolve(homedir(), '.cache/huggingface/hub'),
    quantization: '4bit',
  },
  image: {
    defaultWidth: 512,
    defaultHeight: 512,
    defaultSteps: 20,
    defaultGuidanceScale: 7.5,
  },
  session: {
    storageDir: resolve(homedir(), '.visualai/sessions'),
  },
  previewServer: {
    port: 3737,
    enabled: true,
  },
  logging: {
    level: 'info',
    file: resolve(homedir(), '.visualai/logs/mcp-server.log'),
  },
  performance: {
    maxConcurrentGenerations: 1,
    subprocessTimeoutMs: 120000,
  },
};

function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return resolve(homedir(), path.slice(2));
  }
  return resolve(path);
}

function parseEnvValue(value: string | undefined, defaultValue: string | number | boolean): string | number | boolean {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof defaultValue === 'boolean') {
    return value.toLowerCase() === 'true' || value === '1';
  }

  if (typeof defaultValue === 'number') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  return value;
}

function loadEnvFile(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return {};
  }

  try {
    const content = readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};

    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });

    return env;
  } catch {
    return {};
  }
}

export class ConfigManager {
  private static instance: VisualAIConfig | null = null;
  private static envVars: Record<string, string> | null = null;

  static load(): VisualAIConfig {
    if (this.instance !== null) {
      return this.instance;
    }

    this.envVars = loadEnvFile();
    const env = this.envVars;

    const config: VisualAIConfig = {
      python: {
        path: (parseEnvValue(env.PYTHON_PATH, DEFAULT_CONFIG.python.path) as string),
        minVersion: (parseEnvValue(env.PYTHON_MIN_VERSION, DEFAULT_CONFIG.python.minVersion) as string),
      },
      model: {
        name: (parseEnvValue(env.MODEL_NAME, DEFAULT_CONFIG.model.name) as string),
        cacheDir: expandPath(parseEnvValue(env.MODEL_CACHE_DIR, DEFAULT_CONFIG.model.cacheDir) as string),
        quantization: (parseEnvValue(env.MODEL_QUANTIZATION, DEFAULT_CONFIG.model.quantization || '') as string) || undefined,
      },
      image: {
        defaultWidth: (parseEnvValue(env.DEFAULT_IMAGE_WIDTH, DEFAULT_CONFIG.image.defaultWidth) as number),
        defaultHeight: (parseEnvValue(env.DEFAULT_IMAGE_HEIGHT, DEFAULT_CONFIG.image.defaultHeight) as number),
        defaultSteps: (parseEnvValue(env.DEFAULT_INFERENCE_STEPS, DEFAULT_CONFIG.image.defaultSteps) as number),
        defaultGuidanceScale: (parseEnvValue(env.DEFAULT_GUIDANCE_SCALE, DEFAULT_CONFIG.image.defaultGuidanceScale || 7.5) as number),
      },
      session: {
        storageDir: expandPath(parseEnvValue(env.SESSION_STORAGE_DIR, DEFAULT_CONFIG.session.storageDir) as string),
      },
      previewServer: {
        port: (parseEnvValue(env.PREVIEW_SERVER_PORT, DEFAULT_CONFIG.previewServer.port) as number),
        enabled: (parseEnvValue(env.PREVIEW_SERVER_ENABLED, DEFAULT_CONFIG.previewServer.enabled) as boolean),
      },
      logging: {
        level: (parseEnvValue(env.LOG_LEVEL, DEFAULT_CONFIG.logging.level) as 'debug' | 'info' | 'warn' | 'error'),
        file: env.LOG_FILE ? expandPath(env.LOG_FILE) : undefined,
      },
      performance: {
        maxConcurrentGenerations: (parseEnvValue(env.MAX_CONCURRENT_GENERATIONS, DEFAULT_CONFIG.performance.maxConcurrentGenerations) as number),
        subprocessTimeoutMs: (parseEnvValue(env.SUBPROCESS_TIMEOUT_MS, DEFAULT_CONFIG.performance.subprocessTimeoutMs) as number),
      },
    };

    this.validate(config);
    this.instance = config;
    return config;
  }

  static validate(config: VisualAIConfig): boolean {
    if (!config.python.path || config.python.path.trim() === '') {
      throw new Error('Config validation failed: python.path is required');
    }

    if (!config.model.name || config.model.name.trim() === '') {
      throw new Error('Config validation failed: model.name is required');
    }

    if (config.image.defaultWidth <= 0 || config.image.defaultWidth > 2048) {
      throw new Error('Config validation failed: image.defaultWidth must be between 1 and 2048');
    }

    if (config.image.defaultHeight <= 0 || config.image.defaultHeight > 2048) {
      throw new Error('Config validation failed: image.defaultHeight must be between 1 and 2048');
    }

    if (config.image.defaultSteps <= 0 || config.image.defaultSteps > 100) {
      throw new Error('Config validation failed: image.defaultSteps must be between 1 and 100');
    }

    if (config.previewServer.port <= 0 || config.previewServer.port > 65535) {
      throw new Error('Config validation failed: previewServer.port must be between 1 and 65535');
    }

    if (!['debug', 'info', 'warn', 'error'].includes(config.logging.level)) {
      throw new Error('Config validation failed: logging.level must be one of debug, info, warn, error');
    }

    if (config.performance.maxConcurrentGenerations <= 0) {
      throw new Error('Config validation failed: performance.maxConcurrentGenerations must be greater than 0');
    }

    if (config.performance.subprocessTimeoutMs <= 0) {
      throw new Error('Config validation failed: performance.subprocessTimeoutMs must be greater than 0');
    }

    return true;
  }

  static getDefault(): VisualAIConfig {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  static reset(): void {
    this.instance = null;
    this.envVars = null;
  }
}
