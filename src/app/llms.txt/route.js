const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ai-website-checker.vercel.app";

export function GET() {
  const body = `# ScanSiteAI

ScanSiteAI is a live technical audit tool for AI search and LLM visibility.

## Purpose
The application analyzes whether ChatGPT, Claude, Gemini, Perplexity, Google AI Overview, Microsoft Copilot and other answer engines can crawl, understand, reference and recommend a website.

## Primary URLs
- Homepage and scanner: ${siteUrl}
- Sitemap: ${siteUrl}/sitemap.xml
- Robots policy: ${siteUrl}/robots.txt
- FAQ: ${siteUrl}/faq
- Contact: ${siteUrl}/contact

## Capabilities
- robots.txt and AI crawler access analysis
- sitemap.xml validation
- metadata and canonical analysis
- JSON-LD and microdata schema detection
- heading, image and internal link analysis
- content readability, FAQ and definition detection
- EEAT and entity signal extraction
- Lighthouse performance scoring when enabled
- email delivery of complete readiness reports

## Contact
Email: info@scansiteai.com
Provider: ScanSiteAI
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
