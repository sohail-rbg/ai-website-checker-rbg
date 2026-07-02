export const SCORE_WEIGHTS = {
  metadata: 10,
  schema: 20,
  performance: 10,
  content: 15,
  eeat: 15,
  entities: 10,
  robots: 10,
  sitemap: 5,
  links: 5,
  images: 5,
  readability: 5,
};

export function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function weightedPoints(percent, weight) {
  return (clampScore(percent) / 100) * weight;
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
