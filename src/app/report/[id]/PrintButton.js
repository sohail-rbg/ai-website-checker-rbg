"use client";

export default function PrintButton({ className }) {
  return (
    <button className={className} type="button" onClick={() => window.print()}>
      Download PDF
    </button>
  );
}
