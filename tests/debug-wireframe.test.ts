import { SessionManager } from '../src/session/session-manager.js';
import type { Wireframe } from '../src/types/index.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';

describe('Debug: Wireframe Save/Load', () => {
  let sessionManager: SessionManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'test-sessions-'));
    sessionManager = new SessionManager(tempDir);
    await sessionManager.initialize();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should save and load currentWireframe', async () => {
    // Create session
    const session = await sessionManager.createSession();
    console.log('1. Session created:', session.id);

    // Create wireframe
    const wireframe: Wireframe = {
      id: 'test-wireframe-123',
      sessionId: session.id,
      description: 'Test wireframe',
      components: [],
      metadata: {
        width: 1024,
        height: 768,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    // Set currentWireframe
    session.currentWireframe = wireframe;
    console.log('2. Set currentWireframe:', wireframe.id);

    // Save session
    await sessionManager.saveSession(session);
    console.log('3. Session saved');

    // Load session
    const loaded = await sessionManager.loadSession(session.id);
    console.log('4. Session loaded');
    console.log('5. currentWireframe:', loaded?.currentWireframe);

    // Verify
    expect(loaded).toBeDefined();
    expect(loaded?.currentWireframe).toBeDefined();
    expect(loaded?.currentWireframe?.id).toBe('test-wireframe-123');
  });
});
