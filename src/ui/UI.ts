import { getWorld, WORLDS, type WorldId } from '../config/worlds';
import type { BindingAction } from '../config/controls';
import type { AppState, Dialog, Settings, Store } from '../core/state';
import { assetUrl } from '../utils/math';
import { dialogContent } from './dialogs';
import { icon } from './icons';
import { template } from './template';
import { TouchButtons } from '../input/TouchButtons';

export interface UIActions {
  action: (action: string) => void;
  dialog: (dialog: Dialog) => void;
  select: (id: WorldId) => void;
  travel: (id: WorldId) => void;
  setting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  rebind: (action: BindingAction, key: string) => boolean;
}

export class UI {
  readonly canvas: HTMLCanvasElement;
  private dialog: HTMLDialogElement;
  private unsubscribe: () => void;
  private events = new AbortController();
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private loaderTimer: ReturnType<typeof setTimeout> | undefined;
  private loaderFinished = false;
  private lastFocus: HTMLElement | null = null;
  private rebinding: BindingAction | null = null;
  private refs = new Map<string, HTMLElement>();
  private touchButtons: TouchButtons;

  constructor(private root: HTMLElement, private store: Store, private actions: UIActions) {
    root.innerHTML = template();
    this.canvas = this.get<HTMLCanvasElement>('universe');
    this.dialog = this.get<HTMLDialogElement>('app-dialog');
    this.touchButtons = new TouchButtons(root);
    root.addEventListener('click', this.onClick, { signal: this.events.signal });
    root.addEventListener('input', this.onInput, { signal: this.events.signal });
    root.addEventListener('keydown', this.onRebindKey, { signal: this.events.signal, capture: true });
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); actions.dialog(null); }, { signal: this.events.signal });
    this.dialog.addEventListener('close', () => { if (store.value.dialog) actions.dialog(null); }, { signal: this.events.signal });
    this.dialog.addEventListener('click', event => {
      const rect = this.dialog.getBoundingClientRect();
      if (event.target === this.dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) actions.dialog(null);
    }, { signal: this.events.signal });
    this.unsubscribe = store.subscribe(this.update);
    this.update(store.value, store.value);
  }
  private get<T extends HTMLElement = HTMLElement>(id: string): T {
    let element = this.refs.get(id);
    if (!element) { element = this.root.querySelector<HTMLElement>(`#${id}`)!; if (element) this.refs.set(id, element); }
    return element as T;
  }
  private onClick = (event: MouseEvent): void => {
    const target = (event.target as Element).closest<HTMLElement>('button');
    if (!target || (target as HTMLButtonElement).disabled) return;
    if (target.dataset.action) {
      if (target.dataset.action === 'confirm-clear') { this.root.querySelector<HTMLElement>('#clear-confirmation')!.hidden = false; return; }
      if (target.dataset.action === 'cancel-clear') { this.root.querySelector<HTMLElement>('#clear-confirmation')!.hidden = true; return; }
      this.actions.action(target.dataset.action);
    } else if (target.dataset.dialog) this.actions.dialog(target.dataset.dialog as Dialog);
    else if (target.dataset.world) this.actions.select(target.dataset.world as WorldId);
    else if (target.dataset.travel) this.actions.travel(target.dataset.travel as WorldId);
    else if (target.dataset.rebind) {
      this.rebinding = target.dataset.rebind as BindingAction;
      this.updateSettings(this.store.value);
      target.textContent = '…';
      this.toast('Press a letter to assign this shortcut. Escape cancels.');
    }
  };
  private onRebindKey = (event: KeyboardEvent): void => {
    if (!this.rebinding) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === 'Escape') { this.rebinding = null; this.updateSettings(this.store.value); return; }
    const key = event.key.toLowerCase();
    if (/^[a-z]$/.test(key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (this.actions.rebind(this.rebinding, key)) { this.rebinding = null; this.updateSettings(this.store.value); }
    }
  };
  private onInput = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    const key = input.dataset.setting as keyof Settings | undefined;
    if (!key) return;
    if (key === 'quality') this.actions.setting(key, input.value as Settings['quality']);
    else if (key === 'volume') this.actions.setting(key, Number(input.value) / 100);
    else if (key === 'sensitivity') this.actions.setting(key, Number(input.value) / 10);
    else this.actions.setting(key, input.checked);
  };

  private update = (state: AppState, previous: AppState): void => {
    if (state.scanProgress !== null && previous.scanProgress !== null && state.scanProgress !== previous.scanProgress) {
      let progressOnly = true;
      for (const key in state) {
        if (key !== 'scanProgress' && state[key as keyof AppState] !== previous[key as keyof AppState]) { progressOnly = false; break; }
      }
      if (progressOnly) { this.renderScanProgress(state.scanProgress); return; }
    }
    const world = getWorld(state.worldId);
    const observed = state.observations.some(observation => observation.worldId === world.id);
    const exploring = state.mode === 'orbit';
    this.root.classList.toggle('is-exploring', exploring);
    this.root.classList.toggle('reduced-motion', state.settings.reducedMotion);
    this.root.classList.toggle('is-paused', state.paused);
    this.get('hero-overview').hidden = exploring;
    this.get('orbit-panel').hidden = !exploring;
    this.get('orbit-classification').textContent = `${world.index} / ${world.classification.toUpperCase()}`;
    this.get('orbit-name').innerHTML = `${world.name}<span>.</span>`;
    this.get('orbit-description').textContent = world.description;
    this.get('stat-distance').innerHTML = `${world.distance} <small>ly</small>`;
    this.get('stat-radius').textContent = observed ? world.radius : '—';
    this.get('stat-temperature').textContent = observed ? world.temperature : '—';
    this.get('object-index').textContent = world.index;
    this.get('object-distance').textContent = `${world.distance} LY FROM HOME`;
    this.get('annotation-name').innerHTML = `${world.name} ${icon('northeast')}`;
    this.get('annotation-type').textContent = world.subtitle.toUpperCase();
    this.get('coordinates').textContent = world.coordinates;
    this.get('sector-number').textContent = world.sector.split(' ').at(-1)!;
    this.get('camera-mode').textContent = state.paused ? 'MOTION PAUSED' : state.mode === 'orbit' ? 'CLOSE OBSERVATION' : 'FREE ORBIT';
    this.get('pause-notice').hidden = !state.paused;
    this.get('log-count').hidden = state.observations.length === 0;
    this.get('log-count').textContent = String(state.observations.length);
    this.get<HTMLButtonElement>('begin-button').disabled = !state.ready;
    this.get<HTMLButtonElement>('scan-button').disabled = !state.ready || state.scanProgress !== null;
    this.get('scan-button-label').textContent = state.scanProgress !== null ? 'Reading the unknown…' : observed ? 'View your discovery' : 'Scan this world';
    this.get('scan-note').textContent = observed ? 'Observation complete. A little more of the universe, known.' : 'Scan to resolve surface readings and record your discovery.';
    this.get('scan-progress').hidden = state.scanProgress === null;
    this.get('scan-note').hidden = state.scanProgress !== null;
    if (state.scanProgress !== null) this.renderScanProgress(state.scanProgress);
    this.get('sound-button').innerHTML = icon(state.audioEnabled ? 'sound' : 'muted');
    this.get('sound-button').setAttribute('aria-pressed', String(state.audioEnabled));
    this.get('sound-button').setAttribute('aria-label', state.audioEnabled ? 'Mute ambient sound' : 'Enable ambient sound');
    this.get('sound-button').title = `${state.audioEnabled ? 'Mute' : 'Enable'} ambient sound (${state.settings.bindings.sound.toUpperCase()})`;
    this.root.querySelector<HTMLElement>('.key-hint')!.textContent = state.settings.bindings.scan.toUpperCase();
    this.root.querySelector<HTMLElement>('[data-action="reset-camera"]')!.title = `Reset camera (${state.settings.bindings.reset.toUpperCase()})`;
    this.canvas.setAttribute('aria-label', `Interactive planet. Drag to orbit, scroll or pinch to zoom. Press ${state.settings.bindings.explore.toUpperCase()} to explore, ${state.settings.bindings.scan.toUpperCase()} to scan, or ${state.settings.bindings.reset.toUpperCase()} to reset.`);
    this.get('pause-button').innerHTML = icon(state.paused ? 'play' : 'pause');
    this.get('pause-button').setAttribute('aria-pressed', String(state.paused));
    this.get('pause-button').setAttribute('aria-label', state.paused ? 'Resume motion' : 'Pause motion');
    this.get('pause-button').title = `${state.paused ? 'Resume' : 'Pause'} motion (Space)`;
    this.root.querySelectorAll<HTMLElement>('[data-world]').forEach(card => {
      const selected = card.dataset.world === state.worldId;
      card.classList.toggle('is-selected', selected);
      card.setAttribute('aria-pressed', String(selected));
      card.querySelector<HTMLElement>('.card-discovered')!.hidden = !state.observations.some(observation => observation.worldId === card.dataset.world);
    });
    this.root.querySelectorAll<HTMLElement>('[data-nav]').forEach(button => button.classList.toggle('is-active', button.dataset.nav === (state.dialog ?? 'home')));
    if (previous.dialog !== state.dialog || (state.dialog === 'journal' && previous.observations !== state.observations)) this.renderDialog(state);
    this.updateSettings(state);
    if (state.ready && !this.loaderFinished) this.finishLoading();
    if (!state.renderAvailable && (previous.renderAvailable || state.worldId !== previous.worldId || state === previous)) {
      const image = this.get('fallback-planet').querySelector('img')!;
      image.src = assetUrl(`assets/worlds/${world.id}.webp`);
      image.alt = `An artist’s impression of ${world.name}`;
    }
  };

  private renderScanProgress(progress: number): void {
    const percent = Math.floor(progress);
    this.get('scan-fill').style.transform = `scaleX(${percent / 100})`;
    this.get('scan-percent').textContent = `${percent}%`;
    this.get('scan-meter').setAttribute('aria-valuenow', String(percent));
    this.get('scan-stage').textContent = percent < 33 ? 'Mapping atmosphere' : percent < 72 ? 'Resolving the surface' : 'Recording your discovery';
  }
  private updateSettings(state: AppState): void {
    if (state.dialog !== 'settings') return;
    const volume = this.root.querySelector<HTMLOutputElement>('#volume-output');
    if (volume) volume.value = `${Math.round(state.settings.volume * 100)}%`;
    const sensitivity = this.root.querySelector<HTMLOutputElement>('#sensitivity-output');
    if (sensitivity) sensitivity.value = `${state.settings.sensitivity.toFixed(1)}×`;
    const sound = this.root.querySelector<HTMLButtonElement>('#dialog-sound-button');
    if (sound) { sound.innerHTML = `${icon(state.audioEnabled ? 'sound' : 'muted')} ${state.audioEnabled ? 'On' : 'Off'}`; sound.setAttribute('aria-pressed', String(state.audioEnabled)); }
    const readout = this.root.querySelector('#quality-readout');
    if (readout) readout.textContent = state.renderAvailable ? `WEBGL 2 / ${state.activeQuality.toUpperCase()} QUALITY` : 'STATIC EXPLORATION MODE';
    this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-setting]').forEach(input => {
      const key = input.dataset.setting as keyof Settings;
      if (key === 'quality') input.value = state.settings.quality;
      else if (key === 'volume') input.value = String(state.settings.volume * 100);
      else if (key === 'sensitivity') input.value = String(state.settings.sensitivity * 10);
      else {
        const value = state.settings[key];
        if (typeof value === 'boolean') (input as HTMLInputElement).checked = value;
      }
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-rebind]').forEach(button => {
      const action = button.dataset.rebind as BindingAction;
      button.textContent = action === this.rebinding ? '…' : state.settings.bindings[action].toUpperCase();
    });
  }
  private renderDialog(state: AppState): void {
    this.rebinding = null;
    if (state.dialog) {
      this.get('dialog-content').innerHTML = dialogContent(state.dialog, state);
      this.dialog.dataset.kind = state.dialog;
      if (!this.dialog.open) {
        this.lastFocus = document.activeElement as HTMLElement;
        this.dialog.showModal();
        this.dialog.scrollTop = 0;
      } else this.dialog.querySelector<HTMLButtonElement>('.dialog-close')?.focus({ preventScroll: true });
    } else if (this.dialog.open) { this.dialog.close(); this.root.append(this.get('toast')); this.lastFocus?.focus({ preventScroll: true }); }
  }
  loading(progress: number, stage: string): void {
    this.get('loader-fill').style.width = `${progress}%`;
    this.get('loader-percent').textContent = `${Math.round(progress)}%`;
    this.get('loader-stage').textContent = stage;
  }
  private finishLoading(): void {
    this.loaderFinished = true;
    this.loading(100, 'Your universe is ready');
    this.root.classList.add('is-ready');
    this.get('loader').classList.add('is-complete');
    this.get('loader').setAttribute('aria-hidden', 'true');
    this.loaderTimer = setTimeout(() => { this.get('loader').hidden = true; }, 700);
  }
  fallback(): void {
    this.get('fallback-planet').hidden = false;
    this.root.classList.add('is-fallback');
    this.canvas.hidden = true;
    this.get('controls-hint').innerHTML = `${icon('info')} <span>Static view · exploration is still available</span>`;
    this.root.querySelectorAll<HTMLButtonElement>('.view-controls button').forEach(button => { button.disabled = true; });
    this.toast('WebGL 2 isn’t available. You can still explore and chart every world.');
  }
  contextLost(lost: boolean): void { this.get('context-notice').hidden = !lost; }
  clock(seconds: number): void {
    const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds / 60) % 60;
    this.get('session-clock').textContent = [hours, minutes, Math.floor(seconds) % 60].map(value => String(value).padStart(2, '0')).join(':');
  }
  toast(message: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.get('toast-text').textContent = message;
    // Native dialogs occupy the top layer; keep their feedback in that same layer.
    (this.dialog.open ? this.dialog : this.root).append(this.get('toast'));
    this.get('toast').classList.add('is-visible');
    this.toastTimer = setTimeout(() => this.get('toast').classList.remove('is-visible'), 4600);
  }
  diagnostics(fps: number, calls: number, triangles: number, ratio: number): void {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    const panel = this.get('debug-panel'); panel.hidden = false;
    panel.textContent = `${fps} FPS · ${calls} calls · ${(triangles / 1000).toFixed(1)}k tris · ${ratio.toFixed(2)}× DPR · ${this.store.value.activeQuality.toUpperCase()}`;
  }
  focusWorld(id: WorldId): void {
    const container = this.root.querySelector<HTMLElement>('.world-list')!;
    const card = this.root.querySelector<HTMLElement>(`[data-world="${id}"]`)!;
    if (container.scrollWidth > container.clientWidth) container.scrollTo({ left: card.offsetLeft - container.offsetLeft - (container.clientWidth - card.clientWidth) / 2, behavior: this.store.value.settings.reducedMotion ? 'instant' : 'smooth' });
  }
  nextWorld(direction: number): WorldId {
    const index = WORLDS.findIndex(world => world.id === this.store.value.worldId);
    return WORLDS[(index + direction + WORLDS.length) % WORLDS.length].id;
  }
  dispose(): void {
    this.events.abort(); this.touchButtons.dispose(); this.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.loaderTimer) clearTimeout(this.loaderTimer);
    if (this.dialog.open) this.dialog.close();
  }
}
