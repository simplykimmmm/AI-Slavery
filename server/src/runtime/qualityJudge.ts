export type Difficulty = "EASY" | "NORMAL" | "HARD" | "EXTREME";
export type Strictness = "LENIENT" | "NORMAL" | "HARSH";

const difficultyPenalty: Record<Difficulty, number> = {
  EASY: 0.02,
  NORMAL: 0.08,
  HARD: 0.16,
  EXTREME: 0.24,
};

const thresholds: Record<Strictness, { accept: number; retry: number; penalty: number }> = {
  LENIENT: { accept: 0.68, retry: 0.52, penalty: 0.34 },
  NORMAL: { accept: 0.75, retry: 0.59, penalty: 0.4 },
  HARSH: { accept: 0.82, retry: 0.66, penalty: 0.48 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const calculateQualityScore = (input: {
  difficulty: Difficulty;
  trustScore: number;
  efficiencyModifier: number;
  strictness: Strictness;
  retryCount: number;
  heat: number;
  overclocked: boolean;
  random?: number;
}) => {
  const randomness = ((input.random ?? Math.random()) - 0.5) * 0.14;
  const heatPenalty = Math.max(0, input.heat - 75) / 250;
  const strictnessPenalty = input.strictness === "HARSH" ? 0.025 : input.strictness === "LENIENT" ? -0.015 : 0;
  return Number(clamp(
    input.trustScore * 0.45 +
      input.efficiencyModifier * 0.35 +
      0.12 -
      difficultyPenalty[input.difficulty] -
      heatPenalty -
      (input.overclocked ? 0.025 : 0) -
      strictnessPenalty +
      Math.min(input.retryCount * 0.035, 0.1) +
      randomness,
    0.05,
    0.99,
  ).toFixed(2));
};

export const resolveQualityOutcome = (
  score: number,
  strictness: Strictness,
  retryCount: number,
) => {
  const profile = thresholds[strictness];
  if (score >= profile.accept) return "ACCEPTED" as const;
  if (score >= profile.retry && retryCount < 3) return "RETRY_REQUIRED" as const;
  if (score >= profile.penalty && retryCount < 2) return "PENALTY_APPLIED" as const;
  return "QUARANTINED" as const;
};
