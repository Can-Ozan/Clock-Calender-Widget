import { defineConfig } from 'vite';
import { offlinePlugin } from './scripts/pwa-plugin.mjs';

export default defineConfig({
  base: '/Clock-Calender-Widget/',
  plugins: [offlinePlugin()],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
});
