// Pass-code screen for the henehoes pro site (the VITE_DATAMINE build with VITE_GATE_URL set; otherwise nothing happens).
// A friend types the code the owner gave them; the checker (a small Cloudflare Worker at VITE_GATE_URL) accepts it and ties it to this browser.
// The code and a random browser id are kept in localStorage and checked again on every visit, so a revoked code stops working at the next load.
// This keeps casual visitors out; it is not security (the data files are public: the Vercel site loads its pictures from here).
const KEY = 'maple-layers:gate-v1';
const GATE_URL = import.meta.env.VITE_GATE_URL;

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const write = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private window: asked again next time */ } };
const forget = () => { try { localStorage.removeItem(KEY); } catch { /* nothing to forget */ } };
const newDevice = () => (crypto.randomUUID ? crypto.randomUUID() : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// 'ok', 'invalid', 'used', or 'offline' (the checker could not be reached)
async function check(code, device) {
  try {
    const res = await fetch(GATE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, device }) });
    if (res.ok) return 'ok';
    const body = await res.json().catch(() => ({}));
    return body.error === 'used' ? 'used' : res.status === 403 || res.status === 400 ? 'invalid' : 'offline';
  } catch { return 'offline'; }
}

const MESSAGES = {
  invalid: "That code isn't right. Check it and try again.",
  used: 'This code is already linked to another browser. Ask for a new code.',
  offline: "Couldn't reach the code checker. Try again in a moment.",
  revoked: 'Your code no longer works. Ask for a new one.',
};

function ask(notice) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'gate';
    wrap.innerHTML = `<form class="gate-card" autocomplete="off">
      <h1>henehoes pro</h1>
      <p class="gate-lead">This version is for my close friends 💗<br>Message me on Discord or whisper me in&#8209;game and I'll send you a code!</p>
      <label for="gate-code">Pass code</label>
      <input id="gate-code" name="code" type="text" inputmode="text" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="HOES-XXXX-XXXX-XXXX" required>
      <p class="gate-error" id="gate-error" role="alert"></p>
      <button type="submit">Unlock</button>
      <p class="gate-alt">If you don't have my Discord, or you're not comfortable asking for a code, the <a href="https://henehoes.vercel.app/" target="_blank" rel="noopener"><b>standard version</b></a> is open to everyone!</p>
    </form>`;
    document.body.append(wrap);
    const form = wrap.querySelector('form'), input = wrap.querySelector('input'), err = wrap.querySelector('#gate-error'), btn = wrap.querySelector('button');
    err.textContent = notice ? MESSAGES[notice] : '';
    input.focus();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const code = input.value.trim();
      if (!code) return;
      btn.disabled = true; err.textContent = '';
      const device = read()?.device ?? newDevice();
      const result = await check(code, device);
      if (result === 'ok') { write({ code, device }); wrap.remove(); resolve(); return; }
      err.textContent = MESSAGES[result]; btn.disabled = false; input.select();
    });
  });
}

// Resolves when the visitor may see the app.
export async function passGate() {
  if (!GATE_URL) return;
  const saved = read();
  if (saved?.code && saved?.device) {
    const result = await check(saved.code, saved.device);
    if (result === 'ok' || result === 'offline') return; // offline: a friend already let in is not locked out by an outage
    forget();
    return ask(result === 'used' || result === 'invalid' ? 'revoked' : result);
  }
  return ask();
}
