import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, CheckCircle2, HelpCircle, Sparkles } from "lucide-react";
import SiteFooter from "../../_components/SiteFooter";
import SiteHeader from "../../_components/SiteHeader";
import styles from "../../page.module.css";
import { createPageMetadata, siteName, siteUrl } from "../../seo";
import { blogPosts, getBlogPost } from "../posts";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return {};
  }

  return createPageMetadata({
    title: `${post.title} | ${siteName}`,
    description: post.description,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
  });
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = post.relatedSlugs.map(getBlogPost).filter(Boolean);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${siteUrl}/blog/${post.slug}#article`,
        headline: post.title,
        description: post.description,
        author: {
          "@type": "Organization",
          name: siteName,
          url: siteUrl,
        },
        publisher: {
          "@type": "Organization",
          name: siteName,
          logo: {
            "@type": "ImageObject",
            url: `${siteUrl}/logo.png`,
          },
        },
        mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/blog/${post.slug}#faq`,
        mainEntity: post.faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <main className={`${styles.shell} min-h-screen overflow-hidden px-5 py-6 text-[#f5f7f4] sm:px-8`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className={`${styles.heroGrid} pointer-events-none fixed inset-0`} />
      <section className={`${styles.pageContainer} relative z-10 mx-auto`}>
        <SiteHeader className="mx-auto w-full" />

        <article className="mx-auto max-w-5xl py-14 lg:py-20">
          <Link href="/blog" className={styles.publicBackLink}>
            Back to blog
          </Link>

          <header className="mt-10">
            <p className={styles.publicEyebrow}>
              <Sparkles size={16} strokeWidth={1.9} aria-hidden="true" />
              {post.eyebrow}
            </p>
            <h1 className={`${styles.heroTitle} mt-6 max-w-4xl text-5xl font-semibold leading-[1.04] text-white sm:text-6xl`}>
              {post.title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#d9e1d8]/76">
              {post.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#9fe0a8] px-5 text-sm font-extrabold text-[#020302] transition hover:bg-[#b8f4bf]">
                Run a free scan
                <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link href="/book-demo" className="inline-flex min-h-12 items-center rounded-full border border-[#90ee9a]/25 px-5 text-sm font-bold text-[#d9e1d8] transition hover:border-[#90ee9a]/50 hover:bg-[#90ee9a]/10">
                Book a demo
              </Link>
            </div>
          </header>

          <section className="mt-12 grid gap-5">
            {post.sections.map((section, index) => (
              <section key={section.heading} className="rounded-[1.6rem] border border-[#8B9C8C]/14 bg-white/[.025] p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <span className="mt-1 grid size-10 shrink-0 place-items-center rounded-full border border-[#90ee9a]/20 text-sm font-black text-[#90ee9a]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="text-2xl font-bold leading-tight text-white">{section.heading}</h2>
                    <p className="mt-4 text-base leading-8 text-[#d9e1d8]/76">{section.body}</p>
                    {section.bullets && (
                      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-3 rounded-2xl border border-[#8B9C8C]/14 bg-[#07100e]/56 p-4 text-sm leading-6 text-[#d9e1d8]/78">
                            <CheckCircle2 className="mt-0.5 shrink-0 text-[#90ee9a]" size={18} strokeWidth={1.9} aria-hidden="true" />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </section>

          <section className="mt-10 rounded-[1.8rem] border border-[#8B9C8C]/14 bg-[linear-gradient(145deg,rgba(13,26,21,.86),rgba(2,3,2,.88))] p-6 sm:p-8">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.24em] text-[#8B9C8C]">
              <HelpCircle size={17} strokeWidth={1.9} aria-hidden="true" />
              FAQ
            </p>
            <div className="mt-6 grid gap-4">
              {post.faqs.map((item) => (
                <details key={item.question} className="rounded-2xl border border-[#8B9C8C]/14 bg-white/[.025] p-5">
                  <summary className="cursor-pointer text-lg font-semibold text-white">{item.question}</summary>
                  <p className="mt-3 text-sm leading-7 text-[#d9e1d8]/72">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {relatedPosts.length > 0 && (
            <section className="mt-10">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.24em] text-[#8B9C8C]">
                <BookOpen size={17} strokeWidth={1.9} aria-hidden="true" />
                Related guides
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/blog/${related.slug}`}
                    className="rounded-[1.35rem] border border-[#8B9C8C]/14 bg-white/[.025] p-5 transition hover:-translate-y-1 hover:border-[#90ee9a]/30 hover:bg-[#90ee9a]/[.045]"
                  >
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#90ee9a]/70">{related.eyebrow}</span>
                    <h2 className="mt-3 text-lg font-bold leading-tight text-white">{related.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-[#d9e1d8]/64">{related.summary}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-10 flex flex-col gap-5 rounded-[2rem] border border-[#8B9C8C]/14 bg-[linear-gradient(135deg,rgba(46,94,83,.24),rgba(3,7,6,.82))] p-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8B9C8C]">Ready to check your site?</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Run a live AI readiness scan in minutes.</h2>
            </div>
            <Link href="/" className="inline-flex w-fit items-center gap-3 rounded-full bg-[#9fe0a8] px-5 py-3 text-sm font-bold text-[#020302] transition hover:bg-[#b8f4bf]">
              Analyze Website
              <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
            </Link>
          </section>
        </article>

        <SiteFooter className="mx-auto w-full pb-2" />
      </section>
    </main>
  );
}
