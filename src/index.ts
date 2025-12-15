import { main } from './mcp/server.js';
import { Logger } from './utils/logger.js';

const logger = new Logger('main');

async function startServer(): Promise<void> {
  try {
    logger.info('Starting VisualAI MCP Server...');
    await main();
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

startServer();
