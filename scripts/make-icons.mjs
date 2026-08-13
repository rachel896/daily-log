/**
 * Generates the PWA icon PNGs from the same geometry as icon.svg.
 *
 * Hand-rolled rather than shelled out to a rasteriser: macOS `qlmanage` bakes
 * its own corner rounding into the output, which double-rounds under the iOS
 * home-screen mask and leaves pale corners. This keeps full control and stays
 * reproducible on any machine with Node.
 *
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BG = [0xd9, 0x53, 0x6f]
const FG = [0xff, 0xff, 0xff]

// The polyline from icon.svg, in its 512-unit design space.
const PTS = [
  [96, 336],
  [176, 224],
  [240, 288],
  [304, 160],
  [416, 336],
]

// ---------- geometry ----------

/** Shortest distance from p to segment ab. Gives round caps and joins free. */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2
  t = t < 0 ? 0 : t > 1 ? 1 : t
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

/** Signed distance to a rounded rectangle covering 0..size, negative inside. */
function sdRoundRect(px, py, size, r) {
  const hx = size / 2
  const qx = Math.abs(px - hx) - (hx - r)
  const qy = Math.abs(py - hx) - (hx - r)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(ax, ay) - r
}

// ---------- rendering ----------

const SS = 3 // supersampling factor per axis

function render(size, { radius = 0, glyphScale = 1, strokeWidth = 34 }) {
  const k = size / 512
  const r = (strokeWidth * k) / 2
  const rad = radius * k
  const px = Buffer.alloc(size * size * 4)

  // Glyph points in output space, scaled about the centre.
  const pts = PTS.map(([x, y]) => [
    size / 2 + (x * k - size / 2) * glyphScale,
    size / 2 + (y * k - size / 2) * glyphScale,
  ])

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = 0
      let onGlyph = 0

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS
          const fy = y + (sy + 0.5) / SS

          if (rad <= 0 || sdRoundRect(fx, fy, size, rad) <= 0) inside++

          let d = Infinity
          for (let i = 0; i < pts.length - 1; i++) {
            const dd = distToSegment(fx, fy, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])
            if (dd < d) d = dd
          }
          if (d <= r) onGlyph++
        }
      }

      const total = SS * SS
      const aBg = inside / total
      const aFg = (onGlyph / total) * aBg // glyph never spills past the shape

      const rr = Math.round(BG[0] * (aBg - aFg) + FG[0] * aFg)
      const gg = Math.round(BG[1] * (aBg - aFg) + FG[1] * aFg)
      const bb = Math.round(BG[2] * (aBg - aFg) + FG[2] * aFg)

      const o = (y * size + x) * 4
      px[o] = aBg > 0 ? Math.round(rr / aBg) : 0
      px[o + 1] = aBg > 0 ? Math.round(gg / aBg) : 0
      px[o + 2] = aBg > 0 ? Math.round(bb / aBg) : 0
      px[o + 3] = Math.round(aBg * 255)
    }
  }
  return px
}

// ---------- PNG container ----------

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function toPng(px, size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- outputs ----------

const TARGETS = [
  // iOS applies its own squircle mask, so this ships as a full square.
  ['apple-touch-icon.png', 180, { radius: 0, glyphScale: 1 }],
  ['icon-192.png', 192, { radius: 112, glyphScale: 1 }],
  ['icon-512.png', 512, { radius: 112, glyphScale: 1 }],
  // Maskable: glyph pulled into the inner safe zone so Android cannot clip it.
  ['icon-maskable-512.png', 512, { radius: 0, glyphScale: 0.66, strokeWidth: 44 }],
]

for (const [name, size, opts] of TARGETS) {
  const png = toPng(render(size, opts), size)
  writeFileSync(join(OUT, name), png)
  console.log(`${name.padEnd(26)} ${size}x${size}  ${(png.length / 1024).toFixed(1)} kB`)
}
