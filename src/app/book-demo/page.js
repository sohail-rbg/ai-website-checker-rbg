import { CalendarCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { Toaster } from "react-hot-toast";
import SiteFooter from "../_components/SiteFooter";
import SiteHeader from "../_components/SiteHeader";
import styles from "../page.module.css";
import { createPageMetadata, pageTitles } from "../seo";
import DemoForm from "./DemoForm";

export const metadata = createPageMetadata({
  title: pageTitles.bookDemo,
  description: "Book a ScanSiteAI demo to review your AI website readiness score, LLM visibility gaps and recommended fixes.",
  path: "/book-demo",
  keywords: ["book AI readiness demo", "ScanSiteAI demo", "LLM visibility consultation", "AI website audit call"],
});

export default function BookDemoPage() {
  return (
    <main className={styles.shell}>
      <Toaster position="top-right" toastOptions={{ style: { background: "#020617", color: "#fff", border: "1px solid rgba(255,255,255,.14)" } }} />
      <div className={`${styles.heroGrid} pointer-events-none fixed inset-0`} />
      <section className={`${styles.pageContainer} relative z-10 mx-auto px-5 py-8 sm:px-8`}>
        <SiteHeader className="mx-auto mb-12 w-full" />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-3 rounded-full border border-[#8B9C8C]/18 bg-black/30 px-4 py-2 text-sm font-semibold text-[#d9e1d8]">
              <Sparkles size={18} strokeWidth={1.8} className="text-[#90ee9a]" aria-hidden="true" />
              AI readiness strategy call
            </p>
            <h1 className={`${styles.heroTitle} mt-7 text-5xl font-semibold leading-none text-white sm:text-7xl`}>
              Book a ScanSiteAI demo.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d9e1d8]/72">
              Share your details and we will help you understand the highest-impact fixes for AI search visibility, answer-engine trust and LLM crawl readiness.
            </p>

            <div className="mt-9 grid gap-5">
              {[
                [CalendarCheck2, "Fast follow-up", "We review your request and respond with next steps."],
                [ShieldCheck, "Private by default", "Your contact details are only used for this demo request."],
                [Sparkles, "Actionable guidance", "Bring your scan report or website URL and we will prioritize the fixes."],
              ].map(([Icon, title, copy]) => (
                <div key={title} className="flex gap-4 border-l border-[#90ee9a]/30 pl-5">
                  <Icon size={24} strokeWidth={1.8} className="mt-1 shrink-0 text-[#90ee9a]" aria-hidden="true" />
                  <div>
                    <h2 className="font-semibold text-white">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-[#d9e1d8]/62">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DemoForm />
        </div>
      </section>
      <div className={`${styles.pageContainer} relative z-10 mx-auto px-5 pb-8 sm:px-8`}>
        <SiteFooter className="mx-auto w-full" />
      </div>
    </main>
  );
}
