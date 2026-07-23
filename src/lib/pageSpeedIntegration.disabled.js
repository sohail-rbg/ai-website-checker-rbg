// Backup created 2026-07-22 before restoring the no-key local Lighthouse flow.
// This module is intentionally not imported. Restore it later if PageSpeed API
// measurements are needed again.
import axios from "axios";
import { clampScore } from "./scoring.js";

export async function runGooglePageSpeed(url, apiKey, timeout = 30000) {
  if (!apiKey) return null;
  const response = await axios.get("https://www.googleapis.com/pagespeedonline/v5/runPagespeed", {
    timeout,
    params: { url, key: apiKey, strategy: "mobile", category: ["performance", "accessibility", "seo", "best-practices"] },
    paramsSerializer: { indexes: null },
  });
  const categories = response.data?.lighthouseResult?.categories || {};
  const scoreFor = (name) => Number.isFinite(categories[name]?.score) ? clampScore(categories[name].score * 100) : null;
  return {
    score: scoreFor("performance"),
    performance: scoreFor("performance"),
    accessibility: scoreFor("accessibility"),
    seo: scoreFor("seo"),
    bestPractices: scoreFor("best-practices"),
    field: response.data?.loadingExperience?.metrics || {},
    source: "Google PageSpeed Insights",
    strategy: "mobile",
    fallback: false,
    skipped: false,
    error: null,
  };
}
