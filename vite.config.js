import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import rollupNodePolyFill from 'rollup-plugin-node-polyfills';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Allow external access
    port: 5173,
    strictPort: true,
    // REMOVE the https block for Vercel compatibility!
  },
  resolve: {
    alias: {
      stream: 'rollup-plugin-node-polyfills/polyfills/stream',
      buffer: 'rollup-plugin-node-polyfills/polyfills/buffer-es6'
    }
  },
  define: {
    'process.env': {},
    global: 'globalThis'
  },
  build: {
    rollupOptions: {
      plugins: [
        rollupNodePolyFill()
      ]
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          process: true,
        }),
        NodeModulesPolyfillPlugin()
      ]
    }
  }
});