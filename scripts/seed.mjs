#!/usr/bin/env node
// Run directly: node scripts/seed.mjs
// Does NOT require the Next.js dev server to be running.

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Load .env first, then .env.local so local overrides win.
for (const file of [".env", ".env.local"]) {
  try {
    const content = readFileSync(resolve(root, file), "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch { }
}

const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.REM_DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const INST = {
  id: "inst_apex_capital_001",
  name: "Apex Capital LLC",
  leiCode: "254900HROIFWPRGM1V77",
  jurisdiction: "US",
  entityType: "INVESTMENT_FUND",
  walletAddress: process.env.MOCK_USX_OPERATOR_PUBLIC_KEY ?? "GyQMwcby9mcvjZoxJpFuoiDQyhVTdAjdiYMX2worFi4e",
};

function daysAgo(n, h = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - h);
  return d;
}

function aml(riskScore, result = "CLEAR", flags = []) {
  return {
    screeningId: `AML-${Math.floor(Math.random() * 900000 + 100000)}`,
    result,
    riskScore,
    checks: ["OFAC", "FinCEN", "EU-Sanctions", "UN-Sanctions"],
    checksPassed: result === "CLEAR" ? 4 : result === "FLAGGED" ? 3 : 0,
    timestamp: new Date().toISOString(),
    ...(flags.length && { flags }),
  };
}

function tr(overrides = {}) {
  return {
    originatorName: INST.name,
    originatorLEI: INST.leiCode,
    originatorJurisdiction: INST.jurisdiction,
    originatorWallet: INST.walletAddress,
    fatfCompliant: true,
    vasp: "Apex Capital LLC",
    vaspId: "APEX-001",
    ...overrides,
  };
}

async function run() {
  console.log("Seeding database...");

  // ── Wipe ──────────────────────────────────────────────────────────────────
  await prisma.complianceRecord.deleteMany({ where: { institutionId: INST.id } });
  await prisma.mintRequest.deleteMany({ where: { institutionId: INST.id } });
  await prisma.redeemRequest.deleteMany({ where: { institutionId: INST.id } });
  console.log("Cleared old data");

  // ── Institution ───────────────────────────────────────────────────────────
  await prisma.institution.upsert({
    where: { id: INST.id },
    update: { kycStatus: "VERIFIED", amlStatus: "CLEAR" },
    create: { ...INST, kycStatus: "VERIFIED", amlStatus: "CLEAR" },
  });

  // ── Stablecoins ───────────────────────────────────────────────────────────
  // Mint addresses are intentionally left as placeholder strings here.
  // The approve-mint script calls ensureMintExists() which verifies each address
  // is a real SPL token mint we control; if not, it creates one on devnet and
  // writes the real address back to the DB. Using "PENDING_MINT_<symbol>" as a
  // sentinel makes it obvious that the address hasn't been provisioned yet.
  const coinDefs = [
    { symbol: "USX", name: "USD by Solstice", mintAddress: "PENDING_MINT_USX", decimals: 6 },
    { symbol: "USDC", name: "USD Coin", mintAddress: "PENDING_MINT_USDC", decimals: 6 },
    { symbol: "EURC", name: "Euro Coin", mintAddress: "PENDING_MINT_EURC", decimals: 6 },
  ];
  const coins = {};
  for (const c of coinDefs) {
    const r = await prisma.stablecoinMint.upsert({
      where: { symbol: c.symbol }, update: {}, create: { ...c, network: "devnet", active: true },
    });
    coins[c.symbol] = r.id;
  }
  console.log("Stablecoins ready:", Object.keys(coins).join(", "));

  // ── Mint Requests ─────────────────────────────────────────────────────────
  const mints = [
    // ✅ COMPLETED — all steps satisfied
    { coin: "USX", amount: 500_000, status: "COMPLETED", complianceStatus: "APPROVED", kycVerified: true, txSignature: `DEMO_${Date.now() - 8640000}`, aml: aml(12), daysAgo: 14, travelRule: tr({ beneficiaryWallet: INST.walletAddress, amount: 500_000, currency: "USD", network: "solana-devnet" }) },
    { coin: "USX", amount: 1_250_000, status: "COMPLETED", complianceStatus: "APPROVED", kycVerified: true, txSignature: `DEMO_${Date.now() - 6048000}`, aml: aml(8), daysAgo: 10, travelRule: tr({ beneficiaryWallet: INST.walletAddress, amount: 1_250_000, currency: "USD", network: "solana-devnet" }) },
    { coin: "USDC", amount: 750_000, status: "COMPLETED", complianceStatus: "APPROVED", kycVerified: true, txSignature: `DEMO_${Date.now() - 3600000}`, aml: aml(5), daysAgo: 7, travelRule: tr({ beneficiaryWallet: INST.walletAddress, amount: 750_000, currency: "USD", network: "solana-devnet" }) },
    { coin: "EURC", amount: 300_000, status: "COMPLETED", complianceStatus: "APPROVED", kycVerified: true, txSignature: `DEMO_${Date.now() - 1800000}`, aml: aml(18), daysAgo: 5, travelRule: tr({ beneficiaryWallet: INST.walletAddress, amount: 300_000, currency: "EUR", network: "solana-devnet", originatorJurisdiction: "DE" }) },
    // 🔴 COMPLIANCE_REVIEW — AML flagged, frozen at step 3
    { coin: "USDC", amount: 4_500_000, status: "COMPLIANCE_REVIEW", complianceStatus: "IN_REVIEW", kycVerified: true, txSignature: null, aml: aml(62, "FLAGGED", ["HIGH_VOLUME", "JURISDICTION_WATCH"]), daysAgo: 2, travelRule: tr({ beneficiaryWallet: INST.walletAddress, amount: 4_500_000, currency: "USD", network: "solana-devnet", originatorJurisdiction: "SG", fatfCompliant: false }) },
    // ⏳ PENDING — not yet in compliance pipeline
    { coin: "USX", amount: 2_000_000, status: "PENDING", complianceStatus: "PENDING", kycVerified: true, txSignature: null, aml: aml(0, "PENDING"), daysAgo: 1, travelRule: null },
    // ❌ FAILED — compliance passed, on-chain failed
    { coin: "EURC", amount: 100_000, status: "FAILED", complianceStatus: "APPROVED", kycVerified: true, txSignature: null, txError: "Simulation failed: invalid account owner", aml: aml(9), daysAgo: 3, travelRule: tr({ beneficiaryWallet: "InvalidWalletAddressForDemo", amount: 100_000, currency: "EUR", network: "solana-devnet" }) },
  ];

  for (const m of mints) {
    const created = daysAgo(m.daysAgo);
    await prisma.mintRequest.create({
      data: {
        institution: { connect: { id: INST.id } },
        stablecoin: { connect: { id: coins[m.coin] } },
        amount: m.amount,
        destinationWallet: INST.walletAddress,
        status: m.status,
        complianceStatus: m.complianceStatus,
        kycVerified: m.kycVerified,
        txSignature: m.txSignature ?? null,
        txError: m.txError ?? null,
        amlScreening: m.aml,
        travelRuleData: m.travelRule,
        createdAt: created,
        updatedAt: created,
      },
    });
  }
  console.log(`Seeded ${mints.length} mint requests`);

  // ── Redeem Requests ───────────────────────────────────────────────────────
  const base = { beneficiaryBank: "NatWest", bankSwiftBic: "NWBKGB2L", accountHolderName: INST.name, iban: "GB29NWBK60161331926819", expectedSettlement: "T+1", paymentRails: "SWIFT" };

  const redeems = [
    // ✅ COMPLETED — KYC ✅ AML ✅ Travel Rule ✅ On-chain ✅ Fiat ✅
    {
      coin: "USX", amount: 200_000, destAccount: "GB29NWBK60161331926819",
      status: "COMPLETED", complianceStatus: "APPROVED", kycVerified: true,
      txSignature: `REDEEM_${Date.now() - 9000000}`,
      aml: aml(11), fiatSettlementStatus: "CONFIRMED", fiatReference: "CHAPS-REF-00091", fiatConfirmedAt: daysAgo(11),
      daysAgo: 12, updatedDaysAgo: 11,
      travelRule: tr({
        originatorWallet: INST.walletAddress, beneficiaryInstitution: "NatWest", beneficiaryAccount: "MASKED", amount: 200_000, currency: "USD", network: "solana-devnet",
        settlementDetails: {
          ...base, transferReference: "INV-2024-00091", paymentRails: "CHAPS",
          fiatConfirmation: { confirmedAt: daysAgo(11).toISOString(), confirmedBy: "Institution Operator", bankConfirmationRef: "CHAPS-REF-00091" }
        }
      }),
    },
    {
      coin: "USDC", amount: 450_000, destAccount: "DE89370400440532013000",
      status: "COMPLETED", complianceStatus: "APPROVED", kycVerified: true,
      txSignature: `REDEEM_${Date.now() - 7200000}`,
      aml: aml(7), fiatSettlementStatus: "CONFIRMED", fiatReference: "SEPA-REF-00104", fiatConfirmedAt: daysAgo(7),
      daysAgo: 8, updatedDaysAgo: 7,
      travelRule: tr({
        originatorWallet: INST.walletAddress, beneficiaryInstitution: "Deutsche Bank", beneficiaryAccount: "MASKED", amount: 450_000, currency: "USD", network: "solana-devnet", originatorJurisdiction: "DE",
        settlementDetails: {
          ...base, beneficiaryBank: "Deutsche Bank", bankSwiftBic: "DEUTDEDB", iban: "DE89370400440532013000", transferReference: "INV-2024-00104", paymentRails: "SEPA",
          fiatConfirmation: { confirmedAt: daysAgo(7).toISOString(), confirmedBy: "Institution Operator", bankConfirmationRef: "SEPA-REF-00104" }
        }
      }),
    },
    {
      coin: "EURC", amount: 180_000, destAccount: "FR7630006000011234567890189",
      status: "COMPLETED", complianceStatus: "APPROVED", kycVerified: true,
      txSignature: `REDEEM_${Date.now() - 3200000}`,
      aml: aml(15), fiatSettlementStatus: "CONFIRMED", fiatReference: "SEPA-REF-00117", fiatConfirmedAt: daysAgo(3),
      daysAgo: 4, updatedDaysAgo: 3,
      travelRule: tr({
        originatorWallet: INST.walletAddress, beneficiaryInstitution: "BNP Paribas", beneficiaryAccount: "MASKED", amount: 180_000, currency: "EUR", network: "solana-devnet", originatorJurisdiction: "FR",
        settlementDetails: {
          ...base, beneficiaryBank: "BNP Paribas", bankSwiftBic: "BNPAFRPP", iban: "FR7630006000011234567890189", transferReference: "INV-2024-00117", paymentRails: "SEPA",
          fiatConfirmation: { confirmedAt: daysAgo(3).toISOString(), confirmedBy: "Institution Operator", bankConfirmationRef: "SEPA-REF-00117" }
        }
      }),
    },
    // 🔶 ON_CHAIN_CONFIRMED — tokens burned, wire sent, fiat NOT yet confirmed → shows "Confirm Receipt" button
    {
      coin: "USX", amount: 900_000, destAccount: "GB29NWBK60161331926819",
      status: "ON_CHAIN_CONFIRMED", complianceStatus: "APPROVED", kycVerified: true,
      txSignature: `REDEEM_${Date.now() - 43200000}`,
      aml: aml(22), fiatSettlementStatus: "INITIATED", fiatReference: "INV-2024-00131",
      daysAgo: 1, updatedDaysAgo: 0,
      travelRule: tr({
        originatorWallet: INST.walletAddress, beneficiaryInstitution: "NatWest", beneficiaryAccount: "MASKED", amount: 900_000, currency: "USD", network: "solana-devnet",
        settlementDetails: { ...base, transferReference: "INV-2024-00131", paymentRails: "SWIFT" }
      }),
    },
    // 🔴 COMPLIANCE_REVIEW — AML flagged, burn blocked
    {
      coin: "EURC", amount: 620_000, destAccount: "SG123456789012",
      status: "COMPLIANCE_REVIEW", complianceStatus: "IN_REVIEW", kycVerified: true,
      txSignature: null,
      aml: aml(58, "FLAGGED", ["HIGH_VOLUME", "JURISDICTION_WATCH"]), fiatSettlementStatus: "NOT_INITIATED",
      daysAgo: 0, updatedDaysAgo: 0,
      travelRule: tr({
        originatorWallet: INST.walletAddress, beneficiaryInstitution: "DBS Bank", beneficiaryAccount: "MASKED", amount: 620_000, currency: "EUR", network: "solana-devnet", originatorJurisdiction: "SG", fatfCompliant: false,
        settlementDetails: { ...base, beneficiaryBank: "DBS Bank", bankSwiftBic: "DBSSSGSG", iban: "SG123456789012", transferReference: "INV-2024-00144", paymentRails: "SWIFT" }
      }),
    },
  ];

  for (const r of redeems) {
    const created = daysAgo(r.daysAgo);
    const updated = daysAgo(r.updatedDaysAgo ?? r.daysAgo);
    await prisma.redeemRequest.create({
      data: {
        institution: { connect: { id: INST.id } },
        stablecoin: { connect: { id: coins[r.coin] } },
        amount: r.amount,
        sourceWallet: INST.walletAddress,
        destinationBankAccount: r.destAccount ?? null,
        status: r.status,
        complianceStatus: r.complianceStatus,
        kycVerified: r.kycVerified,
        txSignature: r.txSignature ?? null,
        amlScreening: r.aml,
        travelRuleData: r.travelRule,
        fiatSettlementStatus: r.fiatSettlementStatus,
        fiatReference: r.fiatReference ?? null,
        fiatConfirmedAt: r.fiatConfirmedAt ?? null,
        createdAt: created,
        updatedAt: updated,
      },
    });
  }
  console.log(`Seeded ${redeems.length} redeem requests`);

  // ── Compliance Records ────────────────────────────────────────────────────
  const compliance = [
    { recordType: "KYC_REVIEW", status: "APPROVED", riskScore: 12, notes: "Full KYC package reviewed. Beneficial ownership confirmed. LEI validated via GLEIF.", jurisdiction: "GB", fatfStatus: "COMPLIANT", ofacScreening: "CLEAR", reviewedBy: "Compliance Officer — J. Morgan", reviewedAt: daysAgo(29), createdAt: daysAgo(30) },
    { recordType: "AML_SCREENING", status: "APPROVED", riskScore: 8, notes: "OFAC SDN check passed. No PEP matches. Transaction monitoring threshold within normal range.", jurisdiction: "GB", fatfStatus: "COMPLIANT", ofacScreening: "CLEAR", reviewedBy: "AutoCompliance Engine v2.1", reviewedAt: daysAgo(14), createdAt: daysAgo(14) },
    { recordType: "TRAVEL_RULE", status: "APPROVED", riskScore: 5, notes: "Travel Rule data transmitted to counterparty VASP. Originator and beneficiary confirmed. IVMS101 payload archived.", jurisdiction: "GB", fatfStatus: "COMPLIANT", ofacScreening: "CLEAR", reviewedBy: "AutoCompliance Engine v2.1", reviewedAt: daysAgo(10), createdAt: daysAgo(10) },
    { recordType: "AML_SCREENING", status: "IN_REVIEW", riskScore: 62, notes: "Elevated risk score triggered manual review. Large volume ($4.5M) combined with SG jurisdiction watch-list flag. Escalated to compliance officer.", jurisdiction: "SG", fatfStatus: "UNDER_REVIEW", ofacScreening: "PENDING", reviewedBy: null, reviewedAt: null, createdAt: daysAgo(2) },
    { recordType: "AML_SCREENING", status: "IN_REVIEW", riskScore: 58, notes: "EURC €620k redeem flagged — SG beneficiary on jurisdiction watch list. Awaiting compliance officer sign-off.", jurisdiction: "SG", fatfStatus: "UNDER_REVIEW", ofacScreening: "PENDING", reviewedBy: null, reviewedAt: null, createdAt: daysAgo(0, 8) },
    { recordType: "TRAVEL_RULE", status: "PENDING", riskScore: 20, notes: "Awaiting counterparty VASP response for $900k USX redeem. IVMS101 payload sent to NatWest VASP.", jurisdiction: "GB", fatfStatus: "PENDING", ofacScreening: "CLEAR", reviewedBy: null, reviewedAt: null, createdAt: daysAgo(1) },
  ];

  for (const c of compliance) {
    await prisma.complianceRecord.create({
      data: { ...c, institution: { connect: { id: INST.id } } },
    });
  }
  console.log(`Seeded ${compliance.length} compliance records`);

  await prisma.$disconnect();
  console.log("✅ Seed complete.");
}

run().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
