import type { QualityLevel, QualitySetting } from '../config/quality';
import type { WorldId } from '../config/worlds';
import type { KeyBindings } from '../config/controls';

export interface Settings {
  quality: QualitySetting;
  volume: number;
  autoRotate: boolean;
  reducedMotion: boolean;
  showOrbits: boolean;
  sensitivity: number;
  bindings: KeyBindings;
}
export interface Observation { worldId: WorldId; recordedAt: string }
export type Dialog = 'atlas' | 'journal' | 'settings' | 'about' | null;
export interface AppState {
  worldId: WorldId;
  mode: 'overview' | 'orbit';
  dialog: Dialog;
  settings: Settings;
  observations: Observation[];
  audioEnabled: boolean;
  scanProgress: number | null;
  activeQuality: QualityLevel;
  paused: boolean;
  ready: boolean;
  renderAvailable: boolean;
}
export type StateListener = (state: AppState, previous: AppState) => void;

export class Store {
  private listeners = new Set<StateListener>();
  constructor(private state: AppState) {}
  get value(): AppState { return this.state; }
  set(patch: Partial<AppState>): void {
    const previous = this.state;
    this.state = { ...previous, ...patch };
    this.listeners.forEach(listener => listener(this.state, previous));
  }
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  dispose(): void { this.listeners.clear(); }
}
