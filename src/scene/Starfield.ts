import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from 'three';
import starsVertex from '../shaders/stars.vert.glsl?raw';
import starsFragment from '../shaders/stars.frag.glsl?raw';
import { seededRandom } from '../utils/math';

export class Starfield {
  readonly points: Points;
  private geometry = new BufferGeometry();
  private material: ShaderMaterial;
  constructor() {
    const count = 2400, random = seededRandom(2703);
    const positions = new Float32Array(count * 3), sizes = new Float32Array(count), phases = new Float32Array(count), colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = random() * Math.PI * 2, z = random() * 2 - 1;
      const radius = 45 + random() * 40, circle = Math.sqrt(1 - z * z);
      positions[i * 3] = radius * circle * Math.cos(theta);
      positions[i * 3 + 1] = radius * circle * Math.sin(theta);
      positions[i * 3 + 2] = radius * z;
      sizes[i] = random() < .05 ? 2.7 : .6 + random() * 1.4;
      phases[i] = random() * Math.PI * 2;
      const warm = random() > .6;
      colors.set(warm ? [1, .83, .65] : [.72, .84, 1], i * 3);
    }
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
    this.geometry.setAttribute('aColor', new BufferAttribute(colors, 3));
    this.material = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
      vertexShader: starsVertex, fragmentShader: starsFragment,
      transparent: true, depthWrite: false, blending: AdditiveBlending,
    });
    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }
  setQuality(count: number, pixelRatio: number): void { this.geometry.setDrawRange(0, count); this.material.uniforms.uPixelRatio.value = pixelRatio; }
  update(elapsed: number): void { this.material.uniforms.uTime.value = elapsed; }
  dispose(): void { this.geometry.dispose(); this.material.dispose(); }
}
