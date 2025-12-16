import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MLXEngine, type MLXEngineConfig } from '../engines/mlx-engine.js';
import { SessionManager } from '../session/session-manager.js';
import { ConfigManager, type VisualAIConfig } from '../utils/config.js';
import { Logger, LogLevel } from '../utils/logger.js';
import { createMCPHandler, type MCPHandler } from './handler.js';

const globalLogger = new Logger('MCPServer');

export class MCPServer {
  private server: Server;
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

    this.server = new Server(
      {
        name: 'frame-forge-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.logger.info('MCP Server initialized');
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug('Handling list tools request');
      return {
        tools: this.handler.listTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        this.logger.info(`Handling tool call: ${name}`);

        const result = await this.handler.callTool({
          name,
          arguments: args || {},
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Tool call failed: ${errorMessage}`, error);
        throw error;
      }
    });
  }

  async start(): Promise<void> {
    try {
      this.logger.info('Starting MCP Server');

      await this.sessionManager.initialize();
      this.logger.info('Session manager initialized');

      this.setupProcessHandlers();

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      this.logger.info('MCP Server connected and listening on stdio');
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
