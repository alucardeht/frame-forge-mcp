# Feature Specification: VisualAI - Visual Assistant for Design and Assets

**Feature Branch**: `001-visualai-mvp`
**Created**: 2025-12-11
**Status**: Draft
**Input**: User description: "Visual assistant for design and assets with conversational iteration"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iterate on Figma Designs (Priority: P1)

A user receives a design mockup from Figma (screenshot or image file) and needs to make visual modifications through conversational iteration until achieving the desired result.

**Why this priority**: This is the core value proposition. Users with visual difficulty can communicate changes through natural language instead of design tools, maintaining conversation context across iterations.

**Independent Test**: Can be fully tested by providing a sample image, requesting modifications (e.g., "add rounded borders", "apply glassmorphism"), and verifying each iteration produces visual changes matching the request. Delivers immediate value without requiring other features.

**Acceptance Scenarios**:

1. **Given** a user has a screenshot of a Figma card (150x300px, solid red background), **When** the user requests "add rounded borders of 12px", **Then** the system generates a new image with rounded corners applied
2. **Given** the previous iteration (card with rounded borders), **When** the user requests "don't use solid color, apply glassmorphism effect", **Then** the system generates a card with glass morphism applied instead of solid background
3. **Given** the glassmorphism iteration, **When** the user requests "adjust the opacity to make it more subtle", **Then** the system generates a refined version with adjusted transparency
4. **Given** any iteration in the conversation, **When** the user requests "go back to version 2", **Then** the system retrieves and displays the second iteration from history
5. **Given** the final satisfactory iteration, **When** the user requests export, **Then** the system provides the image in requested format (PNG, SVG) with appropriate resolution

---

### User Story 2 - Generate Professional Assets (Priority: P2)

A user needs to create professional corporate assets (icons, banners, mockups) through conversational description without using design tools.

**Why this priority**: Addresses immediate productivity need for users who struggle with visual design tools. Enables quick asset generation for business use cases without design skills.

**Independent Test**: Can be tested by requesting "create a corporate 'report' icon", receiving 3-4 options, selecting one, refining it ("make it more minimalist"), and exporting in multiple formats. Delivers standalone value for asset creation.

**Acceptance Scenarios**:

1. **Given** a user describes an asset need ("I need a corporate-style report icon"), **When** the system processes the request, **Then** it generates 3-4 variant options for selection
2. **Given** the user selects option 2, **When** the user requests refinement ("make it more minimalist"), **Then** the system generates a refined version of the selected option
3. **Given** the user is satisfied with the result, **When** the user requests "export in SVG and PNG at 512x512", **Then** the system provides both file formats at specified resolution
4. **Given** a user requests a banner (1200x400px for web header), **When** the user describes content ("company logo left, tagline center, CTA button right"), **Then** the system generates a professional banner layout matching the description
5. **Given** any asset generation request, **When** the processing takes longer than 5 seconds, **Then** the system displays progressive feedback with step names, time estimates, and progress percentage

---

### User Story 3 - Create Wireframes Conversationally (Priority: P3)

A user builds complete wireframe layouts through conversational description, iterating on components until achieving desired structure.

**Why this priority**: More complex workflow requiring component composition and layout understanding. Valuable for prototyping but less critical than direct iteration on existing designs.

**Independent Test**: Can be tested by requesting "create a dashboard wireframe", specifying layout ("sidebar left, header top, grid of cards in center"), refining components ("cards should have icon, title, numeric value"), and exporting components. Demonstrates full wireframe workflow independently.

**Acceptance Scenarios**:

1. **Given** a user requests "I need a dashboard wireframe", **When** the system asks for main elements, **Then** the user can specify "sidebar left, header top, card grid center"
2. **Given** the base layout is generated, **When** the user requests "cards should have icon, title, and numeric value", **Then** the system updates all cards in the grid with the specified structure
3. **Given** a complete wireframe, **When** the user requests "make the sidebar narrower", **Then** the system adjusts proportions while maintaining layout integrity
4. **Given** a satisfactory wireframe, **When** the user requests "export components for Figma", **Then** the system provides individual component exports compatible with design tools
5. **Given** a multi-component wireframe, **When** the user requests "show only the header component", **Then** the system isolates and displays the requested component for focused iteration

---

### Edge Cases

- What happens when the user uploads an image format that's not supported (e.g., HEIC, TIFF)? System should convert automatically or display clear error with supported formats
- How does the system handle requests that contradict previous iterations (e.g., "make it red" then immediately "make it blue")? Should apply the latest instruction and maintain version history
- What happens when API quota is exhausted or API is unavailable? System should detect failure, display actionable error message, and suggest retry or alternative
- How does the system handle ambiguous requests (e.g., "make it better")? Should ask clarifying questions or suggest specific improvements based on context
- What happens when a session has 50+ iterations? System should maintain full history but provide UI for navigating/filtering versions
- How does the system handle very large images (> 10MB uploads)? Should compress automatically with warning or reject with size limit message
- What happens when network connectivity is lost mid-generation? System should detect timeout, preserve conversation state, and allow retry
- How does the system handle requests for assets in dimensions not supported by the API (e.g., 7000x7000px)? Should inform user of maximum dimensions and suggest alternatives

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST complete initial setup in two phases:
  - **Active Setup** (< 5 minutes): `npx @visualai/mcp-server setup` installs Python dependencies
  - **Model Download** (15-40 minutes, one-time): Automated download of Stable Diffusion model via Hugging Face Hub (~5-7GB)
  - **Daily Usage** (0 seconds): MCP auto-detects model and generates images via MLX
- **FR-002**: System MUST provide interactive wizard for MLX setup (auto-detection of Python installation, dependency verification, model download progress) without requiring manual JSON/config file editing
- **FR-003**: System MUST accept visual input in multiple formats (PNG, JPG, WebP, screenshots, Figma exports)
- **FR-004**: System MUST accept textual descriptions for image generation without requiring visual input
- **FR-005**: System MUST maintain conversation context across all iterations within a session
- **FR-006**: System MUST preserve full iteration history for rollback and comparison
- **FR-007**: System MUST provide progressive feedback for operations exceeding 5 seconds (with step names, time estimates, progress percentage, heartbeat updates every 2-3 seconds). Applies to both image generation and initial model download.
- **FR-008**: System MUST display generated images immediately after each iteration
- **FR-009**: System MUST allow users to reference previous iterations by number or description ("version 2", "the one with glassmorphism")
- **FR-010**: System MUST export final images in multiple formats (PNG primary, SVG for simple icons)
- **FR-011**: System MUST export images in multiple resolutions (original, @2x, @3x for web/mobile)
- **FR-012**: System MUST support variant generation (2-4 options) for initial asset requests
- **FR-013**: System MUST enable A/B comparison between any two iterations
- **FR-014**: System MUST validate all user requests before API calls to prevent quota waste
- **FR-015**: System MUST provide clear, jargon-free error messages with actionable recovery steps
- **FR-016**: System MUST use MLX (Apple's ML framework) as primary engine (Phase 1), with support for alternative local engines (Core ML, custom models) in Phase 2+
- **FR-017**: System MUST abstract local engine interface to enable swapping between MLX, Core ML, or custom models without refactoring (Phase 2+)
- **FR-018**: System MUST handle local engine failures gracefully:
  - Auto-install Python dependencies if missing
  - Auto-download model if not found
  - Retry generation with exponential backoff
  - Display actionable error with setup instructions
- **FR-019**: System MUST store session data persistently in file-based storage (no database required for Phase 1)
- **FR-020**: System MUST provide browser preview server for immediate visual feedback (localhost with WebSocket updates)
- **FR-021**: System MUST integrate with Claude Code CLI as primary interface
- **FR-022**: System MUST log all operations for debugging without exposing sensitive data (API keys, tokens)
- **FR-023**: System MUST validate setup completion:
  - Verify Python dependencies installed (mlx, huggingface-hub, pillow)
  - Confirm Stable Diffusion model downloaded
  - Generate sample 512x512 image to confirm functionality
- **FR-024**: System MUST support undo/redo operations within a session

### Key Entities *(include if feature involves data)*

- **Session**: Represents a complete conversation workflow with unique ID, creation timestamp, conversation history (user prompts + system responses), iteration history (all generated images with metadata), current state (active iteration, selected variants), and persistent storage path
- **Image**: Represents a generated or uploaded visual asset with unique ID, source type (generated/uploaded/iterated), binary data (PNG/SVG), resolution (width/height), API provider used, generation cost, parent iteration reference, and timestamp
- **Iteration**: Represents a single step in the conversational workflow with version number, user prompt, system response, generated image reference, API call metadata (latency, tokens, cost), and parent/child iteration links for version tree
- **Asset**: Represents exportable output with type (icon/banner/mockup/wireframe), dimensions, format (PNG/SVG), resolution variants (@1x/@2x/@3x), export timestamp, and source iteration reference
- **LocalEngine**: Represents abstraction over local image generation engines with engine name (MLX/CoreML/Custom), execution method (Python subprocess/Native), dependency management (auto-install, version check), performance profile (latency, max resolution, memory usage), and capabilities (supported formats, features)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Non-technical users can complete initial setup (install + configure + test) in under 5 minutes without external help
- **SC-002**: Users can complete a full iteration cycle (prompt → generation → visual feedback) in under 3 minutes including API latency
- **SC-003**: 90% of users achieve satisfactory visual result within 5 iterations or less
- **SC-004**: System provides visual feedback within 2 seconds of user input for all non-generation operations (navigation, comparison, export)
- **SC-005**: Users successfully rollback to previous iterations in under 10 seconds (< 3 clicks/commands)
- **SC-006**: System handles 10 concurrent sessions without performance degradation
- **SC-014**: Users can successfully swap local engines (MLX → Core ML → custom models) without losing session data or requiring code changes (Phase 2+)
- **SC-008**: 95% of sessions maintain accurate conversation context across 10+ iterations without requiring user to repeat information
- **SC-009**: System provides actionable error recovery steps for 100% of common failure scenarios (engine failure, invalid input, network timeout)
- **SC-010**: Users can export assets in requested format and resolution in under 30 seconds
- **SC-011**: System uptime availability exceeds 99% (excluding local engine downtime)
- **SC-012**: Zero instances of sensitive data exposure in logs, error messages, or exported files
- **SC-013**: 100% of operations exceeding 5 seconds display progressive feedback with time estimates accurate within ±20%

## Assumptions *(optional - include if needed)*

- Users have Mac with Apple Silicon (M1, M2, M3, M4, or newer)
- Users have at least 8GB RAM and 10GB free disk space for models
- Python 3.9+ available on macOS (included by default)
- MLX framework compatible with Apple Silicon
- Hugging Face Hub accessible for model downloads
- Stable Diffusion models under 8GB (quantized versions)
- Internet connection available for initial model download (one-time)
- Metal GPU acceleration available on Apple Silicon
- Users have modern browsers (Chrome/Firefox/Safari last 2 versions) for preview server
- File system access is available for session storage (~/.visualai/)
- Node.js 18+ runtime is available or can be installed
- Users understand basic concepts (icon, banner, wireframe, iteration)

## Dependencies *(optional - include if needed)*

- External dependency on MLX framework (Apple's official ML library)
- Python dependencies: mlx, huggingface-hub, pillow, numpy, tqdm
- Stable Diffusion model availability on Hugging Face Hub
- Metal GPU drivers (included in macOS)
- Claude Code CLI must be installed and functional
- Browser must support WebSocket for real-time preview updates
- File system must allow directory creation in user home directory
- Network access required for initial model download and preview server

## Out of Scope *(optional - include if needed)*

- 3D modeling or rendering
- Video generation or animation
- Real-time collaborative editing
- Advanced image editing (layer manipulation, masking, filters)
- Direct Figma plugin integration (Phase 1)
- Custom model training or fine-tuning
- Cloud-based image generation APIs (Phase 1 - local only)
- Windows or Linux support (Phase 1 - macOS only)
- Non-Apple Silicon Macs (Phase 1 - M-series only)
- User authentication or multi-user accounts (Phase 1)
- Cloud storage or sharing
- Version control integration beyond local sessions
- Advanced batch processing (Phase 1)
- Image analysis or feedback scoring (Phase 3)
