// 앱 아이콘 PNG 생성(의존성 없음): 보라 바탕에 흰 V. node test/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = buf => {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// 점에서 선분까지 거리
const dist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

// pad: 마스커블 아이콘은 가장자리 안전 영역(10%)만큼 글자를 안쪽으로
function icon(size, { rounded, pad }) {
  const buf = Buffer.alloc(size * size * 4);
  const r = rounded ? size * 0.22 : 0;
  const s = pad ? 0.8 : 1; // 글자 축소 비율
  const c = size / 2;
  const seg = [
    [c + (0.28 - 0.5) * size * s, c + (0.31 - 0.5) * size * s, c, c + (0.72 - 0.5) * size * s],
    [c + (0.72 - 0.5) * size * s, c + (0.31 - 0.5) * size * s, c, c + (0.72 - 0.5) * size * s],
  ];
  const stroke = size * 0.11 * s;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5;
      // 둥근 사각형 바깥은 투명
      const cx = Math.min(Math.max(px, r), size - r), cy = Math.min(Math.max(py, r), size - r);
      const inside = r ? Math.hypot(px - cx, py - cy) <= r : true;
      const i = (y * size + x) * 4;
      if (!inside) continue;
      const d = Math.min(...seg.map(([ax, ay, bx, by]) => dist(px, py, ax, ay, bx, by)));
      const a = Math.max(0, Math.min(1, stroke / 2 - d + 0.5)); // 흰 V의 비율(안티앨리어싱)
      buf[i] = Math.round(0x5b + (255 - 0x5b) * a);
      buf[i + 1] = Math.round(0x4c + (255 - 0x4c) * a);
      buf[i + 2] = Math.round(0xf5 + (255 - 0xf5) * a);
      buf[i + 3] = 255;
    }
  return png(size, size, buf);
}

mkdirSync(new URL('../app/icons/', import.meta.url), { recursive: true });
const out = (name, data) => writeFileSync(new URL('../app/icons/' + name, import.meta.url), data);
out('icon-192.png', icon(192, { rounded: true, pad: false }));
out('icon-512.png', icon(512, { rounded: true, pad: false }));
out('icon-512-maskable.png', icon(512, { rounded: false, pad: true }));
out('apple-touch-icon.png', icon(180, { rounded: false, pad: false })); // iOS가 알아서 둥글게 깎는다
console.log('icons ok');
