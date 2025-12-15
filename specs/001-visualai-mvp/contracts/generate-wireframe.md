# MCP Tool Contract: generate_wireframe

## Overview
Generate wireframe structure from natural language layout description. Parses user intent into component hierarchy and renders visual wireframe.

## Tool Identifier
`generate_wireframe`

## Description
Creates a wireframe from layout description by parsing components (Header, Hero, Grid, Footer, Button, Card, etc.) and positioning them. Returns rendered wireframe image plus structured component tree with metadata.

## Input Schema

```typescript
{
  sessionId: string,                    // Session identifier (required)
  layoutDescription: string,            // Layout intent: "header with logo, 3-column grid, footer" (required)
  dimensions?: {
    width: number,                      // Canvas width in pixels (default: 1024)
    height: number                      // Canvas height in pixels (default: 768)
  }
}
```

## Output Schema

```typescript
{
  success: boolean,
  sessionId: string,
  wireframe: {
    imageBase64: string,                // Rendered wireframe (PNG base64)
    componentTree: {
      id: string,
      type: string,                     // "Header" | "Hero" | "Grid" | "Footer" | "Button" | "Card" | "Section" | etc
      position: { x: number, y: number },
      dimensions: { width: number, height: number },
      properties: {
        [key: string]: any              // Component-specific props: label, color, etc
      },
      children?: ComponentNode[]
    }[],
    metadata: {
      parsedComponents: string[],       // Component types identified
      layout: string,                   // "vertical" | "horizontal" | "grid"
      totalHeight: number,
      totalWidth: number
    }
  }
}
```

## Behavior

1. Parse `layoutDescription` to identify components and layout structure
2. Generate component hierarchy with default properties
3. Render wireframe visualization with component outlines
4. Assign unique IDs to each component
5. Store in session state (`session.currentWireframe`)
6. Return base64 image + structured tree

## Examples

### Example 1: Simple Layout
**Input:**
```json
{
  "sessionId": "sess_001",
  "layoutDescription": "header with logo, hero section with CTA button, footer"
}
```

**Output:**
```json
{
  "success": true,
  "wireframe": {
    "imageBase64": "iVBORw0KGgo...",
    "componentTree": [
      {
        "id": "comp_header_001",
        "type": "Header",
        "position": { "x": 0, "y": 0 },
        "dimensions": { "width": 1024, "height": 80 },
        "properties": {
          "backgroundColor": "#f5f5f5",
          "label": "Header"
        }
      },
      {
        "id": "comp_hero_001",
        "type": "Hero",
        "position": { "x": 0, "y": 80 },
        "dimensions": { "width": 1024, "height": 400 },
        "properties": {
          "backgroundColor": "#ffffff",
          "label": "Hero Section"
        },
        "children": [
          {
            "id": "comp_button_001",
            "type": "Button",
            "position": { "x": 412, "y": 300 },
            "dimensions": { "width": 200, "height": 50 },
            "properties": {
              "label": "CTA Button",
              "backgroundColor": "#007bff"
            }
          }
        ]
      },
      {
        "id": "comp_footer_001",
        "type": "Footer",
        "position": { "x": 0, "y": 480 },
        "dimensions": { "width": 1024, "height": 80 },
        "properties": {
          "backgroundColor": "#333333",
          "label": "Footer"
        }
      }
    ],
    "metadata": {
      "parsedComponents": ["Header", "Hero", "Button", "Footer"],
      "layout": "vertical",
      "totalHeight": 560,
      "totalWidth": 1024
    }
  }
}
```

### Example 2: Grid Layout
**Input:**
```json
{
  "sessionId": "sess_002",
  "layoutDescription": "header, 3-column card grid with images, footer",
  "dimensions": { "width": 1200, "height": 900 }
}
```

**Output:**
```json
{
  "success": true,
  "wireframe": {
    "componentTree": [
      {
        "id": "comp_header_002",
        "type": "Header",
        "position": { "x": 0, "y": 0 },
        "dimensions": { "width": 1200, "height": 80 }
      },
      {
        "id": "comp_grid_001",
        "type": "Grid",
        "position": { "x": 0, "y": 80 },
        "dimensions": { "width": 1200, "height": 600 },
        "properties": {
          "columns": 3,
          "gap": 20
        },
        "children": [
          {
            "id": "comp_card_001",
            "type": "Card",
            "position": { "x": 20, "y": 80 },
            "dimensions": { "width": 360, "height": 300 }
          },
          {
            "id": "comp_card_002",
            "type": "Card",
            "position": { "x": 420, "y": 80 },
            "dimensions": { "width": 360, "height": 300 }
          },
          {
            "id": "comp_card_003",
            "type": "Card",
            "position": { "x": 820, "y": 80 },
            "dimensions": { "width": 360, "height": 300 }
          }
        ]
      },
      {
        "id": "comp_footer_002",
        "type": "Footer",
        "position": { "x": 0, "y": 680 },
        "dimensions": { "width": 1200, "height": 80 }
      }
    ]
  }
}
```

## Error Handling

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Invalid sessionId | 400 | "Session not found" |
| Empty layoutDescription | 400 | "layoutDescription cannot be empty" |
| Invalid dimensions | 400 | "Dimensions must be positive integers" |
| Parsing failure | 422 | "Could not parse layout structure" |
| Render failure | 500 | "Wireframe rendering failed" |

## Notes

- Components are positioned with automatic flow (vertical stack by default)
- Grid layout is inferred if description mentions "grid", "columns", "cards in row"
- Default dimensions: 1024x768
- Component tree is stored in `session.currentWireframe` for subsequent operations
- All component IDs are unique within session
- SVG rendering preferred for crisp wireframe quality
