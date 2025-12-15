import { mkdir, readFile, writeFile, readdir, unlink, rm } from 'fs/promises';
import { join } from 'path';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { Logger } from '../utils/logger.js';
import { Iteration, IterationHistory } from './iteration-history.js';
import { clearSessionCache } from '../mcp/tools/export-image.js';
import { MetricsCollector } from '../lib/metrics.js';
import type { AssetSession, Variant, Wireframe } from '../types/index.js';

interface SessionMetadata {
  totalIterations: number;
  lastPrompt?: string;
}

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  iterations: Iteration[];
  metadata: SessionMetadata;
  currentAsset?: AssetSession;
  currentWireframe?: Wireframe;
}

interface SerializedSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  iterations: Iteration[];
  metadata: SessionMetadata;
  currentAsset?: AssetSession;
  currentWireframe?: Wireframe;
}

export class SessionManager {
  private storageDir: string;
  private logger: Logger;
  private activeSessions: Map<string, { session: Session; history: IterationHistory }> = new Map();
  private variantCache = new Map<string, Map<string, { variants: Variant[]; timestamp: number }>>();
  private metricsCollector: MetricsCollector = new MetricsCollector();

  constructor(storageDir: string) {
    this.storageDir = storageDir;
    this.logger = new Logger('SessionManager');
  }

  private getSessionDir(sessionId: string): string {
    const sanitized = sessionId.replace(/[^a-zA-Z0-9-_]/g, '');
    return join(this.storageDir, sanitized);
  }

  private getImageDir(sessionId: string): string {
    return join(this.getSessionDir(sessionId), 'images');
  }

  private getImagePath(sessionId: string, iterationIndex: number): string {
    return join(this.getImageDir(sessionId), `${iterationIndex}.png`);
  }

  private async ensureImageDir(sessionId: string): Promise<void> {
    const imageDir = this.getImageDir(sessionId);
    await mkdir(imageDir, { recursive: true });
  }

  async initialize(): Promise<void> {
    try {
      if (!existsSync(this.storageDir)) {
        await mkdir(this.storageDir, { recursive: true });
        this.logger.info(`Session storage directory created: ${this.storageDir}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize session storage directory', error);
      throw error;
    }
  }

  async createSession(): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      iterations: [],
      metadata: {
        totalIterations: 0,
      },
    };

    const history = new IterationHistory(session.id);
    this.activeSessions.set(session.id, { session, history });

    await this.saveSession(session);
    this.metricsCollector.recordSessionCreated(session.id);
    this.logger.info(`Session created: ${session.id}`);

    return session;
  }

  async loadSession(sessionId: string): Promise<Session | null> {
    try {
      const cached = this.activeSessions.get(sessionId);
      if (cached) {
        return cached.session;
      }

      const sessionDir = this.getSessionDir(sessionId);
      const sessionJsonPath = join(sessionDir, 'session.json');

      if (!existsSync(sessionJsonPath)) {
        const legacyPath = this.getSessionFilePath(sessionId);
        if (!existsSync(legacyPath)) {
          this.logger.warn(`Session file not found: ${sessionId}`);
          return null;
        }
        return this.loadLegacySession(sessionId);
      }

      const content = await readFile(sessionJsonPath, 'utf-8');
      const data = JSON.parse(content) as SerializedSession;

      this.validateSessionData(data);

      let needsMigration = false;
      for (const iteration of data.iterations) {
        if (iteration.result.imageBase64 && !iteration.result.imagePath) {
          needsMigration = true;
          break;
        }
      }

      if (needsMigration) {
        this.logger.info(`Migrating session ${sessionId} to lazy-loading format`);
        await this.saveSession(data);
      }

      const history = new IterationHistory(data.id);
      for (const iteration of data.iterations) {
        history.addIteration(iteration.prompt, iteration.result);
      }

      this.activeSessions.set(data.id, { session: data, history });
      this.logger.info(`Session loaded: ${sessionId}`);

      return data;
    } catch (error) {
      this.logger.error(`Failed to load session ${sessionId}`, error);
      return null;
    }
  }

  private async loadLegacySession(sessionId: string): Promise<Session | null> {
    try {
      const filePath = this.getSessionFilePath(sessionId);
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as SerializedSession;

      this.validateSessionData(data);
      this.logger.info(`Loaded legacy session format: ${sessionId}`);
      await this.saveSession(data);

      const history = new IterationHistory(data.id);
      for (const iteration of data.iterations) {
        history.addIteration(iteration.prompt, iteration.result);
      }

      this.activeSessions.set(data.id, { session: data, history });
      return data;
    } catch (error) {
      this.logger.error(`Failed to load legacy session ${sessionId}`, error);
      return null;
    }
  }

  async saveSession(session: Session): Promise<void> {
    try {
      const sessionDir = this.getSessionDir(session.id);
      await mkdir(sessionDir, { recursive: true });
      await this.ensureImageDir(session.id);

      for (const iteration of session.iterations) {
        if (iteration.result.imageBase64) {
          const imagePath = this.getImagePath(session.id, iteration.index);
          const imageBuffer = Buffer.from(iteration.result.imageBase64, 'base64');
          await writeFile(imagePath, imageBuffer);

          iteration.result.imagePath = imagePath;
          delete iteration.result.imageBase64;
        }
      }

      const data: SerializedSession = {
        id: session.id,
        createdAt: session.createdAt,
        updatedAt: new Date().toISOString(),
        iterations: session.iterations,
        metadata: session.metadata,
        currentAsset: session.currentAsset,
        currentWireframe: session.currentWireframe,
      };

      const sessionJsonPath = join(sessionDir, 'session.json');
      await writeFile(sessionJsonPath, JSON.stringify(data, null, 2), 'utf-8');

      const cached = this.activeSessions.get(session.id);
      if (cached) {
        cached.session = data;
      }

      this.logger.debug(`Session saved: ${session.id}`);
    } catch (error) {
      this.logger.error(`Failed to save session ${session.id}`, error);
      throw error;
    }
  }

  async loadIterationImage(sessionId: string, iterationIndex: number): Promise<string> {
    try {
      const session = await this.loadSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const iteration = session.iterations.find(it => it.index === iterationIndex);
      if (!iteration) {
        throw new Error(`Iteration ${iterationIndex} not found in session ${sessionId}`);
      }

      if (iteration.result.imageBase64) {
        return iteration.result.imageBase64;
      }

      if (!iteration.result.imagePath) {
        throw new Error(`No image path found for iteration ${iterationIndex}`);
      }

      const imageBuffer = await readFile(iteration.result.imagePath);
      const imageBase64 = imageBuffer.toString('base64');
      iteration.result.imageBase64 = imageBase64;

      return imageBase64;
    } catch (error) {
      this.logger.error(`Failed to load iteration image ${sessionId}:${iterationIndex}`, error);
      throw error;
    }
  }

  async listSessions(): Promise<Session[]> {
    try {
      if (!existsSync(this.storageDir)) {
        return [];
      }

      const files = await readdir(this.storageDir);
      const sessionFiles = files.filter((file) => file.endsWith('.json'));
      const sessions: Session[] = [];

      for (const file of sessionFiles) {
        const sessionId = file.replace(/\.json$/, '');
        const session = await this.loadSession(sessionId);

        if (session !== null) {
          sessions.push(session);
        }
      }

      return sessions.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } catch (error) {
      this.logger.error('Failed to list sessions', error);
      return [];
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const sessionDir = this.getSessionDir(sessionId);
      this.metricsCollector.recordSessionClosed(sessionId);

      if (existsSync(sessionDir)) {
        await rm(sessionDir, { recursive: true, force: true });
      } else {
        const legacyPath = this.getSessionFilePath(sessionId);
        if (existsSync(legacyPath)) {
          await unlink(legacyPath);
        }
      }

      this.activeSessions.delete(sessionId);
      clearSessionCache(sessionId);
      this.clearVariantCache(sessionId);
      this.logger.info(`Session deleted: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to delete session ${sessionId}`, error);
      throw error;
    }
  }

  getActiveSession(sessionId: string): Session | null {
    const active = this.activeSessions.get(sessionId);
    return active?.session ?? null;
  }

  getActiveHistory(sessionId: string): IterationHistory | null {
    const active = this.activeSessions.get(sessionId);
    return active?.history ?? null;
  }

  addIterationToSession(sessionId: string, prompt: string, result: any): Iteration | null {
    const active = this.activeSessions.get(sessionId);

    if (!active) {
      this.logger.warn(`Active session not found: ${sessionId}`);
      return null;
    }

    const iteration = active.history.addIteration(prompt, result);
    active.session.iterations.push(iteration);
    active.session.metadata.totalIterations = active.history.size();
    active.session.metadata.lastPrompt = prompt;
    active.session.updatedAt = new Date().toISOString();

    this.logger.debug(`Iteration added to session ${sessionId}: index ${iteration.index}`);
    return iteration;
  }

  public buildVariantCacheKey(
    assetType: string,
    assetDescription: string,
    width: number,
    height: number
  ): string {
    const normalized = assetDescription
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
    return `${assetType}:${normalized}:${width}x${height}`;
  }

  public getVariantCache(sessionId: string, cacheKey: string): Variant[] | null {
    const sessionCache = this.variantCache.get(sessionId);
    if (!sessionCache) return null;

    const cached = sessionCache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Variant cache hit: ${cacheKey}`);
      return cached.variants;
    }
    return null;
  }

  public setVariantCache(
    sessionId: string,
    cacheKey: string,
    variants: Variant[]
  ): void {
    if (!this.variantCache.has(sessionId)) {
      this.variantCache.set(sessionId, new Map());
    }

    this.variantCache.get(sessionId)!.set(cacheKey, {
      variants,
      timestamp: Date.now(),
    });

    this.logger.debug(`Cached ${variants.length} variants: ${cacheKey}`);
  }

  public clearVariantCache(sessionId: string): void {
    this.variantCache.delete(sessionId);
    this.logger.info(`Cleared variant cache for session ${sessionId}`);
  }

  public recordMetric(operationName: string, durationMs: number): void {
    this.metricsCollector.recordOperation(operationName, durationMs, true);
  }

  private getSessionFilePath(sessionId: string): string {
    const sanitized = sessionId.replace(/[^a-zA-Z0-9-_]/g, '');
    return join(this.storageDir, `${sanitized}.json`);
  }

  private validateSessionData(data: unknown): asserts data is SerializedSession {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid session data: not an object');
    }

    const session = data as Record<string, unknown>;

    if (typeof session.id !== 'string' || !session.id) {
      throw new Error('Invalid session data: missing or invalid id');
    }

    if (typeof session.createdAt !== 'string' || !session.createdAt) {
      throw new Error('Invalid session data: missing or invalid createdAt');
    }

    if (typeof session.updatedAt !== 'string' || !session.updatedAt) {
      throw new Error('Invalid session data: missing or invalid updatedAt');
    }

    if (!Array.isArray(session.iterations)) {
      throw new Error('Invalid session data: iterations must be an array');
    }

    if (!session.metadata || typeof session.metadata !== 'object') {
      throw new Error('Invalid session data: missing or invalid metadata');
    }

    const metadata = session.metadata as Record<string, unknown>;
    if (typeof metadata.totalIterations !== 'number') {
      throw new Error('Invalid session data: metadata.totalIterations must be a number');
    }
  }

  async saveWireframe(sessionId: string, wireframe: Wireframe): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const wireframePath = path.join(this.storageDir, sessionId, 'wireframes');
    await fs.mkdir(wireframePath, { recursive: true });

    const filename = `wireframe-${wireframe.id}.json`;
    const filepath = path.join(wireframePath, filename);

    await fs.writeFile(
      filepath,
      JSON.stringify(wireframe, null, 2),
      'utf-8'
    );

    this.logger.info(`Saved wireframe ${wireframe.id} to session ${sessionId}`);
  }

  async loadWireframe(sessionId: string, wireframeId: string): Promise<Wireframe | null> {
    const wireframePath = path.join(this.storageDir, sessionId, 'wireframes', `wireframe-${wireframeId}.json`);

    try {
      const content = await fs.readFile(wireframePath, 'utf-8');
      const wireframe = JSON.parse(content) as Wireframe;
      this.logger.info(`Loaded wireframe ${wireframeId} from session ${sessionId}`);
      return wireframe;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async listWireframes(sessionId: string): Promise<string[]> {
    const wireframePath = path.join(this.storageDir, sessionId, 'wireframes');

    try {
      const files = await fs.readdir(wireframePath);
      const wireframeIds = files
        .filter(f => f.startsWith('wireframe-') && f.endsWith('.json'))
        .map(f => f.replace('wireframe-', '').replace('.json', ''));
      return wireframeIds;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async deleteWireframe(sessionId: string, wireframeId: string): Promise<void> {
    const wireframePath = path.join(this.storageDir, sessionId, 'wireframes', `wireframe-${wireframeId}.json`);

    try {
      await fs.unlink(wireframePath);
      this.logger.info(`Deleted wireframe ${wireframeId} from session ${sessionId}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  getActiveSessionCount(): number {
    return this.metricsCollector.getActiveSessionCount();
  }

  getMetricsSnapshot() {
    return this.metricsCollector.getSnapshot();
  }

  getMetricsSummary(): string {
    return this.metricsCollector.getSummary();
  }

  getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }
}
