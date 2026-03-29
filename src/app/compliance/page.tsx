"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Globe,
  FileText,
  Eye,
  TrendingUp,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Card, SectionHeader, StatCard } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { ComplianceRecordRecord, ComplianceResponse } from "@/lib/demo-types";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";
import { formatDistanceToNow, format } from "date-fns";

function riskColor(score?: number) {
  if (!score) return "var(--text-tertiary)";
  if (score <= 30) return "var(--success)";
  if (score <= 60) return "var(--warning)";
  return "var(--error)";
}

function riskLabel(score?: number) {
  if (!score) return "N/A";
  if (score <= 30) return "Low";
  if (score <= 60) return "Medium";
  return "High";
}

function RiskMeter({ score }: { score?: number }) {
  const s = score ?? 0;
  const color = riskColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${s}%`, background: color }}
        />
      </div>
      <span className="text-xs font-medium" style={{ color, fontFamily: "var(--font-mono)", minWidth: "28px" }}>
        {s}
      </span>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function truncate(s: string, len = 10) {
  if (!s) return "—";
  return s.length > len * 2 ? `${s.slice(0, len)}…${s.slice(-5)}` : s;
}

function renderNoteWithTxLinks(note: string) {
  const txPattern = /(Tx(?:\s+ID)?\s*:\s*)([1-9A-HJ-NP-Za-km-z]{24,88})/gi;
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of note.matchAll(txPattern)) {
    const [, label, signature] = match;
    const start = match.index ?? 0;
    const signatureStart = start + label.length;

    if (start > lastIndex) {
      parts.push(note.slice(lastIndex, start));
    }

    parts.push(label);
    parts.push(
      <a
        key={`${signature}-${start}`}
        href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
        target="_blank"
        rel="noopener noreferrer"
        title={signature}
        className="inline-flex items-center gap-1 align-middle"
        style={{ color: "var(--accent)" }}
      >
        {truncate(signature, 6)}
        <ExternalLink size={10} />
      </a>
    );

    lastIndex = signatureStart + signature.length;
  }

  if (parts.length === 0) {
    return note;
  }

  if (lastIndex < note.length) {
    parts.push(note.slice(lastIndex));
  }

  return parts;
}

export default function CompliancePage() {
  const inst = PLACEHOLDER_INSTITUTION;
  const [data, setData] = useState<ComplianceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ComplianceRecordRecord | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/compliance");
        setData((await res.json()) as ComplianceResponse);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const records = data?.records ?? [];
  const filtered = filter === "ALL" ? records : records.filter((r) => r.status === filter);

  const stats = {
    total: records.length,
    approved: records.filter((r) => r.status === "APPROVED").length,
    pending: records.filter((r) => r.status === "IN_REVIEW" || r.status === "PENDING").length,
    avgRisk: records.length
      ? Math.round(records.reduce((s, r) => s + (r.riskScore ?? 0), 0) / records.length)
      : 0,
  };

  const FILTER_OPTIONS = [
    { label: "All", value: "ALL" },
    { label: "Approved", value: "APPROVED" },
    { label: "In Review", value: "IN_REVIEW" },
    { label: "Pending", value: "PENDING" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          Compliance Hub
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          KYC · AML · Travel Rule · FATF · OFAC monitoring
        </p>
      </div>

      {/* Institution compliance profile */}
      <Card className="animate-fade-in stagger-1">
        <div className="flex items-start gap-6 flex-wrap">
          {/* Entity identity */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-glow)" }}>
              <Building2 size={22} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <div className="text-base font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {inst.name}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                LEI: {inst.leiCode}
              </div>
              <div className="text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                License: {inst.regulatoryLicense}
              </div>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: "KYC Verified", icon: ShieldCheck, ok: true },
              { label: "AML Clear", icon: CheckCircle2, ok: true },
              { label: "FATF Compliant", icon: Globe, ok: true },
              { label: "OFAC Screened", icon: Eye, ok: true },
            ].map(({ label, icon: Icon, ok }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: ok ? "var(--success-dim)" : "var(--error-dim)", color: ok ? "var(--success)" : "var(--error)", border: `1px solid ${ok ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.25)"}` }}>
                <Icon size={12} strokeWidth={2} />
                {label}
              </div>
            ))}
          </div>

          {/* Key dates */}
          <div className="space-y-1 text-xs" style={{ fontFamily: "var(--font-mono)" }}>
            <div className="flex gap-3">
              <span style={{ color: "var(--text-tertiary)", minWidth: "80px" }}>Last Audit</span>
              <span style={{ color: "var(--text-secondary)" }}>{inst.lastAudit}</span>
            </div>
            <div className="flex gap-3">
              <span style={{ color: "var(--text-tertiary)", minWidth: "80px" }}>Next Review</span>
              <span style={{ color: "var(--text-secondary)" }}>{inst.nextReview}</span>
            </div>
            <div className="flex gap-3">
              <span style={{ color: "var(--text-tertiary)", minWidth: "80px" }}>Risk Rating</span>
              <span style={{ color: "var(--success)" }}>{inst.riskRating}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in stagger-2">
        <StatCard label="Total Records" value={stats.total} sub="All compliance events" icon={<FileText size={16} style={{ color: "var(--text-secondary)" }} />} />
        <StatCard label="Approved" value={stats.approved} sub="Auto or manual approval" icon={<CheckCircle2 size={16} style={{ color: "var(--success)" }} />} />
        <StatCard label="Pending Review" value={stats.pending} sub="Requiring action" icon={<AlertTriangle size={16} style={{ color: stats.pending ? "var(--warning)" : "var(--success)" }} />} />
        <StatCard label="Avg Risk Score" value={`${stats.avgRisk}/100`} sub="Portfolio risk level" accent={stats.avgRisk > 60} icon={<TrendingUp size={16} style={{ color: riskColor(stats.avgRisk) }} />} />
      </div>

      {/* Regulatory frameworks */}
      <Card className="animate-fade-in stagger-3">
        <SectionHeader title="Regulatory Framework Status" subtitle="Global compliance posture" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "FATF Travel Rule", body: "Financial Action Task Force", status: "COMPLIANT", region: "Global" },
            { name: "OFAC Screening", body: "US Treasury", status: "CLEAR", region: "USA" },
            { name: "FinCEN / BSA", body: "Financial Crimes Enforcement Network", status: "COMPLIANT", region: "USA" },
            { name: "EU 5AMLD/6AMLD", body: "European Union AML Directive", status: "COMPLIANT", region: "EU" },
            { name: "MAS MPI License", body: "Monetary Authority of Singapore", status: "PENDING", region: "SG" },
            { name: "FCA Registration", body: "Financial Conduct Authority", status: "COMPLIANT", region: "UK" },
            { name: "UN Sanctions", body: "United Nations Security Council", status: "CLEAR", region: "Global" },
            { name: "PEP Screening", body: "Politically Exposed Persons", status: "CLEAR", region: "Global" },
          ].map(({ name, body, status, region }) => {
            const ok = status === "COMPLIANT" || status === "CLEAR";
            const pending = status === "PENDING";
            return (
              <div key={name} className="p-3 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", lineHeight: 1.4 }}>{name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "var(--bg-base)", color: "var(--text-tertiary)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>{region}</span>
                </div>
                <p className="text-[10px] mb-2" style={{ color: "var(--text-tertiary)" }}>{body}</p>
                <div className={`flex items-center gap-1.5 text-[10px] font-medium ${ok ? "text-success" : pending ? "text-warning" : "text-error"}`} style={{ color: ok ? "var(--success)" : pending ? "var(--warning)" : "var(--error)" }}>
                  {ok ? <CheckCircle2 size={10} /> : pending ? <AlertTriangle size={10} /> : <XCircle size={10} />}
                  {status}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Records table + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in stagger-4">
        <Card noPadding className="lg:col-span-2">
          <div className="p-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Compliance Records</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>All KYC/AML/Travel Rule events</p>
            </div>
            <div className="flex gap-1">
              {FILTER_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setFilter(opt.value)} className="px-2.5 py-1 rounded text-xs transition-all" style={{ background: filter === opt.value ? "var(--accent-subtle)" : "transparent", color: filter === opt.value ? "var(--accent)" : "var(--text-tertiary)", border: `1px solid ${filter === opt.value ? "var(--accent-glow)" : "transparent"}`, fontFamily: "var(--font-mono)" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-8 skeleton rounded" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center" style={{ color: "var(--text-tertiary)" }}>
              <ShieldCheck size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No compliance records yet</p>
              <p className="text-xs mt-1">Records are created automatically with each mint/redeem request</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Type</th><th>Asset / Amount</th><th>Status</th><th>Risk</th><th>Jurisdiction</th><th>Reviewed By</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="cursor-pointer" onClick={() => setSelected(selected?.id === r.id ? null : r)} style={{ background: selected?.id === r.id ? "var(--bg-hover)" : undefined }}>
                      <td><span className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{r.recordType}</span></td>
                      <td>
                        {r.mintRequest ? (
                          <div>
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--accent-subtle)", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{r.mintRequest.stablecoin.symbol}</span>
                            <span className="ml-2 text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{fmt(r.mintRequest.amount)}</span>
                          </div>
                        ) : <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>—</span>}
                      </td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <RiskMeter score={r.riskScore} />
                          <span className="text-[10px]" style={{ color: riskColor(r.riskScore), fontFamily: "var(--font-mono)", flexShrink: 0 }}>{riskLabel(r.riskScore)}</span>
                        </div>
                      </td>
                      <td><span className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{r.jurisdiction ?? "—"}</span></td>
                      <td><span className="text-[10px]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{r.reviewedBy ? r.reviewedBy.split(" ").slice(0, 2).join(" ") : "—"}</span></td>
                      <td><span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Detail panel */}
        <Card className="animate-fade-in stagger-5">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Record Detail</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{selected.id.slice(0, 20)}…</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="space-y-1.5 text-xs">
                {[
                  ["Type", selected.recordType],
                  ["Jurisdiction", selected.jurisdiction ?? "—"],
                  ["FATF Status", selected.fatfStatus ?? "—"],
                  ["OFAC Screening", selected.ofacScreening ?? "—"],
                  ["Risk Score", `${selected.riskScore ?? 0} / 100`],
                  ["Risk Level", riskLabel(selected.riskScore)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{k}</span>
                    <span style={{ color: v === "COMPLIANT" || v === "CLEAR" ? "var(--success)" : "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{v}</span>
                  </div>
                ))}
              </div>

              {selected.notes && (
                <div className="p-2.5 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <p className="text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>Review Notes</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{renderNoteWithTxLinks(selected.notes)}</p>
                </div>
              )}

              {selected.kycData && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>KYC Data</p>
                  <div className="space-y-1 text-[10px]" style={{ fontFamily: "var(--font-mono)" }}>
                    {Object.entries(selected.kycData ?? {}).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span style={{ color: "var(--text-tertiary)", minWidth: "80px", flexShrink: 0 }}>{k}</span>
                        <span style={{ color: "var(--text-secondary)" }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.amlData && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>AML Screening</p>
                  <div className="space-y-1 text-[10px]" style={{ fontFamily: "var(--font-mono)" }}>
                    {Object.entries(selected.amlData ?? {})
                      .filter(([k]) => !["timestamp", "screeningId"].includes(k))
                      .map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span style={{ color: "var(--text-tertiary)", minWidth: "80px", flexShrink: 0 }}>{k}</span>
                          <span style={{ color: Array.isArray(v) ? "var(--text-secondary)" : v === "CLEAR" ? "var(--success)" : "var(--text-secondary)" }}>
                            {Array.isArray(v) ? (v as string[]).join(", ") : String(v)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {selected.reviewedBy && (
                <div className="p-2.5 rounded-lg" style={{ background: "var(--success-dim)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <p className="text-[10px]" style={{ color: "var(--success)", fontFamily: "var(--font-mono)" }}>
                    ✓ Reviewed by {selected.reviewedBy}
                  </p>
                  {selected.reviewedAt && (
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      {format(new Date(selected.reviewedAt), "PPp")}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center" style={{ color: "var(--text-tertiary)" }}>
              <ShieldCheck size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Select a Record</p>
              <p className="text-xs mt-1">Click any compliance record to view detailed KYC, AML, and travel rule data</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
