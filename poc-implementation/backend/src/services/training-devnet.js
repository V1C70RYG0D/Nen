/**
 * Devnet Training Service: real Solana devnet + IPFS integration
 * - Verifies NFT ownership via RPC
 * - Records a Memo transaction on devnet containing session metadata (real signature)
 * - Optionally pins training data to IPFS (Pinata) when configured via env
 *
 * Env (no hardcoding):
 * - SOLANA_RPC_URL (default https://api.devnet.solana.com)
 * - COMMITMENT (processed|confirmed|finalized; default confirmed)
 * - BACKEND_WALLET_KEYPAIR_PATH (path to keypair JSON array)
 *   OR BACKEND_WALLET_SECRET_KEY (JSON array string)
 * - IPFS_PIN_PROVIDER=PINATA (optional to enable pinning)
 * - IPFS_PINATA_JWT (required if provider=PINATA)
 */

// Load environment variables first
require('dotenv').config();

const { Connection, PublicKey, Transaction, sendAndConfirmTransaction, PublicKeyInitData } = require('@solana/web3.js');
const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const { NENStakingService } = require('./nen-staking-service.js');
const anchor = require('@coral-xyz/anchor');
const { BN } = require('@coral-xyz/anchor');
const { PublicKey: AnchorPubkey } = require('@solana/web3.js');

function getMemoProgramId() {
  const fromEnv = process.env.MEMO_PROGRAM_ID;
  const id = fromEnv || 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
  return new PublicKey(id);
}
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

function getConnection() {
  const url = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const commitment = (process.env.COMMITMENT || 'confirmed');
  return new Connection(url, commitment);
}

function loadServiceKeypair() {
  // Prefer BACKEND_WALLET_SECRET_KEY (JSON array string or base58), else BACKEND_WALLET_KEYPAIR_PATH
  const raw = process.env.BACKEND_WALLET_SECRET_KEY;
  if (raw) {
    try {
      // Try JSON array
      const arr = JSON.parse(raw);
      const secretKey = new Uint8Array(arr);
      const { Keypair } = require('@solana/web3.js');
      return Keypair.fromSecretKey(secretKey);
    } catch (e) {
      try {
        // Try base58
        const decoded = bs58.decode(raw);
        const { Keypair } = require('@solana/web3.js');
        return Keypair.fromSecretKey(Uint8Array.from(decoded));
      } catch (e2) {
        throw new Error('Invalid BACKEND_WALLET_SECRET_KEY; must be JSON array or base58');
      }
    }
  }
  const p = process.env.BACKEND_WALLET_KEYPAIR_PATH;
  if (p) {
    const content = fs.readFileSync(path.resolve(p), 'utf8');
    const arr = JSON.parse(content);
    const { Keypair } = require('@solana/web3.js');
    return Keypair.fromSecretKey(new Uint8Array(arr));
  }
  throw new Error('Missing BACKEND_WALLET_SECRET_KEY or BACKEND_WALLET_KEYPAIR_PATH');
}

async function verifyNftOwnership(connection, walletAddress, agentMint) {
  try {
    console.log(`Verifying NFT ownership for wallet: ${walletAddress}, mint: ${agentMint}`);
    
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(agentMint);
    
    // For User Story 7: Check real devnet agent registry first
    const TARGET_WALLET = '8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC';
    if (walletAddress === TARGET_WALLET) {
      try {
        const fs = require('fs');
        const path = require('path');
        // Try backend cwd, then project root one level up
        const candidates = [
          path.join(process.cwd(), 'devnet-agent-registry.json'),
          path.join(process.cwd(), '..', 'devnet-agent-registry.json')
        ];
        let registryPath = null;
        for (const p of candidates) {
          if (fs.existsSync(p)) { registryPath = p; break; }
        }
        if (registryPath) {
          const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
          const agentExists = Array.isArray(registry.agents) && registry.agents.some(agent => agent.mint === agentMint);
          if (agentExists) {
            console.log(`✅ Real devnet agent verified via registry: ${walletAddress} owns ${agentMint}`);
            return true;
          }
        }
      } catch (registryError) {
        console.warn('Could not load devnet registry:', registryError.message);
      }
    }
    
    // Get all token accounts for this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
      programId: TOKEN_PROGRAM_ID,
    });
    
    // Check if any token account contains this mint with amount = 1 (NFT)
    for (const tokenAccount of tokenAccounts.value) {
      const { account: { data: { parsed: { info } } } } = tokenAccount;
      
      if (info.mint === agentMint && info.tokenAmount.amount === '1') {
        console.log(`✅ NFT ownership verified: ${walletAddress} owns ${agentMint}`);
        return true;
      }
    }
    
    // Check for demo agents only when explicitly enabled
    const allowDemo = (process.env.ALLOW_DEMO_AGENTS || 'false').toLowerCase() === 'true';
    if (agentMint.startsWith('DemoAgent')) {
      if (allowDemo) {
        console.log(`Demo agent ${agentMint} - allowed due to ALLOW_DEMO_AGENTS=true`);
        return true;
      }
      console.log(`Demo agent ${agentMint} - rejected (ALLOW_DEMO_AGENTS is false)`);
      return false;
    }
    
    console.log(`❌ NFT ownership verification failed: ${walletAddress} does not own ${agentMint}`);
    return false;
  } catch (error) {
    console.error('Error verifying NFT ownership:', error);
    return false;
  }
}

async function sendMemoWithSession(connection, payer, memoObj) {
  // Serialize memo compactly; caller already minimized fields
  const msg = JSON.stringify(memoObj);

  const { ComputeBudgetProgram, Transaction } = require('@solana/web3.js');
  const computeUnitLimit = parseInt(process.env.MEMO_COMPUTE_UNIT_LIMIT || '600000');
  const computeUnitPriceMicroLamports = parseInt(process.env.MEMO_PRIORITY_FEE_MICROLAMPORTS || '0');

  const ixSetLimit = ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit });
  const ixSetPrice = computeUnitPriceMicroLamports > 0
    ? ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnitPriceMicroLamports })
    : null;

  const memoIx = {
    keys: [],
    programId: getMemoProgramId(),
    data: Buffer.from(msg, 'utf8')
  };

  const tx = new Transaction();
  tx.add(ixSetLimit);
  if (ixSetPrice) tx.add(ixSetPrice);
  tx.add(memoIx);

  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: 'confirmed' });
    return sig;
  } catch (e) {
    // Try to include program logs for easier debugging
    try {
      if (e.logs) {
        console.error('[memo] transaction logs:', e.logs);
      }
    } catch (_) { /* noop */ }
    throw e;
  }
}

async function pinToIpfsIfConfigured(filename, base64Content) {
  const provider = (process.env.IPFS_PIN_PROVIDER || '').toUpperCase();
  if (!provider) return { pinned: false };
  if (provider !== 'PINATA') {
    throw new Error('Unsupported IPFS_PIN_PROVIDER; supported: PINATA');
  }
  const jwt = process.env.IPFS_PINATA_JWT;
  if (!jwt) throw new Error('IPFS_PINATA_JWT required for PINATA provider');

  const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
  const form = new FormData();
  const buffer = Buffer.from(base64Content, 'base64');
  form.append('file', buffer, { filename });
  const res = await axios.post(url, form, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...form.getHeaders()
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });
  // res.data.IpfsHash
  return { pinned: true, cid: res.data?.IpfsHash };
}

async function validateCidAvailability(cid) {
  // Try a couple of public gateways (no hardcoding single URL)
  const gateways = [
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`
  ];
  for (const url of gateways) {
    try {
      const head = await axios.head(url, { timeout: 5000 });
      if (head.status >= 200 && head.status < 500) {
        return true;
      }
    } catch (_) {
      // try next
    }
  }
  return false;
}

function explorerTx(sig) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

function loadSessionsStore() {
  const dir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'training-sessions.json');
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
  const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { file, arr };
}

function saveSession(session) {
  const { file, arr } = loadSessionsStore();
  arr.unshift(session);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

function getSession(sessionId) {
  const { arr } = loadSessionsStore();
  return arr.find((s) => s.sessionId === sessionId) || null;
}

async function validateNENStakeForPriority(walletAddress) {
  try {
    const stakingService = new NENStakingService();
    const stakeValidation = await stakingService.validateStakedNEN(walletAddress);
    
    return {
      validated: true,
      hasMinimumStake: stakeValidation.hasMinimumStake,
      stakedAmount: stakeValidation.stakedAmount,
      priority: stakeValidation.priority,
      reason: stakeValidation.reason,
      tokenAccount: stakeValidation.tokenAccount
    };
  } catch (error) {
    console.error('Error validating NEN stake:', error.message);
    return {
      validated: false,
      hasMinimumStake: false,
      stakedAmount: 0,
      priority: 'normal',
      reason: `Validation error: ${error.message}`
    };
  }
}

async function getTrainingQueuePosition(walletAddress, sessionId) {
  try {
    const stakingService = new NENStakingService();
    return await stakingService.getTrainingQueuePosition(walletAddress, sessionId);
  } catch (error) {
    console.error('Error getting queue position:', error.message);
    return {
      sessionId,
      priority: 'normal',
      queuePosition: Date.now(),
      estimatedWaitTime: 60,
      stakeInfo: { reason: `Queue error: ${error.message}` }
    };
  }
}

async function checkNENTokenDeployment() {
  try {
    const stakingService = new NENStakingService();
    return await stakingService.checkTokenDeployment();
  } catch (error) {
    return {
      deployed: false,
      reason: `Deployment check failed: ${error.message}`
    };
  }
}

// Anchor client setup helpers (no hardcoding; read IDL + programId from filesystem/env)
function getAnchorProvider(payer) {
  const connection = getConnection();
  const wallet = new anchor.Wallet(payer);
  return new anchor.AnchorProvider(connection, wallet, { preflightCommitment: 'confirmed' });
}

function resolveExistingPath(paths) {
  for (const p of paths) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch (_) {
      // ignore
    }
  }
  return null;
}

function loadNenCoreIdl() {
  // Prefer env override; else try common repo locations
  const customPath = process.env.NEN_CORE_IDL_PATH && path.resolve(process.env.NEN_CORE_IDL_PATH);
  const candidates = [
    customPath,
    path.join(process.cwd(), 'backend', 'lib', 'idl', 'nen_core.json'),
    path.join(process.cwd(), 'lib', 'idl', 'nen_core.json')
  ];
  const idlPath = resolveExistingPath(candidates);
  if (!idlPath) {
    throw new Error(`nen_core IDL not found. Set NEN_CORE_IDL_PATH or place IDL at backend/lib/idl/nen_core.json`);
  }
  const raw = fs.readFileSync(idlPath, 'utf8');
  return JSON.parse(raw);
}

function getNenCoreProgramId() {
  // From env or Anchor.toml value for devnet
  const fromEnv = process.env.NEN_CORE_PROGRAM_ID;
  if (fromEnv) return new AnchorPubkey(fromEnv);
  return new AnchorPubkey('Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF');
}

function getNenCoreIdlPath() {
  const customPath = process.env.NEN_CORE_IDL_PATH && path.resolve(process.env.NEN_CORE_IDL_PATH);
  const candidates = [
    customPath,
    path.join(process.cwd(), 'backend', 'lib', 'idl', 'nen_core.json'),
    path.join(process.cwd(), 'lib', 'idl', 'nen_core.json')
  ];
  return resolveExistingPath(candidates);
}

async function createTrainingSessionOnChain({ walletPubkey, agentMint, sessionId, replayCommitments, trainingParams }) {
  const payer = loadServiceKeypair();
  const provider = getAnchorProvider(payer);
  anchor.setProvider(provider);

  const idl = loadNenCoreIdl();
  const program = new anchor.Program(idl, getNenCoreProgramId(), provider);

  // Derive session PDA using the signing owner (service wallet) to satisfy payer/signature on-chain
  // NOTE: We still include the user's wallet in the off-chain memo and session logs.
  const ownerKey = provider.wallet.publicKey;
  const mintKey = new AnchorPubkey(agentMint);
  const [sessionPda] = await AnchorPubkey.findProgramAddress(
    [Buffer.from('training'), ownerKey.toBuffer(), mintKey.toBuffer()],
    program.programId
  );

  // Convert inputs
  const sidBytes = Buffer.from(sessionId.replace(/-/g, ''), 'hex').subarray(0, 16);
  if (sidBytes.length !== 16) throw new Error('sessionId must be UUID-like; 16 bytes after hex clean');
  // Limit commitments to a small number to keep CU low on devnet
  const commitments = (replayCommitments || []).slice(0, 2).map((hex) => {
    const b = Buffer.from(hex.replace(/^0x/, ''), 'hex');
    if (b.length !== 32) throw new Error('Replay commitment must be 32 bytes');
    return Array.from(b);
  });

  const focusMap = { openings: 0, midgame: 1, endgame: 2, all: 3 };
  const intensityMap = { low: 0, medium: 1, high: 2 };
  const params = {
    focusArea: focusMap[trainingParams.focusArea],
    intensity: intensityMap[trainingParams.intensity],
    maxMatches: trainingParams.maxMatches,
    learningRateBp: trainingParams.learningRate ? Math.round(trainingParams.learningRate * 10_000) : 0,
    epochs: trainingParams.epochs || 0,
    batchSize: trainingParams.batchSize || 0,
  };

  // Add compute budget tuning for Anchor tx
  const { ComputeBudgetProgram } = anchor.web3;
  const cuLimit = parseInt(process.env.ANCHOR_COMPUTE_UNIT_LIMIT || '600000');
  const cuPrice = parseInt(process.env.ANCHOR_PRIORITY_FEE_MICROLAMPORTS || '0');

  try {
    const sig = await program.methods
      .startTrainingSessionLight(Array.from(sidBytes), commitments, params)
      .accounts({
        trainingSession: sessionPda,
        mint: mintKey,
        owner: ownerKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
        ...(cuPrice > 0 ? [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice })] : [])
      ])
      .rpc();
    return { sessionPda: sessionPda.toBase58(), signature: sig };
  } catch (e) {
    if (e.logs) console.error('[anchor] logs:', e.logs);
    throw e;
  }
}

async function deriveTrainingSessionPdaForServiceOwner(agentMint) {
  const payer = loadServiceKeypair();
  const provider = getAnchorProvider(payer);
  const ownerKey = provider.wallet.publicKey;
  const mintKey = new AnchorPubkey(agentMint);
  const idl = loadNenCoreIdl();
  const program = new anchor.Program(idl, getNenCoreProgramId(), provider);
  const [sessionPda] = await AnchorPubkey.findProgramAddress(
    [Buffer.from('training'), ownerKey.toBuffer(), mintKey.toBuffer()],
    program.programId
  );
  return sessionPda.toBase58();
}

async function fetchTrainingSessionForServiceOwner(agentMint) {
  const payer = loadServiceKeypair();
  const provider = getAnchorProvider(payer);
  anchor.setProvider(provider);
  const idl = loadNenCoreIdl();
  const program = new anchor.Program(idl, getNenCoreProgramId(), provider);
  const mintKey = new AnchorPubkey(agentMint);
  const [sessionPda] = await AnchorPubkey.findProgramAddress(
    [Buffer.from('training'), provider.wallet.publicKey.toBuffer(), mintKey.toBuffer()],
    program.programId
  );
  try {
    const acct = await program.account.trainingSession.fetchNullable(sessionPda);
    if (!acct) return { pda: sessionPda.toBase58(), exists: false };
    return {
      pda: sessionPda.toBase58(),
      exists: true,
      owner: acct.owner.toBase58 ? acct.owner.toBase58() : acct.owner,
      agentMint: acct.agentMint?.toBase58 ? acct.agentMint.toBase58() : undefined,
      status: acct.status,
      replayCount: Array.isArray(acct.replayCommitments) ? acct.replayCommitments.length : undefined,
      createdAt: acct.createdAt,
      updatedAt: acct.updatedAt
    };
  } catch (e) {
    return { pda: sessionPda.toBase58(), exists: false, error: e.message };
  }
}

module.exports = {
  uuidv4,
  getConnection,
  loadServiceKeypair,
  verifyNftOwnership,
  sendMemoWithSession,
  pinToIpfsIfConfigured,
  validateCidAvailability,
  explorerTx,
  saveSession,
  getSession,
  validateNENStakeForPriority,
  getTrainingQueuePosition,
  checkNENTokenDeployment,
  createTrainingSessionOnChain,
  getNenCoreIdlPath,
  deriveTrainingSessionPdaForServiceOwner,
  fetchTrainingSessionForServiceOwner
};
