import axios from "axios";
import * as cheerio from "cheerio";
import { gunzipSync } from "node:zlib";
import { parseStringPromise } from "xml2js";
import robotsParser from "robots-parser";
import { assertPublicUrl } from "./security.js";
import { clampScore, profileAwareScore } from "./scoring.js";
import { launchBrowser } from "./browser.js";

const USER_AGENT = "ScanSiteAI/2.0 (+https://scansiteai.com)";
const BROWSER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";
const PAGE_LIMIT = 20;
const SITEMAP_LIMIT = 12;
const RENDER_LIMIT = 4;
const TIMEOUT = 10000;
const PAGE_FETCH_TIMEOUT = 25000;
const SITEMAP_TIMEOUT = 15000;
const PROFILE_VALUES = new Set(["local_business", "saas", "ecommerce", "publisher", "agency", "api"]);
const AI_BOTS = [
  { bot: "GPTBot", purpose: "training" },
  { bot: "OAI-SearchBot", purpose: "search" },
  { bot: "ChatGPT-User", purpose: "user initiated" },
  { bot: "ClaudeBot", purpose: "training and retrieval" },
  { bot: "Claude-SearchBot", purpose: "search" },
  { bot: "PerplexityBot", purpose: "search" },
  { bot: "Google-Extended", purpose: "AI model use" },
  { bot: "Googlebot", purpose: "search" },
  { bot: "Bingbot", purpose: "search" },
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function mapWithConcurrency(values, limit, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return results;
}

function absoluteUrl(value, base) {
  try {
    const url = new URL(value, base);
    url.hash = "";
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

async function get(url, options = {}, depth = 0) {
  await assertPublicUrl(url);
  if (options.deadline && Date.now() >= options.deadline - 750) {
    const error = new Error("Scan deadline reached before this request could run.");
    error.code = "SCAN_DEADLINE";
    throw error;
  }
  const timeoutCap = options.timeout || TIMEOUT;
  const timeout = options.deadline ? Math.max(750, Math.min(timeoutCap, options.deadline - Date.now() - 500)) : timeoutCap;
  const response = await axios.get(url, {
    timeout,
    maxRedirects: 0,
    responseType: options.responseType || "text",
    validateStatus: () => true,
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xml,text/xml,*/*", ...(options.headers || {}) },
  });
  if ([401, 403].includes(response.status) && options.browserFallback !== false && (options.headers?.["User-Agent"] || USER_AGENT) !== BROWSER_AGENT) {
    const fallback = await get(url, {
      ...options,
      browserFallback: false,
      headers: { ...(options.headers || {}), "User-Agent": BROWSER_AGENT },
    }, depth);
    fallback.initialStatus = response.status;
    fallback.usedBrowserFallback = true;
    return fallback;
  }
  if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.location && depth < 5) {
    const target = new URL(response.headers.location, url).toString();
    const redirected = await get(target, options, depth + 1);
    redirected.redirectChain = [url, ...(redirected.redirectChain || [])];
    return redirected;
  }
  response.finalUrl = response.config.url;
  response.redirectChain = response.redirectChain || [];
  return response;
}

function robotsSitemaps(raw, baseUrl) {
  return unique(String(raw || "").split(/\r?\n/)
    .map((line) => line.match(/^\s*sitemap\s*:\s*(.+)$/i)?.[1]?.trim())
    .filter(Boolean)
    .map((value) => absoluteUrl(value, baseUrl)));
}

async function analyzeDiscoveryFiles(baseUrl, existingRobots = null, deadline = null) {
  let robotsRaw = existingRobots?.raw || "";
  let robotsStatus = existingRobots?.exists ? 200 : null;
  if (!robotsRaw) {
    try {
      const response = await get(new URL("/robots.txt", baseUrl).toString(), { deadline });
      robotsStatus = response.status;
      if (response.status < 400) robotsRaw = String(response.data || "");
    } catch {}
  }
  const robotsUrl = new URL("/robots.txt", baseUrl).toString();
  const parser = robotsParser(robotsUrl, robotsRaw);
  const bots = AI_BOTS.map((item) => ({ ...item, allowed: robotsRaw ? parser.isAllowed(baseUrl, item.bot) !== false : null }));
  let llms;
  try {
    const response = await get(new URL("/llms.txt", baseUrl).toString(), { deadline });
    const body = String(response.data || "");
    llms = {
      optional: true,
      exists: response.status < 400 && body.trim().length > 0,
      status: response.status,
      valid: response.status < 400 && /^#\s+\S+/m.test(body),
      links: (body.match(/https?:\/\/[^\s)>]+/g) || []).slice(0, 30),
      note: "llms.txt is optional and is not a replacement for robots.txt, sitemaps, or indexable HTML.",
    };
  } catch (error) {
    llms = { optional: true, exists: false, valid: false, status: null, error: error.message, note: "llms.txt is optional." };
  }
  return {
    robots: {
      url: robotsUrl,
      status: robotsStatus,
      exists: Boolean(robotsRaw),
      bots,
      sitemaps: robotsSitemaps(robotsRaw, baseUrl),
      scannerBlocked: Boolean(existingRobots?.scannerBlocked),
      scannerStatus: existingRobots?.scannerStatus ?? null,
      usedBrowserFallback: Boolean(existingRobots?.scannerBlocked),
    },
    llms,
    robotsRaw,
  };
}

async function readSitemap(url, deadline = null) {
  const binary = /\.gz(?:\?|$)/i.test(url);
  const response = await get(url, { responseType: binary ? "arraybuffer" : "text", deadline, timeout: SITEMAP_TIMEOUT });
  if (response.status >= 400) throw new Error(`HTTP ${response.status}`);
  const xml = binary ? gunzipSync(Buffer.from(response.data)).toString("utf8") : String(response.data);
  const parsed = await parseStringPromise(xml, { trim: true });
  const childSitemaps = (parsed.sitemapindex?.sitemap || []).map((item) => item.loc?.[0]).filter(Boolean);
  const urls = (parsed.urlset?.url || []).map((item) => ({
    url: item.loc?.[0],
    lastmod: item.lastmod?.[0] || "",
  })).filter((item) => item.url);
  return { url, childSitemaps, urls, type: childSitemaps.length ? "index" : "urlset" };
}

export async function discoverSitemaps(baseUrl, robotsRaw = "", deadline = null) {
  const declaredInRobots = robotsSitemaps(robotsRaw, baseUrl);
  const candidates = unique([
    ...declaredInRobots,
    new URL("/sitemap.xml", baseUrl).toString(),
    new URL("/sitemap_index.xml", baseUrl).toString(),
    new URL("/sitemap.xml.gz", baseUrl).toString(),
  ]);
  const queue = [...candidates];
  const visited = new Set();
  const documents = [];
  const errors = [];
  const urls = [];
  while (queue.length && visited.size < SITEMAP_LIMIT) {
    if (deadline && Date.now() >= deadline - 1500) {
      errors.push({ url: queue[0] || baseUrl, error: "Scan deadline reached during sitemap discovery." });
      break;
    }
    const batch = [];
    while (queue.length && batch.length < 8 && visited.size + batch.length < SITEMAP_LIMIT) {
      const sitemapUrl = queue.shift();
      if (sitemapUrl && !visited.has(sitemapUrl) && !batch.includes(sitemapUrl)) batch.push(sitemapUrl);
    }
    batch.forEach((url) => visited.add(url));
    const results = await Promise.all(batch.map(async (sitemapUrl) => {
      try {
        return { sitemapUrl, document: await readSitemap(sitemapUrl, deadline) };
      } catch (error) {
        return { sitemapUrl, error };
      }
    }));
    for (const result of results) {
      if (result.error) {
        errors.push({ url: result.sitemapUrl, error: result.error.message });
        continue;
      }
      const { sitemapUrl, document } = result;
      documents.push({ url: sitemapUrl, type: document.type, urlCount: document.urls.length });
      urls.push(...document.urls);
      queue.push(...document.childSitemaps.map((item) => absoluteUrl(item, sitemapUrl)).filter(Boolean));
    }
  }
  const deduped = [...new Map(urls.map((item) => [item.url, item])).values()];
  return {
    documents,
    urls: deduped,
    errors,
    declaredInRobots,
    status: documents.length ? "verified" : declaredInRobots.length ? "declared_unverified" : "missing",
    truncated: queue.length > 0,
  };
}

function pageRole(url) {
  const path = new URL(url).pathname.toLowerCase();
  const rules = [
    ["contact", /contact|support|get-in-touch/], ["about", /about|company|team/], ["pricing", /pricing|plans/],
    ["faq", /faq|questions/], ["article", /blog|article|news|insights|resources/],
    ["product", /product|service|solution|features|shop/], ["category", /category|collections|locations?|city/],
  ];
  return rules.find(([, pattern]) => pattern.test(path))?.[0] || (path === "/" ? "homepage" : "other");
}

export function selectRepresentativeUrls(baseUrl, sitemapUrls = [], internalUrls = [], limit = PAGE_LIMIT) {
  const host = new URL(baseUrl).hostname;
  const candidates = unique([baseUrl, ...sitemapUrls, ...internalUrls])
    .map((value) => absoluteUrl(value, baseUrl))
    .filter((value) => value && new URL(value).hostname === host && !/\.(?:jpg|jpeg|png|gif|svg|webp|avif|pdf|zip|xml)(?:\?|$)/i.test(value));
  const roles = ["homepage", "about", "contact", "product", "article", "pricing", "faq", "category", "other"];
  const selected = [];
  for (const role of roles) {
    const matches = candidates.filter((url) => pageRole(url) === role);
    const allowance = ["product", "article", "category", "other"].includes(role) ? 4 : 1;
    selected.push(...matches.slice(0, allowance));
  }
  return unique(selected).slice(0, Math.max(10, Math.min(30, limit)));
}

function visibleText($) {
  const copy = cheerio.load($.html());
  copy("script,style,noscript,svg,template").remove();
  return copy("body").text().replace(/\s+/g, " ").trim();
}

function schemaNodes(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) value.forEach((item) => schemaNodes(item, output));
  else {
    if (value["@type"]) output.push(value);
    Object.values(value).forEach((item) => schemaNodes(item, output));
  }
  return output;
}

const SCHEMA_RULES = {
  Organization: { required: ["name", "url"], recommended: ["logo", "contactPoint", "sameAs"] },
  LocalBusiness: { required: ["name", "address"], recommended: ["telephone", "openingHoursSpecification", "geo"] },
  Product: { required: ["name"], recommended: ["image", "description", "offers", "brand"] },
  Service: { required: ["name", "provider"], recommended: ["description", "areaServed", "offers"] },
  Article: { required: ["headline", "author", "datePublished"], recommended: ["dateModified", "image", "publisher"] },
  FAQPage: { required: ["mainEntity"], recommended: [] },
  BreadcrumbList: { required: ["itemListElement"], recommended: [] },
  SoftwareApplication: { required: ["name", "operatingSystem", "applicationCategory"], recommended: ["offers", "aggregateRating"] },
};

function cleanEntityValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizedEntityValue(value) {
  return cleanEntityValue(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

function canonicalBrandValue(value) {
  return cleanEntityValue(value).replace(/\s+(?:official\s+)?logo$/i, "").trim();
}

function schemaValue(value) {
  if (typeof value === "string") return cleanEntityValue(value);
  if (Array.isArray(value)) return value.map(schemaValue).filter(Boolean).join(", ");
  if (!value || typeof value !== "object") return "";
  return cleanEntityValue([
    value.streetAddress,
    value.addressLocality,
    value.addressRegion,
    value.postalCode,
    value.addressCountry,
  ].filter(Boolean).join(", ")) || cleanEntityValue(value.name || value["@id"] || value.url);
}

function extractEntitySignals($, nodes, pageUrl, text) {
  const organizationTypes = new Set(["Organization", "LocalBusiness", "Corporation", "ProfessionalService", "Store", "MedicalBusiness"]);
  const organizationNodes = nodes.filter((node) => (Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]]).some((type) => organizationTypes.has(type)));
  const schemaNames = organizationNodes.map((node) => schemaValue(node.name)).filter(Boolean);
  const ogSiteName = cleanEntityValue($('meta[property="og:site_name"]').first().attr("content"));
  const applicationName = cleanEntityValue($('meta[name="application-name"]').first().attr("content"));
  const titleParts = $("title").first().text().split(/\s+[|–—-]\s+/);
  const titleCandidate = titleParts.length > 1 ? cleanEntityValue(titleParts.at(-1)) : "";
  const trustedBrandNames = [...schemaNames, ogSiteName, applicationName].filter(Boolean);
  const titleBrand = trustedBrandNames.length
    ? trustedBrandNames.find((value) => normalizedEntityValue(value) === normalizedEntityValue(titleCandidate)) || ""
    : titleCandidate;
  const footerCandidates = $("footer [class*='logo' i],footer [class*='brand' i],header [class*='logo' i],header [class*='brand' i]")
    .map((_, element) => cleanEntityValue($(element).text() || $(element).attr("alt")))
    .get().filter((value) => value && value.length <= 100);
  const brandNames = unique([...schemaNames, ogSiteName, applicationName, ...footerCandidates, titleBrand]
    .map(canonicalBrandValue)
    .filter((value) => value.length >= 2 && value.length <= 100));

  const schemaPhones = organizationNodes.flatMap((node) => [schemaValue(node.telephone), ...(Array.isArray(node.contactPoint) ? node.contactPoint : [node.contactPoint]).filter(Boolean).map((point) => schemaValue(point.telephone))]).filter(Boolean);
  const visiblePhones = unique([
    ...$("a[href^='tel:']").map((_, element) => cleanEntityValue(($(element).attr("href") || "").replace(/^tel:/i, ""))).get(),
    ...(text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || []),
  ]).map((value) => ({ value: cleanEntityValue(value), normalized: value.replace(/\D/g, ""), source: "visible" })).filter((item) => item.normalized.length >= 8 && item.normalized.length <= 15);
  const phones = uniqueByValue([
    ...schemaPhones.map((value) => ({ value, normalized: value.replace(/\D/g, ""), source: "schema" })),
    ...visiblePhones,
  ], (item) => item.normalized);

  const schemaAddresses = organizationNodes.map((node) => schemaValue(node.address)).filter(Boolean);
  const addressNodes = $('[itemprop="address"],address').map((_, element) => cleanEntityValue($(element).text())).get().filter((value) => value.length >= 8);
  const visibleAddressMatches = text.match(/\b\d{1,6}\s+[A-Za-z0-9 .'-]{3,80}\b(?:street|st|road|rd|avenue|ave|boulevard|blvd|lane|ln|drive|dr|way|suite|floor)\b[^.;\n]{0,100}/gi) || [];
  const addresses = uniqueByValue([
    ...schemaAddresses.map((value) => ({ value, normalized: normalizedEntityValue(value), source: "schema" })),
    ...[...addressNodes, ...visibleAddressMatches].map((value) => ({ value, normalized: normalizedEntityValue(value), source: "visible" })),
  ], (item) => item.normalized);

  const relationshipProperties = ["provider", "brand", "author", "publisher", "worksFor", "parentOrganization", "subOrganization", "manufacturer", "seller"];
  const relationships = [];
  for (const node of nodes) {
    const from = node["@id"] || schemaValue(node.name) || schemaValue(node["@type"]);
    for (const property of relationshipProperties) {
      const targets = Array.isArray(node[property]) ? node[property] : [node[property]];
      for (const target of targets.filter(Boolean)) {
        relationships.push({ from, property, to: schemaValue(target), resolved: typeof target !== "object" || !target["@id"] || nodes.some((candidate) => candidate["@id"] === target["@id"]) });
      }
    }
  }
  const sameAs = unique(organizationNodes.flatMap((node) => Array.isArray(node.sameAs) ? node.sameAs : [node.sameAs]).filter(Boolean).map(String));
  return {
    pageUrl,
    brandNames: brandNames.map((value) => ({ value, normalized: normalizedEntityValue(value), source: schemaNames.includes(value) ? "schema" : value === ogSiteName ? "open graph" : "visible metadata" })),
    names: schemaNames.map((value) => ({ value, normalized: normalizedEntityValue(value), source: "schema" })),
    addresses,
    phones,
    organizationIds: unique(organizationNodes.map((node) => node["@id"]).filter(Boolean)),
    relationships,
    sameAs,
    hasOrganization: organizationNodes.length > 0,
  };
}

function uniqueByValue(values, keyFor) {
  const seen = new Set();
  return values.filter((value) => {
    const key = keyFor(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function validateSchema($, pageUrl, text = visibleText($)) {
  const invalid = [];
  const blocks = [];
  $('script[type="application/ld+json"]').each((index, element) => {
    try { blocks.push(JSON.parse($(element).contents().text())); }
    catch (error) { invalid.push({ block: index + 1, error: error.message }); }
  });
  const nodes = schemaNodes(blocks);
  const ids = new Map();
  const duplicateIds = [];
  const brokenReferences = [];
  const issues = [];
  for (const node of nodes) {
    if (node["@id"]) {
      if (ids.has(node["@id"])) duplicateIds.push(node["@id"]);
      ids.set(node["@id"], node);
    }
  }
  const serialized = JSON.stringify(nodes);
  for (const reference of serialized.match(/https?:[^"}]+#[^"}]+/g) || []) {
    if (!ids.has(reference) && new URL(reference).hostname === new URL(pageUrl).hostname) brokenReferences.push(reference);
  }
  for (const node of nodes) {
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    for (const type of types) {
      const rule = SCHEMA_RULES[type];
      if (!rule) continue;
      const missingRequired = rule.required.filter((key) => node[key] == null || node[key] === "");
      const missingRecommended = rule.recommended.filter((key) => node[key] == null || node[key] === "");
      if (missingRequired.length || missingRecommended.length) issues.push({ type, id: node["@id"] || "", missingRequired, missingRecommended });
      const name = String(node.name || node.headline || "").trim();
      if (name && name.length > 3 && !text.toLowerCase().includes(name.toLowerCase())) {
        issues.push({ type, id: node["@id"] || "", visibleMismatch: `“${name.slice(0, 120)}” was not found in visible text` });
      }
    }
  }
  const requiredCount = issues.reduce((sum, item) => sum + (item.missingRequired?.length || 0), 0);
  const recommendedCount = issues.reduce((sum, item) => sum + (item.missingRecommended?.length || 0), 0);
  const score = nodes.length ? clampScore(100 - invalid.length * 25 - requiredCount * 12 - recommendedCount * 3 - duplicateIds.length * 10 - brokenReferences.length * 8) : 0;
  return { score, blocks: blocks.length, types: unique(nodes.flatMap((node) => Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]])), invalid, issues, duplicateIds: unique(duplicateIds), brokenReferences: unique(brokenReferences), nodeCount: nodes.length, entitySignals: extractEntitySignals($, nodes, pageUrl, text) };
}

const SEO_STOPWORDS = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "the", "to", "with", "your"]);
const GENERIC_METADATA = /^(?:home|homepage|welcome|welcome to our (?:site|website)|untitled|new page|index|website|official site)$/i;

function seoTokens(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((token) => token.length > 2 && !SEO_STOPWORDS.has(token));
}

function estimatedPixelWidth(value) {
  const widths = { narrow: 4, normal: 7.2, wide: 10.2, space: 3.6 };
  return Math.round([...String(value || "")].reduce((total, char) => {
    if (/\s/.test(char)) return total + widths.space;
    if (/[ilI1.,'|]/.test(char)) return total + widths.narrow;
    if (/[MW@#%&]/.test(char)) return total + widths.wide;
    return total + widths.normal;
  }, 0));
}

function tokenOverlap(source, target) {
  const sourceTokens = new Set(seoTokens(source));
  const targetTokens = new Set(seoTokens(target));
  if (!sourceTokens.size) return 0;
  return Math.round(([...sourceTokens].filter((token) => targetTokens.has(token)).length / sourceTokens.size) * 100);
}

function stuffingEvidence(value, threshold = 3) {
  const tokens = seoTokens(value);
  const counts = tokens.reduce((map, token) => map.set(token, (map.get(token) || 0) + 1), new Map());
  return [...counts.entries()].filter(([, count]) => count >= threshold && count / Math.max(tokens.length, 1) >= 0.12).map(([token, count]) => ({ token, count }));
}

export function analyzeMetadataQuality({ title, description, h1 = [], text = "" }) {
  const titlePixels = estimatedPixelWidth(title);
  const descriptionPixels = estimatedPixelWidth(description);
  const titleStuffing = stuffingEvidence(title, 3);
  const descriptionStuffing = stuffingEvidence(description, 4);
  const titleH1Alignment = tokenOverlap(title, h1.join(" "));
  const descriptionRelevance = tokenOverlap(description, `${title} ${h1.join(" ")} ${text.slice(0, 4000)}`);
  const titleGeneric = GENERIC_METADATA.test(title.trim());
  const descriptionGeneric = GENERIC_METADATA.test(description.trim());
  const titleTruncated = /(?:\.{3}|…)$/.test(title.trim()) || title.length > 70 || titlePixels > 600;
  const descriptionTruncated = /(?:\.{3}|…)$/.test(description.trim()) || description.length > 180 || descriptionPixels > 980;
  const checks = {
    titlePresent: Boolean(title), titleUsefulLength: title.length >= 20 && title.length <= 70, titlePixelFit: titlePixels <= 600,
    titleSpecific: Boolean(title) && !titleGeneric, titleNatural: titleStuffing.length === 0, titleAligned: !title || !h1.length ? null : titleH1Alignment >= 25,
    descriptionPresent: Boolean(description), descriptionUsefulLength: description.length >= 70 && description.length <= 180,
    descriptionPixelFit: descriptionPixels <= 980, descriptionSpecific: Boolean(description) && !descriptionGeneric,
    descriptionNatural: descriptionStuffing.length === 0, descriptionRelevant: !description ? null : descriptionRelevance >= 20,
    titleNotTruncated: !titleTruncated, descriptionNotTruncated: !descriptionTruncated,
  };
  const measured = Object.values(checks).filter((value) => value != null);
  return {
    score: clampScore((measured.filter(Boolean).length / Math.max(measured.length, 1)) * 100), checks,
    title: { length: title.length, estimatedPixels: titlePixels, generic: titleGeneric, stuffing: titleStuffing, h1AlignmentPercent: titleH1Alignment, truncated: titleTruncated },
    description: { length: description.length, estimatedPixels: descriptionPixels, generic: descriptionGeneric, stuffing: descriptionStuffing, relevancePercent: descriptionRelevance, truncated: descriptionTruncated },
  };
}

const GENERIC_MARKETING_PHRASES = ["elegance meets functionality", "timeless design", "luxury focus", "quality and value", "innovative solutions", "excellence and innovation", "elevate your", "redefine comfort", "best-in-class", "world-class"];

export function analyzeContentEvidence($, text) {
  const lower = text.toLowerCase();
  const genericPhrases = GENERIC_MARKETING_PHRASES.filter((phrase) => lower.includes(phrase));
  const concreteFacts = unique([
    ...(text.match(/\b\d+(?:[.,]\d+)?%\b[^.!?]{0,90}/g) || []),
    ...(text.match(/\b\d[\d,]*(?:\+)?\s*(?:years?|sq\.?\s*ft\.?|square feet|locations?|products?|customers?|reviews?)\b[^.!?]{0,90}/gi) || []),
    ...(text.match(/\b(?:founded|established|serving since|in business since)\b[^.!?]{0,100}/gi) || []),
  ]).slice(0, 20);
  const directAnswers = $("h2,h3,h4,summary,dt").map((_, element) => $(element).text().trim()).get().filter((value) => /\?$|^(?:what|how|why|when|where|who|can|does|is|are)\b/i.test(value));
  const authorElements = $('[rel="author"],[class*="author" i],[itemprop="author"]').map((_, element) => $(element).text().replace(/\s+/g, " ").trim()).get().filter(Boolean);
  const credentialSignals = unique((text.match(/\b(?:PhD|MD|DDS|CPA|PE|licensed|certified|accredited|years? of experience|founder|owner|designer|specialist)\b/gi) || []));
  const externalEvidenceLinks = $("a[href]").map((_, element) => $(element).attr("href") || "").get().filter((href) => /(?:google\.com\/maps|trustpilot|bbb\.org|yelp\.|houzz\.|facebook\.com|linkedin\.com|instagram\.com|youtube\.com|(?:news|press))/i.test(href));
  const placeholderTestimonials = unique([
    ...(text.match(/(?:working with this team|partnering with this team|engaging with this team|marketing director|chief technical officer|head of operations|chief financial officer)/gi) || []),
    ...$("[class*='testimonial' i]").map((_, element) => $(element).text().trim()).get().filter((value) => /lorem ipsum|testimonial text|customer name/i.test(value)),
  ]);
  const citations = $("a[href^='http']").length;
  const specificityScore = clampScore(50 + Math.min(40, concreteFacts.length * 8) - Math.min(40, genericPhrases.length * 10));
  const trustScore = clampScore((authorElements.length ? 25 : 0) + (credentialSignals.length ? 25 : 0) + (externalEvidenceLinks.length ? 25 : 0) + (citations ? 15 : 0) + (placeholderTestimonials.length ? 0 : 10));
  const answerabilityScore = clampScore((directAnswers.length ? 55 : 15) + (concreteFacts.length ? 25 : 0) + ($("details,dl").length ? 20 : 0));
  return {
    score: clampScore(specificityScore * 0.4 + answerabilityScore * 0.35 + trustScore * 0.25),
    specificityScore, answerabilityScore, trustScore, genericPhrases, concreteFacts, directAnswers: directAnswers.slice(0, 20),
    authors: authorElements.slice(0, 20), credentials: credentialSignals, externalEvidenceLinks: unique(externalEvidenceLinks).slice(0, 20),
    placeholderTestimonials, citations,
  };
}

export function analyzePageResponse(response, requestedUrl, rendered = null) {
  const html = String(response.data || "");
  const $ = cheerio.load(html);
  const text = visibleText($);
  const canonicalRaw = $('link[rel="canonical"]').first().attr("href") || "";
  const canonical = absoluteUrl(canonicalRaw, response.finalUrl || requestedUrl);
  const metaRobots = $('meta[name="robots"],meta[name="googlebot"]').map((_, el) => ($(el).attr("content") || "").toLowerCase()).get().join(",");
  const xRobots = String(response.headers?.["x-robots-tag"] || "").toLowerCase();
  const directives = `${metaRobots},${xRobots}`;
  const title = $("title").first().text().trim();
  const description = $('meta[name="description"]').first().attr("content")?.trim() || "";
  const h1 = $("h1").map((_, el) => $(el).text().trim()).get();
  const internalLinks = $("a[href]").map((_, el) => absoluteUrl($(el).attr("href"), response.finalUrl || requestedUrl)).get().filter(Boolean);
  const renderedText = rendered?.text || "";
  const rawWords = text.split(/\s+/).filter(Boolean).length;
  const renderedWords = renderedText.split(/\s+/).filter(Boolean).length;
  const addedWords = Math.max(0, renderedWords - rawWords);
  const jsDependentPercent = renderedWords ? clampScore((addedWords / renderedWords) * 100) : null;
  const soft404 = response.status === 200 && (/page not found|404|doesn.?t exist|nothing here/i.test(`${title} ${h1.join(" ")} ${text.slice(0, 800)}`) || rawWords < 20);
  const canonicalConflict = Boolean(canonical && new URL(canonical).toString() !== new URL(response.finalUrl || requestedUrl).toString());
  const schema = validateSchema($, response.finalUrl || requestedUrl, text);
  const metadataQuality = analyzeMetadataQuality({ title, description, h1, text });
  const contentEvidence = analyzeContentEvidence($, text);
  const detectedBrand = schema.entitySignals?.brandNames?.[0]?.value || "";
  const brandRepetitions = detectedBrand ? (title.toLowerCase().match(new RegExp(detectedBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").toLowerCase(), "g")) || []).length : 0;
  metadataQuality.title.brand = detectedBrand;
  metadataQuality.title.brandRepetitions = brandRepetitions;
  const renderedSchema = rendered?.html ? validateSchema(cheerio.load(rendered.html), response.finalUrl || requestedUrl, renderedText) : null;
  const schemaComparison = {
    measured: Boolean(renderedSchema),
    rawTypes: schema.types || [],
    renderedTypes: renderedSchema?.types || [],
    addedAfterJavaScript: renderedSchema ? renderedSchema.types.filter((type) => !schema.types.includes(type)) : [],
    missingAfterRender: renderedSchema ? schema.types.filter((type) => !renderedSchema.types.includes(type)) : [],
    rawBlocks: schema.blocks,
    renderedBlocks: renderedSchema?.blocks ?? null,
    consistent: renderedSchema ? schema.types.length === renderedSchema.types.length && schema.types.every((type) => renderedSchema.types.includes(type)) : null,
  };
  const findings = [];
  const add = (status, check, evidence, fix, confidence = "high", element = "document") => findings.push({ status, check, url: response.finalUrl || requestedUrl, element, evidence, fix, confidence });
  add(title ? "pass" : "fail", "Title", title || "No <title> element", "Add a unique, descriptive title.", "high", "head > title");
  add(description ? "pass" : "fail", "Meta description", description || "No meta description", "Add a page-specific summary.", "high", 'meta[name="description"]');
  add(h1.length === 1 ? "pass" : "fail", "H1", `${h1.length} H1 elements${h1[0] ? `; first: ${h1[0].slice(0, 120)}` : ""}`, "Use one descriptive H1.", "high", "body h1");
  if (title && !metadataQuality.checks.titleUsefulLength) add(title.length < 20 ? "warning" : "fail", "Title length", `${title.length} characters; estimated ${metadataQuality.title.estimatedPixels}px`, "Write a useful, page-specific title of roughly 20–70 characters that fits the search-result width.", "high", "head > title");
  if (title && !metadataQuality.checks.titlePixelFit) add("warning", "Title pixel width", `Estimated ${metadataQuality.title.estimatedPixels}px exceeds the 600px preview guideline`, "Shorten wide title words while preserving the page topic.", "medium", "head > title");
  if (metadataQuality.title.generic) add("fail", "Generic title", `Title is “${title}”`, "Replace generic wording with the page topic and brand.", "high", "head > title");
  if (metadataQuality.title.stuffing.length) add("warning", "Title keyword stuffing", metadataQuality.title.stuffing.map((item) => `${item.token} ×${item.count}`).join(", "), "Remove repeated keywords and write a natural title.", "medium", "head > title");
  if (brandRepetitions > 1) add("warning", "Brand repetition", `“${detectedBrand}” appears ${brandRepetitions} times in the title`, "Use the brand once in the title.", "high", "head > title");
  if (metadataQuality.checks.titleAligned === false) add("warning", "Title and H1 alignment", `${metadataQuality.title.h1AlignmentPercent}% meaningful-token overlap`, "Align the title and H1 around the same primary page topic.", "medium", "head > title and body h1");
  if (description && !metadataQuality.checks.descriptionUsefulLength) add(description.length < 70 ? "warning" : "fail", "Description length", `${description.length} characters; estimated ${metadataQuality.description.estimatedPixels}px`, "Write a relevant description of roughly 70–180 characters.", "high", 'meta[name="description"]');
  if (description && !metadataQuality.checks.descriptionPixelFit) add("warning", "Description pixel width", `Estimated ${metadataQuality.description.estimatedPixels}px exceeds the 980px preview guideline`, "Shorten the description while preserving its value proposition.", "medium", 'meta[name="description"]');
  if (metadataQuality.description.generic) add("fail", "Generic description", `Description is “${description}”`, "Replace generic text with a page-specific summary.", "high", 'meta[name="description"]');
  if (metadataQuality.description.stuffing.length) add("warning", "Description keyword stuffing", metadataQuality.description.stuffing.map((item) => `${item.token} ×${item.count}`).join(", "), "Remove repeated keywords and write a natural summary.", "medium", 'meta[name="description"]');
  if (metadataQuality.checks.descriptionRelevant === false) add("warning", "Description relevance", `${metadataQuality.description.relevancePercent}% meaningful-token overlap with the page`, "Describe the actual visible topic and intent of this page.", "medium", 'meta[name="description"] and visible content');
  if (metadataQuality.title.truncated) add("warning", "Truncated title", `Title ends with an ellipsis or exceeds preview limits`, "Provide a complete title that fits typical search-result width.", "medium", "head > title");
  if (metadataQuality.description.truncated) add("warning", "Truncated description", `Description ends with an ellipsis or exceeds preview limits`, "Provide a complete description that fits typical search-result width.", "medium", 'meta[name="description"]');
  if (contentEvidence.genericPhrases.length) add("warning", "Generic marketing language", `Detected: ${contentEvidence.genericPhrases.join(", ")}`, "Replace generic claims with concrete products, services, locations, experience, evidence, and customer outcomes.", "medium", "Visible page content");
  if (contentEvidence.placeholderTestimonials.length) add("fail", "Unverified or placeholder testimonials", `Suspicious testimonial signals: ${contentEvidence.placeholderTestimonials.join(", ")}`, "Use attributable customer reviews with permission and link to independently verifiable review profiles where possible.", "medium", "Testimonial content");
  if (!contentEvidence.directAnswers.length) add("warning", "Direct-answer structure", "No question-led headings or explicit answer blocks detected", "Add concise question-and-answer sections that address real customer decisions.", "medium", "Main content headings");
  if (contentEvidence.concreteFacts.length) add("pass", "Concrete factual evidence", `${contentEvidence.concreteFacts.length} specific factual claims detected`, "Keep important claims prominent and support them with sources where appropriate.", "medium", "Visible page content");
  if (/noindex/.test(directives)) add("fail", "Indexability", `Robots directives: ${directives}`, "Remove noindex if this page should appear in search.", "high", 'meta[name="robots"] / X-Robots-Tag');
  if (canonicalConflict) add("warning", "Canonical", `Canonical points to ${canonical}`, "Confirm the canonical intentionally consolidates this URL.", "medium", 'link[rel="canonical"]');
  if (soft404) add("fail", "Soft 404", `HTTP ${response.status}; ${rawWords} raw words`, "Return 404/410 or add substantive page content.", "high", "HTTP response and main content");
  if (jsDependentPercent != null && jsDependentPercent > 35) add("warning", "JavaScript dependency", `${jsDependentPercent}% of rendered words were absent from raw HTML`, "Server-render important content and structured data.", "high", "body (raw HTML versus rendered DOM)");
  if (schemaComparison.addedAfterJavaScript.length) add("warning", "Rendered-only schema", `Schema added after JavaScript: ${schemaComparison.addedAfterJavaScript.join(", ")}`, "Include critical structured data in server-rendered HTML.", "high", 'script[type="application/ld+json"]');
  for (const invalid of schema.invalid) add("fail", "Schema validation", `JSON-LD block ${invalid.block}: ${invalid.error}`, "Publish valid JSON-LD.", "high", `script[type="application/ld+json"]:nth-of-type(${invalid.block})`);
  for (const issue of schema.issues) {
    const details = [issue.missingRequired?.length ? `Missing required: ${issue.missingRequired.join(", ")}` : "", issue.missingRecommended?.length ? `Missing recommended: ${issue.missingRecommended.join(", ")}` : "", issue.visibleMismatch || ""].filter(Boolean).join("; ");
    add(issue.missingRequired?.length ? "fail" : "warning", `${issue.type} schema`, details, "Add the missing properties and keep structured data consistent with visible content.", issue.visibleMismatch ? "medium" : "high", 'script[type="application/ld+json"]');
  }
  return {
    requestedUrl, url: response.finalUrl || requestedUrl, role: pageRole(response.finalUrl || requestedUrl), status: response.status,
    redirectChain: response.redirectChain || [], title, description, canonical, canonicalConflict, directives: { metaRobots, xRobots },
    indexable: response.status < 400 && !/noindex/.test(directives) && !soft404, soft404, h1Count: h1.length, raw: { wordCount: rawWords, htmlBytes: Buffer.byteLength(html) },
    rendered: rendered ? { wordCount: renderedWords, htmlBytes: Buffer.byteLength(rendered.html || ""), jsDependentPercent, title: rendered.title } : { measured: false, reason: "Rendered scan unavailable or page outside render sample" },
    schema, renderedSchema, schemaComparison, metadataQuality, contentEvidence, internalLinks: internalLinks.filter((url) => new URL(url).hostname === new URL(requestedUrl).hostname).slice(0, 100), findings,
  };
}

async function renderPages(urls, deadline = null) {
  if (process.env.ENABLE_RENDERED_SCAN === "false") return new Map();
  let browser;
  try {
    browser = await launchBrowser();
    const output = new Map();
    await mapWithConcurrency(urls.slice(0, RENDER_LIMIT), 2, async (url) => {
      if (deadline && Date.now() >= deadline - 2500) return;
      let page;
      try {
        page = await browser.newPage();
        await page.setUserAgent(BROWSER_AGENT);
        const timeout = deadline ? Math.max(1000, Math.min(TIMEOUT, deadline - Date.now() - 1500)) : TIMEOUT;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout });
        await page.waitForNetworkIdle({ idleTime: 400, timeout: 2000 }).catch(() => {});
        const result = await page.evaluate(() => ({ html: document.documentElement.outerHTML, text: document.body?.innerText || "", title: document.title }));
        output.set(url, result);
      } catch {
      } finally {
        if (page) await page.close().catch(() => {});
      }
    });
    return output;
  } catch {
    return new Map();
  } finally {
    if (browser) await browser.close();
  }
}

function detectProfile(_pages, requested = "saas") {
  if (PROFILE_VALUES.has(requested)) return { value: requested, source: "selected", confidence: "high" };
  return { value: "saas", source: "fallback", confidence: "low" };
}

function average(values, fallback = 0) {
  const usable = values.filter((value) => Number.isFinite(value));
  return usable.length ? clampScore(usable.reduce((sum, value) => sum + value, 0) / usable.length) : fallback;
}

export function buildMetadataAnalysis(pages) {
  const normalize = (value) => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  const group = (field) => {
    const map = new Map();
    for (const page of pages) {
      const value = normalize(page[field]);
      if (!value) continue;
      if (!map.has(value)) map.set(value, []);
      map.get(value).push(page);
    }
    return [...map.entries()].filter(([, matches]) => matches.length > 1).map(([value, matches]) => ({ value, urls: matches.map((page) => page.url), count: matches.length }));
  };
  const duplicateTitles = group("title");
  const duplicateDescriptions = group("description");
  const titleDuplicateUrls = new Set(duplicateTitles.flatMap((item) => item.urls));
  const descriptionDuplicateUrls = new Set(duplicateDescriptions.flatMap((item) => item.urls));
  for (const page of pages) {
    if (!page.metadataQuality) continue;
    page.metadataQuality.uniqueness = {
      titleUnique: page.title ? !titleDuplicateUrls.has(page.url) : null,
      descriptionUnique: page.description ? !descriptionDuplicateUrls.has(page.url) : null,
      pageSpecific: Boolean(page.title && page.description && !titleDuplicateUrls.has(page.url) && !descriptionDuplicateUrls.has(page.url)),
    };
    if (titleDuplicateUrls.has(page.url)) page.findings.push({ status: "fail", check: "Duplicate title", url: page.url, element: "head > title", evidence: `The same title appears on ${duplicateTitles.find((item) => item.urls.includes(page.url))?.count || 2} sampled pages`, expected: "A unique page-specific title", fix: "Write a unique title reflecting this page’s topic and intent.", confidence: "high" });
    if (descriptionDuplicateUrls.has(page.url)) page.findings.push({ status: "fail", check: "Duplicate description", url: page.url, element: 'meta[name="description"]', evidence: `The same description appears on ${duplicateDescriptions.find((item) => item.urls.includes(page.url))?.count || 2} sampled pages`, expected: "A unique page-specific description", fix: "Write a unique summary based on this page’s visible content.", confidence: "high" });
  }
  const pagesWithQuality = pages.filter((page) => page.metadataQuality);
  const averageQualityScore = average(pagesWithQuality.map((page) => page.metadataQuality.score), 0);
  const uniquenessScore = clampScore(((pages.filter((page) => page.title && !titleDuplicateUrls.has(page.url)).length + pages.filter((page) => page.description && !descriptionDuplicateUrls.has(page.url)).length) / Math.max(pages.length * 2, 1)) * 100);
  return {
    score: clampScore(averageQualityScore * 0.7 + uniquenessScore * 0.3),
    averageQualityScore,
    uniquenessScore,
    duplicateTitles,
    duplicateDescriptions,
    pagesWithUniqueTitles: pages.filter((page) => page.title && !titleDuplicateUrls.has(page.url)).length,
    pagesWithUniqueDescriptions: pages.filter((page) => page.description && !descriptionDuplicateUrls.has(page.url)).length,
    pagesChecked: pages.length,
  };
}

function buildContentAnalysis(pages) {
  const evidence = pages.map((page) => page.contentEvidence).filter(Boolean);
  return {
    score: average(evidence.map((item) => item.score), 0),
    specificityScore: average(evidence.map((item) => item.specificityScore), 0),
    answerabilityScore: average(evidence.map((item) => item.answerabilityScore), 0),
    trustEvidenceScore: average(evidence.map((item) => item.trustScore), 0),
    genericPhrases: unique(evidence.flatMap((item) => item.genericPhrases)),
    concreteFacts: unique(evidence.flatMap((item) => item.concreteFacts)).slice(0, 40),
    authors: unique(evidence.flatMap((item) => item.authors)),
    credentials: unique(evidence.flatMap((item) => item.credentials)),
    externalEvidenceLinks: unique(evidence.flatMap((item) => item.externalEvidenceLinks)),
    placeholderTestimonials: unique(evidence.flatMap((item) => item.placeholderTestimonials)),
    pagesChecked: pages.length,
  };
}

export function buildEntityAnalysis(pages, profile = "saas") {
  const signals = pages.map((page) => page.schema?.entitySignals).filter(Boolean);
  const brandOccurrences = signals.flatMap((signal) => signal.brandNames.map((item) => ({ ...item, url: signal.pageUrl })));
  const nameOccurrences = signals.flatMap((signal) => signal.names.map((item) => ({ ...item, url: signal.pageUrl })));
  const addressOccurrences = signals.flatMap((signal) => signal.addresses.map((item) => ({ ...item, url: signal.pageUrl })));
  const phoneOccurrences = signals.flatMap((signal) => signal.phones.map((item) => ({ ...item, url: signal.pageUrl })));
  const relationships = signals.flatMap((signal) => signal.relationships.map((item) => ({ ...item, url: signal.pageUrl })));
  const sameAs = unique(signals.flatMap((signal) => signal.sameAs));
  const organizationIds = unique(signals.flatMap((signal) => signal.organizationIds));
  const brandVariants = [...new Map(brandOccurrences.map((item) => [item.normalized, item.value])).entries()].map(([normalized, value]) => ({ normalized, value, occurrences: brandOccurrences.filter((item) => item.normalized === normalized).length, urls: unique(brandOccurrences.filter((item) => item.normalized === normalized).map((item) => item.url)) }));
  const names = [...new Map(nameOccurrences.map((item) => [item.normalized, item.value])).entries()].map(([normalized, value]) => ({ normalized, value, urls: unique(nameOccurrences.filter((item) => item.normalized === normalized).map((item) => item.url)) }));
  const addresses = [...new Map(addressOccurrences.map((item) => [item.normalized, item.value])).entries()].map(([normalized, value]) => ({ normalized, value, urls: unique(addressOccurrences.filter((item) => item.normalized === normalized).map((item) => item.url)), sources: unique(addressOccurrences.filter((item) => item.normalized === normalized).map((item) => item.source)) }));
  const phones = [...new Map(phoneOccurrences.map((item) => [item.normalized, item.value])).entries()].map(([normalized, value]) => ({ normalized, value, urls: unique(phoneOccurrences.filter((item) => item.normalized === normalized).map((item) => item.url)), sources: unique(phoneOccurrences.filter((item) => item.normalized === normalized).map((item) => item.source)) }));
  const unresolvedRelationships = relationships.filter((item) => !item.resolved);
  const pagesWithOrganization = signals.filter((signal) => signal.hasOrganization).length;
  const hasExternalProfile = sameAs.some((url) => { try { return new URL(url).hostname !== new URL(pages[0]?.url || "https://example.com").hostname; } catch { return false; } });
  const identityScore = profile === "local_business"
    ? clampScore((pagesWithOrganization ? 40 : 0) + (names.length === 1 ? 20 : names.length ? 10 : 0) + (organizationIds.length ? 15 : 0) + (hasExternalProfile ? 10 : 0) + (phones.length && addresses.length ? 15 : phones.length || addresses.length ? 7 : 0))
    : clampScore((pagesWithOrganization ? 40 : 0) + (names.length === 1 ? 25 : names.length ? 12 : 0) + (organizationIds.length ? 20 : 0) + (hasExternalProfile ? 15 : 0));
  const connectionScore = clampScore((relationships.length ? 45 : 15) + (sameAs.length ? 20 : 0) + (organizationIds.length ? 20 : 0) + (unresolvedRelationships.length ? Math.max(0, 15 - unresolvedRelationships.length * 5) : 15));
  const brandScore = brandVariants.length === 1 ? 100 : brandVariants.length === 0 ? 0 : clampScore(100 - (brandVariants.length - 1) * 25);
  const napApplicable = profile === "local_business" || addresses.length > 0;
  const napConflicts = [];
  if (names.length > 1) napConflicts.push({ field: "name", values: names });
  if (addresses.length > 1) napConflicts.push({ field: "address", values: addresses });
  if (phones.length > 1) napConflicts.push({ field: "phone", values: phones });
  const napCompleteness = [names.length > 0, addresses.length > 0, phones.length > 0].filter(Boolean).length;
  const napScore = napApplicable ? clampScore((napCompleteness / 3) * 60 + 40 - napConflicts.length * 25) : null;
  const status = (score) => score == null ? "not_applicable" : score >= 85 ? "pass" : score >= 60 ? "warning" : "fail";
  return {
    entityIdentity: { score: identityScore, status: status(identityScore), detectedName: names[0]?.value || brandVariants[0]?.value || "", organizationIds, externalProfiles: sameAs, pagesWithOrganization, pagesChecked: pages.length },
    entityConnections: { score: connectionScore, status: status(connectionScore), relationships, unresolvedRelationships, externalProfiles: sameAs },
    brandNameConsistency: { score: brandScore, status: status(brandScore), primaryName: brandVariants.sort((a, b) => b.occurrences - a.occurrences)[0]?.value || "", variants: brandVariants, conflicting: brandVariants.length > 1 },
    napConsistency: { score: napScore, status: status(napScore), applicable: napApplicable, names, addresses, phones, conflicts: napConflicts, note: napApplicable ? "Compared across visible content and structured data on sampled pages." : "No local-business/address signals detected; NAP is reported as not applicable." },
  };
}

function buildCategories(pages, robots, sitemap, performance, entityAnalysis, metadataAnalysis, contentAnalysis) {
  const measuredPages = pages.filter((page) => Number.isFinite(page.status));
  const indexable = measuredPages.filter((page) => page.indexable).length;
  const schema = average(measuredPages.map((page) => page.schema.score), 0);
  const meta = metadataAnalysis.score;
  const rawContent = average(measuredPages.map((page) => clampScore((page.raw.wordCount / 500) * 100)));
  const jsSafe = average(measuredPages.map((page) => page.rendered.jsDependentPercent == null ? 60 : 100 - page.rendered.jsDependentPercent), 60);
  const crawlability = clampScore((indexable / Math.max(measuredPages.length, 1)) * 60 + (robots?.score || 0) * 0.25 + (sitemap.urls.length ? 15 : 0));
  const technicalSeo = clampScore(meta * 0.45 + schema * 0.3 + (measuredPages.filter((page) => page.canonical && !page.canonicalConflict).length / Math.max(measuredPages.length, 1)) * 25);
  const entitySubscores = [entityAnalysis.entityIdentity.score, entityAnalysis.entityConnections.score, entityAnalysis.brandNameConsistency.score, entityAnalysis.napConsistency.score].filter(Number.isFinite);
  const entityConfidence = average(entitySubscores, 0);
  const measuredPerformance = performance?.fallback || performance?.skipped ? null : performance?.performance;
  const measuredAccessibility = performance?.fallback || performance?.skipped ? null : performance?.accessibility;
  return {
    crawlability, technicalSeo, contentReadiness: clampScore(contentAnalysis.score * 0.65 + rawContent * 0.15 + jsSafe * 0.1 + meta * 0.1), entityConfidence,
    performance: Number.isFinite(measuredPerformance) ? measuredPerformance : null,
    accessibility: Number.isFinite(measuredAccessibility) ? measuredAccessibility : null,
    agentReadiness: clampScore(jsSafe * 0.4 + schema * 0.3 + (robots?.score || 0) * 0.2 + (sitemap.urls.length ? 10 : 0)),
  };
}

export async function runSiteAudit(baseUrl, { profile = "saas", robots = null, performance = null, homepageInternalUrls = [], sitemapDiscovery = null, deadline = null } = {}) {
  const startedAt = Date.now();
  const discoveryFiles = await analyzeDiscoveryFiles(baseUrl, robots, deadline);
  const sitemap = await Promise.resolve(sitemapDiscovery || discoverSitemaps(baseUrl, discoveryFiles.robotsRaw, deadline));
  const selectedUrls = selectRepresentativeUrls(baseUrl, sitemap.urls.map((item) => item.url), homepageInternalUrls);
  const pageHeaders = robots?.scannerBlocked ? { "User-Agent": BROWSER_AGENT } : {};
  const responses = await mapWithConcurrency(selectedUrls, 5, async (url) => {
    try { return { url, response: await get(url, { deadline, headers: pageHeaders, timeout: PAGE_FETCH_TIMEOUT }) }; }
    catch (error) { return { url, error: error.message }; }
  });
  const renderable = responses.filter((item) => item.response?.status < 400).map((item) => item.response.finalUrl || item.url);
  const rendered = await renderPages(renderable, deadline);
  const pages = responses.map((item) => item.response ? analyzePageResponse(item.response, item.url, rendered.get(item.response.finalUrl || item.url)) : ({
    requestedUrl: item.url, url: item.url, role: pageRole(item.url), status: null, indexable: false, error: item.error,
    raw: { wordCount: 0, htmlBytes: 0 }, rendered: { measured: false, reason: item.error }, schema: { score: 0, types: [], issues: [], invalid: [] },
    findings: [{ status: "unknown", check: "Fetch", url: item.url, element: "HTTP response", evidence: item.error, fix: "Confirm the page is publicly reachable.", confidence: "high" }], internalLinks: [],
  }));
  const detectedProfile = detectProfile(pages, profile);
  const metadataAnalysis = buildMetadataAnalysis(pages);
  const contentAnalysis = buildContentAnalysis(pages);
  const entityAnalysis = buildEntityAnalysis(pages, detectedProfile.value);
  const resolvedPerformance = await Promise.resolve(performance);
  const categoryScores = buildCategories(pages, robots, sitemap, resolvedPerformance, entityAnalysis, metadataAnalysis, contentAnalysis);
  const measuredCategories = Object.fromEntries(Object.entries(categoryScores).map(([key, value]) => [key, { score: value, measured: value != null }]));
  const siteWideScore = profileAwareScore(categoryScores, detectedProfile.value);
  const discoveredInternal = unique(pages.flatMap((page) => page.internalLinks || []));
  const selectedSet = new Set(selectedUrls);
  const orphanCandidates = sitemap.urls.map((item) => item.url).filter((url) => !discoveredInternal.includes(url) && new URL(url).pathname !== "/").slice(0, 20);
  const missingFromSitemap = discoveredInternal.filter((url) => !sitemap.urls.some((item) => item.url === url) && !selectedSet.has(url)).slice(0, 20);
  const invalidLastmod = sitemap.urls.filter((item) => item.lastmod && (Number.isNaN(Date.parse(item.lastmod)) || Date.parse(item.lastmod) > Date.now() + 86400000)).slice(0, 20);
  const pageChecks = pages.flatMap((page) => page.findings || []);
  const diagnosticChecks = [
    { id: "robots", category: "crawlability", label: "robots.txt", status: discoveryFiles.robots.exists ? "pass" : "fail", measured: true, url: discoveryFiles.robots.url, element: "HTTP response", evidence: discoveryFiles.robots.exists ? `${discoveryFiles.robots.usedBrowserFallback ? `Initial HTTP ${discoveryFiles.robots.scannerStatus}; recovered with browser fallback. ` : ""}HTTP ${discoveryFiles.robots.status}; ${discoveryFiles.robots.bots.length} crawler policies evaluated` : `robots.txt unavailable; HTTP ${discoveryFiles.robots.status ?? "unknown"}`, expected: "Public robots.txt with intentional crawler rules" },
    { id: "sitemap", category: "crawlability", label: "Sitemap discovery", status: sitemap.documents.length ? "pass" : sitemap.declaredInRobots.length ? "warning" : "fail", measured: true, url: sitemap.declaredInRobots[0] || baseUrl, element: "robots.txt Sitemap directives and common sitemap paths", evidence: sitemap.documents.length ? `${sitemap.documents.length} sitemap documents and ${sitemap.urls.length} URLs discovered` : sitemap.declaredInRobots.length ? `Declared in robots.txt but could not be verified during this scan: ${sitemap.declaredInRobots[0]}` : "No sitemap declaration or valid common sitemap path found", expected: "At least one valid sitemap document" },
    { id: "llms", category: "agentReadiness", label: "llms.txt", status: discoveryFiles.llms.exists ? (discoveryFiles.llms.valid ? "pass" : "warning") : "warning", measured: true, url: new URL("/llms.txt", baseUrl).toString(), element: "HTTP response and text format", evidence: discoveryFiles.llms.exists ? `HTTP ${discoveryFiles.llms.status}; format ${discoveryFiles.llms.valid ? "recognized" : "unrecognized"}` : "Optional llms.txt not found", expected: "Optional: concise Markdown index of important resources", optional: true },
    { id: "rendering", category: "contentReadiness", label: "Browser rendering", status: pages.some((page) => page.rendered?.wordCount != null) ? "pass" : "not_measured", measured: pages.some((page) => page.rendered?.wordCount != null), url: baseUrl, element: "Rendered DOM", evidence: `${pages.filter((page) => page.rendered?.wordCount != null).length} of ${pages.length} pages rendered`, expected: "Rendered sample available for raw/rendered comparison" },
    { id: "lighthouse", category: "performance", label: "Lighthouse", status: Number.isFinite(resolvedPerformance?.performance) ? "pass" : "not_measured", measured: Number.isFinite(resolvedPerformance?.performance), url: baseUrl, element: "Lighthouse categories", evidence: Number.isFinite(resolvedPerformance?.performance) ? `Performance ${resolvedPerformance.performance}; accessibility ${resolvedPerformance.accessibility}` : (resolvedPerformance?.error || "Lighthouse not configured"), expected: "Successful Lighthouse run" },
  ];
  const successfulPages = pages.filter((page) => Number.isFinite(page.status) && page.status < 400).length;
  const renderedPages = pages.filter((page) => page.rendered?.wordCount != null).length;
  const coverageRatio = successfulPages / Math.max(selectedUrls.length, 1);
  const confidencePoints = (coverageRatio * 55) + (sitemap.documents.length ? 15 : 0) + (discoveryFiles.robots.exists ? 10 : 0) + (renderedPages ? 15 : 0) + (Number.isFinite(resolvedPerformance?.performance) ? 5 : 0);
  const confidenceScore = clampScore(confidencePoints);
  const confidence = { score: confidenceScore, level: confidenceScore >= 85 ? "high" : confidenceScore >= 60 ? "medium" : confidenceScore >= 35 ? "low" : "incomplete", reasons: [
    `${successfulPages}/${selectedUrls.length} selected pages fetched successfully`,
    `${renderedPages}/${pages.length} pages browser-rendered`,
    sitemap.documents.length ? `${sitemap.documents.length} sitemap documents processed` : "No valid sitemap processed",
    discoveryFiles.robots.exists ? "robots.txt evaluated" : "robots.txt unavailable",
    Number.isFinite(resolvedPerformance?.performance) ? "Lighthouse measured" : "Lighthouse not measured",
  ] };
  return {
    profile: detectedProfile, siteWideScore, categoryScores: measuredCategories, pages,
    entityAnalysis,
    metadataAnalysis,
    contentAnalysis,
    coverage: { scanned: pages.length, requested: selectedUrls.length, rendered: pages.filter((page) => page.rendered?.wordCount != null).length, discovered: unique([...sitemap.urls.map((item) => item.url), ...discoveredInternal]).length },
    sitemap: { ...sitemap, urls: sitemap.urls.slice(0, 100), orphanCandidates, missingFromSitemap, invalidLastmod },
    discoveryFiles: { robots: discoveryFiles.robots, llms: discoveryFiles.llms },
    rendering: { averageJsDependentPercent: average(pages.map((page) => page.rendered?.jsDependentPercent).filter((value) => value != null), null), pagesMeasured: pages.filter((page) => page.rendered?.jsDependentPercent != null).length },
    findings: pageChecks,
    diagnostics: { scannerVersion: "2.1.0", durationMs: Date.now() - startedAt, checks: [...diagnosticChecks, ...pageChecks.map((item, index) => ({ id: `page-${index + 1}`, category: "page", label: item.check, measured: item.status !== "not_measured", ...item }))], summary: { pass: [...diagnosticChecks, ...pageChecks].filter((item) => item.status === "pass").length, warning: [...diagnosticChecks, ...pageChecks].filter((item) => item.status === "warning").length, fail: [...diagnosticChecks, ...pageChecks].filter((item) => item.status === "fail").length, notMeasured: [...diagnosticChecks, ...pageChecks].filter((item) => item.status === "not_measured").length } },
    confidence,
    methodology: "Representative multi-page sample from sitemap and internal links; raw HTML for every reachable page and rendered HTML for a bounded sample.",
  };
}

export { AI_BOTS };
