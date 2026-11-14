// Draws the CareTrack home-screen icons, with no image library: a calm green
// tile with a three-step progress line. Run with `npm run icons` after editing.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
const SIZES = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

const BACKGROUND = [4, 120, 87]; // emerald-700
const MARK = [255, 255, 255];
const SAMPLES = 4;

function insideRoundedSquare(x, y, radius) {
  const cx = Math.min(Math.max(x, radius), 1 - radius);
  const cy = Math.min(Math.max(y, radius), 1 - radius);

  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function insideMark(x, y) {
  const top = 0.27;
  const middle = 0.5;
  const bottom = 0.73;
  const lineHalfWidth = 0.023;
  const dotRadius = 0.085;
  const ringInner = 0.045;

  const distanceSquared = (cx, cy) => (x - cx) ** 2 + (y - cy) ** 2;

  // The first two steps are filled and joined: progress so far.
  if (Math.abs(x - 0.5) <= lineHalfWidth && y >= top && y <= middle) return true;
  if (distanceSquared(0.5, top) <= dotRadius ** 2) return true;
  if (distanceSquared(0.5, middle) <= dotRadius ** 2) return true;

  // The last step is a ring: still to come.
  return (
    distanceSquared(0.5, bottom) <= dotRadius ** 2 &&
    distanceSquared(0.5, bottom) > ringInner ** 2
  );
}

function drawPixel(x, y, size) {
  let background = 0;
  let mark = 0;

  for (let sy = 0; sy < SAMPLES; sy += 1) {
    for (let sx = 0; sx < SAMPLES; sx += 1) {
      const px = (x + (sx + 0.5) / SAMPLES) / size;
      const py = (y + (sy + 0.5) / SAMPLES) / size;

      if (!insideRoundedSquare(px, py, 0.215)) continue;

      background += 1;
      if (insideMark(px, py)) mark += 1;
    }
  }

  const total = SAMPLES * SAMPLES;
  const alpha = background / total;
  if (alpha === 0) return [0, 0, 0, 0];

  const white = mark / total;
  const keep = background / total;

  // White over the green tile, with the tile's own alpha shaping the corners.
  const r = Math.round((BACKGROUND[0] * (keep - white) + MARK[0] * white) / keep);
  const g = Math.round((BACKGROUND[1] * (keep - white) + MARK[1] * white) / keep);
  const b = Math.round((BACKGROUND[2] * (keep - white) + MARK[2] * white) / keep);

  return [r, g, b, Math.round(alpha * 255)];
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }

  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);

  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, crc]);
}

function encodePng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter: none

    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = drawPixel(x, y, size);
      const offset = rowStart + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });

for (const { name, size } of SIZES) {
  writeFileSync(join(OUT_DIR, name), encodePng(size));
  console.log(`${name} (${size}x${size})`);
}
