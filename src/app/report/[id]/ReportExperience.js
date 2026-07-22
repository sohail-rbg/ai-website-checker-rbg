"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, CircleAlert, Minus, Search, TriangleAlert, Wrench, X } from "lucide-react";
import styles from "./report.module.css";

const platformGuidance = {
  crawlability: "Allow the named platform crawler in robots.txt, keep priority URLs indexable, submit valid nested sitemaps, and fix redirect, canonical, soft-404, and HTTP failures shown in the checklist.",
  contentReadiness: "Rewrite thin pages with direct answers, verifiable facts, clear H1/H2 sections, definitions, FAQs, comparisons, and page-specific service or product details.",
  structuredData: "Fix every invalid or missing required JSON-LD property, use only page-relevant schema, connect nodes through stable @id references, and keep schema consistent with visible content.",
  entityConfidence: "Declare one canonical brand name and Organization @id on every key page, connect services/products/authors to it, and add genuine authoritative sameAs profiles.",
  trustEvidence: "Publish named expert or company credentials, original evidence and case studies, review-source links, editorial/contact policies, citations, and independently verifiable business facts.",
  metadataQuality: "Give every indexable page a unique intent-specific title and description, keep them within useful pixel widths, remove generic or stuffed wording, and align them with the page H1 and visible topic.",
};

export function PlatformReadinessCards({ platforms = [] }) {
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (!selected) return undefined;
    const overflow = document.body.style.overflow;
    const onKeyDown = (event) => { if (event.key === "Escape") setSelected(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", onKeyDown); };
  }, [selected]);

  const toneFor = (value) => Number(value) >= 80 ? "strong" : Number(value) >= 60 ? "watch" : "risk";
  return <>
    <div className={styles.cards}>{platforms.map((item) => <article key={item.platform} className={styles.platformCard}>
      <div className={styles.platformSummary}><div className={styles.platformContent}><span className={styles.platformName}>{item.platform}</span><strong>{item.readinessIndex == null ? "Not measured" : `${item.readinessIndex}/100 internal readiness`}</strong><p className={styles.platformStatus}>{item.crawler || "Platform-specific crawler"}</p><div className={styles.platformMeta}><span>Tier: {item.tier || item.status || "N/A"}</span><span>Confidence: {item.confidence || "low"}</span><span>Coverage: {item.measuredSignals ?? 0}/{item.totalSignals ?? 0}</span></div></div><span className={`${styles.platformTier} ${styles[toneFor(item.score)]}`}>{item.tier || item.status || "N/A"}</span></div>
      <button type="button" onClick={() => setSelected(item)} className="mt-5 flex w-full cursor-pointer items-center justify-between border-t border-white/10 pt-4 text-left text-xs font-bold text-[#9fe0a8] transition hover:text-white"><span>See how {item.readinessIndex ?? 0} points were earned and how to reach 100</span><span aria-hidden="true">→</span></button>
    </article>)}</div>
    {selected && createPortal(<div className="fixed inset-0 z-[9999] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="platform-calculation-title" className="platform-score-modal max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[1.7rem] border border-white/10 bg-[#050807] p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,.75)] sm:p-8">
        <div className="flex items-start justify-between gap-5 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#90ee9a]">{selected.platform} readiness methodology</p><h3 id="platform-calculation-title" className="mt-2 text-2xl font-semibold">{selected.readinessIndex == null ? "Not measured" : `${selected.readinessIndex}/100 internal readiness`}</h3><p className="mt-2 text-sm text-[#8B9C8C]">{selected.crawler} · {selected.confidence || "low"} confidence</p></div><button type="button" onClick={() => setSelected(null)} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-white/10 bg-white/[.04] text-[#d9e1d8] hover:bg-white/10" aria-label="Close platform calculation"><X size={19} /></button></div>
        {(() => { const parts = selected.breakdown || []; const measuredWeight = parts.filter((part) => part.measured).reduce((sum, part) => sum + (Number(part.weight) || 0), 0); return <><p className="my-5 rounded-xl border border-white/8 bg-white/[.025] p-4 text-xs leading-6 text-[#d9e1d8]/65">Formula: Σ(category score × platform weight) ÷ {measuredWeight || 100} measured weight. This is ScanSiteAI’s proprietary readiness index—not an official {selected.platform} visibility score.</p><div className="grid gap-3">{parts.map((part) => { const contribution = part.measured && measuredWeight ? ((Number(part.score) || 0) * (Number(part.weight) || 0) / measuredWeight) : null; const maximum = measuredWeight ? ((Number(part.weight) || 0) * 100 / measuredWeight) : 0; const gap = contribution == null ? null : Math.max(0, maximum - contribution); return <div key={part.key} className="rounded-2xl border border-white/8 bg-black/25 p-4"><div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><strong>{part.label}</strong><p className="mt-1 text-xs text-[#8B9C8C]">{part.measured ? `${part.score}/100 · ${part.weight}% platform weight` : "Not measured"}</p></div><div><strong className="text-[#90ee9a]">{contribution == null ? "N/A" : contribution.toFixed(1)}</strong><p className="text-[10px] uppercase text-[#8B9C8C]">Contribution</p></div><div><strong className="text-amber-300">{gap == null ? "N/A" : `+${gap.toFixed(1)}`}</strong><p className="text-[10px] uppercase text-[#8B9C8C]">Gap to max</p></div></div><p className="mt-3 border-t border-white/8 pt-3 text-xs leading-6 text-[#d9e1d8]/65">{platformGuidance[part.key] || "Improve the underlying measured checks and supporting evidence for this category."}</p></div>; })}</div></>; })()}
        <div className="mt-6 grid gap-2 border-t border-white/10 pt-5"><h4 className="mb-2 text-sm font-semibold">Supporting signals</h4>{(selected.signals || []).map((signal) => <div key={signal.label} className="flex items-start gap-3 rounded-xl bg-white/[.025] p-3"><span className={signal.status === "pass" ? "text-[#90ee9a]" : signal.status === "fail" ? "text-rose-300" : "text-amber-300"}>{signal.status === "pass" ? "✓" : signal.status === "fail" ? "×" : "!"}</span><div><p className="text-sm text-[#d9e1d8]">{signal.label}</p><p className="mt-1 text-xs text-[#8B9C8C]">{signal.evidence}</p></div></div>)}</div>
      </div>
    </div>, document.body)}
  </>;
}

export function ReportNavigator({ recommendationCount = 0, pageCount = 0, checkCount = 0 }) {
  const links = [
    ["overview", "Overview"], ["platforms", "Platforms"], ["scores", "Scores"],
    ["checks", `Checks (${checkCount})`], ["page-audit", `Pages (${pageCount})`], ["recommendations", `Fixes (${recommendationCount})`],
  ];
  return <nav aria-label="Report contents" className="sticky top-3 z-40 mx-auto my-8 flex max-w-[1380px] items-center gap-2 overflow-x-auto rounded-2xl border border-[#90ee9a]/15 bg-[#050807]/90 p-2 shadow-[0_18px_50px_rgba(0,0,0,.35)] backdrop-blur-xl">
    <span className="hidden shrink-0 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#8B9C8C] sm:block">On this report</span>
    {links.map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-[#d9e1d8]/70 transition hover:bg-[#90ee9a]/10 hover:text-[#90ee9a]">{label}</a>)}
  </nav>;
}

const checkStates = {
  pass: { label: "Pass", icon: Check, tone: "border-[#90ee9a]/25 bg-[#90ee9a]/10 text-[#90ee9a]" },
  fail: { label: "Fail", icon: X, tone: "border-rose-300/25 bg-rose-300/10 text-rose-300" },
  warning: { label: "Warning", icon: TriangleAlert, tone: "border-amber-300/25 bg-amber-300/10 text-amber-300" },
  not_measured: { label: "Not measured", icon: Minus, tone: "border-white/10 bg-white/[.04] text-[#d9e1d8]/55" },
  unknown: { label: "Unknown", icon: Minus, tone: "border-white/10 bg-white/[.04] text-[#d9e1d8]/55" },
};

const readinessCategories = ["Crawlability", "Content Readiness", "Structured Data", "Entity Confidence", "Trust Evidence", "Metadata Quality"];

function readinessCategoryForCheck(item) {
  const value = `${item.label || ""} ${item.check || ""} ${item.element || ""} ${item.category || ""}`.toLowerCase();
  if (/schema|json-ld|structured|@id/.test(value)) return "Structured Data";
  if (/entity|brand|organization|sameas|nap|business name/.test(value)) return "Entity Confidence";
  if (/author|credential|trust|citation|review|testimonial|about|contact detail|policy/.test(value)) return "Trust Evidence";
  if (/metadata|meta |title|description|open graph|twitter card|h1 alignment/.test(value)) return "Metadata Quality";
  if (/content|heading|faq|readability|word count|javascript dependency|rendered dom|image alt/.test(value)) return "Content Readiness";
  if (/robot|sitemap|crawl|index|canonical|redirect|http|fetch|soft 404|link|lighthouse|performance/.test(value)) return "Crawlability";
  return "Supporting Diagnostics";
}

export function ChecksDataTable({ checks = [] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const categorizedChecks = useMemo(() => checks.map((item) => ({ ...item, readinessCategory: readinessCategoryForCheck(item) })), [checks]);
  const categories = useMemo(() => [...readinessCategories, ...([...new Set(categorizedChecks.map((item) => item.readinessCategory))].filter((item) => !readinessCategories.includes(item)))], [categorizedChecks]);
  const counts = useMemo(() => categorizedChecks.reduce((result, item) => ({ ...result, [item.status]: (result[item.status] || 0) + 1 }), {}), [categorizedChecks]);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return categorizedChecks.filter((item) => (status === "all" || item.status === status) && (category === "all" || item.readinessCategory === category) && (!search || `${item.label} ${item.readinessCategory} ${item.evidence} ${item.url}`.toLowerCase().includes(search)));
  }, [category, categorizedChecks, query, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  return <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
    <div className="grid gap-3 border-b border-white/8 p-4 lg:grid-cols-[auto_auto_1fr]">
      <select aria-label="Filter checks by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="cursor-pointer rounded-xl border border-white/10 bg-[#050807] px-3 py-2 text-sm text-white outline-none"><option value="all">All states ({checks.length})</option>{Object.entries(checkStates).filter(([key]) => counts[key]).map(([key, value]) => <option key={key} value={key}>{value.label} ({counts[key]})</option>)}</select>
      <select aria-label="Filter checks by readiness category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="cursor-pointer rounded-xl border border-white/10 bg-[#050807] px-3 py-2 text-sm capitalize text-white outline-none"><option value="all">All readiness categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <label className="relative lg:justify-self-end"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B9C8C]" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search all technical checks…" className="w-full rounded-xl border border-white/10 bg-[#050807] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#90ee9a]/35 lg:w-80" /></label>
    </div>
    <div className="max-h-[660px] overflow-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="sticky top-0 z-10 bg-[#0a0e0c] text-[#8B9C8C]"><tr><th className="p-4">Check name</th><th className="p-4">Scan category</th><th className="p-4">Result</th><th className="p-4">Evidence</th><th className="p-4">Affected page</th></tr></thead><tbody>{visible.map((item, index) => {
      const state = checkStates[item.status] || checkStates.unknown;
      const Icon = state.icon;
      return <tr key={item.id || `${item.label}-${start + index}`} className="border-t border-white/8 align-top text-[#d9e1d8]"><td className="p-4 font-semibold text-white">{item.label || "Unnamed check"}</td><td className="p-4 text-[#d9e1d8]/70">{item.readinessCategory}</td><td className="p-4"><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${state.tone}`}><Icon size={14} strokeWidth={2.5} aria-hidden="true" />{state.label}</span></td><td className="max-w-[360px] p-4 leading-6 text-[#d9e1d8]/65">{item.evidence || "No evidence recorded"}</td><td className="max-w-[260px] break-all p-4 text-xs text-[#8B9C8C]">{item.url || "Site-wide"}</td></tr>;
    })}</tbody></table>{!visible.length && <p className="py-12 text-center text-sm text-[#8B9C8C]">No checks match these filters.</p>}</div>
    <div className="flex flex-col gap-3 border-t border-white/8 p-4 text-xs text-[#d9e1d8]/55 sm:flex-row sm:items-center sm:justify-between"><label>Show <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="mx-1 cursor-pointer rounded-lg border border-white/10 bg-[#050807] px-2 py-1 text-white">{[10, 25, 50, 100].map((size) => <option key={size}>{size}</option>)}</select> checks</label><span>Showing {filtered.length ? start + 1 : 0}–{Math.min(start + pageSize, filtered.length)} of {filtered.length}</span><div className="flex items-center gap-2"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-30">Previous</button><span>Page {currentPage} of {totalPages}</span><button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-30">Next</button></div></div>
  </div>;
}

function DataTable({ rows, columns, renderRow, searchText, emptyText }) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search ? rows.filter((row) => searchText(row).toLowerCase().includes(search)) : rows;
  }, [query, rows, searchText]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  return <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
    <div className="flex flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2 text-xs text-[#d9e1d8]/60">Show <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-white/10 bg-[#050807] px-2 py-1.5 text-white">{[10, 25, 50, 100].map((size) => <option key={size}>{size}</option>)}</select> pages</label>
      <label className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8B9C8C]" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search pages…" className="w-full rounded-xl border border-white/10 bg-[#050807] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#90ee9a]/35 sm:w-72" /></label>
    </div>
    <div className="max-h-[620px] overflow-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="sticky top-0 z-10 bg-[#0a0e0c] text-[#8B9C8C]"><tr>{columns.map((column) => <th key={column} className="p-4 font-semibold">{column}</th>)}</tr></thead><tbody>{visible.map(renderRow)}</tbody></table>{!visible.length && <p className="py-12 text-center text-sm text-[#8B9C8C]">{emptyText}</p>}</div>
    <div className="flex flex-col gap-3 border-t border-white/8 p-4 text-xs text-[#d9e1d8]/55 sm:flex-row sm:items-center sm:justify-between"><span>Showing {filtered.length ? start + 1 : 0}–{Math.min(start + pageSize, filtered.length)} of {filtered.length}</span><div className="flex items-center gap-2"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-30">Previous</button><span>Page {currentPage} of {totalPages}</span><button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-30">Next</button></div></div>
  </div>;
}

export function ReportAuditTables({ audit }) {
  const [tab, setTab] = useState("coverage");
  const pages = audit?.pages || [];
  if (!pages.length) return <p className="rounded-2xl border border-white/10 p-6 text-[#8B9C8C]">Page-level audit data is unavailable for this saved report.</p>;
  return <div>
    <div className="mb-5 inline-flex rounded-xl border border-white/10 bg-black/25 p-1">
      {[['coverage', 'Crawl coverage'], ['metadata', 'Metadata quality']].map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === value ? "bg-[#90ee9a] text-[#020302]" : "text-[#d9e1d8]/65 hover:text-white"}`}>{label}</button>)}
    </div>
    {tab === "coverage" ? <DataTable rows={pages} columns={["Page", "Type", "HTTP", "Raw words", "JS dependent", "Schema", "Issues"]} searchText={(page) => `${page.url} ${page.role} ${page.status}`} emptyText="No matching pages found." renderRow={(page) => <tr key={page.requestedUrl || page.url} className="border-t border-white/8 text-[#d9e1d8]"><td className="max-w-[280px] truncate p-4"><a href={page.url} target="_blank" rel="noreferrer" className="text-[#90ee9a] hover:underline">{page.url}</a></td><td className="p-4 capitalize">{page.role}</td><td className="p-4">{page.status ?? "Unknown"}</td><td className="p-4">{page.raw?.wordCount ?? 0}</td><td className="p-4">{page.rendered?.jsDependentPercent == null ? "Not measured" : `${page.rendered.jsDependentPercent}%`}</td><td className="p-4">{page.schema?.score ?? "N/A"}</td><td className="p-4">{(page.findings || []).filter((item) => item.status !== "pass").length}</td></tr>} />
      : <DataTable rows={pages} columns={["Page", "Title", "Title size", "H1 alignment", "Description size", "Relevance", "Unique"]} searchText={(page) => `${page.url} ${page.title || ""} ${page.description || ""}`} emptyText="No matching metadata pages found." renderRow={(page) => <tr key={page.url} className="border-t border-white/8 text-[#d9e1d8]"><td className="max-w-[250px] truncate p-4">{page.url}</td><td className="max-w-[280px] truncate p-4">{page.title || "Missing"}</td><td className="p-4">{page.metadataQuality?.title.length ?? 0} chars / {page.metadataQuality?.title.estimatedPixels ?? 0}px</td><td className="p-4">{page.metadataQuality?.title.h1AlignmentPercent == null ? "N/A" : `${page.metadataQuality.title.h1AlignmentPercent}%`}</td><td className="p-4">{page.metadataQuality?.description.length ?? 0} chars / {page.metadataQuality?.description.estimatedPixels ?? 0}px</td><td className="p-4">{page.metadataQuality?.description.relevancePercent == null ? "N/A" : `${page.metadataQuality.description.relevancePercent}%`}</td><td className="p-4">{page.metadataQuality?.uniqueness?.pageSpecific ? "Yes" : "No"}</td></tr>} />}
  </div>;
}

function recommendationCategory(item) {
  const value = `${item.title} ${item.affectedElement || ""}`.toLowerCase();
  if (value.includes("schema")) return "Schema";
  if (value.includes("meta") || value.includes("title") || value.includes("description")) return "Metadata";
  if (value.includes("robot") || value.includes("sitemap") || value.includes("crawl") || value.includes("canonical")) return "Crawlability";
  if (value.includes("entity") || value.includes("brand") || value.includes("nap")) return "Entities";
  if (value.includes("performance") || value.includes("lighthouse")) return "Performance";
  return "Content & trust";
}

export function RecommendationsExplorer({ recommendations }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const enriched = useMemo(() => recommendations.map((item, index) => ({ ...item, originalIndex: index, category: recommendationCategory(item) })), [recommendations]);
  const categories = useMemo(() => ["All", ...new Set(enriched.map((item) => item.category))], [enriched]);
  const filtered = useMemo(() => enriched.filter((item) => (category === "All" || item.category === category) && `${item.title} ${item.description} ${item.howToFix}`.toLowerCase().includes(query.trim().toLowerCase())), [category, enriched, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <div>
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-2 overflow-x-auto">{categories.map((item) => <button key={item} type="button" onClick={() => { setCategory(item); setPage(1); }} className={`shrink-0 cursor-pointer rounded-full px-3 py-2 text-xs font-semibold ${category === item ? "bg-[#90ee9a] text-[#020302]" : "border border-white/10 text-[#d9e1d8]/65"}`}>{item}</button>)}</div>
      <label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B9C8C]" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search recommendations…" className="w-full rounded-xl border border-white/10 bg-[#050807] py-2 pl-9 pr-3 text-sm text-white outline-none lg:w-72" /></label>
    </div>
    <div className="grid gap-3">{visible.map((item) => <details key={`${item.title}-${item.originalIndex}`} className="group overflow-hidden rounded-2xl border border-[#90ee9a]/12 bg-[linear-gradient(135deg,rgba(10,24,18,.78),rgba(3,8,6,.92))] open:border-[#90ee9a]/28">
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#90ee9a]/20 bg-[#90ee9a]/8 text-sm font-bold text-[#90ee9a]">{item.originalIndex + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#90ee9a]/70">{item.category}</span><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-[#d9e1d8]/55">{item.status || item.currentStatus || "review"}</span></div><h3 className="mt-1 truncate text-lg font-semibold text-white">{item.title}</h3><p className="mt-1 line-clamp-1 text-sm text-[#d9e1d8]/60">{item.description}</p></div><span className="hidden rounded-xl border border-[#90ee9a]/18 bg-[#90ee9a]/8 px-3 py-2 text-center sm:block"><strong className="block text-lg text-[#90ee9a]">+{Number(item.scoreEffect ?? item.expectedGain) || 0}</strong><small className="uppercase text-[#8B9C8C]">potential</small></span><ChevronDown className="shrink-0 text-[#90ee9a] transition group-open:rotate-180" size={20} /></summary>
      <div className="grid gap-3 border-t border-white/8 p-5 md:grid-cols-3"><div className="rounded-xl bg-black/25 p-4"><CircleAlert size={18} className="text-[#90ee9a]" /><span className="mt-3 block text-[10px] font-bold uppercase tracking-[.14em] text-[#90ee9a]/70">Evidence</span><p className="mt-2 text-sm leading-6 text-[#d9e1d8]/70">{item.evidence || item.currentStatus}</p></div><div className="rounded-xl bg-black/25 p-4"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#90ee9a]/70">Why it matters</span><p className="mt-3 text-sm leading-6 text-[#d9e1d8]/70">{item.businessImpact || item.whyAiCares}</p></div><div className="rounded-xl bg-black/25 p-4"><Wrench size={18} className="text-[#90ee9a]" /><span className="mt-3 block text-[10px] font-bold uppercase tracking-[.14em] text-[#90ee9a]/70">Developer fix</span><p className="mt-2 text-sm leading-6 text-[#d9e1d8]/70">{item.howToFix}</p></div>{item.affectedUrl && <p className="break-all text-xs text-[#8B9C8C] md:col-span-3">Affected URL: {item.affectedUrl}</p>}</div>
    </details>)}</div>
    {!visible.length && <p className="rounded-2xl border border-white/10 py-12 text-center text-[#8B9C8C]">No matching recommendations.</p>}
    <div className="mt-5 flex items-center justify-between text-sm text-[#d9e1d8]/60"><span>Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span><div className="flex items-center gap-2"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="cursor-pointer rounded-xl border border-white/10 px-3 py-2 disabled:opacity-30">Previous</button><span>{currentPage}/{totalPages}</span><button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="cursor-pointer rounded-xl border border-white/10 px-3 py-2 disabled:opacity-30">Next</button></div></div>
  </div>;
}
