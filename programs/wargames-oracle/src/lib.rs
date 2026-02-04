use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

declare_id!("BHaMToMhQwM1iwMms3fTCtZreayTq2NVNQSuDpM85chH"); // Placeholder, will be updated after deployment

#[program]
pub mod wargames_oracle {
    use super::*;

    /// Initialize the oracle state
    /// Only called once to set up the global state
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let oracle_state = &mut ctx.accounts.oracle_state;
        oracle_state.authority = ctx.accounts.authority.key();
        oracle_state.assessment_count = 0;
        oracle_state.last_update = Clock::get()?.unix_timestamp;
        oracle_state.current_score = 50; // Start at neutral
        oracle_state.current_bias = RiskBias::Neutral;
        oracle_state.bump = ctx.bumps.oracle_state;

        msg!("Oracle initialized by authority: {}", oracle_state.authority);
        Ok(())
    }

    /// Register a new assessor (WARGAMES API wallet)
    /// Only the authority can register assessors
    pub fn register_assessor(ctx: Context<RegisterAssessor>) -> Result<()> {
        let assessor = &mut ctx.accounts.assessor;
        let clock = Clock::get()?;

        assessor.pubkey = ctx.accounts.assessor_pubkey.key();
        assessor.total_assessments = 0;
        assessor.registered_at = clock.unix_timestamp;
        assessor.active = true;
        assessor.bump = ctx.bumps.assessor;

        emit!(AssessorRegistered {
            assessor: assessor.pubkey,
            timestamp: clock.unix_timestamp,
        });

        msg!("Assessor registered: {}", assessor.pubkey);
        Ok(())
    }

    /// Commit a risk assessment hash
    /// Implements commit-reveal pattern to prevent front-running
    pub fn commit_assessment(
        ctx: Context<CommitAssessment>,
        commitment_hash: [u8; 32],
    ) -> Result<()> {
        let assessment = &mut ctx.accounts.assessment;
        let oracle_state = &mut ctx.accounts.oracle_state;
        let clock = Clock::get()?;

        // Verify assessor is active
        require!(ctx.accounts.assessor.active, ErrorCode::AssessorInactive);

        assessment.assessor = ctx.accounts.assessor.pubkey;
        assessment.timestamp = clock.unix_timestamp;
        assessment.score = 0; // Will be set in reveal
        assessment.bias = RiskBias::Neutral; // Will be set in reveal
        assessment.commitment_hash = commitment_hash;
        assessment.revealed = false;
        assessment.bump = ctx.bumps.assessment;

        // Increment oracle state assessment count
        oracle_state.assessment_count = oracle_state
            .assessment_count
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;

        msg!("Assessment committed: #{}", oracle_state.assessment_count);
        Ok(())
    }

    /// Reveal a committed risk assessment
    /// Verifies the commitment and updates oracle state
    pub fn reveal_assessment(
        ctx: Context<RevealAssessment>,
        score: u8,
        bias: RiskBias,
        salt: String,
    ) -> Result<()> {
        let assessment = &mut ctx.accounts.assessment;
        let oracle_state = &mut ctx.accounts.oracle_state;
        let clock = Clock::get()?;

        // Verify not already revealed
        require!(!assessment.revealed, ErrorCode::AlreadyRevealed);

        // Verify score is in valid range
        require!(score <= 100, ErrorCode::InvalidScore);

        // Verify commitment matches
        let data = format!("{}{:?}{}", score, bias, salt);
        let computed_hash = hash(data.as_bytes());
        require!(
            computed_hash.to_bytes() == assessment.commitment_hash,
            ErrorCode::InvalidCommitment
        );

        // Update assessment
        assessment.score = score;
        assessment.bias = bias;
        assessment.revealed = true;

        // Update oracle state with new values
        oracle_state.current_score = score;
        oracle_state.current_bias = bias;
        oracle_state.last_update = clock.unix_timestamp;

        // Update assessor stats
        let assessor = &mut ctx.accounts.assessor;
        assessor.total_assessments = assessor
            .total_assessments
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;

        emit!(RiskUpdated {
            assessment_id: oracle_state.assessment_count,
            score,
            bias,
            timestamp: clock.unix_timestamp,
            assessor: assessment.assessor,
        });

        msg!(
            "Assessment revealed: score={}, bias={:?}",
            score,
            bias
        );
        Ok(())
    }

    /// Query a specific assessment by ID
    pub fn query_assessment(ctx: Context<QueryAssessment>) -> Result<()> {
        let assessment = &ctx.accounts.assessment;

        msg!("Assessment: assessor={}, score={}, bias={:?}, timestamp={}, revealed={}",
            assessment.assessor,
            assessment.score,
            assessment.bias,
            assessment.timestamp,
            assessment.revealed
        );

        Ok(())
    }

    /// Get the latest oracle state
    pub fn get_latest(ctx: Context<GetLatest>) -> Result<()> {
        let oracle_state = &ctx.accounts.oracle_state;

        msg!("Latest: score={}, bias={:?}, count={}, last_update={}",
            oracle_state.current_score,
            oracle_state.current_bias,
            oracle_state.assessment_count,
            oracle_state.last_update
        );

        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

#[account]
pub struct OracleState {
    pub authority: Pubkey,           // Admin who can register assessors
    pub assessment_count: u64,       // Total number of assessments
    pub last_update: i64,            // Unix timestamp of last update
    pub current_score: u8,           // Latest risk score (0-100)
    pub current_bias: RiskBias,      // Latest risk bias
    pub bump: u8,                    // PDA bump seed
}

impl OracleState {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        8 +  // assessment_count
        8 +  // last_update
        1 +  // current_score
        1 +  // current_bias
        1;   // bump
}

#[account]
pub struct RiskAssessment {
    pub assessor: Pubkey,            // Who submitted this assessment
    pub timestamp: i64,              // When it was submitted
    pub score: u8,                   // Risk score (0-100)
    pub bias: RiskBias,              // Risk bias enum
    pub commitment_hash: [u8; 32],   // Hash of assessment + salt
    pub revealed: bool,              // Has been revealed
    pub bump: u8,                    // PDA bump seed
}

impl RiskAssessment {
    pub const LEN: usize = 8 + // discriminator
        32 + // assessor
        8 +  // timestamp
        1 +  // score
        1 +  // bias
        32 + // commitment_hash
        1 +  // revealed
        1;   // bump
}

#[account]
pub struct Assessor {
    pub pubkey: Pubkey,              // Assessor's public key
    pub total_assessments: u64,      // Number of assessments submitted
    pub registered_at: i64,          // Registration timestamp
    pub active: bool,                // Can submit assessments
    pub bump: u8,                    // PDA bump seed
}

impl Assessor {
    pub const LEN: usize = 8 + // discriminator
        32 + // pubkey
        8 +  // total_assessments
        8 +  // registered_at
        1 +  // active
        1;   // bump
}

// ============================================================================
// Enums
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RiskBias {
    RiskOn,    // Low risk, bullish conditions
    Neutral,   // Moderate risk
    RiskOff,   // High risk, bearish conditions
}

// ============================================================================
// Context Structs
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = OracleState::LEN,
        seeds = [b"oracle_state"],
        bump
    )]
    pub oracle_state: Account<'info, OracleState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterAssessor<'info> {
    #[account(
        seeds = [b"oracle_state"],
        bump = oracle_state.bump,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub oracle_state: Account<'info, OracleState>,

    #[account(
        init,
        payer = authority,
        space = Assessor::LEN,
        seeds = [b"assessor", assessor_pubkey.key().as_ref()],
        bump
    )]
    pub assessor: Account<'info, Assessor>,

    /// The public key that will be registered as an assessor
    /// CHECK: This is just a public key we're registering
    pub assessor_pubkey: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CommitAssessment<'info> {
    #[account(
        mut,
        seeds = [b"oracle_state"],
        bump = oracle_state.bump
    )]
    pub oracle_state: Account<'info, OracleState>,

    #[account(
        seeds = [b"assessor", assessor_signer.key().as_ref()],
        bump = assessor.bump
    )]
    pub assessor: Account<'info, Assessor>,

    #[account(
        init,
        payer = assessor_signer,
        space = RiskAssessment::LEN,
        seeds = [b"assessment", oracle_state.assessment_count.to_le_bytes().as_ref()],
        bump
    )]
    pub assessment: Account<'info, RiskAssessment>,

    #[account(mut)]
    pub assessor_signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevealAssessment<'info> {
    #[account(
        mut,
        seeds = [b"oracle_state"],
        bump = oracle_state.bump
    )]
    pub oracle_state: Account<'info, OracleState>,

    #[account(
        mut,
        seeds = [b"assessor", assessor_signer.key().as_ref()],
        bump = assessor.bump
    )]
    pub assessor: Account<'info, Assessor>,

    #[account(
        mut,
        seeds = [b"assessment", (oracle_state.assessment_count - 1).to_le_bytes().as_ref()],
        bump = assessment.bump,
        has_one = assessor @ ErrorCode::Unauthorized
    )]
    pub assessment: Account<'info, RiskAssessment>,

    pub assessor_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct QueryAssessment<'info> {
    #[account(
        seeds = [b"assessment", assessment_id.to_le_bytes().as_ref()],
        bump = assessment.bump
    )]
    pub assessment: Account<'info, RiskAssessment>,
}

#[derive(Accounts)]
pub struct GetLatest<'info> {
    #[account(
        seeds = [b"oracle_state"],
        bump = oracle_state.bump
    )]
    pub oracle_state: Account<'info, OracleState>,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct RiskUpdated {
    pub assessment_id: u64,
    pub score: u8,
    pub bias: RiskBias,
    pub timestamp: i64,
    pub assessor: Pubkey,
}

#[event]
pub struct AssessorRegistered {
    pub assessor: Pubkey,
    pub timestamp: i64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized: Only authority can perform this action")]
    Unauthorized,

    #[msg("Assessor is not active")]
    AssessorInactive,

    #[msg("Assessment already revealed")]
    AlreadyRevealed,

    #[msg("Invalid score: must be 0-100")]
    InvalidScore,

    #[msg("Invalid commitment: hash does not match")]
    InvalidCommitment,

    #[msg("Arithmetic overflow")]
    Overflow,
}
