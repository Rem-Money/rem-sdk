use anchor_lang::prelude::*;

declare_id!("REGistrYv111111111111111111111111111111111");

/// REM Issuer Registry — on-chain network directory
///
/// Phase 1 (POC): registry is a static JSON file in packages/sdk/src/registry.ts
/// Phase 2 (production): registry moves on-chain here. Each issuer is a
/// PDA account. Governance token holders vote on admissions and removals.
#[program]
pub mod registry {
    use super::*;

    /// Add a new issuer to the network directory.
    /// In production: permissioned by governance multisig.
    pub fn add_issuer(
        _ctx: Context<AddIssuer>,
        issuer_id: String,
        _display_name: String,
        _api_endpoint: String,
        _jurisdiction_codes: Vec<String>,
    ) -> Result<()> {
        // TODO: Phase 2 implementation
        // - Create IssuerAccount PDA
        // - Store metadata, endpoint, supported jurisdictions
        // - Emit IssuerAdded event
        msg!("REM Registry: issuer added — {}", issuer_id);
        Ok(())
    }

    /// Suspend an issuer (e.g. regulatory action or missed SLA).
    pub fn suspend_issuer(
        _ctx: Context<SuspendIssuer>,
        issuer_id: String,
        reason: String,
    ) -> Result<()> {
        // TODO: Phase 2 implementation
        msg!("REM Registry: issuer suspended — {} ({})", issuer_id, reason);
        Ok(())
    }

    /// Update issuer metadata (supported chains, fiat rails, etc.)
    pub fn update_issuer(
        _ctx: Context<UpdateIssuer>,
        issuer_id: String,
        _supported_chains: Vec<u8>,
        _supported_fiat_rails: Vec<u8>,
    ) -> Result<()> {
        // TODO: Phase 2 implementation
        msg!("REM Registry: issuer updated — {}", issuer_id);
        Ok(())
    }
}

#[account]
pub struct IssuerAccount {
    pub issuer_id: String,
    pub display_name: String,
    pub api_endpoint: String,
    pub is_active: bool,
    pub supported_chains: Vec<u8>,
    pub supported_fiat_rails: Vec<u8>,
    pub jurisdiction_codes: Vec<String>,
    pub registered_at: i64,
    pub last_updated: i64,
}

#[derive(Accounts)]
pub struct AddIssuer<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SuspendIssuer<'info> {
    #[account(mut)]
    pub governance: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateIssuer<'info> {
    #[account(mut)]
    pub issuer_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
