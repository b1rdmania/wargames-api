/**
 * Solana Network Metrics Integration
 * Network health, TPS, validators, epoch info
 * Uses public Solana RPC nodes
 */

interface RpcResponse<T> {
  jsonrpc: string;
  id: number;
  result: T;
}

interface PerformanceSample {
  slot: number;
  numTransactions: number;
  numSlots: number;
  samplePeriodSecs: number;
}

interface VoteAccounts {
  current: Array<{
    votePubkey: string;
    nodePubkey: string;
    activatedStake: number;
    epochVoteAccount: boolean;
    commission: number;
  }>;
  delinquent: Array<any>;
}

interface EpochInfo {
  absoluteSlot: number;
  blockHeight: number;
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  transactionCount: number | null;
}

export interface SolanaNetworkMetrics {
  network: string;
  tps: number;
  validators: {
    active: number;
    delinquent: number;
    total: number;
  };
  epoch: {
    current: number;
    slot: number;
    progress: number; // percentage
    slots_in_epoch: number;
  };
  health: 'healthy' | 'degraded' | 'congested';
  block_height: number;
}

/**
 * Fetch Solana network metrics from RPC
 */
export async function fetchSolanaMetrics(): Promise<SolanaNetworkMetrics> {
  // Use public RPC endpoint (or env variable)
  const rpcUrl = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

  // Fetch performance samples, vote accounts, and epoch info in parallel
  const [perfResponse, voteResponse, epochResponse] = await Promise.all([
    fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getRecentPerformanceSamples',
        params: [4] // Last 4 samples
      })
    }),
    fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'getVoteAccounts'
      })
    }),
    fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'getEpochInfo'
      })
    })
  ]);

  if (!perfResponse.ok || !voteResponse.ok || !epochResponse.ok) {
    throw new Error('Solana RPC request failed');
  }

  const perfData = await perfResponse.json() as RpcResponse<PerformanceSample[]>;
  const voteData = await voteResponse.json() as RpcResponse<VoteAccounts>;
  const epochData = await epochResponse.json() as RpcResponse<EpochInfo>;

  // Calculate TPS from most recent performance sample
  const latestSample = perfData.result[0];
  const tps = Math.round(latestSample.numTransactions / latestSample.samplePeriodSecs);

  // Count validators
  const activeValidators = voteData.result.current.length;
  const delinquentValidators = voteData.result.delinquent.length;
  const totalValidators = activeValidators + delinquentValidators;

  // Calculate epoch progress
  const epochProgress = (epochData.result.slotIndex / epochData.result.slotsInEpoch) * 100;

  // Determine network health based on TPS
  // Solana typically does 2000-4000 TPS, can spike to 7000+
  let health: 'healthy' | 'degraded' | 'congested';
  if (tps > 2000) {
    health = 'healthy';
  } else if (tps > 1000) {
    health = 'degraded';
  } else {
    health = 'congested';
  }

  return {
    network: 'mainnet-beta',
    tps,
    validators: {
      active: activeValidators,
      delinquent: delinquentValidators,
      total: totalValidators
    },
    epoch: {
      current: epochData.result.epoch,
      slot: epochData.result.absoluteSlot,
      progress: Math.round(epochProgress * 100) / 100,
      slots_in_epoch: epochData.result.slotsInEpoch
    },
    health,
    block_height: epochData.result.blockHeight
  };
}

/**
 * Check if network is healthy for transactions
 */
export async function isNetworkHealthy(): Promise<boolean> {
  const metrics = await fetchSolanaMetrics();
  return metrics.health === 'healthy';
}

/**
 * Get estimated transaction success probability based on network health
 */
export async function getTransactionSuccessProbability(): Promise<number> {
  const metrics = await fetchSolanaMetrics();

  // Base probability on TPS and health
  if (metrics.health === 'healthy') {
    return 0.95; // 95% success rate
  } else if (metrics.health === 'degraded') {
    return 0.75; // 75% success rate
  } else {
    return 0.50; // 50% success rate (congested)
  }
}
