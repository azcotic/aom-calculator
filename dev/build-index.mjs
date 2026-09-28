// Ensambla el index.html final autocontenido a partir de las piezas de dev/.
// Ejecutar con: node dev/build-index.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const stripExports = (src) => src.replace(/^export (const|function)/gm, '$1');

let html = read('dev/index.template.html');
html = html.replace('<!--STYLES-->', read('dev/styles.css'));
html = html.replace('<!--ICONS-->', read('dev/icons.js'));
html = html.replace('<!--ENGINE_AND_DATA-->', stripExports(read('engine.js')) + '\n' + stripExports(read('data.js')));
html = html.replace('<!--UI-->', read('dev/ui-source.js'));

writeFileSync(join(root, 'index.html'), html, 'utf8');
console.log(`index.html generado (${(html.length / 1024).toFixed(0)} KB).`);
