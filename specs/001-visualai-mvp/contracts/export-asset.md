# MCP Contract: export-asset

## Overview
Export a variant in multiple formats (PNG, SVG, WebP) with optional file system persistence.

## Tool Name
`export-asset`

## Description
Converts and exports the selected variant in multiple image formats simultaneously. Supports PNG (default), SVG (via potrace vector tracing), and WebP (compressed). Can optionally save files to the file system or return base64 data for direct use.

## Input Schema

```typescript
{
  sessionId: string
  variantId: string
  formats?: ('png' | 'svg' | 'webp')[]
  outputPath?: string
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `sessionId` | string | Yes | - | Session identifier containing the variant |
| `variantId` | string | Yes | - | ID of the variant to export |
| `formats` | array | No | ['png'] | Array of export formats ('png', 'svg', 'webp') |
| `outputPath` | string | No | undefined | File system directory path for saving exports. If provided, files are written to disk. If not provided, only base64 data is returned |

## Output Schema

```typescript
{
  sessionId: string
  variantId: string
  exports: Array<{
    format: 'png' | 'svg' | 'webp'
    data: string (base64)
    mimeType: string
    filename: string
    fileSize: number (bytes)
    path?: string (if outputPath provided)
    generatedAt: string (ISO 8601)
  }>
  totalSize: number (bytes)
  exportTime: number (milliseconds)
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Session identifier |
| `variantId` | string | Exported variant ID |
| `exports` | array | Array of exported files |
| `exports[].format` | string | Export format (png, svg, webp) |
| `exports[].data` | string | Base64-encoded file data |
| `exports[].mimeType` | string | MIME type (image/png, image/svg+xml, image/webp) |
| `exports[].filename` | string | Generated filename (e.g., "variant-1.png") |
| `exports[].fileSize` | number | File size in bytes |
| `exports[].path` | string | Full file system path (only if outputPath provided) |
| `exports[].generatedAt` | string | ISO 8601 timestamp |
| `totalSize` | number | Combined size of all exports in bytes |
| `exportTime` | number | Processing time in milliseconds |

## Examples

### Example 1: Export Multiple Formats with File Save
**Request:**
```json
{
  "sessionId": "sess_abc123xyz",
  "variantId": "variant-3",
  "formats": ["png", "svg", "webp"],
  "outputPath": "/Users/john/projects/assets/exports"
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123xyz",
  "variantId": "variant-3",
  "exports": [
    {
      "format": "png",
      "data": "iVBORw0KGgoAAAANSUhEUgAA...",
      "mimeType": "image/png",
      "filename": "variant-3.png",
      "fileSize": 15240,
      "path": "/Users/john/projects/assets/exports/variant-3.png",
      "generatedAt": "2025-12-11T11:30:00Z"
    },
    {
      "format": "svg",
      "data": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZ...",
      "mimeType": "image/svg+xml",
      "filename": "variant-3.svg",
      "fileSize": 8420,
      "path": "/Users/john/projects/assets/exports/variant-3.svg",
      "generatedAt": "2025-12-11T11:30:00Z"
    },
    {
      "format": "webp",
      "data": "UklGRiYAAABXEBPC...",
      "mimeType": "image/webp",
      "filename": "variant-3.webp",
      "fileSize": 6180,
      "path": "/Users/john/projects/assets/exports/variant-3.webp",
      "generatedAt": "2025-12-11T11:30:00Z"
    }
  ],
  "totalSize": 29840,
  "exportTime": 2400
}
```

### Example 2: Export PNG Only (No File Save)
**Request:**
```json
{
  "sessionId": "sess_abc123xyz",
  "variantId": "variant-1",
  "formats": ["png"]
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123xyz",
  "variantId": "variant-1",
  "exports": [
    {
      "format": "png",
      "data": "iVBORw0KGgoAAAANSUhEUgAA...",
      "mimeType": "image/png",
      "filename": "variant-1.png",
      "fileSize": 12890,
      "generatedAt": "2025-12-11T11:35:00Z"
    }
  ],
  "totalSize": 12890,
  "exportTime": 800
}
```

### Example 3: Export All Formats for Web Optimization
**Request:**
```json
{
  "sessionId": "sess_banner_001",
  "variantId": "variant-8",
  "formats": ["webp", "png"],
  "outputPath": "/home/designer/web-assets"
}
```

**Response:**
```json
{
  "sessionId": "sess_banner_001",
  "variantId": "variant-8",
  "exports": [
    {
      "format": "webp",
      "data": "UklGRjYAAABXRUBQ...",
      "mimeType": "image/webp",
      "filename": "variant-8.webp",
      "fileSize": 5680,
      "path": "/home/designer/web-assets/variant-8.webp",
      "generatedAt": "2025-12-11T11:40:00Z"
    },
    {
      "format": "png",
      "data": "iVBORw0KGgoAAAANSUhEUgAA...",
      "mimeType": "image/png",
      "filename": "variant-8.png",
      "fileSize": 14200,
      "path": "/home/designer/web-assets/variant-8.png",
      "generatedAt": "2025-12-11T11:40:00Z"
    }
  ],
  "totalSize": 19880,
  "exportTime": 1600
}
```

### Example 4: SVG Export for Scalability
**Request:**
```json
{
  "sessionId": "sess_abc123xyz",
  "variantId": "variant-2",
  "formats": ["svg"],
  "outputPath": "/var/www/icons"
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123xyz",
  "variantId": "variant-2",
  "exports": [
    {
      "format": "svg",
      "data": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHzdmc...",
      "mimeType": "image/svg+xml",
      "filename": "variant-2.svg",
      "fileSize": 7540,
      "path": "/var/www/icons/variant-2.svg",
      "generatedAt": "2025-12-11T11:45:00Z"
    }
  ],
  "totalSize": 7540,
  "exportTime": 1200
}
```

## Format Details

### PNG Export
- **Format:** PNG (Portable Network Graphics)
- **Characteristics:** Lossless, supports transparency, widely supported
- **Use Case:** Web, print, general purpose archival
- **File Size:** Medium (typically 12-20KB for 256x256 icons)

### SVG Export
- **Format:** SVG (Scalable Vector Graphics)
- **Method:** Vector tracing via potrace algorithm
- **Characteristics:** Infinitely scalable, small file size, editable
- **Use Case:** Icons, logos, responsive web graphics
- **File Size:** Small (typically 5-10KB)
- **Limitations:** Works best with solid colors and simple shapes

### WebP Export
- **Format:** WebP (modern web image format)
- **Characteristics:** Lossy/lossless, superior compression, supported in modern browsers
- **Use Case:** Web optimization, reduced bandwidth
- **File Size:** Small (typically 50-60% of PNG size)
- **Browser Support:** Chrome, Firefox, Edge, Opera (IE not supported)

## Behavior Notes

- **File System Persistence:** If `outputPath` is provided, files are written to disk and full paths are returned. Otherwise, only base64 data is provided.
- **Automatic Filename Generation:** Filenames follow pattern `{variantId}.{format}` (e.g., variant-3.png).
- **Vector Conversion:** SVG export uses potrace tracing algorithm, which may simplify complex images.
- **Compression:** WebP uses automatic compression optimization for file size reduction.
- **Base64 Encoding:** All formats are returned as base64 for direct use in web applications (data URIs, etc.).
- **Parallel Processing:** Multiple formats are processed simultaneously for efficiency.
- **Timeout:** Expect 1-3 seconds depending on format complexity and number of formats.

## Error Handling

| Error Code | Description |
|-----------|-------------|
| `SESSION_NOT_FOUND` | Provided sessionId does not exist |
| `VARIANT_NOT_FOUND` | variantId does not exist in session |
| `INVALID_FORMAT` | Requested format not in ['png', 'svg', 'webp'] |
| `INVALID_OUTPUT_PATH` | Provided outputPath does not exist or not writable |
| `EXPORT_FAILED` | File export failed during generation |
| `CONVERSION_FAILED` | Format conversion (e.g., potrace) failed |
| `FILE_SYSTEM_ERROR` | Error writing files to disk |
| `INVALID_SESSION_ID` | sessionId format is invalid |
| `SESSION_EXPIRED` | Session has exceeded maximum retention time |

## Related Tools
- `generate-variants` - Create initial variants for export
- `select-variant` - Choose variant before export
- `refine-asset` - Refine variants before exporting final version
- `generate-banner` - Create banners for export
