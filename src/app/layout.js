import { Geist_Mono, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://scansiteai.com";
const siteName = "ScanSite AI";
const contactEmail = "info@scansiteai.com";
const description =
  "ScanSite AI audits robots.txt, sitemap.xml, schema, metadata, content clarity, entities, EEAT and performance so AI answer engines can understand your website.";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: "ScanSite AI | AI Website Readiness Checker and LLM Search Audit",
    template: "%s | ScanSite AI",
  },
  description,
  keywords: [
    "ScanSite AI",
    "AI website readiness checker",
    "LLM SEO audit",
    "AI search optimization",
    "ChatGPT website audit",
    "Claude crawler readiness",
    "Google AI Overview optimization",
    "schema audit",
    "robots.txt AI crawlers",
  ],
  authors: [{ name: "Rebrand Gurus", url: "https://rebrandgurus.com" }],
  creator: "Rebrand Gurus",
  publisher: "Rebrand Gurus",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName,
    title: "ScanSite AI - AI Website Readiness Checker",
    description,
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "ScanSite AI website readiness checker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScanSite AI - AI Website Readiness Checker",
    description,
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  category: "technology",
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "LocalBusiness"],
        "@id": `${siteUrl}/#organization`,
        name: "Rebrand Gurus",
        url: "https://rebrandgurus.com",
        logo: `${siteUrl}/logo.png`,
        email: contactEmail,
        sameAs: ["https://rebrandgurus.com"],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "AI readiness audit consultation",
            email: contactEmail,
            availableLanguage: ["English"],
          },
        ],
      },
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}/#webapp`,
        name: siteName,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        provider: {
          "@id": `${siteUrl}/#organization`,
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: siteName,
        applicationCategory: "SEOApplication",
        operatingSystem: "Web",
        description,
        provider: {
          "@id": `${siteUrl}/#organization`,
        },
      },
      {
        "@type": "Service",
        "@id": `${siteUrl}/#service`,
        name: "AI Website Readiness Audit",
        serviceType: "AI search and LLM visibility audit",
        url: siteUrl,
        description: "A technical audit for AI crawler access, structured data, entity recognition, content clarity, EEAT signals and performance.",
        provider: {
          "@id": `${siteUrl}/#organization`,
        },
      },
      {
        "@type": "Product",
        "@id": `${siteUrl}/#product`,
        name: siteName,
        description,
        brand: {
          "@id": `${siteUrl}/#organization`,
        },
      },
      {
        "@type": "Person",
        "@id": `${siteUrl}/#founder`,
        name: "Md Sohail",
        email: contactEmail,
        jobTitle: "SaaS Architect and AI Readiness Consultant",
        worksFor: {
          "@id": `${siteUrl}/#organization`,
        },
      },
      {
        "@type": "Article",
        "@id": `${siteUrl}/#article`,
        headline: "How AI Website Readiness Checker evaluates LLM visibility",
        author: {
          "@id": `${siteUrl}/#founder`,
        },
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
        mainEntityOfPage: siteUrl,
        description,
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What does AI Website Readiness Checker analyze?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "It analyzes crawler access, metadata, structured data, headings, images, links, content clarity, EEAT signals, entity extraction, sitemap coverage and performance signals.",
            },
          },
          {
            "@type": "Question",
            name: "Is this traditional SEO scoring?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. The score is focused on whether AI systems and answer engines can crawl, understand, reference and recommend a website.",
            },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${siteUrl}/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteUrl,
          },
        ],
      },
    ],
  };

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
