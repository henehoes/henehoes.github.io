// Saves, or compares with, the list of everything the game files held at the last scrape (data/scrape-baseline.json): every hair and face
// id, every cash clothing/weapon/ring id (those in the catalogue, released or datamined), and the pet and pet-equipment ids. After the next
// client update, run the diff first: it prints what is new, which is what goes into data/mined-versions.json (the DATAMINE · NEW label).
//   WZ_DATA=".../maplestorycw/appdata/Data" node scripts/save-baseline.mjs          save today's lists (overwrites the file)
//   WZ_DATA=".../maplestorycw/appdata/Data" node scripts/save-baseline.mjs --diff   print what the game files hold that the saved lists do not
// Needs the game files: see scripts/lib-wz.mjs. Run extract-datamine.mjs and build-catalog.mjs first so the clothing lists are current.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { openWz, image, DATA } from './lib-wz.mjs';
import { readCatalog } from './lib-catalog.mjs';

const FILE = 'data/scrape-baseline.json';
const ids = folder => readdirSync(`${DATA}/Character/${folder}`).filter(n => /_\d{3}\.wz$/.test(n))
  .flatMap(wz => openWz(`Character/${folder}/${wz}`).getWzDirectory().wzImages().map(img => parseInt(img.getName()))).sort((a, b) => a - b);
const catalogue = readCatalog(), pets = JSON.parse(readFileSync('data/game-pets.json', 'utf8'));
const now = {
  hair: ids('Hair'), face: ids('Face'),
  wearables: Object.fromEntries(Object.entries(catalogue.wearables).map(([slot, g]) => [slot, g.items.map(i => i.classicId ?? i.id).sort((a, b) => a - b)])),
  pets: pets.pets.map(p => p.id).sort((a, b) => a - b), petEquips: pets.equips.map(e => e.id).sort((a, b) => a - b),
  // Item effects: an item can have art that is NOT in its Character/ file but in Effect/ItemEff.img/<id>/effect (Tania Cloak's fiery wings,
  // Silent Sea of Clouds' cloud). They are easy to miss: the item looks complete without them. Every id listed here must be checked by hand.
  itemEffects: image('Effect', 'ItemEff.img').wzProperties().map(p => Number(p.getName())).sort((a, b) => a - b),
};
if (process.argv.includes('--diff')) {
  if (!existsSync(FILE)) throw new Error(`No ${FILE} yet: run without --diff first.`);
  const old = JSON.parse(readFileSync(FILE, 'utf8')), fresh = (a, b) => (a ?? []).filter(x => !(b ?? []).includes(x));
  console.log(`Compared with the lists saved on ${old.saved}:`);
  for (const k of ['hair', 'face', 'pets', 'petEquips', 'itemEffects']) console.log(`  ${k}: ${JSON.stringify(fresh(now[k], old[k]))}`);
  console.log(`  (itemEffects in the files now: ${JSON.stringify(now.itemEffects)}: check each one is drawn, see AGENTS.md "Item effects")`);
  for (const slot of Object.keys(now.wearables)) { const f = fresh(now.wearables[slot], old.wearables[slot]); if (f.length) console.log(`  ${slot}: ${JSON.stringify(f)}`); }
} else {
  writeFileSync(FILE, JSON.stringify({ _comment: 'Everything the game files held at the last scrape, for telling what is new at the next one: node scripts/save-baseline.mjs --diff. hair/face: every id in Character/Hair and Character/Face; wearables: the ids of every item the catalogue holds per slot (released and datamined); pets/petEquips: ids from data/game-pets.json. Written by scripts/save-baseline.mjs.', saved: new Date().toLocaleDateString('en-CA'), client: 'Nov 18 2026 update (v.2.0.0)', ...now }));
  console.log(`Saved ${FILE}: ${now.hair.length} hair ids, ${now.face.length} face ids, ${Object.values(now.wearables).reduce((n, l) => n + l.length, 0)} clothing items, ${now.pets.length} pets, ${now.petEquips.length} pet equips`);
}
