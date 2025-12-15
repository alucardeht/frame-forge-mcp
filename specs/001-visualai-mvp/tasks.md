# Implementation Tasks: VisualAI - Visual Assistant for Design and Assets

**Feature Branch**: `001-visualai-mvp`
**Created**: 2025-12-11
**Status**: Ready for Implementation

**Input**: Design documents from `/specs/001-visualai-mvp/` (spec.md + plan.md)

**Notes**:
- No tests requested in spec.md - focus on implementation only
- Tasks organized by user story for independent implementation and testing
- [P] = parallelizable tasks (different files, no dependencies)
- [US1/US2/US3] = user story labels for traceability
- File paths are absolute, rooted at repository level

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel with marked siblings
- **[US#]**: Maps to specific user story (P1, P2, P3)
- **Description includes exact file path**

---

## Phase 1: Setup and Project Initialization

**Purpose**: Initialize project structure, dependencies, and tooling

**Goal**: Foundation ready for Phase 2

- [ ] T001 Create project directory structure per plan.md in src/, tests/, specs/
- [ ] T002 [P] Initialize Node.js project with TypeScript in package.json
- [ ] T003 [P] Install @modelcontextprotocol/sdk and dev dependencies (typescript, jest)
- [ ] T004 [P] Configure tsconfig.json with ES2022 target and strict mode enabled
- [ ] T005 [P] Create .gitignore with node_modules, dist, build, .env, ~/.visualai/
- [ ] T006 Create .env.example with Python path and model location configuration
- [ ] T007 [P] Setup Jest configuration in jest.config.js for unit and integration tests
- [ ] T008 [P] Create README.md with setup instructions from plan.md

**Checkpoint**: Project structure initialized, dependencies installed, tooling configured

---

## Phase 2: Foundational Infrastructure

**Purpose**: Core MCP server, MLX integration, and session management (blocking all user stories)

**Goal**: MCP server foundation ready, session management in place, MLX integration established

⚠️ **CRITICAL**: No user story work can begin until this phase is 100% complete

### MLX Engine & Configuration

- [ ] T009 Create MLX Python wrapper in src/engines/mlx-wrapper.ts with subprocess execution interface
- [ ] T010 [P] Implement dependency validator in src/setup/dependency-checker.ts (Python 3.9+, mlx, huggingface-hub)
- [ ] T011 [P] Implement model downloader in src/setup/model-downloader.ts (download from Hugging Face Hub, cache locally)
- [ ] T012 [P] Create ConfigManager in src/services/ConfigManager.ts for Python path and model location detection
- [ ] T013 [P] Implement auto-installer in src/setup/auto-installer.ts (install Python dependencies via pip/uv if missing)
- [ ] T014 [P] Create retry logic with exponential backoff in src/lib/retry.ts for subprocess failures

### MCP Server Core

- [ ] T015 Create MCP server entry point in src/mcp/server.ts with @modelcontextprotocol/sdk initialization
- [ ] T016 [P] Define input/output schemas for tools in src/mcp/schemas/tool-schemas.ts (generate_image, check_engine_status, list_available_models)
- [ ] T017 [P] Create error handling middleware in src/mcp/error-handler.ts with jargon-free messages per FR-015
- [ ] T018 [P] Setup logging framework in src/lib/logger.ts (all operations, no sensitive data per FR-022)

### Session & Image Management

- [ ] T019 Create Session interface in src/models/types.ts with sessionId, timestamp, history[], currentState
- [ ] T020 [P] Create Image interface in src/models/types.ts with imageId, source, binary data, resolution, metadata
- [ ] T021 [P] Create Iteration interface in src/models/types.ts with version, prompt, response, imageRef, metadata
- [ ] T022 Create SessionManager in src/services/SessionManager.ts for CRUD operations on ~/.visualai/sessions/{id}/
- [ ] T023 [P] Implement session persistence (JSON serialization) in src/services/SessionManager.ts
- [ ] T024 [P] Implement session cleanup strategy in src/services/SessionManager.ts (auto-delete >30 days)
- [ ] T025 Create IterationHistory in src/services/IterationHistory.ts to track version tree and parent/child links

### Validation & Request Handling

- [ ] T026 Create input validation in src/lib/validators.ts for prompts, dimensions, and parameters per FR-014
- [ ] T027 [P] Implement image format support in src/lib/image-formats.ts (PNG, JPG, WebP upload handling per FR-003)
- [ ] T028 [P] Create dimension validation in src/lib/validators.ts (max 1024x1024, auto-reject oversized per FR-003)

**Checkpoint**: Foundation complete - MCP server runs, MLX integration established, session management operational

---

## Phase 3: User Story 1 - Iterate on Figma Designs (Priority: P1) 🎯 MVP

**Goal**: Enable conversational iteration on visual designs with full session history and rollback

**Independent Test**: Provide sample 150x300px image, request "add rounded borders of 12px", receive modified image with rounded corners. Request "go back to version 1", receive original. Test passes if iteration history preserved and rollback works.

**Acceptance Criteria** (from spec.md):
1. Given screenshot, when user requests modification, then system generates new image with changes applied
2. Given iteration with rounded borders, when user requests glassmorphism, then system generates card with glass effect
3. Given glassmorphism iteration, when user adjusts opacity, then system generates refined version
4. Given any iteration, when user requests "go back to version N", then system retrieves and displays that iteration
5. Given final iteration, when user requests export, then system provides PNG/SVG at requested resolution

### Core Tools - User Story 1

- [ ] T029 [P] [US1] Create generate_image tool in src/mcp/tools/generate-image.ts with MCP tool interface
- [ ] T030 [P] [US1] Implement MLX engine integration in src/mcp/tools/generate-image.ts (call subprocess, store metadata)
- [ ] T031 [US1] Add progressive feedback for generations >5s in src/mcp/tools/generate-image.ts (per FR-007: step names, time estimates, heartbeat every 2-3s)
- [ ] T032 [P] [US1] Create check_engine_status tool in src/mcp/tools/check-engine-status.ts with latency and model info
- [ ] T033 [P] [US1] Create list_available_models tool in src/mcp/tools/list-available-models.ts
- [ ] T034 [US1] Implement timeout handling in src/mcp/tools/generate-image.ts (90s max per image, graceful error)
- [ ] T035 [P] [US1] Add validation before API calls in src/mcp/tools/generate-image.ts per FR-014 (prevent quota waste)

### Session & History - User Story 1

- [ ] T036 [P] [US1] Create iteration_history tool in src/mcp/tools/iteration-history.ts to list all iterations with version numbers
- [ ] T037 [US1] Implement reference-by-number logic in src/mcp/tools/iterate.ts ("version 2", "the one with glassmorphism" per FR-009)
- [ ] T038 [P] [US1] Create rollback tool in src/mcp/tools/rollback.ts to retrieve and restore previous iterations (< 10s per SC-005)
- [ ] T039 [US1] Add A/B comparison tool in src/mcp/tools/compare-iterations.ts for side-by-side iteration comparison per FR-013

### Export & Assets - User Story 1

- [ ] T040 [P] [US1] Create export_image tool in src/mcp/tools/export-image.ts to save in PNG, SVG formats
- [ ] T041 [US1] Implement resolution variants in src/mcp/tools/export-image.ts (@1x, @2x, @3x per FR-011)
- [ ] T042 [P] [US1] Add conversion logic in src/lib/image-converter.ts (PNG → SVG for simple icons)
- [ ] T043 [US1] Implement under-30s export latency in src/mcp/tools/export-image.ts per SC-010

### Integration & Polish - User Story 1

- [ ] T044 [US1] Integrate session persistence with generate_image tool (store each iteration in session history)
- [ ] T045 [P] [US1] Add conversation context tracking in src/services/SessionManager.ts (maintain context across 10+ iterations per SC-008)
- [ ] T046 [P] [US1] Create undo/redo operations in src/mcp/tools/undo.ts and src/mcp/tools/redo.ts per FR-024
- [ ] T047 [US1] Test User Story 1 independently: provide sample image, iterate 5 times, verify history and rollback (acceptance test script)

**Checkpoint**: User Story 1 (core feature) fully functional and independently testable. System can iterate on visual designs with full history preservation.

---

## Phase 4: User Story 2 - Generate Professional Assets (Priority: P2)

**Goal**: Enable variant generation for professional assets (icons, banners, mockups) with refinement and multi-format export

**Independent Test**: Request "create a corporate 'report' icon", receive 3-4 variants, select one, request "make it more minimalist", receive refined version, export SVG and PNG at 512x512. Test passes if variants generated and export works independently of US1.

**Acceptance Criteria** (from spec.md):
1. Given asset description, when system processes request, then generates 3-4 variant options
2. Given selected option, when user requests refinement, then generates refined version of selected option
3. Given satisfied result, when user requests export at specified resolution, then provides multiple formats
4. Given banner request with description, when system processes, then generates professional layout matching description
5. Given generation >5s, when system processes, then displays progressive feedback with steps and estimates

### Variant Generation - User Story 2

- [ ] T048 [P] [US2] Create generate_variants tool in src/mcp/tools/generate-variants.ts to produce 3-4 options (different seeds)
- [ ] T049 [US2] Implement variant selection logic in src/mcp/tools/select-variant.ts to track selected variant in session
- [ ] T050 [P] [US2] Add variant caching in src/services/SessionManager.ts to prevent duplicate generation for same prompt (per FR-014)
- [ ] T051 [US2] Implement progressive feedback for variant generation in src/mcp/tools/generate-variants.ts (per FR-007)

### Refinement & Layout - User Story 2

- [ ] T052 [P] [US2] Create refine_asset tool in src/mcp/tools/refine-asset.ts to iterate on selected variant
- [ ] T053 [US2] Implement banner generation with layout description in src/mcp/tools/generate-banner.ts (1200x400px, component placement)
- [ ] T054 [P] [US2] Add dimension handling in src/lib/validators.ts for custom banner sizes (height, width per request)
- [ ] T055 [US2] Test multi-format export for assets (PNG, SVG) in src/mcp/tools/export-asset.ts

### Asset Export & Formats - User Story 2

- [ ] T056 [P] [US2] Implement SVG export for icons in src/lib/image-converter.ts (trace PNG → SVG for simple assets)
- [ ] T057 [P] [US2] Add batch export in src/mcp/tools/export-asset.ts for multiple formats in single request
- [ ] T058 [US2] Implement size-optimized export in src/lib/image-converter.ts (compress PNG, minify SVG)
- [ ] T059 [P] [US2] Create asset metadata in src/models/types.ts (type: icon|banner|mockup, dimensions, formats)

### Integration & Testing - User Story 2

- [ ] T060 [US2] Integrate variant generation with session history (store all variants with parent reference)
- [ ] T061 [P] [US2] Add performance metrics logging for asset generation (latency, variant count, export time)
- [ ] T062 [US2] Test User Story 2 independently: request icon variants, refine, export multiple formats (acceptance test script)

**Checkpoint**: User Story 2 functional and independently testable. System can generate professional assets with variants and multi-format export.

---

## Phase 5: User Story 3 - Create Wireframes Conversationally (Priority: P3)

**Goal**: Enable composition of wireframe layouts through conversational description with component refinement and export

**Independent Test**: Request "dashboard wireframe", specify "sidebar left, header top, card grid center", request "cards should have icon, title, numeric value", receive wireframe with updated cards, request "make sidebar narrower", receive adjusted layout, export components. Test passes if wireframe composition and component export work independently of US1/US2.

**Acceptance Criteria** (from spec.md):
1. Given wireframe request, when user specifies elements, then system generates layout with specified structure
2. Given base layout, when user specifies card structure, then system updates all cards with structure
3. Given complete wireframe, when user requests proportion adjustment, then system adjusts while maintaining layout
4. Given satisfactory wireframe, when user requests component export, then provides components compatible with Figma
5. Given multi-component wireframe, when user requests component isolation, then displays only requested component

### Wireframe Composition - User Story 3

- [ ] T063 [P] [US3] Create generate_wireframe tool in src/mcp/tools/generate-wireframe.ts with layout description parsing
- [ ] T064 [US3] Implement component composition in src/mcp/tools/generate-wireframe.ts (sidebar, header, grid, cards)
- [ ] T065 [P] [US3] Create wireframe template library in src/lib/wireframe-templates.ts (common patterns: sidebar-header-content, etc.)
- [ ] T066 [P] [US3] Add layout validation in src/lib/validators.ts (check valid component combinations)

### Component Refinement - User Story 3

- [ ] T067 [US3] Implement component update logic in src/mcp/tools/update-component.ts (refine all instances of card type)
- [ ] T068 [P] [US3] Create component-specific refinement in src/mcp/tools/refine-component.ts (modify individual components)
- [ ] T069 [P] [US3] Add proportion adjustment in src/mcp/tools/adjust-layout.ts (resize sidebar width, grid spacing, etc.)
- [ ] T070 [US3] Implement layout integrity checking in src/lib/layout-validator.ts (maintain valid proportions)

### Component Isolation & Export - User Story 3

- [ ] T071 [P] [US3] Create show_component tool in src/mcp/tools/show-component.ts to isolate and display single component
- [ ] T072 [US3] Implement component export in src/mcp/tools/export-component.ts for Figma compatibility (SVG + metadata)
- [ ] T073 [P] [US3] Add batch component export in src/mcp/tools/export-components.ts (export all components as separate files)
- [ ] T074 [P] [US3] Create component metadata in src/models/types.ts (name, dimensions, properties, export format)

### Wireframe Persistence & History - User Story 3

- [ ] T075 [US3] Integrate wireframe persistence in src/services/SessionManager.ts (store wireframe structure separately)
- [ ] T076 [P] [US3] Implement component version history in src/services/IterationHistory.ts (track component changes)
- [ ] T077 [P] [US3] Add wireframe undo/redo in src/mcp/tools/undo.ts and src/mcp/tools/redo.ts (component-level operations)
- [ ] T078 [US3] Test User Story 3 independently: create dashboard, update components, adjust layout, export (acceptance test script)

**Checkpoint**: User Story 3 functional and independently testable. System can compose wireframes conversationally with component refinement and Figma export.

---

## Phase 6: Setup & Configuration

**Purpose**: User-facing setup wizard and documentation

**Goal**: Non-technical users can complete setup in <5 minutes per SC-001

- [ ] T079 Create interactive setup wizard in src/cli/setup.ts for Python and MLX detection and configuration
- [ ] T080 [P] Implement auto-detection logic in src/cli/setup.ts (check Python 3.9+, MLX installed, model downloaded)
- [ ] T081 [P] Create health check in src/cli/setup.ts to validate MLX connection (test 512x512 generation)
- [ ] T082 [P] Add configuration UI in src/cli/setup.ts (model download progress bar, dependency installation status)
- [ ] T083 [P] Create claude_desktop_config.json auto-injection in src/cli/setup.ts (add MCP server config)
- [ ] T084 Create setup instructions in README.md with clear steps for all platforms (Python check → auto-install deps → model download → MCP config)
- [ ] T085 [P] Add troubleshooting guide in docs/TROUBLESHOOTING.md (common issues: Python not found, MLX incompatible, memory pressure, model download timeout)

**Checkpoint**: Setup complete, non-technical users can configure system in <5 minutes

---

## Phase 7: Cross-Cutting & Polish

**Purpose**: Improvements affecting multiple user stories, documentation, and quality

**Goal**: Production-ready system with comprehensive documentation and error handling

### Error Handling & Resilience

- [ ] T086 [P] Create graceful degradation when MLX unavailable (actionable error per FR-015, FR-018)
- [ ] T087 [P] Implement auto-install behavior (suggest installing dependencies if missing)
- [ ] T088 Implement edge case handling per spec.md (unsupported formats, ambiguous requests, network timeouts, large images, 50+ iterations)
- [ ] T089 [P] Add retry logic for transient failures (exponential backoff up to 3 attempts)
- [ ] T090 [P] Create timeout handling for all long-running operations (90s for generation, configurable)

### Logging & Monitoring

- [ ] T091 [P] Implement structured logging in src/lib/logger.ts (timestamp, operation, duration, error)
- [ ] T092 [P] Add sensitive data filtering in logs (no API keys, prompts redacted in error reports)
- [ ] T093 Create operation metrics in src/lib/metrics.ts (generation latency, session count, error rates)
- [ ] T094 [P] Add performance profiling in src/lib/profiler.ts (memory usage, CPU, GPU utilization estimate)

### Documentation & Examples

- [ ] T095 Create quickstart.md in specs/001-visualai-mvp/ (first image generation walkthrough)
- [ ] T096 [P] Create MCP tool contracts in specs/001-visualai-mvp/contracts/ (generate_image.md, check_engine_status.md, etc.)
- [ ] T097 [P] Create API reference documentation from TypeScript types (TSDoc comments)
- [ ] T098 Create user guide in docs/USER_GUIDE.md (examples of all features, common workflows)
- [ ] T099 [P] Create developer guide in docs/DEVELOPER_GUIDE.md (architecture, extending with new tools, testing)

### Browser Preview Server (Optional Enhancement)

- [ ] T100 [P] Create browser preview server in src/preview/server.ts (localhost WebSocket updates per FR-020)
- [ ] T101 Create preview UI in src/preview/ui.ts (display current iteration, navigation, export)
- [ ] T102 [P] Implement WebSocket connection in src/preview/server.ts for real-time image updates

### Validation & Quality

- [ ] T103 [P] Run full test suite across all user stories (ensure all acceptance criteria met)
- [ ] T104 Validate with independent user (setup, generation, iteration, export per SC-001)
- [ ] T105 [P] Benchmark M4 performance (measure latency for 512x512, 1024x1024 images)
- [ ] T106 Create performance regression tests in tests/performance/ (ensure <15s for 512x512)

### Final Documentation

- [ ] T107 Finalize README.md with feature summary, setup, usage, and troubleshooting
- [ ] T108 [P] Create CHANGELOG.md with phase summaries and improvements
- [ ] T109 [P] Create ARCHITECTURE.md documenting MCP server design, engine abstraction, session management

**Checkpoint**: System polished, documented, and ready for public use

---

## Dependencies & Execution Order

### Phase Dependencies (Must Complete in Order)

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) [BLOCKS all user stories]
    ↓
Phase 3 (US1) ─┐
Phase 4 (US2) ─┼─ Can proceed in parallel (after Phase 2)
Phase 5 (US3) ─┘
    ↓
Phase 6 (Setup Wizard)
    ↓
Phase 7 (Polish & Cross-Cutting)
```

### User Story Dependencies

- **US1 (P1)**: MUST complete after Phase 2 - No dependencies on US2/US3
- **US2 (P2)**: MUST complete after Phase 2 - Can use US1's session/export infrastructure (but independently testable)
- **US3 (P3)**: MUST complete after Phase 2 - Can use US1's session management (but independently testable)

### Within Each User Story

1. Core tools implemented first (generate, check status, list models)
2. Session/history integration
3. Export functionality
4. Integration with previous stories (if applicable)
5. Independent acceptance test

### Parallel Opportunities [P]

**Phase 1 Setup** (all [P] tasks can run in parallel):
- T002, T003, T004, T005, T007, T008

**Phase 2 Foundational** (parallel by subsystem):
- MLX engine: T009, T010, T011
- Configuration: T012, T013, T014
- MCP server: T016, T017, T018
- Session models: T020, T021
- Persistence: T023, T024
- Validation: T027, T028

**Each User Story** (parallel within story):
- US1: T029, T030, T032, T033, T036, T038, T040, T042
- US2: T048, T050, T052, T054, T056, T057, T059
- US3: T063, T065, T068, T069, T072, T073, T074, T077

**Phase 7 Cross-Cutting** (most [P] tasks can run in parallel once all stories done):
- Error handling: T086, T087, T089, T090
- Logging: T091, T092, T094
- Documentation: T096, T097, T099
- Performance: T100, T102, T103, T105

---

## MVP Scope Recommendation

**MVP = Phase 1 + Phase 2 + Phase 3 (User Story 1 Only)**

**Rationale**:
- US1 (Iterate on Figma Designs) delivers core value proposition per P1 priority
- US1 is independently testable per spec.md acceptance criteria
- Can deploy and demo US1 before tackling variants (US2) or wireframes (US3)
- Foundation (Phase 2) enables future stories without rework
- Setup wizard (Phase 6) included for production readiness

**MVP Delivery Timeline**:
1. Complete Phase 1: ~4-6 hours (setup + dependencies)
2. Complete Phase 2: ~20-25 hours (foundational infrastructure)
3. Complete Phase 3 (US1): ~15-20 hours (image iteration + history + export)
4. Minimal Phase 6: ~5-8 hours (setup wizard)
5. Essential Phase 7: ~10-15 hours (error handling, documentation, validation)

**Total MVP**: ~54-74 hours

**Post-MVP** (Phase 4 & 5): Add US2 and US3 with same quality (20-30 hours each)

---

## Success Criteria Tracking

After each phase completion, verify:

**Phase 2 Complete**:
- [ ] MCP server starts without errors
- [ ] MLX health check passes (Python subprocess, model loaded)
- [ ] Session storage works at ~/.visualai/sessions/

**Phase 3 Complete (US1)**:
- [ ] generate_image tool produces valid PNG
- [ ] Iteration history preserved
- [ ] Rollback retrieves previous iterations in <10s (SC-005)
- [ ] Export works in PNG and SVG (SC-010)
- [ ] Full iteration cycle <3 minutes (SC-002)

**Phase 4 Complete (US2)**:
- [ ] Variant generation produces 3-4 options
- [ ] Refinement works on selected variant
- [ ] Multi-format export in <30s (SC-010)

**Phase 5 Complete (US3)**:
- [ ] Wireframe composition from description
- [ ] Component updates across all instances
- [ ] Component export for Figma compatibility

**Phase 6 Complete (Setup)**:
- [ ] Setup wizard completes in <5 minutes (SC-001)
- [ ] Non-technical user can configure without help

**Phase 7 Complete (Polish)**:
- [ ] Error messages jargon-free with actionable recovery (FR-015)
- [ ] 99% uptime (SC-011) verified via monitoring
- [ ] Zero sensitive data in logs (SC-012)
- [ ] All operations >5s show progress feedback (SC-013)

---

## MLX Integration Architecture Notes

**Architecture:**
- MCP Server (TypeScript/Node.js)
  ↓ spawns
- Python subprocess
  ↓ calls
- MLX Stable Diffusion (ml-explore/mlx-examples)
  ↓ uses
- Metal GPU + Neural Engine

**First-Time Setup Flow:**
1. User runs: `npx @visualai/mcp-server setup`
2. MCP checks Python 3.9+ (macOS default)
3. MCP installs: mlx, huggingface-hub, pillow, numpy, tqdm
4. First generation triggers model download (~5-7GB)
5. Subsequent generations: instant (model cached)

**File Paths:**
- Python wrapper: `src/engines/mlx-wrapper.ts`
- Dependency validator: `src/setup/dependency-checker.ts`
- Model downloader: `src/setup/model-downloader.ts`
- MLX subprocess caller: `src/engines/mlx-subprocess.ts`

**Runtime Dependencies:**
- Python 3.9+ (macOS included)
- Node.js 18+ (for MCP server)

**Python Dependencies (auto-installed):**
- mlx (Apple ML framework)
- huggingface-hub (model downloads)
- pillow (image processing)
- numpy, tqdm, regex (utilities)

**Models:**
- Stable Diffusion quantized (~5-7GB)
- Auto-downloaded from Hugging Face Hub
- Cached in ~/.cache/huggingface/

---

## Notes

- All paths rooted at repository level (src/, tests/, specs/)
- Tasks within phase can be parallelized when marked [P]
- User stories can proceed in parallel after Phase 2 if team capacity allows
- Each user story fully testable independently per spec.md acceptance criteria
- Commit after each task or logical group of related tasks
- Stop at any phase checkpoint to validate work independently
- No comments in code - self-explanatory via clear naming and structure
