# VisualAI API Reference

Complete API documentation for VisualAI types, classes, and protocols.

## Table of Contents

1. [Core Types](#core-types)
   - [ImageGenerationOptions](#imagegenerationoptions)
   - [ImageGenerationResult](#imagegenerationresult)
   - [Variant](#variant)
   - [Refinement](#refinement)
   - [AssetSession](#assetsession)
   - [AssetMetadata](#assetmetadata)
   - [EngineStatus](#enginestatus)
   - [ProgressCallback](#progresscallback)

2. [MCP Protocol](#mcp-protocol)
   - [MCPToolInputSchema](#mcptoolinputschema)
   - [MCPTool](#mcptool)
   - [MCPContentBlock](#mcpcontentblock)
   - [MCPToolResult](#mcptoolresult)

3. [Wireframes](#wireframes)
   - [WireframeComponent](#wireframecomponent)
   - [Wireframe](#wireframe)
   - [WireframeSession](#wireframesession)
   - [WireframeGenerationResult](#wireframegenerationresult)
   - [ComponentExportData](#componentexportdata)
   - [ComponentRenderOptions](#componentrenderoptions)
   - [WireframeExportManifest](#wireframeexportmanifest)
   - [WireframeValidationResult](#wireframevalidationresult)
   - [ComponentVersion](#componentversion)
   - [VersionHistory](#versionhistory)

4. [Performance & Metrics](#performance--metrics)
   - [MemorySnapshot](#memorysnapshot)
   - [ProfilingResult](#profilingresult)
   - [OperationMetric](#operationmetric)
   - [AggregatedMetrics](#aggregatedmetrics)
   - [SessionMetric](#sessionmetric)
   - [MetricsSnapshot](#metricssnapshot)
   - [PerformanceMetrics](#performancemetrics)
   - [GenerationMetrics](#generationmetrics)
   - [ExportMetrics](#exportmetrics)

5. [Classes](#classes)
   - [PerformanceProfiler](#performanceprofiler)
   - [MetricsCollector](#metricscollector)
   - [SessionManager](#sessionmanager)
   - [Logger](#logger)
   - [MLXEngine](#mlxengine)

---

## Core Types

### ImageGenerationOptions

Configuration for image generation requests.

**Definition:**
```typescript
export interface ImageGenerationOptions {
  prompt: string;
  width: number;
  height: number;
  steps?: number;              // Default: 20
  guidanceScale?: number;      // Default: 7.5
  seed?: number;
}
```

**Properties:**
- `prompt` (string, required): The text prompt describing the image to generate
- `width` (number, required): Image width in pixels
- `height` (number, required): Image height in pixels
- `steps` (number, optional): Number of diffusion steps. Default: 20. Higher values produce better quality but slower generation
- `guidanceScale` (number, optional): How strongly the model follows the prompt. Default: 7.5. Range: 1-20
- `seed` (number, optional): Random seed for reproducible results. If omitted, a random seed is used

**Example:**
```typescript
const options: ImageGenerationOptions = {
  prompt: "A futuristic dashboard interface with neon blue accents",
  width: 1280,
  height: 720,
  steps: 25,
  guidanceScale: 8.0,
  seed: 42
};
```

**Notes:**
- If `seed` is not provided, results will vary between calls
- Higher `steps` values produce higher quality but take longer
- `guidanceScale` affects how literal the generation follows the prompt

---

### ImageGenerationResult

Result of a successful image generation operation.

**Definition:**
```typescript
export interface ImageGenerationResult {
  imageBase64?: string;
  imagePath?: string;
  metadata: {
    prompt: string;
    width: number;
    height: number;
    steps: number;
    guidanceScale: number;
    seed?: number;
    latencyMs: number;
    engineName: string;
    modelName: string;
    timestamp: string;
  };
  profiling?: ProfilingResult;  // NEW in T094
}
```

**Properties:**
- `imageBase64` (string, optional): Base64-encoded image data
- `imagePath` (string, optional): File path where image was saved
- `metadata` (object, required):
  - `prompt` (string): The prompt used for generation
  - `width` (number): Generated image width
  - `height` (number): Generated image height
  - `steps` (number): Diffusion steps used
  - `guidanceScale` (number): Guidance scale value used
  - `seed` (number, optional): Seed value if provided
  - `latencyMs` (number): Generation time in milliseconds
  - `engineName` (string): Name of the generation engine (e.g., "MLX")
  - `modelName` (string): Name of the model used
  - `timestamp` (string): ISO timestamp of generation
- `profiling` (ProfilingResult, optional): Performance profiling data including memory and CPU usage

**Example:**
```typescript
const result: ImageGenerationResult = {
  imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  metadata: {
    prompt: "A futuristic dashboard",
    width: 1280,
    height: 720,
    steps: 25,
    guidanceScale: 8.0,
    seed: 42,
    latencyMs: 3450,
    engineName: "MLX",
    modelName: "stable-diffusion-2.1",
    timestamp: "2025-12-11T10:30:00Z"
  },
  profiling: {
    duration: { startMs: 0, endMs: 3450, totalMs: 3450 },
    memory: { baselineMb: 512, peakMb: 2048, currentMb: 1024, deltaPercent: 100 },
    cpu: { currentPercent: 65, averagePercent: 58, peakPercent: 85 },
    gpu: { estimatePercent: 72, method: "latency", confidence: "medium" },
    warnings: []
  }
};
```

**Notes:**
- Either `imageBase64` or `imagePath` will be present, depending on output configuration
- `profiling` data is included when performance monitoring is enabled
- `latencyMs` is always measured and reported

---

### Variant

A generated image variant with metadata and unique seed.

**Definition:**
```typescript
export interface Variant {
  id: string;
  imageBase64: string;
  seed: number;
  prompt: string;
  metadata: {
    width: number;
    height: number;
    steps: number;
    latencyMs: number;
  };
}
```

**Properties:**
- `id` (string): Unique identifier for this variant
- `imageBase64` (string): Base64-encoded image data
- `seed` (number): Seed value used for this generation
- `prompt` (string): The prompt that generated this variant
- `metadata` (object):
  - `width` (number): Image width
  - `height` (number): Image height
  - `steps` (number): Diffusion steps used
  - `latencyMs` (number): Generation time

**Example:**
```typescript
const variant: Variant = {
  id: "var-001",
  imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  seed: 42,
  prompt: "A futuristic dashboard interface",
  metadata: {
    width: 1280,
    height: 720,
    steps: 25,
    latencyMs: 3450
  }
};
```

**Notes:**
- Variants are typically grouped within an `AssetSession`
- The `seed` is critical for reproducibility
- Use `id` to reference variants when creating refinements

---

### Refinement

A refinement based on an existing variant.

**Definition:**
```typescript
export interface Refinement {
  variantId: string;
  refinementPrompt: string;
  baseVariantId: string;
  timestamp: string;
}
```

**Properties:**
- `variantId` (string): ID of the refinement variant
- `refinementPrompt` (string): Additional prompt applied to refine the base variant
- `baseVariantId` (string): ID of the original variant being refined
- `timestamp` (string): ISO timestamp when refinement was created

**Example:**
```typescript
const refinement: Refinement = {
  variantId: "var-002",
  refinementPrompt: "add more vibrant colors and improve contrast",
  baseVariantId: "var-001",
  timestamp: "2025-12-11T10:32:15Z"
};
```

**Notes:**
- Refinements track the lineage of image variations
- The `refinementPrompt` is combined with the base prompt for context
- Use this to maintain history of iterative improvements

---

### AssetSession

A session containing multiple variants and refinements for a single asset.

**Definition:**
```typescript
export interface AssetSession {
  type: 'icon' | 'banner' | 'mockup';
  allVariants: Variant[];
  selectedVariantId?: string;
  refinements: Refinement[];
}
```

**Properties:**
- `type` (string): Asset category - 'icon', 'banner', or 'mockup'
- `allVariants` (Variant[]): Array of all generated variants
- `selectedVariantId` (string, optional): ID of the currently selected variant
- `refinements` (Refinement[]): Array of refinements applied to variants

**Example:**
```typescript
const session: AssetSession = {
  type: "banner",
  allVariants: [
    { id: "var-001", imageBase64: "...", seed: 42, prompt: "...", metadata: {...} },
    { id: "var-002", imageBase64: "...", seed: 43, prompt: "...", metadata: {...} }
  ],
  selectedVariantId: "var-001",
  refinements: [
    { variantId: "var-003", refinementPrompt: "...", baseVariantId: "var-001", timestamp: "..." }
  ]
};
```

**Notes:**
- Sessions group related asset generations together
- Only one variant should be selected at a time
- Refinements extend the original variants

---

### AssetMetadata

Metadata for an exported asset in multiple formats.

**Definition:**
```typescript
export interface AssetMetadata {
  type: 'icon' | 'banner' | 'mockup';
  dimensions: { width: number; height: number };
  formats: Array<'png' | 'svg' | 'webp'>;
  sourceVariantId: string;
  generatedAt: string;
  basePrompt: string;
  refinementPrompt?: string;
  exportedAt: string;
  fileSizes: {
    png?: number;
    svg?: number;
    webp?: number;
  };
}
```

**Properties:**
- `type` (string): Asset category
- `dimensions` (object): Width and height in pixels
- `formats` (string[]): Available export formats
- `sourceVariantId` (string): Which variant this asset was exported from
- `generatedAt` (string): ISO timestamp of generation
- `basePrompt` (string): Original generation prompt
- `refinementPrompt` (string, optional): Refinement prompt if applicable
- `exportedAt` (string): ISO timestamp of export
- `fileSizes` (object): File size in bytes for each format

**Example:**
```typescript
const metadata: AssetMetadata = {
  type: "icon",
  dimensions: { width: 512, height: 512 },
  formats: ["png", "svg", "webp"],
  sourceVariantId: "var-001",
  generatedAt: "2025-12-11T10:30:00Z",
  basePrompt: "A professional app icon",
  refinementPrompt: "add gold accents",
  exportedAt: "2025-12-11T10:35:00Z",
  fileSizes: {
    png: 245600,
    svg: 8450,
    webp: 156200
  }
};
```

**Notes:**
- Used for tracking exported assets
- File sizes help with storage planning
- Maintains link to source variant for reproducibility

---

### EngineStatus

Current status of an image generation engine.

**Definition:**
```typescript
export interface EngineStatus {
  ready: boolean;
  engineName: string;
  modelPath?: string;
  dependencies: {
    name: string;
    installed: boolean;
    version?: string;
  }[];
  error?: string;
}
```

**Properties:**
- `ready` (boolean): Whether engine is ready to generate images
- `engineName` (string): Name of the engine (e.g., "MLX", "ONNX")
- `modelPath` (string, optional): Path to the loaded model
- `dependencies` (object[]): Status of required dependencies
  - `name` (string): Dependency name
  - `installed` (boolean): Whether installed
  - `version` (string, optional): Installed version
- `error` (string, optional): Error message if not ready

**Example:**
```typescript
const status: EngineStatus = {
  ready: true,
  engineName: "MLX",
  modelPath: "/models/stable-diffusion-2.1",
  dependencies: [
    { name: "python", installed: true, version: "3.11.5" },
    { name: "mlx", installed: true, version: "0.10.0" },
    { name: "torch", installed: false }
  ],
  error: undefined
};
```

**Notes:**
- Check `ready` before attempting generation
- Review `dependencies` to diagnose initialization issues
- `error` provides details when engine fails to initialize

---

### ProgressCallback

Function type for receiving generation progress updates.

**Definition:**
```typescript
export type ProgressCallback = (step: string, progress: number, total: number) => void;
```

**Parameters:**
- `step` (string): Description of current step (e.g., "Encoding prompt", "Running diffusion")
- `progress` (number): Current step number
- `total` (number): Total steps to complete

**Example:**
```typescript
const onProgress: ProgressCallback = (step, progress, total) => {
  const percent = Math.round((progress / total) * 100);
  console.log(`[${percent}%] ${step}`);
};

await engine.generate(options, onProgress);
```

**Notes:**
- Callback is optional; pass `undefined` if no progress reporting needed
- Progress is 0-indexed
- Use for UI progress bars or logging

---

## MCP Protocol

### MCPToolInputSchema

JSON Schema definition for MCP tool input parameters.

**Definition:**
```typescript
export interface MCPToolInputSchema {
  type: string;
  properties: Record<string, {
    type: string;
    description?: string;
    default?: unknown;
  }>;
  required?: string[];
}
```

**Properties:**
- `type` (string): Schema type (typically "object")
- `properties` (Record): Named properties with their schemas
  - Property key (string): Parameter name
  - Property value (object):
    - `type` (string): Parameter type (string, number, boolean, object, array)
    - `description` (string, optional): Parameter description
    - `default` (unknown, optional): Default value
- `required` (string[], optional): Array of required property names

**Example:**
```typescript
const schema: MCPToolInputSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description: "Image generation prompt"
    },
    width: {
      type: "number",
      description: "Image width in pixels",
      default: 1024
    },
    steps: {
      type: "number",
      description: "Number of diffusion steps",
      default: 20
    }
  },
  required: ["prompt", "width"]
};
```

**Notes:**
- Follows JSON Schema specification
- Used to validate tool inputs from MCP clients
- `required` array lists mandatory parameters

---

### MCPTool

Definition of an MCP tool available for clients.

**Definition:**
```typescript
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: MCPToolInputSchema;
}
```

**Properties:**
- `name` (string): Tool name (e.g., "generate_image")
- `description` (string): Human-readable description of what the tool does
- `inputSchema` (MCPToolInputSchema): Schema for tool input parameters

**Example:**
```typescript
const tool: MCPTool = {
  name: "generate_image",
  description: "Generate an image from a text prompt using MLX stable diffusion",
  inputSchema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "The text prompt for image generation"
      },
      width: {
        type: "number",
        description: "Image width in pixels",
        default: 1024
      },
      height: {
        type: "number",
        description: "Image height in pixels",
        default: 1024
      }
    },
    required: ["prompt"]
  }
};
```

**Notes:**
- Tools are published by MCP servers for clients to discover
- `description` should be clear for CLI help text
- `inputSchema` enables automatic validation and CLI argument generation

---

### MCPContentBlock

A block of content in an MCP message (text or image).

**Definition:**
```typescript
export interface MCPContentBlock {
  type: "text" | "image";
  text?: string;
  data?: string;
  mimeType?: string;
}
```

**Properties:**
- `type` (string): "text" or "image"
- `text` (string, optional): Text content (for text blocks)
- `data` (string, optional): Base64-encoded data (for image blocks)
- `mimeType` (string, optional): MIME type (e.g., "image/png")

**Example:**
```typescript
const textBlock: MCPContentBlock = {
  type: "text",
  text: "Image generated successfully"
};

const imageBlock: MCPContentBlock = {
  type: "image",
  data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  mimeType: "image/png"
};
```

**Notes:**
- Text blocks are used for status messages and metadata
- Image blocks contain binary data encoded as base64
- `mimeType` helps clients interpret the data

---

### MCPToolResult

Result of executing an MCP tool.

**Definition:**
```typescript
export interface MCPToolResult {
  content: MCPContentBlock[];
}
```

**Properties:**
- `content` (MCPContentBlock[]): Array of content blocks (text, images, etc.)

**Example:**
```typescript
const result: MCPToolResult = {
  content: [
    {
      type: "text",
      text: "Generated 4 image variants"
    },
    {
      type: "image",
      data: "iVBORw0KGgo...",
      mimeType: "image/png"
    },
    {
      type: "text",
      text: "Generation took 3450ms"
    }
  ]
};
```

**Notes:**
- Result can contain multiple content blocks
- Typically includes metadata text followed by generated images
- Use for returning rich results to MCP clients

---

## Wireframes

### WireframeComponent

A component in a wireframe layout.

**Definition:**
```typescript
export interface WireframeComponent {
  id: string;
  type: 'sidebar' | 'header' | 'footer' | 'grid' | 'card' | 'container' | 'content';
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
  properties?: {
    columns?: number;
    spacing?: number;
    slots?: string[];
    [key: string]: unknown;
  };
  children?: WireframeComponent[];
}
```

**Properties:**
- `id` (string): Unique identifier
- `type` (string): Component type
- `position` (object, optional): X,Y coordinates
- `dimensions` (object, optional): Width and height
- `properties` (object, optional): Component-specific properties
  - `columns` (number, optional): For grid layouts
  - `spacing` (number, optional): Padding/margin
  - `slots` (string[], optional): Named content slots
- `children` (WireframeComponent[], optional): Nested components

**Example:**
```typescript
const component: WireframeComponent = {
  id: "comp-001",
  type: "container",
  position: { x: 0, y: 0 },
  dimensions: { width: 1200, height: 800 },
  properties: { spacing: 16 },
  children: [
    {
      id: "comp-002",
      type: "header",
      position: { x: 0, y: 0 },
      dimensions: { width: 1200, height: 80 }
    },
    {
      id: "comp-003",
      type: "content",
      position: { x: 0, y: 80 },
      dimensions: { width: 1200, height: 720 }
    }
  ]
};
```

**Notes:**
- Hierarchy is represented via `children`
- `type` determines how the component renders
- `properties` are flexible for component-specific configuration

---

### Wireframe

A complete wireframe layout with components.

**Definition:**
```typescript
export interface Wireframe {
  id: string;
  sessionId: string;
  description: string;
  components: WireframeComponent[];
  metadata: {
    width: number;
    height: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

**Properties:**
- `id` (string): Unique identifier
- `sessionId` (string): Associated session ID
- `description` (string): User-friendly description
- `components` (WireframeComponent[]): Root-level components
- `metadata` (object):
  - `width` (number): Canvas width
  - `height` (number): Canvas height
  - `createdAt` (string): ISO timestamp
  - `updatedAt` (string): ISO timestamp

**Example:**
```typescript
const wireframe: Wireframe = {
  id: "wf-001",
  sessionId: "session-001",
  description: "Dashboard layout with sidebar navigation",
  components: [
    { id: "comp-001", type: "sidebar", dimensions: { width: 256, height: 800 } },
    { id: "comp-002", type: "content", dimensions: { width: 944, height: 800 } }
  ],
  metadata: {
    width: 1200,
    height: 800,
    createdAt: "2025-12-11T10:00:00Z",
    updatedAt: "2025-12-11T10:15:00Z"
  }
};
```

**Notes:**
- Each wireframe belongs to a session
- `description` helps users identify wireframes
- `metadata` tracks timeline changes

---

### WireframeSession

A session containing multiple wireframes.

**Definition:**
```typescript
export interface WireframeSession {
  id: string;
  wireframes: Wireframe[];
  currentWireframeId?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Properties:**
- `id` (string): Session identifier
- `wireframes` (Wireframe[]): All wireframes in session
- `currentWireframeId` (string, optional): Currently active wireframe
- `createdAt` (string): ISO timestamp
- `updatedAt` (string): ISO timestamp

**Example:**
```typescript
const session: WireframeSession = {
  id: "session-001",
  wireframes: [
    { id: "wf-001", sessionId: "session-001", description: "...", components: [...], metadata: {...} },
    { id: "wf-002", sessionId: "session-001", description: "...", components: [...], metadata: {...} }
  ],
  currentWireframeId: "wf-001",
  createdAt: "2025-12-11T09:00:00Z",
  updatedAt: "2025-12-11T10:30:00Z"
};
```

**Notes:**
- Sessions organize related wireframes
- Only one wireframe is "current" at a time
- Use for multi-step design flows

---

### WireframeGenerationResult

Result of generating a wireframe from a description.

**Definition:**
```typescript
export interface WireframeGenerationResult {
  wireframe: Wireframe;
  parsedLayout: {
    componentTypes: string[];
    layoutPattern: string;
  };
}
```

**Properties:**
- `wireframe` (Wireframe): The generated wireframe
- `parsedLayout` (object): Analysis of the generated layout
  - `componentTypes` (string[]): Types of components found
  - `layoutPattern` (string): Identified pattern (e.g., "sidebar+content")

**Example:**
```typescript
const result: WireframeGenerationResult = {
  wireframe: {
    id: "wf-001",
    sessionId: "session-001",
    description: "Dashboard with sidebar",
    components: [...],
    metadata: {...}
  },
  parsedLayout: {
    componentTypes: ["sidebar", "header", "grid", "card"],
    layoutPattern: "sidebar+content"
  }
};
```

**Notes:**
- Useful for validating generated layouts
- `parsedLayout` helps categorize wireframe types

---

### ComponentExportData

Data for exporting a component with SVG and metadata.

**Definition:**
```typescript
export interface ComponentExportData {
  component: WireframeComponent;
  svg: string;
  metadata: {
    id: string;
    type: string;
    dimensions: { width: number; height: number };
    position?: { x: number; y: number };
    properties: Record<string, unknown>;
    children: Array<{ id: string; type: string }>;
    exportedAt: string;
    figmaCompatible: boolean;
  };
}
```

**Properties:**
- `component` (WireframeComponent): The component being exported
- `svg` (string): SVG representation
- `metadata` (object): Export details
  - `id` (string): Component ID
  - `type` (string): Component type
  - `dimensions` (object): Width and height
  - `position` (object, optional): X,Y coordinates
  - `properties` (Record): Component properties
  - `children` (object[]): Child component references
  - `exportedAt` (string): ISO timestamp
  - `figmaCompatible` (boolean): Whether SVG can be imported to Figma

**Example:**
```typescript
const exportData: ComponentExportData = {
  component: { id: "comp-001", type: "card", dimensions: { width: 400, height: 300 } },
  svg: "<svg>...</svg>",
  metadata: {
    id: "comp-001",
    type: "card",
    dimensions: { width: 400, height: 300 },
    properties: { spacing: 16 },
    children: [
      { id: "comp-002", type: "text" },
      { id: "comp-003", type: "image" }
    ],
    exportedAt: "2025-12-11T10:30:00Z",
    figmaCompatible: true
  }
};
```

**Notes:**
- SVG can be rendered or imported to design tools
- Figma compatibility depends on SVG complexity
- Used for component-level exports

---

### ComponentRenderOptions

Options for rendering a wireframe component.

**Definition:**
```typescript
export interface ComponentRenderOptions {
  includeChildren: boolean;
  applyStyles: boolean;
  exportFormat: 'svg' | 'png';
  quality?: number;
  backgroundColor?: string;
}
```

**Properties:**
- `includeChildren` (boolean): Whether to render child components
- `applyStyles` (boolean): Whether to apply styling
- `exportFormat` (string): "svg" or "png"
- `quality` (number, optional): PNG quality (0-100), default 90
- `backgroundColor` (string, optional): Background color (CSS color value)

**Example:**
```typescript
const options: ComponentRenderOptions = {
  includeChildren: true,
  applyStyles: true,
  exportFormat: "png",
  quality: 95,
  backgroundColor: "#ffffff"
};
```

**Notes:**
- SVG exports are lossless, PNG exports are rasterized
- `quality` applies only to PNG format
- `applyStyles` helps with visual fidelity

---

### WireframeExportManifest

Manifest describing exported wireframe components.

**Definition:**
```typescript
export interface WireframeExportManifest {
  wireframeId: string;
  exportedAt: string;
  totalComponents: number;
  canvasDimensions: { width: number; height: number };
  components: Array<{
    id: string;
    type: string;
    svgPath?: string;
    metadataPath?: string;
    svg?: string;
    metadata?: Record<string, unknown>;
  }>;
  exportFormat: 'filesystem' | 'memory';
}
```

**Properties:**
- `wireframeId` (string): ID of the wireframe being exported
- `exportedAt` (string): ISO timestamp
- `totalComponents` (number): Number of components exported
- `canvasDimensions` (object): Canvas width and height
- `components` (object[]): Array of component exports
  - `id` (string): Component ID
  - `type` (string): Component type
  - `svgPath` (string, optional): File path to SVG (if filesystem export)
  - `metadataPath` (string, optional): File path to metadata JSON
  - `svg` (string, optional): SVG data (if memory export)
  - `metadata` (Record, optional): Component metadata (if memory export)
- `exportFormat` (string): "filesystem" or "memory"

**Example:**
```typescript
const manifest: WireframeExportManifest = {
  wireframeId: "wf-001",
  exportedAt: "2025-12-11T10:30:00Z",
  totalComponents: 3,
  canvasDimensions: { width: 1200, height: 800 },
  components: [
    { id: "comp-001", type: "sidebar", svgPath: "components/comp-001.svg", metadataPath: "components/comp-001.json" },
    { id: "comp-002", type: "header", svgPath: "components/comp-002.svg", metadataPath: "components/comp-002.json" },
    { id: "comp-003", type: "content", svgPath: "components/comp-003.svg", metadataPath: "components/comp-003.json" }
  ],
  exportFormat: "filesystem"
};
```

**Notes:**
- Filesystem exports save to disk
- Memory exports keep data in-memory (good for streaming)
- Useful for tracking batch exports

---

### WireframeValidationResult

Result of validating a wireframe.

**Definition:**
```typescript
export interface WireframeValidationResult {
  isValid: boolean;
  errors: Array<{
    componentId: string;
    errorType: 'dimension' | 'position' | 'overlap' | 'missing_property';
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    componentId: string;
    warningType: 'size' | 'spacing' | 'proportion';
    message: string;
  }>;
}
```

**Properties:**
- `isValid` (boolean): Whether wireframe is valid
- `errors` (object[]): List of validation errors
  - `componentId` (string): Affected component
  - `errorType` (string): Type of error
  - `message` (string): Description
  - `severity` (string): "error" or "warning"
- `warnings` (object[]): List of warnings
  - `componentId` (string): Affected component
  - `warningType` (string): Type of warning
  - `message` (string): Description

**Example:**
```typescript
const validation: WireframeValidationResult = {
  isValid: false,
  errors: [
    {
      componentId: "comp-001",
      errorType: "dimension",
      message: "Component width cannot be negative",
      severity: "error"
    }
  ],
  warnings: [
    {
      componentId: "comp-002",
      warningType: "spacing",
      message: "Large gap between components may cause layout issues"
    }
  ]
};
```

**Notes:**
- Check `isValid` before proceeding with export
- Errors are blocking, warnings are informational
- Fix all errors before exporting

---

### ComponentVersion

A specific version of a component with change history.

**Definition:**
```typescript
export interface ComponentVersion {
  versionId: string;
  componentId: string;
  wireframeId: string;
  timestamp: string;
  changeType: 'created' | 'updated' | 'deleted' | 'restored';
  changeDescription: string;
  componentState: WireframeComponent;
  previousVersionId?: string;
}
```

**Properties:**
- `versionId` (string): Unique version identifier
- `componentId` (string): ID of the component
- `wireframeId` (string): ID of containing wireframe
- `timestamp` (string): ISO timestamp of change
- `changeType` (string): Type of change made
- `changeDescription` (string): Human-readable description
- `componentState` (WireframeComponent): Component state at this version
- `previousVersionId` (string, optional): Link to previous version

**Example:**
```typescript
const version: ComponentVersion = {
  versionId: "v-001",
  componentId: "comp-001",
  wireframeId: "wf-001",
  timestamp: "2025-12-11T10:30:00Z",
  changeType: "updated",
  changeDescription: "Adjusted width from 400px to 450px",
  componentState: { id: "comp-001", type: "card", dimensions: { width: 450, height: 300 } },
  previousVersionId: "v-000"
};
```

**Notes:**
- Versions form a linked chain via `previousVersionId`
- Use for undo/redo functionality
- `changeDescription` helps with version history UI

---

### VersionHistory

Complete version history of a component.

**Definition:**
```typescript
export interface VersionHistory {
  wireframeId: string;
  componentId: string;
  versions: ComponentVersion[];
  currentVersionId: string;
}
```

**Properties:**
- `wireframeId` (string): ID of containing wireframe
- `componentId` (string): ID of the component
- `versions` (ComponentVersion[]): All versions in chronological order
- `currentVersionId` (string): ID of currently active version

**Example:**
```typescript
const history: VersionHistory = {
  wireframeId: "wf-001",
  componentId: "comp-001",
  versions: [
    {
      versionId: "v-000",
      componentId: "comp-001",
      wireframeId: "wf-001",
      timestamp: "2025-12-11T10:00:00Z",
      changeType: "created",
      changeDescription: "Initial creation",
      componentState: { id: "comp-001", type: "card", dimensions: { width: 400, height: 300 } },
      previousVersionId: undefined
    },
    {
      versionId: "v-001",
      componentId: "comp-001",
      wireframeId: "wf-001",
      timestamp: "2025-12-11T10:30:00Z",
      changeType: "updated",
      changeDescription: "Adjusted width",
      componentState: { id: "comp-001", type: "card", dimensions: { width: 450, height: 300 } },
      previousVersionId: "v-000"
    }
  ],
  currentVersionId: "v-001"
};
```

**Notes:**
- Versions are ordered chronologically
- `currentVersionId` points to the active version
- Use for restoring previous states

---

## Performance & Metrics

### MemorySnapshot

A point-in-time memory and CPU measurement.

**Definition:**
```typescript
export interface MemorySnapshot {
  timestamp: number;
  memoryMb: number;
  cpuPercent: number;
}
```

**Properties:**
- `timestamp` (number): Unix timestamp in milliseconds
- `memoryMb` (number): Memory usage in megabytes
- `cpuPercent` (number): CPU usage as percentage (0-100)

**Example:**
```typescript
const snapshot: MemorySnapshot = {
  timestamp: 1734084600000,
  memoryMb: 1024,
  cpuPercent: 45.5
};
```

**Notes:**
- Multiple snapshots form a timeline
- Used for performance graphs
- CPU percentage is normalized per-core on multi-core systems

---

### ProfilingResult

Complete performance profiling data for an operation.

**Definition:**
```typescript
export interface ProfilingResult {
  duration: {
    startMs: number;
    endMs: number;
    totalMs: number;
  };
  memory: {
    baselineMb: number;
    peakMb: number;
    currentMb: number;
    deltaPercent: number;
  };
  cpu: {
    currentPercent: number;
    averagePercent: number;
    peakPercent: number;
  };
  gpu: {
    estimatePercent: number;
    method: 'latency' | 'unavailable';
    confidence: 'low' | 'medium';
  };
  warnings: Array<{
    type: 'high-memory' | 'high-cpu' | 'gpu-unknown';
    message: string;
    severity: 'warning' | 'error';
  }>;
}
```

**Properties:**
- `duration` (object):
  - `startMs` (number): Start time
  - `endMs` (number): End time
  - `totalMs` (number): Total elapsed time
- `memory` (object):
  - `baselineMb` (number): Initial memory usage
  - `peakMb` (number): Peak memory usage
  - `currentMb` (number): Final memory usage
  - `deltaPercent` (number): Percentage increase from baseline
- `cpu` (object):
  - `currentPercent` (number): Current CPU usage
  - `averagePercent` (number): Average during operation
  - `peakPercent` (number): Maximum CPU usage
- `gpu` (object):
  - `estimatePercent` (number): Estimated GPU usage (0-100)
  - `method` (string): "latency" (estimated) or "unavailable"
  - `confidence` (string): Estimation confidence level
- `warnings` (object[]): Performance warnings
  - `type` (string): Warning category
  - `message` (string): Description
  - `severity` (string): "warning" or "error"

**Example:**
```typescript
const result: ProfilingResult = {
  duration: { startMs: 0, endMs: 3450, totalMs: 3450 },
  memory: { baselineMb: 512, peakMb: 2048, currentMb: 1024, deltaPercent: 100 },
  cpu: { currentPercent: 65, averagePercent: 58, peakPercent: 85 },
  gpu: { estimatePercent: 72, method: "latency", confidence: "medium" },
  warnings: [
    {
      type: "high-memory",
      message: "Memory usage peaked at 2048MB (4x baseline)",
      severity: "warning"
    }
  ]
};
```

**Notes:**
- GPU estimates use operation latency as proxy (method: "latency")
- Warnings help identify performance bottlenecks
- Used in image generation metadata

---

### OperationMetric

A metric recording for a single operation.

**Definition:**
```typescript
export interface OperationMetric {
  operationName: string;
  durationMs: number;
  success: boolean;
  errorType?: string;
  timestamp: string;
  sessionId?: string;
}
```

**Properties:**
- `operationName` (string): Name of the operation
- `durationMs` (number): Execution time in milliseconds
- `success` (boolean): Whether operation succeeded
- `errorType` (string, optional): Error type if failed
- `timestamp` (string): ISO timestamp
- `sessionId` (string, optional): Associated session ID

**Example:**
```typescript
const metric: OperationMetric = {
  operationName: "generate_image",
  durationMs: 3450,
  success: true,
  errorType: undefined,
  timestamp: "2025-12-11T10:30:00Z",
  sessionId: "session-001"
};
```

**Notes:**
- Each operation is recorded independently
- `success: false` indicates a failed operation
- `errorType` helps categorize failure modes

---

### AggregatedMetrics

Aggregated metrics for a specific operation type.

**Definition:**
```typescript
export interface AggregatedMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  errorRate: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorsByType: Record<string, number>;
}
```

**Properties:**
- `totalOperations` (number): Total count
- `successfulOperations` (number): Successful count
- `failedOperations` (number): Failed count
- `successRate` (number): Percentage of successful operations
- `errorRate` (number): Percentage of failed operations
- `averageLatencyMs` (number): Mean execution time
- `p95LatencyMs` (number): 95th percentile latency
- `p99LatencyMs` (number): 99th percentile latency
- `errorsByType` (Record): Error count by type

**Example:**
```typescript
const metrics: AggregatedMetrics = {
  totalOperations: 150,
  successfulOperations: 148,
  failedOperations: 2,
  successRate: 98.67,
  errorRate: 1.33,
  averageLatencyMs: 3200,
  p95LatencyMs: 4500,
  p99LatencyMs: 5100,
  errorsByType: {
    "timeout": 1,
    "out_of_memory": 1
  }
};
```

**Notes:**
- Useful for dashboards and reporting
- Percentiles help identify tail latency issues
- `errorsByType` enables root cause analysis

---

### SessionMetric

Metric data for a session.

**Definition:**
```typescript
export interface SessionMetric {
  sessionId: string;
  createdAt: string;
  closedAt?: string;
  operationCount: number;
}
```

**Properties:**
- `sessionId` (string): Session identifier
- `createdAt` (string): ISO timestamp of creation
- `closedAt` (string, optional): ISO timestamp of closure
- `operationCount` (number): Number of operations in session

**Example:**
```typescript
const metric: SessionMetric = {
  sessionId: "session-001",
  createdAt: "2025-12-11T09:00:00Z",
  closedAt: "2025-12-11T10:30:00Z",
  operationCount: 12
};
```

**Notes:**
- `closedAt` is absent for active sessions
- Use to track session duration and activity

---

### MetricsSnapshot

Current state of all metrics.

**Definition:**
```typescript
export interface MetricsSnapshot {
  timestamp: string;
  activeSessions: number;
  totalSessionsCreated: number;
  totalSessionsClosed: number;
  operationMetrics: Record<string, AggregatedMetrics>;
  recentOperations: OperationMetric[];
  uptime: number;
}
```

**Properties:**
- `timestamp` (string): Snapshot timestamp
- `activeSessions` (number): Currently active sessions
- `totalSessionsCreated` (number): Total created
- `totalSessionsClosed` (number): Total closed
- `operationMetrics` (Record): Metrics keyed by operation name
- `recentOperations` (OperationMetric[]): Last N operations
- `uptime` (number): Total uptime in seconds

**Example:**
```typescript
const snapshot: MetricsSnapshot = {
  timestamp: "2025-12-11T10:30:00Z",
  activeSessions: 3,
  totalSessionsCreated: 25,
  totalSessionsClosed: 22,
  operationMetrics: {
    "generate_image": {
      totalOperations: 150,
      successfulOperations: 148,
      failedOperations: 2,
      successRate: 98.67,
      errorRate: 1.33,
      averageLatencyMs: 3200,
      p95LatencyMs: 4500,
      p99LatencyMs: 5100,
      errorsByType: { "timeout": 1, "out_of_memory": 1 }
    }
  },
  recentOperations: [...],
  uptime: 86400
};
```

**Notes:**
- Use for system monitoring dashboards
- `recentOperations` helps debug recent issues
- `uptime` is seconds since startup

---

### PerformanceMetrics

Metrics for operation timings.

**Definition:**
```typescript
export interface PerformanceMetrics {
  totalDurationMs: number;
  operationTimings: Record<string, {
    durationMs: number;
    count: number;
    averageMs: number;
  }>;
  timestamp: string;
}
```

**Properties:**
- `totalDurationMs` (number): Total time across all operations
- `operationTimings` (Record): Per-operation timing breakdown
  - Operation name (string):
    - `durationMs` (number): Total time for this operation
    - `count` (number): Number of times run
    - `averageMs` (number): Average time per execution
- `timestamp` (string): Measurement timestamp

**Example:**
```typescript
const metrics: PerformanceMetrics = {
  totalDurationMs: 12500,
  operationTimings: {
    "encode_prompt": { durationMs: 250, count: 4, averageMs: 62.5 },
    "run_diffusion": { durationMs: 11200, count: 4, averageMs: 2800 },
    "decode_image": { durationMs: 1050, count: 4, averageMs: 262.5 }
  },
  timestamp: "2025-12-11T10:30:00Z"
};
```

**Notes:**
- Useful for identifying slow operations
- Helps optimize hot paths

---

### GenerationMetrics

Metrics specific to image generation.

**Definition:**
```typescript
export interface GenerationMetrics {
  totalGenerationTimeMs: number;
  perVariantAverageMs: number;
}
```

**Properties:**
- `totalGenerationTimeMs` (number): Total time generating all variants
- `perVariantAverageMs` (number): Average time per variant

**Example:**
```typescript
const metrics: GenerationMetrics = {
  totalGenerationTimeMs: 13800,
  perVariantAverageMs: 3450
};
```

**Notes:**
- Used to track batch generation efficiency
- Helps estimate time for future generations

---

### ExportMetrics

Metrics specific to asset export operations.

**Definition:**
```typescript
export interface ExportMetrics {
  totalExportTimeMs: number;
  formatTimings: Record<string, number>;
}
```

**Properties:**
- `totalExportTimeMs` (number): Total export time
- `formatTimings` (Record): Time per export format
  - Format name (string): Time in milliseconds

**Example:**
```typescript
const metrics: ExportMetrics = {
  totalExportTimeMs: 1250,
  formatTimings: {
    "png": 450,
    "svg": 200,
    "webp": 600
  }
};
```

**Notes:**
- Identifies slowest export formats
- Helps with export optimization

---

## Classes

### PerformanceProfiler

Monitors process memory and CPU during execution.

**Location:** `/src/lib/profiler.ts`

**Constructor:**
```typescript
new PerformanceProfiler()
```

**Methods:**

#### startMonitoring(pythonPid: number): Promise<void>

Start monitoring a Python process for performance.

```typescript
const profiler = new PerformanceProfiler();
await profiler.startMonitoring(pythonProcessId);
// Monitoring is now active
```

**Parameters:**
- `pythonPid` (number): PID of Python process to monitor

**Notes:**
- Must be called before generating images
- Profiler runs in background
- Monitoring includes memory and CPU

#### stopMonitoring(): ProfilingResult

Stop monitoring and return collected profiling data.

```typescript
const result = profiler.stopMonitoring();
console.log(`Peak memory: ${result.memory.peakMb}MB`);
```

**Returns:** `ProfilingResult` with memory, CPU, and GPU metrics

**Notes:**
- Should be called after operation completes
- Returns null if monitoring never started

#### cleanup(): void

Clean up profiler resources.

```typescript
profiler.cleanup();
```

**Notes:**
- Call after `stopMonitoring()`
- Releases system resources

---

### MetricsCollector

Collects and aggregates operation metrics.

**Location:** `/src/lib/metrics.ts`

**Constructor:**
```typescript
new MetricsCollector()
```

**Methods:**

#### recordOperation(operationName: string, durationMs: number, success: boolean, errorType?: string, sessionId?: string): void

Record a single operation metric.

```typescript
metricsCollector.recordOperation(
  "generate_image",
  3450,
  true,
  undefined,
  "session-001"
);
```

**Parameters:**
- `operationName` (string): Operation name
- `durationMs` (number): Execution time
- `success` (boolean): Success status
- `errorType` (string, optional): Error type if failed
- `sessionId` (string, optional): Associated session

#### recordSessionCreated(sessionId: string): void

Record session creation.

```typescript
metricsCollector.recordSessionCreated("session-001");
```

#### recordSessionClosed(sessionId: string): void

Record session closure.

```typescript
metricsCollector.recordSessionClosed("session-001");
```

#### getActiveSessionCount(): number

Get count of currently active sessions.

```typescript
const count = metricsCollector.getActiveSessionCount();
console.log(`Active sessions: ${count}`);
```

#### getOperationMetrics(operationName: string): AggregatedMetrics

Get aggregated metrics for a specific operation.

```typescript
const metrics = metricsCollector.getOperationMetrics("generate_image");
console.log(`Success rate: ${metrics.successRate}%`);
```

#### getAllOperationMetrics(): Record<string, AggregatedMetrics>

Get all operation metrics.

```typescript
const allMetrics = metricsCollector.getAllOperationMetrics();
Object.entries(allMetrics).forEach(([op, metrics]) => {
  console.log(`${op}: ${metrics.averageLatencyMs}ms average`);
});
```

#### getSnapshot(): MetricsSnapshot

Get current snapshot of all metrics.

```typescript
const snapshot = metricsCollector.getSnapshot();
console.log(`Uptime: ${snapshot.uptime}s`);
```

#### getSummary(): string

Get formatted summary of metrics.

```typescript
const summary = metricsCollector.getSummary();
console.log(summary);
```

#### reset(): void

Reset all collected metrics.

```typescript
metricsCollector.reset();
```

---

### SessionManager

Manages user sessions, storage, and metrics.

**Location:** `/src/session/session-manager.ts`

**Constructor:**
```typescript
new SessionManager(storageDir: string)
```

**Parameters:**
- `storageDir` (string): Directory for session storage

**Methods:**

#### initialize(): Promise<void>

Initialize the session manager.

```typescript
const manager = new SessionManager("./sessions");
await manager.initialize();
```

#### createSession(): Promise<Session>

Create a new session.

```typescript
const session = await manager.createSession();
console.log(`Created session: ${session.id}`);
```

**Returns:** New `Session` object

#### loadSession(sessionId: string): Promise<Session | null>

Load an existing session.

```typescript
const session = await manager.loadSession("session-001");
if (session) {
  console.log("Session loaded");
}
```

#### saveSession(session: Session): Promise<void>

Save session to storage.

```typescript
await manager.saveSession(session);
```

#### listSessions(): Promise<Session[]>

List all sessions.

```typescript
const sessions = await manager.listSessions();
console.log(`Found ${sessions.length} sessions`);
```

#### deleteSession(sessionId: string): Promise<void>

Delete a session.

```typescript
await manager.deleteSession("session-001");
```

#### getActiveSession(sessionId: string): Session | null

Get active session from memory.

```typescript
const session = manager.getActiveSession("session-001");
```

#### getActiveHistory(sessionId: string): IterationHistory | null

Get iteration history for active session.

```typescript
const history = manager.getActiveHistory("session-001");
```

#### addIterationToSession(sessionId: string, prompt: string, result: any): Iteration | null

Add iteration to session.

```typescript
const iteration = manager.addIterationToSession(
  "session-001",
  "A blue icon",
  generatedResult
);
```

#### buildVariantCacheKey(assetType: string, assetDescription: string, width: number, height: number): string

Build cache key for variant storage.

```typescript
const key = manager.buildVariantCacheKey("icon", "user avatar", 128, 128);
```

#### getVariantCache(sessionId: string, cacheKey: string): Variant[] | null

Get cached variants.

```typescript
const variants = manager.getVariantCache("session-001", cacheKey);
```

#### setVariantCache(sessionId: string, cacheKey: string, variants: Variant[]): void

Cache variants for session.

```typescript
manager.setVariantCache("session-001", cacheKey, variants);
```

#### clearVariantCache(sessionId: string): void

Clear all cached variants for session.

```typescript
manager.clearVariantCache("session-001");
```

#### loadIterationImage(sessionId: string, iterationIndex: number): Promise<string>

Load image data for a specific iteration.

```typescript
const imageBase64 = await manager.loadIterationImage("session-001", 0);
```

#### saveWireframe(sessionId: string, wireframe: Wireframe): Promise<void>

Save wireframe to session storage.

```typescript
await manager.saveWireframe("session-001", wireframe);
```

#### loadWireframe(sessionId: string, wireframeId: string): Promise<Wireframe | null>

Load wireframe from session storage.

```typescript
const wireframe = await manager.loadWireframe("session-001", "wf-001");
```

#### listWireframes(sessionId: string): Promise<string[]>

List wireframe IDs in session.

```typescript
const ids = await manager.listWireframes("session-001");
```

#### deleteWireframe(sessionId: string, wireframeId: string): Promise<void>

Delete wireframe from session.

```typescript
await manager.deleteWireframe("session-001", "wf-001");
```

#### recordMetric(operationName: string, durationMs: number): void

Record operation metric.

```typescript
manager.recordMetric("generate_image", 3450);
```

#### getActiveSessionCount(): number

Get count of active sessions.

```typescript
const count = manager.getActiveSessionCount();
```

#### getMetricsSnapshot()

Get current metrics snapshot.

```typescript
const snapshot = manager.getMetricsSnapshot();
```

#### getMetricsSummary(): string

Get formatted metrics summary.

```typescript
const summary = manager.getMetricsSummary();
console.log(summary);
```

#### getMetricsCollector(): MetricsCollector

Get the underlying metrics collector.

```typescript
const collector = manager.getMetricsCollector();
```

---

### Logger

Structured logging with namespace and level support.

**Location:** `/src/utils/logger.ts`

**Enums:**
```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}
```

**Constructor:**
```typescript
new Logger(namespace: string, minLevel?: LogLevel)
```

**Parameters:**
- `namespace` (string): Logger namespace (e.g., "engine", "session")
- `minLevel` (LogLevel, optional): Minimum log level. Default: INFO

**Methods:**

#### debug(message: string, ...args: unknown[]): void

Log debug message.

```typescript
const logger = new Logger("engine");
logger.debug("Starting image generation", { seed: 42 });
```

#### info(message: string, ...args: unknown[]): void

Log info message.

```typescript
logger.info("Generation complete");
```

#### warn(message: string, ...args: unknown[]): void

Log warning message.

```typescript
logger.warn("Memory usage high", { currentMb: 2048 });
```

#### error(message: string, error?: Error | unknown): void

Log error message.

```typescript
try {
  // operation
} catch (err) {
  logger.error("Generation failed", err);
}
```

#### setMinLevel(level: LogLevel): void

Change minimum log level.

```typescript
logger.setMinLevel(LogLevel.DEBUG);
```

#### logOperation(operation: string, message: string, options?: {...}): void

Log a structured operation.

```typescript
logger.logOperation("generate_image", "Image generated successfully", {
  durationMs: 3450,
  metadata: { prompt: "...", width: 1024 },
  level: LogLevel.INFO
});
```

**Options:**
- `durationMs` (number, optional): Operation duration
- `metadata` (Record, optional): Additional metadata
- `error` (Error, optional): Associated error
- `level` (LogLevel, optional): Override log level

**Example Log Entry:**
```typescript
const entry: StructuredLogEntry = {
  timestamp: "2025-12-11T10:30:00Z",
  level: "INFO",
  namespace: "engine",
  operation: "generate_image",
  message: "Image generated successfully",
  durationMs: 3450,
  metadata: { prompt: "...", seed: 42 }
};
```

---

### MLXEngine

Image generation engine using MLX framework.

**Location:** `/src/engines/mlx-engine.ts`

**Configuration Interface:**
```typescript
interface MLXEngineConfig {
  pythonPath: string;
  modelName: string;
  cacheDir?: string;
  timeout: number;
  minPythonVersion: string;
}
```

**Constructor:**
```typescript
new MLXEngine(config: MLXEngineConfig)
```

**Parameters:**
- `pythonPath` (string): Path to Python executable
- `modelName` (string): Name of the model to load
- `cacheDir` (string, optional): Cache directory for models
- `timeout` (number): Operation timeout in milliseconds
- `minPythonVersion` (string): Minimum required Python version

**Example:**
```typescript
const engine = new MLXEngine({
  pythonPath: "/usr/bin/python3",
  modelName: "stable-diffusion-2.1",
  cacheDir: "./models",
  timeout: 60000,
  minPythonVersion: "3.10"
});
```

**Methods:**

#### checkStatus(): Promise<EngineStatus>

Check engine status and dependencies.

```typescript
const status = await engine.checkStatus();
if (status.ready) {
  console.log("Engine is ready");
} else {
  console.error(status.error);
}
```

**Returns:** `EngineStatus` with readiness and dependency info

#### initialize(): Promise<void>

Initialize the engine and load models.

```typescript
try {
  await engine.initialize();
  console.log("Engine initialized");
} catch (err) {
  console.error("Initialization failed", err);
}
```

#### generate(options: ImageGenerationOptions, onProgress?: ProgressCallback): Promise<ImageGenerationResult>

Generate an image.

```typescript
const result = await engine.generate({
  prompt: "A futuristic dashboard",
  width: 1280,
  height: 720,
  steps: 25,
  guidanceScale: 8.0
}, (step, progress, total) => {
  console.log(`[${progress}/${total}] ${step}`);
});

console.log(`Generated in ${result.metadata.latencyMs}ms`);
```

**Parameters:**
- `options` (ImageGenerationOptions): Generation parameters
- `onProgress` (ProgressCallback, optional): Progress callback

**Returns:** `ImageGenerationResult` with generated image and metadata

**Notes:**
- Calls `initialize()` automatically if needed
- Includes performance profiling in result
- Progress callback is optional

#### cleanup(): Promise<void>

Clean up engine resources.

```typescript
await engine.cleanup();
```

**Notes:**
- Should be called when done generating
- Releases memory and processes

---

## Usage Examples

### Basic Image Generation Flow

```typescript
import { MLXEngine } from './engines/mlx-engine';
import { SessionManager } from './session/session-manager';

const engine = new MLXEngine({
  pythonPath: '/usr/bin/python3',
  modelName: 'stable-diffusion-2.1',
  timeout: 60000,
  minPythonVersion: '3.10'
});

const sessionManager = new SessionManager('./sessions');
await sessionManager.initialize();

const session = await sessionManager.createSession();

const result = await engine.generate({
  prompt: 'A professional app icon',
  width: 512,
  height: 512,
  steps: 25,
  guidanceScale: 7.5
});

sessionManager.addIterationToSession(session.id, result.metadata.prompt, result);
await sessionManager.saveSession(session);
```

### Wireframe Generation and Export

```typescript
const wireframe: Wireframe = {
  id: 'wf-001',
  sessionId: session.id,
  description: 'Dashboard layout',
  components: [
    {
      id: 'comp-sidebar',
      type: 'sidebar',
      dimensions: { width: 256, height: 800 }
    },
    {
      id: 'comp-content',
      type: 'content',
      dimensions: { width: 944, height: 800 }
    }
  ],
  metadata: {
    width: 1200,
    height: 800,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

await sessionManager.saveWireframe(session.id, wireframe);
const loaded = await sessionManager.loadWireframe(session.id, wireframe.id);
```

### Monitoring Performance

```typescript
const metricsCollector = sessionManager.getMetricsCollector();

sessionManager.recordMetric('generate_image', 3450);
sessionManager.recordMetric('export_asset', 1250);

const snapshot = metricsCollector.getSnapshot();
console.log(`Active sessions: ${snapshot.activeSessions}`);
console.log(snapshot.operationMetrics['generate_image']);
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-11
