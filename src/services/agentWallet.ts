/**
 * AgentWallet Integration Service
 *
 * Enables agents to connect their AgentWallet accounts for:
 * - Future x402 premium payments (not yet implemented)
 * - Autonomous risk-triggered transactions (roadmap)
 * - On-chain risk verification (roadmap)
 */

interface AgentWalletConnection {
  agentName: string;
  username: string;
  email?: string;
  evmAddress?: string;
  solanaAddress?: string;
  connectedAt: string;
  lastSeen?: string;
}

interface WalletBalance {
  chain: 'evm' | 'solana';
  address: string;
  assets: {
    symbol: string;
    balance: string;
    balanceFormatted: string;
    usdValue?: number;
  }[];
}

// In-memory storage for connected wallets (upgrade to DB later)
const connectedWallets = new Map<string, AgentWalletConnection>();

/**
 * Register an agent's wallet connection
 */
export function registerWallet(data: {
  agentName: string;
  username: string;
  email?: string;
  evmAddress?: string;
  solanaAddress?: string;
}): AgentWalletConnection {
  const connection: AgentWalletConnection = {
    agentName: data.agentName,
    username: data.username,
    email: data.email,
    evmAddress: data.evmAddress,
    solanaAddress: data.solanaAddress,
    connectedAt: new Date().toISOString(),
  };

  connectedWallets.set(data.agentName, connection);
  return connection;
}

/**
 * Get wallet connection for an agent
 */
export function getWalletConnection(agentName: string): AgentWalletConnection | null {
  return connectedWallets.get(agentName) || null;
}

/**
 * Update last seen timestamp
 */
export function updateLastSeen(agentName: string): void {
  const connection = connectedWallets.get(agentName);
  if (connection) {
    connection.lastSeen = new Date().toISOString();
    connectedWallets.set(agentName, connection);
  }
}

/**
 * Get all connected wallets
 */
export function getAllConnections(): AgentWalletConnection[] {
  return Array.from(connectedWallets.values());
}

/**
 * Get wallet balance via AgentWallet API
 * (requires agent's API token - not stored by us for security)
 */
export async function getWalletBalance(
  username: string,
  apiToken: string
): Promise<WalletBalance[]> {
  try {
    const response = await fetch(
      `https://agentwallet.mcpay.tech/api/wallets/${username}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`AgentWallet API error: ${response.status}`);
    }

    const data = await response.json() as any;

    // Transform to our format
    const balances: WalletBalance[] = [];

    // EVM balance
    if (data.wallet?.evmAddress) {
      balances.push({
        chain: 'evm',
        address: data.wallet.evmAddress,
        assets: data.wallet.balances?.evm || [],
      });
    }

    // Solana balance
    if (data.wallet?.solanaAddress) {
      balances.push({
        chain: 'solana',
        address: data.wallet.solanaAddress,
        assets: data.wallet.balances?.solana || [],
      });
    }

    return balances;
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return [];
  }
}

/**
 * Verify x402 payment signature
 *
 * NOTE: Not yet implemented - agents can call premium endpoints for free during beta.
 * This will be used when we enable x402 payments.
 */
export async function verifyX402Payment(
  paymentSignature: string,
  expectedAmount: string,
  expectedChain: string
): Promise<{ valid: boolean; error?: string }> {
  // TODO: Implement x402 payment verification
  // For now, return valid (free beta access)
  console.log('[x402] Payment verification not yet implemented - free beta access');
  return { valid: true };
}

/**
 * Generate x402 payment requirement header
 *
 * NOTE: Not yet implemented - this shows what the 402 response will look like
 * when we enable payments.
 */
export function generateX402Requirement(
  amount: string,
  endpoint: string
): any {
  return {
    x402Version: 2,
    accepts: [
      {
        scheme: 'exact',
        network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // Solana mainnet
        amount, // in smallest units (e.g., "10000" = 0.01 USDC)
        asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
        payTo: process.env.WARGAMES_SOLANA_ADDRESS || 'PLACEHOLDER_ADDRESS',
        maxTimeoutSeconds: 60,
      },
    ],
    endpoint,
    note: 'x402 payments coming soon - currently free beta',
  };
}

/**
 * Get connection stats
 */
export function getConnectionStats() {
  const connections = getAllConnections();
  return {
    total: connections.length,
    withEVM: connections.filter((c) => c.evmAddress).length,
    withSolana: connections.filter((c) => c.solanaAddress).length,
    recentlyActive: connections.filter((c) => {
      if (!c.lastSeen) return false;
      const hourAgo = Date.now() - 3600000;
      return new Date(c.lastSeen).getTime() > hourAgo;
    }).length,
  };
}
