# undo

## Description
Reverts the last action in a session. Supports undoing generate-image calls, parameter changes, and other operations up to 50 steps deep. Works in conjunction with redo for full command history navigation.

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
      type: 'text',
      text: JSON
    }
  ]
}
```

**JSON structure:**
```typescript
{
  success: boolean,
  sessionId: string,
  undoneAction: {
    type: string,               // e.g., "generate", "parameter_change", "rollback"
    description: string,
    timestamp: string
  },
  previousState: {
    iterationIndex: number,
    iterationCount: number,
    lastPrompt?: string
  },
  undoStackRemaining: number,   // How many more undos available
  redoStackAvailable: number    // How many redos now available
}
```

## Examples

### Example 1: Undo last generation
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
      "text": "{\"success\":true,\"sessionId\":\"session-2025-12-11-001\",\"undoneAction\":{\"type\":\"generate\",\"description\":\"Generated image with prompt 'Cyberpunk city at night'\",\"timestamp\":\"2025-12-11T14:50:15.123Z\"},\"previousState\":{\"iterationIndex\":9,\"iterationCount\":10,\"lastPrompt\":\"Mountain landscape with aurora borealis\"},\"undoStackRemaining\":9,\"redoStackAvailable\":1}"
    }
  ]
}
```

### Example 2: Undo parameter change
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
      "text": "{\"success\":true,\"sessionId\":\"session-2025-12-11-002\",\"undoneAction\":{\"type\":\"parameter_change\",\"description\":\"Changed guidance_scale from 7.5 to 12.0\",\"timestamp\":\"2025-12-11T14:48:30.456Z\"},\"previousState\":{\"iterationIndex\":4,\"iterationCount\":5},\"undoStackRemaining\":3,\"redoStackAvailable\":1}"
    }
  ]
}
```

### Example 3: Undo when nothing to undo
**Input:**
```json
{
  "sessionId": "session-2025-12-11-003"
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":false,\"error\":\"Nothing to undo\",\"sessionId\":\"session-2025-12-11-003\",\"undoStackRemaining\":0,\"redoStackAvailable\":0}"
    }
  ]
}
```

### Example 4: Undo multiple times (third undo in session)
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
      "text": "{\"success\":true,\"sessionId\":\"session-2025-12-11-001\",\"undoneAction\":{\"type\":\"generate\",\"description\":\"Generated image with prompt 'Landscape variant 3'\",\"timestamp\":\"2025-12-11T14:45:22.789Z\"},\"previousState\":{\"iterationIndex\":7,\"iterationCount\":8,\"lastPrompt\":\"Landscape variant 2\"},\"undoStackRemaining\":6,\"redoStackAvailable\":3}"
    }
  ]
}
```

## Error Cases

- **Session not found**: Invalid sessionId
- **Nothing to undo**: Undo stack is empty (fresh session or all undos exhausted)
- **Session in inconsistent state**: Recovery attempted automatically

## Notes

- Maximum undo depth: 50 operations per session
- Undo stack includes: image generation, parameter changes, rollbacks, etc.
- Each undo operation pushes the previous state onto the redo stack
- Redo stack is cleared if a new action is performed (normal editor behavior)
- Very fast operation, typically <10ms
- Useful for iterative exploration without losing work
- Pair with redo for full command history navigation
