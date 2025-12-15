import type { MCPTool, MCPToolResult } from '../../types/index.js';
import { generateImageTool, handleGenerateImage } from './generate-image.js';
import { checkEngineStatusTool, handleCheckEngineStatus } from './check-engine-status.js';
import { listSessionsTool, handleListSessions } from './list-sessions.js';
import { rollbackIterationTool, handleRollbackIteration } from './rollback-iteration.js';
import { previewIterationTool, handlePreviewIteration } from './preview-iteration.js';
import { listAvailableModelsTool, handleListAvailableModels } from './list-available-models.js';
import { listIterationsTool, handleListIterations } from './list-iterations.js';
import { compareIterationsTool, handleCompareIterations } from './compare-iterations.js';
import { resolveIterationReferenceTool, handleResolveIterationReference } from './resolve-iteration-reference.js';
import { exportImageTool, handleExportImage } from './export-image.js';
import { undoTool, handleUndo } from './undo.js';
import { redoTool, handleRedo } from './redo.js';
import { generateVariantsTool, handleGenerateVariants } from './generate-variants.js';
import { selectVariantTool, handleSelectVariant } from './select-variant.js';
import { refineAssetTool, handleRefineAsset } from './refine-asset.js';
import { generateBannerTool, handleGenerateBanner } from './generate-banner.js';
import { exportAssetTool, handleExportAsset } from './export-asset.js';
import { generateWireframeSchema, handleGenerateWireframe } from './generate-wireframe.js';
import { updateComponentSchema, handleUpdateComponent } from './update-component.js';
import { refineComponentSchema, handleRefineComponent } from './refine-component.js';
import { adjustProportionsSchema, handleAdjustProportions } from './adjust-proportions.js';
import { showComponentSchema, handleShowComponent } from './show-component.js';
import { undoWireframeSchema, handleUndoWireframe } from './undo-wireframe.js';
import { MLXEngine } from '../../engines/mlx-engine.js';
import { SessionManager } from '../../session/session-manager.js';

export const ALL_TOOLS: MCPTool[] = [
  generateImageTool,
  checkEngineStatusTool,
  listSessionsTool,
  rollbackIterationTool,
  previewIterationTool,
  listAvailableModelsTool,
  listIterationsTool,
  compareIterationsTool,
  resolveIterationReferenceTool,
  exportImageTool,
  undoTool,
  redoTool,
  generateVariantsTool,
  selectVariantTool,
  refineAssetTool,
  generateBannerTool,
  exportAssetTool,
  generateWireframeSchema as unknown as MCPTool,
  updateComponentSchema as unknown as MCPTool,
  refineComponentSchema as unknown as MCPTool,
  adjustProportionsSchema as unknown as MCPTool,
  showComponentSchema as unknown as MCPTool,
  undoWireframeSchema as unknown as MCPTool,
];

export type ToolHandler = (
  args: Record<string, unknown>,
  engine: MLXEngine,
  sessionManager: SessionManager
) => Promise<MCPToolResult>;

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  'generate-image': handleGenerateImage as ToolHandler,
  'check-engine-status': async (
    _args: Record<string, unknown>,
    engine: MLXEngine
  ): Promise<MCPToolResult> => {
    return handleCheckEngineStatus(engine);
  },
  'list-sessions': async (
    _args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleListSessions(sessionManager);
  },
  'rollback-iteration': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleRollbackIteration(args, sessionManager);
  },
  'preview-iteration': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handlePreviewIteration(args, sessionManager);
  },
  'list-available-models': async (
    _args: Record<string, unknown>,
    _engine: MLXEngine,
    _sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleListAvailableModels();
  },
  'list-iterations': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleListIterations(args, sessionManager);
  },
  'compare-iterations': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleCompareIterations(args, sessionManager);
  },
  'resolve-iteration-reference': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleResolveIterationReference(args, sessionManager);
  },
  'export-image': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleExportImage(args, sessionManager);
  },
  'undo': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleUndo(args, sessionManager);
  },
  'redo': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleRedo(args, sessionManager);
  },
  'generate-variants': async (
    args: Record<string, unknown>,
    engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleGenerateVariants(args, engine, sessionManager);
  },
  'select-variant': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleSelectVariant(args, sessionManager);
  },
  'refine-asset': async (
    args: Record<string, unknown>,
    engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleRefineAsset(args, engine, sessionManager);
  },
  'generate-banner': async (
    args: Record<string, unknown>,
    engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleGenerateBanner(args, engine, sessionManager);
  },
  'export-asset': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleExportAsset(args, sessionManager);
  },
  'generate-wireframe': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleGenerateWireframe(args, sessionManager);
  },
  'update-component': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleUpdateComponent(args, sessionManager);
  },
  'refine-component': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleRefineComponent(args, sessionManager);
  },
  'adjust-proportions': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleAdjustProportions(args, sessionManager);
  },
  'show-component': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleShowComponent(args, sessionManager);
  },
  'undo-wireframe': async (
    args: Record<string, unknown>,
    _engine: MLXEngine,
    sessionManager: SessionManager
  ): Promise<MCPToolResult> => {
    return handleUndoWireframe(args, sessionManager);
  },
};

export {
  generateImageTool,
  handleGenerateImage,
  checkEngineStatusTool,
  handleCheckEngineStatus,
  listSessionsTool,
  handleListSessions,
  rollbackIterationTool,
  handleRollbackIteration,
  previewIterationTool,
  handlePreviewIteration,
  listAvailableModelsTool,
  handleListAvailableModels,
  listIterationsTool,
  handleListIterations,
  compareIterationsTool,
  handleCompareIterations,
  resolveIterationReferenceTool,
  handleResolveIterationReference,
  exportImageTool,
  handleExportImage,
  undoTool,
  handleUndo,
  redoTool,
  handleRedo,
  generateVariantsTool,
  handleGenerateVariants,
  selectVariantTool,
  handleSelectVariant,
  refineAssetTool,
  handleRefineAsset,
  generateBannerTool,
  handleGenerateBanner,
  exportAssetTool,
  handleExportAsset,
  generateWireframeSchema,
  handleGenerateWireframe,
  updateComponentSchema,
  handleUpdateComponent,
  refineComponentSchema,
  handleRefineComponent,
  adjustProportionsSchema,
  handleAdjustProportions,
  showComponentSchema,
  handleShowComponent,
  undoWireframeSchema,
  handleUndoWireframe,
};
