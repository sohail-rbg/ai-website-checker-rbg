"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleUserRound, Menu, X } from "lucide-react";
import styles from "../page.module.css";

const headerLinks = [
  ["About", "/about"],
  ["Features", "/#features"],
  ["FAQ's", "/#faq-preview"],
  ["Testimonial", "/testimonials"],
];

export default function SiteHeader({ className = "" }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className={`${styles.siteHeader} ${isOpen ? styles.siteHeaderOpen : ""} ${className}`}>
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

      <button
        type="button"
        className={styles.mobileMenuButton}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        {isOpen ? <X size={22} strokeWidth={2} aria-hidden="true" /> : <Menu size={22} strokeWidth={2} aria-hidden="true" />}
      </button>

      <div className={styles.mobileMenuPanel}>
        <nav aria-label="Mobile navigation">
          {headerLinks.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setIsOpen(false)}>{label}</a>
          ))}
        </nav>
        <div className={styles.mobileMenuActions}>
          <Link href="/coming-soon" onClick={() => setIsOpen(false)}>
            <CircleUserRound size={19} strokeWidth={1.8} aria-hidden="true" />
            Login
          </Link>
          <Link href="/book-demo" onClick={() => setIsOpen(false)}>Book a demo</Link>
        </div>
      </div>
    </header>
  );
}
