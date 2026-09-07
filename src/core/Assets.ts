import { CanvasTexture, Color, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader } from 'three';
import { getWorld, type WorldId } from '../config/worlds';
import { assetUrl, seededRandom } from '../utils/math';

export class Assets {
  private loader = new TextureLoader();
  private textures = new Map<string, Texture>();
  private pending = new Map<string, Promise<Texture>>();
  private disposed = false;
  readonly degraded: string[] = [];

  async loadEssential(onProgress: (progress: number, stage: string) => void): Promise<{ surface: Texture; sky: Texture }> {
    let completed = 0;
    onProgress(8, 'Establishing deep-space link');
    const track = () => { completed++; onProgress(12 + completed * 32, completed === 1 ? 'Resolving planetary surface' : 'Building the observatory'); };
    const [surface, sky] = await Promise.all([
      this.world('aurelia').then(texture => { track(); return texture; }),
      this.load('assets/observatory-nebula.webp', true).then(texture => { track(); return texture; }),
    ]);
    return { surface, sky };
  }

  world(id: WorldId): Promise<Texture> { return this.load(getWorld(id).texture); }

  private load(path: string, sky = false): Promise<Texture> {
    const existing = this.textures.get(path);
    if (existing) return Promise.resolve(existing);
    const pending = this.pending.get(path);
    if (pending) return pending;
    const request = this.loader.loadAsync(assetUrl(path)).catch(error => {
      if (import.meta.env.DEV) console.warn(`Optional texture unavailable: ${path}`, error);
      this.degraded.push(path);
      return this.fallback(sky);
    }).then(texture => {
      texture.colorSpace = SRGBColorSpace;
      if (!sky) texture.wrapS = RepeatWrapping;
      texture.anisotropy = 4;
      if (this.disposed) texture.dispose();
      else this.textures.set(path, texture);
      this.pending.delete(path);
      return texture;
    });
    this.pending.set(path, request);
    return request;
  }

  private fallback(sky: boolean): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const random = seededRandom(14);
    const base = new Color(sky ? '#080d14' : '#806951');
    ctx.fillStyle = `#${base.getHexString()}`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < (sky ? 150 : 5000); i++) {
      ctx.fillStyle = sky ? `rgba(200,220,240,${random() * .6})` : `rgba(220,194,160,${random() * .16})`;
      ctx.fillRect(random() * 256, random() * 128, sky ? 1 : 4, sky ? 1 : 3);
    }
    return new CanvasTexture(canvas);
  }

  dispose(): void { this.disposed = true; this.textures.forEach(texture => texture.dispose()); this.textures.clear(); }
}
