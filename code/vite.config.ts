import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: true,
    middlewareMode: false,
    hmr: false
  },
  preview: {
    allowedHosts: true
  },
  ssr: {
    noExternal: true
  }
});

