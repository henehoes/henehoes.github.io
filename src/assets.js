// Where the pictures come from. Left unset, they are served by the site itself (dev, the GitHub Pages build). The Vercel build sets
// VITE_ASSET_BASE=https://henehoes.github.io so sprites, housing pictures and the map load from GitHub Pages instead, which keeps the
// hundreds of small picture requests per visitor off Vercel's request allowance (scripts/strip-assets.mjs then leaves them out of the deploy).
const BASE = (import.meta.env.VITE_ASSET_BASE ?? '').replace(/\/+$/, '');
export const assetUrl = path => `${BASE}/${String(path).replace(/^\/+/, '')}`;
// Pictures whose pixels are read back (dyeing, hit-testing) must be requested with CORS, or a cross-origin one taints the canvas.
export const loadCors = img => { img.crossOrigin = 'anonymous'; return img; };
