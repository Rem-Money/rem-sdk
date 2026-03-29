"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
