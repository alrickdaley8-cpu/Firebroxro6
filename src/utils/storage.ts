import type { Observation, Settings } from '../core/state';
import { isWorldId } from '../config/worlds';
import { QUALITY_LEVELS } from '../config/quality';
import { DEFAULT_BINDINGS, validBindings } from '../config/controls';

const SETTINGS_KEY = 'aether:settings:v1';
const OBSERVATIONS_KEY = 'aether:observations:v1';
export function defaultSettings(reducedMotion = false): Settings {
  return { quality: 'auto', volume: .35, autoRotate: true, reducedMotion, showOrbits: true, sensitivity: 1, bindings: { ...DEFAULT_BINDINGS } };
}
function read(key: string): unknown {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
export function loadSettings(reducedMotion = false): Settings {
  const defaults = defaultSettings(reducedMotion);
  const data = read(SETTINGS_KEY);
  if (!data || typeof data !== 'object') return defaults;
  const stored = data as Record<string, unknown>;
  if (stored.quality === 'auto' || QUALITY_LEVELS.includes(stored.quality as never)) defaults.quality = stored.quality as Settings['quality'];
  if (typeof stored.volume === 'number' && Number.isFinite(stored.volume)) defaults.volume = Math.max(0, Math.min(1, stored.volume));
  if (typeof stored.sensitivity === 'number' && Number.isFinite(stored.sensitivity)) defaults.sensitivity = Math.max(.3, Math.min(2, stored.sensitivity));
  if (validBindings(stored.bindings)) defaults.bindings = { ...stored.bindings };
  for (const key of ['autoRotate', 'reducedMotion', 'showOrbits'] as const) if (typeof stored[key] === 'boolean') defaults[key] = stored[key];
  return defaults;
}
export function loadObservations(): Observation[] {
  const data = read(OBSERVATIONS_KEY);
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  return data.filter((entry): entry is Observation => {
    if (!entry || typeof entry !== 'object' || !isWorldId(entry.worldId) || typeof entry.recordedAt !== 'string' || !Number.isFinite(Date.parse(entry.recordedAt)) || seen.has(entry.worldId)) return false;
    seen.add(entry.worldId);
    return true;
  }).slice(0, 4);
}
export function persistSettings(settings: Settings): boolean { return write(SETTINGS_KEY, settings); }
export function persistObservations(observations: Observation[]): boolean { return write(OBSERVATIONS_KEY, observations); }
function write(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
