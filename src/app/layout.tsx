import type { Metadata } from "next";
import "./globals.css";
import { PhantomWalletProvider } from "@/components/PhantomWalletProvider";
import { MockAuthProvider } from "@/components/MockAuthProvider";
import { AppShell } from "@/components/AppShell";

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
            <AppShell>{children}</AppShell>
          </MockAuthProvider>
        </PhantomWalletProvider>
      </body>
    </html>
  );
}
