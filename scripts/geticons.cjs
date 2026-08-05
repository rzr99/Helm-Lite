// Regenerates every raster app icon from the Ryze twin-blade mark.
// Run: node scripts/geticons.cjs
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const pngToIcoMod = require("png-to-ico");
const pngToIco = pngToIcoMod.default || pngToIcoMod;

const root = path.resolve(__dirname, "..");
const S = 512;
const scale = S / 72;

const blades = `
  <g transform="scale(${scale})">
    <path d="M27 58 C 40 54 50 43 56 30 C 49 44 37 52 31 59 Z" fill="#8A4206" />
    <path d="M15 54 C 30 52 52 32 58 13 C 51 34 33 48 25 57 Z" fill="#E87000" />
  </g>`;

const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" fill="#0E0E0D"/>${blades}</svg>`;
const roundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" rx="92" fill="#0E0E0D"/>${blades}</svg>`;

async function png(svg, size, out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(root, out));
  console.log("wrote", out);
}

(async () => {
  await png(squareSvg, 180, "app/apple-icon.png");
  await png(squareSvg, 192, "public/icon-192.png");
  await png(squareSvg, 512, "public/icon-512.png");
  await png(squareSvg, 512, "public/icon-maskable-512.png");

  const buffers = await Promise.all(
    [16, 32, 48].map((s) =>
      sharp(Buffer.from(roundSvg)).resize(s, s).png().toBuffer()
    )
  );
  fs.writeFileSync(path.join(root, "app/favicon.ico"), await pngToIco(buffers));
  console.log("wrote app/favicon.ico");
})();
