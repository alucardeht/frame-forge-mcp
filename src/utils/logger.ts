import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { SensitiveDataFilter } from '../lib/sensitive-data-filter.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface StructuredLogEntry {
  timestamp: string;
  level: string;
  namespace: string;
  operation?: string;
  message: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

function colorize(text: string, level: LogLevel): string {
  const hasColor = process.stdout.isTTY && process.env.NO_COLOR !== '1';

  if (!hasColor) {
    return text;
  }

  const colors: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: '\x1b[36m',
    [LogLevel.INFO]: '\x1b[32m',
    [LogLevel.WARN]: '\x1b[33m',
    [LogLevel.ERROR]: '\x1b[31m',
  };

  const reset = '\x1b[0m';
  return `${colors[level]}${text}${reset}`;
}

function levelToString(level: LogLevel): string {
  const names: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
  };

  return names[level];
}

export class Logger {
  private namespace: string;
  private minLevel: LogLevel;
  private static logDirectory = path.join(os.homedir(), '.visualai', 'logs');
  private static lastRotationCheck = Date.now();

  constructor(namespace: string, minLevel: LogLevel = LogLevel.INFO) {
    this.namespace = namespace;
    this.minLevel = minLevel;
  }

  private formatLogEntry(level: LogLevel, message: string, args?: unknown[]): string {
    const timestamp = formatTimestamp();
    const levelStr = levelToString(level);
    const colored = colorize(levelStr, level);
    const baseEntry = `[${timestamp}] ${colored} [${this.namespace}] ${message}`;

    if (args && args.length > 0) {
      return `${baseEntry} ${JSON.stringify(args)}`;
    }

    return baseEntry;
  }

  private log(level: LogLevel, message: string, args?: unknown[]): void {
    if (level < this.minLevel) {
      return;
    }

    const formatted = this.formatLogEntry(level, message, args);

    if (level === LogLevel.ERROR) {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, args);
  }

  error(message: string, error?: Error | unknown): void {
    if (error instanceof Error) {
      const errorStr = `${error.message}${error.stack ? '\n' + error.stack : ''}`;
      this.log(LogLevel.ERROR, message, [errorStr]);
    } else if (error !== undefined) {
      this.log(LogLevel.ERROR, message, [error]);
    } else {
      this.log(LogLevel.ERROR, message);
    }
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private static async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(Logger.logDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private static getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(Logger.logDirectory, `${date}.log`);
  }

  private static async rotateLogsIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (now - Logger.lastRotationCheck < oneDayMs) {
      return;
    }

    Logger.lastRotationCheck = now;

    try {
      const files = await fs.readdir(Logger.logDirectory);
      const sevenDaysAgo = Date.now() - 7 * oneDayMs;

      for (const file of files) {
        if (!file.endsWith('.log')) continue;

        const filePath = path.join(Logger.logDirectory, file);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs < sevenDaysAgo || stats.size > 10 * 1024 * 1024) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Log rotation failed:', error);
    }
  }

  private static async writeToFile(entry: StructuredLogEntry): Promise<void> {
    try {
      await Logger.ensureLogDirectory();
      await Logger.rotateLogsIfNeeded();

      const logFile = Logger.getLogFileName();
      const filteredEntry = SensitiveDataFilter.filter(entry);
      const logLine = JSON.stringify(filteredEntry) + '\n';

      await fs.appendFile(logFile, logLine, 'utf-8');
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  public logOperation(
    operation: string,
    message: string,
    options?: {
      durationMs?: number;
      metadata?: Record<string, unknown>;
      error?: Error;
      level?: LogLevel;
    }
  ): void {
    const level = options?.level ?? LogLevel.INFO;

    const filteredMetadata = options?.metadata
      ? SensitiveDataFilter.filter(options.metadata)
      : undefined;

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      namespace: this.namespace,
      operation,
      message,
      durationMs: options?.durationMs,
      metadata: filteredMetadata,
    };

    if (options?.error) {
      entry.error = {
        message: options.error.message,
        code: (options.error as any).code,
        stack: options.error.stack,
      };
    }

    this.log(level, message, filteredMetadata ? [filteredMetadata] : undefined);
    Logger.writeToFile(entry).catch(() => {});
  }
}
