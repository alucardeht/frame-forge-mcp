# MCP Contract: select-variant

## Overview
Select a specific variant from a previous generation session for subsequent refinement operations.

## Tool Name
`select-variant`

## Description
Marks a variant as the active/current asset within a session. This variant becomes the target for refinement operations and export functions. Stores the selection in the session state for coordinated tool workflows.

## Input Schema

```typescript
{
  sessionId: string
  variantId: string
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session identifier containing the variants |
| `variantId` | string | Yes | ID of the variant to select (from previous generate-variants response) |

## Output Schema

```typescript
{
  success: boolean
  sessionId: string
  selectedVariantId: string
  variantDetails: {
    variantId: string
    description: string
    dimensions: { width: number; height: number }
    imageBase64: string
    mimeType: 'image/png'
    generatedAt: string (ISO 8601)
    variantIndex: number
  }
  message: string
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates successful selection |
| `sessionId` | string | Session identifier |
| `selectedVariantId` | string | The newly selected variant ID |
| `variantDetails` | object | Full details of selected variant |
| `variantDetails.variantId` | string | Unique identifier |
| `variantDetails.description` | string | Variant style description |
| `variantDetails.dimensions` | object | Canvas dimensions |
| `variantDetails.imageBase64` | string | Base64-encoded image |
| `variantDetails.mimeType` | string | Image format (always "image/png") |
| `variantDetails.generatedAt` | string | ISO 8601 timestamp |
| `variantDetails.variantIndex` | number | Position in variants array |
| `message` | string | Confirmation message (e.g., "Variant variant-2 selected successfully") |

## Examples

### Example 1: Select First Icon Variant
**Request:**
```json
{
  "sessionId": "sess_abc123xyz",
  "variantId": "variant-1"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "sess_abc123xyz",
  "selectedVariantId": "variant-1",
  "variantDetails": {
    "variantId": "variant-1",
    "description": "minimalist line art style",
    "dimensions": { "width": 256, "height": 256 },
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "mimeType": "image/png",
    "generatedAt": "2025-12-11T10:30:00Z",
    "variantIndex": 0
  },
  "message": "Variant variant-1 selected successfully"
}
```

### Example 2: Switch to Different Variant
**Request:**
```json
{
  "sessionId": "sess_abc123xyz",
  "variantId": "variant-3"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "sess_abc123xyz",
  "selectedVariantId": "variant-3",
  "variantDetails": {
    "variantId": "variant-3",
    "description": "gradient filled colorful style",
    "dimensions": { "width": 256, "height": 256 },
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "mimeType": "image/png",
    "generatedAt": "2025-12-11T10:30:00Z",
    "variantIndex": 2
  },
  "message": "Variant variant-3 selected successfully"
}
```

## Behavior Notes

- **Session State:** The selection is stored in `session.currentAsset` and persists for the duration of the session.
- **Required for Refinement:** The `refine-asset` tool requires a prior call to `select-variant` to determine which variant to refine.
- **Quick Execution:** This operation completes immediately (< 100ms) as it only updates session state.
- **Validation:** Confirms that the variantId exists within the session before marking as selected.

## Error Handling

| Error Code | Description |
|-----------|-------------|
| `SESSION_NOT_FOUND` | Provided sessionId does not exist or has expired |
| `VARIANT_NOT_FOUND` | variantId does not exist in session variants array |
| `INVALID_SESSION_ID` | sessionId format is invalid |
| `INVALID_VARIANT_ID` | variantId format is invalid |
| `SESSION_EXPIRED` | Session has exceeded maximum retention time |

## Related Tools
- `generate-variants` - Create initial variants in a session
- `refine-asset` - Refine the selected variant (requires prior selection)
- `export-asset` - Export the selected variant (requires prior selection)
