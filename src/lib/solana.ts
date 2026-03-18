import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  burn,
  getMint,
  getAccount,
  createMint,
} from "@solana/spl-token";
import bs58 from "bs58";

export function getConnection(): Connection {
  const rpcUrl = process.env.SOLANA_RPC_URL!;
  return new Connection(rpcUrl, "confirmed");
}

export function getMintAuthorityKeypair(): Keypair {
  const key = process.env.MOCK_USDX_MINT_AUTHORITY_KEY!;
  const decoded = bs58.decode(key);
  return Keypair.fromSecretKey(decoded);
}

export async function getOrCreateUsdxMint(): Promise<PublicKey> {
  // The operator public key is the mint authority's public key
  // We derive the mint from the authority deterministically
  const mintAuthority = getMintAuthorityKeypair();
  return mintAuthority.publicKey;
}

export async function mintTokens(
  mintAddress: string,
  destinationWallet: string,
  amount: number,
  decimals: number
): Promise<string> {
  const connection = getConnection();
  const mintAuthority = getMintAuthorityKeypair();
  const mintPubkey = new PublicKey(mintAddress);
  const destinationPubkey = new PublicKey(destinationWallet);

  // Get or create associated token account for the destination
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    mintAuthority, // payer
    mintPubkey,
    destinationPubkey
  );

  // Mint tokens (amount * 10^decimals for smallest unit)
  const rawAmount = BigInt(Math.round(amount * Math.pow(10, decimals)));

  const signature = await mintTo(
    connection,
    mintAuthority, // payer
    mintPubkey,
    tokenAccount.address,
    mintAuthority, // mint authority
    rawAmount
  );

  return signature;
}

export async function burnTokens(
  mintAddress: string,
  sourceWallet: string,
  sourceTokenAccount: string,
  amount: number,
  decimals: number,
  ownerKeypair: Keypair
): Promise<string> {
  const connection = getConnection();
  const mintPubkey = new PublicKey(mintAddress);
  const tokenAccountPubkey = new PublicKey(sourceTokenAccount);

  const rawAmount = BigInt(Math.round(amount * Math.pow(10, decimals)));

  const signature = await burn(
    connection,
    ownerKeypair,
    tokenAccountPubkey,
    mintPubkey,
    ownerKeypair,
    rawAmount
  );

  return signature;
}

export async function getMintInfo(mintAddress: string) {
  const connection = getConnection();
  const mintPubkey = new PublicKey(mintAddress);
  return getMint(connection, mintPubkey);
}

export async function getTokenBalance(
  mintAddress: string,
  walletAddress: string
): Promise<number> {
  try {
    const connection = getConnection();
    const mintPubkey = new PublicKey(mintAddress);
    const walletPubkey = new PublicKey(walletAddress);

    const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
    const ataAddress = getAssociatedTokenAddressSync(mintPubkey, walletPubkey);

    const account = await getAccount(connection, ataAddress);
    const mintInfo = await getMint(connection, mintPubkey);

    return Number(account.amount) / Math.pow(10, mintInfo.decimals);
  } catch {
    return 0;
  }
}

export async function ensureMintExists(
  mintAddress: string | null
): Promise<string> {
  // If we have a known mint address, verify it exists
  if (mintAddress) {
    try {
      const info = await getMintInfo(mintAddress);
      return mintAddress;
    } catch {
      // Mint doesn't exist on chain, create a new one
    }
  }

  // Create a new mint
  const connection = getConnection();
  const mintAuthority = getMintAuthorityKeypair();

  const mint = await createMint(
    connection,
    mintAuthority,
    mintAuthority.publicKey,
    mintAuthority.publicKey,
    6
  );

  return mint.toBase58();
}
