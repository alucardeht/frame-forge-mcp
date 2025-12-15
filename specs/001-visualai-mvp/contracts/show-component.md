# MCP Tool Contract: show_component

## Overview
Display detailed information about wireframe components. Read-only inspection of component properties, positions, dimensions, and relationships.

## Tool Identifier
`show_component`

## Description
Returns detailed metadata for wireframe components. Can query single component by ID, all components of a type, or entire component tree. Useful for inspection before performing updates or refinements.

## Input Schema

```typescript
{
  sessionId: string,                    // Session identifier (required)
  componentId?: string,                 // Specific component ID to inspect (optional)
  componentType?: string,               // Component type to filter by (optional)
  includeChildren?: boolean             // Include child components in response (default: true)
}
```

## Output Schema

```typescript
{
  success: boolean,
  sessionId: string,
  components: {
    id: string,
    type: string,
    position: { x: number, y: number },
    dimensions: { width: number, height: number },
    properties: { [key: string]: any },
    depth: number,                      // Nesting level in tree
    parentId?: string,
    children?: Array<{                  // Nested component info
      id: string,
      type: string,
      position: { x: number, y: number },
      dimensions: { width: number, height: number }
    }>,
    metadata: {
      label?: string,
      description?: string,
      created?: string,
      lastModified?: string
    }
  }[],
  summary: {
    totalComponents: number,
    componentTypes: string[],           // Unique types found
    maxDepth: number                    // Maximum nesting depth
  }
}
```

## Behavior

1. Validate sessionId and wireframe exists
2. Determine query scope:
   - If `componentId` provided: return single component with full tree
   - If `componentType` provided: return all matching components
   - If neither: return entire component tree
3. Build response with all component metadata
4. Include children if `includeChildren` is true
5. Calculate and return summary statistics
6. Do NOT modify any state

## Examples

### Example 1: Inspect Single Component by ID
**Input:**
```json
{
  "sessionId": "sess_001",
  "componentId": "comp_header_001"
}
```

**Output:**
```json
{
  "success": true,
  "components": [
    {
      "id": "comp_header_001",
      "type": "Header",
      "position": { "x": 0, "y": 0 },
      "dimensions": { "width": 1024, "height": 80 },
      "properties": {
        "backgroundColor": "#f5f5f5",
        "color": "#000000",
        "paddingLeft": 20,
        "paddingRight": 20,
        "displayFlex": true,
        "alignItems": "center"
      },
      "depth": 0,
      "metadata": {
        "label": "Header",
        "description": "Top navigation bar"
      }
    }
  ],
  "summary": {
    "totalComponents": 1,
    "componentTypes": ["Header"],
    "maxDepth": 0
  }
}
```

### Example 2: List All Buttons
**Input:**
```json
{
  "sessionId": "sess_002",
  "componentType": "Button"
}
```

**Output:**
```json
{
  "success": true,
  "components": [
    {
      "id": "comp_button_001",
      "type": "Button",
      "position": { "x": 412, "y": 300 },
      "dimensions": { "width": 200, "height": 50 },
      "properties": {
        "backgroundColor": "#007bff",
        "color": "#ffffff",
        "borderRadius": 4,
        "padding": 10,
        "fontSize": 16,
        "fontWeight": 600,
        "label": "Click Me"
      },
      "depth": 2,
      "parentId": "comp_hero_001",
      "metadata": {
        "label": "CTA Button",
        "description": "Primary call-to-action button"
      }
    },
    {
      "id": "comp_button_002",
      "type": "Button",
      "position": { "x": 650, "y": 300 },
      "dimensions": { "width": 150, "height": 50 },
      "properties": {
        "backgroundColor": "#6c757d",
        "color": "#ffffff",
        "borderRadius": 4,
        "padding": 10,
        "fontSize": 16,
        "fontWeight": 500,
        "label": "Learn More"
      },
      "depth": 2,
      "parentId": "comp_hero_001",
      "metadata": {
        "label": "Secondary Button"
      }
    }
  ],
  "summary": {
    "totalComponents": 2,
    "componentTypes": ["Button"],
    "maxDepth": 2
  }
}
```

### Example 3: Show Entire Wireframe Tree
**Input:**
```json
{
  "sessionId": "sess_003",
  "includeChildren": true
}
```

**Output:**
```json
{
  "success": true,
  "components": [
    {
      "id": "comp_header_001",
      "type": "Header",
      "position": { "x": 0, "y": 0 },
      "dimensions": { "width": 1024, "height": 80 },
      "depth": 0,
      "children": [
        {
          "id": "comp_logo_001",
          "type": "Logo",
          "position": { "x": 20, "y": 20 },
          "dimensions": { "width": 40, "height": 40 }
        }
      ]
    },
    {
      "id": "comp_hero_001",
      "type": "Hero",
      "position": { "x": 0, "y": 80 },
      "dimensions": { "width": 1024, "height": 400 },
      "depth": 0,
      "children": [
        {
          "id": "comp_button_001",
          "type": "Button",
          "position": { "x": 412, "y": 300 },
          "dimensions": { "width": 200, "height": 50 }
        }
      ]
    },
    {
      "id": "comp_grid_001",
      "type": "Grid",
      "position": { "x": 0, "y": 480 },
      "dimensions": { "width": 1024, "height": 200 },
      "depth": 0,
      "properties": {
        "columns": 3,
        "gap": 20
      },
      "children": [
        {
          "id": "comp_card_001",
          "type": "Card",
          "position": { "x": 20, "y": 480 },
          "dimensions": { "width": 300, "height": 200 }
        },
        {
          "id": "comp_card_002",
          "type": "Card",
          "position": { "x": 360, "y": 480 },
          "dimensions": { "width": 300, "height": 200 }
        },
        {
          "id": "comp_card_003",
          "type": "Card",
          "position": { "x": 700, "y": 480 },
          "dimensions": { "width": 300, "height": 200 }
        }
      ]
    },
    {
      "id": "comp_footer_001",
      "type": "Footer",
      "position": { "x": 0, "y": 680 },
      "dimensions": { "width": 1024, "height": 88 },
      "depth": 0
    }
  ],
  "summary": {
    "totalComponents": 8,
    "componentTypes": ["Header", "Hero", "Grid", "Card", "Button", "Logo", "Footer"],
    "maxDepth": 2
  }
}
```

### Example 4: Inspect Grid with Children
**Input:**
```json
{
  "sessionId": "sess_004",
  "componentId": "comp_grid_001",
  "includeChildren": true
}
```

**Output:**
```json
{
  "success": true,
  "components": [
    {
      "id": "comp_grid_001",
      "type": "Grid",
      "position": { "x": 0, "y": 480 },
      "dimensions": { "width": 1024, "height": 300 },
      "properties": {
        "columns": 3,
        "gap": 20,
        "display": "grid",
        "gridTemplateColumns": "repeat(3, 1fr)"
      },
      "depth": 0,
      "children": [
        {
          "id": "comp_card_001",
          "type": "Card",
          "position": { "x": 20, "y": 480 },
          "dimensions": { "width": 300, "height": 250 },
          "properties": {
            "backgroundColor": "#ffffff",
            "boxShadow": "0 2px 4px rgba(0,0,0,0.1)"
          }
        },
        {
          "id": "comp_card_002",
          "type": "Card",
          "position": { "x": 360, "y": 480 },
          "dimensions": { "width": 300, "height": 250 },
          "properties": {
            "backgroundColor": "#ffffff",
            "boxShadow": "0 2px 4px rgba(0,0,0,0.1)"
          }
        },
        {
          "id": "comp_card_003",
          "type": "Card",
          "position": { "x": 700, "y": 480 },
          "dimensions": { "width": 300, "height": 250 },
          "properties": {
            "backgroundColor": "#ffffff",
            "boxShadow": "0 2px 4px rgba(0,0,0,0.1)"
          }
        }
      ],
      "metadata": {
        "label": "Feature Cards"
      }
    }
  ],
  "summary": {
    "totalComponents": 4,
    "componentTypes": ["Grid", "Card"],
    "maxDepth": 1
  }
}
```

### Example 5: List All Cards (without children)
**Input:**
```json
{
  "sessionId": "sess_005",
  "componentType": "Card",
  "includeChildren": false
}
```

**Output:**
```json
{
  "success": true,
  "components": [
    {
      "id": "comp_card_001",
      "type": "Card",
      "position": { "x": 20, "y": 480 },
      "dimensions": { "width": 300, "height": 250 },
      "properties": {
        "backgroundColor": "#ffffff",
        "boxShadow": "0 2px 4px rgba(0,0,0,0.1)",
        "borderRadius": 8,
        "padding": 16
      },
      "depth": 1,
      "parentId": "comp_grid_001",
      "metadata": {
        "label": "Feature Card 1"
      }
    },
    {
      "id": "comp_card_002",
      "type": "Card",
      "position": { "x": 360, "y": 480 },
      "dimensions": { "width": 300, "height": 250 },
      "properties": {
        "backgroundColor": "#ffffff",
        "boxShadow": "0 2px 4px rgba(0,0,0,0.1)",
        "borderRadius": 8,
        "padding": 16
      },
      "depth": 1,
      "parentId": "comp_grid_001",
      "metadata": {
        "label": "Feature Card 2"
      }
    },
    {
      "id": "comp_card_003",
      "type": "Card",
      "position": { "x": 700, "y": 480 },
      "dimensions": { "width": 300, "height": 250 },
      "properties": {
        "backgroundColor": "#ffffff",
        "boxShadow": "0 2px 4px rgba(0,0,0,0.1)",
        "borderRadius": 8,
        "padding": 16
      },
      "depth": 1,
      "parentId": "comp_grid_001",
      "metadata": {
        "label": "Feature Card 3"
      }
    }
  ],
  "summary": {
    "totalComponents": 3,
    "componentTypes": ["Card"],
    "maxDepth": 1
  }
}
```

## Error Handling

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Invalid sessionId | 400 | "Session not found" |
| No wireframe in session | 400 | "No wireframe found in session" |
| Component not found | 404 | "Component with ID not found" |
| No components match type | 404 | "No components of type '{type}' found" |

## Notes

- Read-only operation - does not modify wireframe state
- Component tree shows hierarchical relationships (parent/children)
- Depth indicates nesting level (0 = top-level)
- Include all computed properties in properties object
- Useful for verifying targets before `update_component` or `refine_component`
- Default behavior (no filters) returns entire wireframe tree
- If `includeChildren` is false, only direct children are excluded, not siblings
- Summary provides quick overview of wireframe complexity
