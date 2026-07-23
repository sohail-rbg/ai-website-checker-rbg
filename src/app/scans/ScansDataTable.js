"use client";

import { useMemo, useState } from "react";

const columns = [
  { key: "website", label: "Website URL", sortable: true },
  { key: "submittedEmail", label: "Submitted Email", sortable: true },
  { key: "emails", label: "Detected Emails", sortable: false },
  { key: "phones", label: "Detected Phones", sortable: false },
  { key: "location", label: "Location", sortable: true },
  { key: "country", label: "Country", sortable: true },
  { key: "browser", label: "Browser", sortable: true },
  { key: "dateValue", label: "Date", sortable: true },
  { key: "time", label: "Time", sortable: false },
  { key: "score", label: "Score", sortable: true },
  { key: "topRecommendation", label: "Top Recommendation", sortable: true },
  { key: "company", label: "Detected Entity", sortable: true },
  { key: "report", label: "Report", sortable: false },
];

function scoreTone(score) {
  const value = Number(score) || 0;
  if (value >= 90) return "text-[#90ee9a]";
  if (value >= 75) return "text-[#f5d66e]";
  return "text-[#ff8fa3]";
}

function sortValue(row, key) {
  const value = row[key];
  if (key === "score" || key === "dateValue") return Number(value) || 0;
  return String(value || "").toLowerCase();
}

export default function ScansDataTable({ rows }) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "dateValue", direction: "desc" });

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = search
      ? rows.filter((row) => row.searchText.includes(search))
      : rows;

    return [...filtered].sort((a, b) => {
      const aValue = sortValue(a, sort.key);
      const bValue = sortValue(b, sort.key);
      if (aValue < bValue) return sort.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [query, rows, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visibleRows = filteredRows.slice(start, start + pageSize);

  function updateSort(column) {
    if (!column.sortable) return;
    setPage(1);
    setSort((current) => ({
      key: column.key,
      direction: current.key === column.key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <div className="rounded-3xl border border-[#8B9C8C]/15 bg-black/20 p-4 shadow-[0_24px_70px_rgba(0,0,0,.24)]">
      <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-2 text-sm text-[#d9e1d8]/72">
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-xl border border-[#8B9C8C]/18 bg-[#020302] px-3 py-2 text-white outline-none"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          entries per page
        </label>
        <label className="flex items-center gap-2 text-sm text-[#d9e1d8]/72">
          Search:
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-[#8B9C8C]/18 bg-[#020302] px-3 py-2 text-white outline-none md:w-72"
          />
        </label>
      </div>

      <div className="max-h-[680px] overflow-auto border-t border-[#8B9C8C]/15">
        <table className="w-full min-w-[1850px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#080b09] text-[#8B9C8C]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-5 py-4 first:pl-0 last:pr-0">
                  <button
                    type="button"
                    onClick={() => updateSort(column)}
                    disabled={!column.sortable}
                    className={`inline-flex items-center gap-2 font-semibold ${column.sortable ? "cursor-pointer hover:text-[#9fe0a8]" : "cursor-default"}`}
                  >
                    {column.label}
                    {column.sortable && (
                      <span className="text-[10px] text-[#d9e1d8]/45">
                        {sort.key === column.key ? (sort.direction === "asc" ? "asc" : "desc") : "sort"}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="border-t border-[#8B9C8C]/12 align-top text-[#d9e1d8]">
                <td className="max-w-[320px] py-5 pr-5">
                  <a href={row.websiteHref} target="_blank" rel="noreferrer" className="font-semibold text-white underline decoration-[#8B9C8C]/35 underline-offset-4 transition hover:text-[#9fe0a8]">
                    <span className="line-clamp-2 break-all">{row.website}</span>
                  </a>
                  {row.redirected && <p className="mt-2 text-xs text-[#d9e1d8]/45">Resolved URL</p>}
                </td>
                <td className="max-w-[240px] px-5 py-5">
                  {row.submittedEmail ? (
                    <a href={`mailto:${row.submittedEmail}`} className="font-semibold text-[#9fe0a8] underline decoration-[#8B9C8C]/35 underline-offset-4">
                      <span className="line-clamp-2 break-all">{row.submittedEmail}</span>
                    </a>
                  ) : (
                    <span className="text-[#d9e1d8]/45">Not submitted</span>
                  )}
                </td>
                <td className="min-w-[240px] max-w-[300px] px-5 py-5">
                  {row.emails.length ? (
                    <ul className="grid gap-3">
                      {row.emails.map((email) => (
                        <li key={email.value}>
                          <a href={`mailto:${email.value}`} className="block font-semibold text-[#9fe0a8] underline decoration-[#8B9C8C]/35 underline-offset-4">
                            <span className="block break-all">{email.value}</span>
                          </a>
                          <span className="mt-1 block text-xs text-[#d9e1d8]/45">{email.source}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[#d9e1d8]/45">Not detected</span>
                  )}
                </td>
                <td className="min-w-[210px] max-w-[260px] px-5 py-5">
                  {row.phones.length ? (
                    <ul className="grid gap-3">
                      {row.phones.map((phone) => (
                        <li key={phone.value}>
                          <a href={`tel:${phone.value}`} className="block font-semibold text-[#9fe0a8] underline decoration-[#8B9C8C]/35 underline-offset-4">
                            <span className="block break-all">{phone.value}</span>
                          </a>
                          <span className="mt-1 block text-xs text-[#d9e1d8]/45">{phone.source}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[#d9e1d8]/45">Not detected</span>
                  )}
                </td>
                <td className="max-w-[220px] px-5 py-5"><span className="line-clamp-2">{row.location}</span></td>
                <td className="max-w-[160px] px-5 py-5"><span className="line-clamp-2">{row.country}</span></td>
                <td className="max-w-[190px] px-5 py-5"><span className="line-clamp-2">{row.browser}</span></td>
                <td className="px-5 py-5">{row.date}</td>
                <td className="min-w-[130px] px-5 py-5">
                  <span>{row.time}</span>
                  <span className="mt-1 block text-xs text-[#d9e1d8]/45">{row.timeZone}</span>
                </td>
                <td className="px-5 py-5">
                  <span className={`text-2xl font-semibold ${scoreTone(row.score)}`}>{row.score ?? "N/A"}</span>
                  <span className="ml-2 text-xs text-[#8B9C8C]">Grade {row.grade || "N/A"}</span>
                </td>
                <td className="max-w-[260px] px-5 py-5"><span className="line-clamp-2">{row.topRecommendation}</span></td>
                <td className="max-w-[220px] px-5 py-5"><span className="line-clamp-2">{row.company}</span></td>
                <td className="py-5 pl-5">
                  {row.reportUrl ? (
                    <div className="max-w-[280px]">
                      <a
                        href={row.reportUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-full bg-[#9fe0a8] px-4 py-2.5 font-bold text-[#020302] transition hover:bg-white"
                      >
                        Open Hosted Report
                      </a>
                      <p className="mt-2 line-clamp-2 break-all text-xs text-[#d9e1d8]/45">{row.reportUrl}</p>
                    </div>
                  ) : (
                    <details className="max-w-[320px] rounded-2xl border border-[#8B9C8C]/15 bg-white/[0.03] p-3">
                      <summary className="cursor-pointer font-semibold text-[#9fe0a8]">View signals</summary>
                      <div className="mt-3 grid gap-2 text-xs leading-5 text-[#d9e1d8]/72">
                        <p>Schema: {row.signals.schema}/100</p>
                        <p>Content: {row.signals.content}/100</p>
                        <p>EEAT: {row.signals.eeat}/100</p>
                        <p>Entities: {row.signals.entities}/100</p>
                        <p>Performance: {row.signals.performance}/100</p>
                        <p>Schema types: {row.signals.schemaTypes || "None"}</p>
                        <p>Contact pages: {row.signals.contactPages || "None"}</p>
                      </div>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleRows.length && (
          <div className="py-12 text-center text-[#d9e1d8]/62">No matching scans found.</div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-4 text-sm text-[#d9e1d8]/62 md:flex-row md:items-center md:justify-between">
        <p>
          Showing {filteredRows.length ? start + 1 : 0} to {Math.min(start + pageSize, filteredRows.length)} of {filteredRows.length} entries
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage <= 1}
            className="rounded-xl border border-[#8B9C8C]/18 px-3 py-2 font-semibold text-[#d9e1d8] disabled:opacity-35"
          >
            Previous
          </button>
          <span className="px-2">Page {currentPage} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-xl border border-[#8B9C8C]/18 px-3 py-2 font-semibold text-[#d9e1d8] disabled:opacity-35"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
