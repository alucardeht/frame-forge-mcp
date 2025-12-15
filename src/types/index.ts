import type { ProfilingResult } from '../lib/profiler.js';

export interface ImageGenerationOptions {
  prompt: string;
  width: number;
  height: number;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
}

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
  profiling?: ProfilingResult;
}

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

export interface ProgressCallback {
  (step: string, progress: number, total: number): void;
}

export interface MCPToolInputSchema {
  type: string;
  properties: Record<string, {
    type: string;
    description?: string;
    default?: unknown;
  }>;
  required?: string[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: MCPToolInputSchema;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPContentBlock {
  type: "text" | "image";
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface MCPToolResult {
  content: MCPContentBlock[];
}

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

export interface Refinement {
  variantId: string;
  refinementPrompt: string;
  baseVariantId: string;
  timestamp: string;
}

export interface AssetSession {
  type: 'icon' | 'banner' | 'mockup';
  allVariants: Variant[];
  selectedVariantId?: string;
  refinements: Refinement[];
}

export interface WireframeSession {
  id: string;
  wireframes: Wireframe[];
  currentWireframeId?: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface PerformanceMetrics {
  totalDurationMs: number;
  operationTimings: Record<string, {
    durationMs: number;
    count: number;
    averageMs: number;
  }>;
  timestamp: string;
}

export interface GenerationMetrics {
  totalGenerationTimeMs: number;
  perVariantAverageMs: number;
}

export interface ExportMetrics {
  totalExportTimeMs: number;
  formatTimings: Record<string, number>;
}

export interface WireframeComponent {
  id: string;
  type: 'sidebar' | 'header' | 'footer' | 'grid' | 'card' | 'container' | 'content';
  position?: {
    x: number;
    y: number;
  };
  dimensions?: {
    width: number;
    height: number;
  };
  properties?: {
    columns?: number;
    spacing?: number;
    slots?: string[];
    [key: string]: unknown;
  };
  children?: WireframeComponent[];
}

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

export interface WireframeGenerationResult {
  wireframe: Wireframe;
  parsedLayout: {
    componentTypes: string[];
    layoutPattern: string;
  };
}

export interface ExportMetadata {
  format: 'svg' | 'json' | 'png';
  exportedAt: string;
  exportedBy?: string;
  version: string;
  figmaCompatible: boolean;
}

export interface ComponentExportData {
  component: WireframeComponent;
  svg: string;
  metadata: {
    id: string;
    type: string;
    dimensions: {
      width: number;
      height: number;
    };
    position?: {
      x: number;
      y: number;
    };
    properties: Record<string, unknown>;
    children: Array<{
      id: string;
      type: string;
    }>;
    exportedAt: string;
    figmaCompatible: boolean;
  };
}

export interface WireframeExportManifest {
  wireframeId: string;
  exportedAt: string;
  totalComponents: number;
  canvasDimensions: {
    width: number;
    height: number;
  };
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

export interface ComponentRenderOptions {
  includeChildren: boolean;
  applyStyles: boolean;
  exportFormat: 'svg' | 'png';
  quality?: number;
  backgroundColor?: string;
}

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

export interface VersionHistory {
  wireframeId: string;
  componentId: string;
  versions: ComponentVersion[];
  currentVersionId: string;
}
