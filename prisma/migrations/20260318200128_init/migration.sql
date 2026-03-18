-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AmlStatus" AS ENUM ('PENDING', 'CLEAR', 'FLAGGED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'COMPLIANCE_REVIEW', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_INFO');

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leiCode" TEXT,
    "jurisdiction" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "walletAddress" TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'VERIFIED',
    "amlStatus" "AmlStatus" NOT NULL DEFAULT 'CLEAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StablecoinMint" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 6,
    "network" TEXT NOT NULL DEFAULT 'devnet',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StablecoinMint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MintRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "stablecoinMintId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "destinationWallet" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "txSignature" TEXT,
    "txError" TEXT,
    "complianceStatus" "ComplianceStatus" NOT NULL DEFAULT 'PENDING',
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "travelRuleData" JSONB,
    "amlScreening" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MintRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedeemRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "stablecoinMintId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "sourceWallet" TEXT NOT NULL,
    "destinationBankAccount" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "txSignature" TEXT,
    "txError" TEXT,
    "complianceStatus" "ComplianceStatus" NOT NULL DEFAULT 'PENDING',
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "travelRuleData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedeemRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRecord" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "mintRequestId" TEXT,
    "recordType" TEXT NOT NULL,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'PENDING',
    "riskScore" INTEGER,
    "jurisdiction" TEXT,
    "travelRuleData" JSONB,
    "kycData" JSONB,
    "amlData" JSONB,
    "fatfStatus" TEXT,
    "ofacScreening" TEXT,
    "notes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_leiCode_key" ON "Institution"("leiCode");

-- CreateIndex
CREATE UNIQUE INDEX "StablecoinMint_symbol_key" ON "StablecoinMint"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "StablecoinMint_mintAddress_key" ON "StablecoinMint"("mintAddress");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRecord_mintRequestId_key" ON "ComplianceRecord"("mintRequestId");

-- AddForeignKey
ALTER TABLE "MintRequest" ADD CONSTRAINT "MintRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MintRequest" ADD CONSTRAINT "MintRequest_stablecoinMintId_fkey" FOREIGN KEY ("stablecoinMintId") REFERENCES "StablecoinMint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeemRequest" ADD CONSTRAINT "RedeemRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeemRequest" ADD CONSTRAINT "RedeemRequest_stablecoinMintId_fkey" FOREIGN KEY ("stablecoinMintId") REFERENCES "StablecoinMint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_mintRequestId_fkey" FOREIGN KEY ("mintRequestId") REFERENCES "MintRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
