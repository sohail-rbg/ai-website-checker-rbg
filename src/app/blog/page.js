import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import SiteFooter from "../_components/SiteFooter";
import SiteHeader from "../_components/SiteHeader";
import styles from "../page.module.css";
import { createPageMetadata, pageTitles } from "../seo";
import { blogPosts } from "./posts";

export const metadata = createPageMetadata({
  title: pageTitles.blog,
  description:
    "Practical ScanSiteAI guides for AI website readiness, LLM SEO audits, ChatGPT visibility, AI Overviews, schema and answer-engine optimization.",
  path: "/blog",
  keywords: [
    "AI search blog",
    "LLM SEO articles",
    "schema strategy",
    "AI content optimization",
    "AI website readiness checker",
    "answer engine optimization checklist",
  ],
});

export default function BlogPage() {
  return (
    <main className={`${styles.shell} min-h-screen overflow-hidden px-5 py-6 text-[#f5f7f4] sm:px-8`}>
      <div className={`${styles.heroGrid} pointer-events-none fixed inset-0`} />
      <section className={`${styles.pageContainer} relative z-10 mx-auto`}>
        <SiteHeader className="mx-auto w-full" />

        <section className="grid gap-10 py-14 lg:grid-cols-[minmax(0,0.86fr)_minmax(320px,0.5fr)] lg:items-end lg:py-20">
          <div>
            <p className={styles.publicEyebrow}>
              <Sparkles size={16} strokeWidth={1.9} aria-hidden="true" />
              AI Search Blog
            </p>
            <h1 className={`${styles.heroTitle} mt-6 max-w-4xl text-5xl font-semibold leading-[1.04] text-white sm:text-6xl lg:text-7xl`}>
              AI search visibility guides for modern websites.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#d9e1d8]/76">
              Learn how to improve AI website readiness, LLM SEO, ChatGPT visibility, Google AI Overview readiness, schema markup, crawler access and answer-engine content.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#9fe0a8] px-5 text-sm font-extrabold text-[#020302] transition hover:bg-[#b8f4bf]">
                Run a free scan
                <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link href="/resources" className="inline-flex min-h-12 items-center rounded-full border border-[#90ee9a]/25 px-5 text-sm font-bold text-[#d9e1d8] transition hover:border-[#90ee9a]/50 hover:bg-[#90ee9a]/10">
                View resources
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-[#8B9C8C]/14 bg-[linear-gradient(145deg,rgba(13,26,21,.9),rgba(2,3,2,.88))] p-7 shadow-[0_24px_70px_rgba(0,0,0,.28)]">
            <BookOpen className="text-[#90ee9a]" size={32} strokeWidth={1.7} aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-semibold text-white">Focused pages, not thin placeholders.</h2>
            <p className="mt-3 text-sm leading-7 text-[#d9e1d8]/68">
              Each guide targets one search intent and links readers to related AI readiness topics, documentation and the live scanner.
            </p>
          </aside>
        </section>

        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post, index) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className={`group relative overflow-hidden rounded-[1.7rem] border border-[#8B9C8C]/14 bg-[#07100e]/72 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] transition hover:-translate-y-1 hover:border-[#90ee9a]/32 hover:bg-[#90ee9a]/[.045] ${
                index === 0 ? "md:col-span-2" : ""
              }`}
            >
              <div className="pointer-events-none absolute right-[-4rem] top-[-5rem] size-44 rounded-full bg-[#90ee9a]/8 blur-3xl transition group-hover:bg-[#90ee9a]/14" />
              <span className="relative text-xs font-bold uppercase tracking-[0.18em] text-[#90ee9a]/70">{post.eyebrow}</span>
              <h2 className="relative mt-4 text-2xl font-bold leading-tight text-white">{post.title}</h2>
              <p className="relative mt-4 text-sm leading-7 text-[#d9e1d8]/68">{post.summary}</p>
              <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#9fe0a8]">
                Read guide
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-10 flex flex-col gap-5 rounded-[2rem] border border-[#8B9C8C]/14 bg-[linear-gradient(135deg,rgba(46,94,83,.24),rgba(3,7,6,.82))] p-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8B9C8C]">Want your own report?</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Run a live AI readiness scan and find your priority fixes.</h2>
          </div>
          <Link href="/" className="inline-flex w-fit items-center gap-3 rounded-full bg-[#9fe0a8] px-5 py-3 text-sm font-bold text-[#020302] transition hover:bg-[#b8f4bf]">
            Analyze Website
            <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
          </Link>
        </section>

        <SiteFooter className="mx-auto mt-12 w-full pb-2" />
      </section>
    </main>
  );
}
