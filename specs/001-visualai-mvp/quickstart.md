# VisualAI MVP - Quickstart Guide

Generate your first AI image in less than 5 minutes.

---

## Prerequisites

- **Node.js** 18.0.0 or higher
- **Python** 3.8+ with MLX framework installed
- **macOS** (Apple Silicon M1/M2+) or **Linux**
- **4GB+ VRAM** recommended for image generation

Check your versions:

```bash
node --version
python3 --version
```

---

## Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd visualai-workspace
pnpm install
```

If you don't have `pnpm`:

```bash
npm install -g pnpm
```

### 2. Build TypeScript

```bash
pnpm build
```

---

## Configuration

### Set Up Configuration File

Create or edit `~/.visualai/config.json`:

```bash
mkdir -p ~/.visualai
cat > ~/.visualai/config.json << 'EOF'
{
  "python": {
    "path": "/usr/bin/python3",
    "minVersion": "3.8"
  },
  "model": {
    "name": "flux-dev",
    "cacheDir": "~/.visualai/cache"
  },
  "logging": {
    "level": "info"
  },
  "session": {
    "storageDir": "~/.visualai/sessions"
  },
  "performance": {
    "subprocessTimeoutMs": 90000
  }
}
EOF
```

**Required Fields:**

| Field | Description | Default |
|-------|-------------|---------|
| `python.path` | Full path to Python executable | `/usr/bin/python3` |
| `model.name` | Model identifier (flux-dev, flux-pro, etc.) | `flux-dev` |
| `model.cacheDir` | Directory for cached models | `~/.visualai/cache` |

### Verify Python Path

```bash
# Find your Python installation
which python3

# Confirm it has MLX support
python3 -c "import mlx.core as mx; print('MLX ready')"
```

If MLX is not installed:

```bash
pip install mlx
pip install mlx-lm
pip install diffusers
```

---

## Start the MCP Server

The MCP (Model Context Protocol) server runs locally and handles image generation:

```bash
pnpm start
```

**Expected Output:**

```
[MCPServer] Initializing MCP Server
[MCPServer] MCP Server initialized
[MCPServer] Session manager initialized
[MCPServer] MCP Server started and listening
```

The server listens on **stdio** (standard input/output) and waits for MCP client connections.

Leave this running in a terminal. Open a new terminal for Claude Desktop setup.

---

## Connect to Claude Desktop

### 1. Update Claude Desktop Configuration

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "visualai": {
      "command": "node",
      "args": [
        "/full/path/to/visualai-workspace/dist/index.js"
      ],
      "env": {
        "VISUALAI_CONFIG": "~/.visualai/config.json"
      }
    }
  }
}
```

Replace `/full/path/to/visualai-workspace` with your actual project path.

### 2. Restart Claude Desktop

Quit and reopen Claude Desktop. It will connect to the MCP server automatically.

---

## Generate Your First Image

### Via Claude Desktop

Open a conversation and type:

```
Use the generate_image tool to create an image with:
- Prompt: "a beautiful sunset over mountains, oil painting, golden hour"
- Width: 512
- Height: 512
- Steps: 20
```

Claude will:
1. Call the `generate-image` MCP tool
2. Send your prompt to the MLX engine
3. Display the generated image inline
4. Return metadata including latency and session ID

**Expected Response:**

```json
{
  "sessionId": "sess_abc123...",
  "iterationIndex": 0,
  "prompt": "a beautiful sunset over mountains, oil painting, golden hour",
  "width": 512,
  "height": 512,
  "steps": 20,
  "guidanceScale": 7.5,
  "latencyMs": 15234,
  "engineName": "MLX",
  "modelName": "flux-dev",
  "timestamp": "2025-12-11T10:30:45.123Z"
}
```

### Monitor Progress

The server logs generation progress every 2 seconds:

```
[GenerateImageTool] Generating image with prompt: a beautiful sunset...
[GenerateImageTool] Sampling - 25% complete (5/20) - ~7s remaining
[GenerateImageTool] Image generated successfully - session: sess_abc123..., iteration: 0
```

---

## Common Issues

### "Python not found at [path]"

**Solution:** Update `config.json` with correct Python path:

```bash
which python3
# Output: /opt/homebrew/bin/python3

# Edit config.json with this path
```

### "Missing dependencies: mlx, diffusers"

**Solution:** Install Python dependencies:

```bash
python3 -m pip install mlx mlx-lm diffusers transformers pillow numpy
```

### "Model not downloaded"

The first generation will download the model automatically (500MB+). This takes 2-5 minutes on first run.

To pre-download:

```bash
python3 << 'EOF'
from diffusers import FluxPipeline
import torch

pipe = FluxPipeline.from_pretrained("black-forest-labs/FLUX.1-dev")
print("Model cached successfully")
EOF
```

### Generation Timeout (>90 seconds)

**Solution:** Reduce complexity:

- Lower `steps` (try 15 instead of 20)
- Reduce resolution (try 512x512 instead of 768x768)
- Simplify prompt (fewer details)

---

## Iterating on Images

The MCP server maintains **sessions** for iterative refinement:

```
First generation:
- Prompt: "a sunset over mountains"
- Generates with sessionId: sess_abc123

Refine with same session:
- Prompt: "a sunset over mountains, more dramatic clouds"
- sessionId: sess_abc123
- System keeps history and context
```

Use the `sessionId` from previous responses to continue in the same session.

---

## View Generated Images

### In Claude Desktop

Images display inline in the conversation.

### Export Raw Image

Copy the base64 image data from the response and decode:

```bash
# Save base64 to file
echo "iVBORw0KGgoAAAANS..." > image.base64

# Decode and view
base64 -D -i image.base64 -o image.png
open image.png
```

---

## Next Steps

- **See [USER_GUIDE.md](../001-visualai-mvp/user-guide.md)** for advanced prompting and iteration features
- **See [DEVELOPER_GUIDE.md](../001-visualai-mvp/developer-guide.md)** to extend the system
- **See [ARCHITECTURE.md](../001-visualai-mvp/architecture.md)** for technical deep dive
- **See [contracts/](../001-visualai-mvp/contracts/)** for full MCP tool documentation

---

## Troubleshooting

### Server won't start

1. Check Node.js version: `node --version` (need 18+)
2. Rebuild TypeScript: `pnpm build`
3. Check for port conflicts: `lsof -i :3000`
4. Review logs: `pnpm start 2>&1 | tee debug.log`

### Claude Desktop won't connect

1. Verify server is running: You should see "MCP Server started and listening"
2. Check config path in `claude_desktop_config.json`
3. Restart Claude Desktop completely
4. Check Claude's error logs: `~/Library/Logs/Claude/`

### Generation fails silently

Check server output for error messages. Common causes:

- Python process crashed (check system memory)
- Model file corrupted (delete cache: `rm -rf ~/.visualai/cache`)
- MLX version mismatch (reinstall: `pip install --upgrade mlx`)

---

## Performance Notes

| Resolution | Avg Time | VRAM Used |
|-----------|----------|-----------|
| 512x512, 20 steps | 15-20s | 2-3GB |
| 768x768, 25 steps | 25-35s | 3-4GB |
| 1024x1024, 30 steps | 45-60s | 5-6GB |

Times vary by hardware. M1/M2 Pro recommended for <30s generations.

---

**Questions?** Check [ARCHITECTURE.md](../001-visualai-mvp/architecture.md) for technical details or review individual tool contracts in `contracts/` directory.
