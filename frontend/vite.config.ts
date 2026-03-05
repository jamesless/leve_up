import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
      // 允许的访问主机列表
      allowedHosts: [
          // 添加 ngrok 生成的域名
          'curdy-ductless-josie.ngrok-free.dev',
          // 可选：添加通配符，适配 ngrok 每次生成的不同域名（更方便）
          '.ngrok-free.dev'
      ],
      // 可选：如果 ngrok 提示端口被占用，可指定 Vite 端口
      // port: 3000,
      // 可选：允许跨域（配合 ngrok 更稳定）
      cors: true,
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
