"use client";

import { Download } from "lucide-react";

export default function PrintButton({ className }) {
  return (
    <button className={className} type="button" onClick={() => window.print()}>
      <Download size={18} aria-hidden="true" />
      Download PDF
    </button>
  );
}
