// Adjust Multipliers - SkillPlay
const ABSOLUTE_LIMITS: Record<string, { min: number; max: number }> = {
  basic: { min: 0.8, max: 1.5 },
  medium: { min: 1.5, max: 2.5 },
  advanced: { min: 2.0, max: 3.5 },
  expert: { min: 3.0, max: 5.0 },
};

export function adjustMultiplier(difficulty: string, current: number, avgAccuracy: number): number {
  const limits = ABSOLUTE_LIMITS[difficulty];
  if (!limits) return current;

  const range = { min: 60, max: 85 };

  if (avgAccuracy > range.max) {
    const delta = Math.min((avgAccuracy - range.max) / 100, 0.3);
    const raw = current * (1 + delta);
    return Math.min(Math.max(Math.round(raw * 10) / 10, limits.min), limits.max);
  }

  if (avgAccuracy < range.min) {
    const delta = Math.min((range.min - avgAccuracy) / 100, 0.2);
    const raw = current * (1 - delta);
    return Math.min(Math.max(Math.round(raw * 10) / 10, limits.min), limits.max);
  }

  return current;
}