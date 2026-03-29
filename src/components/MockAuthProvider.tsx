"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Building2,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";

type AuthStatus = "checking" | "signed_out" | "signing_in" | "signed_in";

type MockAuthContextValue = {
  institutionName: string;
  providerName: string;
  status: AuthStatus;
  authenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
};

const MockAuthContext = createContext<MockAuthContextValue | null>(null);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("signed_out");

  const value = useMemo<MockAuthContextValue>(
    () => ({
      institutionName: PLACEHOLDER_INSTITUTION.name,
      providerName: "Microsoft Entra ID",
      status,
      authenticated: status === "signed_in",
      signIn: async () => {
        setStatus("signing_in");
        await new Promise((resolve) => window.setTimeout(resolve, 900));
        setStatus("signed_in");
      },
      signOut: () => {
        setStatus("signed_out");
      },
    }),
    [status]
  );

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}

export function useMockAuth() {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error("useMockAuth must be used within MockAuthProvider");
  }

  return context;
}

export function MockAuthGate({ children }: { children: ReactNode }) {
  const auth = useMockAuth();

  if (!auth.authenticated) {
    return <MockSignInScreen />;
  }

  return <>{children}</>;
}

function MockSignInScreen() {
  const auth = useMockAuth();
  const signingIn = auth.status === "signing_in";
  const details = [
    { label: "Organization", value: auth.institutionName },
    { label: "Identity provider", value: `${auth.providerName} · Mock SSO` },
    { label: "Environment", value: "Admin workspace · Solana Devnet" },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-6 md:px-8"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.16), transparent 24%), radial-gradient(circle at bottom right, rgba(245,158,11,0.12), transparent 26%), linear-gradient(180deg, #09111d 0%, #06080d 100%)",
      }}
    >
      <div className="w-full max-w-[1220px] relative animate-fade-in">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(120,137,171,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(120,137,171,0.08) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(circle at center, black 42%, transparent 82%)",
          }}
        />
        <div className="grid lg:grid-cols-[minmax(0,0.92fr)_430px] gap-6 xl:gap-8 items-center relative">
          <section
            className="rounded-[12px] overflow-hidden relative"
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
            <div className="relative px-7 py-8 md:px-8 md:py-8 xl:px-9 xl:py-9">
              <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-[10px]" style={{ background: "rgba(11,21,33,0.78)", border: "1px solid rgba(56,189,248,0.18)" }}>
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                  style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.24)" }}
                >
                  <LockKeyhole size={18} style={{ color: "var(--info)" }} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    Secure Access
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-primary)" }}>
                    Institutional workstation sign-in
                  </p>
                </div>
              </div>

              <div className="mt-8 max-w-[34rem]">
                <p className="text-[11px] uppercase tracking-[0.32em]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  REM Protocol
                </p>
                <h1
                  className="text-[2.85rem] md:text-[3.1rem] xl:text-[3.25rem] leading-[1.02] mt-4"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                >
                  Sign in to the institutional dashboard
                </h1>
                <p className="text-[15px] leading-7 mt-5 max-w-xl" style={{ color: "rgba(240,244,255,0.76)" }}>
                  Authenticate as <span style={{ color: "var(--text-primary)" }}>{auth.institutionName}</span> with{" "}
                  <span style={{ color: "var(--info)" }}>{auth.providerName}</span> and continue directly to the REM operations dashboard.
                </p>
              </div>

              <div
                className="grid md:grid-cols-3 gap-3 mt-8 max-w-[42rem]"
              >
                {[
                  { label: "Tenant", value: auth.institutionName },
                  { label: "Role", value: "Admin" },
                  { label: "Network", value: "Solana Devnet" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="px-4 py-4 rounded-[10px]"
                    style={{
                      background: "rgba(12,18,28,0.72)",
                      border: "1px solid rgba(42,51,73,0.72)",
                    }}
                  >
                    <p
                      className="text-[11px] uppercase tracking-[0.22em]"
                      style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
                    >
                      {item.label}
                    </p>
                    <p className="text-sm mt-2" style={{ color: "var(--text-primary)" }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <p
                className="text-sm mt-7 max-w-xl"
                style={{ color: "var(--text-secondary)" }}
              >
                Secure mock sign-in for treasury, compliance, mint, and redemption workflows.
              </p>
            </div>
          </section>

          <section
            className="rounded-[12px] overflow-hidden"
            style={{
              background: "rgba(248,250,252,0.98)",
              color: "#0f172a",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 32px 120px rgba(0,0,0,0.3)",
            }}
          >
            <div className="px-6 py-6 md:px-7 md:py-7 space-y-5">
              <div className="flex items-center justify-between gap-4 ">
                <div className="flex items-center gap-3 ">
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
                className="rounded-[10px] p-5"
                style={{
                  background: "linear-gradient(180deg, rgba(241,245,249,0.92), rgba(226,232,240,0.72))",
                  border: "1px solid rgba(148,163,184,0.24)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-[8px] flex items-center justify-center shrink-0"
                    style={{ background: "#dbeafe", color: "#1d4ed8" }}
                  >
                    <Building2 size={18} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Institutional access</p>
                    <p className="text-[1.55rem] font-semibold mt-2 leading-tight text-slate-950">{auth.institutionName}</p>
                    <p className="text-sm mt-1.5 text-slate-500">Treasury and compliance operator profile</p>
                  </div>
                </div>

                <div className="mt-5 divide-y divide-slate-200/80 rounded-[10px] overflow-hidden border border-white/70 bg-white/90">
                  {details.map((item) => (
                    <div key={item.label} className="px-4 py-3.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                      <p className="text-[15px] mt-1.5 leading-6 text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void auth.signIn();
                  }}
                  disabled={signingIn}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-5 py-4 rounded-[10px] text-sm font-semibold transition-transform duration-150 disabled:opacity-80 disabled:cursor-wait"
                  style={{
                    background: signingIn ? "#1d4ed8" : "#2563eb",
                    color: "#fff",
                    boxShadow: signingIn ? "none" : "0 18px 30px rgba(37,99,235,0.2)",
                  }}
                >
                  {signingIn ? (
                    <>
                      <LoaderCircle className="animate-spin" size={16} />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Continue with Microsoft Entra ID
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs leading-5 text-slate-500">
                Demo sign-in only. Use <span className="font-medium text-slate-700">Mock SSO Sign Out</span> to return here.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
