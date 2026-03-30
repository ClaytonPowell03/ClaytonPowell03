import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { createAnthropicApiMiddleware } from './server/anthropic-api.js';

function anthropicApiPlugin(env) {
  const middleware = createAnthropicApiMiddleware(env);
  return {
    name: 'scad-anthropic-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, process.cwd(), '');
  const env = { ...process.env, ...loaded };

  return {
    plugins: [anthropicApiPlugin(env)],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          render: resolve(__dirname, 'render.html'),
        },
      },
    },
    server: {
      open: true,
    },
  };
});
