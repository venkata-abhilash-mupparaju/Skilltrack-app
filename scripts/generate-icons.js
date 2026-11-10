const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Generate primary SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="50%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
    <linearGradient id="glyphGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e0e7ff" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Rounded App Icon Background -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />

  <!-- Inner Subtle Ring -->
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="4" />

  <!-- SkillTrack Brand Icon (Target / Checkmark / Growth Lightning Bolt) -->
  <g filter="url(#shadow)" fill="none" stroke="url(#glyphGrad)" stroke-width="32" stroke-linecap="round" stroke-linejoin="round">
    <!-- Outer Arc / Progress Track -->
    <path d="M 256 96 A 160 160 0 1 1 128 160" />
    
    <!-- Central Lightning / Growth Streak -->
    <polygon points="272,112 192,264 260,264 240,400 336,240 268,240" fill="url(#glyphGrad)" stroke="none" />
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf8');

// Function to create minimal uncompressed / deflated valid PNGs
function createSolidPng(width, height, r, g, b, a = 255) {
  function crc32(buf) {
    let table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Raw image bytes with row filter 0
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLength);
  
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.45;
  const rCorner = width * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Rounded rect mask
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const limitX = cx - rCorner;
      const limitY = cy - rCorner;
      let inShape = true;

      if (dx > limitX && dy > limitY) {
        const dCorner = Math.hypot(dx - limitX, dy - limitY);
        if (dCorner > rCorner) inShape = false;
      }

      if (!inShape) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Indigo gradient from top-left to bottom-right
      const ratio = (x + y) / (width + height);
      const pr = Math.round(79 + ratio * 60);
      const pg = Math.round(70 + ratio * 20);
      const pb = Math.round(229 + ratio * 20);

      // Simple central lightning / check mark silhouette
      const relX = (x - cx) / width;
      const relY = (y - cy) / height;
      const distFromCenter = Math.hypot(relX, relY);

      let isWhite = false;
      // Ring
      if (distFromCenter > 0.22 && distFromCenter < 0.32 && (relY > -0.28 || relX > 0)) {
        isWhite = true;
      }
      // Bolt
      if (Math.abs(relX + relY * 0.35) < 0.08 && relY > -0.22 && relY < 0.25) {
        isWhite = true;
      }

      if (isWhite) {
        rawData[pxOffset] = 255;
        rawData[pxOffset + 1] = 255;
        rawData[pxOffset + 2] = 255;
        rawData[pxOffset + 3] = 255;
      } else {
        rawData[pxOffset] = pr;
        rawData[pxOffset + 1] = pg;
        rawData[pxOffset + 2] = pb;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', deflated);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'icon-maskable-192x192.png', size: 192 },
  { name: 'icon-maskable-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'badge-72x72.png', size: 72 }
];

sizes.forEach(({ name, size }) => {
  const pngBuf = createSolidPng(size, size, 99, 102, 241);
  fs.writeFileSync(path.join(iconsDir, name), pngBuf);
  console.log(`Generated ${name} (${size}x${size})`);
});

// Also write favicon.ico placeholder
fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.ico'), createSolidPng(32, 32, 99, 102, 241));
console.log('Icons generated successfully!');
