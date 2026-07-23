import { ArrowRight, Quote, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import SiteFooter from "../_components/SiteFooter";
import SiteHeader from "../_components/SiteHeader";
import styles from "../page.module.css";
import { createPageMetadata, pageTitles } from "../seo";

const testimonials = [
  {
    name: "James T.",
    role: "Small Business Owner",
    location: "Denver, CO",
    quote:
      "I always used to wonder how to rank my website in AI search; now, finally, someone has provided me with the solution. This is an amazing tool to identify the missing links on my website. The report explained everything in plain English, no confusing jargon. Fixed two things the same day and already feel better about my site.",
  },
  {
    name: "David C.",
    role: "Freelance Consultant",
    location: "Chicago, IL",
    quote:
      "Amazing tool, I must say. What I liked most was that it didn't just throw a score at me and leave. Every issue came with a reason and a fix. Felt like getting advice from someone who actually knows what they're talking about, not just a random tool. You made my work easy and quick. Loved it!!",
  },
  {
    name: "Mike R.",
    role: "Agency Owner",
    location: "Tampa, FL",
    quote:
      "We've been telling clients AI search matters, but we never had an easy way to show them proof. This is an amazing tool which simplify things for me. Now I run this scan first, and it makes the conversation so much easier. Simple enough that clients understand it without me explaining for an hour.",
  },
  {
    name: "Laura B.",
    role: "Founder",
    location: "Seattle, WA",
    quote:
      "I was skeptical at first, thinking it would just be another SEO tool with a new name. It's genuinely different. I had little idea of AI, so after running this tool, I discovered my site was blocking some AI crawlers without my knowing. I couldn't figure it out on my own.",
  },
  {
    name: "Tom W.",
    role: "Real Estate Broker",
    location: "Charlotte, NC",
    quote:
      "I'm not techy at all, so I expected to be confused within two minutes. Wasn't the case. The report read like plain instructions, not a bunch of technical terms I'd have to Google.",
  },
];

export const metadata = createPageMetadata({
  title: pageTitles.testimonials,
  description: "Read testimonials from business owners, consultants, agencies and founders using ScanSiteAI to improve AI search readiness.",
  path: "/testimonials",
  keywords: ["ScanSiteAI testimonials", "AI website checker reviews", "AI search readiness testimonials", "LLM audit feedback"],
});

export default function TestimonialsPage() {
  return (
    <main className={`${styles.shell} min-h-screen overflow-hidden px-5 py-6 text-[#f5f7f4] sm:px-8`}>
      <div className={`${styles.heroGrid} pointer-events-none fixed inset-0`} />
      <section className={`${styles.pageContainer} relative z-10 mx-auto`}>
        <SiteHeader className="mx-auto w-full" />

        <section className="grid gap-10 py-14 lg:grid-cols-[minmax(0,0.86fr)_minmax(320px,0.5fr)] lg:items-end lg:py-20">
          <div>
            <p className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#8B9C8C]">
              <Sparkles size={16} strokeWidth={1.9} className="text-[#90ee9a]" aria-hidden="true" />
              Testimonials
            </p>
            <h1 className={`${styles.heroTitle} mt-6 max-w-4xl text-5xl font-semibold leading-[1.04] text-white sm:text-6xl lg:text-7xl`}>
              Website owners are finding their AI visibility gaps faster.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d9e1d8]/72">
              ScanSiteAI turns crawler, schema, content and trust issues into plain-language next steps that teams can act on.
            </p>
          </div>

          <aside className="rounded-[2rem] border border-[#8B9C8C]/14 bg-[linear-gradient(145deg,rgba(13,26,21,.9),rgba(2,3,2,.88))] p-7 shadow-[0_24px_70px_rgba(0,0,0,.28)]">
            <div className="flex gap-2 text-[#90ee9a]">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} size={20} fill="currentColor" strokeWidth={1.6} aria-hidden="true" />
              ))}
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-white">Plain-English reports. Practical fixes.</h2>
            <p className="mt-3 text-sm leading-7 text-[#d9e1d8]/68">
              Built for founders, agencies and business owners who need clarity around AI search without traditional SEO noise.
            </p>
          </aside>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {testimonials.map((item, index) => (
            <article
              key={`${item.name}-${item.location}`}
              className={`relative overflow-hidden rounded-[1.7rem] border border-[#8B9C8C]/14 bg-[#07100e]/72 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] sm:p-7 ${
                index === 0 ? "lg:col-span-2 lg:grid lg:grid-cols-[0.38fr_1fr] lg:gap-8 lg:p-8" : ""
              }`}
            >
              <div className="pointer-events-none absolute right-[-4rem] top-[-5rem] size-44 rounded-full bg-[#90ee9a]/8 blur-3xl" />
              <div className="relative">
                <span className="grid size-12 place-items-center rounded-2xl border border-[#90ee9a]/22 bg-[#90ee9a]/8 text-[#90ee9a]">
                  <Quote size={24} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-xl font-semibold text-white">{item.name}</h2>
                <p className="mt-1 text-sm font-semibold text-[#9fe0a8]">{item.role}</p>
                <p className="mt-1 text-sm text-[#d9e1d8]/52">{item.location}</p>
              </div>
              <p className="relative mt-6 text-base leading-8 text-[#d9e1d8]/78 lg:mt-0">
                {item.quote}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 flex flex-col gap-5 rounded-[2rem] border border-[#8B9C8C]/14 bg-[linear-gradient(135deg,rgba(46,94,83,.24),rgba(3,7,6,.82))] p-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8B9C8C]">Ready to check your site?</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Run a live AI readiness scan in minutes.</h2>
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
