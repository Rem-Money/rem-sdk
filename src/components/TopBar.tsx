"use client";

import { Building2, ShieldCheck, AlertCircle, ChevronDown } from "lucide-react";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";

export function TopBar() {
  const inst = PLACEHOLDER_INSTITUTION;

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
