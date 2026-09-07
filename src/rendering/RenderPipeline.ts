import { ACESFilmicToneMapping, HalfFloatType, PCFSoftShadowMap, SRGBColorSpace, Vector2, WebGLRenderer, WebGLRenderTarget } from 'three';
import type { PerspectiveCamera, Scene } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { QUALITY_PROFILES, type QualityLevel } from '../config/quality';
import cinematicFragment from '../shaders/cinematic.frag.glsl?raw';

export class RenderPipeline {
  readonly renderer: WebGLRenderer;
  private composer!: EffectComposer;
  private bloom!: UnrealBloomPass;
  private grade!: ShaderPass;
  private renderPass!: RenderPass;
  private output!: OutputPass;
  private width = 1;
  private height = 1;
  private ratio = 1;
  private disposed = false;
  private postprocessingDisposed = true;
  private usePostprocessing = true;
  private hdrAvailable = true;

  constructor(canvas: HTMLCanvasElement, private scene: Scene, private camera: PerspectiveCamera, private quality: QualityLevel) {
    const context = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' });
    if (!context) throw new Error('WebGL 2 is not available');
    this.renderer = new WebGLRenderer({ canvas, context, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.13;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.info.autoReset = false;
    this.hdrAvailable = this.renderer.extensions.has('EXT_color_buffer_float');
    this.createPostprocessing();
    this.setQuality(quality);
  }

  private createPostprocessing(): void {
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 2 });
    this.composer = new EffectComposer(this.renderer, target);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloom = new UnrealBloomPass(new Vector2(1, 1), .23, .65, .87);
    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: .023 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: cinematicFragment,
    });
    this.output = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.grade);
    this.composer.addPass(this.output);
    this.postprocessingDisposed = false;
  }
  get pixelRatio(): number { return this.ratio; }
  get softwareRenderer(): boolean {
    const gl = this.renderer.getContext();
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const name = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : '';
    return /swiftshader|llvmpipe|software|softpipe/i.test(name);
  }
  setQuality(level: QualityLevel): void {
    const profile = QUALITY_PROFILES[level];
    this.quality = level;
    this.usePostprocessing = level !== 'low' && this.hdrAvailable;
    this.renderer.shadowMap.enabled = profile.shadows;
    if (!this.postprocessingDisposed) this.bloom.enabled = profile.bloom && this.hdrAvailable;
    this.resize(this.width, this.height);
  }
  resize(width: number, height: number): void {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    const profile = QUALITY_PROFILES[this.quality];
    const dimensionLimit = this.renderer.capabilities.maxTextureSize;
    this.ratio = Math.min(window.devicePixelRatio || 1, profile.pixelRatio, Math.sqrt(profile.maxPixels / (this.width * this.height)), dimensionLimit / this.width, dimensionLimit / this.height);
    this.renderer.setPixelRatio(this.ratio);
    this.renderer.setSize(this.width, this.height, false);
    if (!this.postprocessingDisposed) { this.composer.setPixelRatio(this.ratio); this.composer.setSize(this.width, this.height); }
  }
  render(delta: number, elapsed: number, reducedMotion: boolean): void {
    if (this.disposed || this.postprocessingDisposed) return;
    this.grade.uniforms.uTime.value = reducedMotion ? 0 : Math.floor(elapsed * 12) / 12;
    this.grade.uniforms.uGrain.value = reducedMotion ? .012 : .023;
    this.renderer.info.reset();
    if (this.usePostprocessing) this.composer.render(delta);
    else this.renderer.render(this.scene, this.camera);
  }
  releaseContextTargets(): void {
    // Release while the context is lost, before a new context invalidates the old GL handles.
    this.disposePostprocessing();
  }
  restoreContextTargets(): void {
    this.createPostprocessing();
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.setQuality(this.quality);
  }
  private disposePostprocessing(): void {
    if (this.postprocessingDisposed) return;
    this.postprocessingDisposed = true;
    this.renderPass.dispose(); this.bloom.dispose(); this.grade.dispose(); this.output.dispose();
    this.composer.dispose();
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.disposePostprocessing(); this.renderer.dispose();
  }
}
