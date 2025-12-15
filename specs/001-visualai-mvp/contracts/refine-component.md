# MCP Tool Contract: refine_component

## Overview
Refine specific wireframe components using natural language instructions. Interprets intent and applies contextual updates to component properties.

## Tool Identifier
`refine_component`

## Description
Accepts natural language refinement instructions for wireframe components. Parses intent (e.g., "make header taller", "change button color to blue") and applies appropriate property updates. Can target by component ID, type, or infer from context.

## Input Schema

```typescript
{
  sessionId: string,                    // Session identifier (required)
  refinement: string,                   // Natural language instruction: "make header taller", "darken footer", "add rounded corners to buttons" (required)
  componentId?: string,                 // Specific component ID to refine (optional)
  componentType?: string                // Component type to refine (optional, if multiple: refine all of type)
}
```

## Output Schema

```typescript
{
  success: boolean,
  sessionId: string,
  refinement: {
    instruction: string,                // Original refinement instruction
    parsed: {
      action: string,                   // Inferred action: "resize", "recolor", "restyle", "reposition", "relabel"
      targets: {
        id?: string,
        type?: string[],
        inference?: string               // How target was inferred if not explicit
      },
      updates: { [key: string]: any }   // Calculated property updates
    },
    affected: {
      id: string,
      type: string,
      previousValue?: any,
      newValue: any
    }[],
    wireframe: {
      imageBase64: string,              // Re-rendered wireframe (PNG base64)
      componentTree: ComponentNode[]    // Updated tree
    }
  }
}
```

## Behavior

1. Parse `refinement` instruction to extract intent and parameters
2. Identify target component(s):
   - If `componentId` provided: target that specific component
   - If `componentType` provided: target all components of that type
   - If neither provided: infer from refinement context
3. Map refinement to property changes:
   - "taller" → increase height
   - "darker" → darken backgroundColor
   - "rounded" → increase borderRadius
   - "bold" → increase fontWeight
   - "larger" → increase fontSize or dimensions
   - "smaller" → decrease fontSize or dimensions
   - Color names → map to hex colors
4. Apply updates to component(s)
5. Re-render wireframe
6. Return affected components with changes

## Examples

### Example 1: Make Component Taller
**Input:**
```json
{
  "sessionId": "sess_001",
  "refinement": "make header taller",
  "componentType": "Header"
}
```

**Output:**
```json
{
  "success": true,
  "refinement": {
    "instruction": "make header taller",
    "parsed": {
      "action": "resize",
      "targets": {
        "type": ["Header"],
        "inference": "explicit componentType"
      },
      "updates": {
        "height": 120
      }
    },
    "affected": [
      {
        "id": "comp_header_001",
        "type": "Header",
        "previousValue": 80,
        "newValue": 120
      }
    ],
    "wireframe": {
      "imageBase64": "iVBORw0KGgo..."
    }
  }
}
```

### Example 2: Change Button Color by Natural Language
**Input:**
```json
{
  "sessionId": "sess_002",
  "refinement": "change button color to blue"
}
```

**Output:**
```json
{
  "success": true,
  "refinement": {
    "instruction": "change button color to blue",
    "parsed": {
      "action": "recolor",
      "targets": {
        "type": ["Button"],
        "inference": "inferred from 'button' mention and 'color' action"
      },
      "updates": {
        "backgroundColor": "#007bff"
      }
    },
    "affected": [
      {
        "id": "comp_button_001",
        "type": "Button",
        "previousValue": "#ff6b6b",
        "newValue": "#007bff"
      },
      {
        "id": "comp_button_002",
        "type": "Button",
        "previousValue": "#ff6b6b",
        "newValue": "#007bff"
      }
    ],
    "wireframe": {
      "imageBase64": "iVBORw0KGgo..."
    }
  }
}
```

### Example 3: Darken Hero Section
**Input:**
```json
{
  "sessionId": "sess_003",
  "refinement": "make the hero section background darker"
}
```

**Output:**
```json
{
  "success": true,
  "refinement": {
    "instruction": "make the hero section background darker",
    "parsed": {
      "action": "restyle",
      "targets": {
        "type": ["Hero"],
        "inference": "inferred from 'hero section' mention"
      },
      "updates": {
        "backgroundColor": "#222222"
      }
    },
    "affected": [
      {
        "id": "comp_hero_001",
        "type": "Hero",
        "previousValue": "#ffffff",
        "newValue": "#222222"
      }
    ],
    "wireframe": {
      "imageBase64": "iVBORw0KGgo..."
    }
  }
}
```

### Example 4: Add Rounded Corners to Cards
**Input:**
```json
{
  "sessionId": "sess_004",
  "refinement": "add rounded corners to all cards"
}
```

**Output:**
```json
{
  "success": true,
  "refinement": {
    "instruction": "add rounded corners to all cards",
    "parsed": {
      "action": "restyle",
      "targets": {
        "type": ["Card"],
        "inference": "inferred from 'cards' mention"
      },
      "updates": {
        "borderRadius": 16
      }
    },
    "affected": [
      {
        "id": "comp_card_001",
        "type": "Card",
        "previousValue": 0,
        "newValue": 16
      },
      {
        "id": "comp_card_002",
        "type": "Card",
        "previousValue": 0,
        "newValue": 16
      },
      {
        "id": "comp_card_003",
        "type": "Card",
        "previousValue": 0,
        "newValue": 16
      }
    ],
    "wireframe": {
      "imageBase64": "iVBORw0KGgo..."
    }
  }
}
```

### Example 5: Make Footer Darker with Explicit Component ID
**Input:**
```json
{
  "sessionId": "sess_005",
  "refinement": "darken the background",
  "componentId": "comp_footer_001"
}
```

**Output:**
```json
{
  "success": true,
  "refinement": {
    "instruction": "darken the background",
    "parsed": {
      "action": "restyle",
      "targets": {
        "id": "comp_footer_001",
        "inference": "explicit componentId"
      },
      "updates": {
        "backgroundColor": "#1a1a1a"
      }
    },
    "affected": [
      {
        "id": "comp_footer_001",
        "type": "Footer",
        "previousValue": "#333333",
        "newValue": "#1a1a1a"
      }
    ]
  }
}
```

## Supported Refinements

| Instruction Pattern | Action | Result |
|-------------------|--------|--------|
| "make X taller/larger/bigger" | resize | increase height/dimensions |
| "make X smaller/narrower/shorter" | resize | decrease height/dimensions |
| "darken X" | recolor | decrease lightness of color |
| "lighten X" | recolor | increase lightness of color |
| "change color to [color]" | recolor | set backgroundColor |
| "add/remove shadow" | restyle | toggle boxShadow |
| "add rounded corners" | restyle | increase borderRadius |
| "bold text" | restyle | increase fontWeight |
| "move X [direction]" | reposition | adjust position |
| "rename to [text]" | relabel | update label/content |

## Error Handling

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Invalid sessionId | 400 | "Session not found" |
| No wireframe in session | 400 | "No wireframe found in session" |
| Empty refinement | 400 | "refinement cannot be empty" |
| Unable to parse refinement | 422 | "Could not parse refinement instruction" |
| Component not found | 404 | "Target component not found" |
| Ambiguous target | 400 | "Refinement is ambiguous - please specify componentId or componentType" |
| Render failure | 500 | "Wireframe re-render failed" |

## Notes

- Natural language parsing uses keyword matching and pattern recognition
- If target is ambiguous without context, requests user clarification
- Color names (red, blue, green, etc.) are converted to hex values
- Relative changes are calculated based on current values
- Context inference works best when component type is mentioned in refinement text
- Changes are cumulative and stored in session state
- Re-renders entire wireframe with updated styles
