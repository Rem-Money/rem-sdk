"use client";

import { Building2, ShieldCheck, ChevronDown, Wallet2, PlugZap } from "lucide-react";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";
import { usePhantomWallet } from "@/components/PhantomWalletProvider";

export function TopBar() {
  const inst = PLACEHOLDER_INSTITUTION;
  const wallet = usePhantomWallet();

  const walletButtonLabel =
    wallet.status === "connecting"
      ? "Connecting..."
      : wallet.connected
        ? wallet.shortAddress
        : wallet.installed
          ? "Connect Phantom"
          : "Install Phantom";

  return (
    <header
      className="h-12 flex items-center justify-between px-6 flex-shrink-0"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Left - breadcrumb placeholder */}
      <div />

      {/* Right - entity chip */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (wallet.connected) {
              wallet.disconnect();
              return;
            }
            wallet.connect();
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors"
          style={{
            background: wallet.connected ? "rgba(56,189,248,0.12)" : "var(--bg-elevated)",
            border: wallet.connected ? "1px solid rgba(56,189,248,0.3)" : "1px solid var(--border)",
            color: wallet.connected ? "var(--info)" : "var(--text-primary)",
          }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{
              background: wallet.connected ? "rgba(56,189,248,0.16)" : "var(--bg-hover)",
              border: wallet.connected ? "1px solid rgba(56,189,248,0.28)" : "1px solid var(--border)",
            }}
          >
            {wallet.connected ? (
              <Wallet2 size={11} style={{ color: "var(--info)" }} />
            ) : (
              <PlugZap size={11} style={{ color: wallet.installed ? "var(--accent)" : "var(--text-secondary)" }} />
            )}
          </div>
          <div className="flex flex-col items-start leading-none">
            <span style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}>
              {walletButtonLabel}
            </span>
            <span
              className="text-[10px]"
              style={{ color: wallet.connected ? "rgba(56,189,248,0.85)" : "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
            >
              {wallet.connected ? "Phantom Connected" : wallet.installed ? "Wallet Disconnected" : "Browser Wallet Required"}
            </span>
          </div>
        </button>

        {/* KYC badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs"
          style={{
            background: "var(--success-dim)",
            color: "var(--success)",
            fontFamily: "var(--font-mono)",
            border: "1px solid rgba(16,185,129,0.2)",
          }}
        >
          <ShieldCheck size={11} strokeWidth={2} />
          <span>KYC Verified</span>
        </div>

        {/* AML badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs"
          style={{
            background: "var(--success-dim)",
            color: "var(--success)",
            fontFamily: "var(--font-mono)",
            border: "1px solid rgba(16,185,129,0.2)",
          }}
        >
          <span>AML Clear</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5" style={{ background: "var(--border)" }} />

        {/* Entity */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-glow)" }}
          >
            <Building2 size={11} style={{ color: "var(--accent)" }} />
          </div>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 500 }}>
            {inst.name}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: "var(--accent-subtle)",
              color: "var(--accent)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
            }}
          >
            DEMO
          </span>
          <ChevronDown size={12} style={{ color: "var(--text-tertiary)" }} />
        </button>
      </div>
    </header>
  );
}
