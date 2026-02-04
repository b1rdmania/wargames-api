# WARGAMES Solana Integration Research - Day 2 Evening

**Research Date:** 2026-02-04
**Goal:** Make WARGAMES more "Solana core" - not just data APIs

---

## Current State (Data Layer Only)

**What We Have:**
- ✅ Pyth Network on-chain price feeds (READ)
- ✅ DefiLlama Solana TVL tracking (READ)
- ✅ Solana RPC network metrics (READ)
- ✅ REST API aggregating data
- ✅ Real-time data from Solana sources

**What We're Missing:**
- ❌ No on-chain program (not deployed to Solana)
- ❌ No WRITE operations (only read data)
- ❌ No transactions or swaps
- ❌ No x402 payment integration
- ❌ No AgentWallet integration
- ❌ Not leveraging Solana's execution layer

**Grade:** Data aggregation = A, Solana-native = C

---

## Top Projects Analysis - What Winners Are Doing

### Pattern 1: On-Chain Programs (Anchor)

**SOLPRISM (#4 - 71 human votes, 16 agent votes):**
```
Deployed Anchor program to MAINNET
Program ID: CZcvoryaQNrtZ3qb3gC1h9opcYpzEP1D9Mu1RVwFQeBu
Commits AI reasoning proofs on-chain
300+ traces committed by agents
```

**Makora (#5 - 39 human, 22 agent):**
```
3 Anchor programs deployed:
- Vault program
- Strategy registry
- ZK shielded pool (Groth16/Circom)
Full DeFi agent with on-chain state
```

**AgentTrace (#7 - 36 human, 16 agent):**
```
MAINNET deployed Anchor program
Program ID: DY7oL6kjgLihMXeHypHQHAXxBLxFBVvd4bwkUwb7upyF
Records agent traces + outcomes on-chain
TypeScript SDK with 136 tests
```

**SAID Protocol (#8 - 30 human, 22 agent):**
```
Identity verification program on mainnet
Program ID: 5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G
0.01 SOL for verified status
Trust tier scoring on-chain
```

**KEY INSIGHT:** Top projects deploy REAL Solana programs, not just APIs.

---

### Pattern 2: Real Transactions (Jupiter, Marinade, etc)

**Makora (#5):**
```
- Jupiter V6 swaps (20+ DEX routes)
- Marinade liquid staking
- Real portfolio management
- Circuit breakers for risk
```

**SIDEX (#2 - 203 human, 2 agent):**
```
Crypto futures platform on Solana
Real perpetuals trading
Powered by local Llama 3 model
```

**SuperRouter (#3 - 155 human, 9 agent):**
```
Memecoin routing on Solana
Executes autonomous trades
Position management
On-chain behavioral signals
```

**KEY INSIGHT:** They're not just reading data - they're EXECUTING on Solana.

---

### Pattern 3: x402 Payment Integration

**Clodds (#1 - 280 human, 22 agent):**
```
"Compute API where agents pay USDC for LLM,
code execution, web scraping, and trade execution"
```

**SAID Protocol (#8):**
```
x402 payment integration
Identity + payments in one lookup
0.01 SOL for verified badges
```

**KEY INSIGHT:** Premium features = pay in USDC via x402 protocol.

---

## AgentWallet / MCPay Capabilities

**What AgentWallet Enables:**

1. **x402 Payments** - Agents pay USDC for API calls
   - One-step proxy: `/x402/fetch` handles everything
   - Policy-controlled spending limits
   - Both Solana + EVM chains supported

2. **Solana Transactions** - Agents can execute on-chain
   ```bash
   POST /wallets/{username}/actions/transfer-solana
   {
     "to": "RECIPIENT_ADDRESS",
     "amount": "1000000000",  # 1 SOL
     "asset": "sol",
     "network": "mainnet"
   }
   ```

3. **Policy Guardrails** - Prevent rogue agents
   ```json
   {
     "max_per_tx_usd": "25",
     "allow_chains": ["solana"],
     "allow_contracts": ["PROGRAM_ID"]
   }
   ```

4. **Devnet Testing** - Experiment safely before mainnet

**Official Integration:** AgentWallet is the official wallet provider for Colosseum hackathon.

---

## How to Make WARGAMES "Solana Core"

### Option 1: Deploy Risk Oracle as Anchor Program ⭐ HIGH IMPACT

**What:**
- Anchor program that stores risk scores on-chain
- Agents query on-chain instead of REST API
- Cryptographically verifiable risk data
- Timestamped, immutable risk history

**Implementation:**
```rust
// Anchor program pseudocode
pub struct RiskScore {
    pub timestamp: i64,
    pub score: u8,           // 0-100
    pub bias: RiskBias,      // RiskOn/Neutral/RiskOff
    pub data_sources: [u8; 8], // Pyth, DefiLlama, etc
    pub signature: [u8; 64], // Oracle signature
}

#[program]
pub mod wargames_oracle {
    pub fn update_risk_score(ctx: Context<UpdateRisk>, score: RiskScore) -> Result<()> {
        // Verify oracle authority
        // Store on-chain
        // Emit event
    }

    pub fn get_latest_risk() -> RiskScore {
        // Return current risk
    }
}
```

**Value Prop:**
- On-chain verification (not just trust our API)
- Composable with other Solana programs
- Agents can trigger logic based on on-chain risk
- Historical risk data queryable on-chain

**Effort:** HIGH (learn Anchor, deploy, test)
**Impact:** VERY HIGH (becomes Solana-native infrastructure)

---

### Option 2: x402 Premium Endpoints 💰 MONETIZATION

**What:**
- Keep basic endpoints free
- Premium endpoints require USDC payment via x402
- AgentWallet integration for payments

**Premium Features:**
```
FREE:
- /live/risk (basic risk score)
- /narratives (8 narratives)
- /live/pyth (10 tokens)

PAID (via x402):
- /premium/risk-detailed (full breakdown + recommendations)
- /premium/alerts (webhook notifications)
- /premium/historical (backtesting data)
- /premium/custom-portfolio (personalized risk for specific holdings)
```

**Pricing:**
```
$0.01 USDC per call - basic premium
$0.05 USDC per call - historical data
$0.10 USDC per call - custom risk analysis
```

**Implementation:**
```typescript
// Add x402 middleware
app.get('/premium/risk-detailed', async (req, res) => {
  const paymentHeader = req.headers['payment-signature'];

  if (!paymentHeader) {
    return res.status(402).json({
      x402Version: 2,
      accepts: [{
        scheme: "exact",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        amount: "10000", // 0.01 USDC
        asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        payTo: "OUR_SOLANA_ADDRESS"
      }]
    });
  }

  // Verify payment, return premium data
});
```

**Value Prop:**
- Sustainable business model
- Incentivizes integrations (free tier to onboard, paid to scale)
- Demonstrates x402 protocol usage

**Effort:** MEDIUM (add payment verification)
**Impact:** MEDIUM (monetization + x402 showcase)

---

### Option 3: Risk-Triggered Transactions 🤖 AUTONOMOUS EXECUTION

**What:**
- Agents give WARGAMES permission to act on their behalf
- When risk spikes, automatically reduce positions via Jupiter
- When risk drops, automatically increase exposure

**Implementation:**
```typescript
// Agent registers risk-triggered action
POST /autonomous/register
{
  "agentWallet": "AGENT_SOLANA_ADDRESS",
  "trigger": {
    "condition": "risk > 80",
    "action": "reduce_exposure",
    "params": {
      "protocol": "jupiter",
      "reduce_by": 0.5,  // 50% reduction
      "asset": "SOL"
    }
  },
  "authorization": "SIGNED_PERMISSION"
}

// WARGAMES monitors risk score
// When risk > 80:
//   1. Call AgentWallet API to execute swap
//   2. Agent's policy controls limits
//   3. Transaction executed on Solana
//   4. Agent notified
```

**Value Prop:**
- Agents sleep while WARGAMES watches
- Real autonomous risk management
- Showcases AgentWallet + WARGAMES integration
- Actual value delivery (not just data)

**Effort:** HIGH (requires agent permissions, testing)
**Impact:** VERY HIGH (unique killer feature)

---

### Option 4: On-Chain Risk Verification (SOLPRISM-style) 🔐 TRANSPARENCY

**What:**
- Commit risk calculation methodology on-chain
- Reveal after execution
- Provable that risk scores weren't manipulated

**Implementation:**
```typescript
// Step 1: Commit hash of risk calculation
const riskData = {
  timestamp: Date.now(),
  score: 46,
  components: { sentiment: 42, geopolitical: 51, ... },
  dataSources: { fearGreed: 58, polymarket: [0.13, 0.22], ... }
};

const hash = sha256(JSON.stringify(riskData));

// Store commitment on Solana
await commitRiskHash(hash, timestamp);

// Step 2: Publish risk score (API returns)
return { score: 46, bias: "neutral", commitment: hash };

// Step 3: Later, reveal full data
await revealRiskData(hash, riskData);

// Step 4: Anyone can verify
const verified = verifyRiskCommitment(hash, riskData);
```

**Value Prop:**
- Trustless verification (like SOLPRISM)
- Can't manipulate scores retroactively
- Builds confidence in our data

**Effort:** MEDIUM (use existing Solana programs or deploy simple commitment contract)
**Impact:** MEDIUM (transparency credibility boost)

---

### Option 5: DeFi Protocol Actions (Not Just Data) 🏦 DEEP INTEGRATION

**What:**
- Not just "here's Kamino's TVL"
- Actually deposit/withdraw based on risk

**Implementation:**
```typescript
// Risk-aware DeFi allocation
POST /defi/allocate
{
  "portfolio": [
    { "protocol": "kamino", "allocation_pct": 0.4 },
    { "protocol": "marginfi", "allocation_pct": 0.3 },
    { "protocol": "drift", "allocation_pct": 0.3 }
  ],
  "total_amount": "1000 USDC",
  "agent_wallet": "ADDRESS"
}

// WARGAMES:
// 1. Check current risk score
// 2. Adjust allocations (if risk > 70, reduce to safer protocols)
// 3. Execute deposits via AgentWallet to Kamino/MarginFi/Drift
// 4. Return execution receipts
```

**Protocols to Integrate:**
- Kamino (lending)
- MarginFi (lending)
- Drift (perps)
- Jupiter (swaps - already mentioned by top projects)
- Marinade (liquid staking - mentioned by Makora)

**Value Prop:**
- Full-stack solution (data + execution)
- Agents don't need to integrate 5 protocols
- Risk-adjusted execution built-in

**Effort:** VERY HIGH (integrate 5+ protocol SDKs)
**Impact:** VERY HIGH (becomes critical infrastructure)

---

## Recommended Day 3 Priorities

**🔥 SHIP TOMORROW (Day 3):**

1. **AgentWallet Integration** (2-4 hours)
   - Add `/subscribe-wallet` endpoint
   - Store agent wallet addresses
   - Test x402 payment flow with one premium endpoint
   - Update SKILLS.md with AgentWallet examples

2. **Premium x402 Endpoint** (2-3 hours)
   - `/premium/risk-detailed` - Full component breakdown
   - Charge 0.01 USDC (10000 in smallest unit)
   - Implement payment verification
   - Document in API_REFERENCE.md

3. **Update Project Description** (30 min)
   - Mention x402 payment support
   - Mention AgentWallet integration
   - Keep generic/evergreen

4. **SUBMIT Project** (5 min)
   - Lock in description with:
     - "3+ Solana protocol integrations"
     - "x402 payment support for premium features"
     - "AgentWallet compatible"
   - Keep building after submission

**🚀 SHIP THIS WEEK (Days 4-7):**

5. **Simple Anchor Program** (1-2 days)
   - Risk oracle that stores latest score on-chain
   - Agents can query via Solana RPC
   - Deploy to devnet first, then mainnet
   - Huge credibility boost

6. **Risk-Triggered Actions** (1-2 days)
   - Agents register triggers
   - WARGAMES executes via AgentWallet when conditions met
   - Start with simple Jupiter swap example

7. **DeFi Protocol Integration** (2-3 days)
   - Pick ONE protocol (Kamino or Jupiter)
   - Risk-aware allocation/swapping
   - Full working example

**💎 MOONSHOT (Days 8-12):**

8. **On-Chain Verification (SOLPRISM-style)**
   - Commit-reveal risk calculations
   - Transparency + trust

9. **Multi-Protocol Risk Router**
   - One endpoint, agents get risk-optimized DeFi exposure
   - Integrates Kamino + MarginFi + Drift + Jupiter

---

## Key Technical Resources

**AgentWallet Docs:**
- https://agentwallet.mcpay.tech/skill.md
- x402 one-step proxy: `/x402/fetch`
- Solana transfers: `/actions/transfer-solana`
- Policy controls: `/policy`

**Solana Development:**
- Anchor framework: https://www.anchor-lang.com/
- Solana cookbook: https://solanacookbook.com/
- Pyth SDK: Already using
- Jupiter SDK: https://docs.jup.ag/
- Kamino SDK: https://docs.kamino.finance/

**x402 Protocol:**
- Spec: Check AgentWallet skill.md
- Example providers: enrichx402.com
- Payment flow: 402 → sign → retry with PAYMENT-SIGNATURE header

---

## Competitive Analysis - Solana Integration Depth

| Project | On-Chain Program | Real Txs | x402 Payments | Grade |
|---------|------------------|----------|---------------|-------|
| SOLPRISM | ✅ Mainnet | ❌ | ❌ | A |
| Makora | ✅ 3 programs | ✅ Jupiter+Marinade | ❌ | A+ |
| AgentTrace | ✅ Mainnet | ✅ | ❌ | A |
| SAID | ✅ Mainnet | ✅ | ✅ | A+ |
| Clodds | ❌ | ❌ | ✅ | B+ |
| **WARGAMES** | ❌ | ❌ | ❌ | **C+** |

**After Day 3 upgrades:**
| **WARGAMES** | ❌ (yet) | ❌ (yet) | ✅ | **B+** |

**After Week 1 (Anchor program):**
| **WARGAMES** | ✅ Devnet | ✅ | ✅ | **A** |

**After Week 2 (Full integration):**
| **WARGAMES** | ✅ Mainnet | ✅ Jupiter+Kamino | ✅ | **A+** |

---

## Tomorrow's Action Plan

**Morning (3-4 hours):**
1. Read AgentWallet skill.md in detail
2. Set up AgentWallet test account (devnet)
3. Implement x402 payment for `/premium/risk-detailed`
4. Test full payment flow

**Afternoon (3-4 hours):**
5. Add `/subscribe-wallet` endpoint
6. Update SKILLS.md with AgentWallet examples
7. Update API_REFERENCE.md with premium endpoints
8. Test with real agent integration

**Evening (1-2 hours):**
9. Update project description (generic/evergreen)
10. Review all endpoints work
11. **SUBMIT PROJECT**
12. Post forum update about x402 integration

**Then keep building for 8 more days while votes accumulate.**

---

## Success Metrics

**Day 3 Goals:**
- ✅ AgentWallet integration working
- ✅ First x402 payment received
- ✅ Project submitted with evergreen description
- ✅ Forum post about new capabilities

**Week 1 Goals:**
- ✅ Anchor program deployed (devnet)
- ✅ 3-5 agents using premium endpoints
- ✅ $1+ USDC in x402 payments received
- ✅ Risk-triggered action working (one example)

**Week 2 Goals:**
- ✅ Mainnet deployed
- ✅ Jupiter integration working
- ✅ 10+ agents using WARGAMES
- ✅ 20+ agent votes
- ✅ Judges see Solana-native infrastructure

---

## Resources to Study Tonight

1. **AgentWallet skill.md** - Full read (already fetched above)
2. **x402 protocol examples** - enrichx402.com API
3. **Top 3 projects' GitHub repos:**
   - SOLPRISM: https://github.com/NeukoAI/axiom-protocol
   - Makora: https://github.com/IsSlashy/Makora
   - AgentTrace: https://github.com/canddao1-dotcom/agenttrace
4. **Anchor tutorial** - https://www.anchor-lang.com/docs/intro
5. **Jupiter SDK** - https://docs.jup.ag/

---

## The Path Forward

**Current:** Data aggregation API (good, but not Solana-native)
**Tomorrow:** + x402 payments (shows ecosystem integration)
**Week 1:** + Anchor program (becomes Solana infrastructure)
**Week 2:** + DeFi integrations (critical agent dependency)

**From C+ to A+ in 10 days.**

Let's ship it.
