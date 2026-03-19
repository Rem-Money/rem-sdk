"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ShieldCheck,
  Activity,
  TrendingUp,
  Coins,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Card, StatCard, SectionHeader } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDistanceToNow } from "date-fns";

interface DashboardData {
  stats: {
    totalMinted: number;
    totalRedeemed: number;
    pendingCompliance: number;
    activeStablecoins: number;
  };
  recentMintRequests: any[];
  recentRedeemRequests: any[];
  stablecoins: any[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function truncate(s: string, len = 8) {
  if (!s) return "—";
  return s.length > len * 2 + 3 ? `${s.slice(0, len)}…${s.slice(-4)}` : s;
}

const COIN_COLORS = [
  { bg: "var(--accent-subtle)", text: "var(--accent)", border: "var(--accent-glow)" },
  { bg: "var(--info-dim)",      text: "var(--info)",   border: "rgba(56,189,248,0.2)" },
  { bg: "var(--success-dim)",   text: "var(--success)", border: "rgba(16,185,129,0.2)" },
  { bg: "var(--warning-dim,rgba(251,191,36,0.1))", text: "var(--warning,#FBBF24)", border: "rgba(251,191,36,0.2)" },
  { bg: "rgba(168,85,247,0.1)", text: "#A855F7",       border: "rgba(168,85,247,0.2)" },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCoin, setSelectedCoin] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        setData(json);
        if (json.stablecoins?.length) setSelectedCoin(json.stablecoins[0].id);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const s = data?.stats;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="animate-fade-in">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Operations Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Institutional stablecoin operations · Solana Devnet
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-28 skeleton rounded-xl" />
          ))
        ) : (
          <>
            <div className="animate-fade-in stagger-1">
              <StatCard
                label="Total Minted"
                value={fmt(s?.totalMinted ?? 0)}
                sub="Lifetime across all stablecoins"
                accent
                icon={<ArrowUpCircle size={16} style={{ color: "var(--accent)" }} />}
              />
            </div>
            <div className="animate-fade-in stagger-2">
              <StatCard
                label="Total Redeemed"
                value={fmt(s?.totalRedeemed ?? 0)}
                sub="Lifetime redemptions"
                icon={<ArrowDownCircle size={16} style={{ color: "var(--info)" }} />}
              />
            </div>
            <div className="animate-fade-in stagger-3">
              <StatCard
                label="Pending Compliance"
                value={s?.pendingCompliance ?? 0}
                sub="Requiring review"
                icon={<ShieldCheck size={16} style={{ color: s?.pendingCompliance ? "var(--warning)" : "var(--success)" }} />}
              />
            </div>
            <div className="animate-fade-in stagger-4">
              <StatCard
                label="Active Stablecoins"
                value={s?.activeStablecoins ?? 0}
                sub="On Solana Devnet"
                icon={<Coins size={16} style={{ color: "var(--text-secondary)" }} />}
              />
            </div>
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in stagger-3">
        {[
          { href: "/mint", icon: ArrowUpCircle, label: "New Mint Request", color: "var(--accent)" },
          { href: "/redeem", icon: ArrowDownCircle, label: "New Redeem Request", color: "var(--info)" },
          { href: "/compliance", icon: ShieldCheck, label: "Compliance Hub", color: "var(--success)" },
          { href: "/transactions", icon: Activity, label: "Transaction History", color: "var(--text-secondary)" },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}>
            <div
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-150 hover:scale-[1.01]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}15`, border: `1px solid ${color}30` }}
              >
                <Icon size={15} style={{ color }} />
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
              >
                {label}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Mint Requests */}
        <Card noPadding className="animate-fade-in stagger-4">
          <div className="p-5 pb-3">
            <SectionHeader
              title="Recent Mint Requests"
              action={
                <Link href="/mint" className="text-xs" style={{ color: "var(--accent)" }}>
                  View all →
                </Link>
              }
            />
          </div>
          <div className="px-2 pb-2">
            {loading ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td><div className="h-4 w-12 skeleton rounded" /></td>
                      <td><div className="h-4 w-20 skeleton rounded" /></td>
                      <td><div className="h-4 w-16 skeleton rounded" /></td>
                      <td><div className="h-4 w-16 skeleton rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : !data?.recentMintRequests?.length ? (
              <div className="text-center py-10" style={{ color: "var(--text-tertiary)" }}>
                <ArrowUpCircle size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No mint requests yet</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentMintRequests.slice(0, 5).map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: "var(--accent-subtle)", color: "var(--accent)", fontFamily: "var(--font-mono)" }}
                        >
                          {r.stablecoin?.symbol}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        {fmt(r.amount)}
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>
                        {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Recent Redeem Requests */}
        <Card noPadding className="animate-fade-in stagger-5">
          <div className="p-5 pb-3">
            <SectionHeader
              title="Recent Redeem Requests"
              action={
                <Link href="/redeem" className="text-xs" style={{ color: "var(--accent)" }}>
                  View all →
                </Link>
              }
            />
          </div>
          <div className="px-2 pb-2">
            {loading ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td><div className="h-4 w-12 skeleton rounded" /></td>
                      <td><div className="h-4 w-20 skeleton rounded" /></td>
                      <td><div className="h-4 w-16 skeleton rounded" /></td>
                      <td><div className="h-4 w-16 skeleton rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : !data?.recentRedeemRequests?.length ? (
              <div className="text-center py-10" style={{ color: "var(--text-tertiary)" }}>
                <ArrowDownCircle size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No redeem requests yet</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRedeemRequests.slice(0, 5).map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: "var(--info-dim)", color: "var(--info)", fontFamily: "var(--font-mono)" }}
                        >
                          {r.stablecoin?.symbol}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        {fmt(r.amount)}
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>
                        {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Stablecoin explorer */}
      <div className="animate-fade-in stagger-6">
        <Card>
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <SectionHeader title="Asset Explorer" subtitle="Select a stablecoin to inspect its on-chain details" />
            {/* Dropdown */}
            {loading ? (
              <div className="h-9 w-48 skeleton rounded-lg" />
            ) : (
              <div className="relative">
                <select
                  value={selectedCoin}
                  onChange={(e) => setSelectedCoin(e.target.value)}
                  className="appearance-none pr-8 pl-3 py-2 text-sm rounded-lg cursor-pointer"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-bright)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                    minWidth: "180px",
                  }}
                >
                  {data?.stablecoins?.map((coin) => (
                    <option key={coin.id} value={coin.id}>
                      {coin.symbol} — {coin.name}
                    </option>
                  ))}
                </select>
                <span
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  ▾
                </span>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {loading ? (
            <div className="h-40 skeleton rounded-lg" />
          ) : (() => {
            const coins = data?.stablecoins ?? [];
            const coinIdx = coins.findIndex((c: any) => c.id === selectedCoin);
            const coin = coins[coinIdx];
            if (!coin) return (
              <div className="text-center py-10" style={{ color: "var(--text-tertiary)" }}>
                <Coins size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No stablecoins found. Seed the database first.</p>
              </div>
            );
            const palette = COIN_COLORS[coinIdx % COIN_COLORS.length];
            return (
              <div
                className="rounded-lg p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              >
                {/* Identity */}
                <div className="flex items-center gap-3 lg:col-span-3 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: palette.bg, color: palette.text, border: `1px solid ${palette.border}`, fontFamily: "var(--font-display)" }}
                  >
                    {coin.symbol[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                        {coin.symbol}
                      </span>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{coin.name}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "var(--success-dim)", color: "var(--success)", fontFamily: "var(--font-mono)" }}
                      >
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Coins size={12} style={{ color: palette.text }} />
                    <span className="text-xs" style={{ color: palette.text, fontFamily: "var(--font-mono)" }}>
                      {coin.network ?? "Solana Devnet"}
                    </span>
                  </div>
                </div>

                {/* Mint address */}
                <div className="lg:col-span-3">
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    On-chain Mint Address
                  </p>
                  <div
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
                  >
                    <span className="text-xs font-mono break-all" style={{ color: "var(--text-secondary)" }}>
                      {coin.mintAddress ?? "—"}
                    </span>
                    {coin.mintAddress && (
                      <a
                        href={`https://explorer.solana.com/address/${coin.mintAddress}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                        title="View on Solana Explorer"
                      >
                        <ExternalLink size={12} style={{ color: "var(--text-tertiary)" }} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Stats */}
                {[
                  { label: "Total Minted", value: fmt(coin.totalMinted ?? 0), color: "var(--accent)" },
                  { label: "Total Redeemed", value: fmt(coin.totalRedeemed ?? 0), color: "var(--info)" },
                  { label: "Net Circulating", value: fmt(coin.netCirculating ?? 0), color: "var(--success)" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      {label}
                    </p>
                    <p className="text-lg font-semibold" style={{ color, fontFamily: "var(--font-display)" }}>
                      {value}
                    </p>
                  </div>
                ))}

                {/* Meta */}
                {[
                  { label: "Decimals", value: coin.decimals ?? "—" },
                  { label: "Network", value: coin.network ?? "Solana Devnet" },
                  { label: "Status", value: coin.active ? "Active" : "Inactive" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      {label}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {String(value)}
                    </p>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>
      </div>
    </div>
  );
}
