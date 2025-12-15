import { Logger } from '../utils/logger.js';

const logger = new Logger('Retry');

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();

  const retryablePatterns = [
    /timeout/i,
    /econnrefused/i,
    /etimedout/i,
    /enotfound/i,
    /enetunreach/i,
    /out of memory/i,
    /rate limit/i,
    /server error/i,
    /503 service unavailable/i,
    /502 bad gateway/i,
  ];

  return retryablePatterns.some(pattern => pattern.test(errorMessage));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 8000,
    jitter = true,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!isRetryableError(lastError)) {
        logger.warn('Non-retryable error encountered', { error: lastError.message });
        throw lastError;
      }

      if (attempt >= maxAttempts - 1) {
        logger.error('Max retry attempts reached', {
          attempts: maxAttempts,
          lastError: lastError.message,
        });
        break;
      }

      let delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);

      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }

      logger.info('Retrying after error', {
        attempt: attempt + 1,
        maxAttempts,
        delayMs: Math.round(delay),
        error: lastError.message,
      });

      if (onRetry) {
        onRetry(attempt + 1, lastError, delay);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}
