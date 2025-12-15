# MCP Tool Contract: update_component

## Overview
Batch update properties of wireframe components by type. Applies changes to all components matching the specified type, or to a single component by ID.

## Tool Identifier
`update_component`

## Description
Modifies properties (color, size, spacing, etc.) of wireframe components. Can target all components of a type or a specific component. Re-renders wireframe with updated properties.

## Input Schema

```typescript
{
  sessionId: string,                    // Session identifier (required)
  targetComponentType?: string,         // Component type to update: "Header" | "Button" | "Grid" | "Card" | etc (optional)
  targetComponentId?: string,           // Specific component ID to update (optional)
  updates: {
    [propertyName: string]: any         // Properties to update: color, fontSize, padding, borderRadius, etc (required)
  }
}
```

## Output Schema

```typescript
{
  success: boolean,
  sessionId: string,
  updateResult: {
    affectedComponents: {
      id: string,
      type: string,
      previousProperties: { [key: string]: any },
      updatedProperties: { [key: string]: any }
    }[],
    wireframe: {
      imageBase64: string,              // Re-rendered wireframe (PNG base64)
      componentTree: ComponentNode[]    // Updated tree
    },
    summary: {
      totalAffected: number,
      changesApplied: string[]
    }
  }
}
```

## Behavior

1. Validate sessionId and current wireframe exists
2. Identify target components:
   - If `targetComponentId` provided: update only that component
   - If `targetComponentType` provided: update ALL components of that type
   - If both provided: `targetComponentId` takes precedence
3. Apply updates to each target component
4. Re-render wireframe with changes
5. Return list of affected components with before/after properties
6. Store updated state in session

## Examples

### Example 1: Update All Buttons
**Input:**
```json
{
  "sessionId": "sess_001",
  "targetComponentType": "Button",
  "updates": {
    "backgroundColor": "#ff6b6b",
    "borderRadius": 8,
    "padding": 12
  }
}
```

**Output:**
```json
{
  "success": true,
  "updateResult": {
    "affectedComponents": [
      {
        "id": "comp_button_001",
        "type": "Button",
        "previousProperties": {
          "backgroundColor": "#007bff",
          "borderRadius": 4,
          "padding": 10
        },
        "updatedProperties": {
          "backgroundColor": "#ff6b6b",
          "borderRadius": 8,
          "padding": 12
        }
      },
      {
        "id": "comp_button_002",
        "type": "Button",
        "previousProperties": {
          "backgroundColor": "#007bff",
          "borderRadius": 4,
          "padding": 10
        },
        "updatedProperties": {
          "backgroundColor": "#ff6b6b",
          "borderRadius": 8,
          "padding": 12
        }
      }
    ],
    "wireframe": {
      "imageBase64": "iVBORw0KGgo...",
      "componentTree": [
        {
          "id": "comp_button_001",
          "type": "Button",
          "properties": {
            "backgroundColor": "#ff6b6b",
            "borderRadius": 8,
            "padding": 12
          }
        },
        {
          "id": "comp_button_002",
          "type": "Button",
          "properties": {
            "backgroundColor": "#ff6b6b",
            "borderRadius": 8,
            "padding": 12
          }
        }
      ]
    },
    "summary": {
      "totalAffected": 2,
      "changesApplied": [
        "backgroundColor: #007bff -> #ff6b6b",
        "borderRadius: 4 -> 8",
        "padding: 10 -> 12"
      ]
    }
  }
}
```

### Example 2: Update Specific Component
**Input:**
```json
{
  "sessionId": "sess_002",
  "targetComponentId": "comp_header_001",
  "updates": {
    "backgroundColor": "#1a1a1a",
    "color": "#ffffff",
    "height": 120
  }
}
```

**Output:**
```json
{
  "success": true,
  "updateResult": {
    "affectedComponents": [
      {
        "id": "comp_header_001",
        "type": "Header",
        "previousProperties": {
          "backgroundColor": "#f5f5f5",
          "color": "#000000",
          "height": 80
        },
        "updatedProperties": {
          "backgroundColor": "#1a1a1a",
          "color": "#ffffff",
          "height": 120
        }
      }
    ],
    "summary": {
      "totalAffected": 1,
      "changesApplied": [
        "backgroundColor: #f5f5f5 -> #1a1a1a",
        "color: #000000 -> #ffffff",
        "height: 80 -> 120"
      ]
    }
  }
}
```

### Example 3: Update All Cards with Styling
**Input:**
```json
{
  "sessionId": "sess_003",
  "targetComponentType": "Card",
  "updates": {
    "backgroundColor": "#ffffff",
    "boxShadow": "0 2px 8px rgba(0,0,0,0.1)",
    "borderRadius": 12
  }
}
```

**Output:**
```json
{
  "success": true,
  "updateResult": {
    "affectedComponents": [
      {
        "id": "comp_card_001",
        "type": "Card",
        "updatedProperties": {
          "backgroundColor": "#ffffff",
          "boxShadow": "0 2px 8px rgba(0,0,0,0.1)",
          "borderRadius": 12
        }
      },
      {
        "id": "comp_card_002",
        "type": "Card",
        "updatedProperties": {
          "backgroundColor": "#ffffff",
          "boxShadow": "0 2px 8px rgba(0,0,0,0.1)",
          "borderRadius": 12
        }
      },
      {
        "id": "comp_card_003",
        "type": "Card",
        "updatedProperties": {
          "backgroundColor": "#ffffff",
          "boxShadow": "0 2px 8px rgba(0,0,0,0.1)",
          "borderRadius": 12
        }
      }
    ],
    "summary": {
      "totalAffected": 3,
      "changesApplied": [
        "backgroundColor: #f0f0f0 -> #ffffff",
        "boxShadow: none -> 0 2px 8px rgba(0,0,0,0.1)",
        "borderRadius: 4 -> 12"
      ]
    }
  }
}
```

## Error Handling

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Invalid sessionId | 400 | "Session not found" |
| No wireframe in session | 400 | "No wireframe found in session" |
| No target specified | 400 | "Must provide targetComponentType or targetComponentId" |
| Component not found | 404 | "Component with ID/type not found" |
| Invalid updates object | 400 | "updates must be a valid object" |
| Invalid property value | 422 | "Property '{prop}' has invalid type or format" |
| Render failure | 500 | "Wireframe re-render failed" |

## Notes

- If both `targetComponentId` and `targetComponentType` are provided, `targetComponentId` takes precedence
- Property updates are merged with existing properties (non-destructive)
- Re-renders entire wireframe with updated component styles
- Changes are stored in session state for subsequent operations
- Use `show_component` first to verify target components before bulk updates
- Supports CSS-like properties: color, backgroundColor, padding, margin, fontSize, borderRadius, boxShadow, etc.
