# rollback-iteration

## Description
Reverts a session to a specific iteration index, effectively discarding all subsequent iterations. Useful for exploring alternative paths in the generation workflow by returning to a previous state and regenerating from there.

## Input Schema

```typescript
{
  sessionId: string,             // Required: e.g., "session-2025-12-11-001"
  iterationIndex: number         // Required: 0-based index to revert to
}
```

**Required**: `sessionId`, `iterationIndex`
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
  rolledBackTo: number,          // The iteration index we reverted to
  previousIterationCount: number, // How many iterations were deleted
  currentIteration: {
    index: number,
    prompt: string,
    timestamp: string,
    metadata: {
      width: number,
      height: number,
      steps: number,
      guidance_scale: number,
      seed: number
    }
  }
}
```

## Examples

### Example 1: Rollback to iteration 5 (delete 6, 7, 8, 9, 10, 11)
**Input:**
```json
{
  "sessionId": "session-2025-12-11-001",
  "iterationIndex": 5
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":true,\"sessionId\":\"session-2025-12-11-001\",\"rolledBackTo\":5,\"previousIterationCount\":12,\"currentIteration\":{\"index\":5,\"prompt\":\"Mountain landscape with aurora borealis\",\"timestamp\":\"2025-12-11T10:19:15.789Z\",\"metadata\":{\"width\":512,\"height\":512,\"steps\":20,\"guidance_scale\":7.5,\"seed\":5555555555}}}"
    }
  ]
}
```

### Example 2: Rollback to first iteration (index 0)
**Input:**
```json
{
  "sessionId": "session-2025-12-11-002",
  "iterationIndex": 0
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":true,\"sessionId\":\"session-2025-12-11-002\",\"rolledBackTo\":0,\"previousIterationCount\":8,\"currentIteration\":{\"index\":0,\"prompt\":\"A serene mountain landscape at sunset\",\"timestamp\":\"2025-12-11T12:30:00.100Z\",\"metadata\":{\"width\":512,\"height\":512,\"steps\":20,\"guidance_scale\":7.5,\"seed\":1111111111}}}"
    }
  ]
}
```

### Example 3: Rollback with invalid index
**Input:**
```json
{
  "sessionId": "session-2025-12-11-001",
  "iterationIndex": 999
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":false,\"error\":\"Iteration index 999 out of bounds for session with 12 iterations\",\"sessionId\":\"session-2025-12-11-001\",\"maxValidIndex\":11}"
    }
  ]
}
```

## Error Cases

- **Session not found**: Invalid sessionId
- **Index out of bounds**: iterationIndex >= current iteration count
- **Index is negative**: iterationIndex < 0
- **Rollback to current**: iterationIndex equals current position (no-op, but returns success)

## Notes

- Rollback is non-destructive in concept: deleted iterations are archived, not permanently removed
- After rollback, subsequent generate-image calls will create new iterations with fresh indices
- Useful for exploring alternative creative directions from a known good state
- Can be combined with undo for fine-grained workflow control
- Rollback clears the redo stack (since the timeline diverges)
- Index is 0-based: first iteration is index 0, not 1
