import { readFileSync } from 'node:fs';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    // Chemins relatifs : le build fonctionne aussi bien sur un sous-domaine
    // que dans la WebView Capacitor (jalons 2 et 12).
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION ?? pkg.version),
    },
    server: {
      // 0.0.0.0 : accessible depuis le Mac et depuis le téléphone en Wi-Fi.
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },
    build: {
      target: 'es2022',
      // Phaser seul pèse ~1,3 Mo minifié : on l'isole dans son propre chunk
      // pour qu'il reste en cache entre deux versions du jeu.
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [{ name: 'phaser', test: /node_modules[\\/]phaser/ }],
          },
        },
      },
      chunkSizeWarningLimit: 1500,
    },
    test: {
      include: ['tests/unit/**/*.test.ts'],
      environment: 'node',
    },
  };
});
