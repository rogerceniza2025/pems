import type { StorybookConfig } from '@storybook/html-vite';

const config: StorybookConfig = {
  stories: [
    '../packages/ui/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../apps/*/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    check: false,
  },
  viteFinal: async (config, { configType }) => {
    if (configType === 'DEVELOPMENT') {
      // Development specific config
    } else {
      // Production specific config
      config.build = {
        ...config.build,
        sourcemap: true,
      };
    }

    // Add SolidJS plugin support
    const vitePluginSolid = await import('vite-plugin-solid');
    config.plugins = [
      ...(config.plugins || []),
      vitePluginSolid.default(),
    ];

    // Add Tailwind CSS 4 Vite plugin
    const tailwindcssVite = await import('@tailwindcss/vite');
    config.plugins = [
      ...(config.plugins || []),
      vitePluginSolid.default(),
      tailwindcssVite.default(),
    ];

    // Add optimizeDeps for better performance
    config.optimizeDeps = {
      ...config.optimizeDeps,
      include: [
        ...(config.optimizeDeps?.include || []),
        'solid-js',
        'solid-js/web',
      ],
      // Exclude native modules that cause issues with Storybook
      exclude: [
        ...(config.optimizeDeps?.exclude || []),
        '@tailwindcss/oxide',
        '@tailwindcss/oxide-win32-x64-msvc',
        'lightningcss',
      ],
    };

    return config;
  },
  features: {
    storyStoreV7: true,
    buildStoriesJson: true,
    inlineStories: false,
  },
};

export default config;