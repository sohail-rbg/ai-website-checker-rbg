"use client";

import Image from "next/image";
import styles from "../page.module.css";

const headerLinks = [
  ["About", "/about"],
  ["Features", "/#features"],
  ["FAQ's", "/#faq-preview"],
  ["Testimonial", "/testimonials"],
];

export default function SiteHeader({ className = "" }) {
  return (
    <header className={`${styles.siteHeader} ${className}`}>
      <nav className={styles.headerMenu} aria-label="Primary navigation">
        {headerLinks.map(([label, href]) => (
          <a key={href} href={href}>{label}</a>
        ))}
      </nav>

      <a href="/" className={styles.logoSlot} aria-label="AI Website Readiness Checker home">
        <Image src="/logo.png" alt="AI Website Readiness Checker logo" width={238} height={72} className="mx-auto h-12 w-auto sm:h-14" priority />
      </a>

      <div className={styles.headerActions}>
        <a href="/coming-soon" className={styles.loginButton} aria-label="Login coming soon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <path d="m10 17 5-5-5-5" />
            <path d="M15 12H3" />
          </svg>
        </a>
        <a href="mailto:sohail@rebrandgurus.com?subject=Book%20AI%20Readiness%20Demo" className={styles.demoButton}>
          Book a demo
        </a>
      </div>
    </header>
  );
}
