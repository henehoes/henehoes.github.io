// Our skin tone numbers (catalog.skins[].tone, from the older GMS data) are NOT the game's: the game's body files are
// Character/0000200N.img and 0001200N.img with N = 0..9, in this order (names: String/Eqp.img ClassicWorld/Skin 12000-12009).
// Compared pixel for pixel on 2026-11-25 (see AGENTS.md "Body"). Anything that reads a skin's art from the game files (attack and
// ladder poses: extract-poses.mjs) must go through this map; reading `000020${tone}` directly gives the wrong skin or nothing at all.
export const GAME_TONE = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 9: 5 /* Ghostly */, 10: 6 /* Fair, our Pink */, 12: 7 /* Alabaster */, 11: 8 /* Clay, our Warm */, 5: 9 /* Green */ };
export const gameToneOf = tone => {
  if (!(tone in GAME_TONE)) throw new Error(`skin tone ${tone} has no entry in scripts/lib-skins.mjs GAME_TONE: find its game file (Character/0000200N.img, compare the stand1/0/body picture) and add it`);
  return GAME_TONE[tone];
};
