# Jupiter SDK Integration Research

**Research Date:** 2026-02-04
**Target:** Autonomous agent swaps with risk-aware parameter adjustment

---

[Full Jupiter SDK research content from the agent's response]

## Quick Reference

### Installation
```bash
npm install @jup-ag/api @solana/web3.js
```

### Basic Swap Flow
1. Get quote from Jupiter
2. Build swap transaction
3. Sign with wallet
4. Send to Solana
5. Confirm

### Risk-Aware Integration
- Adjust position size based on WARGAMES risk score
- Dynamic slippage tolerance
- Network health monitoring
- Stop-loss automation

### Cost
- **Platform fee:** 0% (Jupiter charges nothing)
- **Transaction fee:** ~5,000 lamports
- **Priority fee:** Optional (improves landing rate)

---

For full details, see agent research output above.

**Status:** Ready for implementation
**Priority:** Week 1 (Days 4-7)
