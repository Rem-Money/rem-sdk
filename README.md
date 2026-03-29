# REM Protocol — Institutional Stablecoin Operations Platform
![alt text](./public/image.png)
A web application for financial institutions to raise, track, and settle mint and redemption requests for stablecoins on Solana. Built with a full compliance layer covering KYC, AML screening, FATF Travel Rule, and OFAC checks. 

---

## Overview

rem SDK is an institutional-grade operations dashboard that handles the complete lifecycle of a stablecoin mint or redemption:

- Institution submits a mint or redeem request via the UI
- KYC, AML, and Travel Rule checks run automatically at submission time
- Stablecoin issuer's system reviews the request and approves or rejects it based on their own internal risk and compliance policies
- Once approved, the request is processed and the stablecoin is minted or redeemed
---

## Architecture

```
Institution Layer
  Bank A / Fintech B / Exchange C
         │
         │  rem.mint({ issuer: 'circle-usdc', ... })
         ▼
  RemPartnerSDK (@rem-money/partner-sdk)
  ├── Compliance Engine  (buildTravelRulePacket → IVMS 101)
  ├── Transaction State Machine  (INITIATED → SETTLED)
  └── Issuer Registry  (metadata: chains, rails, limits)
         │                    │
         ▼                    ▼
  CircleUSDC Adapter    MockBankUSD Adapter
  (Circle Programmable  (Solana SPL token,
   Wallets API,          mint authority
   testnet)              controlled)
         │                    │
         ▼                    ▼
       USDC on           MockBankUSD on
     Solana testnet       Solana devnet
```

---


## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + Anchor |
| Language | TypeScript + Rust |
| Styling | Tailwind CSS + CSS custom properties |
| ORM | Prisma 7 |
| Database | Neon PostgreSQL (serverless, edge-compatible) |
| Blockchain | Solana (devnet) via `@solana/web3.js` + `@solana/spl-token` |
| Icons | Lucide React |
| Date formatting | date-fns |
| Key encoding | bs58 |
| Container | Docker |

---

## Application Pages

### Dashboard (`/`)
- Aggregate stats: total minted, total redeemed, pending compliance, active stablecoins
- Quick-action links to all major flows
- Recent mint and redeem request tables with inline status badges
- **Asset Explorer**: dropdown selector for any supported stablecoin showing its on-chain mint address, total minted, total redeemed, net circulating supply, decimals, and network — scales to any number of assets

### Mint Request (`/mint`)
- Network selector (Solana Devnet active; additional networks shown as coming soon)
- Stablecoin dropdown (populated from DB; scales automatically)
- Amount and destination wallet fields
- Institution context card (entity, LEI, KYC/AML status)
- Full transaction flow panel showing each compliance and on-chain step
- History table with expandable rows showing Travel Rule data, AML screening results, and compliance record

### Redeem Request (`/redeem`)
- Network and stablecoin selectors
- Amount, source wallet, and complete fiat settlement details (IBAN, account holder, bank, SWIFT/BIC)
- **Off-chain transfer linkage**: payment rails selector (SWIFT, SEPA, CHAPS, ACH, FPS, IMPS, RTGS) and a transfer reference field to correlate the on-chain burn with the outgoing bank wire
- Expected settlement window displayed as a read-only issuer SLA (not user-selectable — it is defined by the issuer's banking arrangements)
- 7-step redemption flow tracker with per-step status, blocking indicators, and inline fiat confirmation action
- History table with expandable rows

### Compliance Hub (`/compliance`)
- Institution profile with KYC/AML status indicators
- Regulatory framework coverage grid (FATF, OFAC, FinCEN, EU MiCA, MAS, VARA, etc.)
- Full compliance record table with risk scores, reviewer attribution, and expandable detail panels
- Risk meter component for visual risk-level display

### Transaction History (`/transactions`)
- Unified view of all mint and redeem requests
- Filter by type (mint/redeem) and status
- Full transaction signatures with copy-to-clipboard and Solana Explorer links

---

## Mint Request State Machine

When an institution submits a mint request, the following gates run **synchronously at submission time**. If any gate fails, the request is rejected immediately and no DB record is created in an ambiguous state.

```
1. KYC Check          institution.kycStatus === "VERIFIED"        → blocks if not verified
2. AML Screening      simulated risk score + institution AML flag  → blocks if FLAGGED
3. Travel Rule        FATF-compliant filing built and stored       → passes through compliance engine
4. Compliance Record  created with status = APPROVED               → stored with full audit data
   └─ status set to APPROVED, complianceStatus = APPROVED
   └─ on-chain mint is NOT triggered here
```

The request lands in the database with `status: APPROVED`. No token has been minted yet.

```
5. Issuer Approval    node scripts/approve-mint.mjs <id>           → issuer action
   └─ verifies mint address is a real on-chain SPL mint we control
   └─ creates the mint on Solana devnet if needed (PENDING_MINT_* sentinel)
   └─ calls mintTo() with the real mint authority keypair from env
   └─ records the real Solana transaction signature
   └─ status → COMPLETED
```

The frontend polls `/api/mint-request` every 60 seconds and reflects `COMPLETED` with the real tx signature and a Solana Explorer link once the script runs.

---

## Redeem Request State Machine

```
1. KYC Check          institution.kycStatus === "VERIFIED"         → blocks if not verified
2. AML Screening      same as mint                                  → blocks if FLAGGED
3. Travel Rule        filed with settlement details + payment rails
4. On-chain Burn      simulated burn tx recorded                    → status → ON_CHAIN_CONFIRMED
                      fiatSettlementStatus → INITIATED
   └─ Request is NOT marked COMPLETED here — fiat leg is still open
5. Fiat Confirmation  institution clicks "Confirm Receipt" in the UI
   └─ POST /api/redeem-request/:id/confirm-fiat
   └─ optional bank confirmation reference stored
   └─ fiatSettlementStatus → CONFIRMED
   └─ status → COMPLETED
```

The 7-step flow panel in the UI shows each step with a green check, a red block indicator (if stuck), or a yellow action banner (when fiat confirmation is required).

---

## Fiat Settlement Status (Redeem)

| Value | Meaning |
|---|---|
| `NOT_INITIATED` | On-chain burn not yet confirmed |
| `INITIATED` | Burn confirmed; issuer instructed to send fiat wire |
| `WIRE_SENT` | Issuer has self-reported the wire as sent |
| `CONFIRMED` | Institution has confirmed funds received — request closes |
| `FAILED` | Wire failed or rejected by the receiving bank |

---

## Database Schema (key models)

### `Institution`
Represents the regulated entity making requests. Holds KYC and AML status used as gates on every request.

### `StablecoinMint`
Represents a supported stablecoin on a given network. Stores the on-chain SPL mint address, decimals, and network. All stablecoins use the same mint authority keypair from env.

### `MintRequest`
One record per mint request. Tracks compliance status, AML screening result (JSON), Travel Rule data (JSON), on-chain tx signature, and error if the mint failed.

### `RedeemRequest`
One record per redeem request. Adds `fiatSettlementStatus`, `fiatReference`, and `fiatConfirmedAt` on top of the same compliance and on-chain fields.

### `ComplianceRecord`
One record per mint request (redeem compliance is embedded in the request itself). Stores full KYC data, AML data, FATF status, OFAC screening result, risk score, reviewer attribution, and review timestamp.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values before running.

```env
# Neon PostgreSQL — pooled connection string
REM_DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require

# Solana RPC endpoint
SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Mint authority — base58-encoded private key of the wallet
# that has mint authority over all supported stablecoin mints
MOCK_USX_MINT_AUTHORITY_KEY=<base58-encoded-private-key>

# Operator public key (used for display and ATA derivation)
MOCK_USX_OPERATOR_PUBLIC_KEY=<base58-encoded-public-key>

# Placeholder bank mint address (used in seeded redeem data)
MOCK_BANK_MINT_ADDRESS=<base58-encoded-public-key>
```

To generate a new Solana keypair and encode it for `MOCK_USX_MINT_AUTHORITY_KEY`:

```bash
solana-keygen new --no-bip39-passphrase --outfile /tmp/mint-auth.json
node -e "
  const bs58 = require('bs58');
  const key = require('/tmp/mint-auth.json');
  console.log(bs58.encode(Buffer.from(key)));
"
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your Neon DB URL, Solana RPC, and mint authority key
```

### 3. Push the database schema

```bash
npx prisma db push
```

### 4. Seed the database

```bash
node scripts/seed.mjs
```

This creates the institution record, three stablecoin definitions (USX, USDC, EURC), and a realistic set of mint and redeem requests across multiple statuses. Stablecoin mint addresses are initially set to `PENDING_MINT_<SYMBOL>` sentinels — the approve-mint script provisions real on-chain mints on first run.

### 5. Start the dev server

```bash
npm run dev
# Available at http://localhost:3000 (or --port 3002 if 3000 is taken)
```

---

## Scripts

### `node scripts/seed.mjs`

Seeds the database with realistic demo data. Safe to re-run — it wipes only the institution's own records before re-inserting. Does not require the dev server to be running.

### `node scripts/approve-mint.mjs <mintRequestId>`

Issuer-side script. Approves a single APPROVED mint request, mints the tokens on Solana devnet using the mint authority keypair from env, and writes the real transaction signature back to the database.

```bash
# Approve a specific request
node scripts/approve-mint.mjs cma1b2c3d4e5f6g7h8i9j0k

# Approve all pending APPROVED requests
node scripts/approve-mint.mjs --all
```

What it does:
1. Loads `.env` and `.env.local` without requiring a running server
2. Looks up the request and its associated stablecoin from the database
3. Calls `ensureMintExists()` — verifies the stored mint address is a real SPL mint on devnet; creates one if the stored value is a placeholder or invalid
4. Updates the stablecoin record with the real mint address if it changed
5. Calls `mintTo()` with the correct amount scaled to the token's decimals
6. Records the real Solana transaction signature in the database
7. Sets request status to `COMPLETED`
8. Updates the compliance record note with the tx signature for audit trail

---

## Docker

### Build

```bash
docker build \
  --build-arg NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com \
  -t rem_sdk .
```

`NEXT_PUBLIC_SOLANA_RPC_URL` must be provided as a build argument because Next.js bakes `NEXT_PUBLIC_*` variables into the client bundle at build time. All other variables are runtime and are passed via `--env-file`.

### Run

```bash
docker run -p 3000:3000 --env-file .env rem_sdk
```

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Stats, recent requests, enriched stablecoin data with per-coin aggregates |
| `GET` | `/api/stablecoins` | List all active stablecoins |
| `GET` | `/api/mint-request` | List all mint requests for the institution |
| `POST` | `/api/mint-request` | Submit a new mint request (runs KYC/AML/Travel Rule gates) |
| `GET` | `/api/redeem-request` | List all redeem requests |
| `POST` | `/api/redeem-request` | Submit a new redeem request (same gates + on-chain burn simulation) |
| `POST` | `/api/redeem-request/:id/confirm-fiat` | Confirm fiat receipt, closing the redeem lifecycle |
| `GET` | `/api/compliance` | List compliance records |
| `POST` | `/api/seed` | Seed via HTTP (equivalent to `node scripts/seed.mjs`) |

---

## Compliance Architecture

### KYC (Know Your Customer)
Institution-level verification status (`VERIFIED`, `PENDING`, `FAILED`, `EXPIRED`). Checked at the start of every mint and redeem request. Requests are rejected immediately if KYC is not `VERIFIED`.

### AML (Anti-Money Laundering)
Simulated screening against OFAC, FinCEN, EU Sanctions, and UN Sanctions lists. A risk score (1–100) is computed; requests with a score above the threshold or with an institution `AmlStatus` of `FLAGGED` or `BLOCKED` are held for manual review.

### FATF Travel Rule
FATF-compliant originator and beneficiary data is built and stored as a JSON blob on every request. Includes institution name, LEI code, jurisdiction, wallet addresses, VASP identifier, and settlement details. Beneficiary bank account numbers are masked in the filing.

### OFAC Screening
Recorded at the compliance record level. All seeded clean requests carry `ofacScreening: "CLEAR"`.

---

## Transaction State Machine

Every mint or redeem goes through the following states, persisted in PostgreSQL:

```
INITIATED
  └─► COMPLIANCE_CHECKED
        └─► FIAT_CONFIRMED
              └─► MINT_REQUESTED
                    └─► MINTING
                          └─► ON_CHAIN_CONFIRMED
                                └─► SETTLED

Any state ──► FAILED ──► REFUNDED
```

The state machine enforces valid transitions only. Invalid transitions throw. Every transition is recorded with a timestamp and optional metadata (issuer tx ID, on-chain hash, risk score, etc.).

---

## Development Notes

- The mint page polls `/api/mint-request` every **60 seconds** so the UI reflects issuer approvals without requiring a manual refresh
- All API routes use the Neon Prisma adapter (`@prisma/adapter-neon`) for edge-compatible pooled connections
- `prisma.config.ts` holds the datasource URL instead of `schema.prisma` — this is a Prisma 7 requirement
- Solana packages are listed under `serverExternalPackages` in `next.config.ts` to prevent Turbopack from trying to bundle native Node.js modules
- The `React.Fragment` pattern is used (not `<>`) wherever table rows are rendered in a list, to allow proper `key` prop assignment

---


## Roadmap

Every component of this app maps directly to a production module:

| POC Component | Production Product |
|---------------|--------------------|
| `RemPartnerSDK` | Orchestration SDK |
| `IssuerAdapter` interface + adapters | Clearinghouse — Protocol Layer |
| `CompliancePacket` / IVMS 101 | Clearinghouse — Compliance Router |
| Transaction state machine | Clearinghouse — State Machine |
| Issuer registry | Clearinghouse — Network Registry (on-chain, `programs/registry`) |
| `programs/clearinghouse` stub | Phase 2: on-chain netting + settlement |
| MockBankUSD adapter | Any bank-issued stablecoin (Token Extensions) |
| Demo UI | REM institutional dashboard |
