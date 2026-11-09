// The lock on the "All · Datamine" views. Answer two questions once; the browser remembers it (localStorage), and every datamine view,
// Search included, opens. This is a soft lock for casual visitors: the page and its data files are public, so it protects nothing secret.
// Only SHA-256 hashes of the answers are kept here, not the answers themselves.
const KEY = 'henehoes.datamine-unlocked';
const SALT = 'henehoes:';
const NAME_HASH = '67413cbf3975c8db78ee18e131a936b572698b25c9483b5ea94ebb20f25d4cf2'; // the maker's name, lower case
const DYE_HASH = '776879aedab37b9918aad6456b9435fbf730b913fca1a1aafda3847c1f2a279d';  // "item|colour", lower case
const ITEMS = ['Halo', 'Devil Horns', 'Orange Cat Beanie', 'Blue Cat Beanie', 'Slime Slippers', 'Angel Wand', 'Choco Scepter', 'Starlight Heart Scepter'];
const COLOURS = ['Pastel Pink', 'Baby Blue', 'Gold', 'Black', 'Light Grey', 'Neon Purple', 'Ghost', 'White', 'Hot Pink', 'Mint Green'];

let unlocked = false;
try { unlocked = localStorage.getItem(KEY) === '1'; } catch { /* storage blocked: the lock simply asks again next visit */ }
export const isUnlocked = () => unlocked;

async function sha(text) {
  const bytes = new TextEncoder().encode(SALT + text);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
}
const shuffled = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Opens the question box. Resolves true once it has been answered correctly, false if it is closed first.
export function askUnlock() {
  if (unlocked) return Promise.resolve(true);
  return new Promise(resolve => {
    const h = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids.filter(k => k != null)); return n; };
    const dlg = h('dialog', { className: 'gate' });
    dlg.setAttribute('aria-labelledby', 'gate-title');
    const name = h('input', { id: 'gate-name', type: 'text', autocomplete: 'off', spellcheck: false, maxLength: 40 });
    const select = (id, list, blank) => h('select', { id }, h('option', { value: '', textContent: blank }), ...shuffled(list).map(t => h('option', { value: t, textContent: t })));
    const item = select('gate-item', ITEMS, 'Choose an item'), colour = select('gate-colour', COLOURS, 'Choose a colour');
    const msg = h('p', { className: 'gate-msg', role: 'alert' });
    const ok = h('button', { type: 'submit', className: 'small-btn', textContent: 'Unlock' });
    const cancel = h('button', { type: 'button', className: 'small-btn', textContent: 'Cancel' });
    const q1 = h('label', { htmlFor: 'gate-name' }); q1.innerHTML = 'Who made <b>henehoes</b>?';
    const form = h('form', { method: 'dialog' },
      h('h2', { id: 'gate-title', textContent: 'Datamine is locked' }),
      h('p', { className: 'gate-note', textContent: "Loading this many images for thousands of visitors will push us past our hosting limits, so the datamine is limited to friends for now. Answer these two questions to unlock all Datamine tabs:" }),
      q1, name,
      h('label', { textContent: 'What have they been trying to dye?' }),
      h('div', { className: 'gate-row' }, item, colour),
      msg, h('div', { className: 'gate-actions' }, cancel, ok));
    dlg.append(form);
    let done = false;
    const finish = v => { if (done) return; done = true; resolve(v); dlg.close(); dlg.remove(); };
    cancel.onclick = () => finish(false);
    dlg.addEventListener('cancel', e => { e.preventDefault(); finish(false); }); // Esc
    dlg.addEventListener('click', e => { if (e.target === dlg) finish(false); }); // the backdrop
    form.onsubmit = async e => {
      e.preventDefault();
      const right = (await sha(name.value.trim().toLowerCase())) === NAME_HASH
        && (await sha(`${item.value}|${colour.value}`.toLowerCase())) === DYE_HASH;
      if (!right) { msg.textContent = 'Not quite. Try again.'; return; }
      unlocked = true;
      try { localStorage.setItem(KEY, '1'); } catch { /* remembered for this visit only */ }
      finish(true);
    };
    document.body.append(dlg);
    dlg.showModal();
    name.focus();
  });
}
