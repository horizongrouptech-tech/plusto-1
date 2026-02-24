import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Must come BEFORE the '@' alias so @/entities/* and @/functions/* are matched first
      {
        find: /^@\/entities\/.+/,
        replacement: path.resolve(__dirname, 'src/api/entities.js'),
      },
      {
        find: /^@\/functions\/.+/,
        replacement: path.resolve(__dirname, 'src/api/functions.js'),
      },
      {
        find: '@',
        replacement: path.resolve(__dirname, 'src'),
      },
    ],
  },
});