"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpCircle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Info,
  Loader2,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronUp,
  Globe,
  Banknote,
  Building2,
} from "lucide-react";
import { Card, SectionHeader } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";
import { formatDistanceToNow } from "date-fns";

const NETWORKS = [
  { id: "solana-devnet", label: "Solana Devnet", tag: "ACTIVE" },
  { id: "solana-mainnet", label: "Solana Mainnet", tag: "SOON", disabled: true },
  { id: "ethereum", label: "Ethereum Mainnet", tag: "SOON", disabled: true },
  { id: "polygon", label: "Polygon", tag: "SOON", disabled: true },
];

const SETTLEMENT_CURRENCIES = ["USD", "EUR", "GBP", "SGD", "AED"];

interface Stablecoin {
  id: string;
  symbol: string;
  name: string;
  mintAddress: string;
  decimals: number;
}

interface MintRequest {
  id: string;
  amount: number;
  destinationWallet: string;
  status: string;
  complianceStatus: string;
  txSignature?: string;
  txError?: string;
  kycVerified: boolean;
  travelRuleData?: any;
  amlScreening?: any;
  createdAt: string;
  updatedAt: string;
  stablecoin: Stablecoin;
  complianceRecord?: any;
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
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
    >
      <Copy size={11} style={{ color: copied ? "var(--success)" : "var(--text-tertiary)" }} />
    </button>
  );
}

function SelectField({
  label, value, onChange, children, accentFocus = "accent",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  accentFocus?: string;
}) {
  return (
    <div>
      <label
        className="block text-xs mb-1.5 uppercase tracking-wider"
        style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
      >
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full py-2.5 px-3 pr-8 rounded-lg text-sm outline-none appearance-none cursor-pointer transition-all"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
          }}
          onFocus={(e) => (e.target.style.borderColor = `var(--${accentFocus})`)}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        >
          {children}
        </select>
        <ChevronDown
          size={13}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>
    </div>
  );
}

function InputField({
  label, value, onChange, placeholder, prefix, required = false, hint, type = "text", accentFocus = "accent", fontSize,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  prefix?: string; required?: boolean; hint?: string; type?: string;
  accentFocus?: string; fontSize?: string;
}) {
  return (
    <div>
      <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
        {label}{required && <span style={{ color: "var(--error)" }}> *</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
            {prefix}
          </span>
        )}
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full py-2.5 rounded-lg text-sm outline-none transition-all"
          style={{
            paddingLeft: prefix ? "1.5rem" : "0.75rem",
            paddingRight: "0.75rem",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: fontSize ?? "13px",
          }}
          onFocus={(e) => (e.target.style.borderColor = `var(--${accentFocus})`)}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
      </div>
      {hint && <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{hint}</p>}
    </div>
  );
}

function SectionDivider({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <Icon size={12} style={{ color: "var(--text-tertiary)" }} />
      <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}

function TransactionFlow({ request }: { request: MintRequest }) {
  const tr = request.travelRuleData ?? {};
  const bank = tr.bankTransferDetails ?? {};

  const steps = [
    {
      id: 1,
      label: "Fiat Wire Initiated",
      done: !!bank.wireReference,
      detail: bank.wireReference
        ? `Ref: ${bank.wireReference} · ${bank.sendingBank ?? "—"} → Issuer · ${bank.settlementCurrency ?? "USD"} ${Number(tr.amount ?? 0).toLocaleString()}`
        : "Awaiting bank wire confirmation from institution",
      badge: bank.wireReference ? "VERIFIED" : "PENDING",
      ts: bank.transferDate,
    },
    {
      id: 2,
      label: "Request Submitted",
      done: true,
      detail: `${fmt(request.amount)} ${request.stablecoin.symbol} mint requested`,
      ts: request.createdAt,
    },
    {
      id: 3,
      label: "KYC / Identity Check",
      done: request.kycVerified,
      detail: request.kycVerified ? "Institution KYC verified via Jumio" : "KYC verification pending",
      badge: request.kycVerified ? "VERIFIED" : "PENDING",
    },
    {
      id: 4,
      label: "AML Screening",
      done: !!request.amlScreening && request.amlScreening.result === "CLEAR",
      detail: request.amlScreening
        ? `OFAC · FinCEN · EU Sanctions · UN Sanctions — Risk Score: ${request.amlScreening.riskScore}/100`
        : "AML screening pending",
      badge: request.amlScreening?.result ?? "PENDING",
    },
    {
      id: 5,
      label: "Travel Rule Compliance",
      done: !!request.travelRuleData,
      detail: request.travelRuleData
        ? `Originator: ${tr.originatorName} · LEI: ${tr.originatorLEI}`
        : "Travel rule data pending",
      badge: request.travelRuleData ? "COMPLIANT" : "PENDING",
    },
    {
      id: 6,
      label: "Compliance Approval",
      done: request.complianceStatus === "APPROVED",
      detail: request.complianceRecord?.notes ?? "Awaiting compliance officer review",
      badge: request.complianceStatus,
    },
    {
      id: 7,
      label: "On-Chain Mint",
      done: request.status === "COMPLETED",
      failed: request.status === "FAILED",
      detail: request.txSignature
        ? `Tx: ${truncate(request.txSignature, 8)}`
        : request.txError ?? "Token mint pending",
      txSig: request.txSignature,
      badge: request.status,
    },
  ];

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                style={{
                  background: (step as any).failed
                    ? "var(--error-dim)"
                    : step.done
                    ? "var(--success-dim)"
                    : "var(--bg-elevated)",
                  border: `2px solid ${(step as any).failed ? "var(--error)" : step.done ? "var(--success)" : "var(--border-bright)"}`,
                }}
              >
                {(step as any).failed ? (
                  <XCircle size={12} style={{ color: "var(--error)" }} />
                ) : step.done ? (
                  <CheckCircle2 size={12} style={{ color: "var(--success)" }} />
                ) : (
                  <span className="text-[9px] font-bold" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    {step.id}
                  </span>
                )}
              </div>
              {!isLast && (
                <div
                  className="w-0.5 flex-1 my-1"
                  style={{ background: step.done ? "var(--success)" : "var(--border)", opacity: step.done ? 0.4 : 1, minHeight: "20px" }}
                />
              )}
            </div>
            <div className="pb-4 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-sm font-medium"
                  style={{
                    color: (step as any).failed ? "var(--error)" : step.done ? "var(--text-primary)" : "var(--text-secondary)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {step.label}
                </span>
                {(step as any).badge && <StatusBadge status={(step as any).badge} />}
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                {step.detail}
                {(step as any).txSig && (
                  <>
                    <CopyButton text={(step as any).txSig} />
                    <a
                      href={`https://explorer.solana.com/tx/${(step as any).txSig}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1"
                      style={{ color: "var(--accent)" }}
                    >
                      <ExternalLink size={10} />
                      Solana Explorer
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RequestRow({ request, onExpand, expanded }: { request: MintRequest; onExpand: () => void; expanded: boolean }) {
  const bank = request.travelRuleData?.bankTransferDetails;
  return (
    <>
      <tr className="cursor-pointer" onClick={onExpand} style={{ background: expanded ? "var(--bg-hover)" : undefined }}>
        <td>
          <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: "var(--accent-subtle)", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
            {request.stablecoin?.symbol}
          </span>
        </td>
        <td style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{fmt(request.amount)}</td>
        <td style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-secondary)" }}>
          {truncate(request.destinationWallet, 10)}
        </td>
        <td>
          {bank?.wireReference ? (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--success-dim)", color: "var(--success)" }}>
              {bank.wireReference}
            </span>
          ) : (
            <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>—</span>
          )}
        </td>
        <td><StatusBadge status={request.status} /></td>
        <td>
          {request.txSignature ? (
            <a
              href={`https://explorer.solana.com/tx/${request.txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--accent)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {truncate(request.txSignature, 6)}
              <ExternalLink size={10} />
            </a>
          ) : (
            <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>—</span>
          )}
        </td>
        <td style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>
          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
        </td>
        <td>
          {expanded ? <ChevronUp size={14} style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} style={{ background: "var(--bg-elevated)", padding: "20px 16px" }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  Transaction Flow
                </h4>
                <TransactionFlow request={request} />
              </div>
              <div className="space-y-4">
                {/* Bank Transfer Details */}
                {request.travelRuleData?.bankTransferDetails && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      Fiat Wire Details
                    </h4>
                    <div className="rounded-lg p-3 space-y-1.5 text-xs" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>
                      {Object.entries(request.travelRuleData.bankTransferDetails).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span style={{ color: "var(--text-tertiary)", minWidth: "160px", flexShrink: 0 }}>{k}</span>
                          <span style={{ color: "var(--text-secondary)" }}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    Travel Rule Data
                  </h4>
                  {request.travelRuleData ? (
                    <div className="rounded-lg p-3 space-y-1.5 text-xs" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>
                      {Object.entries(request.travelRuleData)
                        .filter(([k]) => !["timestamp", "bankTransferDetails"].includes(k))
                        .map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span style={{ color: "var(--text-tertiary)", minWidth: "160px", flexShrink: 0 }}>{k}</span>
                            <span style={{ color: "var(--text-secondary)" }}>{String(v)}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>No travel rule data</p>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    AML Screening
                  </h4>
                  {request.amlScreening ? (
                    <div className="rounded-lg p-3 space-y-1.5 text-xs" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>
                      {Object.entries(request.amlScreening)
                        .filter(([k]) => !["timestamp"].includes(k))
                        .map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span style={{ color: "var(--text-tertiary)", minWidth: "120px", flexShrink: 0 }}>{k}</span>
                            <span style={{ color: Array.isArray(v) ? "var(--text-secondary)" : v === "CLEAR" ? "var(--success)" : "var(--text-secondary)" }}>
                              {Array.isArray(v) ? (v as string[]).join(", ") : String(v)}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>No AML data</p>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function MintPage() {
  const inst = PLACEHOLDER_INSTITUTION;
  const [stablecoins, setStablecoins] = useState<Stablecoin[]>([]);
  const [requests, setRequests] = useState<MintRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    network: "solana-devnet",
    stablecoinSymbol: "USDX",
    amount: "",
    destinationWallet: inst.walletAddress,
    // Off-chain fiat transfer
    wireReference: "",
    sendingBank: "",
    bankSwiftBic: "",
    transferDate: new Date().toISOString().split("T")[0],
    settlementCurrency: "USD",
  });

  const set = (key: string) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    async function load() {
      try {
        const [coinsRes, reqsRes] = await Promise.all([fetch("/api/stablecoins"), fetch("/api/mint-request")]);
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
      const res = await fetch("/api/mint-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stablecoinSymbol: form.stablecoinSymbol,
          amount: parseFloat(form.amount),
          destinationWallet: form.destinationWallet,
          network: form.network,
          bankTransferDetails: {
            wireReference: form.wireReference,
            sendingBank: form.sendingBank,
            bankSwiftBic: form.bankSwiftBic,
            transferDate: form.transferDate,
            settlementCurrency: form.settlementCurrency,
            transferAmount: parseFloat(form.amount),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setResult(data);
        const reqsRes = await fetch("/api/mint-request");
        setRequests(await reqsRes.json());
        if (data.mintRequest?.id) setExpandedId(data.mintRequest.id);
        setForm((f) => ({ ...f, amount: "", wireReference: "", sendingBank: "", bankSwiftBic: "" }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCoin = stablecoins.find((c) => c.symbol === form.stablecoinSymbol);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          Mint Request
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Issue new stablecoin tokens with full compliance verification
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form */}
        <div className="lg:col-span-1 space-y-4 animate-fade-in stagger-1">
          <Card>
            <SectionHeader title="New Mint Request" subtitle="KYC + Travel Rule auto-verified" />
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Network */}
              <SelectField label="Network" value={form.network} onChange={set("network")}>
                {NETWORKS.map((n) => (
                  <option key={n.id} value={n.id} disabled={n.disabled}>
                    {n.label}{n.disabled ? " — Coming Soon" : ""}
                  </option>
                ))}
              </SelectField>

              {/* Stablecoin */}
              <div>
                <SelectField label="Stablecoin" value={form.stablecoinSymbol} onChange={set("stablecoinSymbol")}>
                  {loading ? (
                    <option>Loading…</option>
                  ) : (
                    stablecoins.map((coin) => (
                      <option key={coin.symbol} value={coin.symbol}>
                        {coin.symbol} — {coin.name}
                      </option>
                    ))
                  )}
                </SelectField>
                {selectedCoin && (
                  <div
                    className="mt-2 text-[10px] px-2 py-1 rounded flex items-center gap-1"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", border: "1px solid var(--border)" }}
                  >
                    <span className="truncate">{truncate(selectedCoin.mintAddress, 12)}</span>
                    <CopyButton text={selectedCoin.mintAddress} />
                  </div>
                )}
              </div>

              {/* Amount */}
              <div>
                <InputField
                  label="Amount (USD)"
                  value={form.amount}
                  onChange={set("amount")}
                  placeholder="100,000.00"
                  prefix="$"
                  required
                />
                {form.amount && !isNaN(parseFloat(form.amount)) && (
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    = {parseFloat(form.amount).toLocaleString()} {form.stablecoinSymbol}
                  </p>
                )}
              </div>

              {/* Destination wallet */}
              <InputField
                label="Destination Wallet"
                value={form.destinationWallet}
                onChange={set("destinationWallet")}
                placeholder="Solana wallet address"
                required
                fontSize="11px"
              />

              {/* ── Off-chain fiat transfer section ── */}
              <SectionDivider icon={Banknote} label="Off-Chain Fiat Transfer" />

              <div
                className="p-3 rounded-lg flex gap-2.5"
                style={{ background: "rgba(120,137,171,0.06)", border: "1px solid var(--border)" }}
              >
                <Info size={13} style={{ color: "var(--text-tertiary)", flexShrink: 0, marginTop: "1px" }} />
                <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  Provide the wire details for the corresponding fiat transfer. These are matched against the issuer's bank records before tokens are minted.
                </p>
              </div>

              <InputField
                label="Wire / Transfer Reference"
                value={form.wireReference}
                onChange={set("wireReference")}
                placeholder="e.g. SWIFT ref, fedwire ID, IMAD"
                hint="Your bank's reference number for this wire transfer"
              />

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Sending Bank"
                  value={form.sendingBank}
                  onChange={set("sendingBank")}
                  placeholder="e.g. JPMorgan Chase"
                />
                <InputField
                  label="SWIFT / BIC"
                  value={form.bankSwiftBic}
                  onChange={set("bankSwiftBic")}
                  placeholder="e.g. CHASUS33"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Transfer Date"
                  value={form.transferDate}
                  onChange={set("transferDate")}
                  type="date"
                />
                <SelectField label="Settlement Currency" value={form.settlementCurrency} onChange={set("settlementCurrency")}>
                  {SETTLEMENT_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </SelectField>
              </div>

              {/* ── Compliance notice ── */}
              <div
                className="p-3 rounded-lg flex gap-2.5"
                style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-glow)" }}
              >
                <ShieldCheck size={13} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>Auto-Compliance Enabled</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    KYC, AML screening, and FATF Travel Rule data will be automatically applied.
                  </p>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !form.amount || !form.destinationWallet}
                className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50"
                style={{ background: submitting ? "var(--accent-dim)" : "var(--accent)", color: "#000", fontFamily: "var(--font-display)" }}
              >
                {submitting ? (
                  <><Loader2 size={15} className="animate-spin" />Processing…</>
                ) : (
                  <><ArrowUpCircle size={15} />Submit Mint Request</>
                )}
              </button>
            </form>
          </Card>

          {/* Institution context */}
          <Card>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              Originating Institution
            </h3>
            <div className="space-y-2.5 text-xs">
              {[
                ["Institution", inst.name],
                ["LEI", inst.leiCode],
                ["Jurisdiction", inst.jurisdiction],
                ["KYC Status", inst.kycStatus],
                ["AML Status", inst.amlStatus],
                ["FATF", inst.fatfJurisdiction],
                ["License", inst.regulatoryLicense],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{k}</span>
                  <span
                    className="text-right"
                    style={{ color: v === "VERIFIED" || v === "CLEAR" ? "var(--success)" : "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Result + History */}
        <div className="lg:col-span-2 space-y-4">
          {error && (
            <div className="p-4 rounded-xl flex gap-3 animate-fade-in" style={{ background: "var(--error-dim)", border: "1px solid rgba(244,63,94,0.3)" }}>
              <XCircle size={16} style={{ color: "var(--error)", flexShrink: 0 }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--error)" }}>Mint Failed</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{error}</p>
              </div>
            </div>
          )}

          {result && result.success && (
            <div className="p-4 rounded-xl animate-fade-in" style={{ background: "var(--success-dim)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} style={{ color: "var(--success)", flexShrink: 0, marginTop: "2px" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--success)", fontFamily: "var(--font-display)" }}>Mint Successful</p>
                  {result.txSignature && !result.txSignature.startsWith("DEMO") && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Transaction confirmed on Solana Devnet</p>
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] px-2 py-1 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                          {truncate(result.txSignature, 16)}
                        </code>
                        <CopyButton text={result.txSignature} />
                        <a
                          href={`https://explorer.solana.com/tx/${result.txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs"
                          style={{ color: "var(--accent)" }}
                        >
                          <ExternalLink size={11} />
                          View on Explorer
                        </a>
                      </div>
                    </div>
                  )}
                  {result.note && <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>{result.note}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Request history */}
          <Card noPadding className="animate-fade-in stagger-2">
            <div className="p-5 pb-3">
              <SectionHeader title="Mint Request History" subtitle="Click a row to expand transaction flow" />
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-8 skeleton rounded" />)}
              </div>
            ) : requests.length === 0 ? (
              <div className="py-16 text-center" style={{ color: "var(--text-tertiary)" }}>
                <ArrowUpCircle size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No mint requests yet</p>
                <p className="text-xs mt-1">Submit your first request using the form</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Amount</th>
                      <th>Destination</th>
                      <th>Wire Ref</th>
                      <th>Status</th>
                      <th>Tx Signature</th>
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <RequestRow
                        key={r.id}
                        request={r}
                        expanded={expandedId === r.id}
                        onExpand={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      />
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
