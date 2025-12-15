# generate-image

## Description
Generates an image based on a text prompt using the configured AI image generation engine (Stable Diffusion or similar). Supports custom dimensions, sampling steps, guidance scale, and deterministic generation via seed.

## Input Schema

```typescript
{
  prompt: string,           // Image description (required)
  width?: number,           // 1-2048, default 512
  height?: number,          // 1-2048, default 512
  steps?: number,           // 1-100, default 20 (more steps = higher quality, slower)
  guidance_scale?: number,  // 1-20, default 7.5 (higher = closer to prompt)
  seed?: number,            // For reproducible results
  sessionId?: string        // Link to iteration history
}
```

**Required**: `prompt`
**Optional**: `width`, `height`, `steps`, `guidance_scale`, `seed`, `sessionId`

## Output Schema

```typescript
{
  content: [
    {
      type: 'image',
      data: string,              // Base64 encoded PNG
      mimeType: 'image/png',
      metadata: {
        latencyMs: number,
        profiling: {
          initTime: number,
          generationTime: number,
          encodingTime: number
        },
        seed: number,             // The seed used (returned for reproducibility)
        width: number,
        height: number,
        steps: number,
        guidance_scale: number
      }
    }
  ]
}
```

## Examples

### Example 1: Basic prompt with defaults
**Input:**
```json
{
  "prompt": "A serene mountain landscape at sunset with golden light",
  "sessionId": "session-2025-12-11-001"
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "image",
      "data": "iVBORw0KGgoAAAANSUhEUgAAA...[very long base64]...==",
      "mimeType": "image/png",
      "metadata": {
        "latencyMs": 8500,
        "profiling": {
          "initTime": 200,
          "generationTime": 8000,
          "encodingTime": 300
        },
        "seed": 1234567890,
        "width": 512,
        "height": 512,
        "steps": 20,
        "guidance_scale": 7.5
      }
    }
  ]
}
```

### Example 2: High quality with custom dimensions
**Input:**
```json
{
  "prompt": "Cyberpunk neon city street, rain, blade runner aesthetic",
  "width": 768,
  "height": 1024,
  "steps": 50,
  "guidance_scale": 12,
  "seed": 42,
  "sessionId": "session-2025-12-11-002"
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "image",
      "data": "iVBORw0KGgoAAAANSUhEUgAAMAAAAA...[very long base64]...==",
      "mimeType": "image/png",
      "metadata": {
        "latencyMs": 22500,
        "profiling": {
          "initTime": 200,
          "generationTime": 22000,
          "encodingTime": 300
        },
        "seed": 42,
        "width": 768,
        "height": 1024,
        "steps": 50,
        "guidance_scale": 12
      }
    }
  ]
}
```

### Example 3: Portrait orientation with specific seed
**Input:**
```json
{
  "prompt": "Professional headshot of a woman, studio lighting, neutral background",
  "width": 512,
  "height": 768,
  "steps": 35,
  "guidance_scale": 8.5,
  "seed": 9999,
  "sessionId": "session-2025-12-11-003"
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "image",
      "data": "iVBORw0KGgoAAAANSUhEUgAAIAA...[very long base64]...==",
      "mimeType": "image/png",
      "metadata": {
        "latencyMs": 15200,
        "profiling": {
          "initTime": 200,
          "generationTime": 14700,
          "encodingTime": 300
        },
        "seed": 9999,
        "width": 512,
        "height": 768,
        "steps": 35,
        "guidance_scale": 8.5
      }
    }
  ]
}
```

## Error Cases

- **Invalid prompt**: Empty or null prompt string
- **Dimension out of range**: Width or height not between 1-2048
- **Invalid steps**: Steps value not between 1-100
- **Invalid guidance_scale**: Guidance scale not between 1-20
- **Engine not initialized**: Check-engine-status should be run first
- **Timeout (90s)**: Generation exceeded timeout limit
- **Invalid sessionId**: Session not found in active sessions

## Notes

- Generation latency varies based on: step count, dimensions, hardware
- `steps=20` (default) provides reasonable quality in ~8-10s
- `steps=50+` provides high quality but takes 20-30s
- Guidance scale 7-9 usually balances prompt adherence with creativity
- Seeds are 32-bit integers; using same seed produces identical images
- Timeout is hard-limited at 90 seconds; very large dimensions + high steps may timeout
- Base64 output can be directly embedded in img tags or written to PNG file
