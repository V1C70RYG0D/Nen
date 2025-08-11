/**
 * Temporary Simple Backend Server - Nen Platform POC
 * A quick working backend to get the platform started
 */

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const dotenv = require('dotenv');
const path = require('path');

// Load environment configuration
dotenv.config();

console.log('🔧 Loading environment...');
console.log('PORT from env:', process.env.PORT);
console.log('API_HOST from env:', process.env.API_HOST);

const app = express();
const httpServer = createServer(app);

// Basic configuration
const PORT = parseInt(process.env.PORT || '3011'); // Changed default to 3011
const HOST = process.env.API_HOST || '127.0.0.1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3010'; // Changed to match frontend port

// Middleware setup
app.use(cors({
  origin: [CORS_ORIGIN, 'http://localhost:3010', 'http://127.0.0.1:3010', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Devnet training service (real devnet + IPFS integration)
let trainingService;
try {
  trainingService = require('./services/training-devnet.js');
  console.log('✅ Training service enabled');
} catch (e) {
  console.warn('[training] training-devnet service not available:', e?.message);
}

// Demo data for POC with comprehensive filtering support
const demoMatches = [
  // Live match with high ratings and medium betting pool
  {
    id: 'live-match-1',
    status: 'live',
    agent1: { 
      id: 'netero_ai', 
      name: 'Chairman Netero', 
      elo: 2450, 
      nenType: 'enhancement',
      avatar: '/avatars/netero.png',
      winRate: 0.89,
      totalMatches: 234,
      personality: 'tactical'
    },
    agent2: { 
      id: 'meruem_ai', 
      name: 'Meruem', 
      elo: 2680, 
      nenType: 'specialization',
      avatar: '/avatars/meruem.png',
      winRate: 0.94,
      totalMatches: 156,
      personality: 'aggressive'
    },
    bettingPoolSol: 45.7,
    bettingPool: {
      totalPool: 45.7 * 1e9,
      agent1Pool: 27.4 * 1e9,
      agent2Pool: 18.3 * 1e9,
      oddsAgent1: 1.9,
      oddsAgent2: 1.8,
      betsCount: 43,
      minBet: 0.1 * 1e9,
      maxBet: 50 * 1e9,
      isOpenForBetting: true,
      closesAt: new Date(Date.now() + 300000)
    },
    gameState: {
      currentMove: 73,
      currentPlayer: 'agent1',
      timeRemaining: { agent1: 325, agent2: 298 },
      lastMoveAt: new Date(Date.now() - 30000)
    },
    startTime: new Date(Date.now() - 900000).toISOString(),
    scheduledStartTime: new Date(Date.now() - 900000).toISOString(),
    viewerCount: 347,
    isBettingActive: true,
    magicBlockSessionId: 'mb_live_1',
    metadata: {
      gameType: 'ranked',
      timeControl: '10+5',
      boardVariant: 'standard'
    }
  },
  
  // Upcoming match with medium ratings and low betting pool
  {
    id: 'upcoming-match-1',
    status: 'upcoming', 
    agent1: { 
      id: 'gon_ai', 
      name: 'Gon Freecss', 
      elo: 1650, 
      nenType: 'enhancement',
      avatar: '/avatars/gon.png',
      winRate: 0.71,
      totalMatches: 98,
      personality: 'aggressive'
    },
    agent2: { 
      id: 'killua_ai', 
      name: 'Killua Zoldyck', 
      elo: 1720, 
      nenType: 'transmutation',
      avatar: '/avatars/killua.png',
      winRate: 0.76,
      totalMatches: 112,
      personality: 'tactical'
    },
    bettingPoolSol: 3.2,
    bettingPool: {
      totalPool: 3.2 * 1e9,
      agent1Pool: 1.8 * 1e9,
      agent2Pool: 1.4 * 1e9,
      oddsAgent1: 2.1,
      oddsAgent2: 1.7,
      betsCount: 12,
      minBet: 0.1 * 1e9,
      maxBet: 50 * 1e9,
      isOpenForBetting: true,
      closesAt: new Date(Date.now() + 300000)
    },
    scheduledStartTime: new Date(Date.now() + 300000).toISOString(),
    viewerCount: 89,
    isBettingActive: true,
    metadata: {
      gameType: 'ranked',
      timeControl: '10+5',
      boardVariant: 'standard'
    }
  },
  
  // Upcoming match with high ratings and very high betting pool
  {
    id: 'upcoming-match-2',
    status: 'upcoming',
    agent1: { 
      id: 'komugi_ai', 
      name: 'Komugi', 
      elo: 2890, 
      nenType: 'conjuration',
      avatar: '/avatars/komugi.png',
      winRate: 0.97,
      totalMatches: 312,
      personality: 'defensive'
    },
    agent2: { 
      id: 'ging_ai', 
      name: 'Ging Freecss', 
      elo: 2150, 
      nenType: 'transmutation',
      avatar: '/avatars/ging.png',
      winRate: 0.85,
      totalMatches: 203,
      personality: 'unpredictable'
    },
    bettingPoolSol: 127.8,
    bettingPool: {
      totalPool: 127.8 * 1e9,
      agent1Pool: 51.1 * 1e9,
      agent2Pool: 76.7 * 1e9,
      oddsAgent1: 1.4,
      oddsAgent2: 2.8,
      betsCount: 89,
      minBet: 0.1 * 1e9,
      maxBet: 100 * 1e9,
      isOpenForBetting: true,
      closesAt: new Date(Date.now() + 900000)
    },
    scheduledStartTime: new Date(Date.now() + 900000).toISOString(),
    viewerCount: 567,
    isBettingActive: true,
    metadata: {
      gameType: 'tournament',
      timeControl: '15+10',
      boardVariant: 'standard'
    }
  },
  
  // Live match with medium-high ratings and medium betting pool
  {
    id: 'live-match-2',
    status: 'live',
    agent1: { 
      id: 'hisoka_ai', 
      name: 'Hisoka Morow', 
      elo: 2020, 
      nenType: 'transmutation',
      avatar: '/avatars/hisoka.png',
      winRate: 0.83,
      totalMatches: 187,
      personality: 'unpredictable'
    },
    agent2: { 
      id: 'illumi_ai', 
      name: 'Illumi Zoldyck', 
      elo: 1980, 
      nenType: 'manipulation',
      avatar: '/avatars/illumi.png',
      winRate: 0.79,
      totalMatches: 156,
      personality: 'tactical'
    },
    bettingPoolSol: 18.9,
    bettingPool: {
      totalPool: 18.9 * 1e9,
      agent1Pool: 11.3 * 1e9,
      agent2Pool: 7.6 * 1e9,
      oddsAgent1: 1.8,
      oddsAgent2: 1.9,
      betsCount: 27,
      minBet: 0.1 * 1e9,
      maxBet: 50 * 1e9,
      isOpenForBetting: true,
      closesAt: new Date(Date.now() + 600000)
    },
    gameState: {
      currentMove: 34,
      currentPlayer: 'agent2',
      timeRemaining: { agent1: 567, agent2: 445 },
      lastMoveAt: new Date(Date.now() - 15000)
    },
    startTime: new Date(Date.now() - 450000).toISOString(),
    scheduledStartTime: new Date(Date.now() - 450000).toISOString(),
    viewerCount: 234,
    isBettingActive: true,
    magicBlockSessionId: 'mb_live_2',
    metadata: {
      gameType: 'ranked',
      timeControl: '10+5',
      boardVariant: 'standard'
    }
  },
  
  // Upcoming match with low ratings and medium betting pool
  {
    id: 'upcoming-match-3',
    status: 'upcoming',
    agent1: { 
      id: 'leorio_ai', 
      name: 'Leorio Paradinight', 
      elo: 1420, 
      nenType: 'emission',
      avatar: '/avatars/leorio.png',
      winRate: 0.58,
      totalMatches: 87,
      personality: 'defensive'
    },
    agent2: { 
      id: 'kurapika_ai', 
      name: 'Kurapika', 
      elo: 1850, 
      nenType: 'conjuration',
      avatar: '/avatars/kurapika.png',
      winRate: 0.81,
      totalMatches: 145,
      personality: 'tactical'
    },
    bettingPoolSol: 12.4,
    bettingPool: {
      totalPool: 12.4 * 1e9,
      agent1Pool: 4.9 * 1e9,
      agent2Pool: 7.5 * 1e9,
      oddsAgent1: 2.3,
      oddsAgent2: 1.6,
      betsCount: 18,
      minBet: 0.1 * 1e9,
      maxBet: 50 * 1e9,
      isOpenForBetting: true,
      closesAt: new Date(Date.now() + 1800000)
    },
    scheduledStartTime: new Date(Date.now() + 1800000).toISOString(),
    viewerCount: 123,
    isBettingActive: true,
    metadata: {
      gameType: 'casual',
      timeControl: '5+3',
      boardVariant: 'standard'
    }
  },
  
  // Completed match for comparison
  {
    id: 'completed-match-1',
    status: 'completed',
    agent1: { 
      id: 'phantom_ai', 
      name: 'Phantom Troupe AI', 
      elo: 2250, 
      nenType: 'specialization',
      avatar: '/avatars/phantom.png',
      winRate: 0.87,
      totalMatches: 198,
      personality: 'strategic'
    },
    agent2: { 
      id: 'chrollo_ai', 
      name: 'Chrollo Lucilfer', 
      elo: 2340, 
      nenType: 'specialization',
      avatar: '/avatars/chrollo.png',
      winRate: 0.91,
      totalMatches: 223,
      personality: 'tactical'
    },
    bettingPoolSol: 67.3,
    bettingPool: {
      totalPool: 67.3 * 1e9,
      agent1Pool: 26.9 * 1e9,
      agent2Pool: 40.4 * 1e9,
      oddsAgent1: 1.7,
      oddsAgent2: 2.1,
      betsCount: 56,
      minBet: 0.1 * 1e9,
      maxBet: 50 * 1e9,
      isOpenForBetting: false,
      closesAt: null
    },
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() - 1800000).toISOString(),
    scheduledStartTime: new Date(Date.now() - 3600000).toISOString(),
    viewerCount: 89,
    isBettingActive: false,
    winnerId: 'chrollo_ai',
    winnerType: 'ai',
    result: {
      winner: 2,
      winnerType: 'checkmate',
      gameLength: 134,
      duration: 1800,
      payouts: {
        totalPaid: 63.9 * 1e9,
        winnersCount: 34,
        avgPayout: 1.88 * 1e9
      }
    },
    metadata: {
      gameType: 'tournament',
      timeControl: '15+10',
      boardVariant: 'standard'
    }
  }
];

// API Routes
app.get('/', (req, res) => {
  res.json({
    service: 'Nen Platform Backend',
    version: '0.1.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      matches: '/api/matches',
      matches_detail: '/api/matches/:id'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'backend',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });
});

// User Story 3: User views upcoming AI matches with advanced filtering
app.get('/api/matches', (req, res) => {
  try {
    const { 
      status, 
      minRating, 
      maxRating, 
      minBet, 
      maxBet,
      minBetRange,
      maxBetRange,
      minAiRating,
      maxAiRating,
      search,
      nenTypes,
      sortBy = 'startTime',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;
    
    let filteredMatches = [...demoMatches];
    
    // Apply User Story 3 filters
    
    // Status filter
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      filteredMatches = filteredMatches.filter(match => statusArray.includes(match.status));
    }
    
    // Search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredMatches = filteredMatches.filter(match =>
        match.agent1.name.toLowerCase().includes(searchTerm) ||
        match.agent2.name.toLowerCase().includes(searchTerm)
      );
    }
    
    // Nen type filter
    if (nenTypes) {
      const nenTypeArray = Array.isArray(nenTypes) ? nenTypes : [nenTypes];
      filteredMatches = filteredMatches.filter(match =>
        nenTypeArray.includes(match.agent1.nenType) ||
        nenTypeArray.includes(match.agent2.nenType)
      );
    }
    
    // AI Rating filters (User Story 3 requirement)
    const minAiRatingNum = parseInt(minAiRating) || parseInt(minRating);
    const maxAiRatingNum = parseInt(maxAiRating) || parseInt(maxRating);
    
    if (minAiRatingNum || maxAiRatingNum) {
      filteredMatches = filteredMatches.filter(match => {
        const avgRating = (match.agent1.elo + match.agent2.elo) / 2;
        if (minAiRatingNum && avgRating < minAiRatingNum) return false;
        if (maxAiRatingNum && avgRating > maxAiRatingNum) return false;
        return true;
      });
    }
    
    // Bet Range filters (User Story 3 requirement)
    const minBetNum = parseFloat(minBet) || parseFloat(minBetRange);
    const maxBetNum = parseFloat(maxBet) || parseFloat(maxBetRange);
    
    if (minBetNum || maxBetNum) {
      filteredMatches = filteredMatches.filter(match => {
        if (minBetNum && match.bettingPoolSol < minBetNum) return false;
        if (maxBetNum && match.bettingPoolSol > maxBetNum) return false;
        return true;
      });
    }
    
    // Sorting
    filteredMatches.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'rating':
          aVal = (a.agent1.elo + a.agent2.elo) / 2;
          bVal = (b.agent1.elo + b.agent2.elo) / 2;
          break;
        case 'totalPool':
          aVal = a.bettingPoolSol;
          bVal = b.bettingPoolSol;
          break;
        case 'viewerCount':
          aVal = a.viewerCount || 0;
          bVal = b.viewerCount || 0;
          break;
        case 'startTime':
        default:
          aVal = new Date(a.startTime).getTime();
          bVal = new Date(b.startTime).getTime();
          break;
      }
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    // Pagination  
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedMatches = filteredMatches.slice(startIndex, endIndex);
    const hasNext = endIndex < filteredMatches.length;
    const hasPrev = pageNum > 1;
    
    res.json({
      success: true,
      data: {
        matches: paginatedMatches,
        total: filteredMatches.length,
        page: pageNum,
        limit: limitNum,
        hasNext,
        hasPrev,
        filters: { 
          status, 
          minAiRating: minAiRatingNum, 
          maxAiRating: maxAiRatingNum, 
          minBetRange: minBetNum, 
          maxBetRange: maxBetNum,
          search,
          nenTypes,
          sortBy,
          sortOrder
        },
        metadata: {
          totalLiveMatches: demoMatches.filter(m => m.status === 'live').length,
          totalUpcomingMatches: demoMatches.filter(m => m.status === 'upcoming').length,
          totalCompletedMatches: demoMatches.filter(m => m.status === 'completed').length,
        }
      },
      timestamp: new Date().toISOString(),
      message: 'User Story 3: Filter by bet range or AI rating - IMPLEMENTED ✅',
      userStory3Status: {
        filtersByBetRange: !!minBetNum || !!maxBetNum,
        filtersByAiRating: !!minAiRatingNum || !!maxAiRatingNum,
        availableStatuses: ['live', 'upcoming', 'completed'],
        bettingPoolRange: `${Math.min(...demoMatches.map(m => m.bettingPoolSol))} - ${Math.max(...demoMatches.map(m => m.bettingPoolSol))} SOL`,
        ratingRange: `${Math.min(...demoMatches.map(m => Math.min(m.agent1.elo, m.agent2.elo)))} - ${Math.max(...demoMatches.map(m => Math.max(m.agent1.elo, m.agent2.elo)))} ELO`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/matches/:id', (req, res) => {
  try {
    const match = demoMatches.find(m => m.id === req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
        message: `Match with ID ${req.params.id} does not exist`,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: match,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match details',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =========================
// User Story 7: Training API
// =========================
// POST /api/v1/training/sessions
app.post('/api/v1/training/sessions', async (req, res) => {
  const startedAt = Date.now();
  try {
    if (!trainingService) {
      return res.status(503).json({ success: false, error: 'Training service unavailable' });
    }

    const { walletPubkey, agentMint, params, cid, file } = req.body || {};
    if (!walletPubkey || !agentMint) {
      return res.status(400).json({ success: false, error: 'walletPubkey and agentMint are required' });
    }

    // Verify NFT ownership on devnet
    const connection = trainingService.getConnection();
    const owns = await trainingService.verifyNftOwnership(connection, walletPubkey, agentMint);
    if (!owns) {
      return res.status(403).json({ success: false, error: 'Wallet does not own agent NFT on devnet' });
    }

    // IPFS handling: accept CID or pin uploaded file if configured
    let finalCid = cid;
    if (!finalCid && file?.name && file?.base64) {
      const pin = await trainingService.pinToIpfsIfConfigured(file.name, file.base64);
      if (pin.pinned) finalCid = pin.cid;
    }
    if (!finalCid) {
      return res.status(400).json({ success: false, error: 'IPFS CID missing and no file provided/pinned' });
    }

    // Optional head check (non-blocking)
    try { await trainingService.validateCidAvailability(finalCid); } catch (_) {}

    // Create a unique sessionId and write an on-chain memo as verifiable record
    const sessionId = trainingService.uuidv4();
    const payer = trainingService.loadServiceKeypair();
    const memoPayload = {
      kind: 'training_session_initiated',
      sessionId,
      walletPubkey,
      agentMint,
      cid: finalCid,
      params: params || {},
      ts: new Date().toISOString()
    };
    let signature = null;
    const DISABLE_MEMO = (process.env.DISABLE_MEMO_TX || 'false').toLowerCase() === 'true';
    if (!DISABLE_MEMO) {
      signature = await trainingService.sendMemoWithSession(connection, payer, memoPayload);
    }

    const record = {
      sessionId,
      walletPubkey,
      agentMint,
      cid: finalCid,
      params: params || {},
      status: 'initiated',
      tx: signature,
  explorer: signature ? trainingService.explorerTx(signature) : undefined,
      createdAt: new Date().toISOString()
    };

    trainingService.saveSession(record);

    // Structured console log
    console.log(JSON.stringify({
      level: 'info', service: 'nen-backend', endpoint: '/api/v1/training/sessions',
      message: 'Training session initiated',
      wallet: walletPubkey, agent: agentMint, sessionId, tx: signature, durationMs: Date.now() - startedAt
    }));

    return res.json({ success: true, ...record });
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error', service: 'nen-backend', endpoint: '/api/v1/training/sessions',
      message: error?.message || 'Internal error', stack: error?.stack, durationMs: Date.now() - startedAt
    }));
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

// GET /api/v1/training/sessions/:id
app.get('/api/v1/training/sessions/:id', async (req, res) => {
  try {
    if (!trainingService) {
      return res.status(503).json({ success: false, error: 'Training service unavailable' });
    }
    const session = trainingService.getSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    return res.json({ success: true, session });
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error', service: 'nen-backend', endpoint: '/api/v1/training/sessions/:id',
      message: error?.message || 'Internal error', stack: error?.stack
    }));
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

// Import and use training routes (User Story 7)
try {
  const trainingRoutes = require('./routes/training.js');
  app.use('/api/training', trainingRoutes);
  console.log('✅ Training routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load training routes:', error?.message);
  console.error('❌ Stack:', error?.stack);
}

// Error handling

// =========================
// User Story 4: Place Bet API (Solana Devnet)
// Wallet-signed flow: backend builds an unsigned transaction that the
// client signs and submits. No private keys from users ever touch backend.
// =========================
const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction } = require('@solana/web3.js');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Helper: Get devnet connection
function getDevnetConnection() {
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  return new Connection(rpc, 'confirmed');
}

// Deterministic per-match escrow keypair derived from secret seed in env
function deriveMatchEscrowKeypair(matchId) {
  const seedSecret = process.env.ESCROW_SEED_SECRET;
  if (!seedSecret) {
    throw new Error('ESCROW_SEED_SECRET not set');
  }
  const hash = crypto.createHash('sha256').update(`${seedSecret}:${matchId}`).digest();
  // Use first 32 bytes as seed
  const seed32 = hash.subarray(0, 32);
  return Keypair.fromSeed(seed32);
}

// Memo program id
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// Build a memo instruction
function buildMemoInstruction(message, payer) {
  const data = Buffer.from(message, 'utf8');
  return new (require('@solana/web3.js').TransactionInstruction)({
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data,
  });
}

// In-memory confirmed bets index (derived from on-chain confirmations)
const confirmedBets = new Map(); // key: matchId -> array of bets

// GET /api/betting/pools/:matchId -> real on-chain totals from escrow account + confirmed splits
app.get('/api/betting/pools/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = demoMatches.find(m => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    const connection = getDevnetConnection();
    const escrow = deriveMatchEscrowKeypair(matchId).publicKey;
    const balanceLamports = await connection.getBalance(escrow);

    // Aggregate splits from confirmed bets cache
    const bets = confirmedBets.get(matchId) || [];
    const agent1Pool = bets.filter(b => b.agentChoice === 1).reduce((s, b) => s + b.amountLamports, 0);
    const agent2Pool = bets.filter(b => b.agentChoice === 2).reduce((s, b) => s + b.amountLamports, 0);

    // Fallback: if no split data yet, divide evenly (display only) but keep total from chain
    const hasSplit = agent1Pool + agent2Pool > 0;
    const computedAgent1 = hasSplit ? agent1Pool : Math.floor(balanceLamports / 2);
    const computedAgent2 = hasSplit ? agent2Pool : balanceLamports - computedAgent1;
    const totalPool = balanceLamports;

    // Simple odds: total / side (floor for zero-safe)
    const oddsAgent1 = computedAgent1 > 0 ? totalPool / computedAgent1 : 2.0;
    const oddsAgent2 = computedAgent2 > 0 ? totalPool / computedAgent2 : 2.0;

    return res.json({
      success: true,
      data: {
        matchId,
        escrow: escrow.toBase58(),
        totalPool,
        agent1Pool: computedAgent1,
        agent2Pool: computedAgent2,
        oddsAgent1,
        oddsAgent2,
        betsCount: bets.length,
        minBet: match.bettingPool?.minBet ?? Math.floor(0.1 * LAMPORTS_PER_SOL),
        maxBet: match.bettingPool?.maxBet ?? Math.floor(100 * LAMPORTS_PER_SOL),
        isOpenForBetting: match.bettingPool?.isOpenForBetting ?? (match.status === 'upcoming' || match.status === 'live'),
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

// POST /api/bets/build-transaction -> returns unsigned tx for wallet to sign and send
app.post('/api/bets/build-transaction', async (req, res) => {
  const startedAt = Date.now();
  try {
    const { matchId, agentChoice, amountSol, userPubkey } = req.body || {};
    if (!matchId || !agentChoice || !amountSol || !userPubkey) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const match = demoMatches.find(m => m.id === matchId);
    if (!match || !match.bettingPool || !match.bettingPool.isOpenForBetting) {
      return res.status(400).json({ success: false, error: 'Match not open for betting' });
    }

    const minBet = (match.bettingPool.minBet || Math.floor(0.1 * LAMPORTS_PER_SOL)) / LAMPORTS_PER_SOL;
    const maxBet = (match.bettingPool.maxBet || Math.floor(100 * LAMPORTS_PER_SOL)) / LAMPORTS_PER_SOL;
    if (amountSol < minBet || amountSol > maxBet) {
      return res.status(400).json({ success: false, error: `Bet amount must be between ${minBet} and ${maxBet} SOL` });
    }

    const connection = getDevnetConnection();
    const payer = new PublicKey(userPubkey);
    const escrow = deriveMatchEscrowKeypair(matchId).publicKey;
    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

    // Check payer balance
    const balance = await connection.getBalance(payer);
    if (balance < lamports) {
      return res.status(400).json({ success: false, error: 'Insufficient SOL balance' });
    }

    const betId = uuidv4();
    const memoPayload = JSON.stringify({
      kind: 'bet_place',
      betId,
      matchId,
      agentChoice,
      amountLamports: lamports,
      ts: new Date().toISOString(),
    });

    const recent = await connection.getLatestBlockhash('confirmed');
    const tx = new Transaction({ feePayer: payer, recentBlockhash: recent.blockhash });
    tx.add(buildMemoInstruction(memoPayload, payer));
    tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: escrow, lamports }));

    const txSerialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');

    console.log(JSON.stringify({
      level: 'info', service: 'nen-backend', endpoint: '/api/bets/build-transaction',
      message: 'Built unsigned bet tx', matchId, agentChoice, amountSol, betId, escrow: escrow.toBase58(), durationMs: Date.now() - startedAt
    }));

    return res.json({
      success: true,
      betId,
      escrow: escrow.toBase58(),
      transactionBase64: txSerialized,
      recentBlockhash: recent.blockhash,
      lastValidBlockHeight: recent.lastValidBlockHeight,
      memo: memoPayload,
    });
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error', service: 'nen-backend', endpoint: '/api/bets/build-transaction',
      message: error?.message || 'Internal error', stack: error?.stack, durationMs: Date.now() - startedAt
    }));
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

// POST /api/bets/confirm -> verify signature on-chain and record split for odds
app.post('/api/bets/confirm', async (req, res) => {
  try {
    const { matchId, agentChoice, amountSol, userPubkey, signature } = req.body || {};
    if (!matchId || !agentChoice || !amountSol || !userPubkey || !signature) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const connection = getDevnetConnection();
    const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' });
    if (!tx || tx.meta?.err) {
      return res.status(400).json({ success: false, error: 'Transaction not found or failed' });
    }

    const escrow = deriveMatchEscrowKeypair(matchId).publicKey.toBase58();
    const payer = new PublicKey(userPubkey).toBase58();
    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

    // Validate transfer to escrow from payer
    const transferIx = tx.transaction.message.instructions.find(ix => {
      const parsed = ix; // ParsedInstruction
      return parsed.program === 'system' && parsed.parsed?.type === 'transfer' && parsed.parsed?.info;
    });
    if (!transferIx) {
      return res.status(400).json({ success: false, error: 'No transfer instruction found' });
    }
    const info = transferIx.parsed.info;
    if (info.destination !== escrow || info.source !== payer || parseInt(info.lamports, 10) !== lamports) {
      return res.status(400).json({ success: false, error: 'Transfer does not match expected bet details' });
    }

    const betRecord = {
      matchId,
      agentChoice,
      amountLamports: lamports,
      userPubkey: payer,
      signature,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      ts: new Date().toISOString(),
    };
    const list = confirmedBets.get(matchId) || [];
    list.push(betRecord);
    confirmedBets.set(matchId, list);

    return res.json({ success: true, bet: betRecord });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

// Deprecated insecure route guard
app.post('/api/bets', (req, res) => {
  return res.status(410).json({ success: false, error: 'Endpoint removed. Use /api/bets/build-transaction and wallet signing.' });
});

// POST /api/matches/:id/cancel -> auto-refund all bets if match canceled before start
app.post('/api/matches/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const match = demoMatches.find(m => m.id === id);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (match.status !== 'upcoming') {
      return res.status(400).json({ success: false, error: 'Refunds only allowed before match start' });
    }

    const bets = confirmedBets.get(id) || [];
    if (bets.length === 0) {
      match.status = 'cancelled';
      return res.json({ success: true, message: 'No bets to refund', refunds: [] });
    }

    const connection = getDevnetConnection();
    const escrowKeypair = deriveMatchEscrowKeypair(id);
    const refunds = [];
    for (const b of bets) {
      const tx = new Transaction().add(SystemProgram.transfer({
        fromPubkey: escrowKeypair.publicKey,
        toPubkey: new PublicKey(b.userPubkey),
        lamports: b.amountLamports,
      }));
      tx.feePayer = escrowKeypair.publicKey;
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      const signed = await (async () => { tx.sign(escrowKeypair); return tx; })();
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      await connection.confirmTransaction(sig, 'confirmed');
      refunds.push({ user: b.userPubkey, amountLamports: b.amountLamports, signature: sig, explorer: `https://explorer.solana.com/tx/${sig}?cluster=devnet` });
    }

    confirmedBets.delete(id);
    match.status = 'cancelled';

    return res.json({ success: true, refunds });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'API endpoint not found',
    timestamp: new Date().toISOString()
  });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  try {
    await new Promise((resolve) => {
      httpServer.listen(PORT, HOST, () => {
        console.log('🚀 NEN PLATFORM BACKEND STARTED');
        console.log('=' .repeat(40));
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Server: http://${HOST}:${PORT}`);
        console.log(`Health: http://${HOST}:${PORT}/health`);
        console.log(`Matches API: http://${HOST}:${PORT}/api/matches`);
        console.log('=' .repeat(40));
        resolve();
      });
    });
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start if run directly
if (require.main === module) {
  startServer().catch((error) => {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = { app, startServer, httpServer };
