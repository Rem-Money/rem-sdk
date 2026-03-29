"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type WalletStatus =
  | "checking"
  | "ready"
  | "unavailable"
  | "connecting"
  | "connected";

type PhantomPublicKey = {
  toString(): string;
};

type PhantomEvent = "connect" | "disconnect" | "accountChanged";

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PhantomPublicKey | null;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PhantomPublicKey }>;
  disconnect: () => Promise<void>;
  on?: (event: PhantomEvent, handler: (publicKey?: PhantomPublicKey | null) => void) => void;
  removeListener?: (event: PhantomEvent, handler: (publicKey?: PhantomPublicKey | null) => void) => void;
};

type PhantomWindow = Window & {
  phantom?: {
    solana?: PhantomProvider;
  };
  solana?: PhantomProvider;
};

type WalletContextValue = {
  address: string | null;
  shortAddress: string | null;
  connected: boolean;
  installed: boolean;
  status: WalletStatus;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function shortenAddress(address: string | null) {
  if (!address) return null;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function getPhantomProvider() {
  if (typeof window === "undefined") return null;
  const phantomWindow = window as PhantomWindow;
  const provider = phantomWindow.phantom?.solana ?? phantomWindow.solana ?? null;
  if (!provider?.isPhantom) return null;
  return provider;
}

export function PhantomWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>("checking");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const provider = getPhantomProvider();
    if (!provider) {
      setInstalled(false);
      setStatus("unavailable");
      setAddress(null);
      return;
    }

    setInstalled(true);

    const applyAddress = (nextPublicKey?: PhantomPublicKey | null) => {
      const nextAddress = nextPublicKey?.toString() ?? provider.publicKey?.toString() ?? null;
      setAddress(nextAddress);
      setStatus(nextAddress ? "connected" : "ready");
    };

    const handleConnect = (nextPublicKey?: PhantomPublicKey | null) => {
      applyAddress(nextPublicKey);
    };

    const handleDisconnect = () => {
      setAddress(null);
      setStatus("ready");
    };

    const handleAccountChanged = (nextPublicKey?: PhantomPublicKey | null) => {
      if (!nextPublicKey) {
        setAddress(null);
        setStatus("ready");
        return;
      }
      applyAddress(nextPublicKey);
    };

    provider.on?.("connect", handleConnect);
    provider.on?.("disconnect", handleDisconnect);
    provider.on?.("accountChanged", handleAccountChanged);

    if (provider.publicKey) {
      applyAddress(provider.publicKey);
    } else {
      setStatus("ready");
      provider.connect({ onlyIfTrusted: true }).then((result) => {
        applyAddress(result.publicKey);
      }).catch(() => {
        setStatus("ready");
      });
    }

    return () => {
      provider.removeListener?.("connect", handleConnect);
      provider.removeListener?.("disconnect", handleDisconnect);
      provider.removeListener?.("accountChanged", handleAccountChanged);
    };
  }, []);

  async function connect() {
    const provider = getPhantomProvider();
    if (!provider) {
      if (typeof window !== "undefined") {
        window.open("https://phantom.app/download", "_blank", "noopener,noreferrer");
      }
      return;
    }

    setStatus("connecting");
    try {
      const result = await provider.connect();
      const nextAddress = result.publicKey.toString();
      setAddress(nextAddress);
      setInstalled(true);
      setStatus("connected");
    } catch {
      setStatus(address ? "connected" : "ready");
    }
  }

  async function disconnect() {
    const provider = getPhantomProvider();
    if (!provider) return;

    try {
      await provider.disconnect();
    } finally {
      setAddress(null);
      setStatus("ready");
    }
  }

  const value = {
    address,
    shortAddress: shortenAddress(address),
    connected: !!address,
    installed,
    status,
    connect,
    disconnect,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function usePhantomWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("usePhantomWallet must be used within PhantomWalletProvider");
  }
  return context;
}
