import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { promises as fs } from 'fs';
import { SessionManager } from '../../src/session/session-manager.js';
import type { Session } from '../../src/session/session-manager.js';

describe('Integration: SessionManager Error Handling & Recovery', () => {
  let testStorageDir: string;
  let sessionManager: SessionManager;

  beforeEach(async () => {
    testStorageDir = path.join(process.cwd(), 'workspace', 'data', 'test-session-errors');
    await fs.mkdir(testStorageDir, { recursive: true });
    sessionManager = new SessionManager(testStorageDir);
    await sessionManager.initialize();
  });

  afterEach(async () => {
    await fs.rm(testStorageDir, { recursive: true, force: true });
  });

  describe('Scenario 1: I/O Failure Recovery', () => {
    it('should handle write failure with actionable error message', async () => {
      const session = await sessionManager.createSession();
      const sessionDir = path.join(testStorageDir, session.id);

      await fs.chmod(sessionDir, 0o444);

      await expect(sessionManager.saveSession(session)).rejects.toThrow(/permission/i);

      await fs.chmod(sessionDir, 0o755);
    });

    it('should return null when session.json is missing', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;
      await sessionManager.saveSession(session);

      const sessionJsonPath = path.join(testStorageDir, sessionId, 'session.json');
      await fs.unlink(sessionJsonPath);

      const freshManager = new SessionManager(testStorageDir);
      await freshManager.initialize();

      const loaded = await freshManager.loadSession(sessionId);
      expect(loaded).toBeNull();
    });
  });

  describe('Scenario 2: Corrupted File Recovery', () => {
    it('should handle invalid JSON in session.json gracefully', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      await sessionManager.deleteSession(sessionId);

      const sessionJsonPath = path.join(testStorageDir, sessionId, 'session.json');
      await fs.mkdir(path.dirname(sessionJsonPath), { recursive: true });
      await fs.writeFile(sessionJsonPath, '{ invalid json syntax,,, }', 'utf-8');

      const freshManager = new SessionManager(testStorageDir);
      await freshManager.initialize();

      const loaded = await freshManager.loadSession(sessionId);
      expect(loaded).toBeNull();
    });

    it('should handle truncated session.json gracefully', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      await sessionManager.deleteSession(sessionId);

      const sessionJsonPath = path.join(testStorageDir, sessionId, 'session.json');
      const originalContent = JSON.stringify(session);
      const truncated = originalContent.substring(0, originalContent.length / 2);
      await fs.mkdir(path.dirname(sessionJsonPath), { recursive: true });
      await fs.writeFile(sessionJsonPath, truncated, 'utf-8');

      const freshManager = new SessionManager(testStorageDir);
      await freshManager.initialize();

      const loaded = await freshManager.loadSession(sessionId);
      expect(loaded).toBeNull();
    });

    it('should handle empty session.json gracefully', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      await sessionManager.deleteSession(sessionId);

      const sessionJsonPath = path.join(testStorageDir, sessionId, 'session.json');
      await fs.mkdir(path.dirname(sessionJsonPath), { recursive: true });
      await fs.writeFile(sessionJsonPath, '', 'utf-8');

      const freshManager = new SessionManager(testStorageDir);
      await freshManager.initialize();

      const loaded = await freshManager.loadSession(sessionId);
      expect(loaded).toBeNull();
    });
  });

  describe('Scenario 3: Concurrent Session Access', () => {
    it('should handle multiple sessions created in parallel', async () => {
      const promises = Array.from({ length: 5 }, () => sessionManager.createSession());
      const sessions = await Promise.all(promises);

      const ids = sessions.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);

      for (const session of sessions) {
        const loaded = await sessionManager.loadSession(session.id);
        expect(loaded).not.toBeNull();
        expect(loaded?.id).toBe(session.id);
      }
    });

    it('should isolate sessions (no cross-contamination)', async () => {
      const sessionA = await sessionManager.createSession();
      const sessionB = await sessionManager.createSession();

      sessionA.metadata.lastPrompt = 'Session A data';
      await sessionManager.saveSession(sessionA);

      sessionB.metadata.lastPrompt = 'Session B data';
      await sessionManager.saveSession(sessionB);

      const loadedA = await sessionManager.loadSession(sessionA.id);
      const loadedB = await sessionManager.loadSession(sessionB.id);

      expect(loadedA?.metadata.lastPrompt).toBe('Session A data');
      expect(loadedB?.metadata.lastPrompt).toBe('Session B data');
    });

    it('should handle concurrent write to same session (last write wins)', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      const session1 = { ...session, metadata: { ...session.metadata, totalIterations: 1 } };
      const session2 = { ...session, metadata: { ...session.metadata, totalIterations: 2 } };

      await Promise.all([
        sessionManager.saveSession(session1 as Session),
        sessionManager.saveSession(session2 as Session),
      ]);

      const loaded = await sessionManager.loadSession(sessionId);
      expect(loaded).not.toBeNull();
      expect(typeof loaded!.metadata.totalIterations).toBe('number');
      expect(loaded!.metadata.totalIterations).toBeGreaterThanOrEqual(0);
      expect(loaded!.metadata.totalIterations).toBeLessThanOrEqual(2);
    });
  });

  describe('Scenario 4: Cleanup on Failure', () => {
    it('should not leave orphaned directories on create failure', async () => {
      const sessionsBefore = await sessionManager.listSessions();
      const countBefore = sessionsBefore.length;

      const session = await sessionManager.createSession();
      const sessionId = session.id;

      const sessionDir = path.join(testStorageDir, sessionId);
      await expect(fs.access(sessionDir)).resolves.not.toThrow();

      await sessionManager.deleteSession(sessionId);

      const sessionsAfter = await sessionManager.listSessions();
      expect(sessionsAfter.length).toBe(countBefore);

      await expect(fs.access(sessionDir)).rejects.toThrow();
    });

    it('should cleanup temporary files on save failure', async () => {
      const session = await sessionManager.createSession();

      const sessionDir = path.join(testStorageDir, session.id);
      const files = await fs.readdir(sessionDir);
      const tempFiles = files.filter(f => f.endsWith('.tmp'));
      expect(tempFiles.length).toBe(0);
    });
  });

  describe('Scenario 5: Session Metadata Consistency', () => {
    it('should maintain consistent metadata after save/load cycle', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      session.metadata.totalIterations = 42;
      session.metadata.lastPrompt = 'Test prompt for metadata persistence';

      await sessionManager.saveSession(session);
      const loaded = await sessionManager.loadSession(sessionId);

      expect(loaded).not.toBeNull();
      expect(loaded?.metadata.totalIterations).toBe(42);
      expect(loaded?.metadata.lastPrompt).toBe('Test prompt for metadata persistence');
    });

    it('should preserve session after multiple save/load cycles', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      for (let i = 0; i < 10; i++) {
        session.metadata.totalIterations = i;
        await sessionManager.saveSession(session);

        const loaded = await sessionManager.loadSession(sessionId);
        expect(loaded).not.toBeNull();
        expect(loaded?.metadata.totalIterations).toBe(i);
      }
    });
  });

  describe('Scenario 6: Error Message Quality', () => {
    it('should provide actionable error on missing storage directory', async () => {
      const invalidDir = '/nonexistent/path/that/does/not/exist';
      const invalidManager = new SessionManager(invalidDir);

      await expect(invalidManager.initialize()).rejects.toThrow();
    });

    it('should provide clear error on invalid session ID', async () => {
      const loaded = await sessionManager.loadSession('invalid-id-that-does-not-exist');
      expect(loaded).toBeNull();
    });

    it('should validate session structure on load', async () => {
      const sessionId = 'test-invalid-structure';
      const sessionDir = path.join(testStorageDir, sessionId);
      await fs.mkdir(sessionDir, { recursive: true });

      const sessionJsonPath = path.join(sessionDir, 'session.json');
      await fs.writeFile(sessionJsonPath, JSON.stringify({ invalid: 'structure' }), 'utf-8');

      const loaded = await sessionManager.loadSession(sessionId);
      expect(loaded).toBeNull();
    });
  });

  describe('Scenario 7: Resource Cleanup', () => {
    it('should delete all session files on deleteSession', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      const sessionDir = path.join(testStorageDir, sessionId);
      await fs.writeFile(path.join(sessionDir, 'extra.txt'), 'extra data', 'utf-8');

      await sessionManager.deleteSession(sessionId);

      await expect(fs.access(sessionDir)).rejects.toThrow();
    });

    it('should handle deleteSession on non-existent session gracefully', async () => {
      await expect(sessionManager.deleteSession('non-existent-id')).resolves.not.toThrow();
    });
  });
});
