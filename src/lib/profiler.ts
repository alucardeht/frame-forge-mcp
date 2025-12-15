import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/logger.js';

const execAsync = promisify(exec);
const logger = new Logger('PerformanceProfiler');

export interface MemorySnapshot {
  timestamp: number;
  memoryMb: number;
  cpuPercent: number;
}

export interface ProfilingResult {
  duration: {
    startMs: number;
    endMs: number;
    totalMs: number;
  };
  memory: {
    baselineMb: number;
    peakMb: number;
    currentMb: number;
    deltaPercent: number;
  };
  cpu: {
    currentPercent: number;
    averagePercent: number;
    peakPercent: number;
  };
  gpu: {
    estimatePercent: number;
    method: 'latency' | 'unavailable';
    confidence: 'low' | 'medium';
  };
  warnings: Array<{
    type: 'high-memory' | 'high-cpu' | 'gpu-unknown';
    message: string;
    severity: 'warning' | 'error';
  }>;
}

export class PerformanceProfiler {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private pythonPid: number | null = null;
  private snapshots: MemorySnapshot[] = [];
  private startTime: number = 0;
  private endTime: number = 0;
  private pollingIntervalMs: number = 2000;

  async startMonitoring(pythonPid: number): Promise<void> {
    this.pythonPid = pythonPid;
    this.startTime = Date.now();
    this.snapshots = [];
    this.endTime = 0;

    logger.debug('Started profiling', { pythonPid, pollingIntervalMs: this.pollingIntervalMs });

    const baselineSnapshot = await this.captureSnapshot();
    if (baselineSnapshot) {
      this.snapshots.push(baselineSnapshot);
    }

    this.monitoringInterval = setInterval(async () => {
      const snapshot = await this.captureSnapshot();
      if (snapshot) {
        this.snapshots.push(snapshot);
      }
    }, this.pollingIntervalMs);
  }

  stopMonitoring(): ProfilingResult {
    this.endTime = Date.now();

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    return this.analyzeSnapshots();
  }

  private async captureSnapshot(): Promise<MemorySnapshot | null> {
    if (!this.pythonPid) {
      return null;
    }

    try {
      const { stdout } = await execAsync(`ps -p ${this.pythonPid} -o rss=,%%cpu=`);
      const lines = stdout.trim().split('\n');

      if (lines.length === 0 || !lines[0].trim()) {
        return null;
      }

      const parts = lines[0].trim().split(/\s+/);
      const memoryKb = parseInt(parts[0], 10);
      const cpuPercent = parseFloat(parts[1]);

      if (isNaN(memoryKb) || isNaN(cpuPercent)) {
        return null;
      }

      return {
        timestamp: Date.now(),
        memoryMb: memoryKb / 1024,
        cpuPercent,
      };
    } catch (error) {
      return null;
    }
  }

  private analyzeSnapshots(): ProfilingResult {
    const warnings: ProfilingResult['warnings'] = [];

    if (this.snapshots.length === 0) {
      return this.getEmptyResult();
    }

    const memoryValues = this.snapshots.map((s) => s.memoryMb);
    const cpuValues = this.snapshots.map((s) => s.cpuPercent);

    const baselineMb = memoryValues[0];
    const peakMb = Math.max(...memoryValues);
    const currentMb = memoryValues[memoryValues.length - 1];
    const deltaPercent = ((peakMb - baselineMb) / baselineMb) * 100;

    const peakCpu = Math.max(...cpuValues);
    const averageCpu = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
    const currentCpu = cpuValues[cpuValues.length - 1];

    if (peakMb > 3500) {
      warnings.push({
        type: 'high-memory',
        message: `Peak memory usage (${Math.round(peakMb)}MB) exceeds recommended limit (3500MB)`,
        severity: 'warning',
      });
    }

    if (peakMb > 4000) {
      warnings.push({
        type: 'high-memory',
        message: `Peak memory usage (${Math.round(peakMb)}MB) exceeds critical limit (4000MB)`,
        severity: 'error',
      });
    }

    if (peakCpu > 200) {
      warnings.push({
        type: 'high-cpu',
        message: `Peak CPU usage (${Math.round(peakCpu)}%) indicates heavy processing`,
        severity: 'warning',
      });
    }

    const totalDuration = this.endTime - this.startTime;
    const gpuEstimate = this.estimateGPUFromLatency(totalDuration, peakMb);

    warnings.push({
      type: 'gpu-unknown',
      message: 'GPU utilization is estimated (Metal API unavailable)',
      severity: 'warning',
    });

    logger.info('Profiling completed', {
      duration: totalDuration,
      memory: { baselineMb: Math.round(baselineMb), peakMb: Math.round(peakMb) },
      cpu: { averageCpu: Math.round(averageCpu), peakCpu: Math.round(peakCpu) },
      warnings: warnings.length,
    });

    return {
      duration: {
        startMs: this.startTime,
        endMs: this.endTime,
        totalMs: totalDuration,
      },
      memory: {
        baselineMb: Math.round(baselineMb * 100) / 100,
        peakMb: Math.round(peakMb * 100) / 100,
        currentMb: Math.round(currentMb * 100) / 100,
        deltaPercent: Math.round(deltaPercent * 100) / 100,
      },
      cpu: {
        currentPercent: Math.round(currentCpu * 100) / 100,
        averagePercent: Math.round(averageCpu * 100) / 100,
        peakPercent: Math.round(peakCpu * 100) / 100,
      },
      gpu: {
        estimatePercent: gpuEstimate,
        method: 'latency',
        confidence: 'low',
      },
      warnings,
    };
  }

  private estimateGPUFromLatency(durationMs: number, peakMemoryMb: number): number {
    const normalLatency = 5000;
    const normalMemory = 2000;

    const latencyRatio = durationMs / normalLatency;
    const memoryRatio = peakMemoryMb / normalMemory;

    const estimatedLoad = (latencyRatio + memoryRatio) / 2;
    const gpuPercent = Math.min(estimatedLoad * 50, 100);

    return Math.round(gpuPercent);
  }

  private getEmptyResult(): ProfilingResult {
    return {
      duration: {
        startMs: this.startTime,
        endMs: this.endTime || Date.now(),
        totalMs: (this.endTime || Date.now()) - this.startTime,
      },
      memory: {
        baselineMb: 0,
        peakMb: 0,
        currentMb: 0,
        deltaPercent: 0,
      },
      cpu: {
        currentPercent: 0,
        averagePercent: 0,
        peakPercent: 0,
      },
      gpu: {
        estimatePercent: 0,
        method: 'unavailable',
        confidence: 'low',
      },
      warnings: [
        {
          type: 'gpu-unknown',
          message: 'No profiling data collected',
          severity: 'error',
        },
      ],
    };
  }

  cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.snapshots = [];
    this.pythonPid = null;
  }
}
