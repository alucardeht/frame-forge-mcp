# MCP Tool Contract: adjust_proportions

## Overview
Adjust proportions and spacing of wireframe components. Recalculates layout flow and dimensions while maintaining responsive ratios.

## Tool Identifier
`adjust_proportions`

## Description
Modifies component dimensions and spacing globally or for specific components. Recalculates layout flow to accommodate new proportions. Maintains aspect ratios and responsive behavior.

## Input Schema

```typescript
{
  sessionId: string,                    // Session identifier (required)
  adjustments: {
    height?: number,                    // New height in pixels or percentage increase
    width?: number,                     // New width in pixels or percentage increase
    spacing?: number,                   // Gap/padding adjustments (pixels)
    scale?: number,                     // Uniform scale multiplier (e.g., 1.2 = 120%)
    aspectRatio?: "16:9" | "4:3" | "1:1" | "custom" // Maintain aspect ratio
  },
  targetComponentId?: string,           // Apply to specific component (optional)
  targetComponentType?: string,         // Apply to all components of type (optional)
  recalculateLayout?: boolean           // Auto-recalculate layout flow (default: true)
}
```

## Output Schema

```typescript
{
  success: boolean,
  sessionId: string,
  adjustments: {
    input: {
      adjustments: object,
      targetComponentId?: string,
      targetComponentType?: string
    },
    applied: {
      componentId: string,
      type: string,
      previousDimensions: { width: number, height: number },
      newDimensions: { width: number, height: number },
      previousSpacing?: number,
      newSpacing?: number,
      scaleFactor: number
    }[],
    wireframe: {
      imageBase64: string,              // Re-rendered wireframe (PNG base64)
      componentTree: ComponentNode[]    // Updated tree with new dimensions
    },
    summary: {
      totalComponentsAffected: number,
      canvasResized: boolean,
      newCanvasDimensions: { width: number, height: number },
      layoutRecalculated: boolean
    }
  }
}
```

## Behavior

1. Validate sessionId and current wireframe
2. Parse adjustments (identify which dimensions to change)
3. Identify target components:
   - If `targetComponentId`: apply to single component
   - If `targetComponentType`: apply to all of that type
   - If neither: apply to all components (with scale/spacing only)
4. Calculate new dimensions:
   - If `height`/`width` provided: set absolute values
   - If `scale` provided: multiply current by scale factor
   - If `spacing` provided: adjust gaps between components
5. Recalculate layout flow if `recalculateLayout` is true:
   - Reposition child components
   - Adjust parent containers
   - Maintain responsive ratios
6. Re-render wireframe
7. Return summary of changes

## Examples

### Example 1: Increase Header Height
**Input:**
```json
{
  "sessionId": "sess_001",
  "adjustments": {
    "height": 120
  },
  "targetComponentType": "Header"
}
```

**Output:**
```json
{
  "success": true,
  "adjustments": {
    "applied": [
      {
        "componentId": "comp_header_001",
        "type": "Header",
        "previousDimensions": { "width": 1024, "height": 80 },
        "newDimensions": { "width": 1024, "height": 120 },
        "scaleFactor": 1.5
      }
    ],
    "summary": {
      "totalComponentsAffected": 1,
      "canvasResized": true,
      "newCanvasDimensions": { "width": 1024, "height": 808 },
      "layoutRecalculated": true
    }
  }
}
```

### Example 2: Scale All Cards by 1.2x
**Input:**
```json
{
  "sessionId": "sess_002",
  "adjustments": {
    "scale": 1.2,
    "spacing": 24
  },
  "targetComponentType": "Card"
}
```

**Output:**
```json
{
  "success": true,
  "adjustments": {
    "applied": [
      {
        "componentId": "comp_card_001",
        "type": "Card",
        "previousDimensions": { "width": 300, "height": 250 },
        "newDimensions": { "width": 360, "height": 300 },
        "previousSpacing": 16,
        "newSpacing": 24,
        "scaleFactor": 1.2
      },
      {
        "componentId": "comp_card_002",
        "type": "Card",
        "previousDimensions": { "width": 300, "height": 250 },
        "newDimensions": { "width": 360, "height": 300 },
        "previousSpacing": 16,
        "newSpacing": 24,
        "scaleFactor": 1.2
      },
      {
        "componentId": "comp_card_003",
        "type": "Card",
        "previousDimensions": { "width": 300, "height": 250 },
        "newDimensions": { "width": 360, "height": 300 },
        "previousSpacing": 16,
        "newSpacing": 24,
        "scaleFactor": 1.2
      }
    ],
    "wireframe": {
      "imageBase64": "iVBORw0KGgo..."
    },
    "summary": {
      "totalComponentsAffected": 3,
      "canvasResized": false,
      "layoutRecalculated": true
    }
  }
}
```

### Example 3: Adjust Grid Spacing
**Input:**
```json
{
  "sessionId": "sess_003",
  "adjustments": {
    "spacing": 32
  },
  "targetComponentId": "comp_grid_001",
  "recalculateLayout": true
}
```

**Output:**
```json
{
  "success": true,
  "adjustments": {
    "applied": [
      {
        "componentId": "comp_grid_001",
        "type": "Grid",
        "previousSpacing": 20,
        "newSpacing": 32,
        "scaleFactor": 1.0
      }
    ],
    "wireframe": {
      "imageBase64": "iVBORw0KGgo...",
      "componentTree": [
        {
          "id": "comp_grid_001",
          "type": "Grid",
          "properties": {
            "gap": 32
          },
          "children": [
            {
              "id": "comp_card_001",
              "position": { "x": 32, "y": 80 },
              "dimensions": { "width": 300, "height": 250 }
            },
            {
              "id": "comp_card_002",
              "position": { "x": 364, "y": 80 },
              "dimensions": { "width": 300, "height": 250 }
            },
            {
              "id": "comp_card_003",
              "position": { "x": 696, "y": 80 },
              "dimensions": { "width": 300, "height": 250 }
            }
          ]
        }
      ]
    },
    "summary": {
      "totalComponentsAffected": 1,
      "layoutRecalculated": true
    }
  }
}
```

### Example 4: Adjust Hero Section Height and Maintain Aspect Ratio
**Input:**
```json
{
  "sessionId": "sess_004",
  "adjustments": {
    "height": 500,
    "aspectRatio": "16:9"
  },
  "targetComponentId": "comp_hero_001"
}
```

**Output:**
```json
{
  "success": true,
  "adjustments": {
    "applied": [
      {
        "componentId": "comp_hero_001",
        "type": "Hero",
        "previousDimensions": { "width": 1024, "height": 400 },
        "newDimensions": { "width": 1024, "height": 576 },
        "scaleFactor": 1.44,
        "aspectRatioMaintained": "16:9"
      }
    ],
    "summary": {
      "totalComponentsAffected": 1,
      "canvasResized": true,
      "newCanvasDimensions": { "width": 1024, "height": 880 }
    }
  }
}
```

### Example 5: Uniform Canvas Scaling
**Input:**
```json
{
  "sessionId": "sess_005",
  "adjustments": {
    "scale": 0.8
  },
  "recalculateLayout": false
}
```

**Output:**
```json
{
  "success": true,
  "adjustments": {
    "applied": [
      {
        "componentId": "comp_header_001",
        "type": "Header",
        "previousDimensions": { "width": 1024, "height": 80 },
        "newDimensions": { "width": 819, "height": 64 },
        "scaleFactor": 0.8
      },
      {
        "componentId": "comp_hero_001",
        "type": "Hero",
        "previousDimensions": { "width": 1024, "height": 400 },
        "newDimensions": { "width": 819, "height": 320 },
        "scaleFactor": 0.8
      }
    ],
    "wireframe": {
      "imageBase64": "iVBORw0KGgo..."
    },
    "summary": {
      "totalComponentsAffected": 2,
      "canvasResized": true,
      "newCanvasDimensions": { "width": 819, "height": 614 },
      "layoutRecalculated": false
    }
  }
}
```

## Adjustment Strategies

| Adjustment | Behavior | Impact |
|-----------|----------|--------|
| `height` | Set absolute height | Single dimension changed, may break aspect ratios |
| `width` | Set absolute width | Single dimension changed, may break aspect ratios |
| `scale` | Multiply by factor | Proportional change to all dimensions |
| `spacing` | Set gap value | Affects grid/flex gaps, recalculates child positions |
| `aspectRatio` | Maintain ratio | Constrains proportions when resizing |

## Error Handling

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Invalid sessionId | 400 | "Session not found" |
| No wireframe in session | 400 | "No wireframe found in session" |
| Empty adjustments | 400 | "adjustments cannot be empty" |
| Invalid dimensions | 400 | "Dimensions must be positive integers" |
| Invalid scale | 400 | "Scale must be positive number" |
| Invalid spacing | 400 | "Spacing must be non-negative" |
| Component not found | 404 | "Target component not found" |
| Render failure | 500 | "Wireframe re-render failed" |

## Notes

- If both `targetComponentId` and `targetComponentType` provided: `targetComponentId` takes precedence
- Layout recalculation automatically adjusts:
  - Child component positions within parents
  - Grid gaps and flex spacing
  - Canvas total dimensions
  - Component stacking and flow
- Aspect ratio values: "16:9" (landscape), "4:3" (classic), "1:1" (square), "custom" (current ratio)
- Scale factor can be < 1.0 (shrink) or > 1.0 (enlarge)
- All dimension changes are stored in session for subsequent operations
- Re-renders entire wireframe with recalculated layout
