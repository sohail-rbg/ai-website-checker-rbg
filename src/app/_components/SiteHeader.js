"use client";

import Image from "next/image";
import Link from "next/link";
import { CircleUserRound } from "lucide-react";
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

      <Link href="/" className={styles.logoSlot} aria-label="ScanSiteAI home">
        <Image src="/logo.png" alt="ScanSiteAI logo" width={238} height={72} className="mx-auto h-12 w-auto sm:h-14" priority />
      </Link>

      <div className={styles.headerActions}>
        <Link href="/coming-soon" className={styles.loginButton} aria-label="Login coming soon">
          <CircleUserRound size={22} strokeWidth={1.8} aria-hidden="true" />
        </Link>
        <Link href="/book-demo" className={styles.demoButton}>
          Book a demo
        </Link>
      </div>
    </header>
  );
}
