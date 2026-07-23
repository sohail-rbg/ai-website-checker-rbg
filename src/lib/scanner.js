import axios from "axios";
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import { SCORE_WEIGHTS, clampScore, gradeFor, weightedAverageScore } from "./scoring.js";
import { assertPublicUrl } from "./security.js";
import { discoverSitemaps, runSiteAudit } from "./siteAudit.js";
import { launchBrowser } from "./browser.js";

const BOT_AGENTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Googlebot", "Google-Extended", "PerplexityBot", "Bingbot", "CCBot", "Amazonbot", "Applebot"];
const SCHEMA_TYPES = ["Organization", "Person", "Article", "FAQPage", "Service", "Product", "Review", "LocalBusiness", "BreadcrumbList", "Recipe", "HowTo", "Event", "VideoObject", "JobPosting", "Course"];
const USER_AGENT = "ScanSiteAI/1.0 (+https://scansiteai.com)";
const BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const REQUEST_TIMEOUT = 22000;
const LIGHTHOUSE_TIMEOUT = Math.max(15000, Number(process.env.LIGHTHOUSE_TIMEOUT_MS) || 45000);
const SCAN_DEADLINE_MS = 105000;
const TRANSIENT_HTTP_STATUSES = new Set([408, 429, 502, 503, 504]);
const TRANSIENT_NETWORK_CODES = new Set(["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "ENETUNREACH", "EHOSTUNREACH"]);
const CONTACT_PAGE_LIMIT = 3;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const MAX_REDIRECTS = 5;
const DEFAULT_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};
const BROWSER_HEADERS = {
  "User-Agent": BROWSER_USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1",
};

export function normalizeUrl(input) {
  const value = String(input || "").trim();
  if (!value) throw new Error("Please enter a website URL.");
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) {
    throw new Error("Please enter a valid public website URL.");
  }
  url.hash = "";
  return url.toString();
}

function textOf($, selector) {
  return ($(selector).first().attr("content") || $(selector).first().text() || "").trim();
}

function absoluteUrl(base, path) {
  try {
    return new URL(path, base).toString();
  } catch {
    return null;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function uniqueBy(values, keyFor) {
  const seen = new Set();
  return values.filter((value) => {
    const key = keyFor(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeEmail(value) {
  const match = String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.(?:com|org|net|edu|gov|mil|io|ai|co|us|uk|ca|au|de|fr|in|biz|info|me|dev|app|agency|digital|design|tech|store|shop)(?=$|[\s,;:!?()[\]<>]|location|address|phone|email|contact)/i)
    || String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}(?=$|[\s,;:!?()[\]<>])/i);
  return match ? match[0].toLowerCase() : "";
}

function normalizePhone(value) {
  const phone = String(value || "")
    .replace(/[^\d+().\-\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return "";
  if (/^(\d)\1+$/.test(digits)) return "";
  return phone;
}

function readablePhone(value) {
  const phone = normalizePhone(value);
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  return phone;
}

export function normalizeObfuscatedContacts(text) {
  return String(text || "")
    .replace(/\b([A-Z0-9._%+-]+)\s+at\s+([A-Z0-9-]+)\s+dot\s+([A-Z]{2,})\b/gi, "$1@$2.$3")
    .replace(/\s*(?:\[at\]|\(at\))\s*/gi, "@")
    .replace(/\s*(?:\[dot\]|\(dot\))\s*/gi, ".")
    .replace(/\s+@\s+/g, "@")
    .replace(/\s+\.\s+/g, ".");
}

export function decodeHtmlText(value) {
  return cheerio.load(`<body>${String(value || "")}</body>`)("body").text().replace(/\s+/g, " ").trim();
}

function addRecommendation(items, rec) {
  items.push({
    difficulty: "Easy",
    estimatedTime: "Under 30 minutes",
    expectedGain: 2,
    priority: 50,
    ...rec,
  });
}

function timeoutAfter(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

export function networkFailurePhase(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  if (["ENOTFOUND", "EAI_AGAIN"].includes(code) || message.includes("getaddrinfo") || message.includes("dns")) return "dns";
  if (code.includes("CERT") || code.includes("TLS") || message.includes("certificate") || message.includes("ssl") || message.includes("tls")) return "tls";
  if (["ECONNREFUSED", "ENETUNREACH", "EHOSTUNREACH"].includes(code) || message.includes("connect")) return "connection";
  if (["ECONNABORTED", "ETIMEDOUT", "ECONNRESET"].includes(code) || message.includes("timeout") || message.includes("timed out")) return "response";
  return "request";
}

export function isTransientFailure(errorOrStatus) {
  if (Number.isFinite(Number(errorOrStatus))) return TRANSIENT_HTTP_STATUSES.has(Number(errorOrStatus));
  return TRANSIENT_NETWORK_CODES.has(String(errorOrStatus?.code || "").toUpperCase());
}

function retryDelay(attempt, retryAfter = "") {
  const seconds = Number.parseFloat(retryAfter);
  if (Number.isFinite(seconds)) return Math.min(2000, Math.max(250, seconds * 1000));
  return [350, 900, 1600][attempt] || 1600;
}

async function fetchText(url, options = {}, redirectDepth = 0) {
  await assertPublicUrl(url);
  const { headers = {}, retries = 1, browserFallback = false, deadline = null, ...requestOptions } = options;
  const attempts = [];
  let response;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (deadline && Date.now() >= deadline - 1000) {
      const error = new Error("The scan time budget was exhausted before the website responded.");
      error.code = "SCAN_DEADLINE";
      error.attempts = attempts;
      throw error;
    }
    const startedAt = Date.now();
    const attemptHeaders = browserFallback && attempt > 0 ? { ...BROWSER_HEADERS, ...headers } : { ...DEFAULT_HEADERS, ...headers };
    const timeout = deadline ? Math.max(1000, Math.min(REQUEST_TIMEOUT, deadline - Date.now() - 1000)) : REQUEST_TIMEOUT;
    try {
      response = await axios.get(url, {
        timeout,
        maxRedirects: 0,
        validateStatus: () => true,
        responseType: "text",
        headers: attemptHeaders,
        ...requestOptions,
      });
      attempts.push({ attempt: attempt + 1, transport: "axios", status: response.status, durationMs: Date.now() - startedAt, userAgent: browserFallback && attempt > 0 ? "browser" : "scanner" });
      if (!isTransientFailure(response.status) || attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt, response.headers?.["retry-after"])));
    } catch (error) {
      lastError = error;
      attempts.push({ attempt: attempt + 1, transport: "axios", code: error.code || "UNKNOWN", phase: networkFailurePhase(error), durationMs: Date.now() - startedAt, userAgent: browserFallback && attempt > 0 ? "browser" : "scanner" });
      if (!isTransientFailure(error) || attempt >= retries) {
        error.attempts = attempts;
        error.failurePhase = networkFailurePhase(error);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
    }
  }
  if (!response && lastError) throw lastError;
  response.scanAttempts = attempts;
  if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.location) {
    if (redirectDepth >= MAX_REDIRECTS) throw new Error("Too many redirects while scanning this website.");
    const nextUrl = new URL(response.headers.location, url).toString();
    const redirected = await fetchText(nextUrl, options, redirectDepth + 1);
    redirected.scanAttempts = [...attempts, ...(redirected.scanAttempts || [])];
    return redirected;
  }
  response.finalUrl = response.config.url;
  return response;
}

async function fetchWithNativeTransport(url, deadline, redirectDepth = 0, attempts = []) {
  await assertPublicUrl(url);
  if (deadline && Date.now() >= deadline - 1500) {
    const error = new Error("Scan deadline reached before native Fetch fallback.");
    error.code = "SCAN_DEADLINE";
    error.attempts = attempts;
    throw error;
  }
  const timeout = deadline ? Math.max(1000, Math.min(22000, deadline - Date.now() - 1000)) : 22000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal, headers: BROWSER_HEADERS });
    attempts.push({ attempt: attempts.length + 1, transport: "native-fetch", status: response.status, durationMs: Date.now() - startedAt, userAgent: "browser" });
    if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.get("location")) {
      if (redirectDepth >= MAX_REDIRECTS) throw new Error("Too many redirects while scanning this website.");
      const target = new URL(response.headers.get("location"), url).toString();
      return fetchWithNativeTransport(target, deadline, redirectDepth + 1, attempts);
    }
    const data = await response.text();
    return { status: response.status, data, finalUrl: url, headers: Object.fromEntries(response.headers.entries()), scanAttempts: attempts, config: { url } };
  } catch (error) {
    const normalized = error.name === "AbortError" ? Object.assign(new Error(`Native Fetch timed out after ${timeout}ms.`), { code: "ETIMEDOUT" }) : error;
    attempts.push({ attempt: attempts.length + 1, transport: "native-fetch", code: normalized.code || normalized.name || "UNKNOWN", phase: networkFailurePhase(normalized), durationMs: Date.now() - startedAt, userAgent: "browser" });
    normalized.attempts = attempts;
    normalized.failurePhase = networkFailurePhase(normalized);
    throw normalized;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithBrowserTransport(url, deadline, attempts = []) {
  await assertPublicUrl(url);
  let browser;
  const startedAt = Date.now();
  try {
    if (deadline && Date.now() >= deadline - 4000) throw Object.assign(new Error("Scan deadline reached before browser fallback."), { code: "SCAN_DEADLINE" });
    browser = await launchBrowser({ args: ["--disable-gpu"] });
    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_USER_AGENT);
    await page.setExtraHTTPHeaders(BROWSER_HEADERS);
    const timeout = deadline ? Math.max(2000, Math.min(25000, deadline - Date.now() - 1500)) : 25000;
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout });
    await page.waitForNetworkIdle({ idleTime: 350, timeout: 1500 }).catch(() => {});
    const data = await page.content();
    const finalUrl = page.url();
    await assertPublicUrl(finalUrl);
    attempts.push({ attempt: attempts.length + 1, transport: "browser", status: response?.status() || 200, durationMs: Date.now() - startedAt, userAgent: "browser" });
    return { status: response?.status() || 200, data, finalUrl, headers: response?.headers() || {}, scanAttempts: attempts, config: { url: finalUrl }, browserRenderedFallback: true };
  } catch (error) {
    attempts.push({ attempt: attempts.length + 1, transport: "browser", code: error.code || error.name || "UNKNOWN", phase: networkFailurePhase(error), durationMs: Date.now() - startedAt, userAgent: "browser" });
    error.attempts = attempts;
    error.failurePhase = networkFailurePhase(error);
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function fetchHomepage(url, deadline) {
  const allAttempts = [];
  let response;
  let lastError;
  try {
    response = await fetchText(url, { retries: 2, browserFallback: true, deadline });
    allAttempts.push(...(response.scanAttempts || []));
    if (![401, 403].includes(response.status) && !isTransientFailure(response.status)) return response;
  } catch (error) {
    lastError = error;
    allAttempts.push(...(error.attempts || []));
  }
  try {
    const nativeResponse = await fetchWithNativeTransport(url, deadline, 0, allAttempts);
    if (![401, 403].includes(nativeResponse.status) && !isTransientFailure(nativeResponse.status)) return nativeResponse;
    response = nativeResponse;
  } catch (error) {
    lastError = error;
  }
  try {
    return await fetchWithBrowserTransport(url, deadline, allAttempts);
  } catch (error) {
    lastError = error;
  }
  if (response) return response;
  lastError.attempts = allAttempts;
  throw lastError;
}

function blockedScanMessage(status) {
  return `This website blocked automated scanning (HTTP ${status}). This usually happens when Cloudflare, a firewall, bot protection, or hosting security blocks server-side crawlers.`;
}

function websiteUnavailableError(message, httpStatus = null) {
  const error = new Error(message);
  error.code = "WEBSITE_UNAVAILABLE";
  error.websiteFailure = true;
  error.httpStatus = httpStatus;
  error.score = 0;
  return error;
}

export function detectNonOperationalHomepage($, finalUrl, responseStatus) {
  const hostname = new URL(finalUrl).hostname.toLowerCase().replace(/^www\./, "");
  const title = $("title").first().text().replace(/\s+/g, " ").trim();
  const h1 = $("h1").first().text().replace(/\s+/g, " ").trim();
  const body = $("body").text().replace(/\s+/g, " ").trim();
  const evidence = `${title} ${h1} ${body.slice(0, 3000)}`;
  if (["example.com", "example.org", "example.net"].includes(hostname) || /this domain is for use in illustrative examples/i.test(evidence)) {
    return "This is a reserved example domain, not an operational business website.";
  }
  if (/domain (?:name )?(?:has )?expired|this domain has expired|renew (?:this|your) domain|domain renewal required|registration has expired/i.test(evidence)) {
    return "The domain appears to be expired or awaiting renewal.";
  }
  if (/domain (?:is )?for sale|buy this domain|make an offer for this domain|sedo domain parking|afternic|hugedomains|domain parking|parked (?:domain|page)|this web page is parked/i.test(evidence)) {
    return "The domain appears to be parked or listed for sale.";
  }
  if (/account suspended|website suspended|hosting account (?:has been )?suspended|default web site page|site is currently unavailable/i.test(evidence)) {
    return "The website appears to be suspended or not configured on its hosting server.";
  }
  if (/page not found|404 not found|the requested page could not be found|this page doesn.?t exist/i.test(`${title} ${h1} ${body.slice(0, 800)}`)) {
    return "The homepage is returning a soft-404 or page-not-found response.";
  }
  return "";
}

export function detectIncompleteJavascriptShell($) {
  const body = $("body").text().replace(/\s+/g, " ").trim();
  const visibleWords = body.split(/\s+/).filter(Boolean).length;
  const hasAppMount = $("#root, #app, #__next, [data-reactroot]").length > 0;
  const hasScripts = $("script[src], script[type='module']").length > 0;
  const hasJavascriptFallbackText = /you need to enable javascript to run this app|please enable javascript to (?:continue|view|use)|javascript is required to (?:view|use|run)/i.test(body);
  const explicitJavascriptFallback = hasJavascriptFallbackText && visibleWords < 40;
  const emptyApplicationShell = visibleWords < 12 && hasAppMount && hasScripts && !$("main, article, h1").length;
  if (explicitJavascriptFallback || emptyApplicationShell) {
    return {
      incomplete: true,
      reason: explicitJavascriptFallback
        ? `The server returned only a JavaScript-required placeholder (${visibleWords} visible words).`
        : `The server returned an empty application shell (${visibleWords} visible words).`,
    };
  }
  return { incomplete: false, reason: "" };
}

function analyzeMetadata($) {
  const title = ($("title").first().text() || "").trim();
  const description = textOf($, 'meta[name="description"]');
  const canonical = $('link[rel="canonical"]').first().attr("href") || "";
  const viewport = textOf($, 'meta[name="viewport"]');
  const charset = $("meta[charset]").first().attr("charset") || "";
  const language = $("html").attr("lang") || "";
  const robots = textOf($, 'meta[name="robots"]');
  const openGraph = $('meta[property^="og:"]').length;
  const twitter = $('meta[name^="twitter:"]').length;

  const checks = [
    Boolean(title && title.length <= 70),
    Boolean(description && description.length <= 180),
    Boolean(canonical),
    Boolean(viewport),
    Boolean(charset),
    Boolean(language),
    openGraph >= 3,
    twitter >= 2,
  ];

  return {
    score: clampScore((checks.filter(Boolean).length / checks.length) * 100),
    title,
    description,
    canonical,
    viewport: Boolean(viewport),
    charset: charset || "Not declared",
    language: language || "Not declared",
    robots: robots || "Not declared",
    openGraphTags: openGraph,
    twitterCardTags: twitter,
  };
}

function collectSchemaTypes(value, found = []) {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaTypes(item, found));
    return found;
  }
  if (value["@type"]) {
    const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
    found.push(...types);
  }
  Object.values(value).forEach((child) => collectSchemaTypes(child, found));
  return found;
}

function collectSchemaNodes(value, found = []) {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaNodes(item, found));
    return found;
  }
  if (value["@type"]) found.push(value);
  Object.values(value).forEach((child) => collectSchemaNodes(child, found));
  return found;
}

function schemaTypesFor(node) {
  if (!node?.["@type"]) return [];
  return Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
}

function schemaTextValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(schemaTextValue).find(Boolean) || "";
  if (typeof value === "object") return schemaTextValue(value.name) || schemaTextValue(value.email) || schemaTextValue(value.url);
  return "";
}

function collectJsonLdNodes($) {
  const blocks = [];
  $('script[type="application/ld+json"]').each((_, node) => {
    try {
      blocks.push(JSON.parse($(node).contents().text()));
    } catch {}
  });
  return collectSchemaNodes(blocks);
}

function analyzeSchema($) {
  const invalid = [];
  const jsonTypes = [];
  $('script[type="application/ld+json"]').each((_, node) => {
    const raw = $(node).contents().text();
    try {
      jsonTypes.push(...collectSchemaTypes(JSON.parse(raw)));
    } catch (error) {
      invalid.push(error.message);
    }
  });

  const microdataTypes = $('[itemtype*="schema.org"]').map((_, el) => ($(el).attr("itemtype") || "").split("/").pop()).get();
  const found = unique([...jsonTypes, ...microdataTypes]);
  const present = SCHEMA_TYPES.filter((type) => found.includes(type));
  const normalizedPresent = present.map((type) => (type === "FAQPage" ? "FAQ" : type === "BreadcrumbList" ? "Breadcrumb" : type === "VideoObject" ? "Video" : type));
  const important = ["Organization", "LocalBusiness", "Person", "Article", "FAQPage", "Product", "Service", "BreadcrumbList"];
  const score = found.length ? clampScore(((important.filter((type) => found.includes(type)).length / important.length) * 80) + (invalid.length ? 0 : 20)) : 0;

  return {
    score,
    jsonLdBlocks: $('script[type="application/ld+json"]').length,
    present: normalizedPresent,
    missing: SCHEMA_TYPES.map((type) => (type === "FAQPage" ? "FAQ" : type === "BreadcrumbList" ? "Breadcrumb" : type === "VideoObject" ? "Video" : type)).filter((type) => !normalizedPresent.includes(type)),
    invalid,
  };
}

function analyzeHeadings($) {
  const headings = $("h1,h2,h3,h4,h5,h6").map((_, el) => ({ level: Number(el.tagName.slice(1)), text: $(el).text().trim() })).get();
  const h1 = headings.filter((h) => h.level === 1);
  const skipped = [];
  headings.reduce((prev, current) => {
    if (prev && current.level > prev + 1) skipped.push(`H${prev} to H${current.level}`);
    return current.level;
  }, null);
  const checks = [h1.length === 1, headings.some((h) => h.level === 2), skipped.length === 0, headings.length >= 4];
  return {
    score: clampScore((checks.filter(Boolean).length / checks.length) * 100),
    h1Count: h1.length,
    h2Count: headings.filter((h) => h.level === 2).length,
    h3Count: headings.filter((h) => h.level === 3).length,
    skipped,
    outline: headings.slice(0, 20),
  };
}

function analyzeImages($) {
  const images = $("img").map((_, el) => ({
    src: $(el).attr("src") || "",
    alt: $(el).attr("alt"),
    loading: $(el).attr("loading") || "",
    width: $(el).attr("width"),
    height: $(el).attr("height"),
  })).get();
  const missingAlt = images.filter((img) => !img.alt || !img.alt.trim()).length;
  const lazy = images.filter((img) => img.loading === "lazy").length;
  const dimensions = images.filter((img) => img.width && img.height).length;
  const modern = images.filter((img) => /\.(webp|avif)(\?|$)/i.test(img.src)).length;
  const total = Math.max(images.length, 1);
  const score = images.length ? clampScore((((total - missingAlt) / total) * 45) + ((lazy / total) * 20) + ((dimensions / total) * 20) + ((modern / total) * 15)) : 70;
  return { score, total: images.length, missingAlt, lazyLoaded: lazy, withDimensions: dimensions, modernFormats: modern };
}

function analyzeLinks($, baseUrl) {
  const base = new URL(baseUrl);
  const links = $("a[href]").map((_, el) => {
    const href = $(el).attr("href");
    const url = absoluteUrl(baseUrl, href);
    if (!url || !/^https?:/i.test(url)) return null;
    return { url, text: $(el).text().replace(/\s+/g, " ").trim() };
  }).get().filter(Boolean);
  const internal = links.filter((link) => new URL(link.url).hostname === base.hostname);
  const external = links.filter((link) => new URL(link.url).hostname !== base.hostname);
  const descriptive = links.filter((link) => link.text && !/^(click here|read more|learn more|here)$/i.test(link.text)).length;
  const nav = $("nav a, header a").length;
  const score = clampScore((internal.length ? 35 : 0) + (external.length ? 15 : 0) + (nav ? 20 : 0) + ((descriptive / Math.max(links.length, 1)) * 30));
  return { score, total: links.length, internal: internal.length, external: external.length, navigationLinks: nav, descriptiveAnchors: descriptive, sampleInternal: internal.slice(0, 25).map((link) => link.url) };
}

async function checkInternalLinks(links) {
  if (process.env.ENABLE_INTERNAL_LINK_CHECK !== "true") {
    return {
      ...links,
      checkedInternalLinks: 0,
      brokenInternal: 0,
      brokenSamples: [],
      skippedInternalLinkCheck: true,
    };
  }

  const targets = unique(links.sampleInternal || []).slice(0, 5);
  const results = await Promise.allSettled(targets.map(async (url) => {
    try {
      await assertPublicUrl(url);
      const response = await axios.head(url, {
        timeout: 3000,
        maxRedirects: 0,
        validateStatus: () => true,
        headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      });
      if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.location) {
        const redirected = new URL(response.headers.location, url).toString();
        await assertPublicUrl(redirected);
      }
      return { url, status: response.status, ok: response.status < 400 };
    } catch (error) {
      return { url, status: null, ok: false, error: error.message };
    }
  }));

  const checked = results.map((result) => result.status === "fulfilled" ? result.value : result.reason);
  const broken = checked.filter((item) => !item.ok);
  const penalty = Math.min(25, broken.length * 5);
  return {
    ...links,
    checkedInternalLinks: checked.length,
    brokenInternal: broken.length,
    brokenSamples: broken.slice(0, 5),
    score: clampScore(links.score - penalty),
  };
}

function analyzeContent($) {
  const readable = cheerio.load($.html());
  readable("script,style,noscript,svg").remove();
  const bodyText = readable("body").text().replace(/\s+/g, " ").trim();
  const paragraphs = $("p").map((_, el) => $(el).text().replace(/\s+/g, " ").trim()).get().filter(Boolean);
  const sentences = bodyText.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length > 3);
  const words = bodyText.split(/\s+/).filter(Boolean);
  const avgSentence = words.length / Math.max(sentences.length, 1);
  const avgParagraph = words.length / Math.max(paragraphs.length, 1);
  const bullets = $("ul li, ol li").length;
  const tables = $("table").length;
  const faqSignals = $("details, [class*='faq' i], [id*='faq' i]").length || /frequently asked questions|faq/i.test(bodyText);
  const definitions = $("dt").length || /\b(is|means|refers to)\b/i.test(bodyText);
  const readability = clampScore(100 - Math.max(0, avgSentence - 18) * 4 - Math.max(0, avgParagraph - 120) * 0.5);
  const structure = clampScore((words.length >= 350 ? 25 : (words.length / 350) * 25) + (paragraphs.length ? 15 : 0) + (bullets ? 15 : 0) + (tables ? 10 : 0) + (faqSignals ? 20 : 0) + (definitions ? 15 : 0));
  return {
    score: clampScore((structure * 0.65) + (readability * 0.35)),
    readability,
    wordCount: words.length,
    paragraphCount: paragraphs.length,
    averageSentenceWords: Math.round(avgSentence),
    averageParagraphWords: Math.round(avgParagraph),
    bulletLists: bullets,
    tables,
    hasFAQ: Boolean(faqSignals),
    hasDefinitions: Boolean(definitions),
    text: bodyText,
  };
}

function analyzeEEAT($, url, text) {
  const linksText = $("a").map((_, el) => `${$(el).text()} ${$(el).attr("href") || ""}`.toLowerCase()).get().join(" ");
  const schemaNodes = collectJsonLdNodes($);
  const schemaText = JSON.stringify(schemaNodes);
  const visibleText = `${linksText} ${text}`;
  const pageText = `${visibleText} ${schemaText}`.toLowerCase();
  const hasAuthorSchema = schemaNodes.some((node) => schemaTypesFor(node).some((type) => ["Person", "Organization", "LocalBusiness"].includes(type)) && schemaTextValue(node.name));
  const visibleSignals = {
    aboutPage: /about/i.test(visibleText),
    contactPage: /contact/i.test(visibleText),
    privacy: /privacy/i.test(visibleText),
    terms: /terms|conditions/i.test(visibleText),
    author: /author|reviewed by|by\s+[a-z]/i.test(text) || $('[rel="author"], [class*="author" i]').length > 0,
    editorialPolicy: /editorial policy|review policy|fact[- ]checked/i.test(text),
    email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(visibleText),
  };
  const schemaSignals = {
    author: hasAuthorSchema,
    email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(schemaText),
    organization: schemaNodes.some((node) => schemaTypesFor(node).some((type) => ["Organization", "LocalBusiness"].includes(type))),
    contactPoint: /ContactPoint/i.test(schemaText),
  };
  const checks = {
    aboutPage: /about/.test(pageText),
    contactPage: /contact/.test(pageText),
    privacy: /privacy/.test(pageText),
    terms: /terms|conditions/.test(pageText),
    author: hasAuthorSchema || /author|reviewed by|by\s+[a-z]/i.test(text) || $('[rel="author"], [class*="author" i]').length > 0,
    editorialPolicy: /editorial policy|review policy|fact[- ]checked/i.test(text),
    address: /\d{1,6}\s+[A-Za-z0-9 .'-]+(?:street|st|road|rd|avenue|ave|suite|floor|blvd|lane|ln)/i.test(text),
    phone: /(?:\+?\d[\d\s().-]{7,}\d)/.test(text),
    email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(`${text} ${schemaText}`),
    socialProfiles: /(linkedin|twitter|x\.com|facebook|instagram|youtube)\.com/i.test($.html()),
    https: new URL(url).protocol === "https:",
  };
  const score = clampScore((Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100);
  return {
    score,
    checks,
    signals: {
      visible: visibleSignals,
      schema: schemaSignals,
      visibleCount: Object.values(visibleSignals).filter(Boolean).length,
      schemaCount: Object.values(schemaSignals).filter(Boolean).length,
    },
  };
}

function cleanEntityLabel(value, { maxWords = 8, maxLength = 70 } = {}) {
  const label = decodeHtmlText(String(value || "")).replace(/\s+/g, " ").trim().replace(/^[|:,\-–—]+|[|:,\-–—]+$/g, "");
  if (!label || label.length > maxLength || label.split(/\s+/).length > maxWords) return "";
  if (/^(services?|products?|expertise|solutions?|resources?|learn more|read more|view all)$/i.test(label)) return "";
  return label;
}

export function extractEntities($, metadata, text, sourceUrl = "", sourceName = "homepage") {
  const html = $.html();
  const schemaNodes = collectJsonLdNodes($);
  const schemaText = JSON.stringify(schemaNodes);
  const organizationNode = schemaNodes.find((node) => schemaTypesFor(node).some((type) => ["Organization", "LocalBusiness"].includes(type)));
  const serviceNodes = schemaNodes.filter((node) => schemaTypesFor(node).includes("Service"));
  const productNodes = schemaNodes.filter((node) => schemaTypesFor(node).some((type) => ["Product", "SoftwareApplication", "WebApplication"].includes(type)));
  const schemaCompanyName = schemaTextValue(organizationNode?.name);
  const logoName = cleanEntityLabel($("header img[alt], nav img[alt], img[src*='logo' i][alt]").map((_, el) => $(el).attr("alt")).get().find((value) => value && !/^logo$/i.test(value)), { maxWords: 6, maxLength: 60 });
  const companyName = metadata.title?.split(/[|-]/)[0]?.trim() || text.match(/(?:©|Copyright)\s+\d{4}\s+([^.\n]+)/i)?.[1]?.trim() || "";
  const schemaEmails = schemaNodes.map((node) => schemaTextValue(node.email));
  const linkHrefs = $("a[href]").map((_, el) => safeDecode($(el).attr("href") || "")).get();
  const directTextSegments = $("body *").contents().filter((_, node) => {
    if (node.type !== "text") return false;
    const parentHref = $(node.parent).attr("href") || "";
    return !/^mailto:/i.test(parentHref);
  }).map((_, node) => String(node.data || "").trim()).get().filter(Boolean);
  const plainTextEmails = directTextSegments.flatMap((segment) => segment.match(EMAIL_PATTERN) || []);
  const obfuscatedEmails = directTextSegments.flatMap((segment) => normalizeObfuscatedContacts(segment).match(EMAIL_PATTERN) || []);
  const mailtoEmails = linkHrefs.flatMap((href) => href.match(/^mailto:([^?]+)/i)?.[1]?.match(EMAIL_PATTERN) || []);
  const telPhones = linkHrefs.flatMap((href) => {
    const value = href.match(/^tel:([^?]+)/i)?.[1] || "";
    return value ? [value] : [];
  });
  const schemaPhones = schemaNodes.flatMap((node) => [schemaTextValue(node.telephone), schemaTextValue(node.phone)]);
  const emailSources = [
    ...plainTextEmails.map((value) => ({ type: "email", value: normalizeEmail(value), source: "visible text", sourceName, sourceUrl })),
    ...obfuscatedEmails.map((value) => ({ type: "email", value: normalizeEmail(value), source: "obfuscated text", sourceName, sourceUrl })),
    ...mailtoEmails.map((value) => ({ type: "email", value: normalizeEmail(value), source: "mailto link", sourceName, sourceUrl })),
    ...schemaEmails.map((value) => ({ type: "email", value: normalizeEmail(value), source: "schema", sourceName, sourceUrl })),
  ];
  const phoneSources = [
    ...(text.match(PHONE_PATTERN) || []).map((value) => ({ type: "phone", value: readablePhone(value), source: "visible text", sourceName, sourceUrl })),
    ...telPhones.map((value) => ({ type: "phone", value: readablePhone(value), source: "tel link", sourceName, sourceUrl })),
    ...schemaPhones.map((value) => ({ type: "phone", value: readablePhone(value), source: "schema", sourceName, sourceUrl })),
  ];
  const contactSources = uniqueBy([...emailSources, ...phoneSources].filter((item) => item.value), (item) => `${item.type}:${item.value}:${item.sourceUrl || item.sourceName}`);
  const emails = unique(contactSources.filter((item) => item.type === "email").map((item) => item.value));
  const phones = unique(contactSources.filter((item) => item.type === "phone").map((item) => item.value)).slice(0, 5);
  const schemaServices = serviceNodes.map((node) => cleanEntityLabel(schemaTextValue(node.name))).filter(Boolean);
  const linkedServices = $("a[href]").map((_, el) => {
    if (!/(?:^|\/)services?(?:\/|$|\?|#)/i.test($(el).attr("href") || "")) return "";
    const heading = $(el).find("h1,h2,h3,h4,h5,h6").first().text();
    return cleanEntityLabel(heading || $(el).text());
  }).get().filter(Boolean);
  const headedServices = $("h1,h2,h3").map((_, el) => cleanEntityLabel($(el).text())).get().filter((value) => value && /\b(?:service|consulting|strategy|branding|design|development|seo|marketing|software)\b/i.test(value));
  const services = unique([...schemaServices, ...linkedServices, ...headedServices]).slice(0, 10);
  const locations = unique((text.match(/\b[A-Z][a-z]+,\s+[A-Z]{2}\b/g) || []).slice(0, 8));
  const founders = unique((text.match(/founder(?:s)?(?:\s+and\s+CEO)?\s*(?:is|:)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/g) || []).slice(0, 5));
  const streetAddress = text.match(/\d{1,6}\s+[A-Za-z0-9 .'-]+\b(?:Street|St|Road|Rd|Avenue|Ave|Suite|Floor|Blvd|Lane|Ln)\b[^.\n]*/i)?.[0] || "";
  const poBoxAddress = text.match(/P\.?\s*O\.?\s+Box\s+\d+,\s*[A-Za-z .'-]+,\s*[A-Za-z .'-]+\s+\d{5}(?:-\d{4})?/i)?.[0] || "";
  const address = poBoxAddress || streetAddress;
  const detectedCompanyName = schemaCompanyName || logoName || companyName;
  const hasSchemaEntity = /Organization|LocalBusiness|Product|Service/i.test(schemaText);
  const score = clampScore((detectedCompanyName ? 20 : 0) + (emails.length ? 15 : 0) + (phones.length ? 15 : 0) + (address ? 15 : 0) + (services.length ? 20 : 0) + (hasSchemaEntity ? 15 : 0));
  const schemaProducts = productNodes.map((node) => cleanEntityLabel(schemaTextValue(node.name))).filter(Boolean);
  const linkedProducts = $("a[href]").map((_, el) => /(?:^|\/)products?(?:\/|$|\?|#)/i.test($(el).attr("href") || "") ? cleanEntityLabel($(el).text()) : "").get().filter(Boolean);
  const products = unique([...schemaProducts, ...linkedProducts]).slice(0, 10);
  return { score, companyName: detectedCompanyName, brand: metadata.title || detectedCompanyName, products, services, founders, phones, emails, contactSources, address, locations, hasSchemaEntity, htmlSignals: html.length };
}

function entityScore(entity, hasSchemaSignal = false) {
  return clampScore((entity.companyName ? 20 : 0) + (entity.emails?.length ? 15 : 0) + (entity.phones?.length ? 15 : 0) + (entity.address ? 15 : 0) + (entity.services?.length ? 20 : 0) + (hasSchemaSignal ? 15 : 0));
}

function mergeEntities(primary, extras = []) {
  const merged = extras.reduce((current, extra) => ({
    ...current,
    companyName: current.companyName || extra.companyName,
    brand: current.brand || extra.brand,
    address: current.address || extra.address,
    products: unique([...(current.products || []), ...(extra.products || [])]).slice(0, 10),
    services: unique([...(current.services || []), ...(extra.services || [])]).slice(0, 10),
    founders: unique([...(current.founders || []), ...(extra.founders || [])]).slice(0, 5),
    emails: unique([...(current.emails || []), ...(extra.emails || [])]).slice(0, 5),
    phones: unique([...(current.phones || []), ...(extra.phones || [])]).slice(0, 5),
    locations: unique([...(current.locations || []), ...(extra.locations || [])]).slice(0, 8),
    hasSchemaEntity: Boolean(current.hasSchemaEntity || extra.hasSchemaEntity),
    contactSources: uniqueBy([...(current.contactSources || []), ...(extra.contactSources || [])], (item) => `${item.type}:${item.value}:${item.sourceUrl || item.sourceName}`),
    htmlSignals: (current.htmlSignals || 0) + (extra.htmlSignals || 0),
    scannedContactPages: unique([...(current.scannedContactPages || []), ...(extra.scannedContactPages || [])]),
  }), primary);

  return {
    ...merged,
    companyName: decodeHtmlText(merged.companyName),
    brand: decodeHtmlText(merged.brand),
    score: Math.max(primary.score || 0, entityScore(merged, merged.hasSchemaEntity)),
  };
}

function findContactPageUrls($, baseUrl) {
  const base = new URL(baseUrl);
  const candidates = $("a[href]").map((_, el) => {
    const href = $(el).attr("href") || "";
    const url = absoluteUrl(baseUrl, href);
    if (!url || !/^https?:/i.test(url)) return null;
    const parsed = new URL(url);
    if (parsed.hostname !== base.hostname) return null;
    parsed.hash = "";
    const label = `${$(el).text()} ${parsed.pathname}`.replace(/\s+/g, " ").toLowerCase();
    if (!/(contact|get-in-touch|about|location|locations|office|offices|team)/i.test(label)) return null;
    const priority = /contact|get-in-touch/i.test(label) ? 0 : /location|office/i.test(label) ? 1 : 2;
    return { url: parsed.toString(), priority };
  }).get().filter(Boolean);

  return uniqueBy(candidates.sort((a, b) => a.priority - b.priority), (item) => item.url)
    .map((item) => item.url)
    .filter((url) => url !== baseUrl)
    .slice(0, CONTACT_PAGE_LIMIT);
}

async function extractContactPageEntities($, baseUrl) {
  const urls = findContactPageUrls($, baseUrl);
  if (!urls.length) return [];

  const results = await Promise.allSettled(urls.map(async (pageUrl) => {
    await assertPublicUrl(pageUrl);
    const response = await fetchText(pageUrl, { timeout: 5000 });
    if (response.status >= 400) return null;
    const page$ = cheerio.load(response.data || "");
    const metadata = analyzeMetadata(page$);
    const content = analyzeContent(page$);
    const entities = extractEntities(page$, metadata, content.text, response.finalUrl || pageUrl, "contact page");
    return { ...entities, scannedContactPages: [response.finalUrl || pageUrl] };
  }));

  return results
    .filter((result) => result.status === "fulfilled" && result.value)
    .map((result) => result.value);
}

async function analyzeRobots(baseUrl) {
  const robotsUrl = new URL("/robots.txt", baseUrl).toString();
  try {
    let response = await fetchText(robotsUrl, { retries: 0, headers: { "User-Agent": USER_AGENT, Accept: "text/plain,*/*" } });
    const scannerStatus = response.status;
    const scannerBlocked = [401, 403].includes(scannerStatus);
    if (scannerBlocked) {
      response = await fetchText(robotsUrl, { retries: 0, headers: { ...BROWSER_HEADERS, Accept: "text/plain,*/*" } });
    }
    if (response.status >= 400) throw new Error(`robots.txt returned HTTP ${response.status}`);
    const parser = robotsParser(robotsUrl, response.data);
    const bots = BOT_AGENTS.map((bot) => ({ bot, allowed: parser.isAllowed(baseUrl, bot) !== false }));
    const allowed = bots.filter((bot) => bot.allowed).length;
    return {
      score: clampScore((allowed / bots.length) * 100),
      exists: true,
      valid: true,
      url: robotsUrl,
      bots,
      blockedBots: bots.filter((bot) => !bot.allowed).map((bot) => bot.bot),
      raw: response.data.slice(0, 2500),
      scannerBlocked,
      scannerStatus,
      accessMethod: scannerBlocked ? "browser_fallback" : "scanner",
    };
  } catch (error) {
    return { score: 30, exists: false, valid: false, url: robotsUrl, bots: BOT_AGENTS.map((bot) => ({ bot, allowed: null })), blockedBots: [], error: error.message };
  }
}

async function analyzeSitemap(baseUrl, robotsRaw = "", deadline = null, sitemapDiscovery = null) {
  try {
    const discovered = await Promise.resolve(sitemapDiscovery || discoverSitemaps(baseUrl, robotsRaw, deadline));
    if (!discovered.documents.length) {
      if (discovered.declaredInRobots.length) {
        return {
          score: null,
          exists: null,
          validXml: null,
          status: "declared_unverified",
          url: discovered.declaredInRobots[0],
          urlCount: 0,
          documents: [],
          declaredInRobots: discovered.declaredInRobots,
          missingUrls: null,
          error: discovered.errors[0]?.error || "Sitemap was declared in robots.txt but could not be verified during this scan.",
        };
      }
      throw new Error(discovered.errors[0]?.error || "No valid sitemap document was found.");
    }
    const sitemapUrl = discovered.documents[0].url;
    const urls = discovered.urls;
    return {
      score: clampScore((urls.length ? 90 : 50) + (discovered.declaredInRobots.length ? 10 : 0)),
      exists: true,
      validXml: true,
      status: "verified",
      url: sitemapUrl,
      urlCount: urls.length,
      documents: discovered.documents,
      declaredInRobots: discovered.declaredInRobots,
      imagesSitemap: false,
      newsSitemap: false,
      videoSitemap: false,
      missingUrls: urls.length === 0,
    };
  } catch (error) {
    return { score: 0, exists: false, validXml: false, url: new URL("/sitemap.xml", baseUrl).toString(), urlCount: 0, imagesSitemap: false, newsSitemap: false, videoSitemap: false, missingUrls: true, error: error.message };
  }
}

function estimatePerformanceFromResponse(response, reason = "Lighthouse is disabled.") {
  const responseTimeMs = response.durationMs || 0;
  const htmlBytes = Buffer.byteLength(String(response.data || ""), "utf8");
  const transferBytes = Number(response.headers?.["content-length"] || htmlBytes);
  const compressed = Boolean(response.headers?.["content-encoding"]);
  const statusOk = response.status >= 200 && response.status < 400;

  const timingScore = responseTimeMs <= 800 ? 40 : responseTimeMs <= 1500 ? 30 : responseTimeMs <= 2500 ? 20 : 10;
  const sizeScore = htmlBytes <= 180000 ? 28 : htmlBytes <= 350000 ? 22 : htmlBytes <= 700000 ? 14 : 7;
  const transferScore = transferBytes <= 250000 ? 16 : transferBytes <= 600000 ? 11 : 6;
  const compressionScore = compressed || htmlBytes <= 120000 ? 10 : 5;
  const statusScore = statusOk ? 6 : 0;

  const score = clampScore(timingScore + sizeScore + transferScore + compressionScore + statusScore);
  return {
    score: null,
    performance: null,
    accessibility: null,
    seo: null,
    bestPractices: null,
    estimate: score,
    skipped: true,
    fallback: true,
    responseTimeMs,
    htmlBytes,
    transferBytes,
    error: `${reason} Lab performance and accessibility were not measured. HTTP timing is shown separately and does not affect the Lighthouse score.`,
  };
}

export function validateLighthouseResult(result) {
  const runtimeError = result?.lhr?.runtimeError;
  const categories = result?.lhr?.categories || {};
  const names = ["performance", "accessibility", "seo", "best-practices"];
  const values = names.map((name) => categories[name]?.score).filter(Number.isFinite);
  if (runtimeError) return { valid: false, reason: runtimeError.message || runtimeError.code || "Lighthouse reported a runtime error." };
  if (!Number.isFinite(categories.performance?.score)) return { valid: false, reason: "Lighthouse returned no performance score." };
  if (values.length && values.every((value) => value === 0)) return { valid: false, reason: "Lighthouse returned an incomplete all-zero report." };
  return { valid: true, reason: "" };
}

async function runLighthouse(url, initialResponse) {
  if (process.env.ENABLE_LIGHTHOUSE === "false") {
    return estimatePerformanceFromResponse(initialResponse, "Local Lighthouse is disabled.");
  }

  let browser;
  try {
    await assertPublicUrl(url);
    const { default: lighthouse } = await import("lighthouse");
    browser = await launchBrowser();
    const endpoint = new URL(browser.wsEndpoint());
    const result = await Promise.race([
      lighthouse(url, {
        port: Number(endpoint.port),
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "seo", "best-practices"],
      }),
      timeoutAfter(LIGHTHOUSE_TIMEOUT, "Lighthouse timed out. The rest of the report was still generated."),
    ]);
    const validation = validateLighthouseResult(result);
    if (!validation.valid) throw new Error(validation.reason);
    const categories = result.lhr.categories;
    const categoryScore = (name) => Number.isFinite(categories[name]?.score) ? clampScore(categories[name].score * 100) : null;
    const performanceScore = categoryScore("performance");
    if (!Number.isFinite(performanceScore)) throw new Error("Lighthouse returned no measurable performance category.");
    return {
      score: performanceScore,
      performance: performanceScore,
      accessibility: categoryScore("accessibility"),
      seo: categoryScore("seo"),
      bestPractices: categoryScore("best-practices"),
      source: "Lighthouse",
      strategy: "mobile",
      fallback: false,
      skipped: false,
      error: null,
    };
  } catch (error) {
    return estimatePerformanceFromResponse(initialResponse, `Local Lighthouse could not run on this server: ${error.message}.`);
  } finally {
    if (browser) await browser.close();
  }
}

async function captureHomepagePreview(url) {
  let browser;
  const attempts = [];
  try {
    await assertPublicUrl(url);
    browser = await launchBrowser({
      args: ["--disable-gpu", "--disable-web-security", "--hide-scrollbars"],
    });
    for (const timeout of [10000, 16000]) {
      const page = await browser.newPage();
      const startedAt = Date.now();
      try {
        await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
        await page.setUserAgent(BROWSER_USER_AGENT);
        await page.setExtraHTTPHeaders(BROWSER_HEADERS);
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout });
        await page.waitForNetworkIdle({ idleTime: 400, timeout: 1800 }).catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 350));
        const image = await page.screenshot({ type: "jpeg", quality: 72, fullPage: false, encoding: "base64" });
        const title = await page.title().catch(() => "");
        attempts.push({ status: "success", httpStatus: response?.status() || null, durationMs: Date.now() - startedAt });
        return { image: `data:image/jpeg;base64,${image}`, title, width: 1280, height: 820, capturedAt: new Date().toISOString(), status: "captured", error: null, fallback: false, attempts };
      } catch (error) {
        attempts.push({ status: "failed", error: error.message, durationMs: Date.now() - startedAt });
      } finally {
        await page.close().catch(() => {});
      }
    }
    throw new Error(attempts.at(-1)?.error || "Preview capture failed after two attempts.");
  } catch (error) {
    return {
      image: "",
      title: "",
      width: 1280,
      height: 820,
      capturedAt: null,
      status: "unavailable",
      error: error.message,
      fallback: false,
      attempts,
    };
  } finally {
    if (browser) await browser.close();
  }
}

export function calculatePlatformReadiness(siteAudit) {
  const category = (key) => siteAudit.categoryScores?.[key]?.measured ? siteAudit.categoryScores[key].score : null;
  const schemaScores = siteAudit.pages.map((page) => page.schema?.score).filter(Number.isFinite);
  const structuredData = schemaScores.length ? clampScore(schemaScores.reduce((sum, value) => sum + value, 0) / schemaScores.length) : null;
  const values = {
    crawlability: category("crawlability"),
    contentReadiness: category("contentReadiness"),
    structuredData,
    entityConfidence: category("entityConfidence"),
    trustEvidence: siteAudit.contentAnalysis?.trustEvidenceScore ?? null,
    metadataQuality: siteAudit.metadataAnalysis?.score ?? null,
  };
  const weights = {
    ChatGPT: { crawlability: 15, contentReadiness: 25, structuredData: 15, entityConfidence: 20, trustEvidence: 15, metadataQuality: 10 },
    Claude: { crawlability: 15, contentReadiness: 30, structuredData: 10, entityConfidence: 15, trustEvidence: 20, metadataQuality: 10 },
    Gemini: { crawlability: 20, contentReadiness: 15, structuredData: 20, entityConfidence: 15, trustEvidence: 10, metadataQuality: 20 },
    Perplexity: { crawlability: 20, contentReadiness: 20, structuredData: 15, entityConfidence: 15, trustEvidence: 20, metadataQuality: 10 },
    "Google AI Overview": { crawlability: 20, contentReadiness: 20, structuredData: 20, entityConfidence: 10, trustEvidence: 15, metadataQuality: 15 },
    "Microsoft Copilot": { crawlability: 20, contentReadiness: 20, structuredData: 15, entityConfidence: 15, trustEvidence: 15, metadataQuality: 15 },
  };
  const crawlerNames = { ChatGPT: "OAI-SearchBot / GPTBot", Claude: "Claude-SearchBot / ClaudeBot", Gemini: "Googlebot / Google-Extended", Perplexity: "PerplexityBot", "Google AI Overview": "Googlebot / Google-Extended", "Microsoft Copilot": "Bingbot" };
  const entity = siteAudit.entityAnalysis || {};
  const brandVisible = Boolean(entity.brandNameConsistency?.primaryName);
  const brandInMetadata = siteAudit.pages.some((page) => page.schema?.entitySignals?.brandNames?.some((item) => item.source === "open graph"));
  const organizationSchema = siteAudit.pages.some((page) => page.schema?.types?.some((type) => ["Organization", "LocalBusiness"].includes(type)));
  const stableOrganizationId = Boolean(entity.entityIdentity?.organizationIds?.length);
  const externalProfiles = Boolean(entity.entityIdentity?.externalProfiles?.length);
  return Object.entries(weights).map(([platform, platformWeights]) => {
    const measured = Object.entries(platformWeights).filter(([key]) => Number.isFinite(values[key]));
    const measuredWeight = measured.reduce((sum, [, weight]) => sum + weight, 0);
    const readinessIndex = measuredWeight ? clampScore(measured.reduce((sum, [key, weight]) => sum + values[key] * weight, 0) / measuredWeight) : null;
    const tier = readinessIndex == null ? "Not Measured" : readinessIndex >= 80 ? "Strong" : readinessIndex >= 65 ? "Moderate" : readinessIndex >= 45 ? "Needs Work" : "Weak";
    const breakdown = Object.entries(platformWeights).map(([key, weight]) => ({ key, label: key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()), score: values[key], weight, measured: Number.isFinite(values[key]) }));
    const signals = [
      { label: "Brand mentioned in visible content", status: brandVisible ? "pass" : "fail", evidence: entity.brandNameConsistency?.primaryName || "Not detected" },
      { label: "Brand found in metadata", status: brandInMetadata ? "pass" : "warning", evidence: brandInMetadata ? "Open Graph or application metadata" : "Not detected in trusted metadata" },
      { label: "Organization schema present", status: organizationSchema ? "pass" : "fail", evidence: organizationSchema ? "Organization or LocalBusiness detected" : "Missing" },
      { label: "Stable organization @id", status: stableOrganizationId ? "pass" : "warning", evidence: stableOrganizationId ? entity.entityIdentity.organizationIds[0] : "Missing" },
      { label: "External identity profiles", status: externalProfiles ? "pass" : "warning", evidence: externalProfiles ? `${entity.entityIdentity.externalProfiles.length} profiles connected` : "No authoritative sameAs profiles" },
    ];
    return {
      platform,
      score: readinessIndex,
      readinessIndex,
      tier,
      status: tier,
      label: `${platform} Technical Readiness`,
      confidence: siteAudit.confidence?.level || "low",
      crawler: crawlerNames[platform],
      breakdown,
      signals,
      measuredSignals: measured.length,
      totalSignals: Object.keys(platformWeights).length,
      disclaimer: "Proprietary technical-readiness assessment. Not an official platform rating, ranking, citation probability, or visibility measurement.",
      strengths: signals.filter((item) => item.status === "pass").map((item) => `${item.label}: ${item.evidence}`),
      weaknesses: signals.filter((item) => item.status !== "pass").map((item) => `${item.label}: ${item.evidence}`),
      suggestions: signals.filter((item) => item.status !== "pass").map((item) => `Resolve: ${item.label}`),
    };
  });
}

function buildRecommendations({ metadata, schema, headings, images, links, content, eeat, robots, sitemap, performance, entities }) {
  const items = [];
  if (!schema.present.includes("Organization") && !schema.present.includes("LocalBusiness")) addRecommendation(items, {
    title: "Missing Organization Schema",
    description: "Add JSON-LD that clearly identifies the business, logo, URL, contact points and sameAs profiles.",
    currentStatus: "Not found",
    whyAiCares: "AI systems use entity markup to disambiguate businesses and cite the right brand.",
    howToFix: "Add Organization or LocalBusiness JSON-LD to the homepage.",
    expectedGain: 8,
    priority: 95,
  });
  if (!metadata.description) addRecommendation(items, {
    title: "Missing Meta Description",
    description: "The page has no concise summary for crawlers and AI snippets.",
    currentStatus: "Not found",
    whyAiCares: "Short summaries help AI systems understand the page purpose quickly.",
    howToFix: "Write a specific 140-160 character meta description.",
    expectedGain: 3,
    priority: 76,
  });
  if (headings.h1Count !== 1) addRecommendation(items, {
    title: headings.h1Count ? "Multiple H1 Tags" : "Missing H1",
    description: "The main page topic is not represented by exactly one H1.",
    currentStatus: `${headings.h1Count} H1 tags found`,
    whyAiCares: "Clear heading hierarchy improves page segmentation for LLM retrieval.",
    howToFix: "Use one descriptive H1 and nest supporting sections under H2/H3 headings.",
    expectedGain: 4,
    priority: 82,
  });
  if (!content.hasFAQ) addRecommendation(items, {
    title: "Add FAQ Content",
    description: "No strong FAQ section or details elements were detected.",
    currentStatus: "Not found",
    whyAiCares: "Question-answer blocks map well to AI search and conversational answers.",
    howToFix: "Add 5-8 real customer questions and mark them with FAQPage schema.",
    expectedGain: 6,
    priority: 70,
  });
  if (images.missingAlt) addRecommendation(items, {
    title: "Improve Image ALT Text",
    description: `${images.missingAlt} images are missing ALT text.`,
    currentStatus: `${images.missingAlt} missing`,
    whyAiCares: "ALT text gives AI systems context for visual assets and product screenshots.",
    howToFix: "Write concise, descriptive ALT text for meaningful images.",
    expectedGain: 3,
    priority: 64,
  });
  if (!eeat.checks.aboutPage || !eeat.checks.contactPage) addRecommendation(items, {
    title: "Strengthen Trust Pages",
    description: "About and contact signals are incomplete.",
    currentStatus: `About: ${eeat.checks.aboutPage ? "found" : "missing"}, Contact: ${eeat.checks.contactPage ? "found" : "missing"}`,
    whyAiCares: "AI answer engines need trust, ownership and accountability signals before recommending a site.",
    howToFix: "Add visible About, Contact, Privacy and Terms pages with real business details.",
    difficulty: "Medium",
    estimatedTime: "1-2 hours",
    expectedGain: 7,
    priority: 88,
  });
  if (!robots.exists || robots.blockedBots.length) addRecommendation(items, {
    title: "Review AI Crawler Access",
    description: "robots.txt is missing or blocks important AI/search crawlers.",
    currentStatus: robots.exists ? `Blocked: ${robots.blockedBots.join(", ")}` : "robots.txt not found",
    whyAiCares: "Crawler permissions decide whether AI systems can discover and reference the site.",
    howToFix: "Publish a valid robots.txt and allow desired AI crawlers explicitly.",
    difficulty: "Medium",
    expectedGain: 6,
    priority: 90,
  });
  if (sitemap.exists === false) addRecommendation(items, {
    title: "Publish XML Sitemap",
    description: "No sitemap declaration or valid sitemap was found.",
    currentStatus: "Not found",
    whyAiCares: "Sitemaps help crawlers discover important pages beyond the homepage.",
    howToFix: "Generate and submit an XML sitemap with canonical URLs.",
    expectedGain: 4,
    priority: 62,
  });
  if (Number.isFinite(performance.performance) && performance.performance < 50) addRecommendation(items, {
    title: "Improve Page Performance",
    description: "Lighthouse performance is low or could not complete.",
    currentStatus: `${performance.performance}/100`,
    whyAiCares: "Fast, accessible pages are easier to crawl and render reliably.",
    howToFix: "Optimize images, reduce unused JavaScript and improve server response time.",
    difficulty: "Hard",
    estimatedTime: "Half day",
    expectedGain: 5,
    priority: 58,
  });
  if (links.brokenInternal) addRecommendation(items, {
    title: "Fix Broken Internal Links",
    description: `${links.brokenInternal} checked internal links failed or returned an error.`,
    currentStatus: `${links.brokenInternal} broken out of ${links.checkedInternalLinks} checked`,
    whyAiCares: "Broken internal links interrupt crawler discovery and weaken the site graph AI systems use to understand context.",
    howToFix: "Update or remove failing links, and redirect old URLs to current canonical pages.",
    difficulty: "Medium",
    estimatedTime: "1-2 hours",
    expectedGain: 4,
    priority: 68,
  });
  if (!entities.companyName || !entities.emails.length) addRecommendation(items, {
    title: "Expose Business Entities",
    description: "Company and contact entities are incomplete in visible content.",
    currentStatus: "Entity signals incomplete",
    whyAiCares: "LLMs need explicit names, services and contact facts to recommend a business confidently.",
    howToFix: "Add company name, services, address, phone, email and sameAs profiles in content and schema.",
    difficulty: "Medium",
    expectedGain: 6,
    priority: 72,
  });
  return items.sort((a, b) => b.priority - a.priority);
}

function scoreAll(parts) {
  const scores = {
    metadata: parts.metadata.score,
    schema: parts.schema.score,
    performance: parts.performance.score,
    content: parts.content.score,
    eeat: parts.eeat.score,
    entities: parts.entities.score,
    robots: parts.robots.score,
    sitemap: parts.sitemap.score,
    links: parts.links.score,
    images: parts.images.score,
    readability: parts.content.readability,
  };
  return { scores, overall: weightedAverageScore(scores) };
}

export async function scanWebsite(inputUrl, options = {}) {
  const scanStartedAt = Date.now();
  const scanDeadline = scanStartedAt + SCAN_DEADLINE_MS;
  const url = normalizeUrl(inputUrl);
  try {
    await assertPublicUrl(url);
  } catch (error) {
    if (networkFailurePhase(error) === "dns") {
      throw websiteUnavailableError(`Website unavailable: the domain could not be resolved. It may be expired, temporarily unavailable, or incorrectly configured. Technical detail: ${error.message}`);
    }
    throw error;
  }
  let response;
  try {
    const startedAt = Date.now();
    response = await fetchHomepage(url, scanDeadline);
    response.durationMs = Date.now() - startedAt;
  } catch (error) {
    if (isTransientFailure(error) || error.code === "SCAN_DEADLINE") {
      const phase = error.failurePhase || networkFailurePhase(error);
      const attempts = error.attempts?.length || 1;
      throw new Error(
        `Scan incomplete: the initial homepage request did not complete after ${attempts} attempt${attempts === 1 ? "" : "s"}. Failure stage: ${phase}. The website may still work normally in a browser; server-to-server requests can be delayed by hosting, DNS, TLS, a firewall, rate limiting, or bot protection. Please retry shortly.`
      );
    }
    if (networkFailurePhase(error) === "dns") {
      throw websiteUnavailableError(`Website unavailable: the domain could not be resolved. It may be expired, incorrectly configured, or offline. Technical detail: ${error.message}`);
    }
    throw new Error(`We could not reach this website. Please check that the URL is correct, the site is online, and it can be opened publicly. Technical detail: ${error.message}`);
  }

  if ([401, 403].includes(response.status)) {
    throw websiteUnavailableError(`Website unavailable for scanning: HTTP ${response.status}. ${blockedScanMessage(response.status)}`, response.status);
  }

  if (isTransientFailure(response.status)) {
    const attempts = response.scanAttempts?.length || 1;
    throw new Error(`Scan incomplete: the website returned temporary HTTP ${response.status} after ${attempts} attempt${attempts === 1 ? "" : "s"}. This may be rate limiting, upstream hosting trouble, a CDN timeout, or bot protection. Please retry shortly.`);
  }

  if (response.status >= 400) {
    throw websiteUnavailableError(`Website unavailable: the homepage returned HTTP ${response.status}. No readiness score was calculated.`, response.status);
  }

  let finalUrl = response.finalUrl || url;
  await assertPublicUrl(finalUrl);
  let $ = cheerio.load(response.data || "");
  let javascriptShell = detectIncompleteJavascriptShell($);
  if (javascriptShell.incomplete && !response.browserRenderedFallback) {
    try {
      const renderedResponse = await fetchWithBrowserTransport(finalUrl, scanDeadline, response.scanAttempts || []);
      if (renderedResponse.status >= 400) {
        throw new Error(`The browser renderer returned HTTP ${renderedResponse.status}.`);
      }
      response = { ...renderedResponse, durationMs: response.durationMs };
      finalUrl = response.finalUrl || finalUrl;
      await assertPublicUrl(finalUrl);
      $ = cheerio.load(response.data || "");
      javascriptShell = detectIncompleteJavascriptShell($);
    } catch (error) {
      throw new Error(
        `Scan incomplete: this website sends automated crawlers an empty JavaScript application shell, and the browser-rendered page could not be captured. No readiness score was calculated. The website may work normally for visitors. Please retry later or enable a compatible browser runtime on the scanner host. Technical detail: ${error.message}`
      );
    }
  }
  if (javascriptShell.incomplete) {
    throw new Error(
      `Scan incomplete: ${javascriptShell.reason} The browser-rendered content was still unavailable, so no readiness score was calculated.`
    );
  }
  const nonOperationalReason = detectNonOperationalHomepage($, finalUrl, response.status);
  if (nonOperationalReason) {
    throw websiteUnavailableError(`Website unavailable or non-operational: ${nonOperationalReason} No readiness score was calculated.`, response.status);
  }
  const metadata = analyzeMetadata($);
  const schema = analyzeSchema($);
  const headings = analyzeHeadings($);
  const images = analyzeImages($);
  const links = await checkInternalLinks(analyzeLinks($, finalUrl));
  const content = analyzeContent($);
  const eeat = analyzeEEAT($, finalUrl, content.text);
  const homepageEntities = extractEntities($, metadata, content.text, finalUrl, "homepage");
  const robotsPromise = analyzeRobots(finalUrl);
  const sitemapDiscoveryPromise = robotsPromise.then((result) => discoverSitemaps(finalUrl, result.raw || "", scanDeadline));
  const performancePromise = runLighthouse(finalUrl, response);
  const siteAuditPromise = robotsPromise.then((robotsResult) => runSiteAudit(finalUrl, {
    profile: options.profile || "saas",
    robots: robotsResult,
    performance: performancePromise,
    homepageInternalUrls: links.sampleInternal || [],
    sitemapDiscovery: sitemapDiscoveryPromise,
    deadline: scanDeadline,
  }));
  const [robots, sitemap, performance, preview, contactPageEntities, siteAudit] = await Promise.all([
    robotsPromise,
    robotsPromise.then((result) => analyzeSitemap(finalUrl, result.raw || "", scanDeadline, sitemapDiscoveryPromise)),
    performancePromise,
    captureHomepagePreview(finalUrl),
    extractContactPageEntities($, finalUrl),
    siteAuditPromise,
  ]);
  const entities = mergeEntities(homepageEntities, contactPageEntities);
  const scored = scoreAll({ metadata, schema, performance, content, eeat, entities, robots, sitemap, links, images });
  const baseRecommendations = buildRecommendations({ metadata, schema, headings, images, links, content, eeat, robots, sitemap, performance, entities });
  const seenRecommendationKeys = new Set();
  const recommendations = baseRecommendations.map((item) => ({
    ...item,
    status: "fail",
    confidence: "high",
    affectedUrl: finalUrl,
    evidence: item.currentStatus,
    businessImpact: item.whyAiCares,
    beforeAfter: `Before: ${item.currentStatus}. After: ${item.howToFix}`,
    scoreEffect: Math.min(item.expectedGain || 0, Math.max(0, 100 - siteAudit.siteWideScore)),
  }));
  recommendations.forEach((item) => seenRecommendationKeys.add(`${item.title}|${item.affectedUrl}`));
  const entityChecks = [
    ["Entity Identity", siteAudit.entityAnalysis.entityIdentity, "Define one canonical organization identity with a stable @id, name, URL, logo, and authoritative external profiles."],
    ["Entity Connections", siteAudit.entityAnalysis.entityConnections, "Connect products, services, authors, and locations to the organization using resolved @id relationships."],
    ["Brand Name Consistency", siteAudit.entityAnalysis.brandNameConsistency, "Use one canonical brand spelling across schema, Open Graph, titles, headers, and footers."],
    ["NAP Consistency", siteAudit.entityAnalysis.napConsistency, "Use the same business name, address, and phone in visible content and LocalBusiness schema."],
  ];
  for (const [title, check, fix] of entityChecks) {
    if (!check || ["pass", "not_applicable"].includes(check.status)) continue;
    const evidence = title === "Brand Name Consistency"
      ? `Variants: ${(check.variants || []).map((item) => item.value).join(", ") || "No stable brand name detected"}`
      : title === "NAP Consistency"
        ? `Conflicting fields: ${(check.conflicts || []).map((item) => item.field).join(", ") || "Name, address, or phone is incomplete"}`
        : title === "Entity Connections"
          ? `${check.relationships?.length || 0} relationships; ${check.unresolvedRelationships?.length || 0} unresolved`
          : `Organization found on ${check.pagesWithOrganization || 0} of ${check.pagesChecked || 0} sampled pages`;
    recommendations.push({
      title,
      description: evidence,
      currentStatus: check.status,
      whyAiCares: "Consistent entity evidence helps search and AI systems disambiguate the business and connect it to its offerings and locations.",
      howToFix: fix,
      difficulty: "Medium",
      estimatedTime: "1-3 hours",
      expectedGain: 4,
      priority: check.status === "fail" ? 89 : 70,
      status: check.status,
      confidence: "high",
      affectedUrl: finalUrl,
      affectedElement: "Visible business details and JSON-LD entity graph",
      evidence,
      businessImpact: "Conflicts can weaken entity confidence, local relevance, and reliable attribution.",
      beforeAfter: `Before: ${evidence}. After: ${fix}`,
      scoreEffect: Math.min(4, Math.max(0, 100 - siteAudit.siteWideScore)),
    });
  }
  for (const finding of siteAudit.findings.filter((item) => ["fail", "warning", "unknown"].includes(item.status))) {
    const key = `${finding.check}|${finding.url}`;
    if (seenRecommendationKeys.has(key)) continue;
    seenRecommendationKeys.add(key);
    recommendations.push({
      title: finding.check,
      description: finding.evidence,
      currentStatus: finding.status,
      whyAiCares: finding.check === "JavaScript dependency" ? "Important content absent from raw HTML may be harder or slower for crawlers to retrieve." : "This signal affects discovery, indexing, interpretation, or citation readiness.",
      howToFix: finding.fix,
      difficulty: "Medium",
      estimatedTime: "1-2 hours",
      expectedGain: 2,
      priority: finding.status === "fail" ? 75 : 55,
      status: finding.status,
      confidence: finding.confidence,
      affectedUrl: finding.url,
      evidence: finding.evidence,
      affectedElement: finding.element,
      businessImpact: "May reduce reliable crawl, index, or interpretation coverage for this page.",
      beforeAfter: `Before: ${finding.evidence}. After: ${finding.fix}`,
      scoreEffect: Math.min(2, Math.max(0, 100 - siteAudit.siteWideScore)),
    });
  }
  recommendations.sort((a, b) => b.priority - a.priority);
  let remainingGain = Math.max(0, 100 - siteAudit.siteWideScore);
  for (const recommendation of recommendations) {
    const bounded = Math.min(recommendation.scoreEffect ?? recommendation.expectedGain ?? 0, remainingGain);
    recommendation.scoreEffect = bounded;
    recommendation.expectedGain = bounded;
    remainingGain -= bounded;
  }
  const platformScores = calculatePlatformReadiness(siteAudit);

  const checklist = {
    robots: robots.exists && robots.valid,
    sitemap: sitemap.exists == null ? null : sitemap.exists && sitemap.validXml,
    https: new URL(finalUrl).protocol === "https:",
    metadata: metadata.score >= 70,
    openGraph: metadata.openGraphTags >= 3,
    schema: schema.present.length > 0 && !schema.invalid.length,
    headingStructure: headings.score >= 70,
    images: images.score >= 70,
    accessibility: Number.isFinite(performance.accessibility) ? performance.accessibility >= 70 : null,
    internalLinking: links.internal > 0,
  };

  return {
    scannedUrl: url,
    finalUrl,
    redirected: url !== finalUrl,
    scannedAt: new Date().toISOString(),
    scanDurationMs: Date.now() - scanStartedAt,
    networkDiagnostics: { homepageAttempts: response.scanAttempts || [], initialResponseTimeMs: response.durationMs, deadlineMs: SCAN_DEADLINE_MS },
    overallScore: siteAudit.siteWideScore,
    siteWideScore: siteAudit.siteWideScore,
    grade: gradeFor(siteAudit.siteWideScore),
    scoreBreakdown: scored.scores,
    weights: SCORE_WEIGHTS,
    platformScores,
    profile: siteAudit.profile,
    categoryScores: siteAudit.categoryScores,
    siteAudit,
    scoringCalibration: { version: "2026.07-profile-v1", method: "Profile-weighted measured categories; unmeasured categories are excluded and scan confidence is reported separately.", profile: siteAudit.profile.value, benchmarkSuite: "tests/benchmarks/sites.json" },
    metadata,
    schema,
    headings,
    images,
    links,
    content: { ...content, text: undefined },
    eeat,
    entities,
    robots,
    sitemap,
    performance,
    preview,
    checklist,
    recommendations,
    quickWins: recommendations.filter((item) => item.difficulty === "Easy" && /under 30/i.test(item.estimatedTime)).slice(0, 6),
    contentOpportunities: ["About", "FAQ", "Pricing", "Contact", "Resources", "Case Studies", "Testimonials", "Glossary", "Documentation", "Blog", "Comparison Pages"].map((page) => ({
      page,
      suggested: !new RegExp(page.replace(" ", "|"), "i").test(content.text),
    })),
  };
}
