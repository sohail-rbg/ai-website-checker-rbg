import { Geist_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { contactEmail, defaultDescription, defaultKeywords, siteName, siteUrl } from "./seo";
import siteSchema from "../lib/siteSchema.cjs";
import "./globals.css";

const { buildSiteJsonLd } = siteSchema;

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
  const jsonLd = buildSiteJsonLd({ siteUrl, siteName, contactEmail, defaultDescription });

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
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-B55C4PTHMN" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-B55C4PTHMN');
          `}
        </Script>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
