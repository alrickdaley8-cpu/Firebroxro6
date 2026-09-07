import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings, loadObservations, loadSettings, persistObservations, persistSettings } from '../../src/utils/storage';
import { DEFAULT_BINDINGS, validBindings } from '../../src/config/controls';

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    clear: () => data.clear(),
  });
});

describe('privacy-safe preferences', () => {
  it('respects system reduced motion on a first visit', () => {
    expect(loadSettings(true)).toEqual(defaultSettings(true));
  });
  it('round-trips preferences and custom controls', () => {
    const settings = { ...defaultSettings(), volume: .72, quality: 'high' as const, bindings: { ...DEFAULT_BINDINGS, scan: 'q' } };
    expect(persistSettings(settings)).toBe(true);
    expect(loadSettings()).toEqual(settings);
  });
  it('validates and clamps untrusted settings', () => {
    localStorage.setItem('aether:settings:v1', JSON.stringify({ quality: 'cinema', volume: 900, sensitivity: -10, reducedMotion: 'no', autoRotate: false, bindings: { ...DEFAULT_BINDINGS, scan: 'm' } }));
    const settings = loadSettings();
    expect(settings.quality).toBe('auto');
    expect(settings.volume).toBe(1);
    expect(settings.sensitivity).toBe(.3);
    expect(settings.reducedMotion).toBe(false);
    expect(settings.autoRotate).toBe(false);
    expect(settings.bindings).toEqual(DEFAULT_BINDINGS);
  });
  it('rejects corrupt JSON without interrupting startup', () => {
    localStorage.setItem('aether:settings:v1', '{broken');
    expect(loadSettings()).toEqual(defaultSettings());
  });
  it('works when browser storage access is denied', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
    expect(loadSettings()).toEqual(defaultSettings());
    expect(loadObservations()).toEqual([]);
    expect(persistSettings(defaultSettings())).toBe(false);
    expect(persistObservations([])).toBe(false);
  });
});

describe('mission log', () => {
  it('round-trips a real observation timestamp', () => {
    const observations = [{ worldId: 'aurelia' as const, recordedAt: '2026-09-07T10:00:00.000Z' }];
    expect(persistObservations(observations)).toBe(true);
    expect(loadObservations()).toEqual(observations);
  });
  it('discards duplicates, malformed dates, and unknown worlds', () => {
    localStorage.setItem('aether:observations:v1', JSON.stringify([
      { worldId: 'aurelia', recordedAt: '2026-09-07T10:00:00.000Z' },
      { worldId: 'aurelia', recordedAt: '2026-09-08T10:00:00.000Z' },
      { worldId: 'unknown', recordedAt: '2026-09-07T10:00:00.000Z' },
      { worldId: 'nix', recordedAt: '<script>no</script>' },
      null, 'invalid',
    ]));
    expect(loadObservations()).toEqual([{ worldId: 'aurelia', recordedAt: '2026-09-07T10:00:00.000Z' }]);
  });
  it('recovers from a non-array log', () => {
    localStorage.setItem('aether:observations:v1', '{}');
    expect(loadObservations()).toEqual([]);
  });
});

describe('shortcut validation', () => {
  it('accepts distinct lowercase letters', () => { expect(validBindings(DEFAULT_BINDINGS)).toBe(true); });
  it('rejects duplicates and reserved keys', () => {
    expect(validBindings({ ...DEFAULT_BINDINGS, scan: 'e' })).toBe(false);
    expect(validBindings({ ...DEFAULT_BINDINGS, scan: 'ArrowLeft' })).toBe(false);
    expect(validBindings({ ...DEFAULT_BINDINGS, scan: '1' })).toBe(false);
    expect(validBindings({})).toBe(false);
  });
});
