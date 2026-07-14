const assert = require("node:assert/strict");
const test = require("node:test");
const { buildSiteJsonLd } = require("../src/lib/siteSchema.cjs");

const schema = buildSiteJsonLd({
  siteUrl: "https://scansiteai.com",
  siteName: "ScanSiteAI",
  contactEmail: "info@scansiteai.com",
  defaultDescription: "AI website readiness checker",
});

function graphNode(type) {
  return schema["@graph"].find((node) => {
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    return types.includes(type);
  });
}

test("Product schema includes a valid free offer for Google product snippets", () => {
  const product = graphNode("Product");

  assert.ok(product, "Product node should exist");
  assert.equal(product.offers["@type"], "Offer");
  assert.equal(product.offers.price, "0");
  assert.equal(product.offers.priceCurrency, "USD");
  assert.equal(product.offers.url, "https://scansiteai.com");
});

test("Service and Product nodes are top-level related graph entities", () => {
  const service = graphNode("Service");
  const product = graphNode("Product");

  assert.ok(service, "Service node should exist");
  assert.equal(service["@id"], "https://scansiteai.com/#service");
  assert.deepEqual(product.isRelatedTo, [
    { "@id": "https://scansiteai.com/#webapp" },
    { "@id": "https://scansiteai.com/#service" },
  ]);
});

test("Organization exposes contact and service relationship signals", () => {
  const organization = graphNode("Organization");

  assert.ok(organization, "Organization node should exist");
  assert.equal(organization.email, "info@scansiteai.com");
  assert.equal(organization.makesOffer["@id"], "https://scansiteai.com/#service");
  assert.equal(organization.contactPoint[0].email, "info@scansiteai.com");
});
