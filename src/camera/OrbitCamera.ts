import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Settings } from '../core/state';

export class OrbitCamera {
  readonly camera = new PerspectiveCamera(42, 1, .1, 180);
  readonly controls: OrbitControls;
  private targetPosition = new Vector3();
  private transitioning = true;
  private mobile = false;
  private width = 1;
  private height = 1;
  private framingOffset = .052;
  private targetFramingOffset = .052;
  private mode: 'overview' | 'orbit' = 'overview';
  private reducedMotion = false;
  private rotate = true;

  constructor(canvas: HTMLCanvasElement) {
    this.camera.position.set(.35, 2.6, 13.2);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .065;
    this.controls.enablePan = false;
    this.controls.minDistance = 6.9;
    this.controls.maxDistance = 20;
    this.controls.minPolarAngle = .28;
    this.controls.maxPolarAngle = Math.PI - .28;
    this.controls.rotateSpeed = .45;
    this.controls.zoomSpeed = .65;
    this.controls.autoRotateSpeed = .18;
    this.controls.addEventListener('start', this.interrupt);
    this.reset();
  }
  private interrupt = (): void => { this.transitioning = false; };

  resize(width: number, height: number): void {
    const wasMobile = this.mobile;
    const sizeChanged = width !== this.width || height !== this.height;
    this.width = width; this.height = height;
    this.mobile = width < 760;
    this.camera.aspect = width / height;
    this.camera.fov = this.mobile ? 45 : 42;
    this.targetFramingOffset = this.mobile ? (this.mode === 'orbit' ? -.145 : -.082) : .052;
    if (sizeChanged || wasMobile !== this.mobile || this.reducedMotion) this.framingOffset = this.targetFramingOffset;
    this.applyFraming();
    this.camera.updateProjectionMatrix();
    this.controls.minDistance = this.mobile ? 10 : 6.9;
    this.controls.maxDistance = this.mobile ? 28 : 20;
    if (wasMobile !== this.mobile) this.reset();
  }
  applySettings(settings: Settings): void {
    this.rotate = settings.autoRotate;
    this.reducedMotion = settings.reducedMotion;
    this.controls.rotateSpeed = .45 * settings.sensitivity;
    this.controls.enableDamping = !settings.reducedMotion;
  }
  enter(mode: 'overview' | 'orbit'): void { this.mode = mode; this.resize(this.width, this.height); this.reset(); }
  reset(): void {
    const distance = this.mobile ? (this.mode === 'overview' ? 19.8 : 17.7) : (this.mode === 'overview' ? 11.65 : 10.0);
    this.targetPosition.set(.15, distance * .16, distance);
    this.transitioning = true;
    if (this.reducedMotion) { this.camera.position.copy(this.targetPosition); this.transitioning = false; }
  }
  zoom(direction: number): void {
    const distance = this.camera.position.length();
    const next = Math.max(this.controls.minDistance, Math.min(this.controls.maxDistance, distance * (direction > 0 ? .85 : 1.18)));
    this.targetPosition.copy(this.camera.position).multiplyScalar(next / distance);
    this.transitioning = true;
  }
  private applyFraming(): void {
    const horizontalOffset = this.mobile ? .055 : this.width < 1000 ? .2 : .16;
    this.camera.setViewOffset(this.width, this.height, -this.width * horizontalOffset, this.height * this.framingOffset, this.width, this.height);
  }
  update(delta: number, paused: boolean): void {
    if (paused && !this.controls.enabled) return;
    if (Math.abs(this.framingOffset - this.targetFramingOffset) > .000001) {
      this.framingOffset += (this.targetFramingOffset - this.framingOffset) * (this.reducedMotion ? 1 : 1 - Math.exp(-3.1 * delta));
      this.applyFraming();
    }
    if (this.transitioning) {
      this.camera.position.lerp(this.targetPosition, this.reducedMotion ? 1 : 1 - Math.exp(-3.1 * delta));
      if (this.camera.position.distanceToSquared(this.targetPosition) < .0001) this.transitioning = false;
    }
    this.controls.autoRotate = this.rotate && !this.reducedMotion && !paused && !this.transitioning;
    this.controls.update(delta);
  }
  setEnabled(enabled: boolean): void { this.controls.enabled = enabled; }
  dispose(): void { this.controls.removeEventListener('start', this.interrupt); this.controls.dispose(); }
}
