import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { PhantomWalletProvider } from "@/components/PhantomWalletProvider";
import { MockAuthGate, MockAuthProvider } from "@/components/MockAuthProvider";

export const metadata: Metadata = {
  title: "REM Protocol — Institutional Stablecoin Operations",
  description: "Institutional mint, redeem, and compliance operations for stablecoins on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full" style={{ background: "var(--bg-base)" }}>
        <PhantomWalletProvider>
          <MockAuthProvider>
            <MockAuthGate>
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
            </MockAuthGate>
          </MockAuthProvider>
        </PhantomWalletProvider>
      </body>
    </html>
  );
}
