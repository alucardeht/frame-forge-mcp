# MCP Tool Contract: compare-iterations

## Overview

Compares duas iterações side-by-side (comparação A/B) para analisar evoluções de prompts, dimensões e parâmetros.

## Tool Name

`compare-iterations`

## Description

Compare two iterations side-by-side (A/B comparison)

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session identifier |
| `iterationIndex1` | number | Yes | 0-based index of first iteration |
| `iterationIndex2` | number | Yes | 0-based index of second iteration |

## Output Schema

```typescript
{
  status: 'success' | 'error',
  data?: {
    iteration1: {
      index: number,
      prompt: string,
      dimensions: {
        width: number,
        height: number
      },
      parameters: Record<string, any>,
      timestamp: string,
      image: string // base64 encoded
    },
    iteration2: {
      index: number,
      prompt: string,
      dimensions: {
        width: number,
        height: number
      },
      parameters: Record<string, any>,
      timestamp: string,
      image: string // base64 encoded
    },
    differences: {
      promptChanged: boolean,
      promptDiff: {
        added: string[],
        removed: string[],
        modified: string[]
      },
      dimensionsChanged: boolean,
      dimensionsDetail: {
        width: { from: number, to: number },
        height: { from: number, to: number }
      },
      parametersChanged: boolean,
      parametersDetail: Record<string, { from: any, to: any }>
    }
  },
  error?: string
}
```

## Use Cases

- **Analyze prompt evolution**: Compare iteration 2 vs iteration 5 to see which prompts changes improved output
- **Review parameter adjustments**: Identify which settings modifications affected results
- **Visual comparison**: Side-by-side images to evaluate quality differences
- **Decision making**: Determine which iteration was more successful before rollback

## Notes

- Returns detailed diff of all changes between iterations
- Both images included as base64 for immediate visualization
- Useful for understanding which adjustments improved output
- Non-destructive operation, does not modify session state

## Error Handling

- Invalid sessionId → error status with message
- iterationIndex1 or iterationIndex2 out of bounds → error status with message
- iterationIndex1 equals iterationIndex2 → error status with message
