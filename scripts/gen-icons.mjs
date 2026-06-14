import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
mkdirSync(join(root, 'public/icons'), { recursive: true })

// YouTube-red rounded square + white speech bubble + red text lines
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <!-- YouTube red rounded-square background -->
  <rect width="128" height="128" rx="22" fill="#FF0000"/>

  <!-- White speech / comment bubble -->
  <path fill="white" d="
    M 18 28
    C 18 20 24 14 32 14
    L 96 14
    C 104 14 110 20 110 28
    L 110 72
    C 110 80 104 86 96 86
    L 58 86
    L 36 110
    L 36 86
    L 32 86
    C 24 86 18 80 18 72
    Z
  "/>

  <!-- Red lines inside bubble (simulating comment text) -->
  <rect x="34" y="34" width="60" height="9" rx="4.5" fill="#FF0000"/>
  <rect x="34" y="51" width="44" height="9" rx="4.5" fill="#FF0000"/>
  <rect x="34" y="68" width="52" height="9" rx="4.5" fill="#FF0000"/>
</svg>
`

const buf = Buffer.from(svg)

for (const size of [16, 48, 128]) {
  await sharp(buf)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(root, `public/icons/icon${size}.png`))
  console.log(`✓ icon${size}.png`)
}

console.log('Icons generated.')
