import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps asset paths relative, so the same build works on
// Cloudflare Pages, Netlify, or a GitHub Pages project subpath.
export default defineConfig({
  plugins: [react()],
  base: './',
});
