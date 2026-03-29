"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowDownCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
  Building2,
  Banknote,
} from "lucide-react";
import { Card, SectionHeader } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  RedeemRequestRecord,
  RedeemSubmissionResponse,
  StablecoinRecord,
  getErrorMessage,
} from "@/lib/demo-types";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";
import { usePhantomWallet } from "@/components/PhantomWalletProvider";
import { formatDistanceToNow } from "date-fns";

const NETWORKS = [
  { id: "solana-devnet", label: "Solana Devnet", disabled: false },
  { id: "solana-mainnet", label: "Solana Mainnet", disabled: true },
  { id: "ethereum", label: "Ethereum Mainnet", disabled: true },
  { id: "polygon", label: "Polygon", disabled: true },
];

interface RedeemFlowStep {
  id: number;
  label: string;
  done: boolean;
  detail: string;
  badge?: string;
  blocked?: boolean;
  txSig?: string;
  awaitingConfirm?: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

function truncate(s: string, len = 12) {
  if (!s) return "—";
  return s.length > len * 2 ? `${s.slice(0, len)}…${s.slice(-6)}` : s;
}

function SelectField({
  label, value, onChange, children, accentFocus = "info", disabled = false,
}: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; accentFocus?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] mb-2 uppercase tracking-[0.16em] font-semibold" style={{ color: "#edf4ff", fontFamily: "var(--font-mono)", textShadow: "0 0 18px rgba(255,255,255,0.05)" }}>
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
            e.target.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--${accentFocus}) 18%, transparent), inset 0 1px 0 rgba(255,255,255,0.04)`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border-bright)";
            e.target.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.04)";
          }}
        >
          {children}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-secondary)" }} />
      </div>
    </div>
  );
}

function InputField({
  label, value, onChange, placeholder, prefix, icon: Icon, required = false, hint, type = "text", fontSize, accentFocus = "info", disabled = false,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  prefix?: string; icon?: React.ElementType; required?: boolean; hint?: string;
  type?: string; fontSize?: string; accentFocus?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] mb-2 uppercase tracking-[0.16em] font-semibold" style={{ color: "#edf4ff", fontFamily: "var(--font-mono)", textShadow: "0 0 18px rgba(255,255,255,0.05)" }}>
        {label}{required && <span style={{ color: "var(--error)" }}> *</span>}
      </label>
      <div className="relative">
        {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{prefix}</span>}
        {Icon && <Icon size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />}
        <input
          type={type}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full py-3 rounded-xl text-sm outline-none transition-all placeholder:text-[#64748b] disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            paddingLeft: (prefix || Icon) ? "1.95rem" : "0.9rem",
            paddingRight: "0.9rem",
            background: "linear-gradient(180deg, rgba(17,21,32,0.96) 0%, rgba(11,15,24,0.96) 100%)",
            border: "1px solid var(--border-bright)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: fontSize ?? "13px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = `var(--${accentFocus})`;
            e.target.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--${accentFocus}) 18%, transparent), inset 0 1px 0 rgba(255,255,255,0.04)`;
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

function RedeemFlow({
  request,
  onFiatConfirmed,
}: {
  request: RedeemRequestRecord;
  onFiatConfirmed: () => void;
}) {
  const tr = request.travelRuleData ?? {};
  const settlement = tr.settlementDetails ?? {};
  const [confirming, setConfirming] = useState(false);
  const [confirmRef, setConfirmRef] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const onChainDone = ["ON_CHAIN_CONFIRMED", "FIAT_INITIATED", "COMPLETED"].includes(request.status);
  const fiatInitiated = ["ON_CHAIN_CONFIRMED", "FIAT_INITIATED", "COMPLETED"].includes(request.status);
  const fiatDone = request.status === "COMPLETED";
  const awaitingFiatConfirm = request.status === "ON_CHAIN_CONFIRMED";

  async function handleConfirmFiat() {
    setConfirming(true);
    setConfirmError(null);
    try {
      const res = await fetch(`/api/redeem-request/${request.id}/confirm-fiat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankConfirmationRef: confirmRef || undefined, confirmedBy: "Institution Operator" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConfirmError(data.error);
      } else {
        onFiatConfirmed();
      }
    } catch (e: unknown) {
      setConfirmError(getErrorMessage(e));
    } finally {
      setConfirming(false);
    }
  }

  const steps: RedeemFlowStep[] = [
    {
      id: 1, label: "Redeem Request Submitted", done: true,
      detail: `${fmt(request.amount)} ${request.stablecoin.symbol} redemption requested`,
    },
    {
      id: 2, label: "KYC Verified", done: request.kycVerified,
      detail: "Institution identity verified",
      badge: request.kycVerified ? "VERIFIED" : "PENDING",
      blocked: !request.kycVerified,
    },
    {
      id: 3, label: "AML Screening",
      done: request.complianceStatus === "APPROVED",
      detail: request.complianceStatus === "APPROVED"
        ? `Risk score within threshold · OFAC / FinCEN / EU-Sanctions clear`
        : request.complianceStatus === "IN_REVIEW"
          ? "Under manual review — burn cannot proceed until cleared"
          : "Pending",
      badge: request.complianceStatus,
      blocked: request.complianceStatus === "IN_REVIEW",
    },
    {
      id: 4, label: "Travel Rule Filed", done: !!request.travelRuleData,
      detail: request.travelRuleData
        ? `FATF Compliant · VASP: ${tr.vasp ?? "Apex Capital LLC"}`
        : "Travel rule data pending",
      badge: request.travelRuleData ? "COMPLIANT" : "PENDING",
    },
    {
      id: 5, label: "Tokens Burned On-chain", done: onChainDone,
      detail: request.txSignature
        ? `Burn confirmed · Tx: ${truncate(request.txSignature, 8)}`
        : "Awaiting compliance approval",
      txSig: request.txSignature,
      badge: onChainDone ? "CONFIRMED" : request.status,
    },
    {
      id: 6, label: "Fiat Wire Initiated", done: fiatInitiated,
      detail: fiatInitiated
        ? `Issuer instructed to wire ${settlement.paymentRails ?? "SWIFT"} to ${settlement.beneficiaryBank ?? "beneficiary bank"}${settlement.transferReference ? ` · Ref: ${settlement.transferReference}` : ""}`
        : "Pending on-chain burn",
      badge: fiatInitiated ? "INITIATED" : "PENDING",
    },
    {
      id: 7, label: "Fiat Receipt Confirmed", done: fiatDone,
      detail: fiatDone
        ? `Funds received · ${request.fiatReference ? `Bank ref: ${request.fiatReference}` : "Settlement confirmed"}`
        : awaitingFiatConfirm
          ? "Confirm once funds arrive in your account"
          : "Awaiting wire initiation",
      awaitingConfirm: awaitingFiatConfirm,
    },
  ];

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10"
              style={{
                background: step.done
                  ? "var(--success-dim)"
                  : step.blocked
                    ? "rgba(244,63,94,0.12)"
                    : "var(--bg-elevated)",
                border: `2px solid ${step.done ? "var(--success)" : step.blocked ? "var(--error)" : "var(--border-bright)"}`,
              }}
            >
              {step.done
                ? <CheckCircle2 size={12} style={{ color: "var(--success)" }} />
                : step.blocked
                  ? <XCircle size={12} style={{ color: "var(--error)" }} />
                  : <span className="text-[9px] font-bold" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{step.id}</span>
              }
            </div>
            {idx < steps.length - 1 && (
              <div className="w-0.5 flex-1 my-1" style={{ background: step.done ? "var(--success)" : "var(--border)", opacity: step.done ? 0.4 : 1, minHeight: "20px" }} />
            )}
          </div>
          <div className="pb-4 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium" style={{ color: step.done ? "var(--text-primary)" : "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                {step.label}
              </span>
              {step.badge && <StatusBadge status={step.badge} />}
            </div>
            <p className="text-xs mt-0.5" style={{ color: step.blocked ? "var(--error)" : "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              {step.detail}
              {step.txSig && (
                <a
                  href={`https://explorer.solana.com/tx/${step.txSig}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-1"
                  style={{ color: "var(--info)" }}
                >
                  <ExternalLink size={10} /> Solana Explorer
                </a>
              )}
            </p>
            {/* Fiat confirmation action — only shown when awaiting */}
            {step.awaitingConfirm && (
              <div className="mt-3 p-3 rounded-lg space-y-2" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}>
                <p className="text-[11px] font-medium" style={{ color: "var(--warning, #FBBF24)" }}>
                  Awaiting your confirmation — confirm once the bank wire has landed in your account.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={confirmRef}
                    onChange={(e) => setConfirmRef(e.target.value)}
                    placeholder="Bank confirmation ref (optional)"
                    className="flex-1 px-2 py-1.5 rounded text-xs outline-none"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                  />
                  <button
                    onClick={handleConfirmFiat}
                    disabled={confirming}
                    className="px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                    style={{ background: "var(--success)", color: "#000" }}
                  >
                    {confirming ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                    Confirm Receipt
                  </button>
                </div>
                {confirmError && (
                  <p className="text-[10px]" style={{ color: "var(--error)" }}>{confirmError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RedeemPage() {
  const inst = PLACEHOLDER_INSTITUTION;
  const wallet = usePhantomWallet();
  const [stablecoins, setStablecoins] = useState<StablecoinRecord[]>([]);
  const [requests, setRequests] = useState<RedeemRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RedeemSubmissionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [form, setForm] = useState({
    network: "solana-devnet",
    stablecoinSymbol: "USX",
    amount: "",
    sourceWallet: inst.walletAddress,
    // Fiat settlement details
    destinationBankAccount: "GB29NWBK60161331926819",
    beneficiaryBank: "NatWest",
    bankSwiftBic: "NWBKGB2L",
    accountHolderName: inst.name,
    // Off-chain bank transfer linkage
    paymentRails: "SWIFT",
    transferReference: "",
  });

  // Settlement window is issuer-defined, not user-selectable
  const SETTLEMENT_WINDOW = "T+1";
  const selectedCoin = stablecoins.find((coin) => coin.symbol === form.stablecoinSymbol);
  const requestedAmount = Number.parseFloat(form.amount);
  const hasRequestedAmount = Number.isFinite(requestedAmount) && requestedAmount > 0;
  const walletDisconnected = !wallet.connected;
  const lowBalance = wallet.connected && walletBalance !== null && hasRequestedAmount && requestedAmount > walletBalance;
  const redeemFormDisabled = walletDisconnected || submitting;

  const set = (key: string) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function reloadRequests() {
    const reqsRes = await fetch("/api/redeem-request");
    setRequests((await reqsRes.json()) as RedeemRequestRecord[]);
  }

  useEffect(() => {
    async function load() {
      try {
        const [coinsRes, reqsRes] = await Promise.all([fetch("/api/stablecoins"), fetch("/api/redeem-request")]);
        setStablecoins((await coinsRes.json()) as StablecoinRecord[]);
        setRequests((await reqsRes.json()) as RedeemRequestRecord[]);
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
      if (current.sourceWallet && current.sourceWallet !== inst.walletAddress) {
        return current;
      }
      return { ...current, sourceWallet: connectedAddress };
    });
  }, [inst.walletAddress, wallet.address]);

  useEffect(() => {
    const mintAddress = selectedCoin?.mintAddress;
    if (!wallet.connected || !wallet.address || !mintAddress) {
      setWalletBalance(null);
      setBalanceLoading(false);
      return;
    }

    let cancelled = false;
    async function loadWalletBalance() {
      setBalanceLoading(true);
      try {
        const res = await fetch(
          `/api/token-balance?wallet=${encodeURIComponent(wallet.address ?? "")}&mint=${encodeURIComponent(mintAddress ?? "")}`
        );
        const data = (await res.json()) as { balance?: number };
        if (!cancelled) {
          setWalletBalance(typeof data.balance === "number" ? data.balance : 0);
        }
      } catch {
        if (!cancelled) setWalletBalance(null);
      } finally {
        if (!cancelled) setBalanceLoading(false);
      }
    }

    loadWalletBalance();
    return () => {
      cancelled = true;
    };
  }, [selectedCoin?.mintAddress, wallet.address, wallet.connected]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (walletDisconnected || lowBalance) return;
    setSubmitting(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/redeem-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stablecoinSymbol: form.stablecoinSymbol,
          amount: parseFloat(form.amount),
          sourceWallet: form.sourceWallet,
          destinationBankAccount: form.destinationBankAccount,
          network: form.network,
          settlementDetails: {
            beneficiaryBank: form.beneficiaryBank,
            bankSwiftBic: form.bankSwiftBic,
            accountHolderName: form.accountHolderName,
            expectedSettlement: SETTLEMENT_WINDOW,
            iban: form.destinationBankAccount,
            paymentRails: form.paymentRails,
            transferReference: form.transferReference || undefined,
          },
        }),
      });
      const data = (await res.json()) as RedeemSubmissionResponse & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to submit redeem request");
      } else {
        setResult(data);
        const reqsRes = await fetch("/api/redeem-request");
        setRequests((await reqsRes.json()) as RedeemRequestRecord[]);
        if (data.redeemRequest?.id) setExpandedId(data.redeemRequest.id);
        setForm((f) => ({ ...f, amount: "" }));
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
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
          <Card
            className="relative overflow-hidden"
            style={{
              background: "linear-gradient(180deg, rgba(13,16,24,0.98) 0%, rgba(8,10,16,0.98) 100%)",
              border: "1px solid var(--border-bright)",
              boxShadow: "0 22px 40px rgba(0,0,0,0.28)",
            }}
          >
            <SectionHeader title="New Redeem Request" subtitle="Burn tokens · settle fiat" />
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
                      Connect Phantom to unlock redeem requests.
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
                      Redemption flow
                    </p>
                    <p className="text-sm mt-1 font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                      Burn first, settle fiat after
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      Settlement
                    </p>
                    <p className="text-sm mt-1 font-semibold" style={{ color: "var(--info)", fontFamily: "var(--font-display)" }}>
                      T+1 issuer SLA
                    </p>
                  </div>
                </div>

                <div
                  className="space-y-4 rounded-xl p-4"
                  style={{ background: "rgba(10,14,22,0.78)", border: "1px solid var(--border)" }}
                >

                  {/* Network */}
                  <SelectField label="Network" value={form.network} onChange={set("network")} disabled={redeemFormDisabled}>
                    {NETWORKS.map((n) => (
                      <option key={n.id} value={n.id} disabled={n.disabled}>
                        {n.label}{n.disabled ? " — Coming Soon" : ""}
                      </option>
                    ))}
                  </SelectField>

                  {/* Stablecoin */}
                  <SelectField label="Stablecoin" value={form.stablecoinSymbol} onChange={set("stablecoinSymbol")} disabled={redeemFormDisabled}>
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

                  {/* Amount */}
                  <InputField
                    label="Amount (USD)"
                    value={form.amount}
                    onChange={set("amount")}
                    placeholder="50,000.00"
                    prefix="$"
                    required
                    disabled={redeemFormDisabled}
                  />
                  {wallet.connected && (
                    <div className="space-y-1">
                      <p className="text-[10px]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                        {balanceLoading
                          ? `Checking ${form.stablecoinSymbol} wallet balance...`
                          : walletBalance === null
                            ? "Wallet balance unavailable"
                            : `Available balance: ${walletBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${form.stablecoinSymbol}`}
                      </p>
                      {lowBalance && (
                        <div
                          className="p-2.5 rounded-lg flex gap-2"
                          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.28)" }}
                        >
                          <XCircle size={12} style={{ color: "var(--warning)", flexShrink: 0, marginTop: "2px" }} />
                          <p className="text-[11px] leading-relaxed" style={{ color: "var(--warning)" }}>
                            Low balance. Your connected wallet holds {walletBalance?.toLocaleString(undefined, { maximumFractionDigits: 6 })} {form.stablecoinSymbol}, which is below the requested redeem amount.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Source wallet */}
                  <InputField
                    label="Source Wallet"
                    value={form.sourceWallet}
                    onChange={set("sourceWallet")}
                    placeholder={wallet.connected ? "Connected Phantom wallet" : "Solana wallet address"}
                    required
                    fontSize="11px"
                    disabled={redeemFormDisabled}
                    hint={
                      wallet.connected && wallet.shortAddress
                        ? `Connected Phantom: ${wallet.shortAddress}`
                        : "Use the wallet that currently holds the tokens you want to redeem."
                    }
                  />
                </div>

                {/* ── Fiat settlement section ── */}
                <SectionDivider icon={Building2} label="Fiat Settlement Details" />

                <div
                  className="space-y-4 rounded-xl p-4"
                  style={{ background: "rgba(10,14,22,0.78)", border: "1px solid var(--border)" }}
                >

                  <div className="p-3 rounded-lg flex gap-2.5" style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.28)" }}>
                    <Info size={13} style={{ color: "var(--info)", flexShrink: 0, marginTop: "1px" }} />
                    <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      Fiat will be wired to the account below after tokens are confirmed burned on-chain. Bank details are encrypted in travel rule filing.
                    </p>
                  </div>

                  <InputField
                    label="IBAN / Account Number"
                    value={form.destinationBankAccount}
                    onChange={set("destinationBankAccount")}
                    placeholder="GB29 NWBK 6016 1331 9268 19"
                    icon={Building2}
                    hint="Masked in Travel Rule filing per privacy requirements"
                    fontSize="11px"
                    disabled={redeemFormDisabled}
                  />

                  <InputField
                    label="Account Holder Name"
                    value={form.accountHolderName}
                    onChange={set("accountHolderName")}
                    placeholder="Beneficiary legal name"
                    fontSize="12px"
                    disabled={redeemFormDisabled}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Beneficiary Bank"
                      value={form.beneficiaryBank}
                      onChange={set("beneficiaryBank")}
                      placeholder="e.g. NatWest"
                      disabled={redeemFormDisabled}
                    />
                    <InputField
                      label="SWIFT / BIC"
                      value={form.bankSwiftBic}
                      onChange={set("bankSwiftBic")}
                      placeholder="e.g. NWBKGB2L"
                      disabled={redeemFormDisabled}
                    />
                  </div>
                </div>

                {/* ── Off-chain transfer linkage ── */}
                <SectionDivider icon={Banknote} label="Off-chain Transfer Linkage" />

                <div
                  className="space-y-4 rounded-xl p-4"
                  style={{ background: "rgba(10,14,22,0.78)", border: "1px solid var(--border)" }}
                >

                  <SelectField label="Payment Rails" value={form.paymentRails} onChange={set("paymentRails")} disabled={redeemFormDisabled}>
                    {["SWIFT", "SEPA", "CHAPS", "ACH", "FPS", "IMPS", "RTGS"].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </SelectField>

                  <InputField
                    label="Transfer Reference (optional)"
                    value={form.transferReference}
                    onChange={set("transferReference")}
                    placeholder="e.g. INV-2024-00142 or UTR"
                    hint="Your internal reference to match this on-chain request to the outgoing bank wire. Included in Travel Rule filing."
                    fontSize="12px"
                    disabled={redeemFormDisabled}
                  />

                  <div>
                    <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      Expected Settlement
                    </label>
                    <div
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                    >
                      <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                        {SETTLEMENT_WINDOW} — Next Business Day
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "var(--bg-hover)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", border: "1px solid var(--border)" }}
                      >
                        Issuer SLA
                      </span>
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                      Settlement window is defined by the issuer. Contact your account manager to discuss expedited settlement.
                    </p>
                  </div>
                </div>

                {/* Compliance notice */}
                <div className="p-3 rounded-lg flex gap-2.5" style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.28)" }}>
                  <Info size={13} style={{ color: "var(--info)", flexShrink: 0, marginTop: "1px" }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--info)" }}>Travel Rule Filing</p>
                    <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      FATF Travel Rule data will be automatically filed. Bank details are encrypted in transit.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={redeemFormDisabled || !form.amount || lowBalance}
                  className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{
                    background: redeemFormDisabled || lowBalance ? "rgba(120,137,171,0.22)" : "var(--info)",
                    color: redeemFormDisabled || lowBalance ? "var(--text-tertiary)" : "#000",
                    fontFamily: "var(--font-display)",
                    cursor: redeemFormDisabled || lowBalance ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? <><Loader2 size={15} className="animate-spin" />Processing…</> : <><ArrowDownCircle size={15} />Submit Redeem Request</>}
                </button>
              </div>
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
                    Tokens locked · Fiat settlement initiated ({SETTLEMENT_WINDOW}) · Travel Rule filed
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
                      <th>Asset</th><th>Amount</th><th>Source Wallet</th><th>Settlement Bank</th><th>Status</th><th>Tx</th><th>Time</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => {
                      const settlement = r.travelRuleData?.settlementDetails ?? {};
                      return (
                        <React.Fragment key={r.id}>
                          <tr
                            className="cursor-pointer"
                            onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                            style={{ background: expandedId === r.id ? "var(--bg-hover)" : undefined }}
                          >
                            <td><span className="px-2 py-0.5 rounded text-xs" style={{ background: "var(--info-dim)", color: "var(--info)", fontFamily: "var(--font-mono)" }}>{r.stablecoin?.symbol}</span></td>
                            <td style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{fmt(r.amount)}</td>
                            <td style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-secondary)" }}>{truncate(r.sourceWallet, 10)}</td>
                            <td style={{ fontSize: "11px", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                              {settlement.beneficiaryBank ? (
                                <div>
                                  <span>{String(settlement.beneficiaryBank)}</span>
                                  <span className="mx-1 opacity-40">·</span>
                                  <span style={{ color: "var(--info)" }}>{String(settlement.paymentRails ?? "SWIFT")}</span>
                                  {settlement.transferReference && (
                                    <><span className="mx-1 opacity-40">·</span><span title="Transfer Reference">{String(settlement.transferReference)}</span></>
                                  )}
                                </div>
                              ) : <span>—</span>}
                            </td>
                            <td><StatusBadge status={r.status} /></td>
                            <td>
                              {r.txSignature
                                ? <span className="text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{truncate(r.txSignature, 6)}</span>
                                : <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>—</span>}
                            </td>
                            <td style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</td>
                            <td>{expandedId === r.id ? <ChevronUp size={14} style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />}</td>
                          </tr>
                          {expandedId === r.id && (
                            <tr key={`${r.id}-detail`}>
                              <td colSpan={8} style={{ background: "var(--bg-elevated)", padding: "20px 16px" }}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                                      Redemption Flow
                                    </h4>
                                    <RedeemFlow request={r} onFiatConfirmed={reloadRequests} />
                                  </div>
                                  <div className="space-y-4">
                                    {/* Settlement details */}
                                    {r.travelRuleData?.settlementDetails && (
                                      <div>
                                        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                                          Fiat Settlement Details
                                        </h4>
                                        <div className="rounded-lg p-3 space-y-1.5 text-xs" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>
                                          {Object.entries(r.travelRuleData.settlementDetails).map(([k, v]) => (
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
                                      {r.travelRuleData ? (
                                        <div className="rounded-lg p-3 space-y-1.5 text-xs" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>
                                          {Object.entries(r.travelRuleData)
                                            .filter(([k]) => !["timestamp", "settlementDetails"].includes(k))
                                            .map(([k, v]) => (
                                              <div key={k} className="flex gap-2">
                                                <span style={{ color: "var(--text-tertiary)", minWidth: "170px", flexShrink: 0 }}>{k}</span>
                                                <span style={{ color: "var(--text-secondary)" }}>{String(v)}</span>
                                              </div>
                                            ))}
                                        </div>
                                      ) : <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>No travel rule data</p>}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
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
