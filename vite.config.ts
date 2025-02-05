import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import dts from "vite-plugin-dts";

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'daags',
      // the proper extensions will be added
      fileName: 'daags',
    },
    rollupOptions: {
      external: ["react"], // Add dependencies you don't want bundled
    },
  },
  plugins: [dts()]
})