import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the same build works at the GitHub Pages sub-path and locally.
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
