/**
 * Copia los recursos no-TypeScript (plantillas .hbs) a la carpeta dist
 * durante el build de producción, porque `tsc` solo compila .ts.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const assets = [
  {
    from: path.join(root, 'src/modules/pdf/templates'),
    to: path.join(root, 'dist/modules/pdf/templates'),
  },
];

for (const asset of assets) {
  if (!fs.existsSync(asset.from)) continue;
  fs.mkdirSync(path.dirname(asset.to), { recursive: true });
  fs.cpSync(asset.from, asset.to, { recursive: true });
  console.log(`Copiado: ${path.relative(root, asset.from)} -> ${path.relative(root, asset.to)}`);
}
