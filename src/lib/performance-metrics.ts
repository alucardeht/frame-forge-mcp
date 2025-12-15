import { Logger } from '../utils/logger.js';
import type { PerformanceMetrics } from '../types/index.js';

export class PerformanceMetricsCollector {
  private operationTimings: Map<string, { durationMs: number; count: number }> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PerformanceMetricsCollector');
  }

  recordTiming(operationName: string, durationMs: number): void {
    const existing = this.operationTimings.get(operationName);
    if (existing) {
      existing.durationMs += durationMs;
      existing.count += 1;
    } else {
      this.operationTimings.set(operationName, { durationMs, count: 1 });
    }

    this.logger.debug(`Recorded timing for ${operationName}: ${durationMs}ms`);
  }

  getMetrics(): PerformanceMetrics {
    const operationTimings: Record<string, { durationMs: number; count: number; averageMs: number }> = {};
    let totalDurationMs = 0;

    for (const [name, data] of this.operationTimings) {
      const averageMs = Math.round(data.durationMs / data.count);
      operationTimings[name] = {
        durationMs: data.durationMs,
        count: data.count,
        averageMs,
      };
      totalDurationMs += data.durationMs;
    }

    return {
      totalDurationMs,
      operationTimings,
      timestamp: new Date().toISOString(),
    };
  }

  getMetricsSummary(): string {
    const metrics = this.getMetrics();
    const lines = ['**Performance Metrics:**', ''];

    for (const [name, data] of Object.entries(metrics.operationTimings)) {
      lines.push(`- ${name}: ${data.averageMs}ms avg (${data.count} ops, ${data.durationMs}ms total)`);
    }

    lines.push('', `Total: ${metrics.totalDurationMs}ms`);
    return lines.join('\n');
  }

  reset(): void {
    this.operationTimings.clear();
    this.logger.debug('Metrics reset');
  }
}
