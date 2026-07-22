import axios from "axios";

function notConfigured(provider, requirement) {
  return { provider, status: "not_configured", measured: false, requirement };
}

async function pageSpeed(url) {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!key) return notConfigured("Google PageSpeed Insights", "GOOGLE_PAGESPEED_API_KEY");
  try {
    const response = await axios.get("https://www.googleapis.com/pagespeedonline/v5/runPagespeed", {
      timeout: 25000,
      params: { url, key, strategy: "mobile", category: ["performance", "accessibility", "seo", "best-practices"] },
      paramsSerializer: { indexes: null },
    });
    const categories = response.data?.lighthouseResult?.categories || {};
    const field = response.data?.loadingExperience?.metrics || {};
    return {
      provider: "Google PageSpeed Insights", status: "verified", measured: true,
      lab: Object.fromEntries(Object.entries(categories).map(([name, item]) => [name, Math.round((item.score || 0) * 100)])),
      field: Object.fromEntries(Object.entries(field).map(([name, item]) => [name, { percentile: item.percentile, category: item.category }])),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return { provider: "Google PageSpeed Insights", status: "unavailable", measured: false, error: error.response?.data?.error?.message || error.message };
  }
}

async function searchConsole(url) {
  const token = process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN;
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
  if (!token || !siteUrl) return notConfigured("Google Search Console URL Inspection", "GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN and GOOGLE_SEARCH_CONSOLE_SITE_URL");
  try {
    const response = await axios.post("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", { inspectionUrl: url, siteUrl }, {
      timeout: 20000,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const result = response.data?.inspectionResult || {};
    return { provider: "Google Search Console URL Inspection", status: "verified", measured: true, indexStatus: result.indexStatusResult || null, mobileUsability: result.mobileUsabilityResult || null, richResults: result.richResultsResult || null, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return { provider: "Google Search Console URL Inspection", status: "unavailable", measured: false, error: error.response?.data?.error?.message || error.message };
  }
}

async function customVerification(url) {
  const endpoint = process.env.EXTERNAL_VERIFICATION_WEBHOOK_URL;
  const token = process.env.EXTERNAL_VERIFICATION_WEBHOOK_TOKEN;
  if (!endpoint) return notConfigured("Custom visibility verification", "EXTERNAL_VERIFICATION_WEBHOOK_URL");
  try {
    const response = await axios.post(endpoint, { url }, { timeout: 20000, headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return { provider: "Custom visibility verification", status: "verified", measured: true, data: response.data, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return { provider: "Custom visibility verification", status: "unavailable", measured: false, error: error.response?.data?.error || error.message };
  }
}

export async function runExternalVerification(url) {
  const results = await Promise.all([pageSpeed(url), searchConsole(url), customVerification(url)]);
  return { results, verifiedSources: results.filter((item) => item.status === "verified").length, note: "External evidence is reported separately and never inferred when credentials are absent." };
}
