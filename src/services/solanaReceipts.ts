/**
 * Solana On-Chain Receipt Anchoring
 * Anchor receipt hashes on Solana using Memo program
 * Provides trustless verification of pre-outcome predictions
 */

import { Connection, Keypair, Transaction, TransactionInstruction, PublicKey, SystemProgram } from '@solana/web3.js';

// Solana Memo Program ID (native program)
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

interface SolanaReceiptAnchor {
  receiptId: string;
  receiptHash: string;
  signature: string; // Solana transaction signature
  slot: number; // Block slot
  blockTime: number; // Unix timestamp
  explorer_url: string;
  status: 'pending' | 'confirmed' | 'finalized';
}

/**
 * Anchor a receipt hash on Solana using Memo program
 * This is the simplest way to get verifiable on-chain data
 */
export async function anchorReceiptOnChain(
  receiptId: string,
  receiptHash: string,
  keypair?: Keypair
): Promise<SolanaReceiptAnchor> {
  // TODO: Implement real on-chain anchoring once funded wallet is available
  // This would:
  // 1. Create a transaction with a Memo instruction containing the receipt hash
  // 2. Sign and send the transaction to Solana
  // 3. Wait for confirmation
  // 4. Return the transaction signature and slot
  //
  // For now, returning structure without mock data
  // Call anchorReceiptOnChainReal() once wallet is funded

  return {
    receiptId,
    receiptHash,
    signature: '', // Will be populated when actually anchored on-chain
    slot: 0, // Will be populated when actually anchored on-chain
    blockTime: Math.floor(Date.now() / 1000),
    explorer_url: '', // Will be populated with real Solana Explorer link
    status: 'pending' // Waiting for wallet funding to enable on-chain anchoring
  };
}

/**
 * Real implementation (currently commented out, needs funded wallet)
 */
async function anchorReceiptOnChainReal(
  receiptId: string,
  receiptHash: string,
  keypair: Keypair
): Promise<SolanaReceiptAnchor> {
  // Connect to Solana
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Create memo instruction with receipt data
  const memoText = `WARGAMES_RECEIPT:${receiptId}:${receiptHash}`;
  const memoInstruction = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memoText, 'utf8')
  });

  // Create transaction
  const transaction = new Transaction();
  transaction.add(memoInstruction);

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = keypair.publicKey;

  // Sign and send
  transaction.sign(keypair);
  const signature = await connection.sendRawTransaction(transaction.serialize());

  // Wait for confirmation
  const confirmation = await connection.confirmTransaction(signature);

  // Get transaction details
  const txDetails = await connection.getTransaction(signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0
  });

  return {
    receiptId,
    receiptHash,
    signature,
    slot: txDetails?.slot || 0,
    blockTime: txDetails?.blockTime || Math.floor(Date.now() / 1000),
    explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    status: 'confirmed'
  };
}

/**
 * Verify a receipt exists on-chain
 */
export async function verifyReceiptOnChain(signature: string): Promise<{
  found: boolean;
  receiptId?: string;
  receiptHash?: string;
  blockTime?: number;
  slot?: number;
  finalized: boolean;
}> {
  // TODO: Implement real on-chain verification once receipts are being anchored
  // This would fetch the transaction from Solana RPC and parse the memo instruction

  // For now, return not found since we're not actually anchoring yet
  if (!signature || signature === '') {
    return {
      found: false,
      finalized: false
    };
  }

  // If a signature is provided, attempt to verify it
  // (Once we start anchoring, call verifyReceiptOnChainReal instead)
  return {
    found: false,
    finalized: false
  };
}

/**
 * Real verification implementation (commented out, needs RPC access)
 */
async function verifyReceiptOnChainReal(signature: string): Promise<{
  found: boolean;
  receiptId?: string;
  receiptHash?: string;
  blockTime?: number;
  slot?: number;
  finalized: boolean;
}> {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  try {
    // Fetch transaction
    const tx = await connection.getTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0
    });

    if (!tx || !tx.meta) {
      return { found: false, finalized: false };
    }

    // Parse memo from transaction
    // The memo program stores data in instruction data
    const message: any = tx.transaction.message;
    const memoInstruction = message.instructions?.find(
      (ix: any) => ix.programId.equals(MEMO_PROGRAM_ID)
    );

    if (!memoInstruction) {
      return { found: false, finalized: false };
    }

    // Decode memo text
    const memoText = Buffer.from(memoInstruction.data as any).toString('utf8');

    // Parse WARGAMES receipt format: "WARGAMES_RECEIPT:receiptId:hash"
    const parts = memoText.split(':');
    if (parts[0] !== 'WARGAMES_RECEIPT' || parts.length !== 3) {
      return { found: false, finalized: false };
    }

    return {
      found: true,
      receiptId: parts[1],
      receiptHash: parts[2],
      blockTime: tx.blockTime || undefined,
      slot: tx.slot,
      finalized: true
    };
  } catch (error) {
    console.error('Error verifying receipt on-chain:', error);
    return { found: false, finalized: false };
  }
}

/**
 * Get all receipts for an agent from on-chain data
 * This provides trustless verification of decision history
 */
export async function getAgentReceiptsOnChain(agentId: string): Promise<Array<{
  receiptId: string;
  receiptHash: string;
  signature: string;
  blockTime: number;
  slot: number;
}>> {
  // In production, this would:
  // 1. Query Solana for all transactions containing the agent's receipts
  // 2. Parse memo instructions
  // 3. Return chronologically ordered list

  // For now, return empty array (needs RPC indexing or subquery setup)
  return [];
}

/**
 * Estimate cost to anchor a receipt on Solana
 */
export function estimateAnchorCost(): {
  lamports: number;
  sol: number;
  usd: number;
} {
  // Solana transaction fee is typically 5000 lamports (0.000005 SOL)
  const lamports = 5000;
  const sol = lamports / 1_000_000_000;
  const usd = sol * 98.5; // Approximate SOL price

  return {
    lamports,
    sol,
    usd: Math.round(usd * 10000) / 10000 // Round to 4 decimals
  };
}

/**
 * Get statistics about on-chain receipt anchoring
 */
export function getAnchorStats(): {
  total_anchored: number;
  total_verified: number;
  avg_confirmation_time: number; // seconds
  total_cost_sol: number;
  oldest_receipt_age_days: number;
  note?: string;
} {
  // Real stats - currently 0 since we need a funded wallet to anchor
  return {
    total_anchored: 0,
    total_verified: 0,
    avg_confirmation_time: 0.6, // Expected: Solana is fast
    total_cost_sol: 0,
    oldest_receipt_age_days: 0,
    note: 'On-chain anchoring ready to deploy. Requires funded Solana wallet to begin anchoring receipts.'
  };
}
