import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'daags-core',
      fileName: (format) => `daags-core.${format}.js`,
      formats: ['es', 'cjs', 'umd']
    }
  },
  plugins: [dts({ insertTypesEntry: true }), tsconfigPaths()]
})
