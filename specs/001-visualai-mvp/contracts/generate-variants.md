# MCP Contract: generate-variants

## Overview
Generate 3-4 style variants of an asset (icon, illustration, pattern) based on a textual description.

## Tool Name
`generate-variants`

## Description
Creates multiple visual style variants of a single asset type. Useful for exploring different artistic directions for the same conceptual element. Each variant receives a unique ID and can be independently selected for further refinement.

## Input Schema

```typescript
{
  assetDescription: string
  assetType: 'icon' | 'illustration' | 'pattern'
  dimensions?: { width: number; height: number }
  variantCount?: number
  sessionId?: string
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `assetDescription` | string | Yes | - | Textual description of the asset (e.g., "minimalist rocket icon", "forest landscape pattern") |
| `assetType` | 'icon' \| 'illustration' \| 'pattern' | Yes | - | Category of asset to generate |
| `dimensions` | object | No | {width: 256, height: 256} | Canvas dimensions in pixels |
| `dimensions.width` | number | No | 256 | Width in pixels |
| `dimensions.height` | number | No | 256 | Height in pixels |
| `variantCount` | number | No | 3 | Number of variants to generate (1-4) |
| `sessionId` | string | No | auto-generated | Session ID for variant tracking. If not provided, a new session is created |

## Output Schema

```typescript
{
  sessionId: string
  variants: Array<{
    variantId: string
    description: string
    imageBase64: string
    mimeType: 'image/png'
    dimensions: { width: number; height: number }
    generatedAt: string (ISO 8601)
  }>
  generationTime: number (milliseconds)
  totalVariants: number
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Session identifier for variant management |
| `variants` | array | Array of generated variant objects |
| `variants[].variantId` | string | Unique identifier for each variant |
| `variants[].description` | string | Descriptive text of the variant (e.g., "minimalist style") |
| `variants[].imageBase64` | string | Base64-encoded PNG image data |
| `variants[].mimeType` | string | Image format (always "image/png") |
| `variants[].dimensions` | object | Actual dimensions of generated image |
| `variants[].generatedAt` | string | ISO 8601 timestamp of generation |
| `generationTime` | number | Total processing time in milliseconds |
| `totalVariants` | number | Count of variants generated |

## Examples

### Example 1: Icon Generation
**Request:**
```json
{
  "assetDescription": "rocket ship icon",
  "assetType": "icon",
  "dimensions": { "width": 256, "height": 256 },
  "variantCount": 3
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123xyz",
  "variants": [
    {
      "variantId": "variant-1",
      "description": "minimalist line art style",
      "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
      "mimeType": "image/png",
      "dimensions": { "width": 256, "height": 256 },
      "generatedAt": "2025-12-11T10:30:00Z"
    },
    {
      "variantId": "variant-2",
      "description": "detailed realistic style",
      "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
      "mimeType": "image/png",
      "dimensions": { "width": 256, "height": 256 },
      "generatedAt": "2025-12-11T10:30:00Z"
    },
    {
      "variantId": "variant-3",
      "description": "gradient filled colorful style",
      "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
      "mimeType": "image/png",
      "dimensions": { "width": 256, "height": 256 },
      "generatedAt": "2025-12-11T10:30:00Z"
    }
  ],
  "generationTime": 8500,
  "totalVariants": 3
}
```

### Example 2: Pattern Generation
**Request:**
```json
{
  "assetDescription": "forest canopy with leaves and branches",
  "assetType": "pattern",
  "variantCount": 2,
  "sessionId": "sess_abc123xyz"
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123xyz",
  "variants": [
    {
      "variantId": "variant-4",
      "description": "organic flowing leaves style",
      "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
      "mimeType": "image/png",
      "dimensions": { "width": 256, "height": 256 },
      "generatedAt": "2025-12-11T10:35:00Z"
    },
    {
      "variantId": "variant-5",
      "description": "geometric abstract canopy style",
      "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
      "mimeType": "image/png",
      "dimensions": { "width": 256, "height": 256 },
      "generatedAt": "2025-12-11T10:35:00Z"
    }
  ],
  "generationTime": 7200,
  "totalVariants": 2
}
```

## Behavior Notes

- **Session Management:** If `sessionId` is provided, new variants are added to the existing session. If not provided, a new session is automatically created and returned.
- **Variant Diversity:** Each variant should represent a distinctly different artistic style or visual interpretation of the same concept.
- **Timeout:** Expect 2-4 seconds per variant. Total timeout approximately 120 seconds for full generation batch.
- **Base64 Encoding:** All images are returned as base64-encoded PNG data for immediate use in web applications.
- **Variant Storage:** All generated variants remain accessible within the session for refinement or export operations.

## Error Handling

| Error Code | Description |
|-----------|-------------|
| `INVALID_ASSET_TYPE` | Provided assetType not in allowed values |
| `INVALID_VARIANT_COUNT` | variantCount outside range 1-4 |
| `INVALID_DIMENSIONS` | Dimensions exceed limits or are negative |
| `SESSION_NOT_FOUND` | Provided sessionId does not exist |
| `GENERATION_TIMEOUT` | Image generation exceeded timeout threshold |
| `INVALID_DESCRIPTION` | Description is empty or too short |

## Related Tools
- `select-variant` - Choose a variant for subsequent refinement
- `refine-asset` - Modify selected variant with additional instructions
- `export-asset` - Export variant in multiple formats
