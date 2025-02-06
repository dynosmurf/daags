import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // Vite plugin for React

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist' // Where the built files will go
  }
})
