import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { createGeminiApiMiddleware } from './server/gemini-api.js';

function geminiApiPlugin(env) {
  const middleware = createGeminiApiMiddleware(env);
  return {
    name: 'scad-gemini-api',
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
    plugins: [geminiApiPlugin(env)],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          render: resolve(__dirname, 'render.html'),
          gallery: resolve(__dirname, 'gallery.html'),
          guide: resolve(__dirname, 'openscad-guide.html'),
          about: resolve(__dirname, 'about.html'),
          features: resolve(__dirname, 'features.html'),
          faq: resolve(__dirname, 'faq.html'),
          workflow: resolve(__dirname, 'workflow.html'),
        },
      },
    },
    optimizeDeps: {
      include: [
        'three',
        'gsap',
        '@supabase/supabase-js',
        'codemirror',
        '@codemirror/view',
        '@codemirror/state',
        '@codemirror/commands',
        '@codemirror/language',
        'three-csg-ts',
      ],
    },
    server: {
      open: true,
    },
  };
});
