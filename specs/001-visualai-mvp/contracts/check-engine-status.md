# check-engine-status

## Description
Validates that the image generation engine is properly initialized and available. Returns engine configuration, model name, and Python environment details. Should be called at startup and before critical operations.

## Input Schema

```typescript
{}
```

**Required**: (none)
**Optional**: (none)

## Output Schema

```typescript
{
  content: [
    {
      type: 'text',
      text: JSON
    }
  ]
}
```

**JSON structure:**
```typescript
{
  initialized: boolean,
  engineName: string,           // e.g., "stable-diffusion-v1.5"
  modelName: string,            // e.g., "runwayml/stable-diffusion-v1-5"
  pythonVersion: string,        // e.g., "3.10.12"
  gpuAvailable: boolean,
  device: string,               // e.g., "cuda" or "cpu"
  memoryUsageMB?: number,
  timestamp: string             // ISO 8601
}
```

## Examples

### Example 1: Engine ready with GPU
**Input:**
```json
{}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"initialized\":true,\"engineName\":\"stable-diffusion-v1.5\",\"modelName\":\"runwayml/stable-diffusion-v1-5\",\"pythonVersion\":\"3.10.12\",\"gpuAvailable\":true,\"device\":\"cuda\",\"memoryUsageMB\":2048,\"timestamp\":\"2025-12-11T14:30:45.123Z\"}"
    }
  ]
}
```

### Example 2: Engine ready with CPU fallback
**Input:**
```json
{}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"initialized\":true,\"engineName\":\"stable-diffusion-v2.1\",\"modelName\":\"stabilityai/stable-diffusion-2-1\",\"pythonVersion\":\"3.9.18\",\"gpuAvailable\":false,\"device\":\"cpu\",\"memoryUsageMB\":1024,\"timestamp\":\"2025-12-11T14:25:30.456Z\"}"
    }
  ]
}
```

### Example 3: Engine not initialized
**Input:**
```json
{}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"initialized\":false,\"engineName\":null,\"modelName\":null,\"pythonVersion\":\"3.10.12\",\"gpuAvailable\":false,\"device\":null,\"timestamp\":\"2025-12-11T14:20:15.789Z\"}"
    }
  ]
}
```

## Error Cases

- **Python environment not found**: Check local Python installation
- **GPU driver issues**: Falls back to CPU automatically
- **Model not downloaded**: First generation will trigger auto-download

## Notes

- Lightweight operation, completes in <100ms typically
- Should be called before first generate-image in a session
- GPU detection is automatic; no user configuration needed
- CPU fallback works but generation is 3-5x slower
- Memory usage is approximate; actual usage varies by model size
- Timestamp indicates when status was checked, not persistent state
