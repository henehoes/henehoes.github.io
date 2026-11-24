// The GitHub Pages build (VITE_DATAMINE=1) gets its own tab title and Bunny Slippers icons (scripts/make-favicon.mjs), and, when
// VITE_GOATCOUNTER (the site code) is set, GoatCounter: its script for visitors with JavaScript, a tracking pixel inside <noscript> for the rest.
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [{
    name: 'pro-tab',
    transformIndexHtml: html => {
      const env = loadEnv(mode, process.cwd());
      if (env.VITE_DATAMINE !== '1') return html;
      const gc = env.VITE_GOATCOUNTER;
      const counter = !gc || mode !== 'production' ? '' : `
    <script data-goatcounter="https://${gc}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
    <noscript><img src="https://${gc}.goatcounter.com/count?p=/" alt="" width="1" height="1" style="position:absolute;left:-9999px"></noscript>
  `;
      return html
        .replace('<title>classic henehoes</title>', '<title>henehoes pro</title>')
        .replace(/href="\/(favicon-32|favicon|apple-touch-icon)\.png"/g, 'href="/pro-$1.png"')
        .replace('</head>', counter + '</head>');
    },
  }],
}));
