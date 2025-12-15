import { Logger } from '../utils/logger.js';

const logger = new Logger('Timeout');

export interface TimeoutOptions {
  timeoutMs?: number;
  operationName?: string;
  heartbeatIntervalMs?: number;
  onHeartbeat?: (elapsedMs: number, estimatedTotalMs: number) => void;
}

export class TimeoutError extends Error {
  constructor(
    public readonly operationName: string,
    public readonly elapsedMs: number,
    public readonly timeoutMs: number
  ) {
    super(`Operation '${operationName}' timed out after ${elapsedMs}ms (limit: ${timeoutMs}ms)`);
    this.name = 'TimeoutError';
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const {
    timeoutMs = 90000,
    operationName = 'operation',
    heartbeatIntervalMs = 3000,
    onHeartbeat,
  } = options;

  const startTime = Date.now();
  let heartbeatInterval: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      const elapsed = Date.now() - startTime;

      logger.error('Operation timed out', {
        operation: operationName,
        elapsedMs: elapsed,
        timeoutMs,
      });

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      reject(new TimeoutError(operationName, elapsed, timeoutMs));
    }, timeoutMs);

    if (heartbeatIntervalMs > 0 && onHeartbeat) {
      heartbeatInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        logger.debug('Operation heartbeat', {
          operation: operationName,
          elapsedMs: elapsed,
          estimatedTotalMs: timeoutMs,
          progressPercent: Math.round((elapsed / timeoutMs) * 100),
        });

        onHeartbeat(elapsed, timeoutMs);
      }, heartbeatIntervalMs);
    }

    promise.finally(() => {
      clearTimeout(timeoutId);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    });
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);

    const elapsed = Date.now() - startTime;
    logger.info('Operation completed successfully', {
      operation: operationName,
      elapsedMs: elapsed,
    });

    return result;
  } catch (error) {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    throw error;
  }
}
