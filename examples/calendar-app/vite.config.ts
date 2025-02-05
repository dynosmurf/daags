import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Vite plugin for React
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',  // Where the built files will go
  },
  resolve: {
    alias: {
      '@daags/core': path.resolve(__dirname, '../../packages/core/index.ts'), 
      '@daags/hooks': path.resolve(__dirname, '../../packages/hooks/index.ts'),
      '@daags/visualizer': path.resolve(__dirname, '../../packages/visualizer/index.ts'),
    }
  }
});