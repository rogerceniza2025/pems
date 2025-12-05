import type { Preview } from '@storybook/html';
// Note: CSS imports removed to prevent conflicts with main web app
// The main web app uses Tailwind v4 with CSS-native configuration

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      page: null,
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#0f172a',
        },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
        wide: {
          name: 'Wide',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const { theme } = context.globals;

      // Apply theme to document element
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }

      // Create container element for HTML Storybook
      const container = document.createElement('div');
      container.className = `min-h-screen bg-background text-foreground ${theme === 'dark' ? 'dark' : ''}`;
      
      const innerContainer = document.createElement('div');
      innerContainer.className = 'container mx-auto py-8';
      
      // Get the story element
      const storyElement = Story();
      
      // Append the story element to the container
      if (storyElement) {
        innerContainer.appendChild(storyElement);
      }
      
      container.appendChild(innerContainer);
      
      return container;
    },
  ],
};

export default preview;