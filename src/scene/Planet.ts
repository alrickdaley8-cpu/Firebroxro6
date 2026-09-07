import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, DoubleSide, Group, IcosahedronGeometry, InstancedMesh, LineDashedMaterial, LineLoop, Mesh, MeshStandardMaterial, Object3D, Points, PointsMaterial, RingGeometry, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import type { Texture } from 'three';
import type { World } from '../config/worlds';
import { damp, seededRandom } from '../utils/math';
import atmosphereVertex from '../shaders/atmosphere.vert.glsl?raw';
import atmosphereFragment from '../shaders/atmosphere.frag.glsl?raw';
import ringVertex from '../shaders/rings.vert.glsl?raw';
import ringFragment from '../shaders/rings.frag.glsl?raw';
import scanFragment from '../shaders/scan.frag.glsl?raw';

export class Planet {
  readonly root = new Group();
  readonly surface: Mesh<SphereGeometry, MeshStandardMaterial>;
  private globe = new Group();
  private orbitLines = new Group();
  private ring: Mesh<RingGeometry, ShaderMaterial>;
  private atmosphere: Mesh<SphereGeometry, ShaderMaterial>;
  private halo: Mesh<SphereGeometry, ShaderMaterial>;
  private scan: Mesh<SphereGeometry, ShaderMaterial>;
  private debris: Points<BufferGeometry, PointsMaterial>;
  private moons: InstancedMesh<IcosahedronGeometry, MeshStandardMaterial>;
  private moonTransform = new Object3D();
  private moonPositions = [new Vector3(2.75, 1.45, -2), new Vector3(-3.8, -.6, -3), new Vector3(3.65, -1.2, -1.3)];
  private currentScale = .96;

  constructor(texture: Texture, world: World) {
    this.root.rotation.z = .32;
    this.surface = new Mesh(new SphereGeometry(1.55, 112, 80), new MeshStandardMaterial({
      map: texture, bumpMap: texture, bumpScale: .047, color: world.color,
      roughness: .94, metalness: .015,
    }));
    this.surface.castShadow = true;
    this.surface.receiveShadow = true;
    this.surface.rotation.y = 2.9;
    this.globe.add(this.surface);
    const atmosphereMaterial = new ShaderMaterial({
      uniforms: { uColor: { value: new Color(world.glow) }, uLight: { value: new Vector3(-5.5, 4.2, 4) }, uStrength: { value: .8 } },
      vertexShader: atmosphereVertex, fragmentShader: atmosphereFragment,
      transparent: true, blending: AdditiveBlending, side: BackSide, depthWrite: false,
    });
    this.atmosphere = new Mesh(new SphereGeometry(1.568, 80, 56), atmosphereMaterial);
    this.atmosphere.material.uniforms.uStrength.value = .46;
    this.halo = new Mesh(new SphereGeometry(1.64, 64, 48), atmosphereMaterial.clone());
    this.halo.material.uniforms.uStrength.value = .07;
    this.globe.add(this.atmosphere, this.halo);
    const ringGeometry = new RingGeometry(1.98, 3.55, 256, 12);
    const positions = ringGeometry.attributes.position;
    const uvs = ringGeometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) uvs.setXY(i, (Math.hypot(positions.getX(i), positions.getY(i)) - 1.98) / 1.57, 0);
    this.ring = new Mesh(ringGeometry, new ShaderMaterial({
      uniforms: { uColor: { value: new Color('#ad9275') }, uLight: { value: new Vector3(-5.5, 4.2, 4) }, uOpacity: { value: .95 } },
      vertexShader: ringVertex, fragmentShader: ringFragment,
      transparent: true, side: DoubleSide, depthWrite: false,
    }));
    this.ring.rotation.x = -Math.PI / 2 + .08;
    this.ring.castShadow = true;
    this.root.add(this.globe, this.ring);
    for (let index = 0; index < 2; index++) {
      const array = new Float32Array(361 * 3);
      const radius = 4.05 + index * 1.03;
      for (let i = 0; i <= 360; i++) { const angle = i / 360 * Math.PI * 2; array[i * 3] = Math.cos(angle) * radius; array[i * 3 + 1] = Math.sin(angle) * radius * .065; array[i * 3 + 2] = Math.sin(angle) * radius; }
      const geometry = new BufferGeometry(); geometry.setAttribute('position', new BufferAttribute(array, 3));
      const line = new LineLoop(geometry, new LineDashedMaterial({ color: '#92a1ad', transparent: true, opacity: index ? .095 : .19, dashSize: index ? .07 : 5, gapSize: index ? .09 : 0, depthWrite: false }));
      line.computeLineDistances(); this.orbitLines.add(line);
    }
    this.root.add(this.orbitLines);
    const debrisGeometry = new BufferGeometry();
    const random = seededRandom(110);
    const dust = new Float32Array(750 * 3);
    for (let i = 0; i < 750; i++) {
      const angle = random() * Math.PI * 2, radius = 3.65 + random() * .28;
      dust[i * 3] = Math.cos(angle) * radius;
      dust[i * 3 + 1] = (random() - .5) * .11;
      dust[i * 3 + 2] = Math.sin(angle) * radius;
    }
    debrisGeometry.setAttribute('position', new BufferAttribute(dust, 3));
    this.debris = new Points(debrisGeometry, new PointsMaterial({ color: '#bfad91', size: .012, transparent: true, opacity: .36, depthWrite: false, sizeAttenuation: true }));
    this.root.add(this.debris);
    this.moons = new InstancedMesh(new IcosahedronGeometry(1, 3), new MeshStandardMaterial({ map: texture, color: '#8b969f', roughness: 1 }), 3);
    this.moons.frustumCulled = false;
    this.root.add(this.moons);
    this.scan = new Mesh(new SphereGeometry(1.564, 80, 56), new ShaderMaterial({
      uniforms: { uProgress: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: scanFragment, transparent: true, blending: AdditiveBlending, depthWrite: false,
    }));
    this.scan.visible = false; this.root.add(this.scan);
    this.update(0, 0, true);
  }

  setWorld(world: World, texture: Texture, reducedMotion: boolean): void {
    this.surface.material.map = texture;
    this.surface.material.bumpMap = texture;
    this.surface.material.bumpScale = world.id === 'vesper' ? .006 : world.id === 'pelagos' ? .012 : .047;
    this.surface.material.roughness = world.id === 'pelagos' ? .47 : .94;
    this.surface.material.color.set(world.color);
    this.surface.material.needsUpdate = true;
    this.atmosphere.material.uniforms.uColor.value.set(world.glow);
    this.halo.material.uniforms.uColor.value.set(world.glow);
    this.ring.visible = world.ring;
    this.debris.visible = world.ring;
    this.currentScale = reducedMotion ? 1 : .92;
    this.globe.scale.setScalar(this.currentScale);
    this.surface.rotation.y = world.id === 'aurelia' ? 2.9 : 1.7;
  }
  setScan(progress: number | null): void {
    this.scan.visible = progress !== null;
    if (progress !== null) this.scan.material.uniforms.uProgress.value = progress / 100;
  }
  showOrbits(show: boolean): void { this.orbitLines.visible = show; }
  setQuality(debrisCount: number): void { this.debris.geometry.setDrawRange(0, debrisCount); }
  update(delta: number, elapsed: number, still: boolean): void {
    this.currentScale = damp(this.currentScale, 1, 3, delta);
    this.globe.scale.setScalar(this.currentScale);
    if (!still) { this.surface.rotation.y += delta * .021; this.debris.rotation.y += delta * .012; }
    for (let i = 0; i < 3; i++) {
      this.moonTransform.position.copy(this.moonPositions[i]);
      if (!still) this.moonTransform.position.y += Math.sin(elapsed * .03 + i) * .035;
      this.moonTransform.scale.setScalar(i === 0 ? .12 : .065);
      this.moonTransform.updateMatrix(); this.moons.setMatrixAt(i, this.moonTransform.matrix);
    }
    this.moons.instanceMatrix.needsUpdate = true;
  }
  dispose(): void {
    this.root.traverse(object => {
      if (object instanceof Mesh || object instanceof Points || object instanceof LineLoop) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      }
    });
    this.moons.dispose();
  }
}
