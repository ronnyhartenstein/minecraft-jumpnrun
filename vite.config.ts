import { defineConfig } from 'vite';

// GitHub Pages serviert das Spiel unter https://blog.rh-flow.de/minecraft-jumpnrun/
export default defineConfig({
  base: '/minecraft-jumpnrun/',
  server: { watch: { usePolling: true } },
  // Three.js allein ist schon ~500 kB, das ist okay.
  build: { chunkSizeWarningLimit: 1000 },
});
