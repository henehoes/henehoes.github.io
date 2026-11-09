// After `vite build`: when the build was told to load pictures from elsewhere (VITE_ASSET_BASE, see src/assets.js), leave them out of dist,
// so the deploy is small and nothing can be requested from the wrong place. Without VITE_ASSET_BASE this does nothing.
import { rmSync, existsSync } from 'node:fs';
import { loadEnv } from 'vite';
if (!loadEnv(process.env.NODE_ENV ?? 'production', process.cwd()).VITE_ASSET_BASE && !process.env.VITE_ASSET_BASE) process.exit(0);
for (const dir of ['dist/sprites', 'dist/maps', 'dist/poses', 'dist/housing/homes', 'dist/housing/furniture']) {
  if (existsSync(dir)) { rmSync(dir, { recursive: true }); console.log('left out of the deploy:', dir); }
}
