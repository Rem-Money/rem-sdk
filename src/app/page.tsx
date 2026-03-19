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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        setData(json);
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

      {/* Stablecoin info cards */}
      <div className="animate-fade-in stagger-6">
        <Card>
          <SectionHeader title="Supported Stablecoins" subtitle="Devnet mint addresses" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-24 skeleton rounded-lg" />
              ))
            ) : data?.stablecoins?.map((coin, i) => (
              <div
                key={coin.id}
                className="p-4 rounded-lg"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: i === 0 ? "var(--accent-subtle)" : i === 1 ? "var(--info-dim)" : "var(--success-dim)",
                        color: i === 0 ? "var(--accent)" : i === 1 ? "var(--info)" : "var(--success)",
                        fontFamily: "var(--font-display)",
                        border: `1px solid ${i === 0 ? "var(--accent-glow)" : i === 1 ? "rgba(56,189,248,0.2)" : "rgba(16,185,129,0.2)"}`,
                      }}
                    >
                      {coin.symbol[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                        {coin.symbol}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{coin.name}</div>
                    </div>
                  </div>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: "var(--success-dim)", color: "var(--success)", fontFamily: "var(--font-mono)" }}
                  >
                    Active
                  </span>
                </div>
                <div
                  className="text-[10px] font-mono px-2 py-1.5 rounded flex items-center justify-between"
                  style={{ background: "var(--bg-base)", color: "var(--text-tertiary)", border: "1px solid var(--border)" }}
                >
                  <span>{truncate(coin.mintAddress, 10)}</span>
                  <a
                    href={`https://explorer.solana.com/address/${coin.mintAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={10} style={{ color: "var(--text-tertiary)" }} />
                  </a>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    Decimals: {coin.decimals}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    {coin.network}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
