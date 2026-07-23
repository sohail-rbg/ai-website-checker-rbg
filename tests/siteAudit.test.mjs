import assert from "node:assert/strict";
import test from "node:test";
import * as cheerio from "cheerio";
import { analyzeMetadataQuality, analyzePageResponse, buildEntityAnalysis, buildMetadataAnalysis, selectRepresentativeUrls, validateSchema } from "../src/lib/siteAudit.js";
import { PROFILE_WEIGHTS, profileAwareScore } from "../src/lib/scoring.js";
import { decodeHtmlText, detectIncompleteJavascriptShell, detectNonOperationalHomepage, extractEntities, isTransientFailure, networkFailurePhase, normalizeEmail, normalizeObfuscatedContacts, validateLighthouseResult } from "../src/lib/scanner.js";
import { resolvePublicOrigin } from "../src/lib/publicOrigin.js";
import { summarizeInspection, urlBelongsToSearchConsoleProperty } from "../src/lib/externalVerification.js";

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
  assert.equal(networkFailurePhase({ code: "EBUSY", message: "getaddrinfo EBUSY example.com" }), "dns");
  assert.equal(networkFailurePhase({ code: "CERT_HAS_EXPIRED", message: "certificate expired" }), "tls");
  assert.equal(networkFailurePhase({ code: "ECONNREFUSED", message: "connect refused" }), "connection");
  assert.equal(networkFailurePhase({ code: "ETIMEDOUT", message: "timeout" }), "response");
});

test("hosted report links prefer the configured public origin and reject localhost", () => {
  const request = {
    url: "http://localhost:3000/api/email",
    headers: { get: (name) => name === "origin" ? "http://localhost:3000" : null },
  };
  assert.equal(resolvePublicOrigin(request, { NEXT_PUBLIC_SITE_URL: "https://scansiteai.com/" }), "https://scansiteai.com");
  assert.equal(resolvePublicOrigin(request, {}), "https://scansiteai.com");
});

test("reserved, parked, expired, and soft-404 homepages are rejected before scoring", () => {
  const cases = [
    ["https://example.com/", "<title>Example Domain</title><body>This domain is for use in illustrative examples in documents.</body>"],
    ["https://parked.test/", "<title>Domain for sale</title><body>Buy this domain and make an offer today.</body>"],
    ["https://expired.test/", "<title>Domain expired</title><body>This domain has expired. Renew your domain.</body>"],
    ["https://missing.test/", "<title>404 Not Found</title><body><h1>Page not found</h1></body>"],
  ];
  for (const [url, html] of cases) assert.ok(detectNonOperationalHomepage(cheerio.load(html), url, 200));
  const valid = cheerio.load("<title>Acme Dental</title><body><h1>Dental care</h1><p>Our licensed clinical team provides preventive, restorative, and emergency dental treatment for families in London. Book an appointment or review our services, credentials, fees, and patient information.</p></body>");
  assert.equal(detectNonOperationalHomepage(valid, "https://acme.test/", 200), "");
});

test("incomplete Lighthouse reports are not presented as real zero scores", () => {
  const allZero = { lhr: { categories: { performance: { score: 0 }, accessibility: { score: 0 }, seo: { score: 0 }, "best-practices": { score: 0 } } } };
  const runtimeFailure = { lhr: { runtimeError: { code: "ERRORED_DOCUMENT_REQUEST", message: "Page load failed" }, categories: { performance: { score: 0 } } } };
  const measured = { lhr: { categories: { performance: { score: 0.62 }, accessibility: { score: 0.9 }, seo: { score: 0.84 }, "best-practices": { score: 0.78 } } } };
  assert.equal(validateLighthouseResult(allZero).valid, false);
  assert.equal(validateLighthouseResult(runtimeFailure).valid, false);
  assert.equal(validateLighthouseResult(measured).valid, true);
});

test("empty JavaScript application shells are rejected before scoring", () => {
  const explicitShell = cheerio.load("<html><body><noscript>You need to enable JavaScript to run this app.</noscript><div id='root'></div><script src='/app.js'></script></body></html>");
  const emptyShell = cheerio.load("<html><body><div id='root'></div><script type='module' src='/app.js'></script></body></html>");
  const realPage = cheerio.load("<html><body><main><h1>Brand strategy services</h1><p>We help growing companies clarify their positioning and visual identity.</p></main><script src='/app.js'></script></body></html>");
  const renderedApp = cheerio.load(`<html><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"><main><h1>Digital branding agency</h1><p>${"Real rendered website content ".repeat(50)}</p></main></div><script src="/app.js"></script></body></html>`);
  assert.equal(detectIncompleteJavascriptShell(explicitShell).incomplete, true);
  assert.equal(detectIncompleteJavascriptShell(emptyShell).incomplete, true);
  assert.equal(detectIncompleteJavascriptShell(realPage).incomplete, false);
  assert.equal(detectIncompleteJavascriptShell(renderedApp).incomplete, false);
});

test("entity extraction keeps contact fields separate and returns clean service lists", () => {
  const $ = cheerio.load(`<html><body>
    <header><img src="/logo.png" alt="ReBrand Gurus"></header>
    <a href="mailto:info@rebrandgurus.com">Email Usinfo@rebrandgurus.com</a><span>Location</span>
    <a href="tel:+14353950079">+1 (435) 395-0079</a>
    <address>ReBrand Gurus International LLC, PO Box 980457, Park City, Utah 84098</address>
    <a href="/service/web-design"><h4>Website Design</h4><div>Crafting visually appealing and highly functional websites tailored to business growth.</div></a><a href="/service/seo"><h4>SEO</h4><div>Optimizing website content and structure for search engines.</div></a>
    <a href="/services">Services</a><h2>Mobile App Creating intuitive and engaging mobile applications for iOS and Android platforms to meet specific business needs and boost customer engagement.</h2>
  </body></html>`);
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const entities = extractEntities($, { title: "Digital Branding and Creative Agency in Utah" }, text, "https://rebrandgurus.com/", "homepage");
  assert.equal(normalizeEmail("usinfo@rebrandgurus.comlocationrebrand"), "usinfo@rebrandgurus.com");
  assert.equal(entities.companyName, "ReBrand Gurus");
  assert.deepEqual(entities.emails, ["info@rebrandgurus.com"]);
  assert.deepEqual(entities.services, ["Website Design", "SEO"]);
  assert.deepEqual(entities.products, []);
  assert.match(entities.address, /PO Box 980457/);
  assert.equal(entities.hasSchemaEntity, false);
  assert.equal(entities.score, 85);
});

test("Search Console property scope prevents unrelated client URL inspection", () => {
  assert.equal(urlBelongsToSearchConsoleProperty("https://scansiteai.com/about", "sc-domain:scansiteai.com"), true);
  assert.equal(urlBelongsToSearchConsoleProperty("https://www.scansiteai.com/about", "sc-domain:scansiteai.com"), true);
  assert.equal(urlBelongsToSearchConsoleProperty("https://rebrandgurus.com/", "sc-domain:scansiteai.com"), false);
  assert.equal(urlBelongsToSearchConsoleProperty("https://example.com/blog/post", "https://example.com/blog/"), true);
  assert.equal(urlBelongsToSearchConsoleProperty("https://example.com/about", "https://example.com/blog/"), false);
});

test("Search Console inspection summary preserves index evidence", () => {
  const summary = summarizeInspection({
    indexStatusResult: {
      verdict: "PASS",
      coverageState: "Submitted and indexed",
      pageFetchState: "SUCCESSFUL",
      crawledAs: "MOBILE",
      googleCanonical: "https://scansiteai.com/",
    },
    mobileUsabilityResult: { verdict: "PASS" },
    richResultsResult: { verdict: "PASS", detectedItems: [{ richResultType: "FAQ" }] },
  });
  assert.equal(summary.verdict, "PASS");
  assert.equal(summary.coverageState, "Submitted and indexed");
  assert.equal(summary.googleCanonical, "https://scansiteai.com/");
  assert.equal(summary.mobileVerdict, "PASS");
  assert.equal(summary.detectedRichResultItems.length, 1);
});
