# VisualAI MCP Server

Local AI image generation via Model Context Protocol (MCP) using MLX on Apple Silicon.

[![Build Status](https://github.com/YOUR_ORG/visualai-workspace/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_ORG/visualai-workspace/actions)
[![Tests](https://github.com/YOUR_ORG/visualai-workspace/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_ORG/visualai-workspace/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 18+](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![Python 3.9+](https://img.shields.io/badge/python-%3E%3D3.9-blue)](https://www.python.org/)

## Features

- **Iterate on Designs**: Conversational modifications to Figma mockups
- **Generate Assets**: Professional icons, banners, mockups
- **Create Wireframes**: Build wireframes through conversation
- **100% Local**: Zero API costs, full control
- **Apple Silicon Optimized**: MLX framework with Metal GPU acceleration

## Requirements

- **Hardware**: Mac with Apple Silicon (M1, M2, M3, M4 or newer)
- **Software**:
  - macOS 12+ (Monterey or later)
  - Node.js 18+
  - Python 3.9+ (included in macOS)

## Quick Start

### 1. Installation

```bash
npm install
npm run build
```

### 2. Setup Wizard (First Time - ~5 minutes)

When you first run the server, an interactive setup wizard will automatically start:

```bash
npm start
```

The wizard will automatically:

**Step 1: Python Detection** (< 1 min)
- Verifies Python 3.9+ is installed
- Suggests Homebrew install if not found: `brew install python@3.11`
- Auto-detects common Python paths

**Step 2: Dependency Installation** (2-5 min)
- Installs: mlx, huggingface-hub, pillow, torch
- Creates isolated environment in `~/.visualai/venv`
- Shows progress for each package

**Step 3: Model Download** (15-40 min, depending on connection)
- Downloads Stable Diffusion 2.1 (~5-7GB) from Hugging Face Hub
- Saves to `~/.visualai/models/`
- **Auto-resume** if download is interrupted
- Shows download progress with ETA

**Step 4: Health Check** (< 30 sec)
- Generates test image (256x256) to validate setup
- Auto-injects `claude_desktop_config.json`
- Confirms MCP server is ready

**Progress Feedback:**
- Visual spinner for each step
- Time estimates for operations > 5 seconds
- Bandwidth tracking for model download

After setup completes, you'll see:
```
✅ Setup complete! VisualAI is ready to use.

Next steps:
  1. Restart Claude Desktop to activate the VisualAI MCP server
  2. Open Claude and check MCP servers list (should show "visualai")
  3. Start using VisualAI tools!
```

### 3. Configuration

Copy `.env.example` to `.env` and customize if needed:

```bash
cp .env.example .env
```

Default settings work for most users.

#### Claude Desktop Configuration

The setup wizard automatically injects VisualAI MCP server configuration into `claude_desktop_config.json`:

**Platform-specific paths:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Auto-injected configuration:**
```json
{
  "mcpServers": {
    "visualai": {
      "command": "node",
      "args": ["/absolute/path/to/visualai-workspace/dist/index.js"],
      "env": {
        "PYTHON_PATH": "/path/to/python3",
        "MODEL_CACHE_DIR": "~/.cache/huggingface/"
      }
    }
  }
}
```

The wizard preserves any existing MCP servers in your config.

**Manual configuration** (only if auto-injection fails):
1. Open `claude_desktop_config.json` in your editor
2. Add the VisualAI server configuration shown above
3. Update paths to match your system
4. Restart Claude Desktop

### 4. Start Server

```bash
npm start
```

The server uses stdin/stdout (JSON-RPC) as per MCP protocol.

## MCP Tools

### `generate-image`

Generate image from text prompt.

**Input:**
```json
{
  "prompt": "A serene lake at sunset",
  "width": 512,
  "height": 512,
  "steps": 20,
  "guidance_scale": 7.5,
  "seed": 42
}
```

**Output:**
- Base64 encoded PNG image
- Metadata (prompt, dimensions, latency, etc.)
- Session ID for iteration tracking

### `check-engine-status`

Check MLX engine and dependencies status.

**Input:** None

**Output:**
- Engine ready status
- Dependencies list with versions
- Model path

### `list-sessions`

List all available sessions.

**Input:** None

**Output:** Array of sessions with metadata

### `rollback-iteration`

Revert to a previous iteration in a session.

**Input:**
```json
{
  "sessionId": "session-abc123",
  "iterationIndex": 2
}
```

### `preview-iteration`

Preview a previous iteration without modifying session.

**Input:**
```json
{
  "sessionId": "session-abc123",
  "iterationIndex": 2
}
```

## Architecture

- **Engine:** MLX (Apple's ML framework for Apple Silicon)
- **Model:** Stable Diffusion 2.1 (~5GB)
- **Protocol:** MCP via stdin/stdout (JSON-RPC 2.0)
- **Sessions:** File-based in `~/.visualai/sessions/`
- **Performance:** 8-15s per image (512x512) on M4

### Setup Flow

```
npm start (first time)
  ↓
Auto-installer detects missing setup
  ├─ Check Python 3.9+ (with brew install fallback)
  ├─ Create virtualenv in ~/.visualai/venv
  ├─ Install dependencies (mlx, huggingface-hub, pillow, torch)
  └─ Validate with health check
    ↓
Model downloader
  ├─ Check ~/.visualai/models/ for existing model
  ├─ Download from Hugging Face Hub (resume-capable)
  └─ Progressive feedback with ETA
    ↓
claude_desktop_config.json injection
  ├─ Detect platform-specific path
  ├─ Create backup of existing config
  ├─ Merge VisualAI server with existing MCP servers
  └─ Validate JSON after write
    ↓
Server Ready (MCP listening on stdio)
```

## CI/CD & Testing

### Automated Testing

This project uses **GitHub Actions** for continuous integration and automated testing.

**Workflows configured:**
- 🏗️ **Build Validation** (`build.yml`) - TypeScript compilation and type checking
- 🧪 **Test Suite** (`test.yml`) - Unit, integration, acceptance, and E2E tests on Node 18, 20, 22

**Test execution:**
```bash
# All tests
npm test

# Acceptance tests only
npm run test:acceptance

# With coverage report
npm test -- --coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

**Test Statistics:**
- **Total test files:** 9 (4,210 lines)
- **Coverage layers:** Unit → Integration → Acceptance → E2E
- **Test execution time:** ~3 minutes
- **CI execution time:** ~5 minutes (with coverage upload)

**CI/CD Documentation:**
See [`.github/CI-CD-SETUP.md`](.github/CI-CD-SETUP.md) for complete CI/CD configuration details.

**Workflow Status:**
- [View GitHub Actions runs](https://github.com/YOUR_ORG/visualai-workspace/actions)

## Development

```bash
# Watch mode (development)
npm run dev

# Build
npm run build

# Start
npm start
```

## Project Structure

```
src/
├── engines/          # MLX engine implementation
├── mcp/              # MCP server and tools
├── session/          # Session management
├── setup/            # Auto-installer and dependency checker
├── types/            # TypeScript interfaces
└── utils/            # Config and logger
```

## Troubleshooting

### Python not found

```bash
# Check Python version
python3 --version

# If not found, install via Homebrew:
brew install python@3.11

# Re-run setup:
npm start
```

### MLX requires Apple Silicon

**Error:** "MLX requires Metal GPU on Apple Silicon"

- Your Mac doesn't have Apple Silicon (Intel/T2 chip) = incompatible with current version
- Minimum requirement: M1, M2, M3, or M4 chip
- Workaround: Wait for Phase 2 (Core ML / cloud API support)

### Model download hangs or times out

```bash
# 1. Check internet connection
ping huggingface.co

# 2. Stop server and restart (auto-resumes download)
npm start

# 3. If still fails, clear cache and retry
rm -rf ~/.visualai/models/.huggingface/
npm start
```

### Memory pressure / out of memory

**Symptoms:** Generation fails or takes > 60 seconds

- **8GB RAM:** Functional but slow (30-60s per image)
- **16GB+ RAM:** Optimal performance (8-15s per image)
- **Workaround:** Close other applications to free memory

### Claude Desktop configuration injection fails

```bash
# 1. Check if config was injected
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | grep visualai

# 2. If missing, manually add configuration
# (see Configuration section above for JSON structure)

# 3. Restart Claude Desktop
```

### Build errors

```bash
# Clear build artifacts and reinstall
rm -rf dist node_modules
npm install
npm run build
```

### For more detailed troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## License

MIT
