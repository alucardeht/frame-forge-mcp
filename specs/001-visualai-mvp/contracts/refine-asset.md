# MCP Contract: refine-asset

## Overview
Refine the currently selected variant with additional instructions or modifications.

## Tool Name
`refine-asset`

## Description
Takes the selected variant and applies iterative refinements based on textual instructions. Creates a new variant with the applied modifications and adds it to the session's variant collection. Useful for iterating on style, color, detail level, or other visual attributes.

## Input Schema

```typescript
{
  sessionId: string
  refinement: string
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session identifier with selected variant |
| `refinement` | string | Yes | Natural language instruction for refinement (e.g., "make it more colorful", "add more details", "change to blue tones") |

## Output Schema

```typescript
{
  sessionId: string
  previousVariantId: string
  newVariantId: string
  refinedImage: {
    imageBase64: string
    mimeType: 'image/png'
    dimensions: { width: number; height: number }
  }
  metadata: {
    description: string
    refinementApplied: string
    generatedAt: string (ISO 8601)
    parentVariantId: string
  }
  generationTime: number (milliseconds)
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Session identifier |
| `previousVariantId` | string | ID of the variant that was refined |
| `newVariantId` | string | ID of the newly created refined variant |
| `refinedImage` | object | Image data of the refined variant |
| `refinedImage.imageBase64` | string | Base64-encoded PNG data |
| `refinedImage.mimeType` | string | Image format (always "image/png") |
| `refinedImage.dimensions` | object | Canvas dimensions |
| `metadata` | object | Metadata about the refinement |
| `metadata.description` | string | Natural language description of the refined variant |
| `metadata.refinementApplied` | string | The refinement instruction that was applied |
| `metadata.generatedAt` | string | ISO 8601 timestamp |
| `metadata.parentVariantId` | string | Reference to the variant that was refined |
| `generationTime` | number | Processing time in milliseconds |

## Examples

### Example 1: Add Color to Icon
**Request:**
```json
{
  "sessionId": "sess_abc123xyz",
  "refinement": "add vibrant colors and subtle gradients"
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123xyz",
  "previousVariantId": "variant-1",
  "newVariantId": "variant-6",
  "refinedImage": {
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "mimeType": "image/png",
    "dimensions": { "width": 256, "height": 256 }
  },
  "metadata": {
    "description": "minimalist line art style with vibrant colors and subtle gradients",
    "refinementApplied": "add vibrant colors and subtle gradients",
    "generatedAt": "2025-12-11T10:45:00Z",
    "parentVariantId": "variant-1"
  },
  "generationTime": 4200
}
```

### Example 2: Enhance Detail Level
**Request:**
```json
{
  "sessionId": "sess_abc123xyz",
  "refinement": "increase detail level, add shadows and highlights, make it more realistic"
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123xyz",
  "previousVariantId": "variant-3",
  "newVariantId": "variant-7",
  "refinedImage": {
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "mimeType": "image/png",
    "dimensions": { "width": 256, "height": 256 }
  },
  "metadata": {
    "description": "gradient filled style with increased detail, shadows and highlights, more realistic",
    "refinementApplied": "increase detail level, add shadows and highlights, make it more realistic",
    "generatedAt": "2025-12-11T10:50:00Z",
    "parentVariantId": "variant-3"
  },
  "generationTime": 3800
}
```

### Example 3: Color Adjustment
**Request:**
```json
{
  "sessionId": "sess_abc123xyz",
  "refinement": "change color scheme to cool tones: blues, purples, and silvers"
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123xyz",
  "previousVariantId": "variant-6",
  "newVariantId": "variant-8",
  "refinedImage": {
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "mimeType": "image/png",
    "dimensions": { "width": 256, "height": 256 }
  },
  "metadata": {
    "description": "minimalist line art with cool tones in blues, purples, and silvers",
    "refinementApplied": "change color scheme to cool tones: blues, purples, and silvers",
    "generatedAt": "2025-12-11T10:55:00Z",
    "parentVariantId": "variant-6"
  },
  "generationTime": 3500
}
```

## Behavior Notes

- **Prerequisite:** A prior call to `select-variant` must be made before refinement. The tool operates on the currently selected variant in the session.
- **Iterative Refinement:** Each refinement creates a new variant. The chain of refinements (parent-child relationships) is tracked via `parentVariantId`.
- **Session Accumulation:** All refined variants are added to `allVariants` array in the session, preserving the entire history.
- **Timeout:** Expect 2-3 seconds for refinement processing. Total timeout approximately 90 seconds.
- **Natural Language:** Refinement descriptions are flexible and support various natural language instructions (e.g., "make it pop", "add more dimension", "soften the edges").
- **Dimensions Preserved:** Refined variants maintain the same dimensions as the parent variant.

## Error Handling

| Error Code | Description |
|-----------|-------------|
| `SESSION_NOT_FOUND` | Provided sessionId does not exist or has expired |
| `NO_VARIANT_SELECTED` | No variant has been selected via select-variant |
| `EMPTY_REFINEMENT` | Refinement instruction is empty or blank |
| `REFINEMENT_FAILED` | Image generation failed during refinement process |
| `INVALID_SESSION_ID` | sessionId format is invalid |
| `SESSION_EXPIRED` | Session has exceeded maximum retention time |
| `GENERATION_TIMEOUT` | Refinement exceeded timeout threshold |

## Related Tools
- `select-variant` - Select a variant before calling refine-asset
- `generate-variants` - Create initial variants
- `export-asset` - Export refined variants in multiple formats
