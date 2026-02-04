# WARGAMES Risk Oracle - Anchor Program Design

**Target:** Deploy to Solana mainnet by Day 7
**Purpose:** On-chain risk verification, composability with other Solana programs

---

## Program Overview

**Name:** `wargames_oracle`
**Program ID:** TBD (will be assigned at deployment)
**Network:** Mainnet-beta (deploy to devnet first)

### What It Does

1. **Stores risk assessments on-chain** - Verifiable, immutable risk scores
2. **Commit-reveal pattern** - Prevent manipulation, prove methodology
3. **Agent reputation system** - Track accuracy of risk assessors
4. **Query fees** - Sustainable oracle economics
5. **Composable with other programs** - DeFi protocols can read risk on-chain

---

## Account Structure

### 1. OracleState (Singleton PDA)

```rust
#[account]
pub struct OracleState {
    pub authority: Pubkey,           // Admin (WARGAMES)
    pub treasury: Pubkey,             // Fee collection address
    pub assessment_count: u64,        // Total risk assessments published
    pub query_count: u64,             // Total queries processed
    pub query_fee_lamports: u64,      // Cost per query (e.g., 1000 lamports)
    pub reward_share_bps: u16,        // Assessor share of fees (e.g., 5000 = 50%)
    pub is_paused: bool,              // Emergency pause
    pub bump: u8,                     // PDA bump seed
}

// PDA seeds: [b"oracle_state"]
```

**Size:** 8 (discriminator) + 32 + 32 + 8 + 8 + 8 + 2 + 1 + 1 = **100 bytes**

---

### 2. RiskAssessment (Multiple PDAs)

```rust
#[account]
pub struct RiskAssessment {
    pub assessor: Pubkey,             // Who published this
    pub timestamp: i64,               // Unix timestamp
    pub commitment_hash: [u8; 32],    // SHA-256 of full risk data
    pub risk_score: u8,               // 0-100
    pub confidence: u8,               // 0-100 (data quality score)
    pub is_revealed: bool,            // Has full data been published?
    pub data_uri: String,             // IPFS/Arweave URI (max 128 chars)
    pub query_count: u64,             // Times this assessment was queried
    pub total_fees_earned: u64,       // Lamports earned from queries
    pub nonce: u64,                   // Multiple assessments per assessor
    pub bump: u8,                     // PDA bump seed
}

// PDA seeds: [b"assessment", assessor.key(), nonce.to_le_bytes()]
```

**Size:** 8 + 32 + 8 + 32 + 1 + 1 + 1 + (4 + 128) + 8 + 8 + 8 + 1 = **240 bytes**

---

### 3. Assessor (Multiple PDAs)

```rust
#[account]
pub struct Assessor {
    pub owner: Pubkey,                // Wallet that controls this assessor
    pub assessor_id: String,          // Human-readable name (max 32 chars)
    pub total_assessments: u64,       // Assessments published
    pub total_queries: u64,           // Times their assessments were queried
    pub total_earnings: u64,          // Lamports earned
    pub reputation_score: u32,        // Accuracy metric (basis points)
    pub is_active: bool,              // Can publish assessments?
    pub registered_at: i64,           // Unix timestamp
    pub bump: u8,                     // PDA bump seed
}

// PDA seeds: [b"assessor", owner.key()]
```

**Size:** 8 + 32 + (4 + 32) + 8 + 8 + 8 + 4 + 1 + 8 + 1 = **114 bytes**

---

## Instructions

### 1. `initialize`

Setup the oracle (one-time, called by deployer)

```rust
pub fn initialize(
    ctx: Context<Initialize>,
    query_fee_lamports: u64,
    reward_share_bps: u16,
) -> Result<()> {
    require!(reward_share_bps <= 10000, ErrorCode::InvalidRewardShare);

    let oracle_state = &mut ctx.accounts.oracle_state;
    oracle_state.authority = ctx.accounts.authority.key();
    oracle_state.treasury = ctx.accounts.treasury.key();
    oracle_state.assessment_count = 0;
    oracle_state.query_count = 0;
    oracle_state.query_fee_lamports = query_fee_lamports;
    oracle_state.reward_share_bps = reward_share_bps;
    oracle_state.is_paused = false;
    oracle_state.bump = ctx.bumps.oracle_state;

    emit!(OracleInitialized {
        authority: oracle_state.authority,
        treasury: oracle_state.treasury,
        query_fee: query_fee_lamports,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 100,
        seeds = [b"oracle_state"],
        bump
    )]
    pub oracle_state: Account<'info, OracleState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Treasury can be any valid pubkey
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
```

---

### 2. `register_assessor`

Register as a risk assessor (WARGAMES = first assessor)

```rust
pub fn register_assessor(
    ctx: Context<RegisterAssessor>,
    assessor_id: String,
) -> Result<()> {
    // Validate ID
    require!(assessor_id.len() <= 32, ErrorCode::AssessorIdTooLong);
    require!(!assessor_id.is_empty(), ErrorCode::AssessorIdEmpty);
    require!(
        assessor_id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_'),
        ErrorCode::InvalidAssessorId
    );

    let assessor = &mut ctx.accounts.assessor;
    assessor.owner = ctx.accounts.owner.key();
    assessor.assessor_id = assessor_id.clone();
    assessor.total_assessments = 0;
    assessor.total_queries = 0;
    assessor.total_earnings = 0;
    assessor.reputation_score = 10000; // Start at 100.00
    assessor.is_active = true;
    assessor.registered_at = Clock::get()?.unix_timestamp;
    assessor.bump = ctx.bumps.assessor;

    emit!(AssessorRegistered {
        owner: assessor.owner,
        assessor_id,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct RegisterAssessor<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 114,
        seeds = [b"assessor", owner.key().as_ref()],
        bump
    )]
    pub assessor: Account<'info, Assessor>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

---

### 3. `commit_assessment`

Publish risk score with commitment hash (Step 1 of commit-reveal)

```rust
pub fn commit_assessment(
    ctx: Context<CommitAssessment>,
    commitment_hash: [u8; 32],
    risk_score: u8,
    confidence: u8,
) -> Result<()> {
    // Validate inputs
    require!(risk_score <= 100, ErrorCode::InvalidRiskScore);
    require!(confidence <= 100, ErrorCode::InvalidConfidence);
    require!(!ctx.accounts.oracle_state.is_paused, ErrorCode::OraclePaused);
    require!(ctx.accounts.assessor.is_active, ErrorCode::AssessorInactive);

    let assessment = &mut ctx.accounts.assessment;
    assessment.assessor = ctx.accounts.assessor.key();
    assessment.timestamp = Clock::get()?.unix_timestamp;
    assessment.commitment_hash = commitment_hash;
    assessment.risk_score = risk_score;
    assessment.confidence = confidence;
    assessment.is_revealed = false;
    assessment.data_uri = String::new();
    assessment.query_count = 0;
    assessment.total_fees_earned = 0;
    assessment.nonce = ctx.accounts.assessor.total_assessments;
    assessment.bump = ctx.bumps.assessment;

    // Update counters
    let assessor = &mut ctx.accounts.assessor;
    assessor.total_assessments = assessor.total_assessments
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;

    let oracle_state = &mut ctx.accounts.oracle_state;
    oracle_state.assessment_count = oracle_state.assessment_count
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;

    emit!(AssessmentCommitted {
        assessor: assessment.assessor,
        timestamp: assessment.timestamp,
        risk_score,
        confidence,
        commitment_hash,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CommitAssessment<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 240,
        seeds = [
            b"assessment",
            assessor.key().as_ref(),
            assessor.total_assessments.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub assessment: Account<'info, RiskAssessment>,

    #[account(
        mut,
        seeds = [b"assessor", owner.key().as_ref()],
        bump = assessor.bump,
        constraint = assessor.is_active @ ErrorCode::AssessorInactive
    )]
    pub assessor: Account<'info, Assessor>,

    #[account(
        mut,
        seeds = [b"oracle_state"],
        bump = oracle_state.bump,
        constraint = !oracle_state.is_paused @ ErrorCode::OraclePaused
    )]
    pub oracle_state: Account<'info, OracleState>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

---

### 4. `reveal_assessment`

Publish full data URI (Step 2 of commit-reveal)

```rust
pub fn reveal_assessment(
    ctx: Context<RevealAssessment>,
    data_uri: String,
) -> Result<()> {
    // Validate URI
    require!(data_uri.len() <= 128, ErrorCode::DataUriTooLong);
    require!(!data_uri.is_empty(), ErrorCode::DataUriEmpty);
    require!(
        !ctx.accounts.assessment.is_revealed,
        ErrorCode::AlreadyRevealed
    );

    let assessment = &mut ctx.accounts.assessment;
    assessment.data_uri = data_uri.clone();
    assessment.is_revealed = true;

    emit!(AssessmentRevealed {
        assessor: assessment.assessor,
        timestamp: assessment.timestamp,
        data_uri,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct RevealAssessment<'info> {
    #[account(
        mut,
        seeds = [
            b"assessment",
            assessor.key().as_ref(),
            assessment.nonce.to_le_bytes().as_ref()
        ],
        bump = assessment.bump,
        constraint = assessment.assessor == assessor.key() @ ErrorCode::AssessorMismatch,
        constraint = !assessment.is_revealed @ ErrorCode::AlreadyRevealed
    )]
    pub assessment: Account<'info, RiskAssessment>,

    #[account(
        seeds = [b"assessor", owner.key().as_ref()],
        bump = assessor.bump
    )]
    pub assessor: Account<'info, Assessor>,

    #[account(mut)]
    pub owner: Signer<'info>,
}
```

---

### 5. `query_assessment`

Read risk data and pay fee

```rust
pub fn query_assessment(
    ctx: Context<QueryAssessment>,
) -> Result<()> {
    let oracle_state = &ctx.accounts.oracle_state;
    let fee = oracle_state.query_fee_lamports;

    // Calculate fee distribution
    let assessor_share = fee
        .checked_mul(oracle_state.reward_share_bps as u64)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::DivisionByZero)?;

    let treasury_share = fee
        .checked_sub(assessor_share)
        .ok_or(ErrorCode::Underflow)?;

    // Transfer fees
    **ctx.accounts.querier.try_borrow_mut_lamports()? -= fee;
    **ctx.accounts.assessor_owner.try_borrow_mut_lamports()? += assessor_share;
    **ctx.accounts.treasury.try_borrow_mut_lamports()? += treasury_share;

    // Update counters
    let assessment = &mut ctx.accounts.assessment;
    assessment.query_count = assessment.query_count
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;
    assessment.total_fees_earned = assessment.total_fees_earned
        .checked_add(assessor_share)
        .ok_or(ErrorCode::Overflow)?;

    let assessor = &mut ctx.accounts.assessor;
    assessor.total_queries = assessor.total_queries
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;
    assessor.total_earnings = assessor.total_earnings
        .checked_add(assessor_share)
        .ok_or(ErrorCode::Overflow)?;

    let oracle_state_mut = &mut ctx.accounts.oracle_state;
    oracle_state_mut.query_count = oracle_state_mut.query_count
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;

    emit!(AssessmentQueried {
        querier: ctx.accounts.querier.key(),
        assessment: assessment.key(),
        fee_paid: fee,
        assessor_earned: assessor_share,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct QueryAssessment<'info> {
    #[account(
        mut,
        seeds = [
            b"assessment",
            assessor.key().as_ref(),
            assessment.nonce.to_le_bytes().as_ref()
        ],
        bump = assessment.bump
    )]
    pub assessment: Account<'info, RiskAssessment>,

    #[account(
        mut,
        seeds = [b"assessor", assessor_owner.key().as_ref()],
        bump = assessor.bump
    )]
    pub assessor: Account<'info, Assessor>,

    #[account(mut)]
    pub querier: Signer<'info>,

    /// CHECK: Assessor owner receives query fees
    #[account(mut)]
    pub assessor_owner: AccountInfo<'info>,

    /// CHECK: Treasury receives platform fees
    #[account(
        mut,
        constraint = treasury.key() == oracle_state.treasury @ ErrorCode::InvalidTreasury
    )]
    pub treasury: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"oracle_state"],
        bump = oracle_state.bump
    )]
    pub oracle_state: Account<'info, OracleState>,
}
```

---

### 6. `get_latest_assessment`

View function (no fee, just reads state)

```rust
pub fn get_latest_assessment(
    ctx: Context<GetLatestAssessment>,
) -> Result<RiskAssessmentData> {
    let assessment = &ctx.accounts.assessment;

    Ok(RiskAssessmentData {
        risk_score: assessment.risk_score,
        confidence: assessment.confidence,
        timestamp: assessment.timestamp,
        is_revealed: assessment.is_revealed,
        query_count: assessment.query_count,
    })
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RiskAssessmentData {
    pub risk_score: u8,
    pub confidence: u8,
    pub timestamp: i64,
    pub is_revealed: bool,
    pub query_count: u64,
}
```

---

## Error Codes

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Assessor ID must be 1-32 characters")]
    AssessorIdTooLong,

    #[msg("Assessor ID cannot be empty")]
    AssessorIdEmpty,

    #[msg("Assessor ID contains invalid characters")]
    InvalidAssessorId,

    #[msg("Risk score must be 0-100")]
    InvalidRiskScore,

    #[msg("Confidence must be 0-100")]
    InvalidConfidence,

    #[msg("Data URI must be 1-128 characters")]
    DataUriTooLong,

    #[msg("Data URI cannot be empty")]
    DataUriEmpty,

    #[msg("Assessment already revealed")]
    AlreadyRevealed,

    #[msg("Assessor mismatch")]
    AssessorMismatch,

    #[msg("Assessor is inactive")]
    AssessorInactive,

    #[msg("Oracle is paused")]
    OraclePaused,

    #[msg("Invalid reward share (must be ≤10000)")]
    InvalidRewardShare,

    #[msg("Invalid treasury address")]
    InvalidTreasury,

    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("Arithmetic underflow")]
    Underflow,

    #[msg("Division by zero")]
    DivisionByZero,
}
```

---

## Events

```rust
#[event]
pub struct OracleInitialized {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub query_fee: u64,
}

#[event]
pub struct AssessorRegistered {
    pub owner: Pubkey,
    pub assessor_id: String,
}

#[event]
pub struct AssessmentCommitted {
    pub assessor: Pubkey,
    pub timestamp: i64,
    pub risk_score: u8,
    pub confidence: u8,
    pub commitment_hash: [u8; 32],
}

#[event]
pub struct AssessmentRevealed {
    pub assessor: Pubkey,
    pub timestamp: i64,
    pub data_uri: String,
}

#[event]
pub struct AssessmentQueried {
    pub querier: Pubkey,
    pub assessment: Pubkey,
    pub fee_paid: u64,
    pub assessor_earned: u64,
}
```

---

## Deployment Plan

### Phase 1: Devnet Testing (Days 4-5)

1. **Setup Anchor project**
   ```bash
   anchor init wargames_oracle
   cd wargames_oracle
   ```

2. **Implement program** (copy structure above)

3. **Write tests** (Mocha + TypeScript)
   - Initialize oracle
   - Register WARGAMES as assessor
   - Commit assessment
   - Reveal assessment
   - Query assessment (fee distribution)

4. **Deploy to devnet**
   ```bash
   anchor build
   anchor deploy --provider.cluster devnet
   ```

5. **Test with real transactions** on devnet

### Phase 2: Mainnet Deployment (Days 6-7)

1. **Audit checklist**
   - All tests passing
   - No `TODO` comments in code
   - Error handling comprehensive
   - Checked arithmetic everywhere
   - PDA validation constraints

2. **Deploy to mainnet**
   ```bash
   anchor build --verifiable
   anchor deploy --provider.cluster mainnet
   ```

3. **Fund treasury** with ~0.1 SOL

4. **Register WARGAMES as first assessor**

5. **Publish first on-chain risk assessment**

### Phase 3: Integration (Days 8-10)

1. **Update WARGAMES API** to publish to oracle
2. **Create TypeScript SDK** for easy integration
3. **Document in SKILLS.md**
4. **Forum announcement** with mainnet program ID

---

## TypeScript SDK Example

```typescript
import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { WarGamesOracle } from '../target/types/wargames_oracle';

class WarGamesOracleClient {
  constructor(
    public program: Program<WarGamesOracle>,
    public provider: anchor.AnchorProvider
  ) {}

  async commitAssessment(
    riskScore: number,
    confidence: number,
    fullDataJson: object
  ) {
    // Hash full data
    const dataStr = JSON.stringify(fullDataJson);
    const hash = crypto.createHash('sha256').update(dataStr).digest();

    // Derive PDAs
    const [assessorPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('assessor'), this.provider.wallet.publicKey.toBuffer()],
      this.program.programId
    );

    const assessor = await this.program.account.assessor.fetch(assessorPda);
    const [assessmentPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('assessment'),
        assessorPda.toBuffer(),
        new anchor.BN(assessor.totalAssessments).toArrayLike(Buffer, 'le', 8)
      ],
      this.program.programId
    );

    // Commit
    await this.program.methods
      .commitAssessment(Array.from(hash), riskScore, confidence)
      .accounts({
        assessment: assessmentPda,
        assessor: assessorPda,
        oracleState: this.getOracleStatePda(),
        owner: this.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return { assessmentPda, hash: hash.toString('hex') };
  }

  async revealAssessment(
    assessmentPda: anchor.web3.PublicKey,
    dataUri: string // IPFS/Arweave URI
  ) {
    const [assessorPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('assessor'), this.provider.wallet.publicKey.toBuffer()],
      this.program.programId
    );

    await this.program.methods
      .revealAssessment(dataUri)
      .accounts({
        assessment: assessmentPda,
        assessor: assessorPda,
        owner: this.provider.wallet.publicKey,
      })
      .rpc();
  }

  async queryAssessment(assessmentPda: anchor.web3.PublicKey) {
    const assessment = await this.program.account.riskAssessment.fetch(assessmentPda);
    const assessor = await this.program.account.assessor.fetch(assessment.assessor);

    const [oracleStatePda] = this.getOracleStatePda();
    const oracleState = await this.program.account.oracleState.fetch(oracleStatePda);

    const tx = await this.program.methods
      .queryAssessment()
      .accounts({
        assessment: assessmentPda,
        assessor: assessment.assessor,
        querier: this.provider.wallet.publicKey,
        assessorOwner: assessor.owner,
        treasury: oracleState.treasury,
        oracleState: oracleStatePda,
      })
      .rpc();

    return {
      riskScore: assessment.riskScore,
      confidence: assessment.confidence,
      timestamp: assessment.timestamp,
      isRevealed: assessment.isRevealed,
      dataUri: assessment.dataUri,
      tx,
    };
  }

  getOracleStatePda() {
    return anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('oracle_state')],
      this.program.programId
    );
  }
}
```

---

## Integration with WARGAMES API

```typescript
// Add to src/services/solanaOracle.ts

import { WarGamesOracleClient } from './oracleClient';
import crypto from 'crypto';

export async function publishRiskToSolana(riskData: {
  score: number;
  components: any;
  drivers: string[];
  timestamp: string;
}) {
  const oracleClient = new WarGamesOracleClient(program, provider);

  // Calculate confidence based on data freshness
  const confidence = calculateConfidence(riskData);

  // Commit assessment on-chain
  const { assessmentPda, hash } = await oracleClient.commitAssessment(
    riskData.score,
    confidence,
    riskData
  );

  // Upload full data to IPFS
  const dataUri = await uploadToIPFS(JSON.stringify(riskData));

  // Reveal after confirmation window (e.g., 10 seconds)
  setTimeout(async () => {
    await oracleClient.revealAssessment(assessmentPda, dataUri);
  }, 10000);

  return {
    assessmentPda: assessmentPda.toString(),
    commitmentHash: hash,
    dataUri,
  };
}
```

---

## Cost Analysis

### Deployment Costs

- **Program deployment:** ~2-3 SOL (one-time)
- **Oracle state initialization:** ~0.002 SOL (one-time)
- **Assessor registration:** ~0.002 SOL per assessor
- **Assessment commitment:** ~0.003 SOL per assessment
- **Assessment reveal:** ~0.001 SOL per reveal

### Operational Costs (per day)

- **Risk assessments:** 288/day (every 5 min) × 0.004 SOL = **1.152 SOL/day** (~$110/day at $95/SOL)
- **IPFS storage:** ~$0 (use free pinning service initially)

### Revenue Model

- **Query fees:** 1000 lamports (0.000001 SOL, ~$0.0001) per query
- **Target:** 1000 queries/day = **1 SOL/day revenue** (~$95/day)
- **Break-even:** ~1000 queries/day
- **Profit:** At 10k queries/day = 10 SOL revenue - 1.152 SOL cost = **8.85 SOL profit/day** (~$840/day)

---

## Comparison to Top Projects

| Feature | SOLPRISM | AgentTrace | WARGAMES Oracle |
|---------|----------|------------|-----------------|
| On-chain program | ✅ Mainnet | ✅ Mainnet | 🟡 Devnet (Day 7) |
| Commit-reveal | ✅ | ❌ | ✅ |
| Query fees | ❌ | ✅ | ✅ |
| Reputation system | ✅ | ❌ | ✅ |
| Data verification | ✅ | ✅ | ✅ |
| Multi-assessor | ❌ | ✅ | ✅ |
| Emergency controls | ❌ | ✅ | ✅ |

**Our advantage:** Combines best of both (commit-reveal + query fees + multi-assessor)

---

## Next Steps

**Tomorrow (Day 3):**
1. Initialize Anchor project
2. Implement core instructions
3. Write basic tests

**Days 4-5:**
4. Full test coverage
5. Deploy to devnet
6. Test with real transactions

**Days 6-7:**
7. Security audit
8. Deploy to mainnet
9. Register WARGAMES as first assessor
10. Publish first on-chain risk assessment

**Days 8-10:**
11. TypeScript SDK
12. Update API to publish on-chain
13. Forum announcement
14. Documentation

---

## Success Criteria

- ✅ Program deployed to mainnet
- ✅ First risk assessment published on-chain
- ✅ At least 1 external query (proof of composability)
- ✅ TypeScript SDK available
- ✅ Integration documented in SKILLS.md
- ✅ Forum post with program ID

**This makes WARGAMES a true Solana-native infrastructure project.**
