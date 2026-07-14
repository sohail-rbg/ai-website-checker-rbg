import Image from "next/image";
import Link from "next/link";
import styles from "../page.module.css";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
];

export default function SiteFooter({ className = "" }) {
  return (
    <footer className={`${styles.siteFooter} ${className}`}>
      <Image src="/logo.png" alt="ScanSiteAI logo" width={500} height={90} className={styles.footerLogo} />
      <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-[#d9e1d8]/70">
        {footerLinks.map((link) => (
          <Link key={link.href} href={link.href} className="transition hover:text-[#90ee9a]">
            {link.label}
          </Link>
        ))}
      </nav>
      <p>Copyright 2026 ScanSiteAI. AI website readiness audits for answer engines.</p>
    </footer>
  );
}
