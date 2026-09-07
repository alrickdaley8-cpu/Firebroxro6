import { existsSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Store } from '../../src/core/state';
import { defaultSettings } from '../../src/utils/storage';
import { AdaptiveQuality, QUALITY_PROFILES } from '../../src/config/quality';
import { getWorld, isWorldId, WORLDS } from '../../src/config/worlds';
import { damp, seededRandom } from '../../src/utils/math';

const makeStore = () => new Store({
  worldId: 'aurelia', mode: 'overview', dialog: null, settings: defaultSettings(), observations: [],
  audioEnabled: false, scanProgress: null, activeQuality: 'high', paused: false, ready: false, renderAvailable: true,
});

describe('application state', () => {
  it('notifies subscribers with immutable previous and next states', () => {
    const store = makeStore(), listener = vi.fn(), before = store.value;
    store.subscribe(listener); store.set({ mode: 'orbit' });
    expect(before.mode).toBe('overview');
    expect(store.value.mode).toBe('orbit');
    expect(listener).toHaveBeenCalledWith(store.value, before);
  });
  it('unsubscribes and disposes cleanly', () => {
    const store = makeStore(), listener = vi.fn();
    const unsubscribe = store.subscribe(listener); unsubscribe();
    store.set({ paused: true }); expect(listener).not.toHaveBeenCalled();
    store.subscribe(listener); store.dispose(); store.set({ paused: false });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('deterministic art and camera math', () => {
  it('has reproducible, bounded randomness', () => {
    const first = seededRandom(42), second = seededRandom(42);
    for (let i = 0; i < 100; i++) { const number = first(); expect(number).toBe(second()); expect(number).toBeGreaterThanOrEqual(0); expect(number).toBeLessThan(1); }
  });
  it('damps independently of frame rate', () => {
    let sixty = 0, thirty = 0;
    for (let i = 0; i < 60; i++) sixty = damp(sixty, 1, 3, 1 / 60);
    for (let i = 0; i < 30; i++) thirty = damp(thirty, 1, 3, 1 / 30);
    expect(sixty).toBeCloseTo(thirty, 12);
  });
});

describe('quality scaling', () => {
  it('reduces cost at every tier', () => {
    expect(QUALITY_PROFILES.low.bloom).toBe(false);
    expect(QUALITY_PROFILES.low.shadows).toBe(false);
    expect(QUALITY_PROFILES.high.shadows).toBe(true);
    expect(QUALITY_PROFILES.ultra.pixelRatio).toBeGreaterThan(QUALITY_PROFILES.high.pixelRatio);
    expect(QUALITY_PROFILES.low.stars).toBeLessThan(QUALITY_PROFILES.medium.stars);
  });
  it('steps down after sustained slow frames', () => {
    const adaptive = new AdaptiveQuality();
    let next: string | null = null;
    for (let i = 0; i < 250 && !next; i++) next = adaptive.sample(.05, 'high');
    expect(next).toBe('medium');
  });
  it('does not go below low or drop a stable 60 FPS profile', () => {
    const low = new AdaptiveQuality(), stable = new AdaptiveQuality();
    for (let i = 0; i < 1000; i++) {
      expect(low.sample(.08, 'low')).toBeNull();
      expect(stable.sample(1 / 60, 'high')).toBeNull();
    }
  });
  it('does not let a single slow frame cause a quality change', () => {
    const adaptive = new AdaptiveQuality();
    for (let i = 0; i < 500; i++) adaptive.sample(1 / 60, 'high');
    expect(adaptive.sample(.18, 'high')).toBeNull();
  });
});

describe('asset integrity', () => {
  it('ships every texture and portrait referenced by the atlas', () => {
    WORLDS.forEach(world => {
      expect(existsSync(`public/${world.texture}`)).toBe(true);
      expect(existsSync(`public/assets/worlds/${world.id}.webp`)).toBe(true);
      expect(getWorld(world.id).name).toBe(world.name);
    });
    expect(existsSync('public/assets/observatory-nebula.webp')).toBe(true);
    expect(existsSync('public/assets/favicon.svg')).toBe(true);
  });
  it('has four distinct, validated world identifiers', () => {
    expect(new Set(WORLDS.map(world => world.id)).size).toBe(4);
    expect(isWorldId('nix')).toBe(true);
    expect(isWorldId('imaginary-path')).toBe(false);
    expect(isWorldId(null)).toBe(false);
  });
});
