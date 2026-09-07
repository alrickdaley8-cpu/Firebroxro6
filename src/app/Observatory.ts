import { Raycaster, Scene, Vector2 } from 'three';
import { OrbitCamera } from '../camera/OrbitCamera';
import { AdaptiveQuality, initialQuality, QUALITY_PROFILES } from '../config/quality';
import type { QualityLevel } from '../config/quality';
import { getWorld, WORLDS, type WorldId } from '../config/worlds';
import { BINDING_LABELS, type BindingAction } from '../config/controls';
import { Assets } from '../core/Assets';
import { Store } from '../core/state';
import type { AppState, Dialog, Settings } from '../core/state';
import { RenderPipeline } from '../rendering/RenderPipeline';
import { createLighting } from '../lighting/createLighting';
import { Planet } from '../scene/Planet';
import { Starfield } from '../scene/Starfield';
import { Ambience } from '../audio/Ambience';
import { Keyboard } from '../input/Keyboard';
import { UI } from '../ui/UI';
import { defaultSettings, loadObservations, loadSettings, persistObservations, persistSettings } from '../utils/storage';

const SCAN_DURATION = 3.6;

export class Observatory {
  private store: Store;
  private ui: UI;
  private scene = new Scene();
  private assets = new Assets();
  private audio = new Ambience();
  private camera: OrbitCamera | null = null;
  private pipeline: RenderPipeline | null = null;
  private lighting: ReturnType<typeof createLighting> | null = null;
  private planet: Planet | null = null;
  private stars: Starfield | null = null;
  private keyboard: Keyboard;
  private quality = new AdaptiveQuality();
  private resizeObserver: ResizeObserver;
  private events = new AbortController();
  private unsubscribe: () => void;
  private request = 0;
  private lastFrame = 0;
  private elapsed = 0;
  private sessionTime = 0;
  private scanElapsed = 0;
  private statsElapsed = 0;
  private renderedFrames = 0;
  private selectionVersion = 0;
  private contextIsLost = false;
  private restorePending = false;
  private needsRender = true;
  private disposed = false;
  private raycaster = new Raycaster();
  private pointer = new Vector2();
  private pointerDown = new Vector2();
  private clickStarted = 0;
  private motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private root: HTMLElement) {
    const settings = loadSettings(this.motionPreference.matches);
    const quality = settings.quality === 'auto' ? initialQuality() : settings.quality;
    this.store = new Store({
      worldId: 'aurelia', mode: 'overview', dialog: null, settings, observations: loadObservations(),
      audioEnabled: false, scanProgress: null, activeQuality: quality,
      paused: false, ready: false, renderAvailable: true,
    });
    this.ui = new UI(root, this.store, {
      action: this.action,
      dialog: this.openDialog,
      select: id => { void this.select(id); },
      travel: id => { void this.select(id, true); },
      setting: this.setSetting,
      rebind: this.rebind,
    });
    this.keyboard = new Keyboard({
      bindings: () => this.store.value.settings.bindings,
      select: index => { void this.select(WORLDS[index].id); },
      next: direction => { void this.select(this.ui.nextWorld(direction)); },
      explore: this.explore, scan: this.scan,
      reset: () => { this.camera?.reset(); this.needsRender = true; },
      sound: () => { void this.toggleSound(); }, pause: this.togglePause,
      escape: this.goHome, isDialogOpen: () => this.store.value.dialog !== null,
    });
    this.unsubscribe = this.store.subscribe(this.onState);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(root);
    const signal = this.events.signal;
    document.addEventListener('visibilitychange', this.onVisibility, { signal });
    document.addEventListener('fullscreenchange', this.onFullscreen, { signal });
    this.ui.canvas.addEventListener('webglcontextlost', this.onContextLost, { signal });
    this.ui.canvas.addEventListener('webglcontextrestored', this.onContextRestored, { signal });
    this.ui.canvas.addEventListener('pointerdown', this.onPointerDown, { signal });
    this.ui.canvas.addEventListener('pointerup', this.onPointerUp, { signal });
    this.motionPreference.addEventListener('change', this.onMotionPreference, { signal });
  }

  async start(): Promise<void> {
    try {
      const { surface, sky } = await this.assets.loadEssential((percent, stage) => this.ui.loading(percent, stage));
      if (this.disposed) return;
      this.camera = new OrbitCamera(this.ui.canvas);
      this.pipeline = new RenderPipeline(this.ui.canvas, this.scene, this.camera.camera, this.store.value.activeQuality);
      if (this.store.value.settings.quality === 'auto' && this.pipeline.softwareRenderer) this.applyQuality('low');
      this.scene.background = sky;
      this.scene.backgroundIntensity = .62;
      this.lighting = createLighting(this.scene, this.pipeline.renderer, this.store.value.activeQuality);
      this.planet = new Planet(surface, getWorld('aurelia'));
      this.stars = new Starfield();
      this.scene.add(this.planet.root, this.stars.points);
      this.camera.controls.addEventListener('change', this.invalidate);
      this.camera.applySettings(this.store.value.settings);
      this.planet.showOrbits(this.store.value.settings.showOrbits);
      this.applyQuality(this.store.value.activeQuality);
      this.resize();
      this.ui.loading(86, 'Preparing cinematic lighting');
      if (this.pipeline.renderer.extensions.has('KHR_parallel_shader_compile')) await this.pipeline.renderer.compileAsync(this.scene, this.camera.camera);
      else this.pipeline.renderer.compile(this.scene, this.camera.camera);
      if (this.disposed) return;
      this.camera.update(.016, false);
      this.pipeline.render(.016, 0, this.store.value.settings.reducedMotion);
      this.ui.loading(100, 'Your universe is ready');
    } catch (error) {
      if (this.disposed) return;
      if (import.meta.env.DEV) console.warn('Using the accessible static observatory.', error);
      this.releaseRenderer();
      this.store.set({ renderAvailable: false });
      this.ui.fallback();
    }
    if (this.disposed) return;
    this.audio.setVolume(this.store.value.settings.volume);
    this.store.set({ ready: true });
    if (this.assets.degraded.length) this.ui.toast('A texture could not be loaded. A procedural surface is keeping your journey going.');
    this.lastFrame = performance.now();
    this.request = requestAnimationFrame(this.frame);
  }

  private invalidate = (): void => { this.needsRender = true; };
  private onState = (state: AppState, previous: AppState): void => {
    this.needsRender = true;
    if (state.settings !== previous.settings) {
      this.camera?.applySettings(state.settings);
      this.planet?.showOrbits(state.settings.showOrbits);
      this.audio.setVolume(state.settings.volume);
      if (state.settings.quality !== previous.settings.quality) {
        const quality = state.settings.quality === 'auto' ? (this.pipeline?.softwareRenderer ? 'low' : initialQuality()) : state.settings.quality;
        this.applyQuality(quality); this.quality.reset();
      }
    }
    if (state.mode !== previous.mode) this.camera?.enter(state.mode);
    if (state.scanProgress !== previous.scanProgress) this.planet?.setScan(state.scanProgress);
    if (state.dialog !== previous.dialog || state.paused !== previous.paused) {
      this.camera?.setEnabled(!state.dialog);
      this.audio.setPaused(document.hidden || state.paused || state.dialog !== null);
      this.quality.reset();
    }
  };

  private frame = (now: number): void => {
    if (this.disposed || document.hidden) return;
    if (this.restorePending) this.restoreContext();
    const realDelta = Math.max(.001, (now - this.lastFrame) / 1000);
    const delta = Math.min(realDelta, .05);
    this.lastFrame = now;
    const state = this.store.value;
    const paused = state.paused || state.dialog !== null || this.contextIsLost;
    this.sessionTime += realDelta;
    if (!paused) this.elapsed += delta;
    if (!paused && state.scanProgress !== null) {
      this.scanElapsed += realDelta;
      const progress = Math.min(100, this.scanElapsed / SCAN_DURATION * 100);
      if (progress >= 100) this.completeScan();
      else if (Math.floor(progress) !== state.scanProgress) this.store.set({ scanProgress: Math.floor(progress) });
    }
    const animated = !paused && !state.settings.reducedMotion;
    this.camera?.update(delta, paused);
    if (!this.contextIsLost && (animated || this.needsRender || state.scanProgress !== null)) {
      this.planet?.update(paused ? 0 : delta, this.elapsed, paused || state.settings.reducedMotion);
      this.stars?.update(state.settings.reducedMotion ? 0 : this.elapsed);
      if (this.pipeline) {
        this.pipeline.render(delta, this.elapsed, state.settings.reducedMotion);
        this.renderedFrames++;
      }
      this.needsRender = false;
      if (animated && state.settings.quality === 'auto' && this.pipeline) {
        const nextQuality = this.quality.sample(realDelta, state.activeQuality);
        if (nextQuality) this.applyQuality(nextQuality);
      }
    }
    this.statsElapsed += realDelta;
    if (this.statsElapsed >= 1) {
      this.ui.clock(this.sessionTime);
      const info = this.pipeline?.renderer.info.render;
      this.ui.diagnostics(Math.round(this.renderedFrames / this.statsElapsed), info?.calls ?? 0, info?.triangles ?? 0, this.pipeline?.pixelRatio ?? 1);
      this.statsElapsed = 0; this.renderedFrames = 0;
    }
    this.request = requestAnimationFrame(this.frame);
  };

  private applyQuality(level: QualityLevel): void {
    const profile = QUALITY_PROFILES[level];
    this.pipeline?.setQuality(level);
    this.lighting?.setQuality(level);
    this.stars?.setQuality(profile.stars, this.pipeline?.pixelRatio ?? 1);
    this.planet?.setQuality(profile.debris);
    if (this.store.value.activeQuality !== level) this.store.set({ activeQuality: level });
    this.needsRender = true;
  }
  private resize = (): void => {
    if (this.disposed) return;
    const { clientWidth: width, clientHeight: height } = this.root;
    if (!width || !height) return;
    this.pipeline?.resize(width, height); this.camera?.resize(width, height);
    this.stars?.setQuality(QUALITY_PROFILES[this.store.value.activeQuality].stars, this.pipeline?.pixelRatio ?? 1);
    this.needsRender = true;
  };

  private async select(id: WorldId, enter = false): Promise<void> {
    if (!this.store.value.ready) return;
    if (id === this.store.value.worldId) {
      if (enter) this.explore();
      return;
    }
    const version = ++this.selectionVersion;
    this.audio.click();
    this.scanElapsed = 0;
    this.store.set({ worldId: id, scanProgress: null, dialog: null, ...(enter ? { mode: 'orbit' as const } : {}) });
    this.ui.focusWorld(id);
    this.camera?.reset();
    const texture = await this.assets.world(id);
    if (version !== this.selectionVersion || this.disposed) return;
    this.planet?.setWorld(getWorld(id), texture, this.store.value.settings.reducedMotion);
    this.needsRender = true;
  }
  private explore = (): void => {
    if (!this.store.value.ready) return;
    this.audio.click();
    this.store.set({ mode: 'orbit', dialog: null });
  };
  private goHome = (): void => {
    this.scanElapsed = 0;
    this.store.set({ mode: 'overview', scanProgress: null, dialog: null, paused: false });
  };
  private openDialog = (dialog: Dialog): void => {
    this.audio.click(); this.store.set({ dialog });
  };
  private scan = (): void => {
    const state = this.store.value;
    if (!state.ready || state.scanProgress !== null) return;
    if (state.observations.some(observation => observation.worldId === state.worldId)) { this.openDialog('journal'); return; }
    this.scanElapsed = 0;
    this.store.set({ mode: 'orbit', scanProgress: 0, paused: false, dialog: null });
    this.audio.scan();
  };
  private completeScan(): void {
    const state = this.store.value;
    const observations = [...state.observations, { worldId: state.worldId, recordedAt: new Date().toISOString() }];
    const saved = persistObservations(observations);
    this.store.set({ observations, scanProgress: null });
    this.audio.discovery();
    this.ui.toast(saved ? `${getWorld(state.worldId).name}, charted. A new discovery in your mission log.` : 'Discovery recorded for this session. Your browser is not allowing local storage.');
    this.scanElapsed = 0;
  }
  private togglePause = (): void => { this.store.set({ paused: !this.store.value.paused }); };
  private async toggleSound(): Promise<void> {
    try { const enabled = await this.audio.toggle(); this.store.set({ audioEnabled: enabled }); }
    catch { this.ui.toast('Sound is unavailable in this browser. Your exploration can continue quietly.'); }
  }
  private setSetting = <K extends keyof Settings>(key: K, value: Settings[K]): void => {
    const settings = { ...this.store.value.settings, [key]: value };
    this.store.set({ settings });
    if (!persistSettings(settings)) this.ui.toast('Settings will last for this session; local storage is unavailable.');
  };
  private rebind = (action: BindingAction, key: string): boolean => {
    const bindings = this.store.value.settings.bindings;
    const duplicate = (Object.keys(bindings) as BindingAction[]).find(other => other !== action && bindings[other] === key);
    if (duplicate) { this.ui.toast(`${key.toUpperCase()} is already assigned to ${BINDING_LABELS[duplicate]}. Choose another letter.`); return false; }
    this.setSetting('bindings', { ...bindings, [action]: key });
    this.ui.toast(`${BINDING_LABELS[action][0].toUpperCase()}${BINDING_LABELS[action].slice(1)} is now assigned to ${key.toUpperCase()}.`);
    return true;
  };
  private action = (action: string): void => {
    switch (action) {
      case 'home': this.goHome(); break;
      case 'explore': case 'journal-explore': this.explore(); break;
      case 'scan': this.scan(); break;
      case 'sound': void this.toggleSound(); break;
      case 'pause': this.togglePause(); break;
      case 'zoom-in': this.camera?.zoom(1); this.needsRender = true; break;
      case 'zoom-out': this.camera?.zoom(-1); this.needsRender = true; break;
      case 'reset-camera': this.camera?.reset(); this.needsRender = true; break;
      case 'close-dialog': this.openDialog(null); break;
      case 'fullscreen': void this.toggleFullscreen(); break;
      case 'reload': window.location.reload(); break;
      case 'export-log': this.exportLog(); break;
      case 'clear-log':
        this.store.set({ observations: [] });
        this.ui.toast(persistObservations([]) ? 'Mission log cleared. A new journey awaits.' : 'Log cleared for this session. Local storage is unavailable.');
        break;
      case 'reset-settings': {
        const settings = defaultSettings(this.motionPreference.matches);
        this.store.set({ settings }); persistSettings(settings); this.ui.toast('Observatory preferences restored.'); break;
      }
    }
  };

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.fullscreenEnabled && this.root.requestFullscreen) await this.root.requestFullscreen();
      else this.ui.toast('Immersive mode isn’t supported here. Try your browser’s full-screen view.');
    } catch { this.ui.toast('This browser is not allowing full screen. Try its full-screen menu instead.'); }
  }
  private onFullscreen = (): void => {
    const button = this.root.querySelector<HTMLButtonElement>('[data-action="fullscreen"]')!;
    button.firstChild!.textContent = document.fullscreenElement ? 'EXIT IMMERSIVE MODE ' : 'IMMERSIVE MODE ';
    this.resize();
  };
  private exportLog(): void {
    const observations = this.store.value.observations.map(observation => ({ ...observation, world: getWorld(observation.worldId) }));
    const data = { observatory: 'AETHER', version: 1, note: 'An artistic exploration. All worlds and readings are fictional.', exportedAt: new Date().toISOString(), observations };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'aether-field-notes.json';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.ui.toast('Your field notes are ready to take with you.');
  }
  private onPointerDown = (event: PointerEvent): void => {
    this.pointerDown.set(event.clientX, event.clientY); this.clickStarted = performance.now();
  };
  private onPointerUp = (event: PointerEvent): void => {
    if (!this.camera || !this.planet || this.store.value.dialog || this.contextIsLost) return;
    if (Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y) > 5 || performance.now() - this.clickStarted > 350) return;
    const rect = this.ui.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera.camera);
    if (this.raycaster.intersectObject(this.planet.surface).length) this.explore();
  };
  private onVisibility = (): void => {
    this.audio.setPaused(document.hidden || this.store.value.paused || this.store.value.dialog !== null);
    if (document.hidden) cancelAnimationFrame(this.request);
    else if (this.store.value.ready) { this.lastFrame = performance.now(); this.needsRender = true; this.quality.reset(); cancelAnimationFrame(this.request); this.request = requestAnimationFrame(this.frame); }
  };
  private onMotionPreference = (event: MediaQueryListEvent): void => { this.setSetting('reducedMotion', event.matches); };
  private onContextLost = (event: Event): void => {
    event.preventDefault(); this.contextIsLost = true; this.ui.contextLost(true); this.audio.setPaused(true);
    this.lighting?.dispose(); this.lighting = null; this.scene.environment = null;
    this.pipeline?.releaseContextTargets();
  };
  private onContextRestored = (): void => {
    // Rebuild on the next frame, after all of Three's native restoration listeners finish.
    this.restorePending = true;
  };
  private restoreContext(): void {
    this.restorePending = false;
    if (!this.pipeline) return;
    try {
      this.pipeline.restoreContextTargets();
      this.lighting = createLighting(this.scene, this.pipeline.renderer, this.store.value.activeQuality);
      this.contextIsLost = false;
      this.applyQuality(this.store.value.activeQuality); this.resize(); this.ui.contextLost(false);
      this.quality.reset(); this.needsRender = true;
      this.ui.toast('Deep-space connection restored. Welcome back.');
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Context restoration fell back to static exploration.', error);
      this.contextIsLost = false; this.releaseRenderer(); this.ui.contextLost(false);
      this.store.set({ renderAvailable: false }); this.ui.fallback();
    }
    this.audio.setPaused(document.hidden || this.store.value.paused || this.store.value.dialog !== null);
  }
  private releaseRenderer(): void {
    this.camera?.controls.removeEventListener('change', this.invalidate);
    this.camera?.dispose(); this.planet?.dispose(); this.stars?.dispose(); this.lighting?.dispose(); this.pipeline?.dispose();
    this.camera = null; this.planet = null; this.stars = null; this.lighting = null; this.pipeline = null;
    this.scene.clear();
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.selectionVersion++;
    cancelAnimationFrame(this.request); this.events.abort(); this.resizeObserver.disconnect();
    this.unsubscribe(); this.keyboard.dispose(); this.ui.dispose(); this.audio.dispose();
    this.releaseRenderer(); this.assets.dispose(); this.store.dispose();
  }
}
