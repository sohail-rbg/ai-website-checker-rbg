import assert from "node:assert/strict";
import test from "node:test";
import * as cheerio from "cheerio";
import { analyzeMetadataQuality, analyzePageResponse, buildEntityAnalysis, buildMetadataAnalysis, selectRepresentativeUrls, validateSchema } from "../src/lib/siteAudit.js";
import { PROFILE_WEIGHTS, profileAwareScore } from "../src/lib/scoring.js";
import { decodeHtmlText, isTransientFailure, networkFailurePhase, normalizeObfuscatedContacts } from "../src/lib/scanner.js";

test("profile weights are normalized to 100", () => {
  for (const weights of Object.values(PROFILE_WEIGHTS)) {
    assert.equal(Object.values(weights).reduce((sum, value) => sum + value, 0), 100);
  }
});

test("unmeasured performance and accessibility do not lower profile score", () => {
  const score = profileAwareScore({
    crawlability: 80,
    technicalSeo: 80,
    contentReadiness: 80,
    entityConfidence: 80,
    performance: null,
    accessibility: null,
    agentReadiness: 80,
  }, "saas");
  assert.equal(score, 80);
});

test("representative URL selection covers important page roles", () => {
  const base = "https://example.com/";
  const urls = selectRepresentativeUrls(base, [
    "https://example.com/about",
    "https://example.com/contact",
    "https://example.com/services/seo",
    "https://example.com/blog/first-post",
    "https://example.com/pricing",
    "https://example.com/faq",
    "https://example.com/locations/london",
  ]);
  assert.ok(urls.includes(base));
  assert.ok(urls.some((url) => url.includes("/services/")));
  assert.ok(urls.some((url) => url.includes("/blog/")));
  assert.ok(urls.some((url) => url.includes("/locations/")));
});

test("schema validation reports malformed JSON and missing required fields", () => {
  const $ = cheerio.load(`
    <html><body><h1>Widget</h1>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product"}</script>
      <script type="application/ld+json">{"broken":</script>
    </body></html>
  `);
  const result = validateSchema($, "https://example.com/product", "Widget");
  assert.equal(result.invalid.length, 1);
  assert.ok(result.issues.some((issue) => issue.type === "Product" && issue.missingRequired.includes("name")));
  assert.ok(result.score < 70);
});

test("page comparison identifies JavaScript-dependent content and canonical conflicts", () => {
  const response = {
    status: 200,
    finalUrl: "https://example.com/product",
    redirectChain: ["https://example.com/old-product"],
    headers: { "x-robots-tag": "" },
    data: `<html><head><title>Product</title><meta name="description" content="A useful product"><link rel="canonical" href="https://example.com/canonical"></head><body><h1>Product</h1><p>Short raw copy here.</p></body></html>`,
  };
  const rendered = { title: "Product", html: "<html><body>rendered</body></html>", text: Array.from({ length: 100 }, (_, index) => `word${index}`).join(" ") };
  const page = analyzePageResponse(response, response.finalUrl, rendered);
  assert.equal(page.canonicalConflict, true);
  assert.ok(page.rendered.jsDependentPercent > 90);
  assert.ok(page.findings.some((finding) => finding.check === "JavaScript dependency"));
});

test("soft 404 and noindex pages are not treated as indexable", () => {
  const page = analyzePageResponse({
    status: 200,
    finalUrl: "https://example.com/missing",
    redirectChain: [],
    headers: { "x-robots-tag": "noindex" },
    data: "<html><head><title>404 - Page not found</title></head><body><h1>Page not found</h1></body></html>",
  }, "https://example.com/missing");
  assert.equal(page.soft404, true);
  assert.equal(page.indexable, false);
  assert.ok(page.findings.some((finding) => finding.check === "Indexability"));
});

function entityPage(url, { name, address, phone, sameAs = [], relationship = true }) {
  const graph = [
    { "@type": "Organization", "@id": "https://example.com/#org", name, url: "https://example.com", address, telephone: phone, sameAs },
    ...(relationship ? [{ "@type": "Service", name: "Audit", provider: { "@id": "https://example.com/#org" } }] : []),
  ];
  return analyzePageResponse({
    status: 200,
    finalUrl: url,
    redirectChain: [],
    headers: {},
    data: `<html><head><title>Audit | ${name}</title><meta name="description" content="Audit"><meta property="og:site_name" content="${name}"></head><body><h1>Audit</h1><address>${address}</address><a href="tel:${phone}">${phone}</a><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script></body></html>`,
  }, url);
}

test("all four entity checks pass for a consistent connected local business", () => {
  const pages = [
    entityPage("https://example.com/", { name: "Acme Dental", address: "10 King Street, London", phone: "+44 20 1234 5678", sameAs: ["https://www.linkedin.com/company/acme-dental"] }),
    entityPage("https://example.com/contact", { name: "Acme Dental", address: "10 King Street, London", phone: "+44 20 1234 5678", sameAs: ["https://www.linkedin.com/company/acme-dental"] }),
  ];
  const result = buildEntityAnalysis(pages, "local_business");
  assert.equal(result.entityIdentity.status, "pass");
  assert.equal(result.entityConnections.status, "pass");
  assert.equal(result.brandNameConsistency.status, "pass");
  assert.equal(result.napConsistency.status, "pass");
  assert.equal(result.napConsistency.conflicts.length, 0);
});

test("brand and NAP conflicts are reported across pages", () => {
  const pages = [
    entityPage("https://example.com/", { name: "Acme Dental", address: "10 King Street, London", phone: "+44 20 1234 5678" }),
    entityPage("https://example.com/contact", { name: "Acme Dentistry Group", address: "99 Queen Road, London", phone: "+44 20 9999 0000" }),
  ];
  const result = buildEntityAnalysis(pages, "local_business");
  assert.equal(result.brandNameConsistency.conflicting, true);
  assert.deepEqual(result.napConsistency.conflicts.map((item) => item.field).sort(), ["address", "name", "phone"]);
  assert.ok(result.napConsistency.score < 60);
});

test("logo alt text is not treated as a brand conflict and SaaS identity does not require NAP", () => {
  const url = "https://example.com/";
  const graph = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://example.com/#organization",
    name: "ScanSiteAI",
    url,
    sameAs: ["https://www.linkedin.com/company/scansiteai"],
  };
  const page = analyzePageResponse({
    status: 200,
    finalUrl: url,
    redirectChain: [],
    headers: {},
    data: `<html><head><title>AI Website Scanner | ScanSiteAI</title><meta property="og:site_name" content="ScanSiteAI"></head><body><header><img class="logo" alt="ScanSiteAI logo"></header><h1>AI Website Scanner</h1><script type="application/ld+json">${JSON.stringify(graph)}</script></body></html>`,
  }, url);
  const result = buildEntityAnalysis([page], "saas");
  assert.deepEqual(result.brandNameConsistency.variants.map((item) => item.value), ["ScanSiteAI"]);
  assert.equal(result.brandNameConsistency.status, "pass");
  assert.equal(result.entityIdentity.score, 100);
  assert.equal(result.entityIdentity.status, "pass");
  assert.equal(result.napConsistency.status, "not_applicable");
});

test("metadata quality detects generic, short, stuffed, misaligned, and truncated values", () => {
  const result = analyzeMetadataQuality({
    title: "Welcome",
    description: "Furniture furniture furniture furniture furniture furniture furniture furniture furniture furniture furniture furniture furniture furniture furniture furniture furniture furniture...",
    h1: ["Professional Dental Care"],
    text: "Dental clinicians provide preventive care and oral health treatments.",
  });
  assert.equal(result.title.generic, true);
  assert.equal(result.checks.titleUsefulLength, false);
  assert.equal(result.checks.titleAligned, false);
  assert.ok(result.description.stuffing.length > 0);
  assert.equal(result.description.truncated, true);
  assert.equal(result.checks.descriptionRelevant, false);
});

test("cross-page metadata analysis marks duplicate titles and descriptions on affected URLs", () => {
  const html = `<html><head><title>Furniture Collection | Acme</title><meta name="description" content="Explore the Acme furniture collection with delivery, materials, dimensions, finishes, availability, care information, and pricing."></head><body><h1>Furniture Collection</h1><p>Explore furniture materials, dimensions, finishes, delivery, availability, care information, and pricing for the full Acme collection.</p></body></html>`;
  const pages = ["https://example.com/one", "https://example.com/two"].map((url) => analyzePageResponse({ status: 200, finalUrl: url, redirectChain: [], headers: {}, data: html }, url));
  const result = buildMetadataAnalysis(pages);
  assert.equal(result.duplicateTitles.length, 1);
  assert.equal(result.duplicateDescriptions.length, 1);
  assert.ok(pages.every((page) => page.findings.some((item) => item.check === "Duplicate title")));
  assert.ok(pages.every((page) => page.metadataQuality.uniqueness.pageSpecific === false));
});

test("ordinary prose containing at does not become a false email", () => {
  const prose = "Come in with a friend and make yourself at home. We are excited to welcome you.";
  assert.equal(normalizeObfuscatedContacts(prose).includes("yourself@home.we"), false);
  assert.equal(normalizeObfuscatedContacts("hello at example dot com"), "hello@example.com");
  assert.equal(normalizeObfuscatedContacts("hello [at] example [dot] com"), "hello@example.com");
});

test("HTML entities are decoded in detected company names", () => {
  assert.equal(decodeHtmlText("Beans &amp; Brews"), "Beans & Brews");
});

test("temporary HTTP and network failures are eligible for bounded retry", () => {
  for (const status of [408, 429, 502, 503, 504]) assert.equal(isTransientFailure(status), true);
  for (const status of [400, 401, 403, 404, 500]) assert.equal(isTransientFailure(status), false);
  for (const code of ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"]) assert.equal(isTransientFailure({ code }), true);
});

test("network failures are classified by actionable stage", () => {
  assert.equal(networkFailurePhase({ code: "ENOTFOUND", message: "getaddrinfo failed" }), "dns");
  assert.equal(networkFailurePhase({ code: "CERT_HAS_EXPIRED", message: "certificate expired" }), "tls");
  assert.equal(networkFailurePhase({ code: "ECONNREFUSED", message: "connect refused" }), "connection");
  assert.equal(networkFailurePhase({ code: "ETIMEDOUT", message: "timeout" }), "response");
});
