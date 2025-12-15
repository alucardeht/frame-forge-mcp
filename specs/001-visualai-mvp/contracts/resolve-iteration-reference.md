# MCP Tool Contract: resolve-iteration-reference

## Overview

Resolve referências de iteração (número, "latest", "first", ou substring match do prompt) para o índice correto.

## Tool Name

`resolve-iteration-reference`

## Description

Resolve iteration reference (number, "latest", "first", or substring match of prompt)

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session identifier |
| `reference` | string \| number | Yes | Reference to resolve: iteration index, "latest", "first", or substring match of prompt |

## Output Schema

```typescript
{
  status: 'success' | 'error',
  data?: {
    resolvedIndex: number,
    referenceType: 'index' | 'keyword' | 'substring',
    iteration: {
      index: number,
      prompt: string,
      dimensions: {
        width: number,
        height: number
      },
      timestamp: string,
      matchInfo?: {
        matchType: 'exact' | 'fuzzy',
        matchScore: number // 0-1 for fuzzy matches
      }
    }
  },
  error?: string
}
```

## Use Cases

- **Numeric reference**: `reference: 3` → returns iteration at index 3
- **Latest iteration**: `reference: "latest"` → returns most recent iteration
- **First iteration**: `reference: "first"` → returns iteration at index 0
- **Substring matching**: `reference: "sunset"` → finds iteration with prompt containing "sunset over mountains"
- **Fuzzy prompt search**: `reference: "mountain"` → finds closest prompt match with confidence score

## Notes

- Supports multiple resolution strategies: exact index, keywords, fuzzy substring matching
- "latest" keyword always returns the most recent iteration
- "first" keyword always returns iteration at index 0
- Substring matching performs fuzzy search across all iteration prompts
- Returns matchInfo with fuzzy score for non-exact matches
- Non-destructive operation, does not modify session state

## Error Handling

- Invalid sessionId → error status with message
- Numeric reference out of bounds → error status with message
- Substring reference with no matches → error status with message
- Invalid keyword (not "latest" or "first") → error status with message
