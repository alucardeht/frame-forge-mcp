# VisualAI Developer Guide

Complete guide for developers extending and contributing to VisualAI MCP Server.

**Version**: 1.0.0
**Audience**: Contributors, technical team
**Last Updated**: 2025-12-11

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Adding a New MCP Tool](#adding-a-new-mcp-tool)
5. [Extending SessionManager](#extending-sessionmanager)
6. [Adding a New Engine](#adding-a-new-engine)
7. [Testing](#testing)
8. [Logging & Monitoring](#logging--monitoring)
9. [Performance Profiling](#performance-profiling)
10. [Error Handling](#error-handling)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

VisualAI follows a **layered architecture** with clear separation of concerns:

```
┌──────────────────────────────────────────────┐
│     MCP Server (JSON-RPC 2.0 over stdio)    │  ← Entry point
├──────────────────────────────────────────────┤
│      MCP Handler + 25+ Tool Handlers        │  ← Business logic
├──────────────────────────────────────────────┤
│     SessionManager + IterationHistory       │  ← State management
├──────────────────────────────────────────────┤
│     Engine Abstraction (MLX, future)        │  ← ML/AI operations
├──────────────────────────────────────────────┤
│  Cross-Cutting: Logger, Metrics, Profiler  │  ← Observability
└──────────────────────────────────────────────┘
```

### Key Architectural Patterns

**1. Engine Abstraction**
- All generation engines implement `BaseEngine` interface
- Tools depend on abstract `BaseEngine`, not specific implementations
- Easy to add new engines (Stable Diffusion, DALL-E, etc.)

**2. Session-Based State**
- All operations tied to sessions
- Persistent storage in `~/.visualai/sessions/`
- IterationHistory provides undo/redo/rollback
- Cache layer for fast variant access

**3. MCP Protocol**
- JSON-RPC 2.0 over stdin/stdout
- Tools return `MCPToolResult` with content blocks
- Standardized error handling via `ErrorHandler`

**4. Tool Handler Pattern**
- Each tool has a schema definition (for introspection)
- Separate handler function for execution
- Centralized registration in tools/index.ts

---

## Development Setup

### Prerequisites

- Node.js 18+
- TypeScript 5.9+
- Python 3.8+ (for MLX integration)
- pnpm (or npm)

### Initial Setup

```bash
git clone <repo-url>
cd visualai-workspace

pnpm install
pnpm build
```

### Development Workflow

```bash
# Watch mode - rebuilds on file changes
pnpm dev

# Run tests
pnpm test                  # All tests
pnpm test:unit            # Unit tests only
pnpm test:acceptance      # Full user story tests

# Type checking
pnpm tsc --noEmit         # Check for type errors
```

### Configuration

Configuration is managed by `ConfigManager` in `src/utils/config.ts`. It loads from:

1. Environment variables
2. `~/.visualai/config.json`
3. Built-in defaults

Example `~/.visualai/config.json`:

```json
{
  "python": {
    "path": "/usr/bin/python3",
    "minVersion": "3.8"
  },
  "model": {
    "name": "flux-dev",
    "cacheDir": "~/.visualai/cache"
  },
  "session": {
    "storageDir": "~/.visualai/sessions"
  },
  "logging": {
    "level": "info",
    "file": "~/.visualai/logs/visualai.log"
  },
  "performance": {
    "subprocessTimeoutMs": 90000
  }
}
```

---

## Project Structure

```
src/
├── mcp/
│   ├── server.ts              # MCP server entry point
│   ├── handler.ts             # Tool dispatch & error handling
│   ├── error-handler.ts       # Error categorization & formatting
│   └── tools/
│       ├── index.ts           # Tool registry & handlers map
│       ├── generate-image.ts  # Image generation tool
│       ├── generate-variants.ts
│       ├── refine-asset.ts
│       ├── select-variant.ts
│       ├── generate-banner.ts
│       ├── export-asset.ts
│       ├── generate-wireframe.ts
│       ├── update-component.ts
│       ├── refine-component.ts
│       ├── adjust-proportions.ts
│       ├── undo-wireframe.ts
│       ├── undo.ts            # Session undo/redo
│       ├── redo.ts
│       ├── list-sessions.ts   # Session management
│       ├── list-iterations.ts
│       ├── preview-iteration.ts
│       ├── rollback-iteration.ts
│       ├── compare-iterations.ts
│       ├── resolve-iteration-reference.ts
│       ├── export-image.ts
│       ├── check-engine-status.ts
│       └── list-available-models.ts
│
├── engines/
│   ├── base-engine.ts         # Abstract engine interface
│   ├── mlx-engine.ts          # MLX on-device implementation
│   └── mlx-subprocess.ts      # Python subprocess handler
│
├── session/
│   ├── session-manager.ts     # Session CRUD, caching, persistence
│   └── iteration-history.ts   # Undo/redo stack, rollback logic
│
├── lib/
│   ├── profiler.ts            # Performance profiling (memory, CPU)
│   ├── metrics.ts             # Metrics collection & analytics
│   ├── performance-metrics.ts # P95 latency, success rates
│   ├── sensitive-data-filter.ts
│   ├── timeout.ts             # Timeout utilities
│   ├── retry.ts               # Retry with exponential backoff
│   ├── image-converter.ts     # Base64/PNG conversion
│   ├── export-component.ts    # Component export logic
│   ├── wireframe-templates.ts # Pre-built wireframe layouts
│   ├── wireframe-undo-redo.ts # Wireframe-specific undo/redo
│   └── version-history.ts     # Version tracking
│
├── utils/
│   ├── logger.ts              # Structured logging
│   ├── config.ts              # Configuration management
│   └── validators.ts          # Input validation
│
├── setup/
│   ├── auto-installer.ts      # Dependency auto-install
│   ├── dependency-checker.ts  # Verify MLX, Python
│   └── model-downloader.ts    # Download/cache models
│
├── cli/
│   └── setup.ts               # CLI setup wizard
│
├── config/
│   └── timeouts.ts            # Timeout constants
│
├── types/
│   └── index.ts               # All TypeScript types
│
└── index.ts                   # Main entry point
```

---

## Adding a New MCP Tool

### Step 1: Create Tool Schema

Create `/src/mcp/tools/my-new-tool.ts`:

```typescript
import type { MCPTool, MCPToolResult } from '../../types/index.js';
import { Logger } from '../../utils/logger.js';
import { MLXEngine } from '../../engines/mlx-engine.js';
import { SessionManager } from '../../session/session-manager.js';

const logger = new Logger('MyNewTool');

export const myNewToolSchema: MCPTool = {
  name: 'my-new-tool',
  description: 'Description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session identifier',
      },
      requiredParam: {
        type: 'string',
        description: 'A required parameter',
      },
      optionalParam: {
        type: 'number',
        description: 'Optional parameter with default',
        default: 42,
      },
    },
    required: ['sessionId', 'requiredParam'],
  },
};

export async function handleMyNewTool(
  args: Record<string, unknown>,
  engine: MLXEngine,
  sessionManager: SessionManager
): Promise<MCPToolResult> {
  try {
    const sessionId = args.sessionId as string;
    const requiredParam = args.requiredParam as string;
    const optionalParam = (args.optionalParam as number) || 42;

    logger.info('Executing my-new-tool', {
      sessionId,
      param: requiredParam,
    });

    const session = await sessionManager.loadSession(sessionId);
    if (!session) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Session not found: ${sessionId}`,
          },
        ],
      };
    }

    const result = await performOperation(requiredParam, optionalParam);

    await sessionManager.saveSession(session);

    return {
      content: [
        {
          type: 'text',
          text: `Operation completed: ${result}`,
        },
      ],
    };
  } catch (error) {
    logger.error('my-new-tool failed', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

async function performOperation(param1: string, param2: number): Promise<string> {
  return `Processed ${param1} with ${param2}`;
}
```

### Step 2: Register Tool

In `/src/mcp/tools/index.ts`, add to `ALL_TOOLS`:

```typescript
import { myNewToolSchema, handleMyNewTool } from './my-new-tool.js';

export const ALL_TOOLS: MCPTool[] = [
  // ... existing tools
  myNewToolSchema,  // ← Add here
];

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  // ... existing handlers
  'my-new-tool': async (
    args: Record<string, unknown>,
    engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleMyNewTool(args, engine, sessionManager);
  },
};
```

### Step 3: Add Unit Tests

Create `/tests/unit/mcp/tools/my-new-tool.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { handleMyNewTool } from '../../../../src/mcp/tools/my-new-tool.js';
import { SessionManager } from '../../../../src/session/session-manager.js';
import { MLXEngine } from '../../../../src/engines/mlx-engine.js';

describe('my-new-tool', () => {
  let sessionManager: SessionManager;
  let engine: MLXEngine;
  let sessionId: string;

  beforeEach(async () => {
    sessionManager = new SessionManager('/tmp/test-sessions');
    await sessionManager.initialize();

    const session = await sessionManager.createSession();
    sessionId = session.id;
  });

  it('should handle valid input', async () => {
    const result = await handleMyNewTool(
      {
        sessionId,
        requiredParam: 'test-value',
        optionalParam: 100,
      },
      engine,
      sessionManager
    );

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Operation completed');
  });

  it('should return error for missing session', async () => {
    const result = await handleMyNewTool(
      {
        sessionId: 'nonexistent-id',
        requiredParam: 'test',
      },
      engine,
      sessionManager
    );

    expect(result.content[0].text).toContain('Session not found');
  });

  it('should use default value for optional param', async () => {
    const result = await handleMyNewTool(
      {
        sessionId,
        requiredParam: 'test',
      },
      engine,
      sessionManager
    );

    expect(result.content[0].type).toBe('text');
  });
});
```

### Step 4: Document Tool Contract

Create `/specs/001-visualai-mvp/contracts/my-new-tool.md`:

```markdown
# Tool Contract: my-new-tool

## Purpose
Description of the tool's purpose and use cases.

## Input Schema
- `sessionId` (required): Session identifier
- `requiredParam` (required): What this param does
- `optionalParam` (optional): What this param does, default 42

## Output
- Text: Result message

## Side Effects
- Modifies session state
- Persists to disk

## Error Cases
- Session not found
- Invalid parameter type
```

---

## Extending SessionManager

### Adding Custom Session Fields

Modify `/src/types/index.ts`:

```typescript
export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  iterations: Iteration[];
  metadata: SessionMetadata;
  currentAsset?: AssetSession;
  myCustomData?: MyCustomType;  // ← Add here
}
```

### Adding Custom Methods

In `/src/session/session-manager.ts`:

```typescript
async loadCustomData(sessionId: string): Promise<MyCustomType | null> {
  const session = await this.loadSession(sessionId);
  return session?.myCustomData || null;
}

async updateCustomData(
  sessionId: string,
  data: MyCustomType
): Promise<void> {
  const session = await this.loadSession(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  session.myCustomData = data;
  session.updatedAt = new Date().toISOString();
  await this.saveSession(session);

  this.logger.info('Custom data updated', { sessionId });
}
```

### Session Caching

SessionManager maintains an in-memory cache for active sessions:

```typescript
const session = await sessionManager.getActiveSession(sessionId);
if (session) {
  session.metadata.totalIterations += 1;
  await sessionManager.saveSession(session);
}
```

Cache is invalidated on session update to maintain consistency.

---

## Adding a New Engine

### Step 1: Implement BaseEngine

Create `/src/engines/my-engine.ts`:

```typescript
import { BaseEngine } from './base-engine.js';
import type {
  ImageGenerationOptions,
  ImageGenerationResult,
  EngineStatus,
  ProgressCallback,
} from '../types/index.js';
import { Logger } from '../utils/logger.js';

export class MyEngine extends BaseEngine {
  private logger: Logger;
  private modelPath: string;

  constructor(modelPath: string) {
    super('MyEngine');
    this.logger = new Logger('MyEngine');
    this.modelPath = modelPath;
  }

  async checkStatus(): Promise<EngineStatus> {
    try {
      return {
        ready: true,
        engineName: 'MyEngine',
        modelPath: this.modelPath,
        dependencies: [
          {
            name: 'my-dependency',
            installed: true,
            version: '1.0.0',
          },
        ],
      };
    } catch (error) {
      return {
        ready: false,
        engineName: 'MyEngine',
        dependencies: [],
        error: `Initialization failed: ${error}`,
      };
    }
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing MyEngine');
    try {
      await this.loadModel();
      this.logger.info('MyEngine initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MyEngine', error);
      throw error;
    }
  }

  async generate(
    options: ImageGenerationOptions,
    onProgress?: ProgressCallback
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      onProgress?.('Starting generation', 0, 100);

      const imageBase64 = await this.generateImage(options, onProgress);

      const latencyMs = Date.now() - startTime;

      return {
        imageBase64,
        metadata: {
          prompt: options.prompt,
          width: options.width,
          height: options.height,
          steps: options.steps || 20,
          guidanceScale: options.guidanceScale || 7.5,
          seed: options.seed,
          latencyMs,
          engineName: 'MyEngine',
          modelName: this.modelPath,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Generation failed', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up MyEngine');
  }

  private async loadModel(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async generateImage(
    options: ImageGenerationOptions,
    onProgress?: ProgressCallback
  ): Promise<string> {
    for (let i = 0; i < 10; i++) {
      onProgress?.(`Step ${i + 1}`, i, 10);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return 'base64encodedimagadata';
  }
}
```

### Step 2: Update Server Configuration

In `/src/mcp/server.ts`:

```typescript
import { MyEngine } from '../engines/my-engine.js';

export class MCPServer {
  private engine: BaseEngine;

  constructor() {
    this.logger = new Logger('MCPServer');
    this.config = ConfigManager.load();

    if (process.env.ENGINE_TYPE === 'my-engine') {
      this.engine = new MyEngine(this.config.model.cacheDir);
    } else {
      const engineConfig: MLXEngineConfig = {
        pythonPath: this.config.python.path,
        modelName: this.config.model.name,
        cacheDir: this.config.model.cacheDir,
        timeout: this.config.performance.subprocessTimeoutMs,
        minPythonVersion: this.config.python.minVersion,
      };
      this.engine = new MLXEngine(engineConfig);
    }

    this.sessionManager = new SessionManager(this.config.session.storageDir);
    this.handler = createMCPHandler(this.engine, this.sessionManager);
  }
}
```

---

## Testing

### Unit Tests

Location: `/tests/unit/`

Focus on single components in isolation:

```typescript
import { describe, it, expect } from '@jest/globals';
import { ImageConverter } from '../../../src/lib/image-converter.js';

describe('ImageConverter', () => {
  it('should convert PNG to base64', () => {
    const base64 = ImageConverter.pngToBase64('/path/to/image.png');
    expect(base64).toMatch(/^data:image\/png;base64,/);
  });

  it('should handle missing file gracefully', () => {
    expect(() => ImageConverter.pngToBase64('/nonexistent.png')).toThrow();
  });
});
```

Run with:
```bash
pnpm test --testPathPattern="unit"
```

### Integration Tests

Location: `/tests/integration/`

Test component interactions:

```typescript
describe('SessionManager + IterationHistory Integration', () => {
  it('should persist and load iterations correctly', async () => {
    const manager = new SessionManager(testDir);
    const session = await manager.createSession();

    const iteration = {
      index: 0,
      prompt: 'test prompt',
      imageBase64: 'data:image/png;base64,...',
    };

    session.iterations.push(iteration as any);
    await manager.saveSession(session);

    const loaded = await manager.loadSession(session.id);
    expect(loaded?.iterations).toHaveLength(1);
    expect(loaded?.iterations[0].prompt).toBe('test prompt');
  });
});
```

### Acceptance Tests

Location: `/tests/acceptance/`

Test complete user stories end-to-end:

```typescript
describe('Phase 4 - User Story 2: Generate marketing visuals', () => {
  it('should generate, select, refine, and export variants', async () => {
    const server = new MCPServer();
    await server.start();

    const handler = server.getHandler();

    const generateResult = await handler.callTool({
      name: 'generate-variants',
      arguments: {
        sessionId: 'test-session',
        prompt: 'professional logo',
        count: 4,
      },
    });

    expect(generateResult.content[0].type).toBe('text');

    const selectResult = await handler.callTool({
      name: 'select-variant',
      arguments: {
        sessionId: 'test-session',
        variantId: 'variant-1',
      },
    });

    expect(selectResult.content).toBeDefined();

    await server.shutdown();
  });
});
```

### Running Tests

```bash
pnpm test                        # All tests
pnpm test --watch               # Watch mode
pnpm test --testNamePattern="specific test"
pnpm test:acceptance            # Only acceptance tests
pnpm test --coverage            # With coverage report
```

---

## Logging & Monitoring

### Structured Logging

All components use the Logger utility for consistent structured logging:

```typescript
import { Logger } from '../utils/logger.js';

const logger = new Logger('MyComponent');

logger.info('Operation started', { userId: '123', duration: 45 });
logger.warn('High memory usage', { memoryMb: 3500 });
logger.error('Operation failed', new Error('Details'), { retries: 3 });
```

Log output format:
```
[2025-12-11 14:30:45.123] INFO [MyComponent] Operation started {userId:"123",duration:45}
```

### Log Levels

- `DEBUG` - Detailed diagnostic information
- `INFO` - General informational messages
- `WARN` - Warning conditions
- `ERROR` - Error conditions

Set minimum level via config:
```json
{
  "logging": {
    "level": "info"
  }
}
```

### Metrics Collection

Track operation performance:

```typescript
import { MetricsCollector } from '../lib/metrics.js';

const metrics = new MetricsCollector();

const startTime = Date.now();
try {
  await performOperation();
  metrics.recordOperation('my-operation', Date.now() - startTime, true);
} catch (error) {
  metrics.recordOperation(
    'my-operation',
    Date.now() - startTime,
    false,
    error.name
  );
}

const stats = metrics.getOperationMetrics('my-operation');
console.log(`Success rate: ${(stats.successRate * 100).toFixed(2)}%`);
console.log(`P95 latency: ${stats.p95LatencyMs}ms`);
```

---

## Performance Profiling

### Automatic MLX Profiling

MLXEngine automatically profiles Python subprocess memory and CPU usage:

```typescript
const result = await engine.generate(options);

if (result.profiling) {
  console.log('Memory usage:', result.profiling.memory);
  console.log('CPU usage:', result.profiling.cpu);
  console.log('Warnings:', result.profiling.warnings);
}
```

### Memory Management

Memory monitoring helps detect leaks:

```
Memory baseline: 512 MB
Memory peak: 2048 MB
Memory final: 650 MB
```

Alerts trigger at:
- >3500 MB: Warning logged
- >4000 MB: Error thrown (Risk 5 mitigation)

### Performance Profiler

Manual profiling for any subprocess:

```typescript
import { PerformanceProfiler } from '../lib/profiler.js';

const profiler = new PerformanceProfiler();
const childProcess = spawn('python3', ['script.py']);

await profiler.startMonitoring(childProcess.pid!);

await new Promise((resolve) => childProcess.on('close', resolve));

const result = profiler.stopMonitoring();
profiler.cleanup();

console.log(result.memory);
console.log(result.cpu);
```

---

## Error Handling

### Error Categorization

ErrorHandler categorizes errors for logging and client response:

```typescript
import { ErrorHandler } from '../mcp/error-handler.js';

try {
  await operation();
} catch (error) {
  const structured = ErrorHandler.categorizeError(
    error instanceof Error ? error : new Error(String(error)),
    {
      tool: 'my-tool',
      params: { sessionId: 'abc' },
    }
  );

  const mcpResponse = ErrorHandler.formatForMCP(structured);
  return mcpResponse;
}
```

Error categories:
- `ValidationError` - Invalid input
- `NotFoundError` - Resource not found
- `TimeoutError` - Operation exceeded time limit
- `DependencyError` - Missing dependency
- `UnknownError` - Unexpected error

### Input Validation

Use validators for consistent validation:

```typescript
import { Validators } from '../lib/validators.js';

const result = Validators.validateImageDimensions(width, height);
if (!result.valid) {
  return {
    content: [{ type: 'text', text: result.error }],
  };
}

const modelResult = Validators.validateModelName(modelName);
if (!modelResult.valid) {
  throw new Error(modelResult.error);
}
```

---

## Best Practices

### 1. Session Handling

Always load and validate sessions:

```typescript
const session = await sessionManager.loadSession(sessionId);
if (!session) {
  return formatError(`Session not found: ${sessionId}`);
}

session.metadata.totalIterations += 1;
session.updatedAt = new Date().toISOString();
await sessionManager.saveSession(session);
```

### 2. Error Messages

Provide clear, actionable error messages:

```typescript
if (!width || width < 1 || width > 2048) {
  return formatError(
    'Invalid image width. Must be between 1 and 2048 pixels.'
  );
}
```

### 3. Logging Context

Include relevant context in logs:

```typescript
logger.info('Image generated successfully', {
  sessionId,
  width,
  height,
  latencyMs,
  modelName,
});
```

### 4. Timeout Handling

Use configured timeouts for long operations:

```typescript
import { TIMEOUTS } from '../config/timeouts.js';

const result = await withTimeout(
  this.generateImage(options),
  TIMEOUTS.IMAGE_GENERATION_MS
);
```

### 5. Type Safety

Leverage TypeScript for type safety:

```typescript
const handler: ToolHandler = async (
  args: Record<string, unknown>,
  engine: MLXEngine,
  sessionManager: SessionManager
): Promise<MCPToolResult> => {
  const sessionId = args.sessionId as string;
  const steps = (args.steps as number) || 20;

  if (steps < 1 || steps > 100) {
    return formatError('Steps must be between 1 and 100');
  }

  return {
    content: [
      {
        type: 'text',
        text: `Generating with ${steps} steps`,
      },
    ],
  };
};
```

### 6. Asset Session Lifecycle

When working with assets (icons, banners, components):

```typescript
const assetSession: AssetSession = {
  type: 'icon',
  allVariants: [],
  selectedVariantId: undefined,
  refinementHistory: [],
  exportFormats: ['png', 'svg'],
};

session.currentAsset = assetSession;
await sessionManager.saveSession(session);

session.currentAsset!.allVariants.push(newVariant);
await sessionManager.saveSession(session);
```

---

## Troubleshooting

### Common Issues

#### "Session not found"

Check:
- Session ID is valid (alphanumeric + `-_`)
- Session file exists in `~/.visualai/sessions/`
- SessionManager initialized with correct storageDir

```bash
ls ~/.visualai/sessions/
cat ~/.visualai/sessions/{sessionId}/metadata.json
```

#### "MLX engine failed to initialize"

Check:
- Python version: `python3 --version` (need 3.8+)
- MLX installed: `python3 -c "import mlx"`
- Model downloaded: `ls ~/.visualai/cache/`
- Config points to correct Python: `cat ~/.visualai/config.json`

```bash
python3 -c "import mlx; print(mlx.__version__)"
python3 -c "from mlx.core import mx; print(mx.__version__)"
```

#### "Memory warnings during generation"

Symptoms: "Memory usage exceeded warning threshold"

Solutions:
- Reduce image dimensions (512x512 instead of 1024x1024)
- Increase system RAM available
- Close other applications
- Check memory: `top` or Activity Monitor

#### "Timeout waiting for Python subprocess"

Symptoms: "Subprocess timeout after 90000ms"

Solutions:
- Increase timeout in config:
  ```json
  {
    "performance": {
      "subprocessTimeoutMs": 120000
    }
  }
  ```
- Reduce image size or steps
- Check CPU usage: `top` or Activity Monitor
- Verify Python isn't hung: `ps aux | grep python`

#### "TypeScript build errors"

After changes:

```bash
pnpm build                  # Full rebuild
pnpm tsc --noEmit         # Check types without building
rm -rf dist/               # Clean build artifacts
pnpm build                 # Rebuild from scratch
```

Common issues:
- Missing `.js` extension on imports (ES modules)
- Type mismatches in tool handlers
- Missing types in function signatures

#### "Tests fail unexpectedly"

```bash
pnpm test --clearCache    # Clear Jest cache
pnpm test --verbose       # Verbose output
pnpm test --no-coverage   # Skip coverage (faster)
```

Debug specific test:
```bash
NODE_DEBUG=* pnpm test --testNamePattern="specific test"
```

#### "Import errors in production"

Ensure imports use `.js` extension (ES modules):

```typescript
// ✅ Correct
import { Logger } from '../utils/logger.js';

// ❌ Incorrect
import { Logger } from '../utils/logger';
```

Check compiled output:
```bash
ls dist/
cat dist/mcp/server.js | head -20
```

---

## Contributing Guidelines

### Code Style

- No comments in production code - use clear naming instead
- Self-explanatory variable and function names
- Maximum 100 lines per file when practical
- Separate concerns: one primary responsibility per file

### Git Workflow

1. Create feature branch: `git checkout -b feat/my-feature`
2. Make changes and commit: `git commit -m "description"`
3. Run tests: `pnpm test`
4. Submit PR for review

### Commit Messages

Format: `type: description`

Types:
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code refactoring
- `docs:` documentation
- `test:` test changes
- `perf:` performance improvement

Example:
```
feat: add image-to-svg conversion tool
```

### PR Requirements

Before submitting:
- All tests pass: `pnpm test`
- No TypeScript errors: `pnpm tsc --noEmit`
- Code builds: `pnpm build`
- Changes documented in PR description

---

## Quick Reference

### File Naming Conventions

- TypeScript files: `camelCase.ts`
- Classes: `PascalCase` (example: `SessionManager`)
- Functions: `camelCase` (example: `handleGenerateImage`)
- Types/Interfaces: `PascalCase` (example: `ImageGenerationResult`)

### Common Patterns

**Async Operation with Error Handling:**
```typescript
try {
  const result = await operation();
  logger.info('Success', { detail: result });
  return formatSuccess(result);
} catch (error) {
  logger.error('Operation failed', error);
  return formatError(error.message);
}
```

**Session-Based Tool:**
```typescript
const session = await sessionManager.loadSession(sessionId);
if (!session) return formatError('Session not found');

const result = await performWork(session);

session.updatedAt = new Date().toISOString();
await sessionManager.saveSession(session);

return formatSuccess(result);
```

**Tool Schema + Handler:**
```typescript
export const myToolSchema: MCPTool = {
  name: 'my-tool',
  description: 'What it does',
  inputSchema: { /* ... */ },
};

export async function handleMyTool(
  args: Record<string, unknown>,
  engine: MLXEngine,
  sessionManager: SessionManager
): Promise<MCPToolResult> {
  // Implementation
}
```

### Configuration Access

```typescript
import { ConfigManager } from '../utils/config.js';

const config = ConfigManager.load();
const pythonPath = config.python.path;
const cacheDir = config.model.cacheDir;
const timeout = config.performance.subprocessTimeoutMs;
```

### Metrics Recording

```typescript
import { MetricsCollector } from '../lib/metrics.js';

const metrics = new MetricsCollector();
const startTime = Date.now();

try {
  await operation();
  metrics.recordOperation('op-name', Date.now() - startTime, true);
} catch (error) {
  metrics.recordOperation('op-name', Date.now() - startTime, false);
  throw error;
}
```

---

## Resources

- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [MLX Framework](https://ml-explore.github.io/mlx/)
- [Node.js API](https://nodejs.org/api/)

## Questions?

Open an issue or check existing documentation in `/docs/` and `/specs/`.
