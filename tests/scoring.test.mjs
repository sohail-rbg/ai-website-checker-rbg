import assert from "node:assert/strict";
import test from "node:test";
import { SCORE_WEIGHTS, weightedAverageScore } from "../src/lib/scoring.js";

test("weighted average does not clamp overweight totals to a false 100", () => {
  const scores = Object.fromEntries(Object.keys(SCORE_WEIGHTS).map((key) => [key, 100]));
  scores.performance = 79;

  assert.equal(weightedAverageScore(scores), 98);
});

test("perfect score remains 100 when every weighted module is perfect", () => {
  const scores = Object.fromEntries(Object.keys(SCORE_WEIGHTS).map((key) => [key, 100]));

  assert.equal(weightedAverageScore(scores), 100);
});
