import { Logger } from '../utils/logger.js';

const logger = new Logger('Metrics');

export interface OperationMetric {
  operationName: string;
  durationMs: number;
  success: boolean;
  errorType?: string;
  timestamp: string;
  sessionId?: string;
}

export interface AggregatedMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  errorRate: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorsByType: Record<string, number>;
}

export interface SessionMetric {
  sessionId: string;
  createdAt: string;
  closedAt?: string;
  operationCount: number;
}

export interface MetricsSnapshot {
  timestamp: string;
  activeSessions: number;
  totalSessionsCreated: number;
  totalSessionsClosed: number;
  operationMetrics: Record<string, AggregatedMetrics>;
  recentOperations: OperationMetric[];
  uptime: number;
}

export class MetricsCollector {
  private operations: OperationMetric[] = [];
  private sessions: Map<string, SessionMetric> = new Map();
  private startTime: number = Date.now();
  private maxOperationsInMemory = 1000;
  private metricsRetentionMs = 24 * 60 * 60 * 1000;

  recordOperation(
    operationName: string,
    durationMs: number,
    success: boolean,
    errorType?: string,
    sessionId?: string
  ): void {
    const metric: OperationMetric = {
      operationName,
      durationMs,
      success,
      errorType,
      timestamp: new Date().toISOString(),
      sessionId,
    };

    this.operations.push(metric);

    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      session.operationCount++;
    }

    if (this.operations.length > this.maxOperationsInMemory) {
      this.cleanupOldOperations();
    }

    if (!success && errorType) {
      logger.warn('Operation failed', {
        operationName,
        errorType,
        durationMs,
        sessionId,
      });
    }
  }

  recordSessionCreated(sessionId: string): void {
    this.sessions.set(sessionId, {
      sessionId,
      createdAt: new Date().toISOString(),
      operationCount: 0,
    });

    logger.debug('Session created', { sessionId, totalActive: this.sessions.size });
  }

  recordSessionClosed(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.closedAt = new Date().toISOString();
      this.sessions.delete(sessionId);

      logger.debug('Session closed', {
        sessionId,
        durationMs: Date.now() - new Date(session.createdAt).getTime(),
        operationCount: session.operationCount,
      });
    }
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  getOperationMetrics(operationName: string): AggregatedMetrics {
    const operationRecords = this.operations.filter(
      (op) => op.operationName === operationName
    );

    if (operationRecords.length === 0) {
      return this.getEmptyAggregatedMetrics();
    }

    const successfulOps = operationRecords.filter((op) => op.success);
    const failedOps = operationRecords.filter((op) => !op.success);

    const latencies = operationRecords.map((op) => op.durationMs).sort((a, b) => a - b);
    const avgLatency =
      latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);

    const errorsByType: Record<string, number> = {};
    failedOps.forEach((op) => {
      if (op.errorType) {
        errorsByType[op.errorType] = (errorsByType[op.errorType] || 0) + 1;
      }
    });

    return {
      totalOperations: operationRecords.length,
      successfulOperations: successfulOps.length,
      failedOperations: failedOps.length,
      successRate:
        operationRecords.length > 0
          ? successfulOps.length / operationRecords.length
          : 0,
      errorRate:
        operationRecords.length > 0
          ? failedOps.length / operationRecords.length
          : 0,
      averageLatencyMs: Math.round(avgLatency),
      p95LatencyMs: latencies[p95Index] || 0,
      p99LatencyMs: latencies[p99Index] || 0,
      errorsByType,
    };
  }

  getAllOperationMetrics(): Record<string, AggregatedMetrics> {
    const operationNames = new Set(this.operations.map((op) => op.operationName));
    const result: Record<string, AggregatedMetrics> = {};

    operationNames.forEach((name) => {
      result[name] = this.getOperationMetrics(name);
    });

    return result;
  }

  getSnapshot(): MetricsSnapshot {
    const totalSessionsCreated = this.sessions.size;
    const closedSessions = this.operations.reduce((set, op) => {
      if (op.sessionId && !this.sessions.has(op.sessionId)) {
        set.add(op.sessionId);
      }
      return set;
    }, new Set<string>());

    return {
      timestamp: new Date().toISOString(),
      activeSessions: this.sessions.size,
      totalSessionsCreated,
      totalSessionsClosed: closedSessions.size,
      operationMetrics: this.getAllOperationMetrics(),
      recentOperations: this.operations.slice(-50),
      uptime: Date.now() - this.startTime,
    };
  }

  getSummary(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== VisualAI Metrics Summary ===',
      `Uptime: ${Math.round(snapshot.uptime / 1000 / 60)} minutes`,
      `Active Sessions: ${snapshot.activeSessions}`,
      `Total Sessions Created: ${snapshot.totalSessionsCreated}`,
      `Total Sessions Closed: ${snapshot.totalSessionsClosed}`,
      '',
      'Operation Metrics:',
    ];

    Object.entries(snapshot.operationMetrics).forEach(([name, metrics]) => {
      lines.push(`  ${name}:`);
      lines.push(`    Total: ${metrics.totalOperations}`);
      lines.push(`    Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);
      lines.push(`    Error Rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
      lines.push(`    Avg Latency: ${metrics.averageLatencyMs}ms`);
      lines.push(`    P95 Latency: ${metrics.p95LatencyMs}ms`);
      lines.push(`    P99 Latency: ${metrics.p99LatencyMs}ms`);

      if (Object.keys(metrics.errorsByType).length > 0) {
        lines.push(`    Errors by Type:`);
        Object.entries(metrics.errorsByType).forEach(([type, count]) => {
          lines.push(`      ${type}: ${count}`);
        });
      }
    });

    return lines.join('\n');
  }

  reset(): void {
    this.operations = [];
    this.sessions.clear();
    this.startTime = Date.now();
    logger.info('Metrics reset', { timestamp: new Date().toISOString() });
  }

  private cleanupOldOperations(): void {
    const cutoffTime = Date.now() - this.metricsRetentionMs;
    const initialCount = this.operations.length;

    this.operations = this.operations.filter((op) => {
      return new Date(op.timestamp).getTime() > cutoffTime;
    });

    const removed = initialCount - this.operations.length;
    if (removed > 0) {
      logger.debug('Cleaned up old operations', { removed, remaining: this.operations.length });
    }
  }

  private getEmptyAggregatedMetrics(): AggregatedMetrics {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      successRate: 0,
      errorRate: 0,
      averageLatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      errorsByType: {},
    };
  }
}
