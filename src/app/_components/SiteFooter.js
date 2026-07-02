import styles from "../page.module.css";

export default function SiteFooter({ className = "" }) {
  return (
    <footer className={`${styles.siteFooter} ${className}`}>
      <p>Copyright 2026 Rebrand Gurus. All rights reserved.</p>
      <div className={styles.socialLinks} aria-label="Social links">
        <a href="https://rebrandgurus.com" target="_blank" rel="noreferrer" aria-label="Website">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 0 20" /><path d="M12 2a15.3 15.3 0 0 0 0 20" />
          </svg>
        </a>
        <a href="https://www.linkedin.com/company/rebrand-gurus" target="_blank" rel="noreferrer" aria-label="LinkedIn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6.94 8.98H3.56V20h3.38zM5.25 4a1.96 1.96 0 1 0 0 3.92A1.96 1.96 0 0 0 5.25 4M20.44 20h-3.37v-5.36c0-1.28-.03-2.93-1.79-2.93-1.79 0-2.06 1.4-2.06 2.84V20H9.85V8.98h3.23v1.5h.05a3.54 3.54 0 0 1 3.18-1.75c3.4 0 4.03 2.24 4.03 5.15z" />
          </svg>
        </a>
        <a href="https://x.com/rebrandgurus" target="_blank" rel="noreferrer" aria-label="X">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.9 3h3.3l-7.2 8.2L23.5 21h-6.7l-5.2-6.3L5.7 21H2.4l7.7-8.8L2 3h6.8l4.7 5.6zM17.7 19.3h1.8L7.8 4.6H5.9z" />
          </svg>
        </a>
        <a href="https://www.instagram.com/rebrandgurus" target="_blank" rel="noreferrer" aria-label="Instagram">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="3.5" /><path d="M17.5 6.5h.01" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
