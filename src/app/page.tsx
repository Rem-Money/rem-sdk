"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Coins,
  LoaderCircle,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { useMockAuth } from "@/components/MockAuthProvider";

export default function HomePage() {
  const router = useRouter();
  const auth = useMockAuth();
  const busy = auth.status === "checking" || auth.status === "signing_in";

  async function handleLogin() {
    if (auth.authenticated) {
      router.push("/dashboard");
      return;
    }

    await auth.signIn();
    router.push("/dashboard");
  }

  return (
    <div
      className="min-h-screen px-6 py-6 md:px-8"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.16), transparent 24%), radial-gradient(circle at bottom right, rgba(245,158,11,0.12), transparent 26%), linear-gradient(180deg, #09111d 0%, #06080d 100%)",
      }}
    >
      <div className="max-w-[1220px] mx-auto relative animate-fade-in">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(120,137,171,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(120,137,171,0.08) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(circle at center, black 42%, transparent 82%)",
          }}
        />

        <div className="relative flex items-center justify-between gap-4 px-1 py-3">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-[14px] flex items-center justify-center"
              style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.24)" }}
            >
              <Image src="/logo.png" alt="REM logo" width={24} height={24} priority />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                REM Protocol
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-primary)" }}>
                Institutional stablecoin operations on Solana
              </p>
            </div>
          </div>

          {auth.authenticated && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
              style={{ background: "rgba(12,18,28,0.78)", border: "1px solid rgba(42,51,73,0.72)", color: "var(--text-primary)" }}
            >
              Open dashboard
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,0.96fr)_420px] gap-6 xl:gap-8 items-stretch mt-6">
          <section
            className="rounded-[18px] overflow-hidden relative"
            style={{
              background: "linear-gradient(180deg, rgba(13,16,24,0.95), rgba(8,10,16,0.98))",
              border: "1px solid rgba(42,51,73,0.95)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.35)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at top left, rgba(56,189,248,0.14), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.02), transparent 38%)",
              }}
            />

            <div className="relative px-7 py-8 md:px-8 md:py-8 xl:px-10 xl:py-10">
              <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-[12px]" style={{ background: "rgba(11,21,33,0.78)", border: "1px solid rgba(56,189,248,0.18)" }}>
                <ShieldCheck size={16} style={{ color: "var(--accent)" }} />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    Institutional Access
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-primary)" }}>
                    Secure operator sign-in
                  </p>
                </div>
              </div>

              <div className="mt-8 max-w-[40rem]">
                <p className="text-[11px] uppercase tracking-[0.32em]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  Treasury • Compliance • Settlement
                </p>
                <h1
                  className="text-[2.5rem] md:text-[2.8rem] xl:text-[3rem] leading-[1.02] mt-4"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                >
                  Manage stablecoin operations with REM.
                </h1>
                <p className="text-[15px] leading-7 mt-5 max-w-2xl" style={{ color: "rgba(240,244,255,0.76)" }}>
                  Review compliance, monitor transactions, and move from request to settlement in a secure Solana-based workflow built for treasury and operations teams.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-3 mt-8 max-w-[48rem]">
                {[
                  { label: "Institution", value: auth.institutionName, icon: Building2 },
                  { label: "Network", value: "Solana Devnet", icon: Coins },
                  { label: "Flows", value: "Mint · Redeem · Compliance", icon: Workflow },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="px-4 py-4 rounded-[12px]"
                    style={{
                      background: "rgba(12,18,28,0.72)",
                      border: "1px solid rgba(42,51,73,0.72)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} style={{ color: "var(--accent)" }} />
                      <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                        {label}
                      </p>
                    </div>
                    <p className="text-sm mt-3" style={{ color: "var(--text-primary)" }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-10">
                {[
                  {
                    title: "Unified compliance review",
                    body: "Keep screening, review notes, and approval context in one place before funds move on-chain.",
                  },
                  {
                    title: "Mint and redeem oversight",
                    body: "Track issuance and redemption activity from request intake through settlement and confirmation.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[14px] p-5"
                    style={{ background: "rgba(9,14,22,0.78)", border: "1px solid rgba(42,51,73,0.72)" }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                    </p>
                    <p className="text-sm leading-6 mt-2" style={{ color: "var(--text-secondary)" }}>
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            className="rounded-[18px] overflow-hidden"
            style={{
              background: "rgba(248,250,252,0.98)",
              color: "#0f172a",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 32px 120px rgba(0,0,0,0.3)",
            }}
          >
            <div className="px-6 py-6 md:px-7 md:py-7 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid grid-cols-2 gap-0.5 w-5 h-5">
                    {["#f25022", "#7fba00", "#00a4ef", "#ffb900"].map((color) => (
                      <span key={color} style={{ background: color }} />
                    ))}
                  </div>
                  <span className="text-lg font-semibold tracking-tight">Microsoft Entra ID</span>
                </div>
                <span
                  className="px-3 py-1 rounded-[6px] text-[11px] uppercase tracking-[0.18em]"
                  style={{ background: "rgba(37,99,235,0.08)", color: "#1d4ed8", fontWeight: 700 }}
                >
                  Mock SSO
                </span>
              </div>

              <div
                className="rounded-[12px] p-5"
                style={{
                  background: "linear-gradient(180deg, rgba(241,245,249,0.92), rgba(226,232,240,0.72))",
                  border: "1px solid rgba(148,163,184,0.24)",
                }}
              >
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Institutional access</p>
                <p className="text-[1.55rem] font-semibold mt-2 leading-tight text-slate-950">{auth.institutionName}</p>
                <p className="text-sm mt-1.5 text-slate-500">Authorized treasury and compliance workspace</p>

                <div className="mt-5 divide-y divide-slate-200/80 rounded-[10px] overflow-hidden border border-white/70 bg-white/90">
                  {[
                    { label: "Organization", value: auth.institutionName },
                    { label: "Identity provider", value: `${auth.providerName} · Mock SSO` },
                    { label: "Access", value: "Operations dashboard and workflows" },
                  ].map((item) => (
                    <div key={item.label} className="px-4 py-3.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                      <p className="text-[15px] mt-1.5 leading-6 text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void handleLogin();
                  }}
                  disabled={busy}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-5 py-4 rounded-[10px] text-sm font-semibold transition-transform duration-150 disabled:opacity-80 disabled:cursor-wait"
                  style={{
                    background: busy ? "#1d4ed8" : "#2563eb",
                    color: "#fff",
                    boxShadow: busy ? "none" : "0 18px 30px rgba(37,99,235,0.2)",
                  }}
                >
                  {auth.status === "checking" ? (
                    <>
                      <LoaderCircle className="animate-spin" size={16} />
                      Checking session...
                    </>
                  ) : auth.status === "signing_in" ? (
                    <>
                      <LoaderCircle className="animate-spin" size={16} />
                      Signing in...
                    </>
                  ) : auth.authenticated ? (
                    <>
                      Open dashboard
                      <ArrowRight size={16} />
                    </>
                  ) : (
                    <>
                      Sign in to continue
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs leading-5 text-slate-500">
                Demo access only. Sign in to open the operations dashboard, compliance tools, and transaction workflows.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
