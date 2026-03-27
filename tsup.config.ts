import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    server: 'src/server.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  banner({ entryName }) {
    if (entryName === 'index') {
      return { js: '#!/usr/bin/env node' };
    }
    return {};
  },
});
