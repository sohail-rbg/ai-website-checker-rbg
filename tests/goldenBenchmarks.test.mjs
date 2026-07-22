import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzePageResponse, buildEntityAnalysis } from "../src/lib/siteAudit.js";
import { calculatePlatformReadiness } from "../src/lib/scanner.js";

const root = dirname(fileURLToPath(import.meta.url));
const benchmark = JSON.parse(readFileSync(join(root, "benchmarks", "sites.json"), "utf8"));
const fixture = (name) => readFileSync(join(root, "fixtures", "golden", name), "utf8");
const response = (url, data) => ({ status: 200, finalUrl: url, redirectChain: [], headers: {}, data });

test("golden benchmark manifest has a calibration version and expected outcomes", () => {
  assert.match(benchmark.version, /^\d{4}\.\d{2}/);
  assert.ok(benchmark.cases.length >= 3);
  assert.ok(benchmark.cases.every((item) => item.profile && item.expected));
});

test("strong local-business fixture produces consistent entity evidence", () => {
  const page = analyzePageResponse(response("https://local.example/", fixture("strong-local.html")), "https://local.example/");
  const entities = buildEntityAnalysis([page], "local_business");
  assert.equal(page.indexable, true);
  assert.equal(entities.entityIdentity.status, "pass");
  assert.equal(entities.brandNameConsistency.status, "pass");
  assert.equal(entities.napConsistency.status, "pass");
});

test("broken fixture produces reproducible noindex, soft-404, canonical, and schema failures", () => {
  const page = analyzePageResponse(response("https://broken.example/missing", fixture("broken-page.html")), "https://broken.example/missing");
  assert.equal(page.indexable, false);
  assert.equal(page.soft404, true);
  assert.equal(page.canonicalConflict, true);
  assert.equal(page.schema.invalid.length, 1);
});

test("raw/rendered benchmark identifies schema injected by JavaScript", () => {
  const renderedHtml = fixture("rendered-catalog.html");
  const page = analyzePageResponse(response("https://js.example/catalog", fixture("raw-js-shell.html")), "https://js.example/catalog", {
    html: renderedHtml,
    text: "Explore the Oak Table collection with solid wood construction delivery information dimensions finishes care instructions availability and pricing for every product configuration.",
    title: "Catalog | Acme",
  });
  assert.deepEqual(page.schemaComparison.addedAfterJavaScript, ["Product", "Offer"]);
  assert.equal(page.schemaComparison.consistent, false);
  assert.ok(page.findings.some((item) => item.check === "Rendered-only schema"));
});

test("template retailer benchmark does not confuse visible brand text with organization schema or strong Claude readiness", () => {
  const page = analyzePageResponse(response("https://retailer.example/", fixture("template-retailer.html")), "https://retailer.example/");
  const entityAnalysis = buildEntityAnalysis([page], "ecommerce");
  assert.equal(page.schema.score, 0);
  assert.ok(page.contentEvidence.genericPhrases.length > 0);
  assert.ok(page.contentEvidence.placeholderTestimonials.length > 0);
  const readiness = calculatePlatformReadiness({
    pages: [page], entityAnalysis,
    categoryScores: {
      crawlability: { measured: true, score: 90 },
      contentReadiness: { measured: true, score: page.contentEvidence.score },
      entityConfidence: { measured: true, score: entityAnalysis.entityIdentity.score },
    },
    contentAnalysis: { trustEvidenceScore: page.contentEvidence.trustScore },
    metadataAnalysis: { score: page.metadataQuality.score },
    confidence: { level: "medium" },
  });
  const claude = readiness.find((item) => item.platform === "Claude");
  assert.notEqual(claude.tier, "Strong");
  assert.equal(claude.signals.find((item) => item.label === "Brand mentioned in visible content").status, "pass");
  assert.equal(claude.signals.find((item) => item.label === "Organization schema present").status, "fail");
});
