import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 修复: plugin-react-swc 在 Windows 上的 @react-refresh 端点 bug
const reactRefreshFix = {
  name: 'react-refresh-fix',
  resolveId(id) {
    if (id === '/@react-refresh' || id.startsWith('/@react-refresh:')) return id;
  },
  load(id) {
    if (id === '/@react-refresh' || id.startsWith('/@react-refresh:')) {
      return `export * from 'react-refresh/runtime';`;
    }
  },
};

export default defineConfig({
  plugins: [react(), reactRefreshFix],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
      allowedHosts: [
          'curdy-ductless-josie.ngrok-free.dev',
          '.ngrok-free.dev'
      ],
      cors: true,
    port: 5175,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
