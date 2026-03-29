"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useMockAuth } from "@/components/MockAuthProvider";

const PROTECTED_ROUTES = ["/dashboard", "/mint", "/redeem", "/compliance", "/transactions"];

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function ProtectedRouteLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 24%), radial-gradient(circle at bottom right, rgba(245,158,11,0.1), transparent 24%), linear-gradient(180deg, #09111d 0%, #06080d 100%)",
      }}
    >
      <div
        className="px-6 py-5 rounded-2xl text-center"
        style={{ background: "rgba(12,18,28,0.82)", border: "1px solid rgba(42,51,73,0.72)" }}
      >
        <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          Secure Access
        </p>
        <p className="text-sm mt-3" style={{ color: "var(--text-primary)" }}>
          Checking institutional session...
        </p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useMockAuth();
  const protectedRoute = isProtectedRoute(pathname);

  useEffect(() => {
    if (protectedRoute && auth.status !== "checking" && !auth.authenticated) {
      router.replace("/");
    }
  }, [auth.authenticated, auth.status, protectedRoute, router]);

  if (!protectedRoute) {
    return <>{children}</>;
  }

  if (auth.status === "checking") {
    return <ProtectedRouteLoading />;
  }

  if (!auth.authenticated) {
    return null;
  }

  return (
    <div className="h-full flex">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ background: "var(--bg-base)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
