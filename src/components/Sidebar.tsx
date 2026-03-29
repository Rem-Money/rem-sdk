"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowUpCircle,
  ArrowDownCircle,
  ShieldCheck,
  History,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mint", label: "Mint Request", icon: ArrowUpCircle },
  { href: "/redeem", label: "Redeem Request", icon: ArrowDownCircle },
  { href: "/compliance", label: "Compliance Hub", icon: ShieldCheck },
  { href: "/transactions", label: "Transactions", icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col h-full"
      style={{
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Image src="/logo.png" alt="REM logo" width={24} height={24} priority />
        {/* <div
          className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          <Zap size={14} strokeWidth={2.5} />
        </div> */}

        <div>
          <div
            className="text-sm font-bold leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            REM Protocol
          </div>
          <div
            className="text-[10px] mt-0.5"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
          >
            devnet
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-all duration-150 group relative"
              style={{
                color: active ? "var(--accent)" : "var(--text-secondary)",
                background: active ? "var(--accent-subtle)" : "transparent",
                fontFamily: "var(--font-body)",
                fontWeight: active ? 500 : 400,
              }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
              <Icon
                size={15}
                strokeWidth={active ? 2 : 1.5}
                style={{ color: active ? "var(--accent)" : "var(--text-tertiary)", transition: "color 0.15s" }}
              />
              <span className="flex-1">{label}</span>
              {active && (
                <ChevronRight size={12} style={{ color: "var(--accent)", opacity: 0.6 }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Network status */}
      <div
        className="px-4 py-4 space-y-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
          >
            Network
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: "var(--success)" }}
            />
            <span
              className="text-[10px]"
              style={{ color: "var(--success)", fontFamily: "var(--font-mono)" }}
            >
              Solana Devnet
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
          >
            DB
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--success)" }}
            />
            <span
              className="text-[10px]"
              style={{ color: "var(--success)", fontFamily: "var(--font-mono)" }}
            >
              Neon PG
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
