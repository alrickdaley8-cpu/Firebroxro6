export const QUALITY_LEVELS = ['low', 'medium', 'high', 'ultra'] as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[number];
export type QualitySetting = QualityLevel | 'auto';

export interface QualityProfile {
  pixelRatio: number;
  maxPixels: number;
  bloom: boolean;
  shadows: boolean;
  shadowSize: number;
  stars: number;
  debris: number;
}

export const QUALITY_PROFILES: Record<QualityLevel, QualityProfile> = {
  low: { pixelRatio: 1, maxPixels: 1_300_000, bloom: false, shadows: false, shadowSize: 512, stars: 450, debris: 100 },
  medium: { pixelRatio: 1.25, maxPixels: 2_300_000, bloom: true, shadows: false, shadowSize: 1024, stars: 900, debris: 250 },
  high: { pixelRatio: 1.65, maxPixels: 4_000_000, bloom: true, shadows: true, shadowSize: 1024, stars: 1500, debris: 450 },
  ultra: { pixelRatio: 2, maxPixels: 6_000_000, bloom: true, shadows: true, shadowSize: 2048, stars: 2400, debris: 750 },
};

export function initialQuality(): QualityLevel {
  const compact = window.matchMedia('(max-width: 760px)').matches;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (memory <= 2) return 'low';
  if (compact || memory <= 4 || navigator.hardwareConcurrency <= 4) return 'medium';
  return 'high';
}

/** Hysteresis avoids oscillation. Slow devices step down; recovery is deliberately conservative. */
export class AdaptiveQuality {
  private samples = 0;
  private total = 0;
  private cooldown = 6;
  private fastWindows = 0;

  sample(delta: number, level: QualityLevel): QualityLevel | null {
    if (this.cooldown > 0) { this.cooldown -= delta; return null; }
    this.total += Math.min(delta, .2);
    this.samples++;
    if (this.samples < 100 && this.total < 2.5) return null;
    const average = this.total / this.samples;
    this.samples = 0;
    this.total = 0;
    const index = QUALITY_LEVELS.indexOf(level);
    if (average > 1 / 38 && index > 0) {
      this.cooldown = 5;
      this.fastWindows = 0;
      return QUALITY_LEVELS[index - 1];
    }
    if (average < 1 / 57) this.fastWindows++;
    else this.fastWindows = 0;
    if (this.fastWindows >= 8 && index < 2) {
      this.cooldown = 12;
      this.fastWindows = 0;
      return QUALITY_LEVELS[index + 1];
    }
    return null;
  }

  reset(): void { this.samples = 0; this.total = 0; this.cooldown = 6; this.fastWindows = 0; }
}
