// Prize Calculator - SkillPlay
let MULTIPLIER_CACHE: any = null;
let CACHE_EXPIRES_AT = 0;

export function getMultipliers(): any {
  const now = Date.now();
  if (MULTIPLIER_CACHE && CACHE_EXPIRES_AT > now) {
    return MULTIPLIER_CACHE;
  }

  // Recargar desde Firestore o usar defaults
  MULTIPLIER_CACHE = {
    basic: 1.0,
    medium: 1.8,
    advanced: 2.5,
    expert: 3.5,
  };

  CACHE_EXPIRES_AT = now + 5 * 60 * 1000; // 5 minutos
  return MULTIPLIER_CACHE;
}

export function invalidateMultiplierCache(): void {
  MULTIPLIER_CACHE = null;
  CACHE_EXPIRES_AT = 0;
  console.log(`[prizeCalculator] Multiplier cache invalidated`);
}

export function calculatePrize(entryFee: number, difficulty: string, correctAnswers: number, totalQuestions: number): number {
  const accuracy = correctAnswers / totalQuestions;
  const multipliers = getMultipliers();
  const multiplier = multipliers[difficulty] ?? 1.0;

  const basePrize = entryFee * multiplier * accuracy;
  return Math.round(basePrize * 100) / 100;
}