import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // @react-pdf/renderer uses ESM internals that need special handling
    exclude: ['@react-pdf/renderer'],
  },
  resolve: {
    alias: {
      // Shim out Node-only modules that @react-pdf/renderer references
      canvas: path.resolve('./src/utils/emptyModule.js'),
    },
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
});
