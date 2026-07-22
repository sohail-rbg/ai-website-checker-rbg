"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return { date: "Not available", time: "Not available" };
  return {
    date: date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function LeadsDataTable({ rows }) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search ? rows.filter((row) => `${row.email} ${row.website} ${row.grade} ${row.overallScore}`.toLowerCase().includes(search)) : rows;
  }, [query, rows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visibleRows = filteredRows.slice(start, start + pageSize);

  return (
    <div className="overflow-hidden rounded-3xl border border-[#8B9C8C]/15 bg-black/20 p-4">
      <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-[#d9e1d8]/65">Show <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-xl border border-white/10 bg-[#020302] px-3 py-2 text-white">{[10, 25, 50, 100].map((size) => <option key={size}>{size}</option>)}</select> entries</label>
        <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} aria-label="Search leads" placeholder="Search leads…" className="w-full rounded-xl border border-white/10 bg-[#020302] px-3 py-2 text-sm text-white outline-none sm:w-72" />
      </div>
      <div className="max-h-[620px] overflow-auto border-t border-[#8B9C8C]/15">
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#080b09] text-[#8B9C8C]"><tr>{["Email", "Website", "Date", "Time", "Score", "Call", "Email status", "Complete Report"].map((label) => <th key={label} className="px-5 py-4 font-semibold first:pl-0 last:text-right">{label}</th>)}</tr></thead>
          <tbody>{visibleRows.map((entry) => {
            const submitted = formatDateTime(entry.submittedAt);
            const reportHref = entry.submissionId ? `/report/${entry.leadId}?submission=${entry.submissionId}` : `/report/${entry.leadId}`;
            return <tr key={entry.id} className="border-t border-[#8B9C8C]/12 text-[#d9e1d8]"><td className="max-w-[260px] py-5 pr-5 font-semibold text-white">{entry.email}</td><td className="max-w-[290px] px-5 py-5"><span className="line-clamp-2 break-all">{entry.website}</span></td><td className="px-5 py-5">{submitted.date}</td><td className="px-5 py-5">{submitted.time}</td><td className="px-5 py-5"><span className="font-semibold text-[#9fe0a8]">{entry.overallScore}</span><span className="ml-2 text-xs text-[#8B9C8C]">Grade {entry.grade}</span></td><td className="px-5 py-5">{entry.wantsCall ? "Yes" : "No"}</td><td className="px-5 py-5">{entry.emailSent ? "Sent" : "Pending"}</td><td className="py-5 pl-5 text-right">{entry.hasReport ? <Link className="inline-flex rounded-full border border-[#9fe0a8]/35 px-4 py-2 font-semibold text-[#9fe0a8]" href={reportHref}>Complete Report</Link> : <span className="text-[#d9e1d8]/45">No report</span>}</td></tr>;
          })}</tbody>
        </table>
        {!visibleRows.length && <div className="py-12 text-center text-[#d9e1d8]/55">No matching leads found.</div>}
      </div>
      <div className="flex flex-col gap-3 pt-4 text-sm text-[#d9e1d8]/60 sm:flex-row sm:items-center sm:justify-between"><p>Showing {filteredRows.length ? start + 1 : 0}–{Math.min(start + pageSize, filteredRows.length)} of {filteredRows.length}</p><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-35">Previous</button><span>Page {currentPage} of {totalPages}</span><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-35">Next</button></div></div>
    </div>
  );
}
