"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Info,
  Loader2,
  Copy,
  ChevronDown,
  ChevronUp,
  Building2,
} from "lucide-react";
import { Card, SectionHeader } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";
import { formatDistanceToNow } from "date-fns";

interface RedeemRequest {
  id: string;
  amount: number;
  sourceWallet: string;
  destinationBankAccount?: string;
  status: string;
  complianceStatus: string;
  txSignature?: string;
  txError?: string;
  kycVerified: boolean;
  travelRuleData?: any;
  createdAt: string;
  stablecoin: { symbol: string; name: string };
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

function truncate(s: string, len = 12) {
  if (!s) return "—";
  return s.length > len * 2 ? `${s.slice(0, len)}…${s.slice(-6)}` : s;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="ml-1 opacity-50 hover:opacity-100">
      <Copy size={11} style={{ color: copied ? "var(--success)" : "var(--text-tertiary)" }} />
    </button>
  );
}

function RedeemFlow({ request }: { request: RedeemRequest }) {
  const steps = [
    { id: 1, label: "Redeem Request Submitted", done: true, detail: `${fmt(request.amount)} ${request.stablecoin.symbol} redemption requested` },
    { id: 2, label: "KYC Verified", done: request.kycVerified, detail: "Institution identity verified", badge: request.kycVerified ? "VERIFIED" : "PENDING" },
    { id: 3, label: "Travel Rule Filed", done: !!request.travelRuleData, detail: request.travelRuleData ? `FATF Compliant · VASP: ${request.travelRuleData.vasp ?? "Apex Capital LLC"}` : "Travel rule data pending", badge: request.travelRuleData ? "COMPLIANT" : "PENDING" },
    { id: 4, label: "Compliance Approved", done: request.complianceStatus === "APPROVED", detail: "AML/CFT checks passed", badge: request.complianceStatus },
    { id: 5, label: "Tokens Burned / Locked", done: request.status === "COMPLETED", detail: request.txSignature ? `Tx: ${truncate(request.txSignature, 8)}` : "On-chain burn pending", txSig: request.txSignature, badge: request.status },
    { id: 6, label: "Fiat Settlement", done: request.status === "COMPLETED", detail: request.status === "COMPLETED" ? "Fiat transfer initiated to settlement bank" : "Awaiting on-chain confirmation" },
  ];

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10" style={{ background: step.done ? "var(--success-dim)" : "var(--bg-elevated)", border: `2px solid ${step.done ? "var(--success)" : "var(--border-bright)"}` }}>
              {step.done ? <CheckCircle2 size={12} style={{ color: "var(--success)" }} /> : <span className="text-[9px] font-bold" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{step.id}</span>}
            </div>
            {idx < steps.length - 1 && <div className="w-0.5 flex-1 my-1" style={{ background: step.done ? "var(--success)" : "var(--border)", opacity: step.done ? 0.4 : 1, minHeight: "20px" }} />}
          </div>
          <div className="pb-4 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium" style={{ color: step.done ? "var(--text-primary)" : "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{step.label}</span>
              {step.badge && <StatusBadge status={step.badge} />}
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              {step.detail}
              {(step as any).txSig && (
                <a href={`https://explorer.solana.com/tx/${(step as any).txSig}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1" style={{ color: "var(--accent)" }}>
                  <ExternalLink size={10} /> Solana Explorer
                </a>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RedeemPage() {
  const inst = PLACEHOLDER_INSTITUTION;
  const [stablecoins, setStablecoins] = useState<any[]>([]);
  const [requests, setRequests] = useState<RedeemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    stablecoinSymbol: "USDX",
    amount: "",
    sourceWallet: inst.walletAddress,
    destinationBankAccount: "IBAN: GB29NWBK60161331926819",
  });

  useEffect(() => {
    async function load() {
      try {
        const [coinsRes, reqsRes] = await Promise.all([fetch("/api/stablecoins"), fetch("/api/redeem-request")]);
        setStablecoins(await coinsRes.json());
        setRequests(await reqsRes.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/redeem-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stablecoinSymbol: form.stablecoinSymbol, amount: parseFloat(form.amount), sourceWallet: form.sourceWallet, destinationBankAccount: form.destinationBankAccount }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); }
      else {
        setResult(data);
        const reqsRes = await fetch("/api/redeem-request");
        setRequests(await reqsRes.json());
        if (data.redeemRequest?.id) setExpandedId(data.redeemRequest.id);
        setForm((f) => ({ ...f, amount: "" }));
      }
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          Redeem Request
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Redeem stablecoins for fiat with full compliance and travel rule filing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-4 animate-fade-in stagger-1">
          <Card>
            <SectionHeader title="New Redeem Request" subtitle="Burn tokens · settle fiat" />
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Stablecoin */}
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>Stablecoin</label>
                <div className="grid grid-cols-3 gap-2">
                  {stablecoins.map((coin) => (
                    <button key={coin.symbol} type="button" onClick={() => setForm((f) => ({ ...f, stablecoinSymbol: coin.symbol }))}
                      className="py-2 px-3 rounded-lg text-sm font-medium transition-all"
                      style={{ background: form.stablecoinSymbol === coin.symbol ? "rgba(56,189,248,0.1)" : "var(--bg-elevated)", border: `1px solid ${form.stablecoinSymbol === coin.symbol ? "var(--info)" : "var(--border)"}`, color: form.stablecoinSymbol === coin.symbol ? "var(--info)" : "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
                    >{coin.symbol}</button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>$</span>
                  <input type="number" min="1" max="10000000" required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="50,000.00" className="w-full py-2.5 pl-6 pr-3 rounded-lg text-sm outline-none transition-all"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--info)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
              </div>

              {/* Source wallet */}
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>Source Wallet</label>
                <input type="text" required value={form.sourceWallet} onChange={(e) => setForm((f) => ({ ...f, sourceWallet: e.target.value }))}
                  className="w-full py-2.5 px-3 rounded-lg text-sm outline-none transition-all"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "11px" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--info)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>

              {/* Destination bank */}
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  Destination Bank Account
                </label>
                <div className="relative">
                  <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
                  <input type="text" value={form.destinationBankAccount} onChange={(e) => setForm((f) => ({ ...f, destinationBankAccount: e.target.value }))}
                    placeholder="IBAN or account number"
                    className="w-full py-2.5 pl-8 pr-3 rounded-lg text-sm outline-none transition-all"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "11px" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--info)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>Masked in Travel Rule filing per privacy requirements</p>
              </div>

              <div className="p-3 rounded-lg flex gap-2.5" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)" }}>
                <Info size={13} style={{ color: "var(--info)", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--info)" }}>Travel Rule Filing</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    FATF Travel Rule data will be automatically filed. Bank details are encrypted in transit.
                  </p>
                </div>
              </div>

              <button type="submit" disabled={submitting || !form.amount}
                className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: "var(--info)", color: "#000", fontFamily: "var(--font-display)" }}
              >
                {submitting ? <><Loader2 size={15} className="animate-spin" />Processing…</> : <><ArrowDownCircle size={15} />Submit Redeem Request</>}
              </button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {error && (
            <div className="p-4 rounded-xl flex gap-3 animate-fade-in" style={{ background: "var(--error-dim)", border: "1px solid rgba(244,63,94,0.3)" }}>
              <XCircle size={16} style={{ color: "var(--error)", flexShrink: 0 }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--error)" }}>Redeem Failed</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{error}</p>
              </div>
            </div>
          )}

          {result?.success && (
            <div className="p-4 rounded-xl animate-fade-in" style={{ background: "var(--success-dim)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} style={{ color: "var(--success)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--success)", fontFamily: "var(--font-display)" }}>Redeem Successful</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    Tokens locked · Fiat settlement initiated · Travel Rule filed
                  </p>
                </div>
              </div>
            </div>
          )}

          <Card noPadding className="animate-fade-in stagger-2">
            <div className="p-5 pb-3">
              <SectionHeader title="Redeem Request History" subtitle="Click a row to expand flow" />
            </div>
            {loading ? (
              <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-8 skeleton rounded" />)}</div>
            ) : requests.length === 0 ? (
              <div className="py-16 text-center" style={{ color: "var(--text-tertiary)" }}>
                <ArrowDownCircle size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No redeem requests yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Asset</th><th>Amount</th><th>Source Wallet</th><th>Status</th><th>Tx</th><th>Time</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <>
                        <tr key={r.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} style={{ background: expandedId === r.id ? "var(--bg-hover)" : undefined }}>
                          <td><span className="px-2 py-0.5 rounded text-xs" style={{ background: "var(--info-dim)", color: "var(--info)", fontFamily: "var(--font-mono)" }}>{r.stablecoin?.symbol}</span></td>
                          <td style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{fmt(r.amount)}</td>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-secondary)" }}>{truncate(r.sourceWallet, 10)}</td>
                          <td><StatusBadge status={r.status} /></td>
                          <td>
                            {r.txSignature ? (
                              <span className="text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{truncate(r.txSignature, 6)}</span>
                            ) : <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>—</span>}
                          </td>
                          <td style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</td>
                          <td>{expandedId === r.id ? <ChevronUp size={14} style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />}</td>
                        </tr>
                        {expandedId === r.id && (
                          <tr key={`${r.id}-detail`}>
                            <td colSpan={7} style={{ background: "var(--bg-elevated)", padding: "20px 16px" }}>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>Redemption Flow</h4>
                                  <RedeemFlow request={r} />
                                </div>
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>Travel Rule Data</h4>
                                  {r.travelRuleData ? (
                                    <div className="rounded-lg p-3 space-y-1.5 text-xs" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>
                                      {Object.entries(r.travelRuleData).filter(([k]) => !["timestamp"].includes(k)).map(([k, v]) => (
                                        <div key={k} className="flex gap-2">
                                          <span style={{ color: "var(--text-tertiary)", minWidth: "170px", flexShrink: 0 }}>{k}</span>
                                          <span style={{ color: "var(--text-secondary)" }}>{String(v)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>No travel rule data</p>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
