# MCP Tool Contract: export-image

## Overview

Exporta a imagem de uma iteração em formato e resolução específicos.

## Tool Name

`export-image`

## Description

Export iteration image in specific format and resolution

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session identifier |
| `iterationIndex` | number | Yes | 0-based index of iteration |
| `format` | 'png' \| 'jpg' \| 'webp' | No | Output format (default: 'png') |
| `resolution` | object | No | Target resolution {width: number, height: number} |

## Output Schema

```typescript
{
  status: 'success' | 'error',
  data?: {
    image: string, // base64 encoded in requested format
    format: 'png' | 'jpg' | 'webp',
    originalResolution: {
      width: number,
      height: number
    },
    exportedResolution: {
      width: number,
      height: number
    },
    fileSize: number, // bytes
    metadata: {
      quality?: number, // 1-100 for JPG
      hasAlpha: boolean
    }
  },
  error?: string
}
```

## Use Cases

- **Format conversion**: Export iteration 5 as JPG for web sharing
- **Resolution adjustment**: Downscale to 512x512 for thumbnail generation
- **Upscaling**: Upscale to 2048x2048 for print quality
- **Format optimization**: Convert to WebP for modern browsers with smaller file size
- **Batch export**: Export multiple iterations in specific format for processing pipeline

## Notes

- Supports PNG, JPG, and WebP formats
- Supports upscaling (basic interpolation) and downscaling
- Quality settings available for JPG format (default 85)
- Maintains aspect ratio by default if resolution provided
- Returns file size for preview purposes
- Non-destructive operation, does not modify session state

## Resolution Behavior

- If resolution not provided: returns original image resolution
- If only width provided: maintains aspect ratio, calculates height
- If only height provided: maintains aspect ratio, calculates width
- If both provided: scales to exact resolution (may distort aspect ratio)
- Upscaling uses bilinear interpolation
- Downscaling uses area-based interpolation for quality

## Format Details

- **PNG**: Lossless compression, supports transparency, larger file size
- **JPG**: Lossy compression, quality setting 1-100 (default 85), no transparency support
- **WebP**: Modern format, better compression than PNG/JPG, good browser support

## Error Handling

- Invalid sessionId → error status with message
- iterationIndex out of bounds → error status with message
- Invalid format → error status with message
- Invalid resolution (negative/zero values) → error status with message
- Image processing error → error status with message
