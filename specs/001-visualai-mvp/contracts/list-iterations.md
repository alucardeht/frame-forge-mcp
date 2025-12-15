# list-iterations

## Description
Retrieves all iterations within a specific session. Each iteration represents a single prompt-to-image generation. Optionally includes the generated images as base64 and supports pagination via limit parameter.

## Input Schema

```typescript
{
  sessionId: string,             // Required: e.g., "session-2025-12-11-001"
  includeImages?: boolean,       // Optional: default false (for performance)
  limit?: number                 // Optional: max iterations to return, default all
}
```

**Required**: `sessionId`
**Optional**: `includeImages`, `limit`

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
  sessionId: string,
  iterations: [
    {
      index: number,                  // 0-based iteration index
      prompt: string,
      timestamp: string,              // ISO 8601
      imageData?: string,             // base64 PNG (if includeImages=true)
      mimeType?: string,              // "image/png"
      metadata?: {
        width: number,
        height: number,
        steps: number,
        guidance_scale: number,
        seed: number,
        generationTimeMs: number
      }
    }
  ],
  totalIterations: number,
  returnedCount: number
}
```

## Examples

### Example 1: List iterations without images
**Input:**
```json
{
  "sessionId": "session-2025-12-11-001"
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"sessionId\":\"session-2025-12-11-001\",\"iterations\":[{\"index\":0,\"prompt\":\"A serene mountain landscape at sunset\",\"timestamp\":\"2025-12-11T10:15:45.123Z\"},{\"index\":1,\"prompt\":\"Same landscape but with dramatic thunderstorm\",\"timestamp\":\"2025-12-11T10:17:22.456Z\"},{\"index\":2,\"prompt\":\"Mountain landscape with aurora borealis\",\"timestamp\":\"2025-12-11T10:19:15.789Z\"}],\"totalIterations\":3,\"returnedCount\":3}"
    }
  ]
}
```

### Example 2: List iterations with images
**Input:**
```json
{
  "sessionId": "session-2025-12-11-001",
  "includeImages": true
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"sessionId\":\"session-2025-12-11-001\",\"iterations\":[{\"index\":0,\"prompt\":\"A serene mountain landscape at sunset\",\"timestamp\":\"2025-12-11T10:15:45.123Z\",\"imageData\":\"iVBORw0KGgoAAAANSUhEUgAAA...[very long base64]...==\",\"mimeType\":\"image/png\",\"metadata\":{\"width\":512,\"height\":512,\"steps\":20,\"guidance_scale\":7.5,\"seed\":1234567890,\"generationTimeMs\":8500}},{\"index\":1,\"prompt\":\"Same landscape but with dramatic thunderstorm\",\"timestamp\":\"2025-12-11T10:17:22.456Z\",\"imageData\":\"iVBORw0KGgoAAAANSUhEUgAAA...[very long base64]...==\",\"mimeType\":\"image/png\",\"metadata\":{\"width\":512,\"height\":512,\"steps\":20,\"guidance_scale\":7.5,\"seed\":9876543210,\"generationTimeMs\":8600}}],\"totalIterations\":2,\"returnedCount\":2}"
    }
  ]
}
```

### Example 3: List iterations with limit
**Input:**
```json
{
  "sessionId": "session-2025-12-11-001",
  "limit": 5
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"sessionId\":\"session-2025-12-11-001\",\"iterations\":[{\"index\":7,\"prompt\":\"Iteration 8 prompt\",\"timestamp\":\"2025-12-11T12:30:15.100Z\"},{\"index\":8,\"prompt\":\"Iteration 9 prompt\",\"timestamp\":\"2025-12-11T12:32:45.200Z\"},{\"index\":9,\"prompt\":\"Iteration 10 prompt\",\"timestamp\":\"2025-12-11T12:35:20.300Z\"},{\"index\":10,\"prompt\":\"Iteration 11 prompt\",\"timestamp\":\"2025-12-11T12:37:50.400Z\"},{\"index\":11,\"prompt\":\"Iteration 12 prompt\",\"timestamp\":\"2025-12-11T12:40:10.500Z\"}],\"totalIterations\":12,\"returnedCount\":5}"
    }
  ]
}
```

### Example 4: Non-existent session
**Input:**
```json
{
  "sessionId": "session-invalid-xyz"
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"error\":\"Session not found\",\"sessionId\":\"session-invalid-xyz\"}"
    }
  ]
}
```

## Error Cases

- **Session not found**: Invalid or expired sessionId
- **Corrupted iteration data**: Partial data returned, corruption logged
- **Images too large**: When `includeImages=true` with many iterations, response may be truncated

## Notes

- Without `includeImages`, response is fast even with 100+ iterations
- With `includeImages=true`, response size grows significantly (each image is ~50KB-200KB base64)
- Iterations are ordered chronologically (oldest first), usually
- `limit` defaults to all iterations if not specified; use for pagination
- Metadata is always available, images are optional for performance
- Useful for UI display of iteration history, undo/redo, and comparing variations
