export interface WireframeTemplate {
  name: string;
  description: string;
  layoutPattern: string;
  defaultDimensions: {
    width: number;
    height: number;
  };
  components: Array<{
    type: 'sidebar' | 'header' | 'footer' | 'grid' | 'card' | 'container' | 'content';
    widthPercent?: number;
    heightPercent?: number;
    widthPx?: number;
    heightPx?: number;
    position?: 'left' | 'right' | 'top' | 'bottom' | 'center';
    properties?: {
      columns?: number;
      spacing?: number;
      slots?: string[];
      [key: string]: unknown;
    };
  }>;
}

export const WIREFRAME_TEMPLATES: Record<string, WireframeTemplate> = {
  dashboard: {
    name: 'Dashboard',
    description: 'Standard dashboard layout with sidebar, header, and card grid',
    layoutPattern: 'sidebar-header-grid',
    defaultDimensions: {
      width: 1200,
      height: 800,
    },
    components: [
      {
        type: 'sidebar',
        widthPx: 240,
        position: 'left',
      },
      {
        type: 'header',
        heightPx: 64,
        position: 'top',
      },
      {
        type: 'grid',
        properties: {
          columns: 3,
          spacing: 16,
        },
      },
    ],
  },

  'sidebar-header-content': {
    name: 'Sidebar Header Content',
    description: 'Classic layout with sidebar, header, and main content area',
    layoutPattern: 'sidebar-header-content',
    defaultDimensions: {
      width: 1200,
      height: 800,
    },
    components: [
      {
        type: 'sidebar',
        widthPx: 240,
        position: 'left',
      },
      {
        type: 'header',
        heightPx: 64,
        position: 'top',
      },
      {
        type: 'content',
      },
    ],
  },

  'split-view': {
    name: 'Split View',
    description: 'Two-panel layout for comparison or detail views',
    layoutPattern: 'split-content',
    defaultDimensions: {
      width: 1200,
      height: 800,
    },
    components: [
      {
        type: 'header',
        heightPx: 64,
        position: 'top',
      },
      {
        type: 'container',
        widthPercent: 50,
        position: 'left',
      },
      {
        type: 'container',
        widthPercent: 50,
        position: 'right',
      },
    ],
  },

  'card-grid': {
    name: 'Card Grid',
    description: 'Simple card grid layout without sidebar or header',
    layoutPattern: 'grid',
    defaultDimensions: {
      width: 1200,
      height: 800,
    },
    components: [
      {
        type: 'grid',
        properties: {
          columns: 4,
          spacing: 24,
        },
      },
    ],
  },

  'header-footer': {
    name: 'Header Footer',
    description: 'Basic layout with header, content, and footer',
    layoutPattern: 'header-content-footer',
    defaultDimensions: {
      width: 1200,
      height: 800,
    },
    components: [
      {
        type: 'header',
        heightPx: 64,
        position: 'top',
      },
      {
        type: 'content',
      },
      {
        type: 'footer',
        heightPx: 48,
        position: 'bottom',
      },
    ],
  },

  'full-sidebar': {
    name: 'Full Sidebar',
    description: 'Layout with prominent sidebar and content area',
    layoutPattern: 'sidebar-content',
    defaultDimensions: {
      width: 1200,
      height: 800,
    },
    components: [
      {
        type: 'sidebar',
        widthPx: 320,
        position: 'left',
      },
      {
        type: 'content',
      },
    ],
  },

  minimal: {
    name: 'Minimal',
    description: 'Single content area for focused interfaces',
    layoutPattern: 'content',
    defaultDimensions: {
      width: 1200,
      height: 800,
    },
    components: [
      {
        type: 'content',
      },
    ],
  },
};

export function getTemplate(templateName: string): WireframeTemplate | null {
  return WIREFRAME_TEMPLATES[templateName.toLowerCase()] || null;
}

export function listTemplates(): string[] {
  return Object.keys(WIREFRAME_TEMPLATES);
}

export function matchTemplateByDescription(description: string): WireframeTemplate | null {
  const normalized = description.toLowerCase();

  if (normalized.includes('dashboard')) {
    return WIREFRAME_TEMPLATES.dashboard;
  }

  if (normalized.includes('split')) {
    return WIREFRAME_TEMPLATES['split-view'];
  }

  if (normalized.includes('card') && normalized.includes('grid')) {
    return WIREFRAME_TEMPLATES['card-grid'];
  }

  if (normalized.includes('minimal') || normalized.includes('simple')) {
    return WIREFRAME_TEMPLATES.minimal;
  }

  if (normalized.includes('sidebar') && normalized.includes('header')) {
    return WIREFRAME_TEMPLATES['sidebar-header-content'];
  }

  if (normalized.includes('sidebar')) {
    return WIREFRAME_TEMPLATES['full-sidebar'];
  }

  if (normalized.includes('header') && normalized.includes('footer')) {
    return WIREFRAME_TEMPLATES['header-footer'];
  }

  return null;
}
