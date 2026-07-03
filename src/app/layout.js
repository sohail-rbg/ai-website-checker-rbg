import { Geist_Mono, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { contactEmail, defaultDescription, defaultKeywords, siteName, siteUrl } from "./seo";
import "./globals.css";

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
    default: "ScanSiteAI | AI Website Readiness Checker and LLM Search Audit",
    template: "%s | ScanSiteAI",
  },
  description: defaultDescription,
  keywords: defaultKeywords,
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName,
    title: "ScanSiteAI - AI Website Readiness Checker",
    description: defaultDescription,
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "ScanSiteAI website readiness checker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScanSiteAI - AI Website Readiness Checker",
    description: defaultDescription,
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
        name: siteName,
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        email: contactEmail,
        sameAs: [siteUrl],
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
        description: defaultDescription,
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
        description: defaultDescription,
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
        description: defaultDescription,
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
        headline: "How ScanSiteAI evaluates LLM visibility",
        author: {
          "@id": `${siteUrl}/#founder`,
        },
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
        mainEntityOfPage: siteUrl,
        description: defaultDescription,
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What does ScanSiteAI analyze?",
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
