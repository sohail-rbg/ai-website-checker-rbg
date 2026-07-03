import { AtSign, Building2, Camera, Globe2 } from "lucide-react";
import styles from "../page.module.css";

export default function SiteFooter({ className = "" }) {
  return (
    <footer className={`${styles.siteFooter} ${className}`}>
      <p>Copyright 2026 Rebrand Gurus. All rights reserved.</p>
      <div className={styles.socialLinks} aria-label="Social links">
        <a href="https://rebrandgurus.com" target="_blank" rel="noreferrer" aria-label="Website">
          <Globe2 size={18} strokeWidth={1.8} aria-hidden="true" />
        </a>
        <a href="https://www.linkedin.com/company/rebrand-gurus" target="_blank" rel="noreferrer" aria-label="LinkedIn">
          <Building2 size={18} strokeWidth={1.8} aria-hidden="true" />
        </a>
        <a href="https://x.com/rebrandgurus" target="_blank" rel="noreferrer" aria-label="X">
          <AtSign size={18} strokeWidth={1.8} aria-hidden="true" />
        </a>
        <a href="https://www.instagram.com/rebrandgurus" target="_blank" rel="noreferrer" aria-label="Instagram">
          <Camera size={18} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
