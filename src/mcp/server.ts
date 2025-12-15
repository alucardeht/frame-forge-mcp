import { MLXEngine, type MLXEngineConfig } from '../engines/mlx-engine.js';
import { SessionManager } from '../session/session-manager.js';
import { ConfigManager, type VisualAIConfig } from '../utils/config.js';
import { Logger, LogLevel } from '../utils/logger.js';
import { createMCPHandler, type MCPHandler } from './handler.js';
import type { MCPToolCall } from '../types/index.js';

const globalLogger = new Logger('MCPServer');

export class MCPServer {
  private engine: MLXEngine;
  private sessionManager: SessionManager;
  private handler: MCPHandler;
  private logger: Logger;
  private config: VisualAIConfig;
  private shuttingDown: boolean = false;

  constructor() {
    this.logger = new Logger('MCPServer');
    this.config = ConfigManager.load();

    if (this.config.logging.level) {
      const logLevels: Record<string, LogLevel> = {
        debug: LogLevel.DEBUG,
        info: LogLevel.INFO,
        warn: LogLevel.WARN,
        error: LogLevel.ERROR,
      };
      globalLogger.setMinLevel(logLevels[this.config.logging.level] || LogLevel.INFO);
    }

    this.logger.info('Initializing MCP Server');

    const engineConfig: MLXEngineConfig = {
      pythonPath: this.config.python.path,
      modelName: this.config.model.name,
      cacheDir: this.config.model.cacheDir,
      timeout: this.config.performance.subprocessTimeoutMs,
      minPythonVersion: this.config.python.minVersion,
    };

    this.engine = new MLXEngine(engineConfig);
    this.sessionManager = new SessionManager(this.config.session.storageDir);
    this.handler = createMCPHandler(this.engine, this.sessionManager);

    this.logger.info('MCP Server initialized');
  }

  async start(): Promise<void> {
    try {
      this.logger.info('Starting MCP Server');

      await this.sessionManager.initialize();
      this.logger.info('Session manager initialized');

      this.setupProcessHandlers();
      this.setupStdioHandlers();

      this.logger.info('MCP Server started and listening');
    } catch (error) {
      this.logger.error('Failed to start MCP Server', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  private setupProcessHandlers(): void {
    process.on('SIGINT', async () => {
      if (!this.shuttingDown) {
        this.shuttingDown = true;
        this.logger.info('Received SIGINT, shutting down gracefully');
        await this.shutdown();
        process.exit(0);
      }
    });

    process.on('SIGTERM', async () => {
      if (!this.shuttingDown) {
        this.shuttingDown = true;
        this.logger.info('Received SIGTERM, shutting down gracefully');
        await this.shutdown();
        process.exit(0);
      }
    });

    process.on('uncaughtException', async (error) => {
      this.logger.error('Uncaught exception', error);
      await this.shutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      this.logger.error('Unhandled promise rejection', reason);
      await this.shutdown();
      process.exit(1);
    });
  }

  private setupStdioHandlers(): void {
    let inputBuffer = '';

    process.stdin.setEncoding('utf-8');
    process.stdin.on('readable', () => {
      let chunk: string | null;
      while ((chunk = process.stdin.read()) !== null) {
        inputBuffer += chunk;

        const lines = inputBuffer.split('\n');
        inputBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            this.processMessage(line).catch((error) => {
              this.logger.error('Failed to process message', error);
            });
          }
        }
      }
    });

    process.stdin.on('end', async () => {
      this.logger.info('Input stream ended');
      await this.shutdown();
      process.exit(0);
    });

    process.stdin.on('error', async (error) => {
      this.logger.error('Input stream error', error);
      await this.shutdown();
      process.exit(1);
    });
  }

  private async processMessage(message: string): Promise<void> {
    try {
      const request = JSON.parse(message);

      if (!request.jsonrpc || request.jsonrpc !== '2.0') {
        this.sendError(request.id, 'Invalid JSON-RPC version');
        return;
      }

      if (request.method === 'tools/list') {
        this.handleListTools(request.id);
      } else if (request.method === 'tools/call') {
        await this.handleToolCall(request.id, request.params);
      } else {
        this.sendError(request.id, `Unknown method: ${request.method}`);
      }
    } catch (error) {
      this.logger.error('Failed to parse message', error);
      this.sendError(null, 'Invalid JSON');
    }
  }

  private handleListTools(id: string | number | null): void {
    const tools = this.handler.listTools();
    this.sendResponse(id, { tools });
  }

  private async handleToolCall(
    id: string | number | null,
    params: Record<string, unknown>
  ): Promise<void> {
    try {
      const toolName = params.name as string;
      const arguments_ = (params.arguments || {}) as Record<string, unknown>;

      const toolCall: MCPToolCall = {
        name: toolName,
        arguments: arguments_,
      };

      const result = await this.handler.callTool(toolCall);
      this.sendResponse(id, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendError(id, errorMessage);
    }
  }

  private sendResponse(id: string | number | null, result: unknown): void {
    const response = {
      jsonrpc: '2.0',
      id,
      result,
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  private sendError(
    id: string | number | null,
    message: string,
    code: number = -1
  ): void {
    const response = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down MCP Server');
      await this.engine.cleanup();
      this.logger.info('MCP Server shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown', error);
    }
  }
}

export async function main(): Promise<void> {
  const server = new MCPServer();
  await server.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    globalLogger.error('Fatal error in MCP Server', error);
    process.exit(1);
  });
}
