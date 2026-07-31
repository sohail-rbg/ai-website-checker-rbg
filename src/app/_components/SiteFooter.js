import Image from "next/image";
import Link from "next/link";
import styles from "../page.module.css";
import { socialLinks } from "../seo";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/resources", label: "Resources" },
  { href: "/blog", label: "Blog" },
  { href: "/documentation", label: "Documentation" },
  { href: "/glossary", label: "Glossary" },
  { href: "/pricing", label: "Pricing" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
];

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6.94 8.9H3.7v10.42h3.24V8.9ZM5.32 7.48a1.88 1.88 0 1 0 0-3.76 1.88 1.88 0 0 0 0 3.76ZM20.3 13.62c0-3.06-1.63-4.48-3.8-4.48a3.28 3.28 0 0 0-2.97 1.63h-.04V8.9h-3.1v10.42h3.23v-5.16c0-1.36.26-2.68 1.95-2.68 1.66 0 1.68 1.56 1.68 2.77v5.07h3.24l-.19-5.7Z" />
    </svg>
  );
}

const socialIcons = {
  Instagram: InstagramIcon,
  LinkedIn: LinkedInIcon,
};

export default function SiteFooter({ className = "" }) {
  return (
    <footer className={`${styles.siteFooter} ${className}`}>
      <Image src="/logo.png" alt="ScanSiteAI logo" width={500} height={90} className={styles.footerLogo} />
      <nav aria-label="Social links" className="flex items-center justify-center gap-3">
        {socialLinks.map((link) => {
          const Icon = socialIcons[link.label];

          return (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ScanSiteAI on ${link.label}`}
              className="inline-grid size-10 place-items-center rounded-full border border-[#8B9C8C]/20 bg-white/[.045] text-[#d9e1d8] transition hover:-translate-y-0.5 hover:border-[#90ee9a]/45 hover:bg-[#90ee9a]/10 hover:text-[#90ee9a]"
            >
              <Icon className="size-[19px]" aria-hidden="true" />
            </a>
          );
        })}
      </nav>
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
