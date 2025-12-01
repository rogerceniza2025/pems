/**
 * Design System Definition
 * Complete design system documentation and token definitions
 */

// import type { DesignTokenSystem, ThemeConfiguration, TokenMetadata } from './types/tokens';

export interface DesignSystemDocumentation {
  version: string;
  description: string;
  principles: string[];
  tokenSystem: {
    colors: ColorSystemDoc;
    spacing: SpacingSystemDoc;
    typography: TypographySystemDoc;
    borders: BorderSystemDoc;
    shadows: ShadowSystemDoc;
    zIndex: ZIndexSystemDoc;
    animation: AnimationSystemDoc;
  };
  usage: {
    components: ComponentGuidelines[];
    patterns: DesignPattern[];
    accessibility: AccessibilityGuidelines;
  };
}

export interface ColorSystemDoc {
  description: string;
  principles: string[];
  categories: {
    semantic: ColorCategory[];
    functional: ColorCategory[];
    status: ColorCategory[];
  };
  tokens: Array<{
    name: string;
    value: string;
    usage: string[];
    accessibility?: {
      contrast: number;
      wcagLevel: 'AA' | 'AAA';
      foreground?: string;
    };
  }>;
}

export interface ColorCategory {
  name: string;
  description: string;
  tokens: string[];
  examples: string[];
}

export interface SpacingSystemDoc {
  description: string;
  scale: {
    base: string;
    ratio: number;
    units: string[];
  };
  categories: {
    layout: SpacingCategory[];
    component: SpacingCategory[];
    text: SpacingCategory[];
  };
  tokens: Array<{
    name: string;
    value: string;
    semantic: string;
    usage: string[];
  }>;
}

export interface SpacingCategory {
  name: string;
  description: string;
  range: [string, string];
  useCase: string[];
}

export interface TypographySystemDoc {
  description: string;
  principles: string[];
  scale: {
    base: string;
    ratio: number;
    clamp: boolean;
  };
  fontFamilies: Array<{
    name: string;
    value: string;
    usage: string[];
    fallbacks: string[];
  }>;
  tokens: Array<{
    name: string;
    value: string;
    usage: string[];
    responsive?: boolean;
  }>;
}

export interface BorderSystemDoc {
  description: string;
  scale: {
    base: string;
    max: string;
    units: string[];
  };
  semantic: Array<{
    name: string;
    value: string;
    usage: string[];
    component?: string;
  }>;
}

export interface ShadowSystemDoc {
  description: string;
  principles: string[];
  scale: {
    levels: number;
    elevation: {
      subtle: string;
      moderate: string;
      strong: string;
    };
  };
  tokens: Array<{
    name: string;
    value: string;
    elevation: string;
    usage: string[];
  }>;
}

export interface ZIndexSystemDoc {
  description: string;
  principles: string[];
  scale: {
    min: number;
    max: number;
    steps: string[];
  };
  layers: Array<{
    name: string;
    value: number;
    description: string;
    elements: string[];
  }>;
}

export interface AnimationSystemDoc {
  description: string;
  principles: string[];
  timing: {
    durations: Record<string, string>;
    easing: Record<string, string>;
  };
  tokens: Array<{
    name: string;
    value: string;
    duration: string;
    easing: string;
    usage: string[];
  }>;
}

export interface ComponentGuidelines {
  name: string;
  description: string;
  tokens: string[];
  patterns: string[];
  examples: string[];
  do: string[];
  dont: string[];
}

export interface DesignPattern {
  name: string;
  description: string;
  tokens: string[];
  implementation: string;
  accessibility: string[];
}

export interface AccessibilityGuidelines {
  contrast: {
    minimum: number;
    enhanced: number;
  };
  focus: {
    visible: boolean;
    offset: string;
    color: string;
  };
  reduced: {
    motion: boolean;
    animation: string;
  };
  screen: {
    readers: boolean;
    text: string;
  };
}

// Complete design system documentation
export const designSystemDocumentation: DesignSystemDocumentation = {
  version: '1.0.0',
  description: 'PEEMS Design System - A comprehensive design token system for modern web applications',
  principles: [
    'Consistency: Maintain visual consistency across all applications',
    'Accessibility: Design for all users with WCAG 2.1 AA compliance',
    'Flexibility: Support multiple themes and customizations',
    'Performance: Optimize for fast loading and smooth interactions',
    'Maintainability: Clear documentation and systematic organization',
  ],
  tokenSystem: {
    colors: {
      description: 'Comprehensive color system with semantic, functional, and status-based colors',
      principles: [
        'Use semantic colors for consistent meaning',
        'Ensure WCAG AA contrast ratios (4.5:1) for normal text',
        'Use HSL format for easy color manipulation',
        'Provide dark theme alternatives for all colors',
      ],
      categories: {
        semantic: [
          {
            name: 'Core Colors',
            description: 'Fundamental colors for the application interface',
            tokens: ['background', 'foreground'],
            examples: ['Page backgrounds', 'Primary text'],
          },
          {
            name: 'Surface Colors',
            description: 'Colors for UI surfaces and containers',
            tokens: ['card', 'popover'],
            examples: ['Cards', 'Dropdowns', 'Modals'],
          },
          {
            name: 'Interactive Colors',
            description: 'Colors for interactive elements',
            tokens: ['primary', 'secondary', 'accent'],
            examples: ['Buttons', 'Links', 'Interactive elements'],
          },
        ],
        functional: [
          {
            name: 'Border Colors',
            description: 'Colors for borders and dividers',
            tokens: ['border', 'input', 'ring'],
            examples: ['Input borders', 'Focus rings', 'Dividers'],
          },
          {
            name: 'Data Visualization',
            description: 'Colors for charts and data visualization',
            tokens: ['chart1', 'chart2', 'chart3', 'chart4', 'chart5'],
            examples: ['Bar charts', 'Line graphs', 'Pie charts'],
          },
          {
            name: 'Sidebar Colors',
            description: 'Specialized colors for sidebar components',
            tokens: ['sidebar', 'sidebarPrimary', 'sidebarAccent'],
            examples: ['Navigation sidebars', 'Menu items'],
          },
        ],
        status: [
          {
            name: 'Feedback Colors',
            description: 'Colors for user feedback and status indicators',
            tokens: ['success', 'warning', 'info', 'destructive'],
            examples: ['Success messages', 'Error states', 'Warnings'],
          },
          {
            name: 'State Colors',
            description: 'Colors for different UI states',
            tokens: ['muted', 'accent'],
            examples: ['Disabled elements', 'Hover states'],
          },
        ],
      },
      tokens: [
        {
          name: 'background',
          value: '0 0% 100%',
          usage: ['Page backgrounds', 'Layout containers'],
          accessibility: { contrast: 21, wcagLevel: 'AAA', foreground: 'foreground' },
        },
        {
          name: 'foreground',
          value: '222.2 84% 4.9%',
          usage: ['Primary text', 'Headings', 'Labels'],
          accessibility: { contrast: 21, wcagLevel: 'AAA' },
        },
        {
          name: 'primary',
          value: '222.2 47.4% 11.2%',
          usage: ['Primary buttons', 'Important links', 'Call-to-action'],
          accessibility: { contrast: 15.8, wcagLevel: 'AAA', foreground: 'primaryForeground' },
        },
        {
          name: 'success',
          value: '142 76% 36%',
          usage: ['Success messages', 'Positive indicators', 'Completed states'],
          accessibility: { contrast: 4.6, wcagLevel: 'AA', foreground: 'successForeground' },
        },
        {
          name: 'destructive',
          value: '0 84.2% 60.2%',
          usage: ['Error messages', 'Delete actions', 'Danger warnings'],
          accessibility: { contrast: 5.2, wcagLevel: 'AA', foreground: 'destructiveForeground' },
        },
      ],
    },
    spacing: {
      description: 'Consistent spacing system based on mathematical ratios',
      scale: {
        base: '1rem',
        ratio: 1.5,
        units: ['rem', 'px', 'em', '%'],
      },
      categories: {
        layout: [
          {
            name: 'Container Spacing',
            description: 'Spacing for layout containers and sections',
            range: ['1rem', '4rem'],
            useCase: ['Page sections', 'Container padding', 'Layout gaps'],
          },
          {
            name: 'Component Spacing',
            description: 'Internal spacing within components',
            range: ['0.5rem', '2rem'],
            useCase: ['Button padding', 'Card padding', 'Form spacing'],
          },
        ],
        component: [
          {
            name: 'Element Spacing',
            description: 'Spacing between individual elements',
            range: ['0.25rem', '1rem'],
            useCase: ['Icon spacing', 'Text spacing', 'List spacing'],
          },
        ],
        text: [
          {
            name: 'Text Spacing',
            description: 'Spacing for typography and text elements',
            range: ['0.5rem', '2rem'],
            useCase: ['Paragraph spacing', 'Heading margins', 'Line height'],
          },
        ],
      },
      tokens: [
        {
          name: 'xs',
          value: '0.25rem',
          semantic: 'Extra Small',
          usage: ['Tight spacing', 'Small gaps', 'Compact layouts'],
        },
        {
          name: 'sm',
          value: '0.5rem',
          semantic: 'Small',
          usage: ['Button padding (small)', 'Card padding (tight)', 'Icon spacing'],
        },
        {
          name: 'md',
          value: '1rem',
          semantic: 'Medium',
          usage: ['Base spacing unit', 'Standard padding', 'Default margins'],
        },
        {
          name: 'lg',
          value: '1.5rem',
          semantic: 'Large',
          usage: ['Section spacing', 'Card padding', 'Button padding'],
        },
        {
          name: 'xl',
          value: '2rem',
          semantic: 'Extra Large',
          usage: ['Container padding', 'Large margins', 'Hero spacing'],
        },
      ],
    },
    typography: {
      description: 'Comprehensive typography system with responsive scales',
      principles: [
        'Use relative units for scalability',
        'Maintain readable line heights',
        'Provide adequate contrast ratios',
        'Support responsive typography',
      ],
      scale: {
        base: '1rem',
        ratio: 1.25,
        clamp: true,
      },
      fontFamilies: [
        {
          name: 'Inter',
          value: "'Inter', system-ui, sans-serif",
          usage: ['Body text', 'UI elements', 'Forms'],
          fallbacks: ['system-ui', 'sans-serif'],
        },
        {
          name: 'JetBrains Mono',
          value: "'JetBrains Mono', 'Fira Code', monospace",
          usage: ['Code blocks', 'Terminal text', 'Technical content'],
          fallbacks: ['monospace'],
        },
      ],
      tokens: [
        {
          name: 'text-xs',
          value: '0.75rem',
          usage: ['Captions', 'Labels', 'Small print'],
          responsive: true,
        },
        {
          name: 'text-sm',
          value: '0.875rem',
          usage: ['Form labels', 'Small text', 'Metadata'],
          responsive: true,
        },
        {
          name: 'text-base',
          value: '1rem',
          usage: ['Body text', 'Paragraphs', 'Default size'],
          responsive: true,
        },
        {
          name: 'text-lg',
          value: '1.125rem',
          usage: ['Large text', 'Subheadings', 'Emphasis'],
          responsive: true,
        },
      ],
    },
    borders: {
      description: 'Consistent border radius system for rounded elements',
      scale: {
        base: '0.5rem',
        max: '9999px',
        units: ['rem', 'px', 'em'],
      },
      semantic: [
        {
          name: 'Default',
          value: '0.5rem',
          usage: ['Standard buttons', 'Cards', 'Inputs'],
          component: 'button',
        },
        {
          name: 'Small',
          value: '0.375rem',
          usage: ['Small buttons', 'Tags', 'Badges'],
          component: 'button',
        },
        {
          name: 'Large',
          value: '0.75rem',
          usage: ['Large buttons', 'Modals', 'Featured elements'],
          component: 'modal',
        },
        {
          name: 'Full',
          value: '9999px',
          usage: ['Avatars', 'Pills', 'Circular elements'],
        },
      ],
    },
    shadows: {
      description: 'Consistent shadow system for elevation and depth',
      principles: [
        'Use subtle shadows for light elevation',
        'Maintain consistent light source (top-left)',
        'Consider dark theme compatibility',
        'Use shadows purposefully for visual hierarchy',
      ],
      scale: {
        levels: 4,
        elevation: {
          subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          moderate: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          strong: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        },
      },
      tokens: [
        {
          name: 'shadow-sm',
          value: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          elevation: 'Subtle',
          usage: ['Subtle hover states', 'Light elevation'],
        },
        {
          name: 'shadow-md',
          value: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          elevation: 'Moderate',
          usage: ['Cards', 'Dropdowns', 'Standard elevation'],
        },
        {
          name: 'shadow-lg',
          value: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          elevation: 'Strong',
          usage: ['Modals', 'Popovers', 'Important elevation'],
        },
      ],
    },
    zIndex: {
      description: 'Systematic z-index scale for stacking context management',
      principles: [
        'Use z-index values purposefully',
        'Keep the scale limited and logical',
        'Prefer stacking context when possible',
        'Document z-index decisions',
      ],
      scale: {
        min: -1,
        max: 1090,
        steps: ['Base (0)', 'Docked (10)', 'Dropdown (1000)', 'Modal (1050)', 'Tooltip (1090)'],
      },
      layers: [
        {
          name: 'Base',
          value: 0,
          description: 'Normal document flow',
          elements: ['Default elements', 'Content'],
        },
        {
          name: 'Dropdown',
          value: 1000,
          description: 'Dropdown menus and popovers',
          elements: ['Dropdowns', 'Select menus', 'Autocomplete'],
        },
        {
          name: 'Modal',
          value: 1050,
          description: 'Modal dialogs and overlays',
          elements: ['Modals', 'Dialogs', 'Lightboxes'],
        },
        {
          name: 'Tooltip',
          value: 1090,
          description: 'Tooltips and tooltips',
          elements: ['Tooltips', 'Help text', 'Context menus'],
        },
      ],
    },
    animation: {
      description: 'Consistent animation system for smooth interactions',
      principles: [
        'Use animations purposefully',
        'Respect user motion preferences',
        'Keep animations fast and smooth',
        'Maintain consistent timing and easing',
      ],
      timing: {
        durations: {
          fast: '150ms',
          normal: '300ms',
          slow: '500ms',
        },
        easing: {
          easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
          easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
          easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
      tokens: [
        {
          name: 'transition-colors',
          value: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
          duration: 'fast',
          easing: 'easeInOut',
          usage: ['Color transitions', 'Background changes'],
        },
        {
          name: 'transition-opacity',
          value: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
          duration: 'fast',
          easing: 'easeInOut',
          usage: ['Fade effects', 'Loading states'],
        },
      ],
    },
  },
  usage: {
    components: [
      {
        name: 'Buttons',
        description: 'Interactive elements for actions',
        tokens: ['primary', 'secondary', 'borderRadius', 'shadows', 'spacing'],
        patterns: ['Interactive states', 'Focus management'],
        examples: ['Primary actions', 'Secondary actions', 'Icon buttons'],
        do: ['Use semantic colors', 'Maintain focus indicators'],
        dont: ['Hard-code colors', 'Skip hover states'],
      },
      {
        name: 'Cards',
        description: 'Containers for related content',
        tokens: ['card', 'borderRadius', 'shadows', 'spacing'],
        patterns: ['Elevation hierarchy', 'Content organization'],
        examples: ['Product cards', 'Article cards', 'Stat cards'],
        do: ['Use consistent padding', 'Apply subtle shadows'],
        dont: ['Overcrowd content', 'Use excessive shadows'],
      },
    ],
    patterns: [
      {
        name: 'Color Usage',
        description: 'Guidelines for using color tokens effectively',
        tokens: ['Colors', 'Contrast ratios'],
        implementation: 'Use semantic color tokens, maintain WCAG contrast',
        accessibility: ['4.5:1 contrast minimum', 'Color blind considerations'],
      },
      {
        name: 'Spacing Rhythm',
        description: 'Creating consistent vertical rhythm',
        tokens: ['Spacing', 'Typography'],
        implementation: 'Use spacing scale consistently with line height',
        accessibility: ['Adequate text spacing', 'Clear visual hierarchy'],
      },
    ],
    accessibility: {
      contrast: {
        minimum: 4.5,
        enhanced: 7,
      },
      focus: {
        visible: true,
        offset: '2px',
        color: 'ring',
      },
      reduced: {
        motion: true,
        animation: '0.01ms',
      },
      screen: {
        readers: true,
        text: 'Screen reader only content',
      },
    },
  },
};

// Export design system for consumption
export default designSystemDocumentation;