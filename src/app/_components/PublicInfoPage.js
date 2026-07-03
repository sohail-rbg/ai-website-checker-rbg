import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, Mail, Sparkles } from "lucide-react";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import styles from "../page.module.css";

export default function PublicInfoPage({ title, eyebrow, description, sections = [] }) {
  return (
    <main className={`${styles.shell} min-h-screen overflow-hidden px-5 py-6 text-[#f5f7f4] sm:px-8`}>
      <div className={`${styles.heroGrid} pointer-events-none fixed inset-0`} />
      <div className={`${styles.pageContainer} relative z-10 mx-auto`}>
        <SiteHeader className="mx-auto w-full" />

        <section className={styles.publicHero}>
          <div>
            <Link href="/" className={styles.publicBackLink}>
              <ArrowLeft size={16} strokeWidth={1.9} aria-hidden="true" />
              Back to checker
            </Link>
            <p className={styles.publicEyebrow}>
              <Sparkles size={16} strokeWidth={1.9} aria-hidden="true" />
              {eyebrow}
            </p>
            <h1 className={`${styles.heroTitle} ${styles.publicTitle}`}>
              {title}
            </h1>
            <p className={styles.publicDescription}>{description}</p>
          </div>

          <aside className={styles.publicSummary}>
            <div className={styles.publicSummaryIcon}>
              <Mail size={24} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h2>Need implementation help?</h2>
            <p>
              Send your scan or book a demo to turn the report into a practical AI visibility roadmap.
            </p>
            <a href="mailto:info@scansiteai.com?subject=AI%20Readiness%20Help">
              Contact ScanSite AI
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </a>
          </aside>
        </section>

        <section className={styles.publicBody}>
          <div className={styles.publicBodyIntro}>
            <span>Overview</span>
            <p>
              Clear, crawlable and trustworthy websites are easier for answer engines to reference. These pages explain how ScanSite AI evaluates and improves that readiness.
            </p>
          </div>

          <div className={styles.publicSections}>
            {sections.map((section, index) => (
              <article key={section.heading} className={styles.publicSection}>
                <div className={styles.publicSectionIndex}>{String(index + 1).padStart(2, "0")}</div>
                <div>
                  <div className={styles.publicSectionHeading}>
                    <span>
                  <BadgeCheck size={19} strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <h2>{section.heading}</h2>
                  </div>
                  <p>{section.copy}</p>
                  {section.items && (
                    <ul>
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.publicCta}>
          <div>
            <p>Ready to test your website?</p>
            <h2>Run a live AI readiness scan and get prioritized fixes.</h2>
          </div>
          <Link href="/">
            Analyze Website
            <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
          </Link>
        </section>

        <SiteFooter className="mx-auto w-full pb-2" />
      </div>
    </main>
  );
}
