// Genera dev/test-harness.html = index.html + autopilot.js, SOLO para pruebas visuales locales.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const autopilot = readFileSync(join(__dirname, 'autopilot.js'), 'utf8');
const out = html.replace('</body>', `<script>\n${autopilot}\n</script>\n</body>`);
writeFileSync(join(__dirname, 'test-harness.html'), out, 'utf8');
console.log('test-harness.html generado.');
