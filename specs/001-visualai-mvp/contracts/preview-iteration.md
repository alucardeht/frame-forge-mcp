# MCP Tool Contract: preview-iteration

## Overview

Preview uma iteração específica sem alterar o estado da sessão (operação não-destrutiva).

## Tool Name

`preview-iteration`

## Description

Preview a specific iteration without changing session state (non-destructive)

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session identifier |
| `iterationIndex` | number | Yes | 0-based index of iteration to preview |

## Output Schema

```typescript
{
  status: 'success' | 'error',
  data?: {
    index: number,
    prompt: string,
    image: string, // base64 encoded
    dimensions: {
      width: number,
      height: number
    },
    parameters: Record<string, any>,
    metadata: {
      generationTime: number, // milliseconds
      model: string,
      seed?: number
    },
    timestamp: string
  },
  error?: string
}
```

## Use Cases

- **Review before rollback**: Preview iteration 3 to check prompt before deciding to rollback to it
- **Quick lookup**: Inspect specific iteration details without modifying session history
- **Parameter review**: Check what parameters were used in a specific generation
- **Image inspection**: View image without committing to rollback

## Notes

- Read-only operation, does not modify session state
- Does not trigger rollback or undo operations
- Faster than rollback + undo workflow when just inspecting
- Returns complete iteration metadata including generation info
- Non-destructive, can be called multiple times without side effects

## Error Handling

- Invalid sessionId → error status with message
- iterationIndex out of bounds → error status with message
- Session data corrupted or unavailable → error status with message
