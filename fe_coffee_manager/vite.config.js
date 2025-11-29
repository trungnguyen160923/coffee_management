import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/admin/',  // Base path cho production - assets sẽ có path /admin/assets/...
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
