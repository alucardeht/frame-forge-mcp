import { WireframeComponent } from '../types/index.js';
import { promises as fs } from 'fs';
import path from 'path';

export interface ExportResult {
  svgPath: string;
  metadataPath: string;
  svgContent: string;
  metadata: ComponentMetadata;
}

export interface ComponentMetadata {
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
}

function generateSVGForComponent(component: WireframeComponent): string {
  const width = component.dimensions?.width ?? 100;
  const height = component.dimensions?.height ?? 100;

  const svgParts: string[] = [];
  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );

  svgParts.push(renderComponent(component, 0, 0));

  svgParts.push('</svg>');

  return svgParts.join('\n');
}

function renderComponent(
  component: WireframeComponent,
  offsetX: number,
  offsetY: number
): string {
  const x = (component.position?.x ?? 0) + offsetX;
  const y = (component.position?.y ?? 0) + offsetY;
  const width = component.dimensions?.width ?? 100;
  const height = component.dimensions?.height ?? 100;

  const parts: string[] = [];

  parts.push(`<g id="${escapeXml(component.id)}" data-type="${component.type}">`);

  switch (component.type) {
    case 'sidebar':
      parts.push(
        `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#f0f0f0" stroke="#cccccc" stroke-width="2"/>`
      );
      parts.push(
        `<text x="${x + 10}" y="${y + 30}" font-family="Arial" font-size="14" fill="#333333">Sidebar</text>`
      );
      break;

    case 'header':
      parts.push(
        `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#ffffff" stroke="#dddddd" stroke-width="1"/>`
      );
      parts.push(
        `<text x="${x + 20}" y="${y + height / 2 + 5}" font-family="Arial" font-size="16" fill="#000000">Header</text>`
      );
      break;

    case 'footer':
      parts.push(
        `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#f9f9f9" stroke="#dddddd" stroke-width="1"/>`
      );
      parts.push(
        `<text x="${x + 20}" y="${y + height / 2 + 5}" font-family="Arial" font-size="12" fill="#666666">Footer</text>`
      );
      break;

    case 'grid':
      parts.push(
        `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#ffffff" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="5,5"/>`
      );
      parts.push(
        `<text x="${x + 10}" y="${y + 20}" font-family="Arial" font-size="12" fill="#999999">Grid</text>`
      );
      break;

    case 'card':
      parts.push(
        `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#ffffff" stroke="#dddddd" stroke-width="1" rx="4"/>`
      );
      parts.push(`<circle cx="${x + 20}" cy="${y + 20}" r="8" fill="#cccccc"/>`);
      parts.push(
        `<text x="${x + 10}" y="${y + 50}" font-family="Arial" font-size="12" fill="#333333">Card</text>`
      );
      break;

    case 'content':
      parts.push(
        `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#fafafa" stroke="#e0e0e0" stroke-width="1"/>`
      );
      parts.push(
        `<text x="${x + 10}" y="${y + 20}" font-family="Arial" font-size="12" fill="#666666">Content</text>`
      );
      break;

    case 'container':
      parts.push(
        `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="#bbbbbb" stroke-width="1" stroke-dasharray="3,3"/>`
      );
      parts.push(
        `<text x="${x + 10}" y="${y + 20}" font-family="Arial" font-size="11" fill="#999999">Container</text>`
      );
      break;

    default:
      parts.push(
        `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#f0f0f0" stroke="#cccccc" stroke-width="1"/>`
      );
  }

  if (component.children) {
    for (const child of component.children) {
      parts.push(renderComponent(child, x, y));
    }
  }

  parts.push('</g>');

  return parts.join('\n');
}

function generateMetadata(component: WireframeComponent): ComponentMetadata {
  return {
    id: component.id,
    type: component.type,
    dimensions: {
      width: component.dimensions?.width ?? 0,
      height: component.dimensions?.height ?? 0,
    },
    position: component.position
      ? {
          x: component.position.x,
          y: component.position.y,
        }
      : undefined,
    properties: component.properties ?? {},
    children: component.children
      ? component.children.map((child) => ({
          id: child.id,
          type: child.type,
        }))
      : [],
    exportedAt: new Date().toISOString(),
    figmaCompatible: true,
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function exportComponent(
  component: WireframeComponent,
  outputDir: string
): Promise<ExportResult> {
  await fs.mkdir(outputDir, { recursive: true });

  const svgContent = generateSVGForComponent(component);
  const metadata = generateMetadata(component);

  const sanitizedId = component.id.replace(/[^a-zA-Z0-9-_]/g, '-');
  const svgPath = path.join(outputDir, `${sanitizedId}.svg`);
  const metadataPath = path.join(outputDir, `${sanitizedId}.json`);

  await fs.writeFile(svgPath, svgContent, 'utf-8');
  await fs.writeFile(
    metadataPath,
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  return {
    svgPath,
    metadataPath,
    svgContent,
    metadata,
  };
}

export async function exportComponentToString(
  component: WireframeComponent
): Promise<{ svg: string; metadata: ComponentMetadata }> {
  const svgContent = generateSVGForComponent(component);
  const metadata = generateMetadata(component);

  return {
    svg: svgContent,
    metadata,
  };
}

export interface BatchExportResult {
  totalComponents: number;
  exportedComponents: Array<{
    id: string;
    type: string;
    svgPath: string;
    metadataPath: string;
  }>;
  outputDirectory: string;
  exportedAt: string;
}

function flattenComponentTree(component: WireframeComponent): WireframeComponent[] {
  const result: WireframeComponent[] = [component];

  if (component.children) {
    for (const child of component.children) {
      result.push(...flattenComponentTree(child));
    }
  }

  return result;
}

export async function batchExportComponents(
  wireframe: {
    components: WireframeComponent[];
    metadata?: {
      width: number;
      height: number;
    };
  },
  outputDir: string
): Promise<BatchExportResult> {
  await fs.mkdir(outputDir, { recursive: true });

  const allComponents: WireframeComponent[] = [];
  for (const component of wireframe.components) {
    allComponents.push(...flattenComponentTree(component));
  }

  const exportedComponents: BatchExportResult['exportedComponents'] = [];

  for (const component of allComponents) {
    const result = await exportComponent(component, outputDir);
    exportedComponents.push({
      id: component.id,
      type: component.type,
      svgPath: result.svgPath,
      metadataPath: result.metadataPath,
    });
  }

  const manifestPath = path.join(outputDir, 'export-manifest.json');
  const manifest = {
    totalComponents: allComponents.length,
    exportedAt: new Date().toISOString(),
    wireframeMetadata: wireframe.metadata,
    components: exportedComponents,
  };

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  return {
    totalComponents: allComponents.length,
    exportedComponents,
    outputDirectory: outputDir,
    exportedAt: manifest.exportedAt,
  };
}

export async function batchExportComponentsToStrings(
  wireframe: {
    components: WireframeComponent[];
    metadata?: {
      width: number;
      height: number;
    };
  }
): Promise<
  Array<{
    id: string;
    type: string;
    svg: string;
    metadata: ComponentMetadata;
  }>
> {
  const allComponents: WireframeComponent[] = [];
  for (const component of wireframe.components) {
    allComponents.push(...flattenComponentTree(component));
  }

  const results: Array<{
    id: string;
    type: string;
    svg: string;
    metadata: ComponentMetadata;
  }> = [];

  for (const component of allComponents) {
    const exported = await exportComponentToString(component);
    results.push({
      id: component.id,
      type: component.type,
      svg: exported.svg,
      metadata: exported.metadata,
    });
  }

  return results;
}
