"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ExternalLink,
  Filter,
  Activity,
  Copy,
  RefreshCw,
} from "lucide-react";
import { Card, SectionHeader } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDistanceToNow, format } from "date-fns";

interface Transaction {
  id: string;
  type: "MINT" | "REDEEM";
  amount: number;
  stablecoin: { symbol: string };
  status: string;
  complianceStatus: string;
  txSignature?: string;
  kycVerified: boolean;
  travelRuleData?: any;
  createdAt: string;
  updatedAt: string;
  wallet: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

function truncate(s: string, len = 10) {
  if (!s) return "—";
  return s.length > len * 2 ? `${s.slice(0, len)}…${s.slice(-5)}` : s;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="ml-1 opacity-40 hover:opacity-100 transition-opacity">
      <Copy size={10} style={{ color: copied ? "var(--success)" : "var(--text-tertiary)" }} />
    </button>
  );
}

export default function TransactionsPage() {
  const [mints, setMints] = useState<any[]>([]);
  const [redeems, setRedeems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "MINT" | "REDEEM">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [mintRes, redeemRes] = await Promise.all([
        fetch("/api/mint-request"),
        fetch("/api/redeem-request"),
      ]);
      const mintData = await mintRes.json();
      const redeemData = await redeemRes.json();
      setMints(Array.isArray(mintData) ? mintData : []);
      setRedeems(Array.isArray(redeemData) ? redeemData : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
  }

  // Merge and annotate
  const allTxs: Transaction[] = [
    ...mints.map((m) => ({
      id: m.id,
      type: "MINT" as const,
      amount: m.amount,
      stablecoin: m.stablecoin,
      status: m.status,
      complianceStatus: m.complianceStatus,
      txSignature: m.txSignature,
      kycVerified: m.kycVerified,
      travelRuleData: m.travelRuleData,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      wallet: m.destinationWallet,
    })),
    ...redeems.map((r) => ({
      id: r.id,
      type: "REDEEM" as const,
      amount: r.amount,
      stablecoin: r.stablecoin,
      status: r.status,
      complianceStatus: r.complianceStatus,
      txSignature: r.txSignature,
      kycVerified: r.kycVerified,
      travelRuleData: r.travelRuleData,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      wallet: r.sourceWallet,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = allTxs.filter((tx) => {
    if (filter !== "ALL" && tx.type !== filter) return false;
    if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;
    return true;
  });

  const totalVolume = allTxs.filter((t) => t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);
  const mintVolume = allTxs.filter((t) => t.type === "MINT" && t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);
  const redeemVolume = allTxs.filter((t) => t.type === "REDEEM" && t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);

  const STATUSES = ["ALL", "COMPLETED", "PENDING", "FAILED", "COMPLIANCE_REVIEW"];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Transaction History
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Full audit trail · Solana Devnet
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Volume summary */}
      <div className="grid grid-cols-3 gap-4 animate-fade-in stagger-1">
        {[
          { label: "Total Volume", value: fmt(totalVolume), color: "var(--text-primary)", sub: `${allTxs.filter((t) => t.status === "COMPLETED").length} txns` },
          { label: "Total Minted", value: fmt(mintVolume), color: "var(--accent)", sub: `${mints.filter((m) => m.status === "COMPLETED").length} mint txns` },
          { label: "Total Redeemed", value: fmt(redeemVolume), color: "var(--info)", sub: `${redeems.filter((r) => r.status === "COMPLETED").length} redeem txns` },
        ].map(({ label, value, color, sub }) => (
          <Card key={label}>
            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{label}</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color }}>{value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>{sub}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card noPadding className="animate-fade-in stagger-2">
        <div className="flex items-center gap-3 px-5 py-3 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
          <Filter size={13} style={{ color: "var(--text-tertiary)" }} />
          <div className="flex gap-1">
            {(["ALL", "MINT", "REDEEM"] as const).map((t) => (
              <button key={t} onClick={() => setFilter(t)} className="px-2.5 py-1 rounded text-xs transition-all" style={{ background: filter === t ? "var(--accent-subtle)" : "transparent", color: filter === t ? "var(--accent)" : "var(--text-tertiary)", border: `1px solid ${filter === t ? "var(--accent-glow)" : "transparent"}`, fontFamily: "var(--font-mono)" }}>
                {t}
              </button>
            ))}
          </div>
          <div className="w-px h-4" style={{ background: "var(--border)" }} />
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className="px-2.5 py-1 rounded text-xs transition-all" style={{ background: statusFilter === s ? "var(--bg-elevated)" : "transparent", color: statusFilter === s ? "var(--text-primary)" : "var(--text-tertiary)", border: `1px solid ${statusFilter === s ? "var(--border-bright)" : "transparent"}`, fontFamily: "var(--font-mono)" }}>
                {s === "ALL" ? "All Status" : s.replace("_", " ")}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
            {filtered.length} transactions
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 skeleton rounded" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center" style={{ color: "var(--text-tertiary)" }}>
            <Activity size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No transactions found</p>
            <p className="text-xs mt-1">Try adjusting your filters or submit a mint/redeem request</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Asset</th>
                  <th>Amount</th>
                  <th>Wallet</th>
                  <th>Status</th>
                  <th>Compliance</th>
                  <th>KYC</th>
                  <th>Travel Rule</th>
                  <th>Tx Signature</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={`${tx.type}-${tx.id}`}>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {tx.type === "MINT" ? (
                          <ArrowUpCircle size={13} style={{ color: "var(--accent)" }} />
                        ) : (
                          <ArrowDownCircle size={13} style={{ color: "var(--info)" }} />
                        )}
                        <span className="text-xs font-medium" style={{ color: tx.type === "MINT" ? "var(--accent)" : "var(--info)", fontFamily: "var(--font-mono)" }}>
                          {tx.type}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: tx.type === "MINT" ? "var(--accent-subtle)" : "var(--info-dim)", color: tx.type === "MINT" ? "var(--accent)" : "var(--info)", fontFamily: "var(--font-mono)" }}>
                        {tx.stablecoin?.symbol}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>
                      {tx.type === "REDEEM" && <span style={{ color: "var(--error)", marginRight: "2px" }}>−</span>}
                      {fmt(tx.amount)}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-secondary)" }}>
                      <span>{truncate(tx.wallet, 8)}</span>
                      <CopyButton text={tx.wallet} />
                    </td>
                    <td><StatusBadge status={tx.status} /></td>
                    <td><StatusBadge status={tx.complianceStatus} /></td>
                    <td>
                      <span className={`text-[10px] font-medium`} style={{ color: tx.kycVerified ? "var(--success)" : "var(--warning)", fontFamily: "var(--font-mono)" }}>
                        {tx.kycVerified ? "✓ Verified" : "Pending"}
                      </span>
                    </td>
                    <td>
                      <span className="text-[10px] font-medium" style={{ color: tx.travelRuleData ? "var(--success)" : "var(--warning)", fontFamily: "var(--font-mono)" }}>
                        {tx.travelRuleData ? "✓ Filed" : "Pending"}
                      </span>
                    </td>
                    <td>
                      {tx.txSignature ? (
                        tx.txSignature.startsWith("DEMO") || tx.txSignature.startsWith("REDEEM") ? (
                          <span className="text-[10px]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                            {truncate(tx.txSignature, 6)}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px]" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                              {truncate(tx.txSignature, 6)}
                            </span>
                            <CopyButton text={tx.txSignature} />
                            <a href={`https://explorer.solana.com/tx/${tx.txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink size={10} style={{ color: "var(--accent)", opacity: 0.7 }} />
                            </a>
                          </div>
                        )
                      ) : (
                        <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>
                        <div>{format(new Date(tx.createdAt), "MMM d, HH:mm")}</div>
                        <div className="text-[10px]">{formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
