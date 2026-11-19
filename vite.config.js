import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = `http://localhost:${process.env.PORT || 4000}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API, changeOrigin: true },
      '/uploads': { target: API, changeOrigin: true },
    },
  },
});
