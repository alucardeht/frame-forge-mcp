# MCP Tool Contract: undo_wireframe

## Overview
Undo last wireframe modification. Reverts wireframe to previous state while maintaining separate undo stack from image iteration history.

## Tool Identifier
`undo_wireframe`

## Description
Reverts wireframe to the state before the last modification. Maintains a wireframe-specific undo stack independent of image iteration undo history. Supports undoing specific actions or reverting multiple steps.

## Input Schema

```typescript
{
  sessionId: string,                    // Session identifier (required)
  action?: string,                      // Specific action to undo: "generate_wireframe" | "update_component" | "refine_component" | "adjust_proportions" (optional)
  steps?: number                        // Number of undo steps (default: 1)
}
```

## Output Schema

```typescript
{
  success: boolean,
  sessionId: string,
  undo: {
    previousAction: string,             // Action that was undone
    previousActionDetails?: object,     // Parameters of undone action
    restoredState: {
      wireframe: {
        imageBase64: string,            // Restored wireframe image
        componentTree: ComponentNode[]  // Restored component tree
      },
      timestamp: string,                // When state was created
      version: number                   // Undo stack version
    },
    undoStack: {
      totalSteps: number,               // Total steps available in undo stack
      currentStep: number,              // Current position in stack
      actions: Array<{
        action: string,
        timestamp: string,
        description: string
      }>
    }
  }
}
```

## Behavior

1. Validate sessionId and wireframe exists
2. Retrieve wireframe undo stack
3. If `action` specified: find most recent instance of that action in stack
4. If `action` not specified: undo last modification
5. Pop specified number of steps from stack (default: 1)
6. Restore wireframe state from stack
7. Return restored state with undo stack metadata
8. Do NOT affect image iteration undo history

## Examples

### Example 1: Simple Undo (Last Action)
**Input:**
```json
{
  "sessionId": "sess_001"
}
```

**Output:**
```json
{
  "success": true,
  "undo": {
    "previousAction": "update_component",
    "previousActionDetails": {
      "targetComponentType": "Button",
      "updates": {
        "backgroundColor": "#ff6b6b",
        "borderRadius": 8
      }
    },
    "restoredState": {
      "wireframe": {
        "imageBase64": "iVBORw0KGgo...",
        "componentTree": [
          {
            "id": "comp_button_001",
            "type": "Button",
            "properties": {
              "backgroundColor": "#007bff",
              "borderRadius": 4
            }
          }
        ]
      },
      "timestamp": "2025-12-11T10:15:30Z",
      "version": 5
    },
    "undoStack": {
      "totalSteps": 6,
      "currentStep": 5,
      "actions": [
        {
          "action": "generate_wireframe",
          "timestamp": "2025-12-11T10:00:00Z",
          "description": "Generated wireframe from layout: header, 3-column grid, footer"
        },
        {
          "action": "update_component",
          "timestamp": "2025-12-11T10:05:00Z",
          "description": "Updated Header backgroundColor"
        },
        {
          "action": "refine_component",
          "timestamp": "2025-12-11T10:10:00Z",
          "description": "Refined button - make taller"
        },
        {
          "action": "update_component",
          "timestamp": "2025-12-11T10:12:00Z",
          "description": "Updated Cards color scheme"
        },
        {
          "action": "update_component",
          "timestamp": "2025-12-11T10:15:30Z",
          "description": "Updated Button styles"
        },
        {
          "action": "UNDONE",
          "timestamp": "2025-12-11T10:20:00Z",
          "description": "Last action reverted"
        }
      ]
    }
  }
}
```

### Example 2: Undo Specific Action Type
**Input:**
```json
{
  "sessionId": "sess_002",
  "action": "refine_component"
}
```

**Output:**
```json
{
  "success": true,
  "undo": {
    "previousAction": "refine_component",
    "previousActionDetails": {
      "refinement": "make the hero section background darker"
    },
    "restoredState": {
      "wireframe": {
        "imageBase64": "iVBORw0KGgo...",
        "componentTree": [
          {
            "id": "comp_hero_001",
            "type": "Hero",
            "properties": {
              "backgroundColor": "#ffffff"
            }
          }
        ]
      },
      "timestamp": "2025-12-11T10:10:00Z",
      "version": 3
    },
    "undoStack": {
      "totalSteps": 5,
      "currentStep": 3,
      "actions": [
        {
          "action": "generate_wireframe",
          "timestamp": "2025-12-11T10:00:00Z"
        },
        {
          "action": "update_component",
          "timestamp": "2025-12-11T10:05:00Z"
        },
        {
          "action": "refine_component",
          "timestamp": "2025-12-11T10:10:00Z",
          "description": "UNDONE - darken hero section"
        },
        {
          "action": "update_component",
          "timestamp": "2025-12-11T10:12:00Z"
        },
        {
          "action": "adjust_proportions",
          "timestamp": "2025-12-11T10:15:00Z"
        }
      ]
    }
  }
}
```

### Example 3: Undo Multiple Steps
**Input:**
```json
{
  "sessionId": "sess_003",
  "steps": 3
}
```

**Output:**
```json
{
  "success": true,
  "undo": {
    "previousAction": "adjust_proportions (3 steps back)",
    "previousActionDetails": {
      "adjustments": {
        "height": 100
      }
    },
    "restoredState": {
      "wireframe": {
        "imageBase64": "iVBORw0KGgo...",
        "componentTree": []
      },
      "timestamp": "2025-12-11T10:05:00Z",
      "version": 2
    },
    "undoStack": {
      "totalSteps": 5,
      "currentStep": 2,
      "actions": [
        {
          "action": "generate_wireframe",
          "timestamp": "2025-12-11T10:00:00Z"
        },
        {
          "action": "update_component",
          "timestamp": "2025-12-11T10:05:00Z"
        },
        {
          "action": "refine_component (UNDONE)",
          "timestamp": "2025-12-11T10:10:00Z"
        },
        {
          "action": "update_component (UNDONE)",
          "timestamp": "2025-12-11T10:12:00Z"
        },
        {
          "action": "adjust_proportions (UNDONE)",
          "timestamp": "2025-12-11T10:15:00Z"
        }
      ]
    }
  }
}
```

### Example 4: Undo to Initial Generated State
**Input:**
```json
{
  "sessionId": "sess_004",
  "action": "generate_wireframe",
  "steps": 1
}
```

**Output:**
```json
{
  "success": true,
  "undo": {
    "previousAction": "generate_wireframe (most recent)",
    "previousActionDetails": {
      "layoutDescription": "header, 3-column grid, footer"
    },
    "restoredState": {
      "wireframe": {
        "imageBase64": "iVBORw0KGgo...",
        "componentTree": [
          {
            "id": "comp_header_001",
            "type": "Header",
            "position": { "x": 0, "y": 0 },
            "dimensions": { "width": 1024, "height": 80 }
          }
        ]
      },
      "timestamp": "2025-12-11T10:00:00Z",
      "version": 1
    },
    "undoStack": {
      "totalSteps": 5,
      "currentStep": 1,
      "actions": [
        {
          "action": "generate_wireframe",
          "timestamp": "2025-12-11T10:00:00Z",
          "description": "Initial wireframe generation"
        },
        {
          "action": "update_component (UNDONE)",
          "timestamp": "2025-12-11T10:05:00Z"
        },
        {
          "action": "refine_component (UNDONE)",
          "timestamp": "2025-12-11T10:10:00Z"
        },
        {
          "action": "adjust_proportions (UNDONE)",
          "timestamp": "2025-12-11T10:15:00Z"
        },
        {
          "action": "update_component (UNDONE)",
          "timestamp": "2025-12-11T10:20:00Z"
        }
      ]
    }
  }
}
```

### Example 5: View Undo Stack Without Undoing
**Input:**
```json
{
  "sessionId": "sess_005",
  "steps": 0
}
```

**Output:**
```json
{
  "success": true,
  "undo": {
    "previousAction": "NONE (preview mode)",
    "restoredState": {
      "wireframe": {
        "imageBase64": "iVBORw0KGgo..."
      },
      "version": 6
    },
    "undoStack": {
      "totalSteps": 6,
      "currentStep": 6,
      "actions": [
        {
          "action": "generate_wireframe",
          "timestamp": "2025-12-11T10:00:00Z"
        },
        {
          "action": "update_component",
          "timestamp": "2025-12-11T10:05:00Z"
        },
        {
          "action": "refine_component",
          "timestamp": "2025-12-11T10:10:00Z"
        },
        {
          "action": "adjust_proportions",
          "timestamp": "2025-12-11T10:12:00Z"
        },
        {
          "action": "update_component",
          "timestamp": "2025-12-11T10:15:00Z"
        },
        {
          "action": "adjust_proportions",
          "timestamp": "2025-12-11T10:18:00Z"
        }
      ]
    }
  }
}
```

## Undo Stack Structure

| Field | Type | Description |
|-------|------|-------------|
| `totalSteps` | number | Total steps available in undo history |
| `currentStep` | number | Current position in stack (higher = newer) |
| `actions` | array | History of all actions with timestamps |

## Error Handling

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Invalid sessionId | 400 | "Session not found" |
| No wireframe in session | 400 | "No wireframe found in session" |
| Empty undo stack | 400 | "Nothing to undo - at initial state" |
| Invalid steps | 400 | "steps must be positive integer" |
| Action not found | 404 | "No '{action}' found in undo history" |
| Steps exceed stack depth | 400 | "Cannot undo {steps} steps - only {available} available" |

## Notes

- Wireframe undo stack is separate from image iteration undo history
- Each modification action is tracked with timestamp and parameters
- Undo preserves component tree, properties, and visual state
- Multiple undo steps can be reverted in single operation
- Undo stack persists for entire session lifetime
- If `action` is specified, finds most recent instance of that action
- Setting `steps: 0` shows undo history without modifying state
- Undone actions are marked as "UNDONE" in history display but remain in stack for forward navigation (future redo feature)
- Cannot undo beyond initial `generate_wireframe` action
