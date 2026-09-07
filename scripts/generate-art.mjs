// Offline art pipeline. The observatory itself never needs Node or an image service.
// Run with `npm run assets` after editing the source albedo in public/textures.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

await mkdir('public/assets/worlds', { recursive: true });
const width = 1024;
const height = 512;
const clamp = (v, low = 0, high = 1) => Math.max(low, Math.min(high, v));
const mix = (a, b, t) => a + (b - a) * t;
function hash(x, y, z) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  return mix(mix(mix(hash(ix, iy, iz), hash(ix + 1, iy, iz), sx), mix(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), sx), sy), mix(mix(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), sx), mix(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), sx), sy), sz);
}
function fbm(x, y, z, octaves = 5) {
  let value = 0, amplitude = .5, total = 0;
  for (let i = 0; i < octaves; i++) { value += noise(x, y, z) * amplitude; total += amplitude; amplitude *= .5; x = x * 2.03 + 7; y = y * 2.03 + 13; z = z * 2.03 + 3; }
  return value / total;
}
const source = await sharp('public/textures/aurelia-surface.jpg').resize(width, height).removeAlpha().raw().toBuffer();
const planets = { aurelia: source, pelagos: Buffer.alloc(width * height * 3), vesper: Buffer.alloc(width * height * 3), nix: Buffer.alloc(width * height * 3) };
for (let y = 0; y < height; y++) {
  const latitude = y / height * Math.PI;
  for (let x = 0; x < width; x++) {
    const longitude = x / width * Math.PI * 2;
    const px = Math.sin(latitude) * Math.cos(longitude), py = Math.cos(latitude), pz = Math.sin(latitude) * Math.sin(longitude);
    const n = fbm(px * 3.3, py * 3.3, pz * 3.3);
    const detail = fbm(px * 21, py * 21, pz * 21, 3);
    const cloudNoise = fbm(px * 6 + 13, py * 9, pz * 6 + 21, 5);
    const clouds = Math.pow(clamp((cloudNoise - .47) * 4.8), 1.5) * .82;
    const island = clamp((n - .54) * 18);
    const shallow = clamp((n - .45) * 9);
    let ocean = [mix(5, 36, shallow), mix(25, 100, shallow), mix(39, 115, shallow)];
    const land = [100 + detail * 95, 115 + detail * 90, 93 + detail * 80];
    const pole = clamp((Math.abs(py) - .93) * 15);
    ocean = ocean.map((v, c) => mix(mix(mix(v, land[c], island), 195 + c * 8, pole), 228, clouds));
    const band = Math.sin(py * 53 + (n - .5) * 14) * .5 + .5;
    const broad = Math.sin(py * 12 + n * 2) * .5 + .5;
    const gas = [mix(78, 199, band * .45 + broad * .55), mix(74, 166, band * .4 + broad * .6), mix(94, 140, band * .45 + broad * .55)];
    const index = (y * width + x) * 3;
    const gray = source[index] * .3 + source[index + 1] * .59 + source[index + 2] * .11;
    const cracks = Math.pow(1 - Math.abs(n - .47), 80) * .48;
    for (let c = 0; c < 3; c++) {
      planets.pelagos[index + c] = clamp(ocean[c], 0, 255);
      planets.vesper[index + c] = clamp(gas[c] + (detail - .5) * 18, 0, 255);
      planets.nix[index + c] = clamp((gray * 1.38 + 37 + c * 13) * (1 - cracks), 0, 255);
    }
  }
}
for (const [name, data] of Object.entries(planets)) {
  if (name !== 'aurelia') await sharp(data, { raw: { width, height, channels: 3 } }).webp({ quality: 88 }).toFile(`public/textures/${name}-surface.webp`);
  const size = 320, thumb = Buffer.alloc(size * size * 4);
  const radius = name === 'aurelia' ? 77 : 100;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2, dy = y - size / 2;
      const nx = dx / radius, ny = -dy / radius;
      const distance = nx * nx + ny * ny;
      let rgb = [0, 0, 0], alpha = 0;
      const rx = dx * .906 - dy * .423, ry = dx * .423 + dy * .906;
      const ringDistance = Math.hypot(rx / 151, ry / 48);
      const inRing = name === 'aurelia' && ringDistance > .65 && ringDistance < 1;
      const ringColor = [168, 139, 111];
      const ringStrength = .5 + noise(ringDistance * 650, 5, 7) * .5;
      if (inRing) { rgb = ringColor.map(v => v * ringStrength); alpha = 220; }
      if (distance <= 1) {
        const nz = Math.sqrt(1 - distance);
        const u = ((Math.atan2(nx, nz) / (Math.PI * 2) + .63) % 1 + 1) % 1;
        const v = Math.acos(ny) / Math.PI;
        const sourceIndex = (Math.min(height - 1, Math.floor(v * height)) * width + Math.min(width - 1, Math.floor(u * width))) * 3;
        const light = Math.max(.045, nx * -.62 + ny * .45 + nz * .43);
        const rim = Math.pow(1 - nz, 5) * Math.max(0, nx * -.7 + .3);
        rgb = [0, 1, 2].map(c => data[sourceIndex + c] * light * 1.6 + rim * [86, 102, 125][c]);
        alpha = clamp((1 - distance) * 110) * 255;
        if (inRing && ry > 0) rgb = ringColor.map(v => v * ringStrength);
      }
      const offset = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) thumb[offset + c] = clamp(rgb[c], 0, 255);
      thumb[offset + 3] = alpha;
    }
  }
  await sharp(thumb, { raw: { width: size, height: size, channels: 4 } }).webp({ quality: 90 }).toFile(`public/assets/worlds/${name}.webp`);
}
console.log('Generated three seamless planetary maps and four shaded destination portraits.');
