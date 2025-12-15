# Implementation Plan: VisualAI MVP - Local Image Generation with MLX

**Branch**: `001-visualai-mvp` | **Date**: 2025-12-11 | **Spec**: [Visual AI MVP Specification](./spec.md)
**Input**: Feature specification from `/specs/001-visualai-mvp/spec.md`

**Architecture Decision**: 100% local image generation using MLX (Apple's ML framework) on Apple Silicon M4 (zero cloud API cost)

## Summary

Build an MCP (Model Context Protocol) server that provides Claude with local image generation capabilities via MLX. The system runs entirely on macOS with Apple Silicon, leveraging Metal GPU and Neural Engine acceleration for fast inference via Python subprocess. Users run MLX-based Stable Diffusion on their machine, and the MCP server communicates with it via Python process spawning.

**Primary Stack**: MLX (Apple ML framework) via Python + Node.js MCP server
**Target Performance**: 512x512 images in ~8-15 seconds, zero API costs

## Technical Context

**Language/Version**: TypeScript 5.0+, Node.js 18+ (MCP server) + Python 3.9+ (generation engine)
**Primary Dependencies**:
- `@modelcontextprotocol/sdk` (MCP protocol)
- Node.js `child_process` (Python subprocess spawning)
- No cloud SDK dependencies (OpenAI removed)

**Python Dependencies** (auto-installed):
- `mlx` (Apple's ML framework)
- `huggingface-hub` (model downloads)
- `pillow` (image processing)
- `numpy`, `tqdm`, `regex` (utilities)

**Storage**: Session history in `~/.visualai/sessions/{sessionId}/`; Models in `~/.cache/huggingface/hub/`
**Testing**: Jest + integration tests with local MLX instance
**Target Platform**: macOS 12+ with Apple Silicon (M1/M2/M3/M4 compatible)
**Project Type**: Single monorepo (CLI + MCP server in one package)
**Performance Goals**:
- Image generation latency: <20s for 512x512 (M4 estimated)
- MCP response time: <100ms (excluding render)
- Session startup: <1s

**Constraints**:
- Python 3.9+ required (macOS default)
- MLX dependencies installed via pip
- Offline-capable (no cloud APIs)
- Memory usage 2-3GB during generation
- Support for 512x512 and 1024x1024 images

**Scale/Scope**:
- Single-user CLI + MCP server
- Max 3 concurrent generations per session
- 100+ prompts per session before cleanup

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Separation of Concerns ✅ PASS
**Compliance Status**: FULL - MCP server isolates generation logic from Python subprocess
**Evidence**: Engine abstraction layer in `src/services/ImageEngine.ts` handles MLX subprocess communication

### II. Local-First Philosophy ✅ PASS
**Compliance Status**: FULL - Zero cloud APIs, 100% local execution
**Rationale**: All computation on user's machine, no data leaves system

### III. Local Engine Agnosticism ⚠️ DEFERRED
**Compliance Status**: PARTIAL - MVP locks to MLX, abstraction in Phase 2
**Rationale**: Constitution Principle V (MVP-First) supersedes. MLX chosen for:
- Official Apple framework for Apple Silicon
- Python subprocess = simple integration
- Zero external apps required
- Automated setup via pip/uv
- Future support: Core ML (native), custom models

### IV. Extensible Session Management ✅ PASS
**Compliance Status**: FULL - Session architecture supports multi-image workflows
**Evidence**: Session interface extensible for future gallery, compare, batch features

### V. MVP-First Delivery ✅ PASS
**Compliance Status**: FULL - Single feature (generate_image) in Phase 1
**Rationale**: Image generation as core value prop, session management + validation in P2

## Project Structure

### Documentation (this feature)

```text
specs/001-visualai-mvp/
├── plan.md              # This file (implementation roadmap)
├── spec.md              # Feature specification
├── research.md          # Phase 0 research findings
├── data-model.md        # Phase 1 data model & types
├── quickstart.md        # Phase 1 developer setup & usage
├── contracts/           # Phase 1 MCP contracts
│   ├── generate_image.md
│   ├── check_engine_status.md
│   └── list_available_models.md
└── tasks.md             # Phase 2 detailed task breakdown
```

### Source Code (repository root)

```text
src/
├── mcp/
│   ├── server.ts              # MCP server entry point
│   └── tools/                 # Tool implementations
│       ├── generateImage.ts
│       ├── checkEngineStatus.ts
│       └── listModels.ts
├── services/
│   ├── ImageEngine.ts         # MLX Python subprocess abstraction
│   ├── SessionManager.ts      # Session lifecycle management
│   └── ConfigManager.ts       # Python & MLX settings
├── models/
│   ├── types.ts               # TypeScript interfaces
│   └── schemas.ts             # Input/output validation schemas
├── cli/
│   ├── index.ts               # CLI entry point
│   └── setup.ts               # /visualai setup command
└── lib/
    ├── retry.ts               # Exponential backoff for API calls
    └── health.ts              # DiffusionBee health check

tests/
├── unit/
│   ├── ImageEngine.test.ts
│   ├── SessionManager.test.ts
│   └── ConfigManager.test.ts
├── integration/
│   ├── MCP.test.ts
│   └── MLX.test.ts
└── contract/
    └── Tools.test.ts          # Tool contract validation
```

**Structure Decision**: Single monorepo (src/) with clear separation: MCP server layer, service layer (MLX Python integration), CLI layer. Tests organized by type (unit/integration/contract).

## Implementation Phases

### Phase 0: Foundation & Setup

**Goals**:
- Validate MLX can run on local machine
- Design MCP server architecture
- Document MLX Python integration contract

**Key Activities**:
1. **Research** (2-3h)
   - MLX Python API and Stable Diffusion implementation
   - M4 performance benchmarks (latency for 512x512, 1024x1024)
   - Model download flow and Hugging Face Hub integration
   - Subprocess communication protocol

2. **MLX Setup Strategy** (ongoing)
   - **Initial Setup (First-Time User)**: < 1 minute
     - `npx @visualai/mcp setup` (planned CLI)
     - Auto-detects Python 3.9+ (macOS default)
     - Configures `claude_desktop_config.json` automatically

   - **Python Dependencies** (2-3 minutes, one-time)
     - Automated: `pip install mlx huggingface-hub pillow numpy tqdm regex`
     - Uses uv if available (faster)
     - No user interaction required

   - **Model Download** (15-40 minutes, one-time)
     - Automated via Hugging Face Hub
     - Downloads quantized Stable Diffusion (~5-7GB)
     - Progress bar with ETA
     - Runs in background (user can do other tasks)

   - **Validation** (< 1 minute)
     - Generate test 512x512 image
     - Measure baseline latency
     - Store config in ~/.visualai/

   - **Daily Usage** (0 seconds)
     - MCP detects model already downloaded
     - Calls MLX generation via Python subprocess
     - No manual steps required

3. **Architecture Design** (4-6h)
   - MCP server structure with tool definitions
   - ImageEngine abstraction layer (Python subprocess communication)
   - SessionManager for tracking generated images + metadata
   - Error handling + retry strategy for subprocess failures
   - Type definitions (TypeScript interfaces)

4. **Documentation** (2-3h)
   - MLX Python integration contract (subprocess protocol, payloads, responses)
   - Configuration guide (Python detection, dependency installation)
   - Performance expectations for M4
   - Alternative engines (Core ML direct, custom models) for Phase 2

**Deliverables**:
- `specs/001-visualai-mvp/research.md` (MLX API contract, performance data)
- `specs/001-visualai-mvp/data-model.md` (TypeScript types + schemas)
- Project structure initialized
- MLX setup documented in README

---

### Phase 1: Core MCP Implementation

**Goals**:
- Build functional MCP server with image generation
- Validate local generation workflow
- Establish session management + storage

**Key Activities**:

1. **MCP Server Setup** (4-5h)
   - Initialize `@modelcontextprotocol/sdk` in Node.js
   - Define tool contract (input schemas, output formats)
   - Implement MCP server lifecycle (start/stop)
   - Error handling + logging framework

2. **Core Tools** (8-10h)

   **Tool 1: `generate_image`**
   - Input: `{prompt: string, width: 512|1024, height: 512|1024, steps?: 20}`
   - Calls MLX Stable Diffusion via Python subprocess
   - Command: `python3 -m mlx_examples.stable_diffusion --prompt "..." --steps 20`
   - Returns: `{base64_png, latency_ms, model_used, memory_usage_mb}`
   - Stores image + metadata in session history (`~/.visualai/sessions/{id}/`)
   - Progressive feedback via stdout parsing
   - Timeout handling: 120s max per image

   **Tool 2: `check_engine_status`**
   - Verifies Python dependencies installed
   - Checks model downloaded
   - Returns: `{ready: boolean, model_path: string, dependencies: string[]}`
   - Auto-installs if missing

   **Tool 3: `list_available_models`**
   - Queries Hugging Face Hub for available Stable Diffusion models
   - Returns: `[{name: string, size_gb: number, type: "diffusion"}]`
   - Phase 2: allow model switching via `set_model` tool

3. **ImageEngine Service** (6-8h)
   - Python subprocess spawner and manager
   - Stdout/stderr parsing and validation
   - Retry logic (exponential backoff for subprocess failures)
   - Timeout management
   - Metadata extraction (latency, memory usage, model)
   - Type-safe (full TypeScript generics)

4. **SessionManager Service** (4-5h)
   - Session creation/retrieval (UUID-based)
   - Image metadata storage (prompt, generation_time, image_path)
   - Session serialization to JSON
   - Cleanup strategy (old sessions >30 days auto-delete)
   - Prevent duplicate generations (cache by prompt hash)

5. **Configuration Management** (2-3h)
   - Detect Python installation (3.9+)
   - Verify MLX and dependencies installed
   - Check model cache location (~/.cache/huggingface/hub/)
   - Config validation at startup
   - Graceful degradation if dependencies missing

6. **Testing** (6-8h)
   - Unit tests for ImageEngine (mock subprocess)
   - Unit tests for SessionManager (file I/O)
   - Integration tests with real MLX instance
   - Contract tests for MCP tool definitions
   - Error case coverage (subprocess timeouts, invalid prompts, etc.)

7. **Documentation** (3-4h)
   - `specs/001-visualai-mvp/quickstart.md` (setup + first generation)
   - `specs/001-visualai-mvp/contracts/generate_image.md` (tool spec)
   - Type reference (generated from TypeScript via TSDoc)
   - Examples (CLI usage + MCP integration)

**Deliverables**:
- MCP server runs successfully with `npm start`
- All 3 core tools functional (generate, status, models)
- Session history stored in `~/.visualai/sessions/`
- >80% test coverage
- Full TypeScript type safety
- Zero external API dependencies

**Success Criteria**:
- Generate 512x512 image in <15 seconds (M4)
- Session persists across restarts
- Error messages actionable (e.g., "DiffusionBee not running on localhost:5000")
- All tests passing

---

### Phase 2: Enhancement & Optimization

**Goals**:
- Add CLI interface
- Optimize performance + UX
- Prepare for multi-engine support

**Key Activities**:

1. **CLI Enhancement** (4-5h)
   - `visualai generate "prompt" --width 512 --height 512`
   - `visualai sessions list`
   - `visualai sessions view {id}`
   - `visualai setup` (interactive DiffusionBee detection)
   - Progress bar during generation
   - Rich formatting of output

2. **Performance Optimization** (3-4h)
   - Parallel generation (up to 3 concurrent)
   - Caching (duplicate prompts return cached image)
   - Progressive rendering feedback (streaming intermediate results if API supports)
   - Memory profiling + optimization

3. **Engine Abstraction** (6-8h)
   - Extract ImageEngine to abstract interface
   - Implement DiffusionBeeEngine (current)
   - Stub DrawThingsEngine (AppleScript automation)
   - Stub CoreMLEngine (direct Core ML bindings via Swift)
   - Engine registry + selection logic

4. **Advanced Features** (8-10h)
   - Prompt enhancement (Claude mini model or local preprocessing)
   - Image comparison tool (side-by-side view)
   - Batch generation (multiple variations of single prompt)
   - Model management CLI (download/switch models)

5. **Deployment** (2-3h)
   - npm package setup (@visualai/mcp)
   - Claude desktop configuration (auto-inject into config)
   - Homebrew formula (optional)
   - GitHub Actions CI/CD

6. **Documentation** (3-4h)
   - Full feature guide
   - Troubleshooting guide (DiffusionBee crashes, memory issues)
   - Architecture deep-dive (extensibility)
   - Plugin development guide

**Deliverables**:
- Polished CLI with full feature set
- Multi-engine abstraction layer (ready for Phase 3)
- npm package published
- >85% test coverage including new features

---

## Technical Decisions & Rationale

### Decision 1: MLX over Cloud APIs

| Aspect | MLX (Chosen) | DALL-E 3 (Rejected) | Core ML (Future) |
|--------|-------------|-------------------|------------------|
| Cost | $0 (local) | $0.04-0.08/image | $0 (local) |
| Latency | 8-15s (M4) | 3-5s (cloud) | 5-10s (M4) |
| Privacy | 100% local | Data to OpenAI | 100% local |
| Setup | pip install | API key | Native framework |
| Reliability | Offline | Cloud dependent | Offline |
| Image Quality | Good (Stable Diffusion) | Excellent (DALL-E) | Good+ |
| Framework | Apple official | Third-party | Apple native |

**Chosen**: MLX for MVP because:
- Official Apple framework for Apple Silicon
- Zero cost aligns with local-first philosophy
- Python subprocess = simple integration (no app installation)
- Automated setup via pip/Hugging Face Hub
- Model flexibility (any HF-hosted Stable Diffusion checkpoint)

**Future**: Phase 2/3 will abstract to support Core ML direct (native framework) and custom models.

### Decision 2: Session-Based Architecture

**Why**: Enable iterative workflows where user references previous generations
**Structure**: UUIDs, JSON metadata, image files in `~/.visualai/sessions/{id}/`
**Benefits**:
- Reproducibility (save seeds, prompts)
- Offline analysis (no cloud calls to retrieve history)
- Phase 2: batch operations across sessions

### Decision 3: Python Subprocess for Image Generation

**Why**:
- MLX provides clean Python CLI interface
- No authentication required (local execution)
- Avoids Node.js memory overhead
- Native process isolation for error handling

**Fallback**: If MLX API changes, can implement direct Swift/Metal bindings as escape hatch.

### Decision 4: TypeScript for Type Safety

**Why**: MCP is complex protocol with nested types (tools, resources, prompts). TypeScript prevents runtime errors.

---

## Risk Assessment

### Risk 1: Python/MLX Compatibility

**Probability**: Low (Python ubiquitous on macOS, Apple maintains MLX)
**Impact**: Medium (requires manual installation if missing)
**Mitigation**:
- Target Python 3.9+ (macOS default)
- Provide manual installation instructions
- Auto-detection and user-friendly error messages
- Phase 2: Pre-packaged Python environment option

**Owner**: Implementation lead

---

### Risk 2: MLX API Changes

**Probability**: Low (Apple maintains MLX, stable ml-explore/mlx-examples)
**Impact**: Medium (requires design adjustment)
**Mitigation**:
- Pin mlx version in requirements.txt
- Use stable ml-explore/mlx-examples implementation
- Create comprehensive contract spec in research.md
- Build robust error handling for subprocess failures

**Owner**: Research phase lead

---

### Risk 3: Model Download Time

**Probability**: High (first-time setup requires 15-40 min download)
**Impact**: Low (one-time UX friction)
**Mitigation**:
- Clear setup documentation (expectations setting)
- Show progress bar during download via Hugging Face Hub
- Suggest alternate time to download models (e.g., "Download while idle")
- Phase 2: Use quantized models for faster initial demo

**Owner**: CLI/UX lead

---

### Risk 4: Performance Variability on M4

**Probability**: High (GPU availability depends on system load)
**Impact**: Medium (user frustration with slow generations)
**Mitigation**:
- Display estimated time based on image size + system load
- Allow cancellation of slow generations
- Log actual latencies to inform future optimizations
- Phase 2: Adaptive step count based on measured performance

**Owner**: Performance testing lead

---

### Risk 5: Memory Pressure During Generation

**Probability**: Medium (M4 memory budget ~8-16GB shared with other apps)
**Impact**: Medium (generation timeout or system hang)
**Mitigation**:
- Monitor memory usage, fail gracefully if >4GB
- Queue generations if memory constrained
- Document memory requirements in setup guide (2-3GB available)
- Phase 2: Implement memory pressure detection via subprocess monitoring

**Owner**: Implementation lead

---

## Dependencies

### Local Engine Integration
- **Python 3.9+** (macOS default)
- **MLX framework** (pip install)
- **Hugging Face Hub** (model downloads, no authentication)

### Python Dependencies (auto-installed)
- `mlx` (Apple's ML framework)
- `huggingface-hub` (model downloads)
- `pillow` (image processing)
- `numpy`, `tqdm`, `regex` (utilities)

### Required npm Packages
- `@modelcontextprotocol/sdk` (MCP protocol)
- `typescript` (dev dependency)
- `jest` (testing)
- No OpenAI SDK or cloud API libraries

### Optional (Phase 2+)
- Swift bindings for Core ML direct access
- Custom model fine-tuning framework
- CLI enhancements (progress bars, rich formatting)

---

## Success Metrics

**Phase 1 Completion Criteria**:
- [ ] MCP server starts without errors
- [ ] `generate_image` tool produces valid PNG from MLX
- [ ] Session history persists to `~/.visualai/sessions/`
- [ ] All 3 core tools tested (unit + integration)
- [ ] TypeScript zero unsafe types (no `any`)
- [ ] README setup instructions validated by independent user
- [ ] <20 second latency for 512x512 on M4 (estimated)
- [ ] Error messages guide user to resolution (e.g., "Install MLX dependencies")

**Post-Phase 1 Metrics**:
- Session reuse rate (% of sessions with >1 generation)
- Average latency per image size (M4 profile)
- Error rate (API failures, timeouts, invalid prompts)
- User feedback on setup difficulty

---

## Appendix: MLX Python Generation Quick Reference

*Detailed in specs/001-visualai-mvp/research.md after Phase 0*

**MLX Framework**:
- Official Apple ML framework for Apple Silicon
- Stable Diffusion via ml-explore/mlx-examples

**Python Command**:
```bash
python3 -m mlx_examples.stable_diffusion \
  --prompt "a serene landscape" \
  --num-images 1 \
  --steps 20 \
  --output output.png
```

**Sample Output**:
```
Downloading model from Hugging Face Hub...
Loaded model in 2.5s
Generating image...
Generated image in 8.2s
Saved to output.png
```

**Configuration**:
- Model cache: `~/.cache/huggingface/hub/`
- Config location: `~/.visualai/config.json`
- Python requirement: 3.9+
- Memory requirement: 2-3GB available

*Full details to be populated during Phase 0 research.*

---

## Questions for Clarification

- [ ] MLX Python CLI options and argument format
- [ ] Hugging Face Hub model quantization levels and sizes
- [ ] Performance profiling: memory usage by image size and step count
- [ ] Subprocess stdout parsing format (progress, errors, completion)
- [ ] Model download resumption (partial downloads)
- [ ] GPU vs Neural Engine selection strategy

**Resolution**: Phase 0 research will answer all via MLX documentation + empirical testing.
