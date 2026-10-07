import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
const source = await readFile(new URL('../public/app-icon.svg', import.meta.url));
const directory = new URL('../public/icons/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const size of [192, 512]) await sharp(source).resize(size, size).png().toFile(new URL(`icon-${size}.png`, directory).pathname);
await sharp(source).resize(180, 180).png().toFile(new URL('apple-touch-icon.png', directory).pathname);
const inset = await sharp(source).resize(350, 350).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0A8F4B' } }).composite([{ input: inset, gravity: 'centre' }]).png().toFile(new URL('maskable-512.png', directory).pathname);
