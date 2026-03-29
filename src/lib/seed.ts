// Run once to seed initial data: POST /api/seed
import { Prisma, type ComplianceStatus, type FiatSettlementStatus, type RequestStatus } from "@prisma/client";
import { prisma } from "./db";
import { PLACEHOLDER_INSTITUTION } from "./placeholder-entity";

function daysAgo(n: number, hourOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - hourOffset);
  return d;
}

function mockAml(riskScore: number, status: "CLEAR" | "FLAGGED" | "PENDING" = "CLEAR", flags: string[] = []) {
  return {
    screeningId: `AML-${Math.floor(Math.random() * 900000 + 100000)}`,
    result: status,
    riskScore,
    checks: ["OFAC", "FinCEN", "EU-Sanctions", "UN-Sanctions"],
    checksPassed: status === "CLEAR" ? 4 : status === "FLAGGED" ? 3 : 0,
    timestamp: new Date().toISOString(),
    ...(flags.length && { flags }),
  };
}

function mockTravelRule(overrides: Record<string, unknown> = {}): Prisma.InputJsonValue {
  return {
    originatorName: PLACEHOLDER_INSTITUTION.name,
    originatorLEI: PLACEHOLDER_INSTITUTION.leiCode,
    originatorJurisdiction: PLACEHOLDER_INSTITUTION.jurisdiction,
    originatorWallet: PLACEHOLDER_INSTITUTION.walletAddress,
    fatfCompliant: true,
    vasp: "AMINA Bank AG ",
    vaspId: "APEX-001",
    ...overrides,
  };
}

function ref() {
  return `INV-2024-${Math.floor(Math.random() * 90000 + 10000)}`;
}

export async function seed() {
  console.log("Seeding database...");

  // ── Wipe existing request data so re-seed is idempotent ─────────────────
  await prisma.complianceRecord.deleteMany({ where: { institutionId: PLACEHOLDER_INSTITUTION.id } });
  await prisma.mintRequest.deleteMany({ where: { institutionId: PLACEHOLDER_INSTITUTION.id } });
  await prisma.redeemRequest.deleteMany({ where: { institutionId: PLACEHOLDER_INSTITUTION.id } });
  console.log("Cleared existing request data");

  // ── Institution ──────────────────────────────────────────────────────────
  const institution = await prisma.institution.upsert({
    where: { id: PLACEHOLDER_INSTITUTION.id },
    update: { kycStatus: "VERIFIED", amlStatus: "CLEAR" },
    create: {
      id: PLACEHOLDER_INSTITUTION.id,
      name: PLACEHOLDER_INSTITUTION.name,
      leiCode: PLACEHOLDER_INSTITUTION.leiCode,
      jurisdiction: PLACEHOLDER_INSTITUTION.jurisdiction,
      entityType: PLACEHOLDER_INSTITUTION.entityType,
      walletAddress: PLACEHOLDER_INSTITUTION.walletAddress,
      kycStatus: "VERIFIED",
      amlStatus: "CLEAR",
    },
  });
  console.log("Institution ready:", institution.id);

  // ── Stablecoins ──────────────────────────────────────────────────────────
  const coinDefs = [
    { symbol: "USX", name: "USD Extended", mintAddress: process.env.MOCK_USX_OPERATOR_PUBLIC_KEY ?? "GyQMwcby9mcvjZoxJpFuoiDQyhVTdAjdiYMX2worFi4e", decimals: 6 },
    { symbol: "USDC", name: "USD Coin", mintAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", decimals: 6 },
    { symbol: "EURC", name: "Euro Coin", mintAddress: "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr", decimals: 6 },
  ];

  const coins: Record<string, string> = {};
  for (const coin of coinDefs) {
    const record = await prisma.stablecoinMint.upsert({
      where: { symbol: coin.symbol },
      update: {},
      create: { ...coin, network: "devnet", active: true },
    });
    coins[coin.symbol] = record.id;
  }
  console.log("Stablecoins ready:", Object.keys(coins).join(", "));

  // ── Mint Requests ────────────────────────────────────────────────────────
  // Every COMPLETED record has all compliance steps fully satisfied.
  // In-progress / failed records have the correct step frozen at its blocking state.

  const mintSeeds: Parameters<typeof prisma.mintRequest.create>[0]["data"][] = [
    // ✅ COMPLETED — USX, 14 days ago
    {
      institution: { connect: { id: institution.id } },
      stablecoin: { connect: { id: coins.USX } },
      amount: 500_000,
      destinationWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      status: "COMPLETED",
      complianceStatus: "APPROVED",
      kycVerified: true,
      txSignature: `DEMO_${Date.now() - 8_640_000}`,
      amlScreening: mockAml(12),
      travelRuleData: mockTravelRule({
        beneficiaryWallet: PLACEHOLDER_INSTITUTION.walletAddress,
        amount: 500_000,
        currency: "USD",
        network: "solana-devnet",
        timestamp: daysAgo(14).toISOString(),
        reference: ref(),
      }),
      createdAt: daysAgo(14),
      updatedAt: daysAgo(14),
    },

    // ✅ COMPLETED — USX, 10 days ago
    {
      institution: { connect: { id: institution.id } },
      stablecoin: { connect: { id: coins.USX } },
      amount: 1_250_000,
      destinationWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      status: "COMPLETED",
      complianceStatus: "APPROVED",
      kycVerified: true,
      txSignature: `DEMO_${Date.now() - 6_048_000}`,
      amlScreening: mockAml(8),
      travelRuleData: mockTravelRule({
        beneficiaryWallet: PLACEHOLDER_INSTITUTION.walletAddress,
        amount: 1_250_000,
        currency: "USD",
        network: "solana-devnet",
        timestamp: daysAgo(10).toISOString(),
        reference: ref(),
      }),
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    },

    // ✅ COMPLETED — USDC, 7 days ago
    {
      institution: { connect: { id: institution.id } },
      stablecoin: { connect: { id: coins.USDC } },
      amount: 750_000,
      destinationWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      status: "COMPLETED",
      complianceStatus: "APPROVED",
      kycVerified: true,
      txSignature: `DEMO_${Date.now() - 3_600_000}`,
      amlScreening: mockAml(5),
      travelRuleData: mockTravelRule({
        beneficiaryWallet: PLACEHOLDER_INSTITUTION.walletAddress,
        amount: 750_000,
        currency: "USD",
        network: "solana-devnet",
        timestamp: daysAgo(7).toISOString(),
        reference: ref(),
      }),
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },

    // ✅ COMPLETED — EURC, 5 days ago
    {
      institution: { connect: { id: institution.id } },
      stablecoin: { connect: { id: coins.EURC } },
      amount: 300_000,
      destinationWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      status: "COMPLETED",
      complianceStatus: "APPROVED",
      kycVerified: true,
      txSignature: `DEMO_${Date.now() - 1_800_000}`,
      amlScreening: mockAml(18),
      travelRuleData: mockTravelRule({
        beneficiaryWallet: PLACEHOLDER_INSTITUTION.walletAddress,
        amount: 300_000,
        currency: "EUR",
        network: "solana-devnet",
        timestamp: daysAgo(5).toISOString(),
        reference: ref(),
        originatorJurisdiction: "DE",
      }),
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },

    // ⏳ COMPLIANCE_REVIEW — AML flagged, frozen at step 3
    // KYC ✅  |  AML ❌ (flagged, manual review)  |  Travel Rule ✅  |  On-chain ⏳
    {
      institution: { connect: { id: institution.id } },
      stablecoin: { connect: { id: coins.USDC } },
      amount: 4_500_000,
      destinationWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      status: "COMPLIANCE_REVIEW",
      complianceStatus: "IN_REVIEW",
      kycVerified: true,
      amlScreening: mockAml(62, "FLAGGED", ["HIGH_VOLUME", "JURISDICTION_WATCH"]),
      travelRuleData: mockTravelRule({
        beneficiaryWallet: PLACEHOLDER_INSTITUTION.walletAddress,
        amount: 4_500_000,
        currency: "USD",
        network: "solana-devnet",
        timestamp: daysAgo(2).toISOString(),
        reference: ref(),
        originatorJurisdiction: "SG",
        note: "Large volume — elevated FATF jurisdiction review",
        fatfCompliant: false,
      }),
      createdAt: daysAgo(2),
      updatedAt: daysAgo(0, 3),
    },

    // ⏳ PENDING — awaiting submission into compliance pipeline
    // KYC ✅  |  AML ⏳  |  Travel Rule ⏳  |  On-chain ⏳
    {
      institution: { connect: { id: institution.id } },
      stablecoin: { connect: { id: coins.USX } },
      amount: 2_000_000,
      destinationWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      status: "PENDING",
      complianceStatus: "PENDING",
      kycVerified: true,
      amlScreening: mockAml(0, "PENDING"),
      travelRuleData: Prisma.JsonNull,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },

    // ❌ FAILED — compliance passed, on-chain tx failed
    // KYC ✅  |  AML ✅  |  Travel Rule ✅  |  On-chain ❌
    {
      institution: { connect: { id: institution.id } },
      stablecoin: { connect: { id: coins.EURC } },
      amount: 100_000,
      destinationWallet: "InvalidWalletAddressForDemo",
      status: "FAILED",
      complianceStatus: "APPROVED",
      kycVerified: true,
      txError: "Simulation failed: invalid account owner",
      amlScreening: mockAml(9),
      travelRuleData: mockTravelRule({
        beneficiaryWallet: "InvalidWalletAddressForDemo",
        amount: 100_000,
        currency: "EUR",
        network: "solana-devnet",
        timestamp: daysAgo(3).toISOString(),
        reference: ref(),
      }),
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
  ];

  for (const data of mintSeeds) {
    await prisma.mintRequest.create({ data });
  }
  console.log(`Seeded ${mintSeeds.length} mint requests`);

  // ── Redeem Requests ──────────────────────────────────────────────────────
  // COMPLETED redeems: every step done — KYC ✅ AML ✅ Travel Rule ✅ On-chain ✅ Fiat ✅
  // ON_CHAIN_CONFIRMED: everything done except fiat receipt — shows the "Confirm Receipt" button
  // COMPLIANCE_REVIEW: frozen at AML step
  // PENDING: nothing started yet

  const baseSettlement = {
    beneficiaryBank: "NatWest",
    bankSwiftBic: "NWBKGB2L",
    accountHolderName: PLACEHOLDER_INSTITUTION.name,
    iban: "GB29NWBK60161331926819",
    expectedSettlement: "T+1",
    paymentRails: "SWIFT",
  };

  type RedeemSeed = {
    stablecoinId: string;
    amount: number;
    sourceWallet: string;
    destinationBankAccount?: string;
    status: RequestStatus;
    complianceStatus: ComplianceStatus;
    kycVerified: boolean;
    txSignature?: string;
    txError?: string;
    amlScreening: Prisma.InputJsonValue;
    travelRuleData: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    fiatSettlementStatus: FiatSettlementStatus;
    fiatReference?: string;
    fiatConfirmedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  };

  const redeemSeeds: RedeemSeed[] = [
    // ✅ COMPLETED — USX CHAPS, all 7 steps done
    {
      stablecoinId: coins.USX,
      amount: 200_000,
      sourceWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      destinationBankAccount: "GB29NWBK60161331926819",
      status: "COMPLETED",
      complianceStatus: "APPROVED",
      kycVerified: true,
      txSignature: `REDEEM_${Date.now() - 9_000_000}`,
      amlScreening: mockAml(11),
      travelRuleData: mockTravelRule({
        originatorWallet: PLACEHOLDER_INSTITUTION.walletAddress,
        beneficiaryInstitution: "NatWest",
        beneficiaryAccount: "MASKED",
        amount: 200_000,
        currency: "USD",
        network: "solana-devnet",
        timestamp: daysAgo(12).toISOString(),
        settlementDetails: {
          ...baseSettlement, transferReference: "INV-2024-00091", paymentRails: "CHAPS",
          fiatConfirmation: { confirmedAt: daysAgo(11).toISOString(), confirmedBy: "Institution Operator", bankConfirmationRef: "CHAPS-REF-00091" }
        },
      }),
      fiatSettlementStatus: "CONFIRMED",
      fiatReference: "CHAPS-REF-00091",
      fiatConfirmedAt: daysAgo(11),
      createdAt: daysAgo(12),
      updatedAt: daysAgo(11),
    },

    // ✅ COMPLETED — USDC SEPA Germany, all 7 steps done
    {
      stablecoinId: coins.USDC,
      amount: 450_000,
      sourceWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      destinationBankAccount: "DE89370400440532013000",
      status: "COMPLETED",
      complianceStatus: "APPROVED",
      kycVerified: true,
      txSignature: `REDEEM_${Date.now() - 7_200_000}`,
      amlScreening: mockAml(7),
      travelRuleData: mockTravelRule({
        originatorWallet: PLACEHOLDER_INSTITUTION.walletAddress,
        beneficiaryInstitution: "Deutsche Bank",
        beneficiaryAccount: "MASKED",
        amount: 450_000,
        currency: "USD",
        network: "solana-devnet",
        timestamp: daysAgo(8).toISOString(),
        originatorJurisdiction: "DE",
        settlementDetails: {
          ...baseSettlement, beneficiaryBank: "Deutsche Bank", bankSwiftBic: "DEUTDEDB", iban: "DE89370400440532013000", transferReference: "INV-2024-00104", paymentRails: "SEPA",
          fiatConfirmation: { confirmedAt: daysAgo(7).toISOString(), confirmedBy: "Institution Operator", bankConfirmationRef: "SEPA-REF-00104" }
        },
      }),
      fiatSettlementStatus: "CONFIRMED",
      fiatReference: "SEPA-REF-00104",
      fiatConfirmedAt: daysAgo(7),
      createdAt: daysAgo(8),
      updatedAt: daysAgo(7),
    },

    // ✅ COMPLETED — EURC SEPA France
    {
      stablecoinId: coins.EURC,
      amount: 180_000,
      sourceWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      destinationBankAccount: "FR7630006000011234567890189",
      status: "COMPLETED",
      complianceStatus: "APPROVED",
      kycVerified: true,
      txSignature: `REDEEM_${Date.now() - 3_200_000}`,
      amlScreening: mockAml(15),
      travelRuleData: mockTravelRule({
        originatorWallet: PLACEHOLDER_INSTITUTION.walletAddress,
        beneficiaryInstitution: "BNP Paribas",
        beneficiaryAccount: "MASKED",
        amount: 180_000,
        currency: "EUR",
        network: "solana-devnet",
        timestamp: daysAgo(4).toISOString(),
        originatorJurisdiction: "FR",
        settlementDetails: {
          ...baseSettlement, beneficiaryBank: "BNP Paribas", bankSwiftBic: "BNPAFRPP", iban: "FR7630006000011234567890189", transferReference: "INV-2024-00117", paymentRails: "SEPA",
          fiatConfirmation: { confirmedAt: daysAgo(3).toISOString(), confirmedBy: "Institution Operator", bankConfirmationRef: "SEPA-REF-00117" }
        },
      }),
      fiatSettlementStatus: "CONFIRMED",
      fiatReference: "SEPA-REF-00117",
      fiatConfirmedAt: daysAgo(3),
      createdAt: daysAgo(4),
      updatedAt: daysAgo(3),
    },

    // 🔶 ON_CHAIN_CONFIRMED — tokens burned, wire initiated, fiat NOT yet confirmed
    // KYC ✅  |  AML ✅  |  Travel Rule ✅  |  On-chain ✅  |  Wire initiated ✅  |  Fiat confirmed ⏳
    // This row drives the "Confirm Receipt" button in the UI
    {
      stablecoinId: coins.USX,
      amount: 900_000,
      sourceWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      destinationBankAccount: "GB29NWBK60161331926819",
      status: "ON_CHAIN_CONFIRMED",
      complianceStatus: "APPROVED",
      kycVerified: true,
      txSignature: `REDEEM_${Date.now() - 43_200_000}`,
      amlScreening: mockAml(22),
      travelRuleData: mockTravelRule({
        originatorWallet: PLACEHOLDER_INSTITUTION.walletAddress,
        beneficiaryInstitution: "NatWest",
        beneficiaryAccount: "MASKED",
        amount: 900_000,
        currency: "USD",
        network: "solana-devnet",
        timestamp: daysAgo(1).toISOString(),
        settlementDetails: { ...baseSettlement, transferReference: "INV-2024-00131", paymentRails: "SWIFT" },
      }),
      fiatSettlementStatus: "INITIATED",
      fiatReference: "INV-2024-00131",
      createdAt: daysAgo(1),
      updatedAt: daysAgo(0, 3),
    },

    // 🔴 COMPLIANCE_REVIEW — frozen at AML; on-chain burn not started
    // KYC ✅  |  AML ❌ (flagged)  |  everything else ⏳
    {
      stablecoinId: coins.EURC,
      amount: 620_000,
      sourceWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      destinationBankAccount: "SG123456789012",
      status: "COMPLIANCE_REVIEW",
      complianceStatus: "IN_REVIEW",
      kycVerified: true,
      amlScreening: mockAml(58, "FLAGGED", ["HIGH_VOLUME", "JURISDICTION_WATCH"]),
      travelRuleData: mockTravelRule({
        originatorWallet: PLACEHOLDER_INSTITUTION.walletAddress,
        beneficiaryInstitution: "DBS Bank",
        beneficiaryAccount: "MASKED",
        amount: 620_000,
        currency: "EUR",
        network: "solana-devnet",
        timestamp: daysAgo(0, 8).toISOString(),
        originatorJurisdiction: "SG",
        note: "FATF high-risk jurisdiction — manual review required",
        fatfCompliant: false,
        settlementDetails: { ...baseSettlement, beneficiaryBank: "DBS Bank", bankSwiftBic: "DBSSSGSG", iban: "SG123456789012", transferReference: "INV-2024-00144", paymentRails: "SWIFT" },
      }),
      fiatSettlementStatus: "NOT_INITIATED",
      createdAt: daysAgo(0, 8),
      updatedAt: daysAgo(0, 2),
    },
  ];

  for (const { stablecoinId, ...r } of redeemSeeds) {
    await prisma.redeemRequest.create({
      data: {
        ...r,
        destinationBankAccount: r.destinationBankAccount ?? null,
        institution: { connect: { id: institution.id } },
        stablecoin: { connect: { id: stablecoinId } },
      },
    });
  }
  console.log(`Seeded ${redeemSeeds.length} redeem requests`);

  // ── Compliance Records ───────────────────────────────────────────────────
  type ComplianceSeed = Omit<Prisma.ComplianceRecordCreateInput, "institution">;

  const complianceSeeds: ComplianceSeed[] = [
    {
      recordType: "KYC_REVIEW",
      status: "APPROVED",
      riskScore: 12,
      notes: "Full KYC package reviewed. Beneficial ownership confirmed. LEI validated via GLEIF.",
      jurisdiction: "GB",
      fatfStatus: "COMPLIANT",
      ofacScreening: "CLEAR",
      reviewedBy: "Compliance Officer — J. Morgan",
      reviewedAt: daysAgo(29),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(29),
    },
    {
      recordType: "AML_SCREENING",
      status: "APPROVED",
      riskScore: 8,
      notes: "OFAC SDN check passed. No PEP matches. Transaction monitoring threshold within normal range.",
      jurisdiction: "GB",
      fatfStatus: "COMPLIANT",
      ofacScreening: "CLEAR",
      reviewedBy: "AutoCompliance Engine v2.1",
      reviewedAt: daysAgo(14),
      createdAt: daysAgo(14),
      updatedAt: daysAgo(14),
    },
    {
      recordType: "TRAVEL_RULE",
      status: "APPROVED",
      riskScore: 5,
      notes: "Travel Rule data transmitted to counterparty VASP. Originator and beneficiary confirmed. IVMS101 payload archived.",
      jurisdiction: "GB",
      fatfStatus: "COMPLIANT",
      ofacScreening: "CLEAR",
      reviewedBy: "AutoCompliance Engine v2.1",
      reviewedAt: daysAgo(10),
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    },
    {
      recordType: "AML_SCREENING",
      status: "IN_REVIEW",
      riskScore: 62,
      notes: "Elevated risk score triggered manual review. Large volume ($4.5M) combined with SG jurisdiction watch-list flag. Escalated to compliance officer.",
      jurisdiction: "SG",
      fatfStatus: "UNDER_REVIEW",
      ofacScreening: "PENDING",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(0, 3),
    },
    {
      recordType: "AML_SCREENING",
      status: "IN_REVIEW",
      riskScore: 58,
      notes: "EURC €620k redeem flagged — SG beneficiary on jurisdiction watch list. Awaiting compliance officer sign-off.",
      jurisdiction: "SG",
      fatfStatus: "UNDER_REVIEW",
      ofacScreening: "PENDING",
      createdAt: daysAgo(0, 8),
      updatedAt: daysAgo(0, 2),
    },
    {
      recordType: "TRAVEL_RULE",
      status: "PENDING",
      riskScore: 20,
      notes: "Awaiting counterparty VASP response for $900k USX redeem. IVMS101 payload sent to NatWest VASP.",
      jurisdiction: "GB",
      fatfStatus: "PENDING",
      ofacScreening: "CLEAR",
      createdAt: daysAgo(1),
      updatedAt: daysAgo(0, 3),
    },
  ];

  for (const c of complianceSeeds) {
    await prisma.complianceRecord.create({
      data: { ...c, institution: { connect: { id: institution.id } } },
    });
  }
  console.log(`Seeded ${complianceSeeds.length} compliance records`);

  console.log("✅ Seed complete.");
}

// ── Patch utility: fixes any COMPLETED records that predate the fiatSettlementStatus column ──
export async function fixCompletedRecords() {
  const patched = await prisma.redeemRequest.updateMany({
    where: {
      status: "COMPLETED",
      fiatSettlementStatus: "NOT_INITIATED",
    },
    data: {
      fiatSettlementStatus: "CONFIRMED",
      fiatConfirmedAt: new Date(),
    },
  });
  console.log(`Patched ${patched.count} legacy COMPLETED redeem requests`);
  return patched.count;
}
