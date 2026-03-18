// Placeholder institution entity – simulates a pre-onboarded institutional user
// Replace with real auth + onboarding flow in production

export const PLACEHOLDER_INSTITUTION = {
  id: "inst_apex_capital_001",
  name: "Apex Capital LLC",
  leiCode: "254900HROIFWPRGM1V77",
  jurisdiction: "US",
  entityType: "Financial Institution",
  walletAddress: "GyQMwcby9mcvjZoxJpFuoiDQyhVTdAjdiYMX2worFi4e",
  kycStatus: "VERIFIED" as const,
  amlStatus: "CLEAR" as const,
  complianceOfficer: "Sarah Chen",
  incorporationDate: "2018-03-15",
  regulatoryLicense: "SEC-IA-28847",
  fdicInsured: false,
  fatfJurisdiction: "FATF Member",
  riskRating: "LOW",
  lastAudit: "2025-11-20",
  nextReview: "2026-11-20",
};

export type PlaceholderInstitution = typeof PLACEHOLDER_INSTITUTION;
