import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://rsdustira-demo.vercel.app',
  output: 'static',
  trailingSlash: 'ignore',
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  experimental: { clientPrerender: true },
  integrations: [
    preact(),
    sitemap({ filter: (page) => !page.includes('/app') && !page.includes('seed.json') }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
