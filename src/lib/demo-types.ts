import type { PlaceholderInstitution } from "@/lib/placeholder-entity";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export interface AmlScreening extends JsonObject {
  screeningId?: string;
  result?: string;
  riskScore?: number;
  checks?: string[];
  checksPassed?: number;
  timestamp?: string;
  flags?: string[];
}

export interface KycData extends JsonObject {
  status?: string;
  verifiedAt?: string;
  provider?: string;
  documentType?: string;
}

export interface TravelRuleData extends JsonObject {
  originatorName?: string;
  originatorLEI?: string;
  originatorJurisdiction?: string;
  originatorWallet?: string;
  beneficiaryWallet?: string;
  beneficiaryInstitution?: string;
  beneficiaryAccount?: string | null;
  amount?: number;
  currency?: string;
  network?: string;
  timestamp?: string;
  fatfCompliant?: boolean;
  vasp?: string;
  vaspId?: string;
  note?: string;
  reference?: string;
  bankTransferDetails?: JsonObject;
  settlementDetails?: JsonObject;
  fiatConfirmation?: JsonObject;
}

export interface StablecoinRecord {
  id: string;
  symbol: string;
  name: string;
  mintAddress: string;
  decimals: number;
  network?: string;
  active?: boolean;
  createdAt?: string;
  totalMinted?: number;
  totalRedeemed?: number;
  netCirculating?: number;
}

export interface ComplianceMintRequestSummary {
  id: string;
  amount: number;
  status: string;
  stablecoin: { symbol: string };
}

export interface ComplianceRecordRecord {
  id: string;
  recordType: string;
  status: string;
  riskScore?: number;
  jurisdiction?: string;
  travelRuleData?: TravelRuleData;
  kycData?: KycData;
  amlData?: AmlScreening;
  fatfStatus?: string;
  ofacScreening?: string;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  mintRequest?: ComplianceMintRequestSummary;
}

export interface MintRequestRecord {
  id: string;
  amount: number;
  destinationWallet: string;
  status: string;
  complianceStatus: string;
  txSignature?: string;
  txError?: string;
  kycVerified: boolean;
  travelRuleData?: TravelRuleData;
  amlScreening?: AmlScreening;
  createdAt: string;
  updatedAt: string;
  stablecoin: StablecoinRecord;
  complianceRecord?: {
    id: string;
    status: string;
    riskScore?: number;
  };
}

export interface RedeemRequestRecord {
  id: string;
  amount: number;
  sourceWallet: string;
  destinationBankAccount?: string;
  status: string;
  complianceStatus: string;
  txSignature?: string;
  txError?: string;
  kycVerified: boolean;
  travelRuleData?: TravelRuleData;
  amlScreening?: AmlScreening;
  fiatSettlementStatus: string;
  fiatReference?: string;
  fiatConfirmedAt?: string;
  createdAt: string;
  updatedAt?: string;
  stablecoin: {
    symbol: string;
    name: string;
  };
}

export interface DashboardData {
  stats: {
    totalMinted: number;
    totalRedeemed: number;
    pendingCompliance: number;
    activeStablecoins: number;
  };
  recentMintRequests: MintRequestRecord[];
  recentRedeemRequests: RedeemRequestRecord[];
  stablecoins: StablecoinRecord[];
}

export interface ComplianceResponse {
  records: ComplianceRecordRecord[];
  institution?: PlaceholderInstitution | null;
}

export interface MintSubmissionResponse {
  success: boolean;
  mintRequest?: MintRequestRecord;
  nextStep?: string;
  message?: string;
  txSignature?: string;
  note?: string;
}

export interface RedeemSubmissionResponse {
  success: boolean;
  blocked?: boolean;
  blockedAt?: string;
  redeemRequest?: RedeemRequestRecord;
  txSignature?: string;
  nextStep?: string;
  message?: string;
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toJsonObject(value: unknown): JsonObject | undefined {
  return isJsonObject(value) ? value : undefined;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unexpected error";
}
