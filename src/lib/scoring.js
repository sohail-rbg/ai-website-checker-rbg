export const SCORE_WEIGHTS = {
  metadata: 10,
  schema: 15,
  performance: 10,
  content: 10,
  eeat: 10,
  entities: 10,
  robots: 10,
  sitemap: 5,
  links: 5,
  images: 5,
  readability: 10,
};

export const PROFILE_WEIGHTS = {
  local_business: { crawlability: 20, technicalSeo: 18, contentReadiness: 15, entityConfidence: 22, performance: 10, accessibility: 5, agentReadiness: 10 },
  saas: { crawlability: 18, technicalSeo: 18, contentReadiness: 18, entityConfidence: 14, performance: 12, accessibility: 6, agentReadiness: 14 },
  ecommerce: { crawlability: 18, technicalSeo: 20, contentReadiness: 14, entityConfidence: 14, performance: 14, accessibility: 6, agentReadiness: 14 },
  publisher: { crawlability: 20, technicalSeo: 18, contentReadiness: 24, entityConfidence: 14, performance: 10, accessibility: 6, agentReadiness: 8 },
  agency: { crawlability: 18, technicalSeo: 18, contentReadiness: 20, entityConfidence: 20, performance: 10, accessibility: 6, agentReadiness: 8 },
  api: { crawlability: 16, technicalSeo: 14, contentReadiness: 18, entityConfidence: 10, performance: 10, accessibility: 6, agentReadiness: 26 },
};

export function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

export function weightedPoints(percent, weight) {
  return (clampScore(percent) / 100) * weight;
}

export function weightedAverageScore(scores, weights = SCORE_WEIGHTS) {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  if (!totalWeight) return 0;

  const points = Object.entries(weights).reduce((sum, [key, weight]) => {
    return sum + weightedPoints(scores[key], weight);
  }, 0);

  return clampScore((points / totalWeight) * 100);
}

export function profileAwareScore(categoryScores, profile = "saas") {
  const weights = PROFILE_WEIGHTS[profile] || PROFILE_WEIGHTS.saas;
  const measuredWeights = Object.fromEntries(Object.entries(weights).filter(([key]) => Number.isFinite(categoryScores[key])));
  return weightedAverageScore(categoryScores, measuredWeights);
}

export function gradeFor(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

export function statusFor(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Needs Work";
  return "At Risk";
}
