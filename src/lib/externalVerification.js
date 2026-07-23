import axios from "axios";

const SEARCH_CONSOLE_PROVIDER = "Google Search Console URL Inspection";
let cachedGoogleToken = null;

function googleApiTimeout() {
  return Math.max(5000, Math.min(45000, Number(process.env.GOOGLE_SEARCH_CONSOLE_TIMEOUT_MS) || 30000));
}

function retryableGoogleError(error) {
  const status = Number(error.response?.status) || 0;
  return ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"].includes(error.code) || status === 429 || status >= 500;
}

function notConfigured(provider, requirement) {
  return { provider, status: "not_configured", measured: false, requirement };
}

export function urlBelongsToSearchConsoleProperty(url, siteUrl) {
  try {
    const inspected = new URL(url);
    const property = String(siteUrl || "").trim();
    if (property.toLowerCase().startsWith("sc-domain:")) {
      const domain = property.slice("sc-domain:".length).trim().toLowerCase().replace(/^\.+|\.+$/g, "");
      const hostname = inspected.hostname.toLowerCase().replace(/\.$/, "");
      return Boolean(domain) && (hostname === domain || hostname.endsWith(`.${domain}`));
    }
    const prefix = new URL(property);
    return inspected.href.startsWith(prefix.href);
  } catch {
    return false;
  }
}

async function refreshGoogleAccessToken() {
  const refreshToken = process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) return null;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await axios.post("https://oauth2.googleapis.com/token", body.toString(), {
    timeout: 15000,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const accessToken = response.data?.access_token;
  if (!accessToken) throw new Error("Google did not return a refreshed access token.");
  cachedGoogleToken = {
    value: accessToken,
    expiresAt: Date.now() + Math.max(60, Number(response.data?.expires_in) || 3600) * 1000 - 60000,
  };
  return accessToken;
}

async function googleAccessToken({ forceRefresh = false } = {}) {
  if (!forceRefresh && cachedGoogleToken?.expiresAt > Date.now()) return cachedGoogleToken.value;
  if (forceRefresh || !process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN) {
    const refreshed = await refreshGoogleAccessToken();
    if (refreshed) return refreshed;
  }
  return process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN || null;
}

export function summarizeInspection(result = {}) {
  const index = result.indexStatusResult || {};
  const mobile = result.mobileUsabilityResult || {};
  const rich = result.richResultsResult || {};
  return {
    verdict: index.verdict || "VERDICT_UNSPECIFIED",
    coverageState: index.coverageState || "",
    indexingState: index.indexingState || "",
    pageFetchState: index.pageFetchState || "",
    robotsTxtState: index.robotsTxtState || "",
    crawledAs: index.crawledAs || "",
    lastCrawlTime: index.lastCrawlTime || null,
    googleCanonical: index.googleCanonical || "",
    userCanonical: index.userCanonical || "",
    referringUrls: index.referringUrls || [],
    mobileVerdict: mobile.verdict || "VERDICT_UNSPECIFIED",
    richResultsVerdict: rich.verdict || "VERDICT_UNSPECIFIED",
    detectedRichResultItems: rich.detectedItems || [],
  };
}

function searchConsoleError(error) {
  const status = Number(error.response?.status) || null;
  const googleMessage = String(error.response?.data?.error?.message || error.message || "");
  if (["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"].includes(error.code) || /timed? ?out/i.test(googleMessage)) return "Google Search Console did not respond in time after two attempts. Retry later; this does not affect the readiness score.";
  if (status === 401) return "Google authorization expired or was revoked. Add a new access token, or configure refresh-token credentials.";
  if (status === 403) return "Google denied access. Enable the Search Console API and grant the authenticated account access to this property with the webmasters.readonly scope.";
  if (status === 400 && /site|property|inspection/i.test(googleMessage)) return "The inspected URL is not valid for the configured Search Console property.";
  if (/invalid_grant/i.test(googleMessage)) return "The Google refresh token is invalid or expired. Re-authorize the Search Console connection.";
  return googleMessage || "Google Search Console verification was unavailable.";
}

export async function searchConsole(url) {
  const siteUrl = String(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || "").trim();
  const hasAccessToken = Boolean(process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN);
  const hasRefreshCredentials = Boolean(process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN && process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  if (!siteUrl || (!hasAccessToken && !hasRefreshCredentials)) {
    return notConfigured(SEARCH_CONSOLE_PROVIDER, "GOOGLE_SEARCH_CONSOLE_SITE_URL plus an access token or OAuth refresh credentials");
  }
  if (!urlBelongsToSearchConsoleProperty(url, siteUrl)) {
    return {
      provider: SEARCH_CONSOLE_PROVIDER,
      status: "not_applicable",
      measured: false,
      siteUrl,
      reason: "The scanned URL is outside the configured Search Console property.",
    };
  }

  const inspect = async (token) => {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await axios.post(
          "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
          { inspectionUrl: url, siteUrl, languageCode: "en-US" },
          { timeout: googleApiTimeout(), headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
        );
      } catch (error) {
        lastError = error;
        if (!retryableGoogleError(error) || attempt === 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    throw lastError;
  };

  try {
    let token = await googleAccessToken();
    if (!token) return notConfigured(SEARCH_CONSOLE_PROVIDER, "Valid Google OAuth credentials");
    let response;
    try {
      response = await inspect(token);
    } catch (error) {
      if (error.response?.status !== 401 || !hasRefreshCredentials) throw error;
      token = await googleAccessToken({ forceRefresh: true });
      response = await inspect(token);
    }
    const result = response.data?.inspectionResult || {};
    return {
      provider: SEARCH_CONSOLE_PROVIDER,
      status: "verified",
      measured: true,
      siteUrl,
      inspectedUrl: url,
      inspectionResultLink: result.inspectionResultLink || "",
      summary: summarizeInspection(result),
      indexStatus: result.indexStatusResult || null,
      mobileUsability: result.mobileUsabilityResult || null,
      richResults: result.richResultsResult || null,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      provider: SEARCH_CONSOLE_PROVIDER,
      status: "unavailable",
      measured: false,
      siteUrl,
      error: searchConsoleError(error),
      httpStatus: Number(error.response?.status) || null,
    };
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
  const results = await Promise.all([searchConsole(url), customVerification(url)]);
  return {
    results,
    verifiedSources: results.filter((item) => item.status === "verified").length,
    note: "External evidence is reported separately and never inferred when credentials are absent or the scanned URL is outside the configured property.",
  };
}
