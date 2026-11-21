const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const indexPath = path.join(rootDir, 'index.html');
const cssPath = path.join(rootDir, 'style.css');
const fbConfigPath = path.join(rootDir, 'firebase-config.js');
const fbSyncPath = path.join(rootDir, 'firebase-sync.js');
const dataPath = path.join(rootDir, 'data.js');
const appPath = path.join(rootDir, 'app.js');
const outPath = path.join(rootDir, 'checklist-valise-standalone.html');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const styleCss = fs.readFileSync(cssPath, 'utf8');
const fbConfigJs = fs.existsSync(fbConfigPath) ? fs.readFileSync(fbConfigPath, 'utf8') : '';
const fbSyncJs = fs.existsSync(fbSyncPath) ? fs.readFileSync(fbSyncPath, 'utf8') : '';
const dataJs = fs.readFileSync(dataPath, 'utf8');
const appJs = fs.readFileSync(appPath, 'utf8');

const cssLinkRegex = /<link\s+rel="stylesheet"\s+href="style\.css"\s*\/?>/i;
const scriptsRegex = /(?:<script\s+src="firebase-config\.js"\s*><\/script>\s*<script\s+type="module"\s+src="firebase-sync\.js"\s*><\/script>\s*)?<script\s+src="data\.js"\s*><\/script>\s*<script\s+src="app\.js"\s*><\/script>/i;

if (!cssLinkRegex.test(indexHtml)) {
  throw new Error('Impossible de trouver <link rel="stylesheet" href="style.css"> dans index.html');
}
if (!scriptsRegex.test(indexHtml)) {
  throw new Error('Impossible de trouver les balises <script src="data.js"> et <script src="app.js"> dans index.html');
}

const escapeInlineScript = (js) => js.replace(/<\/script>/gi, '<\\/script>');
const escapeInlineStyle = (css) => css.replace(/<\/style>/gi, '<\\/style>');

let standalone = indexHtml.replace(
  cssLinkRegex,
  () => `<style>\n${escapeInlineStyle(styleCss)}\n  </style>`
);

standalone = standalone.replace(
  scriptsRegex,
  () => {
    const fbScripts = fbConfigJs && fbSyncJs
      ? `<script>\n${escapeInlineScript(fbConfigJs)}\n  </script>\n  <script type="module">\n${escapeInlineScript(fbSyncJs)}\n  </script>\n  `
      : '';
    return `${fbScripts}<script>\n${escapeInlineScript(dataJs)}\n\n${escapeInlineScript(appJs)}\n  </script>`;
  }
);

fs.writeFileSync(outPath, standalone, 'utf8');
console.log(`Standalone généré : ${outPath} (${(Buffer.byteLength(standalone, 'utf8') / 1024).toFixed(1)} Ko)`);
