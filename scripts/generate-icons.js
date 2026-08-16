const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const input = path.resolve(__dirname, '../public/logo.svg');
const outputDir = path.resolve(__dirname, '../public/icons');

fs.mkdirSync(outputDir, { recursive: true });

async function generate(size) {
  await sharp(input)
    .resize(size, Math.round(size * 0.27), { fit: 'contain', background: { r: 11, g: 17, b: 32, alpha: 1 } })
    .png()
    .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
}

Promise.all([192, 512].map(generate))
  .then(() => console.log('Icons generated'))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
