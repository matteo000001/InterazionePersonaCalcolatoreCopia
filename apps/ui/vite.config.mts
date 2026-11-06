/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/ui',
  server: {
    port: 4200,
    strictPort: true,
    host: 'localhost',
  },
  preview: {
    port: 4200,
    strictPort: true,
    host: 'localhost',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@exam-planner/shared-types': fileURLToPath(
        new URL('../../libs/shared/types/src/index.ts', import.meta.url)
      ),
      '@exam-planner/shared-utils': fileURLToPath(
        new URL('../../libs/shared/utils/src/index.ts', import.meta.url)
      ),
    },
  },
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
