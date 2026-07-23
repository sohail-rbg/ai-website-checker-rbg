function buildSiteJsonLd({ siteUrl, siteName, contactEmail, defaultDescription }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
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
        applicationSubCategory: "AI website readiness checker",
        operatingSystem: "Web",
        url: siteUrl,
        description: defaultDescription,
        mainEntityOfPage: siteUrl,
        offers: {
          "@type": "Offer",
          url: siteUrl,
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/OnlineOnly",
        },
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
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "Is this the same as regular SEO?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Regular SEO helps you rank higher on Google. This tool checks whether AI tools like ChatGPT and Gemini can understand your website well enough to use it in an answer.",
            },
          },
          {
            "@type": "Question",
            name: "Can I get my results by email?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Once your scan is complete, enter your email and you will receive the complete report with the option to request a strategy call.",
            },
          },
          {
            "@type": "Question",
            name: "What does it mean if AI tools cannot read my website?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "It means AI tools may skip your site when answering questions, usually because of unclear content, missing trust signals or technical settings that limit discovery.",
            },
          },
          {
            "@type": "Question",
            name: "Are the platform scores official ratings?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Platform scores are estimates derived from live technical signals such as schema, crawler access, content clarity, EEAT, entities and performance.",
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
