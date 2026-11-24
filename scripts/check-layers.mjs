// Compares the layer (z) names of every catalogue wearable's standing pictures with what the game files hold NOW, and lists the items that differ.
// Run it at every datamine: the released clothing mostly comes from an older source (maplestory.io, v210), whose layer names the game later
// changes (Stocking Shorts: pantsOverShoesBelowMailChest -> pantsBelowShoes, so long stockings no longer cover the Elephant Slippers).
// A mismatch means the item draws in the wrong order against others. Fix by changing the `position` in the item's meta.json / meta2.json
// (public/sprites/<wearable|datamine>/<id>/), never a picture (pictures are cached for a year), then run build-catalog.mjs.
//   WZ_DATA=".../maplestorycw/appdata/Data" node scripts/check-layers.mjs            standing pose (stand1)
//   WZ_DATA=".../maplestorycw/appdata/Data" node scripts/check-layers.mjs stand2     two-handed standing pose
// Needs the game files: see scripts/lib-wz.mjs. Caps, accessories, coats, longcoats, pants, shoes, gloves and capes (weapons are skipped).
import { image, at, str } from './lib-wz.mjs';
import { readCatalog } from './lib-catalog.mjs';

const pose = process.argv[2] === 'stand2' ? 'stand2' : 'stand1', partsKey = pose === 'stand2' ? 'parts2' : 'parts';
const FOLDERS = { 100: 'Cap', 101: 'Accessory', 102: 'Accessory', 103: 'Accessory', 104: 'Coat', 105: 'Longcoat', 106: 'Pants', 107: 'Shoes', 108: 'Glove', 110: 'Cape' };
const resolve = (c, img) => { const l = c.getFromPath('_inlink')?.getString?.(); if (l) { try { return at(img, l.replace(/^.*?\.img\//, '')) ?? c; } catch { /* keep the node itself */ } } return c; };
const catalogue = readCatalog(), differs = [], missing = [];
let compared = 0;
for (const [slot, g] of Object.entries(catalogue.wearables)) for (const it of g.items) {
  const cid = it.classicId ?? it.id, folder = FOLDERS[Math.floor(cid / 10000)];
  if (!folder || !it[partsKey]?.length) continue;
  const img = image(`Character/${folder}`, `${String(cid).padStart(8, '0')}.img`);
  if (!img) { missing.push(`${it.name} (${cid})`); continue; }
  const f0 = at(img, `${pose}/0`) ?? at(img, 'default'); if (!f0) continue;
  const game = [];
  for (const c of f0.wzProperties()) { const own = c.getFromPath('origin') ? c : resolve(c, img); const z = str(own, 'z') ?? str(c, 'z'); if (typeof z === 'string') game.push(z); }
  // item effects (fx: Tania Cloak's wings) and hair shades are not in the item's own frame
  const mine = it[partsKey].filter(p => !p.fx && !/^hairShade/.test(p.layer)).map(p => p.layer).sort();
  compared++;
  if (JSON.stringify(mine) !== JSON.stringify(game.sort())) differs.push(`${slot}: ${it.name} (${cid})${it.released === false ? ' [datamine]' : ''}: catalogue ${mine} / game ${game}`);
}
console.log(`${pose}: compared ${compared} items, ${differs.length} differ, ${missing.length} not in the game files`);
for (const d of differs) console.log('  ' + d);
for (const m of missing) console.log('  missing: ' + m);
