function buildSiteJsonLd({ siteUrl, siteName, contactEmail, defaultDescription }) {
  return {
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
        makesOffer: {
          "@id": `${siteUrl}/#service`,
        },
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
        mainEntityOfPage: siteUrl,
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
        mainEntityOfPage: siteUrl,
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
        mainEntityOfPage: siteUrl,
        provider: {
          "@id": `${siteUrl}/#organization`,
        },
      },
      {
        "@type": "Product",
        "@id": `${siteUrl}/#product`,
        name: siteName,
        description: defaultDescription,
        mainEntityOfPage: siteUrl,
        isRelatedTo: [
          { "@id": `${siteUrl}/#webapp` },
          { "@id": `${siteUrl}/#service` },
        ],
        brand: {
          "@id": `${siteUrl}/#organization`,
        },
        offers: {
          "@type": "Offer",
          url: siteUrl,
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/OnlineOnly",
        },
      },
      {
        "@type": "Person",
        "@id": `${siteUrl}/#team`,
        name: "ScanSiteAI Team",
        email: contactEmail,
        jobTitle: "AI Readiness Consultants",
        worksFor: {
          "@id": `${siteUrl}/#organization`,
        },
      },
      {
        "@type": "Article",
        "@id": `${siteUrl}/#article`,
        headline: "How ScanSiteAI evaluates LLM visibility",
        author: {
          "@id": `${siteUrl}/#team`,
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
}

module.exports = { buildSiteJsonLd };
