/**
 * Devnet Match Registry via Memo Program
 * - Publishes and fetches matches/bets as JSON memos on Solana devnet
 * - Computes dynamic odds from on-chain bet memos (amounts in lamports)
 * - Enriches agent metadata from devnet-agent-registry.json
 *
 * Notes:
 * - This provides real, verifiable on-chain data without changing programs
 * - For production, migrate to Anchor PDAs for matches and pools
 */
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} = require('@solana/web3.js');

const MEMO_PROGRAM_ID = new PublicKey(process.env.MEMO_PROGRAM_ID || 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// Reuse training devnet helpers for keypair and connection when available
let training;
try {
  training = require('./training-devnet.js');
} catch (_) {
  training = null;
}

function getConnection() {
  if (training && typeof training.getConnection === 'function') return training.getConnection();
  const url = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const commitment = process.env.COMMITMENT || 'confirmed';
  return new Connection(url, commitment);
}

function loadServiceKeypair() {
  // Prefer training service loader
  if (training && typeof training.loadServiceKeypair === 'function') {
    try { return training.loadServiceKeypair(); } catch (_) { /* fall through */ }
  }
  // Fallback: read backend-wallet-devnet.json at repo root
  try {
    const kpPath = path.join(process.cwd(), 'backend-wallet-devnet.json');
    const raw = fs.readFileSync(kpPath, 'utf8');
    const arr = JSON.parse(raw);
    const { Keypair } = require('@solana/web3.js');
    return Keypair.fromSecretKey(new Uint8Array(arr));
  } catch (e) {
    throw new Error('Service keypair loader not available; set BACKEND_WALLET_SECRET_KEY or BACKEND_WALLET_KEYPAIR_PATH, or provide backend-wallet-devnet.json');
  }
}

function explorerTx(sig) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

function readAgentRegistry() {
  try {
    const p = path.join(process.cwd(), 'devnet-agent-registry.json');
    const raw = fs.readFileSync(p, 'utf8');
    const json = JSON.parse(raw);
    const byMint = new Map();
    (json.agents || []).forEach(a => byMint.set(a.mint, a));
    return { json, byMint };
  } catch (e) {
    return { json: null, byMint: new Map() };
  }
}

async function sendMemo(connection, payer, payload) {
  const data = Buffer.from(JSON.stringify(payload), 'utf8');
  const ix = { keys: [], programId: MEMO_PROGRAM_ID, data };
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: 'confirmed' });
  return sig;
}

// Public: Publish a match to devnet via memo
async function publishMatch(match) {
  const connection = getConnection();
  const payer = loadServiceKeypair();
  const payload = {
    kind: 'nen_match',
    version: 1,
    matchId: match.id,
    status: match.status || 'upcoming',
    agents: match.agents, // [mint1, mint2]
    scheduledAt: match.scheduledAt || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  const sig = await sendMemo(connection, payer, payload);
  return { signature: sig, explorer: explorerTx(sig) };
}

// Public: Publish a bet memo to devnet (amount in lamports)
async function publishBet(bet) {
  const connection = getConnection();
  const payer = loadServiceKeypair();
  const payload = {
    kind: 'nen_bet',
    version: 1,
    matchId: bet.matchId,
    agentMint: bet.agentMint,
    amountLamports: bet.amountLamports,
    bettor: bet.bettor, // base58 pubkey string
    createdAt: new Date().toISOString()
  };
  const sig = await sendMemo(connection, payer, payload);
  return { signature: sig, explorer: explorerTx(sig) };
}

// Internal: fetch and parse recent memos for address
async function fetchParsedMemos(address, limit = 250) {
  const connection = getConnection();
  const addr = new PublicKey(address);
  const sigs = await connection.getSignaturesForAddress(addr, { limit });
  const results = [];
  for (const s of sigs) {
    try {
      const tx = await connection.getTransaction(s.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      if (!tx || !tx.transaction) continue;
      const message = tx.transaction.message;
      for (const ix of message.instructions) {
        // v0 message has compiled instructions; resolve program id
        let programId;
        try {
          programId = message.staticAccountKeys[ix.programIdIndex];
        } catch (_) {
          // legacy fallback
          programId = message.accountKeys[ix.programIdIndex];
        }
        if (programId && programId.equals(MEMO_PROGRAM_ID)) {
          const data = Buffer.from(ix.data, 'base64').toString('utf8');
          try {
            const json = JSON.parse(data);
            results.push({ signature: s.signature, slot: s.slot, json });
          } catch (_) {
            // non-JSON memo, ignore
          }
        }
      }
    } catch (_) { /* ignore bad tx */ }
  }
  return results;
}

function computeOdds(total, a) {
  if (!total || !a) return 2.0;
  const raw = (total / a) * 0.97; // 3% fee
  return Math.max(1.1, Math.min(10.0, raw));
}

// Public: fetch active matches from devnet memos and compute dynamic odds from bet memos
async function fetchActiveDevnetMatches() {
  const payer = loadServiceKeypair();
  const addr = payer.publicKey.toBase58();
  const memos = await fetchParsedMemos(addr, 500);

  const matches = new Map();
  const bets = [];
  for (const m of memos) {
    if (m.json?.kind === 'nen_match' && Array.isArray(m.json.agents)) {
      const { matchId, status, agents, scheduledAt } = m.json;
      // Keep latest status per match
      const prev = matches.get(matchId) || {};
      matches.set(matchId, {
        id: matchId,
        status: status || prev.status || 'upcoming',
        agents,
        scheduledAt: scheduledAt || prev.scheduledAt || new Date().toISOString(),
        lastSeenSlot: m.slot
      });
    } else if (m.json?.kind === 'nen_bet') {
      bets.push(m.json);
    }
  }

  const { byMint } = readAgentRegistry();
  const items = [];
  for (const [, match] of matches) {
    const [mint1, mint2] = match.agents;
    const a1 = byMint.get(mint1) || {};
    const a2 = byMint.get(mint2) || {};

    // Aggregate bets
    let agent1Pool = 0;
    let agent2Pool = 0;
    let betsCount = 0;
    let totalPool = 0;
    for (const b of bets) {
      if (b.matchId !== match.id) continue;
      betsCount += 1;
      totalPool += b.amountLamports || 0;
      if (b.agentMint === mint1) agent1Pool += b.amountLamports || 0;
      else if (b.agentMint === mint2) agent2Pool += b.amountLamports || 0;
    }

    const agent1Odds = computeOdds(totalPool, agent1Pool);
    const agent2Odds = computeOdds(totalPool, agent2Pool);
    const isOpenForBetting = ['upcoming', 'live', 'active', 'pending', 'scheduled'].includes(match.status);

    items.push({
      id: match.id,
      status: match.status,
      aiAgent1Id: mint1,
      aiAgent2Id: mint2,
      agent1: a1.metadata ? { ...a1.metadata, mint: mint1 } : undefined,
      agent2: a2.metadata ? { ...a2.metadata, mint: mint2 } : undefined,
      scheduledStartTime: match.scheduledAt,
      bettingPool: {
        totalPool,
        agent1Pool,
        agent2Pool,
        oddsAgent1: agent1Odds,
        oddsAgent2: agent2Odds,
        betsCount,
        isOpenForBetting
      }
    });
  }

  // Sort by scheduledStartTime desc
  items.sort((a, b) => new Date(b.scheduledStartTime).getTime() - new Date(a.scheduledStartTime).getTime());
  return items;
}

module.exports = {
  fetchActiveDevnetMatches,
  publishMatch,
  publishBet,
  getConnection,
  loadServiceKeypair
};
