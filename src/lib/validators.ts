export interface DimensionValidationResult {
  valid: boolean;
  reason?: string;
  recommended?: { width: number; height: number };
}

const ICON_MIN_SIZE = 64;
const ICON_MAX_SIZE = 512;
const ICON_PREFERRED_SIZE = 256;
const ICON_ASPECT_RATIO_TOLERANCE = 0.2;

const BANNER_WIDTH_MIN = 800;
const BANNER_WIDTH_MAX = 2000;
const BANNER_HEIGHT_MIN = 200;
const BANNER_HEIGHT_MAX = 600;
const BANNER_PREFERRED_WIDTH = 1200;
const BANNER_PREFERRED_HEIGHT = 400;
const BANNER_ASPECT_RATIO_MIN = 2.5;
const BANNER_ASPECT_RATIO_MAX = 4;

const MOCKUP_MIN_DIMENSION = 400;
const MOCKUP_MAX_DIMENSION = 2000;
const MOCKUP_PREFERRED_WIDTH = 1920;
const MOCKUP_PREFERRED_HEIGHT = 1080;

function isIconDimensionValid(width: number, height: number): boolean {
  const withinRange = width >= ICON_MIN_SIZE && width <= ICON_MAX_SIZE &&
                      height >= ICON_MIN_SIZE && height <= ICON_MAX_SIZE;

  if (!withinRange) return false;

  const aspectRatio = width / height;
  const isSquareEnough = Math.abs(aspectRatio - 1) <= ICON_ASPECT_RATIO_TOLERANCE;

  return isSquareEnough;
}

function isBannerDimensionValid(width: number, height: number): boolean {
  const widthValid = width >= BANNER_WIDTH_MIN && width <= BANNER_WIDTH_MAX;
  const heightValid = height >= BANNER_HEIGHT_MIN && height <= BANNER_HEIGHT_MAX;

  if (!widthValid || !heightValid) return false;

  const aspectRatio = width / height;
  const aspectRatioValid = aspectRatio >= BANNER_ASPECT_RATIO_MIN &&
                          aspectRatio <= BANNER_ASPECT_RATIO_MAX;

  return aspectRatioValid;
}

function isMockupDimensionValid(width: number, height: number): boolean {
  const widthValid = width >= MOCKUP_MIN_DIMENSION && width <= MOCKUP_MAX_DIMENSION;
  const heightValid = height >= MOCKUP_MIN_DIMENSION && height <= MOCKUP_MAX_DIMENSION;

  return widthValid && heightValid;
}

function getIconValidationFailureReason(width: number, height: number): string {
  const withinRange = width >= ICON_MIN_SIZE && width <= ICON_MAX_SIZE &&
                      height >= ICON_MIN_SIZE && height <= ICON_MAX_SIZE;

  if (!withinRange) {
    return `Icon dimensions must be between ${ICON_MIN_SIZE}px and ${ICON_MAX_SIZE}px`;
  }

  return 'Icons should be roughly square (aspect ratio 1:1)';
}

function getBannerValidationFailureReason(width: number, height: number): string {
  const widthValid = width >= BANNER_WIDTH_MIN && width <= BANNER_WIDTH_MAX;
  const heightValid = height >= BANNER_HEIGHT_MIN && height <= BANNER_HEIGHT_MAX;
  const aspectRatio = width / height;
  const aspectRatioValid = aspectRatio >= BANNER_ASPECT_RATIO_MIN &&
                          aspectRatio <= BANNER_ASPECT_RATIO_MAX;

  if (!widthValid || !heightValid) {
    return `Banner width should be ${BANNER_WIDTH_MIN}-${BANNER_WIDTH_MAX}px and height ${BANNER_HEIGHT_MIN}-${BANNER_HEIGHT_MAX}px, with ~3:1 aspect ratio`;
  }

  if (!aspectRatioValid) {
    return `Banner width should be ${BANNER_WIDTH_MIN}-${BANNER_WIDTH_MAX}px and height ${BANNER_HEIGHT_MIN}-${BANNER_HEIGHT_MAX}px, with ~3:1 aspect ratio`;
  }

  return 'Banner dimensions are invalid';
}

function getMockupValidationFailureReason(): string {
  return `Mockup dimensions should be at least ${MOCKUP_MIN_DIMENSION}px in each dimension`;
}

export function validateAssetDimensions(
  type: 'icon' | 'banner' | 'mockup',
  width: number,
  height: number
): DimensionValidationResult {
  if (type === 'icon') {
    if (isIconDimensionValid(width, height)) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: getIconValidationFailureReason(width, height),
      recommended: {
        width: ICON_PREFERRED_SIZE,
        height: ICON_PREFERRED_SIZE
      },
    };
  }

  if (type === 'banner') {
    if (isBannerDimensionValid(width, height)) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: getBannerValidationFailureReason(width, height),
      recommended: {
        width: BANNER_PREFERRED_WIDTH,
        height: BANNER_PREFERRED_HEIGHT
      },
    };
  }

  if (type === 'mockup') {
    if (isMockupDimensionValid(width, height)) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: getMockupValidationFailureReason(),
      recommended: {
        width: MOCKUP_PREFERRED_WIDTH,
        height: MOCKUP_PREFERRED_HEIGHT
      },
    };
  }

  return { valid: false, reason: 'Unknown asset type' };
}

export interface ComponentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ComponentInput {
  type: string;
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
}

export function validateComponentCombination(
  components: ComponentInput[]
): ComponentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const componentTypes = components.map((c) => c.type);
  const headerCount = componentTypes.filter((t) => t === 'header').length;
  const footerCount = componentTypes.filter((t) => t === 'footer').length;
  const sidebarCount = componentTypes.filter((t) => t === 'sidebar').length;

  if (headerCount > 1) {
    errors.push('Only one header component is allowed per wireframe');
  }

  if (footerCount > 1) {
    errors.push('Only one footer component is allowed per wireframe');
  }

  if (sidebarCount > 2) {
    errors.push('Maximum of 2 sidebar components allowed (left and right)');
  }

  const sidebars = components.filter((c) => c.type === 'sidebar');
  if (sidebars.length === 2) {
    const positions = sidebars.map((s) => s.position?.x || 0);
    if (positions[0] === positions[1]) {
      errors.push('Two sidebars cannot occupy the same position');
    }
  }

  if (componentTypes.includes('grid') && componentTypes.includes('content')) {
    warnings.push('Having both grid and content components may lead to layout confusion');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateLayoutProportions(
  canvasWidth: number,
  canvasHeight: number,
  components: ComponentInput[]
): ComponentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const sidebars = components.filter((c) => c.type === 'sidebar');
  const totalSidebarWidth = sidebars.reduce((sum, s) => sum + (s.dimensions?.width || 0), 0);

  if (totalSidebarWidth >= canvasWidth) {
    errors.push(
      `Sidebar width (${totalSidebarWidth}px) exceeds canvas width (${canvasWidth}px)`
    );
  }

  if (totalSidebarWidth > canvasWidth * 0.6) {
    warnings.push(
      `Sidebars occupy more than 60% of canvas width (${totalSidebarWidth}px / ${canvasWidth}px)`
    );
  }

  const header = components.find((c) => c.type === 'header');
  const footer = components.find((c) => c.type === 'footer');
  const verticalReserved = (header?.dimensions?.height || 0) + (footer?.dimensions?.height || 0);

  if (verticalReserved >= canvasHeight) {
    errors.push(
      `Header + footer height (${verticalReserved}px) exceeds canvas height (${canvasHeight}px)`
    );
  }

  if (verticalReserved > canvasHeight * 0.4) {
    warnings.push('Header and footer occupy more than 40% of canvas height');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getValidComponentsFor(parentType: string): string[] {
  const validChildren: Record<string, string[]> = {
    grid: ['card'],
    container: ['card', 'content', 'grid'],
    card: [],
    sidebar: [],
    header: [],
    footer: [],
    content: [],
  };

  return validChildren[parentType] || [];
}

export function canContain(parentType: string, childType: string): boolean {
  const validChildren = getValidComponentsFor(parentType);
  return validChildren.includes(childType);
}

export interface LayoutIntegrityResult {
  isValid: boolean;
  errors: Array<{
    componentId: string;
    issue: string;
    severity: 'error' | 'warning';
  }>;
  suggestedFixes?: Array<{
    componentId: string;
    fix: string;
    adjustment: {
      dimensions?: { width?: number; height?: number };
      position?: { x?: number; y?: number };
    };
  }>;
}

const COMPONENT_MIN_DIMENSION = 50;

function checkOverlap(
  pos1: { x: number; y: number },
  dim1: { width: number; height: number },
  pos2: { x: number; y: number },
  dim2: { width: number; height: number }
): boolean {
  const right1 = pos1.x + dim1.width;
  const bottom1 = pos1.y + dim1.height;
  const right2 = pos2.x + dim2.width;
  const bottom2 = pos2.y + dim2.height;

  return !(
    pos1.x >= right2 ||
    right1 <= pos2.x ||
    pos1.y >= bottom2 ||
    bottom1 <= pos2.y
  );
}

export function checkLayoutIntegrity(
  canvasWidth: number,
  canvasHeight: number,
  components: Array<{
    id: string;
    type: string;
    position?: { x: number; y: number };
    dimensions?: { width: number; height: number };
    children?: unknown[];
  }>
): LayoutIntegrityResult {
  const result: LayoutIntegrityResult = {
    isValid: true,
    errors: [],
    suggestedFixes: [],
  };

  for (const component of components) {
    if (!component.position || !component.dimensions) {
      continue;
    }

    const { x, y } = component.position;
    const { width, height } = component.dimensions;

    if (x < 0 || y < 0) {
      result.isValid = false;
      result.errors.push({
        componentId: component.id,
        issue: `Component positioned outside canvas bounds (x: ${x}, y: ${y})`,
        severity: 'error',
      });
      result.suggestedFixes?.push({
        componentId: component.id,
        fix: 'Reposition to (0, 0)',
        adjustment: {
          position: { x: 0, y: 0 },
        },
      });
    }

    if (x + width > canvasWidth) {
      result.isValid = false;
      result.errors.push({
        componentId: component.id,
        issue: `Component extends beyond canvas width (${x + width} > ${canvasWidth})`,
        severity: 'error',
      });
      result.suggestedFixes?.push({
        componentId: component.id,
        fix: `Reduce width to ${canvasWidth - x}px`,
        adjustment: {
          dimensions: { width: canvasWidth - x },
        },
      });
    }

    if (y + height > canvasHeight) {
      result.isValid = false;
      result.errors.push({
        componentId: component.id,
        issue: `Component extends beyond canvas height (${y + height} > ${canvasHeight})`,
        severity: 'error',
      });
      result.suggestedFixes?.push({
        componentId: component.id,
        fix: `Reduce height to ${canvasHeight - y}px`,
        adjustment: {
          dimensions: { height: canvasHeight - y },
        },
      });
    }

    if (width < COMPONENT_MIN_DIMENSION) {
      result.errors.push({
        componentId: component.id,
        issue: `Component width too small (${width}px < ${COMPONENT_MIN_DIMENSION}px minimum)`,
        severity: 'warning',
      });
      result.suggestedFixes?.push({
        componentId: component.id,
        fix: `Set width to ${COMPONENT_MIN_DIMENSION}px minimum`,
        adjustment: {
          dimensions: { width: COMPONENT_MIN_DIMENSION },
        },
      });
    }

    if (height < COMPONENT_MIN_DIMENSION) {
      result.errors.push({
        componentId: component.id,
        issue: `Component height too small (${height}px < ${COMPONENT_MIN_DIMENSION}px minimum)`,
        severity: 'warning',
      });
      result.suggestedFixes?.push({
        componentId: component.id,
        fix: `Set height to ${COMPONENT_MIN_DIMENSION}px minimum`,
        adjustment: {
          dimensions: { height: COMPONENT_MIN_DIMENSION },
        },
      });
    }
  }

  for (let i = 0; i < components.length; i++) {
    const comp1 = components[i];
    if (!comp1.position || !comp1.dimensions) continue;

    for (let j = i + 1; j < components.length; j++) {
      const comp2 = components[j];
      if (!comp2.position || !comp2.dimensions) continue;

      const overlap = checkOverlap(
        comp1.position,
        comp1.dimensions,
        comp2.position,
        comp2.dimensions
      );

      if (overlap && comp1.type !== 'grid' && comp2.type !== 'card') {
        result.errors.push({
          componentId: comp1.id,
          issue: `Component overlaps with ${comp2.id}`,
          severity: 'warning',
        });
      }
    }
  }

  return result;
}

export function autoFixLayoutIssues(
  components: Array<{
    id: string;
    type: string;
    position?: { x: number; y: number };
    dimensions?: { width: number; height: number };
    children?: unknown[];
  }>,
  integrityResult: LayoutIntegrityResult
): Array<{
  id: string;
  type: string;
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
  children?: unknown[];
}> {
  if (!integrityResult.suggestedFixes || integrityResult.suggestedFixes.length === 0) {
    return components;
  }

  const fixMap = new Map(
    integrityResult.suggestedFixes.map((fix) => [fix.componentId, fix.adjustment])
  );

  return components.map((component) => {
    const fix = fixMap.get(component.id);
    if (!fix) return component;

    const updated = { ...component };

    if (fix.position) {
      updated.position = {
        ...(updated.position ?? { x: 0, y: 0 }),
        ...fix.position,
      };
    }

    if (fix.dimensions) {
      updated.dimensions = {
        ...(updated.dimensions ?? { width: 0, height: 0 }),
        ...fix.dimensions,
      };
    }

    return updated;
  });
}

export interface FileSizeValidationResult {
  valid: boolean;
  sizeMB: number;
  limitMB: number;
  exceedsLimit: boolean;
  suggestedAction?: string;
}

export function validateFileSize(
  fileSizeBytes: number,
  maxSizeMB: number = 10
): FileSizeValidationResult {
  const sizeMB = fileSizeBytes / (1024 * 1024);
  const exceedsLimit = sizeMB > maxSizeMB;

  const result: FileSizeValidationResult = {
    valid: !exceedsLimit,
    sizeMB: Math.round(sizeMB * 100) / 100,
    limitMB: maxSizeMB,
    exceedsLimit,
  };

  if (exceedsLimit) {
    result.suggestedAction = `Image size (${result.sizeMB}MB) exceeds limit (${maxSizeMB}MB). Please compress the image or use a smaller file.`;
  }

  return result;
}

export const SUPPORTED_IMAGE_FORMATS = ['png', 'jpg', 'jpeg', 'webp'] as const;
export const UNSUPPORTED_IMAGE_FORMATS = ['heic', 'heif', 'tiff', 'tif', 'bmp', 'gif', 'svg'] as const;

export type SupportedImageFormat = typeof SUPPORTED_IMAGE_FORMATS[number];
export type UnsupportedImageFormat = typeof UNSUPPORTED_IMAGE_FORMATS[number];

export interface FormatValidationResult {
  valid: boolean;
  format: string;
  isSupported: boolean;
  suggestedFormats?: SupportedImageFormat[];
  suggestedAction?: string;
}

export function validateImageFormat(
  filename: string,
  mimeType?: string
): FormatValidationResult {
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  let detectedFormat = extension;
  if (mimeType) {
    const mimeFormat = mimeType.split('/').pop()?.toLowerCase();
    if (mimeFormat && mimeFormat !== 'octet-stream') {
      detectedFormat = mimeFormat;
    }
  }

  const isSupported = SUPPORTED_IMAGE_FORMATS.includes(detectedFormat as SupportedImageFormat);
  const isUnsupported = UNSUPPORTED_IMAGE_FORMATS.includes(detectedFormat as UnsupportedImageFormat);

  const result: FormatValidationResult = {
    valid: isSupported,
    format: detectedFormat,
    isSupported,
  };

  if (!isSupported) {
    result.suggestedFormats = [...SUPPORTED_IMAGE_FORMATS];

    if (isUnsupported) {
      result.suggestedAction = `Format '${detectedFormat}' is not supported. Please convert to PNG, JPG, or WebP format before uploading.`;
    } else {
      result.suggestedAction = `Unknown format '${detectedFormat}'. Supported formats: ${SUPPORTED_IMAGE_FORMATS.join(', ')}.`;
    }
  }

  return result;
}
