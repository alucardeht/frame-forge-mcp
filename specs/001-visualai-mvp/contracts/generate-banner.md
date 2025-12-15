# MCP Contract: generate-banner

## Overview
Generate a marketing banner with structured layout metadata and text zone identification.

## Tool Name
`generate-banner`

## Description
Creates a complete marketing banner image based on a natural language description. Unlike icon/illustration generation, banners are larger format assets with structured layout information. The output includes both the rendered image and machine-readable metadata about text zones, CTA button positions, and visual regions.

## Input Schema

```typescript
{
  description: string
  dimensions?: { width: number; height: number }
  sessionId?: string
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `description` | string | Yes | - | Natural language description of the banner layout (e.g., "Product launch banner with hero text left, product image right, CTA button bottom") |
| `dimensions` | object | No | {width: 1200, height: 400} | Banner dimensions in pixels |
| `dimensions.width` | number | No | 1200 | Width in pixels |
| `dimensions.height` | number | No | 400 | Height in pixels |
| `sessionId` | string | No | auto-generated | Session ID for banner tracking. If not provided, a new session is created |

## Output Schema

```typescript
{
  sessionId: string
  banner: {
    imageBase64: string
    mimeType: 'image/png'
    dimensions: { width: number; height: number }
    generatedAt: string (ISO 8601)
  }
  layout: {
    textZones: Array<{
      id: string
      content: string
      position: { x: number; y: number; width: number; height: number }
      fontSize: number
      alignment: 'left' | 'center' | 'right'
    }>
    imageRegions: Array<{
      id: string
      position: { x: number; y: number; width: number; height: number }
      description: string
    }>
    ctaButtons: Array<{
      id: string
      text: string
      position: { x: number; y: number; width: number; height: number }
      actionUrl?: string
    }>
    backgroundColor: string (hex color)
  }
  generationTime: number (milliseconds)
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Session identifier for banner tracking |
| `banner` | object | Banner image data |
| `banner.imageBase64` | string | Base64-encoded PNG image |
| `banner.mimeType` | string | Image format (always "image/png") |
| `banner.dimensions` | object | Actual banner dimensions |
| `banner.generatedAt` | string | ISO 8601 timestamp |
| `layout` | object | Structured layout metadata |
| `layout.textZones` | array | Array of text regions in the banner |
| `layout.textZones[].id` | string | Unique identifier for text zone |
| `layout.textZones[].content` | string | Extracted or inferred text content |
| `layout.textZones[].position` | object | Bounding box coordinates and dimensions |
| `layout.textZones[].fontSize` | number | Estimated font size in pixels |
| `layout.textZones[].alignment` | string | Text alignment (left, center, right) |
| `layout.imageRegions` | array | Array of image/graphic regions |
| `layout.imageRegions[].id` | string | Unique identifier for image region |
| `layout.imageRegions[].position` | object | Bounding box coordinates |
| `layout.imageRegions[].description` | string | Description of the visual element |
| `layout.ctaButtons` | array | Array of call-to-action buttons |
| `layout.ctaButtons[].id` | string | Unique identifier for CTA button |
| `layout.ctaButtons[].text` | string | Button label text |
| `layout.ctaButtons[].position` | object | Button bounding box |
| `layout.ctaButtons[].actionUrl` | string | Optional target URL |
| `layout.backgroundColor` | string | Background color in hex format |
| `generationTime` | number | Processing time in milliseconds |

## Examples

### Example 1: Product Launch Banner
**Request:**
```json
{
  "description": "Product launch banner with bold hero text on the left saying 'New Product 2025', product image on the right side, and a prominent blue 'Shop Now' CTA button centered at the bottom",
  "dimensions": { "width": 1200, "height": 400 }
}
```

**Response:**
```json
{
  "sessionId": "sess_banner_001",
  "banner": {
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAABLAAAAGQCAYAAAC...",
    "mimeType": "image/png",
    "dimensions": { "width": 1200, "height": 400 },
    "generatedAt": "2025-12-11T11:00:00Z"
  },
  "layout": {
    "textZones": [
      {
        "id": "hero-text",
        "content": "New Product 2025",
        "position": { "x": 50, "y": 120, "width": 450, "height": 160 },
        "fontSize": 56,
        "alignment": "left"
      },
      {
        "id": "subtext",
        "content": "Discover Innovation",
        "position": { "x": 50, "y": 280, "width": 450, "height": 80 },
        "fontSize": 32,
        "alignment": "left"
      }
    ],
    "imageRegions": [
      {
        "id": "product-image",
        "position": { "x": 700, "y": 50, "width": 450, "height": 300 },
        "description": "Product showcase image on the right side"
      }
    ],
    "ctaButtons": [
      {
        "id": "cta-shop",
        "text": "Shop Now",
        "position": { "x": 450, "y": 320, "width": 300, "height": 60 },
        "actionUrl": "https://example.com/shop"
      }
    ],
    "backgroundColor": "#f8f9fa"
  },
  "generationTime": 6500
}
```

### Example 2: Announcement Banner
**Request:**
```json
{
  "description": "Announcement banner with centered title 'Special Offer - 50% Off', colorful gradient background, and a red 'Claim Deal' button below the text",
  "dimensions": { "width": 1200, "height": 300 }
}
```

**Response:**
```json
{
  "sessionId": "sess_banner_002",
  "banner": {
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAABLAAAAEsCAYAAAC...",
    "mimeType": "image/png",
    "dimensions": { "width": 1200, "height": 300 },
    "generatedAt": "2025-12-11T11:05:00Z"
  },
  "layout": {
    "textZones": [
      {
        "id": "announcement-title",
        "content": "Special Offer - 50% Off",
        "position": { "x": 200, "y": 80, "width": 800, "height": 100 },
        "fontSize": 48,
        "alignment": "center"
      }
    ],
    "imageRegions": [],
    "ctaButtons": [
      {
        "id": "cta-claim",
        "text": "Claim Deal",
        "position": { "x": 450, "y": 210, "width": 300, "height": 60 },
        "actionUrl": "https://example.com/offer"
      }
    ],
    "backgroundColor": "#ff6b6b"
  },
  "generationTime": 5200
}
```

### Example 3: Newsletter Banner
**Request:**
```json
{
  "description": "Newsletter signup banner with newsletter icon on left, centered headline text 'Subscribe to Updates', brief description text, and email input field with 'Subscribe' button on the right",
  "dimensions": { "width": 1200, "height": 250 }
}
```

**Response:**
```json
{
  "sessionId": "sess_banner_003",
  "banner": {
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAABLAAAACsCAYAA...",
    "mimeType": "image/png",
    "dimensions": { "width": 1200, "height": 250 },
    "generatedAt": "2025-12-11T11:10:00Z"
  },
  "layout": {
    "textZones": [
      {
        "id": "newsletter-headline",
        "content": "Subscribe to Updates",
        "position": { "x": 300, "y": 40, "width": 600, "height": 60 },
        "fontSize": 36,
        "alignment": "center"
      },
      {
        "id": "newsletter-description",
        "content": "Stay informed with our latest news and announcements",
        "position": { "x": 300, "y": 110, "width": 600, "height": 40 },
        "fontSize": 16,
        "alignment": "center"
      }
    ],
    "imageRegions": [
      {
        "id": "newsletter-icon",
        "position": { "x": 50, "y": 50, "width": 150, "height": 150 },
        "description": "Newsletter/envelope icon"
      }
    ],
    "ctaButtons": [
      {
        "id": "cta-subscribe",
        "text": "Subscribe",
        "position": { "x": 900, "y": 100, "width": 200, "height": 50 }
      }
    ],
    "backgroundColor": "#ffffff"
  },
  "generationTime": 5800
}
```

## Behavior Notes

- **Layout Parsing:** The tool automatically parses the generated banner image to extract text zones, image regions, and CTA button positions. This enables programmatic interaction with banner elements.
- **Session Management:** If `sessionId` is provided, the banner is added to that session. Otherwise, a new session is created.
- **Standard Dimensions:** The default dimensions (1200x400) represent common web banner sizes. Custom dimensions are supported within 600-2000px width and 200-800px height.
- **Color Extraction:** The dominant background color is extracted and returned in hex format for styling consistency.
- **Timeout:** Expect 4-6 seconds for banner generation including layout analysis.
- **Text Zone Accuracy:** Bounding boxes are approximate pixel positions; precise positioning may vary by 5-10 pixels.

## Error Handling

| Error Code | Description |
|-----------|-------------|
| `INVALID_DIMENSIONS` | Dimensions exceed limits (min 600x200, max 2000x800) |
| `EMPTY_DESCRIPTION` | Banner description is empty or too short |
| `SESSION_NOT_FOUND` | Provided sessionId does not exist |
| `GENERATION_TIMEOUT` | Banner generation exceeded timeout threshold |
| `LAYOUT_PARSING_FAILED` | Could not parse banner layout metadata |
| `INVALID_SESSION_ID` | sessionId format is invalid |

## Related Tools
- `generate-variants` - Generate multiple style variants of icons/illustrations
- `export-asset` - Export banner in multiple formats (PNG, SVG, WebP)
