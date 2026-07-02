import axios from "axios";
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import { parseStringPromise } from "xml2js";
import { JSDOM } from "jsdom";
import { SCORE_WEIGHTS, clampScore, gradeFor, statusFor, weightedPoints } from "./scoring";
import { assertPublicUrl } from "./security";

const BOT_AGENTS = ["GPTBot", "ClaudeBot", "Googlebot", "Google-Extended", "PerplexityBot", "CCBot", "Amazonbot", "Applebot"];
const SCHEMA_TYPES = ["Organization", "Person", "Article", "FAQPage", "Service", "Product", "Review", "LocalBusiness", "BreadcrumbList", "Recipe", "HowTo", "Event", "VideoObject", "JobPosting", "Course"];
const USER_AGENT = "AIWebsiteReadinessChecker/1.0 (+https://example.com)";
const REQUEST_TIMEOUT = 6000;
const LIGHTHOUSE_TIMEOUT = 18000;
const MAX_REDIRECTS = 5;

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

async function fetchText(url, options = {}, redirectDepth = 0) {
  await assertPublicUrl(url);
  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT,
    maxRedirects: 0,
    validateStatus: (status) => status < 500,
    responseType: "text",
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    ...options,
  });
  if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.location) {
    if (redirectDepth >= MAX_REDIRECTS) throw new Error("Too many redirects while scanning this website.");
    const nextUrl = new URL(response.headers.location, url).toString();
    return fetchText(nextUrl, options, redirectDepth + 1);
  }
  response.finalUrl = response.config.url;
  return response;
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
  const score = clampScore(((important.filter((type) => found.includes(type)).length / important.length) * 80) + (invalid.length ? 0 : 20));

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
  const dom = new JSDOM($.html());
  const document = dom.window.document;
  document.querySelectorAll("script,style,noscript,svg").forEach((node) => node.remove());
  const bodyText = document.body?.textContent?.replace(/\s+/g, " ").trim() || "";
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

function analyzeEeat($, url, text) {
  const linksText = $("a").map((_, el) => `${$(el).text()} ${$(el).attr("href") || ""}`.toLowerCase()).get().join(" ");
  const pageText = `${linksText} ${text}`.toLowerCase();
  const checks = {
    aboutPage: /about/.test(pageText),
    contactPage: /contact/.test(pageText),
    privacy: /privacy/.test(pageText),
    terms: /terms|conditions/.test(pageText),
    author: /author|by\s+[a-z]/i.test(text) || $('[rel="author"], [class*="author" i]').length > 0,
    editorialPolicy: /editorial policy|review policy|fact[- ]checked/i.test(text),
    address: /\d{1,6}\s+[A-Za-z0-9 .'-]+(?:street|st|road|rd|avenue|ave|suite|floor|blvd|lane|ln)/i.test(text),
    phone: /(?:\+?\d[\d\s().-]{7,}\d)/.test(text),
    email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text),
    socialProfiles: /(linkedin|twitter|x\.com|facebook|instagram|youtube)\.com/i.test($.html()),
    https: new URL(url).protocol === "https:",
  };
  const score = clampScore((Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100);
  return { score, checks };
}

function extractEntities($, metadata, text) {
  const html = $.html();
  const orgSchema = [];
  $('script[type="application/ld+json"]').each((_, node) => {
    try {
      orgSchema.push(JSON.parse($(node).contents().text()));
    } catch {}
  });
  const schemaText = JSON.stringify(orgSchema);
  const companyName = metadata.title?.split(/[|-]/)[0]?.trim() || text.match(/(?:©|Copyright)\s+\d{4}\s+([^.\n]+)/i)?.[1]?.trim() || "";
  const emails = unique(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []);
  const phones = unique(text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || []).slice(0, 5);
  const services = $("h1,h2,h3,a").map((_, el) => $(el).text().trim()).get().filter((value) => /service|solution|product|platform|consulting|software|agency/i.test(value)).slice(0, 10);
  const locations = unique((text.match(/\b[A-Z][a-z]+,\s+[A-Z]{2}\b/g) || []).slice(0, 8));
  const founders = unique((text.match(/founder(?:s)?(?:\s+and\s+CEO)?\s*(?:is|:)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/g) || []).slice(0, 5));
  const address = text.match(/\d{1,6}\s+[A-Za-z0-9 .'-]+(?:Street|St|Road|Rd|Avenue|Ave|Suite|Floor|Blvd|Lane|Ln)[^.\n]*/i)?.[0] || "";
  const score = clampScore((companyName ? 20 : 0) + (emails.length ? 15 : 0) + (phones.length ? 15 : 0) + (address ? 15 : 0) + (services.length ? 20 : 0) + (/Organization|LocalBusiness|Product|Service/i.test(schemaText) ? 15 : 0));
  return { score, companyName, brand: metadata.title || companyName, products: services.filter((s) => /product|platform|software/i.test(s)), services, founders, phones, emails, address, locations, htmlSignals: html.length };
}

async function analyzeRobots(baseUrl) {
  const robotsUrl = new URL("/robots.txt", baseUrl).toString();
  try {
    const response = await fetchText(robotsUrl, { headers: { "User-Agent": USER_AGENT, Accept: "text/plain,*/*" } });
    if (response.status >= 400) throw new Error(`robots.txt returned HTTP ${response.status}`);
    const parser = robotsParser(robotsUrl, response.data);
    const bots = BOT_AGENTS.map((bot) => ({ bot, allowed: parser.isAllowed(baseUrl, bot) !== false }));
    const allowed = bots.filter((bot) => bot.allowed).length;
    return { score: clampScore((allowed / bots.length) * 100), exists: true, valid: true, url: robotsUrl, bots, blockedBots: bots.filter((bot) => !bot.allowed).map((bot) => bot.bot), raw: response.data.slice(0, 2500) };
  } catch (error) {
    return { score: 30, exists: false, valid: false, url: robotsUrl, bots: BOT_AGENTS.map((bot) => ({ bot, allowed: null })), blockedBots: [], error: error.message };
  }
}

async function analyzeSitemap(baseUrl) {
  const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
  try {
    const response = await fetchText(sitemapUrl, { headers: { "User-Agent": USER_AGENT, Accept: "application/xml,text/xml,*/*" } });
    if (response.status >= 400) throw new Error(`sitemap.xml returned HTTP ${response.status}`);
    const parsed = await parseStringPromise(response.data);
    const urls = parsed.urlset?.url || [];
    const xml = response.data;
    return {
      score: clampScore((urls.length ? 60 : 20) + (/image:image/.test(xml) ? 10 : 0) + (/news:news/.test(xml) ? 10 : 0) + (/video:video/.test(xml) ? 10 : 0) + (parsed ? 10 : 0)),
      exists: true,
      validXml: true,
      url: sitemapUrl,
      urlCount: urls.length,
      imagesSitemap: /image:image/.test(xml),
      newsSitemap: /news:news/.test(xml),
      videoSitemap: /video:video/.test(xml),
      missingUrls: urls.length === 0,
    };
  } catch (error) {
    return { score: 0, exists: false, validXml: false, url: sitemapUrl, urlCount: 0, imagesSitemap: false, newsSitemap: false, videoSitemap: false, missingUrls: true, error: error.message };
  }
}

function estimatePerformanceFromResponse(response) {
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
    score,
    performance: score,
    accessibility: 80,
    seo: 90,
    bestPractices: statusOk ? 88 : 60,
    skipped: true,
    fallback: true,
    responseTimeMs,
    htmlBytes,
    transferBytes,
    error: "Lighthouse is disabled. Performance is estimated from real HTTP response timing and document weight.",
  };
}

async function runLighthouse(url, initialResponse) {
  if (process.env.ENABLE_LIGHTHOUSE !== "true") {
    return estimatePerformanceFromResponse(initialResponse);
  }

  let browser;
  try {
    await assertPublicUrl(url);
    const [{ default: puppeteer }, { default: lighthouse }] = await Promise.all([
      import("puppeteer"),
      import("lighthouse"),
    ]);
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
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
    const categories = result.lhr.categories;
    return {
      score: clampScore((categories.performance.score || 0) * 100),
      performance: clampScore((categories.performance.score || 0) * 100),
      accessibility: clampScore((categories.accessibility.score || 0) * 100),
      seo: clampScore((categories.seo.score || 0) * 100),
      bestPractices: clampScore((categories["best-practices"].score || 0) * 100),
      error: null,
    };
  } catch (error) {
    return { score: 0, performance: 0, accessibility: 0, seo: 0, bestPractices: 0, error: error.message };
  } finally {
    if (browser) await browser.close();
  }
}

function calculatePlatformScores(scores, schema, content, eeat, entities, robots) {
  const base = {
    ChatGPT: scores.schema * 0.22 + scores.content * 0.22 + scores.eeat * 0.18 + scores.entities * 0.18 + scores.robots * 0.1 + scores.metadata * 0.1,
    Claude: scores.content * 0.26 + scores.eeat * 0.22 + scores.schema * 0.18 + scores.metadata * 0.12 + scores.robots * 0.12 + scores.readability * 0.1,
    Gemini: scores.metadata * 0.18 + scores.schema * 0.18 + scores.performance * 0.16 + scores.content * 0.16 + scores.eeat * 0.14 + scores.sitemap * 0.1 + scores.links * 0.08,
    Perplexity: scores.schema * 0.2 + scores.eeat * 0.2 + scores.content * 0.18 + scores.entities * 0.15 + scores.links * 0.12 + scores.sitemap * 0.1 + scores.metadata * 0.05,
    "Google AI Overview": scores.metadata * 0.16 + scores.schema * 0.2 + scores.performance * 0.14 + scores.eeat * 0.18 + scores.content * 0.14 + scores.sitemap * 0.1 + scores.links * 0.08,
    "Microsoft Copilot": scores.schema * 0.2 + scores.metadata * 0.16 + scores.content * 0.18 + scores.eeat * 0.16 + scores.entities * 0.14 + scores.robots * 0.08 + scores.performance * 0.08,
  };

  return Object.entries(base).map(([platform, score]) => {
    const value = clampScore(score);
    const strengths = [];
    const weaknesses = [];
    if (schema.present.length) strengths.push(`${schema.present.slice(0, 3).join(", ")} schema detected`);
    if (content.hasFAQ) strengths.push("FAQ-style answers detected");
    if (entities.companyName) strengths.push("Brand entity identified");
    if (eeat.checks.contactPage) strengths.push("Contact signals present");
    if (!schema.present.includes("Organization") && !schema.present.includes("LocalBusiness")) weaknesses.push("Organization entity schema missing");
    if (!eeat.checks.author) weaknesses.push("Author or editorial ownership unclear");
    if (!robots.bots?.some((bot) => bot.bot === "GPTBot" && bot.allowed)) weaknesses.push("AI crawler permission is unclear");
    return {
      platform,
      score: value,
      status: statusFor(value),
      strengths: strengths.slice(0, 4),
      weaknesses: weaknesses.slice(0, 4),
      suggestions: weaknesses.length ? weaknesses.map((item) => `Resolve: ${item}`) : ["Keep schema, citations, and entity details current."],
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
  if (!sitemap.exists) addRecommendation(items, {
    title: "Publish XML Sitemap",
    description: "No valid sitemap.xml was found at the root.",
    currentStatus: "Not found",
    whyAiCares: "Sitemaps help crawlers discover important pages beyond the homepage.",
    howToFix: "Generate and submit an XML sitemap with canonical URLs.",
    expectedGain: 4,
    priority: 62,
  });
  if (performance.performance < 50) addRecommendation(items, {
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
  const total = Object.entries(SCORE_WEIGHTS).reduce((sum, [key, weight]) => sum + weightedPoints(scores[key], weight), 0);
  return { scores, overall: clampScore(total) };
}

export async function scanWebsite(inputUrl) {
  const url = normalizeUrl(inputUrl);
  await assertPublicUrl(url);
  let response;
  try {
    const startedAt = Date.now();
    response = await fetchText(url);
    response.durationMs = Date.now() - startedAt;
  } catch (error) {
    throw new Error(error.code === "ECONNABORTED" ? "The website timed out while scanning." : `Unable to reach the website: ${error.message}`);
  }

  if (response.status >= 400) {
    throw new Error(`The website returned HTTP ${response.status}.`);
  }

  const finalUrl = response.finalUrl || url;
  await assertPublicUrl(finalUrl);
  const $ = cheerio.load(response.data || "");
  const metadata = analyzeMetadata($);
  const schema = analyzeSchema($);
  const headings = analyzeHeadings($);
  const images = analyzeImages($);
  const links = await checkInternalLinks(analyzeLinks($, finalUrl));
  const content = analyzeContent($);
  const eeat = analyzeEeat($, finalUrl, content.text);
  const entities = extractEntities($, metadata, content.text);
  const [robots, sitemap, performance] = await Promise.all([analyzeRobots(finalUrl), analyzeSitemap(finalUrl), runLighthouse(finalUrl, response)]);
  const scored = scoreAll({ metadata, schema, performance, content, eeat, entities, robots, sitemap, links, images });
  const recommendations = buildRecommendations({ metadata, schema, headings, images, links, content, eeat, robots, sitemap, performance, entities });
  const platformScores = calculatePlatformScores(scored.scores, schema, content, eeat, entities, robots);

  const checklist = {
    robots: robots.exists && robots.valid,
    sitemap: sitemap.exists && sitemap.validXml,
    https: new URL(finalUrl).protocol === "https:",
    metadata: metadata.score >= 70,
    openGraph: metadata.openGraphTags >= 3,
    schema: schema.present.length > 0 && !schema.invalid.length,
    headingStructure: headings.score >= 70,
    images: images.score >= 70,
    accessibility: performance.accessibility >= 70,
    internalLinking: links.internal > 0,
  };

  return {
    scannedUrl: url,
    finalUrl,
    redirected: url !== finalUrl,
    scannedAt: new Date().toISOString(),
    overallScore: scored.overall,
    grade: gradeFor(scored.overall),
    scoreBreakdown: scored.scores,
    weights: SCORE_WEIGHTS,
    platformScores,
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
    checklist,
    recommendations,
    quickWins: recommendations.filter((item) => item.difficulty === "Easy" && /under 30/i.test(item.estimatedTime)).slice(0, 6),
    contentOpportunities: ["About", "FAQ", "Pricing", "Contact", "Resources", "Case Studies", "Testimonials", "Glossary", "Documentation", "Blog", "Comparison Pages"].map((page) => ({
      page,
      suggested: !new RegExp(page.replace(" ", "|"), "i").test(content.text),
    })),
  };
}
