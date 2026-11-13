import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Calls to /api go to the Express server (server/), so no CORS setup is needed in development.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
