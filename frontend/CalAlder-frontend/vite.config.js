import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import fs from 'fs-extra';

// Custom plugin to copy extension files
const copyExtensionFiles = () => {
  return {
    name: 'copy-extension-files',
    writeBundle: async () => {
      // Ensure the dist directory exists
      await fs.ensureDir('dist');

      // Copy manifest.json
      await fs.copy('public/manifest.json', 'dist/manifest.json');

      // Copy any other static assets if needed
      // await fs.copy('public/icons', 'dist/icons');
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), copyExtensionFiles()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.js'),
        content: resolve(__dirname, 'src/content/content.js')
      },
      output: {
        entryFileNames: (chunk) => {
          // Handle special files that need to maintain their names
          if (['background', 'content'].includes(chunk.name)) {
            return `${chunk.name}.js`;
          }
          return 'assets/[name].[hash].js';
        },
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    },
    sourcemap: true,
    minify: false // Disable minification for better debugging
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
