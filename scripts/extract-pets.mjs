// Pets and pet equipment, from the game's own files. Item/Pet/<id>.img is a pet (35 of them) with its animations; the app uses the
// resting pose, stand0 frame 0, as a still picture. Character/PetEquip/<id>.img is a piece of pet equipment (10 of them): each has
// artwork for every pet it fits (the first 11 pets; entries that are links to another pet's are followed), as stand0 frame 0 with its own origin. Names come from String/Pet.img and
// String/Eqp.img (ClassicWorld/PetEquip).
//   WZ_DATA=".../maplestorycw/appdata/Data" node scripts/extract-pets.mjs
// Writes public/sprites/pet/<pet id>/{icon,stand}.png, public/sprites/pet/equip/<equip id>/{icon,<pet id>}.png and data/game-pets.json
// (then run scripts/build-catalog.mjs). `released: false` marks the datamine ones.
// Which pets and pieces of equipment are released in Classic World is not in the files: the lists below come from the cash shop news.
import { writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { DATA, openWz, image, png, originOf, str } from './lib-wz.mjs';

// Released in Classic World, from the Nexon cash shop news (reference/cash-shop/grand-launch-oct-21.md, "Pets" and "Pet Equipment"; the
// Oct 28 and Nov 4 updates list the same): Brown Kitty, Brown Puppy, Pink Bunny, Black Kitty, White Bunny and Black Pig (3,500 NX, 30 days),
// and Red Ribbon, Yellow Hat, Red Hat, Black Hat, Pink Laced Cap, Sky Blue Laced Cap, Blue Top Hat and Red Top Hat (3,200 NX, permanent).
// Everything else (the other 29 pets, Rudolph's Hat and Tree Hat) is datamine.
const RELEASED_PETS = new Set([5000000, 5000001, 5000002, 5000004, 5000005, 5000007]);
const RELEASED_EQUIP = new Set([1802000, 1802001, 1802002, 1802003, 1802004, 1802005, 1802006, 1802007]);

const list = folder => readdirSync(`${DATA}/${folder}`).filter(n => /_\d{3}\.wz$/.test(n)).flatMap(f => [...openWz(`${folder}/${f}`).getWzDirectory().wzImages()]);
const petNames = image('String', 'Pet.img'), eqpNames = image('String', 'Eqp.img');
const petName = id => (str(petNames.getFromPath(String(id)), 'name') ?? `Pet ${id}`).replace(/\s+/g, ' ').trim();
const equipName = id => (str(eqpNames.getFromPath(`ClassicWorld/PetEquip/${id}`), 'name') ?? `Pet equipment ${id}`).replace(/\s+/g, ' ').trim();

rmSync('public/sprites/pet', { recursive: true, force: true });
const pet = (id, ...path) => `public/sprites/pet/${[id, ...path].join('/')}`;
const out = { pets: [], equips: [] };

for (const img of list('Item/Pet')) {
  img.parseImage(); const id = Number(img.getName().replace('.img', ''));
  const stand = img.getFromPath('stand0/0'), icon = img.getFromPath('info/icon');
  const standPng = png(stand), iconPng = png(icon);
  if (!standPng || !iconPng) { console.log('skipped (no picture)', id, petName(id)); continue; }
  mkdirSync(pet(id), { recursive: true });
  standPng.saveToFile(pet(id, 'stand.png')); iconPng.saveToFile(pet(id, 'icon.png'));
  const [ox, oy] = originOf(stand), [ix, iy] = originOf(icon);
  out.pets.push({ id, name: petName(id), icon: `sprites/pet/${id}/icon.png`, iw: iconPng.getWidth(), ih: iconPng.getHeight(),
    stand: { file: `sprites/pet/${id}/stand.png`, w: standPng.getWidth(), h: standPng.getHeight(), ox, oy }, ...(!RELEASED_PETS.has(id) && { released: false }) });
}
const petIds = new Set(out.pets.map(p => p.id));

for (const img of list('Character/PetEquip')) {
  img.parseImage(); const id = Number(img.getName().replace(/^0|\.img$/g, ''));
  const icon = png(img.getFromPath('info/icon')); if (!icon) { console.log('skipped (no icon)', id); continue; }
  mkdirSync(pet('equip', id), { recursive: true }); icon.saveToFile(pet('equip', id, 'icon.png'));
  // What a pet can actually wear is decided by the game data, not by the item's written description (which names fewer pets): a pet can
  // wear the piece when the file has an entry for it. Most entries hold their own pictures; some are links ("use pet 5000000's"), which
  // are followed, so Black Kitty and White Bunny wear Brown Kitty's and Pink Bunny's pictures.
  const art = {}, linked = {}, entries = [...img.wzProperties()].filter(c => petIds.has(Number(c.getName())));
  for (const c of entries) {
    const petId = Number(c.getName());
    if (c.getPropertyType() === 13) { linked[petId] = Number(c.getValue()); continue; } // a link to another pet's entry
    const frame = img.getFromPath(`${petId}/stand0/0`), p = png(frame); if (!p) { console.log('no picture', id, petId); continue; }
    p.saveToFile(pet('equip', id, `${petId}.png`)); const [ox, oy] = originOf(frame);
    art[petId] = { file: `sprites/pet/equip/${id}/${petId}.png`, w: p.getWidth(), h: p.getHeight(), ox, oy };
  }
  for (const [petId, target] of Object.entries(linked)) { if (art[target]) art[petId] = { ...art[target], from: target }; else console.log('link to nothing', id, petId, target); }
  const sorted = Object.fromEntries(Object.entries(art).sort((x, y) => x[0] - y[0]));
  out.equips.push({ id, name: equipName(id), icon: `sprites/pet/equip/${id}/icon.png`, art: sorted, ...(!RELEASED_EQUIP.has(id) && { released: false }) });
}
out.pets.sort((a, b) => a.id - b.id); out.equips.sort((a, b) => a.id - b.id);
writeFileSync('data/game-pets.json', JSON.stringify(out, null, 1));
console.log(`${out.pets.length} pets, ${out.equips.length} pieces of pet equipment, ${out.equips.reduce((n, e) => n + Object.keys(e.art).length, 0)} equipment pictures`);
