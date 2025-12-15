# redo

## Description
Restores the last undone action in a session. Only available after undo has been called. Works in conjunction with undo for full command history navigation within a session.

## Input Schema

```typescript
{
  sessionId: string              // Required: e.g., "session-2025-12-11-001"
}
```

**Required**: `sessionId`
**Optional**: (none)

## Output Schema

```typescript
{
  content: [
    {
      "type": "text",
      "text": JSON
    }
  ]
}
```

**JSON structure:**
```typescript
{
  success: boolean,
  sessionId: string,
  redoneAction: {
    type: string,               // e.g., "generate", "parameter_change", "rollback"
    description: string,
    timestamp: string           // Original timestamp of the action
  },
  currentState: {
    iterationIndex: number,
    iterationCount: number,
    lastPrompt?: string
  },
  undoStackAvailable: number,   // How many undos now available again
  redoStackRemaining: number    // How many more redos possible
}
```

## Examples

### Example 1: Redo after single undo
**Input:**
```json
{
  "sessionId": "session-2025-12-11-001"
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":true,\"sessionId\":\"session-2025-12-11-001\",\"redoneAction\":{\"type\":\"generate\",\"description\":\"Generated image with prompt 'Cyberpunk city at night'\",\"timestamp\":\"2025-12-11T14:50:15.123Z\"},\"currentState\":{\"iterationIndex\":10,\"iterationCount\":11,\"lastPrompt\":\"Cyberpunk city at night\"},\"undoStackAvailable\":10,\"redoStackRemaining\":0}"
    }
  ]
}
```

### Example 2: Redo after multiple undos
**Input:**
```json
{
  "sessionId": "session-2025-12-11-001"
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":true,\"sessionId\":\"session-2025-12-11-001\",\"redoneAction\":{\"type\":\"generate\",\"description\":\"Generated image with prompt 'Landscape variant 2'\",\"timestamp\":\"2025-12-11T14:45:22.789Z\"},\"currentState\":{\"iterationIndex\":9,\"iterationCount\":10,\"lastPrompt\":\"Landscape variant 2\"},\"undoStackAvailable\":9,\"redoStackRemaining\":2}"
    }
  ]
}
```

### Example 3: Redo with no redo stack available
**Input:**
```json
{
  "sessionId": "session-2025-12-11-002"
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":false,\"error\":\"Nothing to redo\",\"sessionId\":\"session-2025-12-11-002\",\"undoStackAvailable\":5,\"redoStackRemaining\":0}"
    }
  ]
}
```

### Example 4: Redo clears after new generation (redo stack lost)
**Input (step 1: undo):**
```json
{
  "sessionId": "session-2025-12-11-001"
}
```

**Output (after undo):**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"redoStackRemaining\":1}"
    }
  ]
}
```

**Input (step 2: generate new image - redo stack cleared):**
```json
{
  "prompt": "A new direction entirely",
  "sessionId": "session-2025-12-11-001"
}
```

**Input (step 3: try to redo - fails):**
```json
{
  "sessionId": "session-2025-12-11-001"
}
```

**Output (redo stack is gone):**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":false,\"error\":\"Nothing to redo\",\"sessionId\":\"session-2025-12-11-001\",\"redoStackRemaining\":0}"
    }
  ]
}
```

## Error Cases

- **Session not found**: Invalid sessionId
- **Nothing to redo**: Redo stack is empty (no prior undo, or new action performed after undo)
- **Redo stack cleared**: New action performed after undo clears the redo buffer

## Notes

- Redo stack is **cleared immediately** when any new operation occurs
- This follows standard editor behavior (VS Code, Figma, etc.)
- Maximum redo depth matches undo depth (50 operations)
- Very fast operation, typically <10ms
- Redo stack is session-specific and ephemeral (not persisted)
- Useful for quick A/B testing: Undo variant A, Redo variant A, then try variant B
- Pair with undo for full workflow control in iterative image generation
