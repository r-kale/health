// Generates the PWA PNG icons without any image library: a dark rounded
// tile with a simple dumbbell glyph, encoded as a valid PNG via zlib.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const BG = [15, 23, 42, 255]; // #0f172a
const FG = [56, 189, 248, 255]; // #38bdf8

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  const px = (x, y) => {
    const u = x / size, v = y / size;
    // rounded corners
    const r = 0.12;
    const dx = Math.max(r - u, u - (1 - r), 0);
    const dy = Math.max(r - v, v - (1 - r), 0);
    if (Math.hypot(dx, dy) > r) return [0, 0, 0, 0];
    // dumbbell glyph (normalised coords)
    const within = (x0, y0, x1, y1) => u >= x0 && u <= x1 && v >= y0 && v <= y1;
    const bar = within(0.34, 0.46, 0.66, 0.54);
    const plL = within(0.24, 0.36, 0.32, 0.64);
    const plR = within(0.68, 0.36, 0.76, 0.64);
    const capL = within(0.17, 0.42, 0.23, 0.58);
    const capR = within(0.77, 0.42, 0.83, 0.58);
    return bar || plL || plR || capL || capR ? FG : BG;
  };

  const raw = Buffer.alloc((size * 4 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = px(x, y);
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public", { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, png(size));
  console.log(`wrote public/icon-${size}.png`);
}
