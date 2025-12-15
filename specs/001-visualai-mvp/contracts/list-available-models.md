# list-available-models

## Description
Returns a list of all image generation models available in the current engine configuration. Each model can be selected via model switching or used for comparative generation in multi-model workflows.

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
  models: [
    {
      id: string,                  // e.g., "stable-diffusion-v1.5"
      name: string,                // e.g., "Stable Diffusion v1.5"
      description: string,
      version: string,             // e.g., "1.5"
      parameters: {
        minWidth: number,
        maxWidth: number,
        minHeight: number,
        maxHeight: number,
        defaultSteps: number,
        maxSteps: number,
        minGuidance: number,
        maxGuidance: number
      },
      tags: string[],              // e.g., ["general-purpose", "photorealistic"]
      memoryRequirementsMB: number,
      estimatedGenerationTimeSec: number  // for default 512x512 at 20 steps
    }
  ],
  currentModel: string,
  timestamp: string
}
```

## Examples

### Example 1: Multiple models available
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
      "text": "{\"models\":[{\"id\":\"stable-diffusion-v1.5\",\"name\":\"Stable Diffusion v1.5\",\"description\":\"Fast, versatile general-purpose model\",\"version\":\"1.5\",\"parameters\":{\"minWidth\":256,\"maxWidth\":2048,\"minHeight\":256,\"maxHeight\":2048,\"defaultSteps\":20,\"maxSteps\":100,\"minGuidance\":1,\"maxGuidance\":20},\"tags\":[\"general-purpose\",\"balanced\"],\"memoryRequirementsMB\":3500,\"estimatedGenerationTimeSec\":8},{\"id\":\"stable-diffusion-v2.1\",\"name\":\"Stable Diffusion v2.1\",\"description\":\"Improved aesthetic quality and prompt understanding\",\"version\":\"2.1\",\"parameters\":{\"minWidth\":256,\"maxWidth\":2048,\"minHeight\":256,\"maxHeight\":2048,\"defaultSteps\":20,\"maxSteps\":100,\"minGuidance\":1,\"maxGuidance\":20},\"tags\":[\"high-quality\",\"aesthetic\"],\"memoryRequirementsMB\":4000,\"estimatedGenerationTimeSec\":10},{\"id\":\"dreamshaper-v8\",\"name\":\"DreamShaper v8\",\"description\":\"Fine-tuned for artistic and stylized results\",\"version\":\"8.0\",\"parameters\":{\"minWidth\":256,\"maxWidth\":2048,\"minHeight\":256,\"maxHeight\":2048,\"defaultSteps\":20,\"maxSteps\":100,\"minGuidance\":1,\"maxGuidance\":20},\"tags\":[\"artistic\",\"stylized\"],\"memoryRequirementsMB\":3800,\"estimatedGenerationTimeSec\":9}],\"currentModel\":\"stable-diffusion-v1.5\",\"timestamp\":\"2025-12-11T14:35:22.100Z\"}"
    }
  ]
}
```

### Example 2: Single model (minimal setup)
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
      "text": "{\"models\":[{\"id\":\"stable-diffusion-v1.5\",\"name\":\"Stable Diffusion v1.5\",\"description\":\"General-purpose image generation\",\"version\":\"1.5\",\"parameters\":{\"minWidth\":256,\"maxWidth\":2048,\"minHeight\":256,\"maxHeight\":2048,\"defaultSteps\":20,\"maxSteps\":100,\"minGuidance\":1,\"maxGuidance\":20},\"tags\":[\"general-purpose\"],\"memoryRequirementsMB\":3500,\"estimatedGenerationTimeSec\":8}],\"currentModel\":\"stable-diffusion-v1.5\",\"timestamp\":\"2025-12-11T14:33:45.567Z\"}"
    }
  ]
}
```

## Error Cases

- **No models configured**: Engine initialization incomplete
- **Model metadata not available**: Cache corrupted or outdated

## Notes

- Fast operation, typically <50ms
- Returns both metadata and currently active model
- Memory requirements are approximations; actual usage varies
- Estimated generation time is baseline for 512x512 at default 20 steps
- Tags help filter models for specific use cases
- Model availability depends on disk space and download status
