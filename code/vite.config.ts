import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: true,
    middlewareMode: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  ssr: {
    noExternal: true
  }
});

