import Image from "next/image";
import styles from "../page.module.css";

export default function SiteFooter({ className = "" }) {
  return (
    <footer className={`${styles.siteFooter} ${className}`}>
      <Image src="/logo.png" alt="ScanSiteAI logo" width={500} height={90} className={styles.footerLogo} />
      <p>Copyright 2026 ScanSiteAI. AI website readiness audits for answer engines.</p>
    </footer>
  );
}
