# list-sessions

## Description
Retrieves all active and past image generation sessions. Each session represents a user's iteration workflow, tracking creation time, modification time, and total number of iterations within that session.

## Input Schema

```typescript
{}
```

**Required**: (none)
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
  sessions: [
    {
      id: string,                    // e.g., "session-2025-12-11-001"
      createdAt: string,             // ISO 8601
      lastModifiedAt: string,        // ISO 8601
      iterationCount: number,
      currentIterationIndex: number
    }
  ],
  totalSessions: number,
  timestamp: string
}
```

## Examples

### Example 1: Multiple active sessions
**Input:**
```json
{}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"sessions\":[{\"id\":\"session-2025-12-11-001\",\"createdAt\":\"2025-12-11T10:15:30.123Z\",\"lastModifiedAt\":\"2025-12-11T14:45:22.456Z\",\"iterationCount\":12,\"currentIterationIndex\":11},{\"id\":\"session-2025-12-11-002\",\"createdAt\":\"2025-12-11T12:30:00.789Z\",\"lastModifiedAt\":\"2025-12-11T14:50:15.012Z\",\"iterationCount\":5,\"currentIterationIndex\":4},{\"id\":\"session-2025-12-10-003\",\"createdAt\":\"2025-12-10T16:20:45.345Z\",\"lastModifiedAt\":\"2025-12-10T18:30:22.678Z\",\"iterationCount\":8,\"currentIterationIndex\":7}],\"totalSessions\":3,\"timestamp\":\"2025-12-11T14:51:30.234Z\"}"
    }
  ]
}
```

### Example 2: Single session (new user)
**Input:**
```json
{}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"sessions\":[{\"id\":\"session-2025-12-11-001\",\"createdAt\":\"2025-12-11T14:52:00.100Z\",\"lastModifiedAt\":\"2025-12-11T14:52:00.100Z\",\"iterationCount\":1,\"currentIterationIndex\":0}],\"totalSessions\":1,\"timestamp\":\"2025-12-11T14:52:05.200Z\"}"
    }
  ]
}
```

### Example 3: No sessions (fresh instance)
**Input:**
```json
{}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"sessions\":[],\"totalSessions\":0,\"timestamp\":\"2025-12-11T14:55:30.400Z\"}"
    }
  ]
}
```

## Error Cases

- **Session database not found**: First-time initialization
- **Session data corrupted**: Partial recovery attempted

## Notes

- Session IDs are unique per workspace/instance
- Sessions persist across application restarts
- `currentIterationIndex` always equals `iterationCount - 1` (0-indexed)
- Sorting is typically by `lastModifiedAt` descending (most recent first)
- Sessions can be archived but not deleted (for audit trail)
- Each session can contain dozens to hundreds of iterations
- Useful for resuming work or comparing across workflows
