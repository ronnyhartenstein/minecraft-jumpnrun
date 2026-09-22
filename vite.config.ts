import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Alle Level-Dateien mit Änderungszeit und Größe, als ein Text zum Vergleichen. */
function snapshot(dir: string): string {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.txt'))
    .sort()
    .map((file) => {
      const stat = statSync(join(dir, file));
      return `${file}:${stat.mtimeMs}:${stat.size}`;
    })
    .join('\n');
}

/**
 * Lädt das Spiel neu, sobald eine Level-Datei in `levels/` gespeichert, angelegt oder gelöscht wird.
 * So sieht man beim Level-Bauen jede Änderung sofort. Der Ordner wird regelmäßig selbst geprüft,
 * weil Datei-Ereignisse in Docker nicht immer zuverlässig ankommen.
 */
function reloadOnLevelChange(): Plugin {
  const dir = resolve('levels');
  return {
    name: 'reload-on-level-change',
    configureServer(server) {
      let last = snapshot(dir);
      const timer = setInterval(() => {
        const now = snapshot(dir);
        if (now === last) return;
        last = now;
        server.moduleGraph.invalidateAll();
        server.ws.send({ type: 'full-reload' });
        server.config.logger.info('Level-Dateien geändert, Spiel wird neu geladen', { timestamp: true });
      }, 700);
      server.httpServer?.on('close', () => clearInterval(timer));
    },
  };
}

// GitHub Pages serviert das Spiel unter https://blog.rh-flow.de/minecraft-jumpnrun/
export default defineConfig({
  base: '/minecraft-jumpnrun/',
  plugins: [reloadOnLevelChange()],
  server: { watch: { usePolling: true } },
  // Three.js allein ist schon ~500 kB, das ist okay.
  build: { chunkSizeWarningLimit: 1000 },
});
