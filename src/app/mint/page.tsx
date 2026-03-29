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
  Copy,
  ChevronDown,
  ChevronUp,
  Banknote,
  RefreshCw,
} from "lucide-react";
import { Card, SectionHeader } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  MintRequestRecord,
  MintSubmissionResponse,
  StablecoinRecord,
  getErrorMessage,
} from "@/lib/demo-types";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";
import { usePhantomWallet } from "@/components/PhantomWalletProvider";
import { formatDistanceToNow } from "date-fns";

const NETWORKS = [
  { id: "solana-devnet", label: "Solana Devnet", tag: "ACTIVE" },
  { id: "solana-mainnet", label: "Solana Mainnet", tag: "SOON", disabled: true },
  { id: "ethereum", label: "Ethereum Mainnet", tag: "SOON", disabled: true },
  { id: "polygon", label: "Polygon", tag: "SOON", disabled: true },
];

const SETTLEMENT_CURRENCIES = ["USD", "EUR", "GBP", "SGD", "AED"];

interface MintFlowStep {
  id: number;
  label: string;
  done: boolean;
  detail: string;
  badge?: string;
  txSig?: string;
  failed?: boolean;
}

const MINT_COMPLIANCE_ANIMATION_MS = 2000;

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
  label, value, onChange, children, accentFocus = "accent", disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  accentFocus?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        className="block text-[11px] mb-2 uppercase tracking-[0.16em] font-semibold"
        style={{ color: "#edf4ff", fontFamily: "var(--font-mono)", textShadow: "0 0 18px rgba(255,255,255,0.05)" }}
      >
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full py-3 px-3.5 pr-9 rounded-xl text-sm outline-none appearance-none cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "linear-gradient(180deg, rgba(17,21,32,0.96) 0%, rgba(11,15,24,0.96) 100%)",
            border: "1px solid var(--border-bright)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = `var(--${accentFocus})`;
            e.target.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--${accentFocus}) 20%, transparent), inset 0 1px 0 rgba(255,255,255,0.04)`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border-bright)";
            e.target.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.04)";
          }}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-secondary)" }}
        />
      </div>
    </div>
  );
}

function InputField({
  label, value, onChange, placeholder, prefix, required = false, hint, type = "text", accentFocus = "accent", fontSize, disabled = false,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  prefix?: string; required?: boolean; hint?: string; type?: string;
  accentFocus?: string; fontSize?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] mb-2 uppercase tracking-[0.16em] font-semibold" style={{ color: "#edf4ff", fontFamily: "var(--font-mono)", textShadow: "0 0 18px rgba(255,255,255,0.05)" }}>
        {label}{required && <span style={{ color: "var(--error)" }}> *</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            {prefix}
          </span>
        )}
        <input
          type={type}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full py-3 rounded-xl text-sm outline-none transition-all placeholder:text-[#64748b] disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            paddingLeft: prefix ? "1.85rem" : "0.9rem",
            paddingRight: "0.9rem",
            background: "linear-gradient(180deg, rgba(17,21,32,0.96) 0%, rgba(11,15,24,0.96) 100%)",
            border: "1px solid var(--border-bright)",
            color: "#fff",
            fontFamily: "var(--font-mono)",
            fontSize: fontSize ?? "13px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = `var(--${accentFocus})`;
            e.target.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--${accentFocus}) 20%, transparent), inset 0 1px 0 rgba(255,255,255,0.04)`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border-bright)";
            e.target.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.04)";
          }}
        />
      </div>
      {hint && <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{hint}</p>}
    </div>
  );
}

function SectionDivider({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <Icon size={12} style={{ color: "var(--text-secondary)" }} />
      <span className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: "#dbe7ff", fontFamily: "var(--font-mono)" }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, var(--border-bright), transparent)" }} />
    </div>
  );
}

function TransactionFlow({
  request,
  animateCompliance = false,
  onAnimationComplete,
}: {
  request: MintRequestRecord;
  animateCompliance?: boolean;
  onAnimationComplete?: () => void;
}) {
  const tr = request.travelRuleData ?? {};
  const bank = tr.bankTransferDetails ?? {};
  const [animatedStep, setAnimatedStep] = useState(1);

  // All compliance steps are verified at submission time.
  // On-chain mint is the only step that requires issuer action.
  const complianceDone = request.complianceStatus === "APPROVED";
  const onChainDone = request.status === "COMPLETED";
  const onChainFailed = request.status === "FAILED";
  const shouldAnimateCompliance =
    animateCompliance &&
    request.status === "APPROVED" &&
    request.complianceStatus === "APPROVED";
  const revealedStep = shouldAnimateCompliance ? animatedStep : 5;

  useEffect(() => {
    if (!shouldAnimateCompliance) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let step = 2; step <= 5; step += 1) {
      timers.push(
        setTimeout(() => {
          setAnimatedStep(step);
          if (step === 5) onAnimationComplete?.();
        }, (step - 1) * MINT_COMPLIANCE_ANIMATION_MS)
      );
    }

    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [onAnimationComplete, shouldAnimateCompliance]);

  const steps: MintFlowStep[] = [
    {
      id: 1,
      label: "Request Submitted",
      done: true,
      detail: `${fmt(request.amount)} ${request.stablecoin.symbol} mint requested`,
    },
    {
      id: 2,
      label: "KYC / Identity Check",
      done: shouldAnimateCompliance ? revealedStep >= 2 : complianceDone || request.kycVerified,
      detail: "Institution KYC verified via Jumio · LEI validated",
      badge: "VERIFIED",
    },
    {
      id: 3,
      label: "AML Screening",
      done: shouldAnimateCompliance ? revealedStep >= 3 : complianceDone || !!request.amlScreening,
      detail: request.amlScreening
        ? `OFAC · FinCEN · EU Sanctions · UN Sanctions — Risk Score: ${request.amlScreening.riskScore}/100`
        : "AML screening pending",
      badge: request.amlScreening?.result ?? "PENDING",
    },
    {
      id: 4,
      label: "Travel Rule Filing",
      done: shouldAnimateCompliance ? revealedStep >= 4 : complianceDone || !!request.travelRuleData,
      detail: request.travelRuleData
        ? `FATF compliant · Originator: ${tr.originatorName} · LEI: ${tr.originatorLEI}`
        : "Travel rule data pending",
      badge: request.travelRuleData ? "COMPLIANT" : "PENDING",
    },
    {
      id: 5,
      label: "Compliance Approved",
      done: shouldAnimateCompliance ? revealedStep >= 5 : complianceDone,
      detail: complianceDone
        ? "KYC · AML · Travel Rule all cleared · Awaiting issuer mint"
        : "Awaiting compliance review",
      badge: request.complianceStatus,
    },
    {
      id: 6,
      label: "Fiat Received by Issuer",
      done: onChainDone, // issuer confirms fiat before running the mint script
      detail: onChainDone
        ? `${bank.sendingBank ? `Wire from ${bank.sendingBank}` : "Fiat wire"} confirmed received · Ref: ${bank.wireReference ?? "—"}`
        : complianceDone
          ? "Issuer confirming fiat wire receipt before minting"
          : "Pending compliance approval",
      badge: onChainDone ? "CONFIRMED" : complianceDone ? "AWAITING" : "PENDING",
    },
    {
      id: 7,
      label: "On-Chain Mint",
      done: onChainDone,
      failed: onChainFailed,
      detail: request.txSignature
        ? `Tokens minted · Tx: ${truncate(request.txSignature, 8)}`
        : onChainFailed
          ? request.txError ?? "Mint failed"
          : complianceDone
            ? "Request Id: " + request.id
            : "Pending compliance",
      txSig: request.txSignature,
      badge: onChainDone ? "COMPLETED" : onChainFailed ? "FAILED" : "PENDING",
    },
  ];

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const stepChecking =
          shouldAnimateCompliance &&
          step.id >= 2 &&
          step.id <= 5 &&
          revealedStep === step.id - 1;
        return (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                style={{
                  background: step.failed
                    ? "var(--error-dim)"
                    : step.done
                      ? "var(--success-dim)"
                      : "var(--bg-elevated)",
                  border: `2px solid ${step.failed ? "var(--error)" : step.done ? "var(--success)" : "var(--border-bright)"}`,
                }}
              >
                {step.failed ? (
                  <XCircle size={12} style={{ color: "var(--error)" }} />
                ) : stepChecking ? (
                  <Loader2 size={11} className="animate-spin" style={{ color: "var(--accent)" }} />
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
                    color: step.failed ? "var(--error)" : step.done ? "var(--text-primary)" : "var(--text-secondary)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {step.label}
                </span>
                {step.badge && <StatusBadge status={step.badge} />}
                {stepChecking && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: "rgba(245,158,11,0.1)",
                      color: "var(--warning)",
                      border: "1px solid rgba(245,158,11,0.25)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    CHECKING
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                {step.detail}
                {step.txSig && (
                  <>
                    <CopyButton text={step.txSig} />
                    <a
                      href={`https://explorer.solana.com/tx/${step.txSig}?cluster=devnet`}
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

function RequestRow({
  request,
  onExpand,
  expanded,
  animateCompliance = false,
  onAnimationComplete,
}: {
  request: MintRequestRecord;
  onExpand: () => void;
  expanded: boolean;
  animateCompliance?: boolean;
  onAnimationComplete?: () => void;
}) {
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
              {String(bank.wireReference)}
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
                <TransactionFlow
                  key={`${request.id}-${animateCompliance ? "animate" : "static"}`}
                  request={request}
                  animateCompliance={animateCompliance}
                  onAnimationComplete={onAnimationComplete}
                />
              </div>
              <div className="space-y-4">
                {/* Bank Transfer Details */}
                {request.travelRuleData?.bankTransferDetails && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      Fiat Wire Details
                    </h4>
                    <div className="rounded-lg p-3 space-y-1.5 text-xs" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>
                      {Object.entries(request.travelRuleData.bankTransferDetails ?? {}).map(([k, v]) => (
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
                      {Object.entries(request.amlScreening ?? {})
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
  const wallet = usePhantomWallet();
  const [stablecoins, setStablecoins] = useState<StablecoinRecord[]>([]);
  const [requests, setRequests] = useState<MintRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MintSubmissionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [animatedRequestId, setAnimatedRequestId] = useState<string | null>(null);

  const [form, setForm] = useState({
    network: "solana-devnet",
    stablecoinSymbol: "USX",
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

  const [refreshing, setRefreshing] = useState(false);

  async function refreshRequests() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/mint-request");
      setRequests((await res.json()) as MintRequestRecord[]);
    } catch {
      // ignore background refresh errors
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [coinsRes, reqsRes] = await Promise.all([fetch("/api/stablecoins"), fetch("/api/mint-request")]);
        setStablecoins((await coinsRes.json()) as StablecoinRecord[]);
        setRequests((await reqsRes.json()) as MintRequestRecord[]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const connectedAddress = wallet.address;
    if (!connectedAddress) return;
    setForm((current) => {
      if (current.destinationWallet && current.destinationWallet !== inst.walletAddress) {
        return current;
      }
      return { ...current, destinationWallet: connectedAddress };
    });
  }, [inst.walletAddress, wallet.address]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (walletDisconnected) return;
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
      const data = (await res.json()) as MintSubmissionResponse & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to submit mint request");
      } else {
        setResult(data);
        const reqsRes = await fetch("/api/mint-request");
        setRequests((await reqsRes.json()) as MintRequestRecord[]);
        if (data.mintRequest?.id) {
          setExpandedId(data.mintRequest.id);
          setAnimatedRequestId(data.mintRequest.id);
        }
        setForm((f) => ({ ...f, amount: "", wireReference: "", sendingBank: "", bankSwiftBic: "" }));
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCoin = stablecoins.find((c) => c.symbol === form.stablecoinSymbol);
  const walletDisconnected = !wallet.connected;
  const mintFormDisabled = walletDisconnected || submitting;

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
          <Card
            className="relative overflow-hidden"
            style={{
              background: "linear-gradient(180deg, rgba(13,16,24,0.98) 0%, rgba(8,10,16,0.98) 100%)",
              border: "1px solid var(--border-bright)",
              boxShadow: "0 22px 40px rgba(0,0,0,0.28)",
            }}
          >
            <SectionHeader title="New Mint Request" subtitle="KYC + Travel Rule auto-verified" />
            <form onSubmit={handleSubmit} className="space-y-4">
              {walletDisconnected && (
                <div
                  className="p-3 rounded-lg flex gap-2.5"
                  style={{ background: "rgba(120,137,171,0.08)", border: "1px solid rgba(148,163,184,0.28)" }}
                >
                  <Info size={13} style={{ color: "var(--text-tertiary)", flexShrink: 0, marginTop: "1px" }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Wallet connection required</p>
                    <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      Connect Phantom to unlock mint requests.
                    </p>
                  </div>
                </div>
              )}
              <div
                className="space-y-4"
                style={{
                  opacity: walletDisconnected ? 0.5 : 1,
                  filter: walletDisconnected ? "grayscale(0.25)" : undefined,
                  transition: "opacity 0.2s ease, filter 0.2s ease",
                }}
              >
                <div
                  className="grid grid-cols-2 gap-2 rounded-xl p-3"
                  style={{ background: "rgba(10,14,22,0.78)", border: "1px solid var(--border)" }}
                >
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      Mint flow
                    </p>
                    <p className="text-sm mt-1 font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                      Fiat matched before issuance
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      Compliance
                    </p>
                    <p className="text-sm mt-1 font-semibold" style={{ color: "var(--accent)", fontFamily: "var(--font-display)" }}>
                      KYC + AML + Travel Rule
                    </p>
                  </div>
                </div>

                <div
                  className="space-y-4 rounded-xl p-4"
                  style={{ background: "rgba(10,14,22,0.78)", border: "1px solid var(--border)" }}
                >

                  {/* Network */}
                  <SelectField label="Network" value={form.network} onChange={set("network")} disabled={mintFormDisabled}>
                    {NETWORKS.map((n) => (
                      <option key={n.id} value={n.id} disabled={n.disabled}>
                        {n.label}{n.disabled ? " — Coming Soon" : ""}
                      </option>
                    ))}
                  </SelectField>

                  {/* Stablecoin */}
                  <div>
                    <SelectField label="Stablecoin" value={form.stablecoinSymbol} onChange={set("stablecoinSymbol")} disabled={mintFormDisabled}>
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
                      disabled={mintFormDisabled}
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
                    placeholder={wallet.connected ? "Connected Phantom wallet" : "Solana wallet address"}
                    required
                    fontSize="11px"
                    disabled={mintFormDisabled}
                    hint={
                      wallet.connected && wallet.shortAddress
                        ? `Connected Phantom: ${wallet.shortAddress}`
                        : "Use the destination wallet that should receive the minted stablecoins."
                    }
                  />
                </div>

                {/* ── Off-chain fiat transfer section ── */}
                <SectionDivider icon={Banknote} label="Off-Chain Fiat Transfer" />

                <div
                  className="space-y-4 rounded-xl p-4"
                  style={{ background: "rgba(10,14,22,0.78)", border: "1px solid var(--border)" }}
                >

                  <div
                    className="p-3 rounded-lg flex gap-2.5"
                    style={{ background: "rgba(120,137,171,0.08)", border: "1px solid var(--border-bright)" }}
                  >
                    <Info size={13} style={{ color: "var(--text-tertiary)", flexShrink: 0, marginTop: "1px" }} />
                    <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      Provide the wire details for the corresponding fiat transfer. These are matched against the issuer&apos;s bank records before tokens are minted.
                    </p>
                  </div>

                  <InputField
                    label="Wire / Transfer Reference"
                    value={form.wireReference}
                    onChange={set("wireReference")}
                    placeholder="e.g. SWIFT ref, fedwire ID, IMAD"
                    hint="Your bank's reference number for this wire transfer"
                    disabled={mintFormDisabled}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Sending Bank"
                      value={form.sendingBank}
                      onChange={set("sendingBank")}
                      placeholder="e.g. JPMorgan Chase"
                      disabled={mintFormDisabled}
                    />
                    <InputField
                      label="SWIFT / BIC"
                      value={form.bankSwiftBic}
                      onChange={set("bankSwiftBic")}
                      placeholder="e.g. CHASUS33"
                      disabled={mintFormDisabled}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Transfer Date"
                      value={form.transferDate}
                      onChange={set("transferDate")}
                      type="date"
                      disabled={mintFormDisabled}
                    />
                    <SelectField label="Settlement Currency" value={form.settlementCurrency} onChange={set("settlementCurrency")} disabled={mintFormDisabled}>
                      {SETTLEMENT_CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </SelectField>
                  </div>
                </div>

                {/* ── Compliance notice ── */}
                <div
                  className="p-3 rounded-lg flex gap-2.5"
                  style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}
                >
                  <ShieldCheck size={13} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "1px" }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>Auto-Compliance Enabled</p>
                    <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      KYC, AML screening, and FATF Travel Rule data will be automatically applied.
                    </p>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={mintFormDisabled || !form.amount || !form.destinationWallet}
                  className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50"
                  style={{
                    background: mintFormDisabled ? "rgba(120,137,171,0.22)" : submitting ? "var(--accent-dim)" : "var(--accent)",
                    color: mintFormDisabled ? "var(--text-tertiary)" : "#000",
                    fontFamily: "var(--font-display)",
                    cursor: mintFormDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? (
                    <><Loader2 size={15} className="animate-spin" />Processing…</>
                  ) : (
                    <><ArrowUpCircle size={15} />Submit Mint Request</>
                  )}
                </button>
              </div>
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
              <SectionHeader
                title="Mint Request History"
                subtitle="Click a row to expand transaction flow"
                action={
                  <button
                    onClick={refreshRequests}
                    disabled={refreshing}
                    title="Refresh request statuses"
                    className="flex items-center gap-1.5 text-xs disabled:opacity-50 transition-opacity"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <RefreshCw
                      size={12}
                      className={refreshing ? "animate-spin" : undefined}
                      style={{ color: "var(--accent)" }}
                    />
                    <span style={{ color: "var(--accent)" }}>{refreshing ? "Refreshing…" : "Refresh"}</span>
                  </button>
                }
              />
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
                        animateCompliance={animatedRequestId === r.id}
                        onAnimationComplete={() => {
                          setAnimatedRequestId((current) => (current === r.id ? null : current));
                        }}
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
