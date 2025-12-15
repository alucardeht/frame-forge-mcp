import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  exportComponent,
  exportComponentToString,
} from '../../src/lib/export-component.js';
import type { WireframeComponent } from '../../src/types/index.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('T072 - Component Export Tests', () => {
  const testOutputDir = path.join(process.cwd(), 'workspace', 'test-exports');

  beforeEach(async () => {
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true });
    } catch {
      // Directory already removed or doesn't exist
    }
  });

  function createMockComponent(
    id: string,
    type: WireframeComponent['type'],
    width: number = 200,
    height: number = 200
  ): WireframeComponent {
    return {
      id,
      type,
      position: { x: 0, y: 0 },
      dimensions: { width, height },
      properties: {
        columns: 3,
        spacing: 10,
      },
    };
  }

  it('should export component to SVG and JSON files', async () => {
    const component = createMockComponent('header-1', 'header', 800, 80);

    const result = await exportComponent(component, testOutputDir);

    expect(result.svgPath).toBeDefined();
    expect(result.metadataPath).toBeDefined();
    expect(result.svgContent).toBeDefined();
    expect(result.metadata).toBeDefined();

    const svgExists = await fs
      .access(result.svgPath)
      .then(() => true)
      .catch(() => false);
    expect(svgExists).toBe(true);

    const metadataExists = await fs
      .access(result.metadataPath)
      .then(() => true)
      .catch(() => false);
    expect(metadataExists).toBe(true);
  });

  it('should generate valid SVG with viewBox', async () => {
    const component = createMockComponent('card-1', 'card', 300, 400);

    const result = await exportComponent(component, testOutputDir);

    expect(result.svgContent).toContain('<svg');
    expect(result.svgContent).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(result.svgContent).toContain('viewBox="0 0 300 400"');
    expect(result.svgContent).toContain('width="300"');
    expect(result.svgContent).toContain('height="400"');
    expect(result.svgContent).toContain('</svg>');
  });

  it('should render sidebar with distinct styling', async () => {
    const component = createMockComponent('sidebar-1', 'sidebar', 250, 600);

    const result = await exportComponent(component, testOutputDir);

    expect(result.svgContent).toContain('fill="#f0f0f0"');
    expect(result.svgContent).toContain('stroke="#cccccc"');
    expect(result.svgContent).toContain('stroke-width="2"');
    expect(result.svgContent).toContain('>Sidebar</text>');
  });

  it('should render header with distinct styling', async () => {
    const component = createMockComponent('header-1', 'header', 800, 60);

    const result = await exportComponent(component, testOutputDir);

    expect(result.svgContent).toContain('fill="#ffffff"');
    expect(result.svgContent).toContain('stroke="#dddddd"');
    expect(result.svgContent).toContain('>Header</text>');
  });

  it('should render footer with distinct styling', async () => {
    const component = createMockComponent('footer-1', 'footer', 800, 40);

    const result = await exportComponent(component, testOutputDir);

    expect(result.svgContent).toContain('fill="#f9f9f9"');
    expect(result.svgContent).toContain('>Footer</text>');
  });

  it('should render grid with dashed pattern', async () => {
    const component = createMockComponent('grid-1', 'grid', 600, 400);

    const result = await exportComponent(component, testOutputDir);

    expect(result.svgContent).toContain('stroke-dasharray="5,5"');
    expect(result.svgContent).toContain('>Grid</text>');
  });

  it('should render card with rounded corners', async () => {
    const component = createMockComponent('card-1', 'card', 250, 300);

    const result = await exportComponent(component, testOutputDir);

    expect(result.svgContent).toContain('rx="4"');
    expect(result.svgContent).toContain('>Card</text>');
    expect(result.svgContent).toContain('<circle');
  });

  it('should render container with dashed border', async () => {
    const component = createMockComponent('container-1', 'container', 500, 300);

    const result = await exportComponent(component, testOutputDir);

    expect(result.svgContent).toContain('stroke-dasharray="3,3"');
    expect(result.svgContent).toContain('>Container</text>');
  });

  it('should include component ID in SVG group', async () => {
    const component = createMockComponent('unique-id-123', 'header');

    const result = await exportComponent(component, testOutputDir);

    expect(result.svgContent).toContain('id="unique-id-123"');
  });

  it('should escape XML special characters in IDs', async () => {
    const component = createMockComponent('id<with>special"chars', 'header');

    const result = await exportComponent(component, testOutputDir);

    expect(result.svgContent).toContain('&lt;');
    expect(result.svgContent).toContain('&gt;');
    expect(result.svgContent).toContain('&quot;');
  });

  it('should sanitize IDs for filename', async () => {
    const component = createMockComponent('id/with<special>chars', 'header');

    const result = await exportComponent(component, testOutputDir);

    const filename = path.basename(result.svgPath);

    expect(filename).not.toContain('/');
    expect(filename).not.toContain('<');
    expect(filename).not.toContain('>');
    expect(filename).toContain('id-with-special-chars');
  });

  it('should include data-type attribute in SVG group', async () => {
    const component = createMockComponent('test-id', 'card');

    const result = await exportComponent(component, testOutputDir);

    expect(result.svgContent).toContain('data-type="card"');
  });

  it('should generate metadata with figmaCompatible flag', async () => {
    const component = createMockComponent('test-id', 'header');

    const result = await exportComponent(component, testOutputDir);

    expect(result.metadata.figmaCompatible).toBe(true);
  });

  it('should include correct metadata structure', async () => {
    const component = createMockComponent('test-id', 'sidebar', 250, 600);
    component.properties = { columns: 2, spacing: 5 };

    const result = await exportComponent(component, testOutputDir);

    expect(result.metadata.id).toBe('test-id');
    expect(result.metadata.type).toBe('sidebar');
    expect(result.metadata.dimensions).toEqual({ width: 250, height: 600 });
    expect(result.metadata.position).toEqual({ x: 0, y: 0 });
    expect(result.metadata.properties).toEqual({ columns: 2, spacing: 5 });
    expect(result.metadata.exportedAt).toBeDefined();
  });

  it('should write valid JSON metadata file', async () => {
    const component = createMockComponent('json-test', 'card');

    const result = await exportComponent(component, testOutputDir);

    const metadataContent = await fs.readFile(result.metadataPath, 'utf-8');
    const parsedMetadata = JSON.parse(metadataContent);

    expect(parsedMetadata.id).toBe('json-test');
    expect(parsedMetadata.type).toBe('card');
    expect(parsedMetadata.figmaCompatible).toBe(true);
  });

  it('should render children recursively', async () => {
    const parentComponent: WireframeComponent = createMockComponent(
      'parent',
      'container'
    );
    parentComponent.children = [
      createMockComponent('child-1', 'card'),
      createMockComponent('child-2', 'grid'),
    ];

    const result = await exportComponent(parentComponent, testOutputDir);

    expect(result.svgContent).toContain('id="parent"');
    expect(result.svgContent).toContain('id="child-1"');
    expect(result.svgContent).toContain('id="child-2"');
    expect(result.svgContent).toContain('data-type="container"');
    expect(result.svgContent).toContain('data-type="card"');
    expect(result.svgContent).toContain('data-type="grid"');
  });

  it('should include children in metadata', async () => {
    const parentComponent: WireframeComponent = createMockComponent(
      'parent',
      'container'
    );
    parentComponent.children = [
      createMockComponent('child-1', 'card'),
      createMockComponent('child-2', 'grid'),
    ];

    const result = await exportComponent(parentComponent, testOutputDir);

    expect(result.metadata.children).toHaveLength(2);
    expect(result.metadata.children[0]).toEqual({ id: 'child-1', type: 'card' });
    expect(result.metadata.children[1]).toEqual({ id: 'child-2', type: 'grid' });
  });

  it('should use default dimensions if not provided', async () => {
    const component: WireframeComponent = {
      id: 'default-dims',
      type: 'header',
    };

    const result = await exportComponent(component, testOutputDir);

    expect(result.svgContent).toContain('width="100"');
    expect(result.svgContent).toContain('height="100"');
    expect(result.svgContent).toContain('viewBox="0 0 100 100"');
  });

  it('should export to string without filesystem', async () => {
    const component = createMockComponent('string-export', 'card', 300, 400);

    const result = await exportComponentToString(component);

    expect(result.svg).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('</svg>');
    expect(result.metadata.figmaCompatible).toBe(true);
  });

  it('should match string export with file export content', async () => {
    const component = createMockComponent('match-test', 'header');

    const fileResult = await exportComponent(component, testOutputDir);
    const stringResult = await exportComponentToString(component);

    expect(stringResult.svg).toBe(fileResult.svgContent);

    const { exportedAt: _, ...fileMetadata } = fileResult.metadata;
    const { exportedAt: __, ...stringMetadata } = stringResult.metadata;

    expect(stringMetadata).toEqual(fileMetadata);
  });

  it('should export without position if not provided', async () => {
    const component: WireframeComponent = {
      id: 'no-position',
      type: 'card',
      dimensions: { width: 300, height: 300 },
    };

    const result = await exportComponent(component, testOutputDir);

    expect(result.metadata.position).toBeUndefined();
  });

  it('should export with position if provided', async () => {
    const component: WireframeComponent = {
      id: 'with-position',
      type: 'card',
      position: { x: 100, y: 200 },
      dimensions: { width: 300, height: 300 },
    };

    const result = await exportComponent(component, testOutputDir);

    expect(result.metadata.position).toEqual({ x: 100, y: 200 });
  });

  it('should include empty children array if none exist', async () => {
    const component = createMockComponent('no-children', 'header');

    const result = await exportComponent(component, testOutputDir);

    expect(result.metadata.children).toEqual([]);
  });

  it('should timestamp metadata correctly', async () => {
    const component = createMockComponent('timestamp-test', 'card');
    const beforeExport = new Date();

    const result = await exportComponent(component, testOutputDir);

    const afterExport = new Date();
    const exportedDate = new Date(result.metadata.exportedAt);

    expect(exportedDate.getTime()).toBeGreaterThanOrEqual(beforeExport.getTime());
    expect(exportedDate.getTime()).toBeLessThanOrEqual(afterExport.getTime());
  });

  it('should create output directory if it does not exist', async () => {
    const newDir = path.join(testOutputDir, 'nested', 'deep', 'dir');
    const component = createMockComponent('deep-dir-test', 'header');

    const result = await exportComponent(component, newDir);

    const svgExists = await fs
      .access(result.svgPath)
      .then(() => true)
      .catch(() => false);
    expect(svgExists).toBe(true);
  });

  it('should handle component with empty properties', async () => {
    const component: WireframeComponent = {
      id: 'empty-props',
      type: 'header',
      dimensions: { width: 200, height: 50 },
    };

    const result = await exportComponent(component, testOutputDir);

    expect(result.metadata.properties).toEqual({});
  });

  it('should render multiple nested children', async () => {
    const rootComponent: WireframeComponent = {
      id: 'root',
      type: 'container',
      dimensions: { width: 600, height: 800 },
      children: [
        {
          id: 'header-section',
          type: 'header',
          dimensions: { width: 600, height: 80 },
          children: [
            {
              id: 'logo',
              type: 'card',
              dimensions: { width: 60, height: 60 },
            },
          ],
        },
        {
          id: 'content-section',
          type: 'content',
          dimensions: { width: 600, height: 600 },
        },
      ],
    };

    const result = await exportComponent(rootComponent, testOutputDir);

    expect(result.svgContent).toContain('id="root"');
    expect(result.svgContent).toContain('id="header-section"');
    expect(result.svgContent).toContain('id="logo"');
    expect(result.svgContent).toContain('id="content-section"');

    expect(result.metadata.children).toHaveLength(2);
    expect(result.metadata.children[0].id).toBe('header-section');
    expect(result.metadata.children[1].id).toBe('content-section');
  });
});
