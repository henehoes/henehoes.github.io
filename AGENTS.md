# Maple Layers: handoff notes for agents

Read this first; `README.md` has a shorter command list. This file describes the app as it is now. Where it and the code disagree, the code wins: fix this file.

## What it is
A one-screen website (page title `classic henehoes`; project name Maple Layers) for MapleStory Classic World:
- **Character book:** build an avatar from skin, face, hair and wearables (hat, face accessory, eye decoration, earrings, overall, top, bottom, gloves, shoes, cape, weapon, name tag ring, chat bubble ring), dye wearables with the game's Tone / Chroma / Brightness, try attack and ladder poses, save looks, and browse every released crate and box.
- **Housing book:** pick a home and place furniture in it (`src/housing.js`).
- Everything the app shows is stored in the project (`public/`). The running app makes **no API calls**; all sprite fetching happens in scripts.

Stack: Vite 5, vanilla JS (no framework). `pngjs` for scripts, `puppeteer-core` for browser tests (expects Chrome at `/Applications/Google Chrome.app`, hard-coded in `scripts/ui-test.mjs` and `scripts/layout-check.mjs`). Fonts self-hosted via `@fontsource/*` (Pixelify Sans, Silkscreen, Nunito, Noto Sans KR 500; all OFL). Deployed on Vercel.

## House rules
- **Two repositories, two sites, one codebase:**
  - `henehoes/maple-layers` (git remote `origin`, **private**): the production site on Vercel. Datamined clothing, weapons and rings are hidden there.
  - `henehoes/henehoes.github.io` (git remote `pages`, **public**, the owner's choice): the test site at https://henehoes.github.io, built by `.github/workflows/pages.yml` with `VITE_DATAMINE=1` so it lists every datamined item. Experiments go here first so they cannot crash the Vercel site.
  - Push to whichever the owner names. Never push experimental changes to `origin` without the owner's go-ahead. MapleStory art belongs to Nexon: flag licensing when relevant.
- Commit locally; **push only when the owner says "push"**. Plan first (and check with the owner) before big features.
- Only the cash-shop content the owner specified is in the app: the Mystery Fashion Crates, Mystery Styles and Aurora Stamp Shop boxes. Pets, packs, megaphones, 10-day equip covers, Signature coupons and other shop items are deliberately left out. Drop rates are stored only where printed.
- British English, SGD, DD/MM/YYYY. No secrets in code (none are used). Never invent statistics or say something is tested unless it was run.
- User-facing wording (credits, notes, empty states) is usually the owner's exact text: do not reword it without asking.
- The saved Nexon pages (`*_Cash_Shop.html`) are source material only: git-ignored and purged from history. Never commit them. Their articles are converted to Markdown in `reference/cash-shop/` (also git-ignored; `scripts/nexon-html-to-md.py` makes them): `grand-launch-oct-21.md`, `update-oct-28.md`, `update-nov-4.md` (the Founder's Mystery Fashion Crate, Aurora crate, pets, pet equipment, coupons and the rest of the shop), and `founders-access-cash-shop.md` (the saved Founders page held only the news listing, no article; it says where its contents are). The pages' `_files` folders (stylesheets, scripts, pictures, about 49 MB) were deleted on 2026-11-10.
- **All data comes only from the game's own files** (our extraction through `scripts/lib-wz.mjs`): art, names, ids, lists, flags. The raw game files are the most reliable source; do not use outside sites (fan sites, sprite APIs) for anything. Everything in the repo matches the game files (art checked pixel for pixel). The one outside input is the owner's saved Nexon cash-shop pages, for which boxes were sold, when and with what.

## Run, build, test
    npm install
    npm run dev                      # http://localhost:5173 (use `npx vite --host ::` if localhost resolves oddly)
    npm run build                    # -> dist/
    node scripts/colour-check.mjs    # dye maths, no server needed
    node scripts/ui-test.mjs         # full browser test; needs the dev server running
    node scripts/layout-check.mjs    # layout at 3 window sizes; needs the dev server

`scripts/ui-test.mjs` is the main regression suite (desktop, a 390x844 touch phone, zoomed-out and 3440px ultrawide pages). It reads `SHOW_UPCOMING` from `src/main.js` and takes item counts from `public/catalog.json`, so it follows the data. Tests that reload or open a second page must clear `maple-layers:working-v1`. Screenshots go to `tmp/` (ignored). Extend it when adding a feature.

Not tested: real Retina hardware or a real phone (only Chrome emulation; WebKit was checked once with Playwright's iPhone profile, installed outside the project), browsers other than Chrome.

## Data pipeline
`public/catalog.json` is the app's main data file (plus pictures and the pose/housing JSON). The datamined clothing, weapons and rings go in `public/catalog-datamine.json`, which only a `VITE_DATAMINE=1` build fetches and merges (so Vercel visitors never download it; it was half of the list). Scripts read both through `readCatalog()` in `scripts/lib-catalog.mjs`. It is written by `node scripts/build-catalog.mjs`, which merges `data/items.json` with `data/rules.json`, `rings.json`, `boxes.json`, `upcoming.json`, `game-dye.json`, `weapon-types.json`, `zmap.json`, `skins*.json`, `henesys-*.json`, placeholders, and writes `warnings` (e.g. `dyeUnknown`, `boxUnresolved`, `noWeaponTypes`). **Re-run it after any data change.**

Source: **the game's own files** (via libwz) for everything: art, names, Classic ids, the hair/face lists, flags, poses, housing. The owner says extraction is permitted with credit. For a new item, style or list, write or extend an `extract-*.mjs` script (`String/Eqp.img` `ClassicWorld/<category>` has the game's names; the item files have everything else).

Steps (run what the change needs, then `build-catalog.mjs`):
- Favicon: Vercel's tab is "classic henehoes" with the Orange Cat Beanie icons (`favicon*.png`, `apple-touch-icon.png`). The GitHub Pages build is "henehoes pro" with Bunny Slippers icons (`pro-*.png`, from `make-favicon.mjs`); `vite.config.js` swaps them in when `VITE_DATAMINE=1`.
- From the game files (need `WZ_DATA`): `extract-wearables.mjs cap`, `extract-styles.mjs <hair|face> <ids>`, `extract-rings.mjs`, `extract-dyeable.mjs` (-> `data/game-dye.json`), `extract-weapon-types.mjs` (-> `data/weapon-types.json`), `extract-upcoming.mjs` (-> `data/upcoming.json`, `public/sprites/upcoming/`), `extract-datamine.mjs [section ...]` (-> `data/datamine/<section>.json`, `public/sprites/datamine/<section>/`; both draw through `scripts/lib-draw.mjs`), `extract-weapon-hold.mjs <id> <class>`, `extract-poses.mjs` (about 3.5 min; re-run after adding wearables; -> `public/poses/`, `public/sprites/pose/`), `extract-housing.mjs` (-> `public/housing/`).

Game-file environment (`scripts/lib-wz.mjs`):
- `WZ_DATA` = the client's Data folder. On this Mac (CrossOver): `~/Library/Application Support/MapleStoryNA/Bottles/maplestory/drive_c/Nexon/Library/maplestorycw/appdata/Data`.
- `WZ_VERSION` (default `779`): the files only open with the right client version.
- `LIBWZ_DIR`: load libwz from a local checkout (`<dir>/dist/index.js`) instead of the package.
- Install libwz for a run with `npm install --no-save --ignore-scripts libwz`. **Never add libwz to `package.json`**: its install step builds a native addon and breaks `npm install` on Vercel.
- libwz cannot write to a path it wrote before (even after a rename), so extractors write pictures through fresh temporary names.

Hand-edited data:
- `data/rules.json`: `partHiddenBy`, `zFallback`, `fitHelmet`, `stand2Only`, `baseBody`, `listFirst`, `upcomingExclude`, `useEarlierId`, `exclude`, `holds` (unused by the app now; the file's `_comment` still describes a Hold choice that was removed).
- `data/released.json`: released hair/face styles per gender, by name or Classic id (a number). A name releases only the lowest-id style with that name. Then run `add-styles.mjs` and `build-catalog.mjs`.
- `data/boxes.json`: groups (`mystery-crates`, `mystery-styles`, `aurora`; `tab` is the short label, `title` the long one) and boxes (`name`, `pill`, `dates`, `start`/`end` in UTC, `latest`, `pending`, `note`, `items` by name with optional `rate`, `kind`/`gender`/`sex` for styles, `match` when the game name has a colour prefix, e.g. "Black Wild Tangles Hair").
- `data/names.txt`, `data/placeholders.json`. `data/hairface.txt` and `data/pinned.json` are no longer used for styles.
- Legacy, safe to ignore: `scripts/lookup.mjs`, `calibrate*.mjs`, `add-pinned.mjs`, `data/matched*.json`, `data/unmatched*.json`.

## Code map
- `src/main.js`: state, UI, drawing. `src/compose.js`: `composite`, `blit` (alpha-correct), `adjustColour` (dye). `src/ring.js`: name tag drawing (`drawNameTag`, `drawPlainTag`, `loadFont`). `src/housing.js`: the Housing book. `src/style.css`: all styles. The phone layout is the `@media (max-width: 800px)` block.
- **State:** `state = fresh()` holds `sex`, `skin`, `face`/`hair` `{style, colour}`, `wear[slot]` `{item, h, c, b, two}` and `text.name`. `two` is unused. Other module state: `gender` (Face/Hair list filter), `activeTab` (opens on `'past'`), `mode` (`'character' | 'housing'`), `source` (`'released' | 'rotation' | 'datamine'`), `crate`, `hatFit`, `weaponType`, `search`, `browse` (list colour), `configTarget` (selected Equipped tile), `pose`, `resting`, `baseline`.
- **Render cycle:** `afterChangeKeep` runs `renderTabs`, `renderFilters` (search box, plus the switch row in `#source`), `renderContent`, `renderColour` (Equipped panel), and `renderPreview`. Card builders `skinCard`, `styleCard`, `wearableCard`, `ringCard` and `optionCard` are shared by every tab. `infoNote` draws the framed "i" note.
- **Drawing:** `buildLayers(sel, view)` requests every part at once, then `withScene` composes into a **fresh canvas per call**, then `paintFocus` draws whole device pixels.
- Working canvas `W x H` = 160 x 230, skin at `OX, OY` = 60, 112.
- Views: `VIEW` (head-and-chest crop, `ART_H` 84px art), `BODY_VIEW`/`LOOK_VIEW` (whole body, `.art-box.tall`), `MINI_VIEW` (Equipped tiles), `PREVIEW_VIEW` 150 with `PREVIEW_PAD` 256.
- `#preview` exposes `data-zoom`, `data-view` and `data-pose` for tests.
- Copy character image (stage tool, Character book): `copyCharacter()` in `src/main.js` copies the character alone (name tag and chat bubble left out, no backdrop), in the pose on show, cropped to its opaque box at 4x, as a transparent PNG to the clipboard; if the browser refuses clipboard images it downloads `maple-character.png` instead. The old `exportPng()` was replaced by it.
- **Feature flags:** `SHOW_UPCOMING = false`. `DISABLED_SLOTS` is empty (a slot named there is hidden everywhere).
- **Storage keys** (localStorage, prefix kept as `maple-layers:` so saves survive): `looks-v1` (Look Book), `working-v1` (the stage's current look and baseline), `default-v2` (legacy single default, migrated into the book as `look-1` on first read), `housing-v2`.
- Vercel Analytics: `if (import.meta.env.PROD && !location.hostname.endsWith('github.io')) import('@vercel/analytics').then(m => m.inject()).catch(() => {})` (it only works on Vercel). **Keep it a dynamic, fail-safe import.** A static import let ad blockers (which block anything named "analytics") kill the whole module graph and blank the page. Mention analytics in any privacy notice.
- `vercel.json`: browsers keep pictures (`/assets`, `/sprites`, `/maps`, `/housing/furniture`, `/housing/homes`) for a year (`immutable`), the motion data (`/poses`) for 7 days, and the lists (`catalog.json`, `catalog-datamine.json`, `housing/catalog.json`) for 1 hour. The two housing home pictures are lossless WebP (half the PNG size); `extract-housing.mjs` writes PNG, so convert again after a re-run. Reason: the free tier's request limit; the owner's rule is that designs never change, only their categories (released, datamine, available), and those live in the lists. **So never change a picture in place:** a regenerated or fixed picture (a re-cut name tag, a replaced icon) must get a new file name, or returning visitors keep the old one for up to a year.

## Rendering facts (hard to rediscover)
- **Placement:** part top-left = `anchor - origin - mapOffset`. Anchors in skin-PNG pixels: brow (17,14), navel (17,45), hand (29,51); two-handed hand (22,45) (`ANCHORS`/`ANCHORS2` in `build-catalog.mjs`).
- **Layer order** comes from the game's `data/zmap.json`. Each part carries its game layer name. `zFallback` maps names zmap lacks (e.g. `mailChestBelowBody` -> `backMailChest`).
- **Hiding** uses the game's slot codes (`Base/smap.img`). A part whose layer is in `partHiddenBy` is hidden when **another** worn item lists that code in its `vslots` (an item never hides its own parts; `covering` in `buildLayers`):
  - H1 hides `hairOverHead`; H2 hides `hair`.
  - Hb hides `hairBelowBody`; Hs hides `hairShade`.
  - Hd head, Fc face, Af face accessory, Ay eye decoration, Ae earrings.
  - H3 to H6 and Hf are **back-view** layers. They do nothing here, but hats list them.
- **Hair** takes only `default/hair`, `hairOverHead`, `hairBelowBody`, `hairShade`. `backDefault/*` is the back view (ladders and ropes). Drawing it doubles the hair, so **do not extract it**.
- `hairShade` is one picture per skin tone (`tones` on the part; `buildLayers` skips parts whose `tones` exclude the worn skin). It is shared between poses (`shared: true`). Catalogue and Look Book cards leave it out (`drawThumb` passes `noShade`): it is barely visible at card size and cost one request per hair card on the free hosting tier. The stage keeps it.
- **Overall vs top/bottom** are mutually exclusive (`select`).
- **Undergarments:** `baseOf(sel)` draws the gender's starter top/bottom (`rules.baseBody` -> `catalog.base`) unless a top, bottom or overall covers them. They are not in `state.wear`, not in Top/Bottom lists, have no tile. Any `fresh()` used for a preview must copy `sex` and `skin`.
- **Two-handed stance:** only weapons in `stand2Only` (Toy Rifle: no one-handed art) get `pose: 'stand2'` and switch the whole body to `parts2`.
  - Every other weapon stands one-handed, so there is no Hold choice: a cash weapon is drawn from the class of the weapon held, so the real hold varies.
  - The Orange Toy Hammer's one-handed art was extracted from the game (class 30) by `extract-weapon-hold.mjs`.
- **Crisp pixels:** sprite pixels are whole device pixels. Never CSS-scale canvases by non-whole factors.
  - `init()` redraws on `resize` **and** polls `devicePixelRatio` twice a second, because zoom and display changes often send no event.
  - The redraw must include `renderColour()`.
- **WebKit trap:** every thumbnail must compose into its own canvas (`withScene`). A shared scratch canvas made each iPhone card show its neighbour's art.
- **Preview:**
  - The stage is 330 CSS px (`--stage-h` via `setStageHeight`, taller up to 480 when zoomed out; 235px on a phone).
  - Zoom is the largest whole number that fits `viewW`/`viewH` per axis.
  - Wearing a ring widens the frame to fit it (only measured on the unpadded scene).
  - `PREVIEW_PAD` lets big weapon effects run off the stage.
  - Thumbnails are not padded.
- **Backdrop:** `drawBackdrop` lines `groundRow` (feet planted a few rows into the grass) up with `FOOT_EDGE`. It mirrors the 800px picture (`public/maps/henesys.webp`, lossless WebP) left, right and below so wide or zoomed-out stages are always full. Sky/meadow come from `Map/Back/grassySoil.img` layers 0, 1, 4 over the Henesys street floor (map x=1700).
- **Dye** (`adjustColour`): game model as seen on meaegi.com.
  - Tone 0-359 (HSL hue turn).
  - Chroma -99..99 (linear saturation).
  - Brightness -99..99 (blend toward white/black).
  - Pure black and white are never changed; colours on the 17-step palette stay on it (channels cap at 238).
  - +Chroma has no visible effect on already-saturated sprites. That is not a bug.
- **Dyeable:** items the game knows but does not flag (`info/colorvar`) get `dyeable: false`. `dyeOf` then draws them undyed and the panel says "This item can't be dyed in the game."

## Features as they stand
**Layout.**
- `.topbar` holds the book tabs (`#books`, `.bk`, `renderBooks`) and the credits line, `Sprites © Nexon. Dye behaviour from meaegi.com.` (the owner's wording; README credits are longer on purpose).
- Left: stage (preview) above the Equipped panel. Right: the "book" with a tab rail (`renderTabs`, `TAB_NAMES`, `CHAPTER_TITLES`).
- `.grid` is `repeat(auto-fill, minmax(100px, 1fr))`, gap 8px. `--book-extra` (102px) keeps catalogue and Equipped cards the same width.
- `.app` is capped at 2400px and centred.
- Class-name traps: do not name a new class `.book` (the catalogue panel) or `.search` (the search box).

**Rail order:**
1. All (search; class `lookup`).
2. Body, Face, Hair (green "character" tabs).
3. Wearable tabs in `WEAR_ORDER` (Hat ... Weapon, Name Ring, Chat Ring).
4. Then, set apart: Look Book (pink), Released, Upcoming (purple).

A tab shows a check (`.tick`) when something in it is worn (never on Look Book, Released or Upcoming), and a "!" when it has released placeholders.

**Search (All tab, `renderSearch`).**
- Needs `MIN_SEARCH` (3) characters; matching ignores case, spaces and punctuation (`flat`).
- Results are grouped by category and capped at `MAX_RESULTS` (60). Rings and upcoming items are excluded.
- Typing debounces 150ms. Clicking equips and stays on the tab.
- Other tabs have a per-list search box. It clears on tab change and is absent on Released, Upcoming and Look Book.

**Body.**
- Cards show the whole body per skin (`SKIN_NAMES`; tones 9, 12, 13 are not in Classic and are hidden).
- `Gender: Male | Female` (`renderSexPicker`, `state.sex`) picks the undergarments. It is separate from the Face/Hair list filter; whether they should be linked is undecided.

**Face and Hair (`renderStyles`).**
- Clicking a style card (`styleCard`) takes the style off only when it is worn in the colour the list shows (`browse`); the same style in another colour switches to that colour. The card is highlighted only for that exact style and colour.
- Colour bar (`renderColourBar`, `HAIR_COLOURS`/`EYE_COLOURS`) recolours the list only (`browse`), never what is worn.
- `All / ♂ Male / ♀ Female` filter (`gender`, default All; collab styles are `gender: 'both'`).
- `Show: Released | Mystery Rotation | All · Datamine` (`renderSourceSwitch`). Mystery Rotation is the whole history of the Mystery Styles box, newest first, one dated heading per box, in plain text with its state and no counts ("Upcoming", "On rotation", "Ended"). The colour is only on the line beneath the heading, not the heading: a yellow "Starts Wed 11 Nov · 4:00 PM GMT+8 · in 7 hours" under the upcoming box, a green "Ends ..." under the one on now, nothing under the ended ones; a style in several boxes appears in each. A box is upcoming before its `start` (`isUpcoming`, `saleState`): its Released-tab pill dot is yellow (green while on sale, grey after), its line says "Starts in ...", and an Availability line for a worn style says "Coming in ...". Released is a clean list with no rotation markers (per-card labels were tried and judged too busy).
- Datamine cards: blue frame + DATAMINE badge. Frieren collab: green `FRIEREN COLLAB` badge. Tooltips show the Classic id.
- A new character has no face or hair, and cards never borrow a face.
- **White eyes:** cannot be set with the Signature Eye Colour Coupon (owner's report). `NO_COUPON_EYES`, `eyeWhiteNote` and `whiteEyesWorn` warn on the swatch, the list, the Equipped tile/panel and the colour preview.

**Wearable tabs (`renderWearable`).** Clicking a card equips it; clicking the worn card takes it off. Wearables sort by sprite id (Classic id for hats and game-file items), with `listFirst` ids first.
- **Hat "Fit" filter** (`renderFit`, `hairEffectOf`, `HAT_FITS`):
  - Topper = no H1 (hair untouched).
  - Cap = H1 without H2 (hair flattened).
  - Helmet = H2, or a hood (it also hides the back-hair layers H3, H4, H6 and Hf, like the Iljimae Mask: `hairEffectOf`), or listed in `rules.fitHelmet`, which sets `item.fit`: Demon Goblin, and hats whose art covers the whole face (Black Cat Hat, Zhu's Pig Hat, Triumphant Zakum Hat, White Rabbit Hat, Tengu Mask, Mysterious Mask, Alice Rabbit Hat; found by measuring how much of a face each hat's picture covers).
- Search (the All tab) lists datamined clothing too, after the released items of each group.
  - The names are ours: the game has no player-facing term.
  - Counts are in the buttons. The filter is kept across tabs, not saved.
  - About 16 game hats list H1 but not H2 yet look like helmets, so spot-check when adding hats.
- **Datamined clothing, weapons and rings are hidden on Vercel** (`SHOW_DATAMINE_WEARABLES` in `src/main.js` is true only in a `VITE_DATAMINE=1` build, which only the GitHub Pages test site uses; 06/11/2026 decision): listing them cost too many file requests on Vercel's free tier (a visit scrolling the datamined hats alone made ~700 requests; the team hit 75% of 1M CDN requests). No datamine switch on those tabs, not in Search, and a saved look holding one drops it. Face and Hair keep their datamine views. Everything below stays in the code and data; `scripts/ui-test.mjs` checks whichever mode its `VITE_DATAMINE` says; run it against a dev server started the same way, e.g. `VITE_DATAMINE=1 npx vite --port 5174` and `VITE_DATAMINE=1 BASE_URL=http://localhost:5174/ node scripts/ui-test.mjs`. If bringing them back, pack the card icons into sheets first.
- **Every clothing tab: `Show: Released | All · Datamine`** (the shared `renderSourceSwitch` / `source` / `listed`; Hat adds its Fit row, Weapon its Works with row). All · Datamine adds every other *cash* item of that kind in the game files (`data/datamine/<section>.json`, written by `extract-datamine.mjs`, which reads `info/cash` and the game's own names; `released: false`, DATAMINE badge, always dyeable). While `SHOW_UPCOMING` is off the upcoming items count as datamined too (`inView`). Datamined items stay out of Search and Random (`regular`). Skipped: the invisible "Transparent" items, 5 nameless hats, and 11 items whose standing picture is a blank placeholder or has no attachment point (`warnings.noParts`). A weapon with no one-handed stance (guitars, some crossbows) is drawn from its stand2 and gets `pose: 'stand2'`, like the Toy Rifle.
- **Motion frames:** every item, datamined ones included, gets full motion frames (`extract-poses.mjs`, about 4–5 min). The owner wants everything to look right in motion; moving a standing picture with the head is only the fallback for an item with no pose file.
- **Weapon "Works with" filter** (`renderWeaponType`):
  - Each weapon's `worksWith` (from the game's item description via `extract-weapon-types.mjs`; `["weapon"]` = any weapon) says which weapon types it can be worn over. The parser handles "any weapon except a, b…" (every Classic type but those), a hand carried over ("a two-handed sword, axe, or blunt weapon"), plurals and one uncoded description. `build-catalog.mjs` keeps only Classic World's 14 types (the Glowing Pumpkin Basket lists exactly these); weapons naming only main-game types (knuckles, guns…) get no `worksWith` and show only when no option is chosen (`warnings.noWeaponTypes`).
  - Options: Any (only weapons that go over any weapon), then each of the 14 `WEAPON_TYPES` on its own (the owner wants them separate, in Released and Datamine alike). `weaponType` is `null` at first (every weapon listed, no option highlighted); clicking the chosen option again clears it (`worksWithShown`).
  - `goesOver(item, type)` is true for "any weapon" items too, so a type option includes them.
- **Filter rows** (`#source`, `.source-row`): a two-column grid, each filter on its own line with its title in the first column (`.source-group` is `display: contents`), so options of stacked filters line up. `.seg` options wrap within their cell.
- **Dyeing datamined items:** every `released: false` item (datamined weapons, the upcoming ones) can be dyed: `build-catalog.mjs` skips the game's dye flag for them, as it may not be set before release.
- `.seg` switch rows wrap on narrow screens (`flex-wrap: wrap`, `min-width: 0`, 2px overlap and padding so wrapped lines align).

**Rings (Name Ring, Chat Ring).**
- All 76 name tags and 81 chat bubbles in the client are in the catalogue (duplicate White Label 1112222 skipped via `SKIP`). Released ones are `RELEASED` in `extract-rings.mjs`; the rest are datamine, with the same `Released | All · Datamine` switch.
- **Chat bubbles** are the item's own `info/sample` picture, not editable. Reason: several rings share a design number in this client, and the pieces for newer designs are missing, so piece-drawing gives wrong looks.
- A blank bubble gets text only when the game records its design's text colour (`clr`). Today only the Ink-and-Wash Thought Bubble qualifies, drawn as white "Maple" via `effect.text`. Do not guess colours for the other blank bubbles: the owner wants only deterministic output.
- **Name tags** are editable once worn (Name box, max 12 characters, placeholder/default `henehoe`, saved with the look). Each tag is drawn one of three ways:
  - From the game's design pieces (13 tags).
  - As a plain translucent box (White Label, `drawPlainTag`).
  - From pieces cut out of its sample (`cutTag` in `extract-rings.mjs`). The middle piece is one whole repeat of the strip's pattern (P columns, found from the rows outside the text band), so scallops, waves, stripes and spikes carry along the name (`drawNameTag` tiles it). The ends then move out to where that repeat starts and stops, so ornaments are never cut through, and they never reach into the sample's own text (`SAMPLE_TEXT`: the cut tags whose sample shows "MapleStory"/"Maple", listed by hand because snowflakes, dots and corner marks fool any automatic guess). `MANUAL` gives starting ends (and `P` where the automatic repeat is fooled: Red Rose's stems, Snowy Christmas's candy-cane edge); `TEXT` gives text colours. Checked by rendering every tag beside its sample; Mighty Banana's dotted panel still comes out plain.
- Cards and Equipped tiles show the sample picture.
- Placement: tag under the feet, bubble over the head (`ringLayer`).
- Text font is Noto Sans KR Medium 11px (the client's own English font).
- Scoreboard bubble animation is not done.

**Equipped panel (left, `renderColour`).**
- Small tiles (`equippedCard`, `MINI_VIEW`, `SHORT_LABEL`). Hover x (`removeEquipped`). Dye palette badge while dyed (`isDyed`, `syncDyed` flips it live without redrawing).
- The selected tile's panel starts with `panelHeading` (`<Category> · <name>`):
  - Face/hair: an Eye/Hair colour section of colour previews (`colourGrid`).
  - Wearables: Tone/Chroma/Brightness sliders with typed number boxes (`sliderRow`; gradient tracks) plus Random dye (full range) and Reset colour, or the can't-be-dyed note.
  - Weapons add a "Works with" chip section.
  - Rings: the Name box or a note.
- Every panel ends with **Availability** (`availability`, `BOX_NOUN`): "Available now · N days left · Mystery Face", "Last available … ago", "Not in any Mystery box on record" or "Not released yet".
- Empty state: an info note (says "above" on phones, `narrowLayout`).

**Stage tools.**
- Randomise: current gender filter, keeps rings, body gender and name; skips upcoming.
- Save to Look Book: always adds a new look.
- Undo changes since the look was loaded or saved (`undoChanges`, back to `baseline`).
- The page reopens on `working-v1`; on a first visit, on the newest saved look.

**Poses (`poseButtons`, `playPose`).**
- One column of buttons on the stage's right (one row along the bottom on phones): six attack motions (`MOTION_BUTTONS`: one-handed swing, two-handed swing, spear, dagger stab, crossbow, bow), then Ladder.
- Icons are the owner's pixel designs (`POSE_ICONS` letter grids, `poseSvg`, `ICON_SHADE`, drawn in `currentColor`).
- Each motion click plays its next action once (`motionStep`, wraps) and rests in the motion's stance (stand1 or stand2).
- Ladder climbs twice and returns to `resting` without resetting the count. There is no Stand button.
- A motion the worn weapon lacks is disabled (`motionFor`). Two-handed falls back to the polearm swings (`fallback`) for weapons with only those.
- Pose data is fetched on first press (`fetchPose`) from `public/poses/body.json` (`motions`, `actions`, points), `poses/w/<id>.json` and `poses/hair/<colour id>.json`; pictures are de-duplicated in `public/sprites/pose/<hash>.png`.
- The face moves with the brow and is hidden (with face/eye accessories) when the frame turns away.
- Weapon `effect` parts are drawn; afterimages are not. Thumbnails always stand. Rope and F variants are not extracted.

**Look Book (`renderLooks`).**
- Whole-body cards (`LOOK_VIEW`, sized to the body at the current zoom), newest first, no caption (number and date in the tooltip).
- Opening the tab never changes the character; clicking a card wears it.
- Hover x deletes at once, with no confirm.

**Released tab (`renderPast`).**
- Category file tabs (`.past-tab`, from `data/boxes.json` groups), date-first pills with sale dots (`onSale`, `.sale-dot`), then the selected box's title (under its date line, `boxWhen`: a dot and "Ends in 14 days" in green, or "Ended 1 day ago" in grey; the short form because the dates are already on the line above) and cards grouped by slot (Mystery Styles: Hairstyles/Faces sections with their colour bar, split Male/Female).
- Opens on the `latest` box (currently the Nov 4 crate).
- Rates appear only in card tooltips.
- Timing:
  - `start`/`end` are UTC. A timed `end` is the last minute sold (on sale to the end of that minute).
  - A date-only `end` (`isDay`) counts to the end of that UTC day.
  - No `end` means still on sale, with no ends line.
  - `tickEnds`/`wakeAt` update lines and dots only when their words change.

**Upcoming tab (`renderUpcoming`).** Shows only `unconfirmedNote()`, always fully expanded: upcoming items can no longer be datamined (Nexon now changes boxes during maintenance and no longer flags coming items as dyeable ahead of launch).
- With `SHOW_UPCOMING = false`, the possible-upcoming items (`upcoming: true` in the catalogue) are not listed anywhere, not randomised, not searchable and not restored from saves.
- Their code (`renderCrateSwitch`, `hasUpcoming`, `inView`, `regular`, UPCOMING badge) and data (`data/upcoming.json`, `public/sprites/upcoming/`) stay.
- Items from a released box are marked `released: true` in `data/upcoming.json` and become ordinary items.

**Housing (`src/housing.js`).**
- Tabs: Homes, then furniture groups (decor, chests, crafting stations; the placed art for stations is the NPC).
- 2 homes (Yellow Mushroom House, Kerning City Apartment), cropped to the house. The stage is sized to the home's shape (`sizeStage`), and the left column widens via `--left`.
- Pieces: `LIMITS` in `src/housing.js` per home: 16 decor, 1 chest and 1 crafting station, each counted on its own (18 at most); a saved home is trimmed to this on load. The stage counter reads "3/16 decor · 1/1 chest · 0/1 crafting station". Drag to move. On-piece mirror and remove buttons (`placeButtons`). Keyboard: arrows, F, Delete. One stage tool: Clear all.
- Saved per home in `housing-v2`.
- Not done: snapping or collision, animation (first frame only), sharing a layout, Housing in Search. Chairs, reward items and the Straw Training Dummy (encrypted `.ms` pack) are left out.

**Phone (≤800px).**
- One column, in this order: sticky stage, book, Equipped, credits. Equipped goes last so nothing above a tapped card moves when it grows.
- `.side` uses `display: contents`. Tabs become a sideways strip whose scroll position is kept across re-renders. The page scrolls as a whole.
- The tab strip is not sticky (known trade-off).

## Gotchas
- `el()` filters only `null`/`undefined` children: write `cond ? el(...) : null`, never `cond && el(...)` (it prints "false").
- `extract-styles.mjs` mangles "Übel" in `data/items.json`, and a re-run rewrites hair PNGs with identical pixels. Restore both from git afterwards so only real changes show. Game strings with U+FFFD are patched in the extractors.
- Changing an item's id (e.g. moving it to its Classic id) silently drops it from looks saved under the old id.
- **A Classic id (the game's id) identifies a hair or face style**, not its name: several styles share a name, and matching by name picks the wrong art.
- The game's own text damages the "ü" in the Frieren collab names ("Übel", "Lügner" come out garbled); the catalogue keeps the correct spelling.
- Weapon art in the client is stored per weapon class (`Character/Weapon/0<id>.img/<class>/<anim>`). A cash weapon is drawn from the class of what is held.
- `extract-upcoming.mjs` ignores items flagged `upcoming` when deciding what is already in the catalogue. `rules.upcomingExclude` keeps the Skull Overalls out on purpose.
- A box `end` with no time must be written date-only (`"2026-11-18"`). Add the time once Nexon prints it (the Nov 4 crate's end is date-only).

## Open items
- Nov 4 Mystery Fashion Crate: real end time and rates unknown.
- Not built: palette (hue-band) filter, dye-slider arrow buttons, skin-tone protection for chroma, hair/face thumbnails showing worn wearables, the gun-class (49) hold for the hammer, Scoreboard bubble animation, prone pose.
- The Orange Toy Hammer's two-handed art still comes from the API, not the game's class-30 stand2. It looks right but was never diffed.
- Possibly link the Body gender to the Face/Hair filter (undecided).
- Credits do not yet name the game files as a source. Add a privacy notice for Vercel Analytics before going public.
- `npm audit` reports a moderate esbuild/Vite dev-server advisory (fix needs a major Vite upgrade; it affects only the dev server).
- No admin panel, by decision: rules stay hand-edited files.

## Datamine lock: removed (added 2026-11-09, removed 2026-11-10)
- For one day the All · Datamine views asked two questions (who made henehoes; what they have been trying to dye) before opening, to keep casual visitors off a hosting plan that was close to its request limit. The user had it removed on 2026-11-10: the views open directly, `src/unlock.js` and the padlock/dialog styles are gone, and `datamineOn()` in `src/main.js` is just the build setting (`VITE_DATAMINE=1` for clothing, weapons and rings; Face, Hair and Pets show their datamine everywhere). It was only ever a soft lock (the data files are public).

## Pictures from GitHub Pages on the Vercel site (added 2026-11-10)
- Why: Vercel's free plan allows 1,000,000 requests a month and was at 930,014. One first visit costs 55 requests, and a short browse about 360, nearly all of them sprite files.
- How: `src/assets.js` (`assetUrl`, `loadCors`) builds every sprite, housing, map and pose URL. With `VITE_ASSET_BASE` unset (dev, tests, the GitHub Pages build) nothing changes. The Vercel project sets `VITE_ASSET_BASE=https://henehoes.github.io` (an environment variable in the Vercel dashboard, never in the repo); `npm run build` then runs `scripts/strip-assets.mjs`, which leaves `sprites/`, `maps/`, `poses/` and the housing pictures out of `dist` (about 3 MB instead of about 49 MB). `catalog.json`, `catalog-datamine.json` and `housing/catalog.json` stay on Vercel.
- GitHub Pages (henehoes/henehoes.github.io) sends `access-control-allow-origin: *`, which the dye code needs; its cache is 10 minutes (`max-age=600`) and cannot be changed.
- Order matters: new sprites must be on the Pages site before the Vercel site that uses them. Push to the Pages repository first, wait for its Pages workflow to finish, then push to Vercel's repository.
- Checked on 2026-11-10 with `VITE_ASSET_BASE=https://henehoes.github.io npm run build` and `vite preview`: sprites came from henehoes.github.io, the preview drew, dyeing worked, no CORS errors.
- Hair cards draw every layer of the hairstyle (about 3.8 files on average, 9 at most; the shade is left out) with the current face and skin, so opening the Hair tab costs about 116 requests. Pre-made one-picture thumbnails would cut that to 1 per card (not done).

## Pets and pet equipment (added 2026-11-10)
- One tab, "Pet", in a section of its own (peach, `.tab.pets`; the light blue it used to be, `oklch(82% .09 215 / .85)`, is saved for a future tab) between Chat Ring and the Look Book, not part of the clothing tabs. It lists the pets. Pet equipment is not a tab: it is a setting of the pet, chosen in the Equipped panel (select the Pet tile: a "Pet equipment" section lists None first, then every piece that fits, released ones first and the datamined ones after them badged DATAMINE (always shown, whatever the Pet tab's view), `petGearGrid` in `src/main.js`); there is no separate equipment tile. From the game files by `scripts/extract-pets.mjs` (needs `WZ_DATA`): 35 pets (`Item/Pet/<id>.img`, ids 5000000 to 5000054) and 10 pieces of pet equipment (`Character/PetEquip/0<id>.img`, ids 1802000 to 1802009), names from `String/Pet.img` and `String/Eqp.img` (ClassicWorld/PetEquip). Output: `public/sprites/pet/` (about 650 KB), `data/game-pets.json`, merged into `public/catalog.json` as `catalog.pets` by `scripts/build-catalog.mjs`.
- Each pet is shown as its resting picture, `stand0` frame 0, a still (chosen with the user; the animations exist in the files). What a pet can wear is decided by the game data, not by the item's written description (which names only 6 pets: Brown Kitty, Black Kitty, Brown Puppy, Pink Bunny, White Bunny, Black Pig). Every piece has an entry for each of the first 11 pets (5000000 to 5000010) and none for the others, so all 10 pieces fit those 11. Most entries hold their own picture; some are links to another pet's (Black Kitty uses Brown Kitty's, White Bunny uses Pink Bunny's, Dino Girl uses Dino Boy's on nine pieces), which `extract-pets.mjs` follows (`from` in the catalogue). Each picture is `stand0` frame 0 with its own origin. Pet and equipment share one anchor, the pet's feet.
- Drawing: `petJobs()` in `src/main.js` puts the pet 46 sprite pixels right of the character on the same ground line (pulled in when wide), equipment on top. The stage frame widens to fit it (`petWorn`). The pet is saved in a look (`pet: { id, equip }` in `pack()`/`unpack()`); the Equipped panel lists "Pet" and "Pet gear" with no colour settings; "Copy character image" leaves the pet out.
- Released or datamine: `RELEASED_PETS` and `RELEASED_EQUIP` in `extract-pets.mjs`, from the cash shop news (`reference/cash-shop/`, "Pets" and "Pet Equipment"; the Grand Launch, Oct 28 and Nov 4 pages agree): 6 pets (Brown Kitty, Brown Puppy, Pink Bunny, Black Kitty, White Bunny, Black Pig; 3,500 NX, 30 days) and 8 pieces of equipment (Red Ribbon, Yellow Hat, Red Hat, Black Hat, Pink Laced Cap, Sky Blue Laced Cap, Blue Top Hat, Red Top Hat; 3,200 NX, permanent). Everything else is datamine, under All · Datamine (shown on every build like Face and Hair). The news says the equipment fits those 6 pets; the game data gives every piece an entry for the first 11 pets, which is what the datamine view follows.
- Two pets are both named "Snail" (5000033, 5000054) and two "Husky" (5000006, 5000021): the card title carries the game id.

## The category rail fits the book (added 2026-11-10)
- `fitRail()` in `src/main.js`: when the tabs in the right-hand rail would run past the bottom of the book (a short screen, or more tabs), it shrinks them together, through `--fit` (1 down to 0.6) and `--tab-font` set on `#tabs` and used by `.chapters` and `.tab` in `src/style.css` (height, gaps, margins and text). Tall screens keep `--fit` 1. It runs whenever the tabs are drawn and on window resize. The phone layout (a strip that scrolls sideways) is left alone. It is not a page zoom: a page cannot change the browser's zoom, and a CSS zoom would stop the sprites landing on whole pixels, so only the rail shrinks.

## Founder's Packages and 10-Day Equip Covers in the datamine (added 2026-11-10)
- Decided with the user: the main (Released) lists are mystery crate and event box permanent items only. Founder's Package items and the 10-day expiring NX equips are datamine: not in the main tabs, not in the Released tab. In the All · Datamine view they stay in the ONE full list, in the game's id order, mixed with the released and other datamine items (the user wants to see where released items fall in the overall order, to spot patterns): no group headings. They are not labelled DATAMINE: Founder's Package items say **FOUNDERS** (gold) and the 10-day equips say **EXPIRING NX** (orange). Two earlier versions were tried and dropped: releasing the Founder's sets with a Released-tab group, and named sections with their own headings inside the datamine.
- `data/datamine-sections.json` lists them: **Founder's Packages** (20 items: the Well-Loved set 6, Founder's Thief set 6, Manji's set 5 including the cape, and the three Marks of the Founder; from the game's strings, the Avatar Sets in `String/Consume.img`, and MeowDB for which package has which; the Tan mark is inferred) and **10-Day Equip Covers** (15 items, the "10-Day Equip Covers" section of the cash shop news in `reference/cash-shop/`, identical on Oct 21, Oct 28 and Nov 4). Each group has a `badge`; `scripts/build-catalog.mjs` gives its items a `tag`, and `unreleasedBadge()` in `src/main.js` shows it in place of DATAMINE. The datamine needs a `VITE_DATAMINE=1` build.
- Silent Sea of Clouds (cape 1107010, in Manji's set): the cape's own pictures are 1x1 blanks; the game draws it as an item effect (`Effect/ItemEff.img/1107010/effect/default`, a faded cloud, 8 frames of 196x108, z -3, behind the character). `scripts/lib-draw.mjs` uses frame 0 as a still, origin on the navel (a guess at where the game puts it: tell the user if it should move). The animation is not played.
- Not in the catalogue: the Glimmer, Glow and Radiance of the Founder effects (cash items 5010006 to 5010008) and the Founder ring exchange coupons (the Founder's Label and Chat Rings themselves are released).
- The saved Founders page has no article (see `reference/cash-shop/founders-access-cash-shop.md`).

- Nov 11 Mystery Styles (UTC Nov 11 8:00 AM to Nov 25 7:59 AM, 24 styles at 16.67% each, supplied by the user): box `mystery-styles-nov11` in `data/boxes.json` (`latest: true`, so the Released tab opens on it; `Artist Hair` and `Kitty Hair` carry `match` for the game's "Black Artist Hair" / "Black Kitty Hair"). Its styles are in `data/released.json` and flagged `released: true` in `data/items.json` (edited by hand, which is what `add-styles.mjs` would do, without calling the sprite API), so they are ordinary released styles with no DATAMINE label.
