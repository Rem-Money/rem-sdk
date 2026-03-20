#!/usr/bin/env node
// Issuer-side script: approve a mint request and trigger the on-chain mint.
//
// Usage:
//   node scripts/approve-mint.mjs <mintRequestId>
//   node scripts/approve-mint.mjs --all          # approve all APPROVED (pending mint) requests
//
// This simulates the issuer receiving the institution's fiat wire and
// authorising the corresponding token mint on Solana devnet.

import { createRequire } from "module";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Load .env.local / .env
for (const file of [".env.local", ".env"]) {
  try {
    const content = readFileSync(resolve(root, file), "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const { PrismaClient } = await import("@prisma/client");
const { PrismaNeon } = await import("@prisma/adapter-neon");
const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } = await import("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount, mintTo, getMint } = await import("@solana/spl-token");
const bs58 = await import("bs58");

const adapter = new PrismaNeon({ connectionString: process.env.REM_DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SOLANA_RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const MINT_AUTH_KEY = process.env.MOCK_USX_MINT_AUTHORITY_KEY;

function getConnection() {
  return new Connection(SOLANA_RPC, "confirmed");
}

function getMintAuthority() {
  if (!MINT_AUTH_KEY) throw new Error("MOCK_USX_MINT_AUTHORITY_KEY not set in env");
  const decoded = bs58.default.decode(MINT_AUTH_KEY);
  return Keypair.fromSecretKey(decoded);
}

async function ensureMintExists(mintAddress) {
  const connection = getConnection();
  const mintAuth = getMintAuthority();

  const isPlaceholder = !mintAddress || mintAddress.startsWith("PENDING_MINT_");

  if (!isPlaceholder) {
    try {
      await getMint(connection, new PublicKey(mintAddress));
      return mintAddress; // valid mint we control — use it
    } catch {
      console.log(`  ${mintAddress} is not a valid SPL mint on devnet — creating a new one...`);
    }
  } else {
    console.log(`  No on-chain mint provisioned yet — creating...`);
  }

  const { createMint } = await import("@solana/spl-token");
  const newMint = await createMint(
    connection,
    mintAuth,
    mintAuth.publicKey,
    mintAuth.publicKey,
    6
  );
  const addr = newMint.toBase58();
  console.log(`  New mint created: ${addr}`);
  return addr;
}

async function mintOnChain(mintAddress, destinationWallet, amount, decimals) {
  const connection = getConnection();
  const mintAuth = getMintAuthority();
  const mintPubkey = new PublicKey(mintAddress);
  const destPubkey = new PublicKey(destinationWallet);

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    mintAuth,
    mintPubkey,
    destPubkey
  );

  const rawAmount = BigInt(Math.round(amount * 10 ** decimals));
  const txSig = await mintTo(
    connection,
    mintAuth,
    mintPubkey,
    tokenAccount.address,
    mintAuth,
    rawAmount
  );

  return txSig;
}

async function approveRequest(request) {
  const { id, amount, destinationWallet, stablecoin } = request;
  const symbol = stablecoin.symbol;

  console.log(`\n──────────────────────────────────────────`);
  console.log(`Request ID : ${id}`);
  console.log(`Asset      : ${symbol}`);
  console.log(`Amount     : ${amount.toLocaleString()}`);
  console.log(`Wallet     : ${destinationWallet}`);

  let txSignature;

  // All stablecoins use the same mint authority key from env.
  // ensureMintExists verifies the stored address is a real on-chain mint we control;
  // if not (e.g. it's a wallet address or a foreign mint), it creates a new one and
  // updates the DB so subsequent requests use the correct address.
  console.log(`Action     : On-chain mint (Solana devnet)`);
  try {
    const resolvedMintAddress = await ensureMintExists(stablecoin.mintAddress);
    if (resolvedMintAddress !== stablecoin.mintAddress) {
      console.log(`  Mint address updated: ${stablecoin.mintAddress} → ${resolvedMintAddress}`);
      await prisma.stablecoinMint.update({
        where: { id: stablecoin.id },
        data: { mintAddress: resolvedMintAddress },
      });
      stablecoin.mintAddress = resolvedMintAddress;
    }
    console.log(`Mint       : ${stablecoin.mintAddress}`);

    txSignature = await mintOnChain(
      stablecoin.mintAddress,
      destinationWallet,
      amount,
      stablecoin.decimals
    );
    console.log(`Tx Sig     : ${txSignature}`);
    console.log(`Explorer   : https://explorer.solana.com/tx/${txSignature}?cluster=devnet`);
  } catch (err) {
    console.error(`Mint failed: ${err.message}`);
    await prisma.mintRequest.update({
      where: { id },
      data: { status: "FAILED", txError: err.message },
    });
    return false;
  }

  await prisma.mintRequest.update({
    where: { id },
    data: {
      status: "COMPLETED",
      txSignature,
    },
  });

  // Update the compliance record note
  await prisma.complianceRecord.updateMany({
    where: { mintRequestId: id },
    data: {
      notes: `Issuer approved · Fiat received · On-chain mint confirmed · Tx: ${txSignature}`,
    },
  });

  console.log(`Status     : COMPLETED ✓`);
  return true;
}

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.error("Usage:");
    console.error("  node scripts/approve-mint.mjs <mintRequestId>");
    console.error("  node scripts/approve-mint.mjs --all");
    process.exit(1);
  }

  let requests;

  if (arg === "--all") {
    requests = await prisma.mintRequest.findMany({
      where: { status: "APPROVED" },
      include: { stablecoin: true },
    });
    if (!requests.length) {
      console.log("No APPROVED mint requests pending on-chain mint.");
      process.exit(0);
    }
    console.log(`Found ${requests.length} approved request(s) to process.`);
  } else {
    const req = await prisma.mintRequest.findUnique({
      where: { id: arg },
      include: { stablecoin: true },
    });
    if (!req) {
      console.error(`Request not found: ${arg}`);
      process.exit(1);
    }
    if (req.status !== "APPROVED") {
      console.error(`Request is not in APPROVED state — current status: ${req.status}`);
      console.error(`Only APPROVED requests (compliance done, fiat received, awaiting mint) can be approved.`);
      process.exit(1);
    }
    requests = [req];
  }

  let ok = 0;
  let fail = 0;
  for (const req of requests) {
    const success = await approveRequest(req);
    success ? ok++ : fail++;
  }

  console.log(`\n──────────────────────────────────────────`);
  console.log(`Done: ${ok} succeeded, ${fail} failed.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
