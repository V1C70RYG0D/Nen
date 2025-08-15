/**
 * Minimal Backend Server for Rooms API
 * Production-ready implementation for battle room creation
 * Implements User Story 10 with real API endpoints
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

// Use real devnet room service for on-chain memo + persistence
const roomService = require(path.join(process.cwd(), 'src/services/rooms-devnet.js'));

const app = express();
const joinService = require(path.join(process.cwd(), 'src/services/join-room-devnet.js'));
const eventBus = require(path.join(process.cwd(), 'src/services/event-bus.js'));
const boltServiceProvider = () => {
  try {
    // Load compiled JS MagicBlockBOLTService for runtime
    const mod = require(path.join(process.cwd(), 'dist/services/MagicBlockBOLTService.js'));
    const { Connection, Keypair } = require('@solana/web3.js');
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    const kp = Keypair.generate();
    const provider = { wallet: { publicKey: kp.publicKey } };
    return new mod.MagicBlockBOLTService(connection, provider, console);
  } catch (e) {
    return null;
  }
};

// Middleware
app.use(cors({
  origin: ['http://127.0.0.1:3010', 'http://localhost:3010'],
  credentials: true
}));
app.use(express.json());
// Optional Socket.IO bridge if server is launched in an environment that attaches a socket server
let io = null;
try {
  // If an external module sets global.io, use it
  // eslint-disable-next-line no-undef
  if (global && global.io) io = global.io;
} catch (_) {}
let gameNs = null;
try {
  if (io) gameNs = io.of('/game');
} catch (_) {}

// Read-only cache for quick listing; source of truth is logs/rooms.json via service
let roomsCache = [];
function refreshRoomsCache() {
  try {
    roomsCache = roomService.listRooms();
  } catch (_) {
    roomsCache = [];
  }
}
refreshRoomsCache();

// Logger utility
const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data ? JSON.stringify(data, null, 2) : '')
};

// Error handler
const createError = (message, status = 500) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * POST /api/v1/rooms - Create a new battle room
 * Implements User Story 10 on-chain requirements
 */
app.post('/api/v1/rooms', async (req, res) => {
  try {
  const { settings, entry } = req.body;

    // Validate required fields
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Settings are required and must be an object'
      });
    }

  // Validate settings
    const validatedSettings = {
      timeControl: settings.timeControl || '10+5',
      boardVariant: settings.boardVariant || 'standard',
      tournamentMode: Boolean(settings.tournamentMode),
      allowSpectators: Boolean(settings.allowSpectators !== false), // Default to true
      createdAt: settings.createdAt || new Date().toISOString()
    };

    // Validate entry requirements
    const validatedEntry = {
      minElo: Math.max(0, Number(entry?.minElo) || 0),
      entryFeeSol: Math.max(0, Number(entry?.entryFeeSol) || 0),
      whitelistMint: entry?.whitelistMint?.trim() || ''
    };

    // Validate whitelist mint format if provided
    if (validatedEntry.whitelistMint) {
      const mintRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/;
      if (!mintRegex.test(validatedEntry.whitelistMint)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Solana mint address format'
        });
      }
    }

    // Create real devnet memo + persisted record via service
    const record = await roomService.createGameRoom({
      settings: validatedSettings,
      entry: validatedEntry,
      creator: req.body?.creator || 'api'
    });
    refreshRoomsCache();

    // Log room creation
    logger.info('Battle room created successfully', {
      sessionId: record.sessionId,
      roomCode: record.roomCode,
      settings: validatedSettings,
      entry: validatedEntry,
      signature: record.signature
    });

    // Simulate on-chain event emission
    logger.info('Room created event emitted on devnet', {
      event: 'room_created',
      sessionId: record.sessionId,
      memoSig: record.signature,
      explorer: record.explorer,
      network: 'devnet'
    });

  // Return success response
    res.status(201).json({
      success: true,
      room: {
        sessionId: record.sessionId,
        roomCode: record.roomCode,
        status: record.status,
        settings: record.settings,
        entry: record.entry,
        createdAt: record.createdAt,
        // 24h expiry policy for waiting rooms
        expiresAt: new Date(new Date(record.createdAt).getTime() + 24*60*60*1000).toISOString(),
        playersCount: 0,
        maxPlayers: 2,
        explorer: record.explorer,
    magicBlock: record.rollup,
    anchorSig: record.anchorSig || null,
    sessionPda: record.sessionPda || null,
    anchorExplorer: record.anchorExplorer || null
      }
    });

  } catch (error) {
    logger.error('Error creating battle room', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/rooms/:sessionId - Get room details
 */
app.get('/api/v1/rooms/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

  const record = roomService.readRoomBySessionId(sessionId);

  if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if room has expired
  const expiresAt = new Date(new Date(record.createdAt).getTime() + 24*60*60*1000);
  if (expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        error: 'Room has expired'
      });
    }

    res.json({
      success: true,
      room: {
        sessionId: record.sessionId,
        roomCode: record.roomCode,
        status: record.status,
        settings: record.settings,
        entry: record.entry,
        createdAt: record.createdAt,
        expiresAt: expiresAt.toISOString(),
        players: [],
        playersCount: 0,
        maxPlayers: 2,
        spectators: 0,
        explorer: record.explorer,
        magicBlock: record.rollup
      }
    });

  } catch (error) {
    logger.error('Error getting room details', {
      error: error.message,
      sessionId: req.params.sessionId
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/rooms/code/:roomCode - Lookup room by human-readable code
 */
app.get('/api/v1/rooms/code/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    if (!roomCode) {
      return res.status(400).json({ success: false, error: 'Room code is required' });
    }
    const record = roomService.readRoomBySessionId(roomCode) || roomService.readRoomByCode?.(roomCode);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    const expiresAt = new Date(new Date(record.createdAt).getTime() + 24*60*60*1000);
    if (expiresAt < new Date()) {
      return res.status(410).json({ success: false, error: 'Room has expired' });
    }
    return res.json({ success: true, room: record });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Internal server error' });
  }
});

/**
 * GET /api/v1/rooms - List active rooms
 */
app.get('/api/v1/rooms', async (req, res) => {
  try {
  const { status, page = 1, limit = 10, variant, aiDifficulty } = req.query;

    // Filter rooms
    refreshRoomsCache();
    let filteredRooms = roomsCache.map(r => ({
      sessionId: r.sessionId,
      roomCode: r.roomCode,
      status: r.status,
      settings: r.settings,
      entry: r.entry,
      createdAt: r.createdAt
    }));

    // Remove expired rooms
    const now = new Date();
    filteredRooms = filteredRooms.filter(room => {
      const exp = new Date(new Date(room.createdAt).getTime() + 24*60*60*1000);
      return exp >= now;
    });

    // Filter by status if provided
    if (status && typeof status === 'string') {
      filteredRooms = filteredRooms.filter(room => room.status === status);
    }

    // Filter by rule variations (board variant)
    if (variant && typeof variant === 'string') {
      filteredRooms = filteredRooms.filter(room => (room.settings?.boardVariant || '').toLowerCase() === variant.toLowerCase());
    }

    // Filter by AI difficulty if encoded in settings
    if (aiDifficulty && typeof aiDifficulty === 'string') {
      filteredRooms = filteredRooms.filter(room => (room.settings?.aiDifficulty || '').toLowerCase() === aiDifficulty.toLowerCase());
    }

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit))); // Max 50 rooms per page
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;

    const paginatedRooms = filteredRooms.slice(startIndex, endIndex);

    // Map to public room data
    const publicRooms = paginatedRooms.map(room => ({
      sessionId: room.sessionId,
      roomCode: room.roomCode,
      status: room.status,
      settings: {
        timeControl: room.settings.timeControl,
        boardVariant: room.settings.boardVariant,
        tournamentMode: room.settings.tournamentMode,
  allowSpectators: room.settings.allowSpectators,
  aiDifficulty: room.settings.aiDifficulty || null
      },
      entry: {
        minElo: room.entry.minElo,
        entryFeeSol: room.entry.entryFeeSol,
        hasWhitelist: Boolean(room.entry.whitelistMint)
      },
      playersCount: 0,
      maxPlayers: 2,
      spectatorsCount: 0,
      createdAt: room.createdAt,
      expiresAt: new Date(new Date(room.createdAt).getTime() + 24*60*60*1000).toISOString()
    }));

    res.json({
      success: true,
      rooms: publicRooms,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredRooms.length,
        totalPages: Math.ceil(filteredRooms.length / limitNum),
        hasNext: endIndex < filteredRooms.length,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    logger.error('Error listing rooms', {
      error: error.message,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/rooms/:sessionId/move - Process a move via BOLT ECS + rollup logging
 * Body: { userPubkey: string, move: { fromX, fromY, fromLevel, toX, toY, toLevel, pieceType } }
 */
app.post('/api/v1/rooms/:sessionId/move', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userPubkey, move } = req.body || {};
    if (!sessionId || !userPubkey || !move) {
      return res.status(400).json({ success: false, error: 'sessionId, userPubkey, move are required' });
    }

    const roomSvc = require(path.join(process.cwd(), 'src/services/rooms-devnet.js'));
    const record = roomSvc.readRoomBySessionId(sessionId);
    if (!record) return res.status(404).json({ success: false, error: 'Room not found' });
    const allowed = (record.permissions?.players || []);
    if (!allowed.includes(userPubkey)) {
      return res.status(403).json({ success: false, error: 'User not permitted to submit moves for this session' });
    }

    // Delegate to move service
    const moveService = require(path.join(process.cwd(), 'src/services/move-service.js'));
    const result = await moveService.processMove({ sessionId, userPubkey, move });

    // Emit WS events if available
    if (io) {
      try {
        const evt = { sessionId, userPubkey, move, moveHash: result.moveHash, latencyMs: result.latencyMs, totalMoves: result.totalMoves };
        io.to(sessionId).emit('game:move_applied', evt);
        if (gameNs) gameNs.to(`game_${sessionId}`).emit('game:move_applied', evt);
        if (result.ended) {
          const endEvt = { sessionId, userPubkey, result: result.result, settlement: result.settlement };
          io.to(sessionId).emit('game:ended', endEvt);
          if (gameNs) gameNs.to(`game_${sessionId}`).emit('game:ended', endEvt);
        }
      } catch (_) {}
    }

    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error?.message || 'Move processing failed' });
  }
});

/**
 * POST /api/v1/rooms/:sessionId/valid-moves - Get valid destination squares for a selected piece
 * Body: { userPubkey: string, fromX, fromY, fromLevel, pieceType }
 */
app.post('/api/v1/rooms/:sessionId/valid-moves', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userPubkey, fromX, fromY, fromLevel, pieceType } = req.body || {};
    if (!sessionId || !userPubkey || typeof fromX !== 'number' || typeof fromY !== 'number' || typeof fromLevel !== 'number' || !pieceType) {
      return res.status(400).json({ success: false, error: 'sessionId, userPubkey, fromX, fromY, fromLevel, pieceType are required' });
    }
    const record = roomService.readRoomBySessionId(sessionId);
    if (!record) return res.status(404).json({ success: false, error: 'Room not found' });
    const allowed = (record.permissions?.players || []);
    if (!allowed.includes(userPubkey)) return res.status(403).json({ success: false, error: 'Not permitted' });

  // Delegate to move-service getValidMoves to avoid depending on TS build artifacts
  const moveService = require(path.join(process.cwd(), 'src/services/move-service.js'));
  const result = await moveService.getValidMoves({ sessionId, userPubkey, fromX, fromY, fromLevel, pieceType });
  return res.json({ success: true, destinations: result.destinations || [] });
  } catch (error) {
    return res.status(400).json({ success: false, error: error?.message || 'Failed to compute valid moves' });
  }
});

/**
 * GET /api/v1/rooms/:sessionId/state - Return snapshot of world state for clients
 */
app.get('/api/v1/rooms/:sessionId/state', async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId required' });
    const record = roomService.readRoomBySessionId(sessionId);
    if (!record) return res.status(404).json({ success: false, error: 'Room not found' });
  const moveService = require(path.join(process.cwd(), 'src/services/move-service.js'));
  const state = await moveService.getWorldStateSnapshot(sessionId).catch(() => null);
  return res.json({ success: true, state: state || {} });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load state' });
  }
});

/**
 * POST /api/v1/rooms/:sessionId/move/undo - Undo the last move within 10 seconds by its author
 * Body: { userPubkey: string }
 */
app.post('/api/v1/rooms/:sessionId/move/undo', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userPubkey } = req.body || {};
    if (!sessionId || !userPubkey) {
      return res.status(400).json({ success: false, error: 'sessionId and userPubkey are required' });
    }
    const moveService = require(path.join(process.cwd(), 'src/services/move-service.js'));
    const result = await moveService.undoLastMove({ sessionId, userPubkey });
    if (io) {
      try {
        const evt = { sessionId, userPubkey, totalMoves: result.totalMoves };
        io.to(sessionId).emit('game:move_undone', evt);
        if (gameNs) gameNs.to(`game_${sessionId}`).emit('game:move_undone', evt);
      } catch (_) {}
    }
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error?.message || 'Undo failed' });
  }
});

/**
 * POST /api/v1/rooms/:sessionId/resign - Resign and finalize the match
 * Body: { userPubkey: string }
 */
app.post('/api/v1/rooms/:sessionId/resign', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userPubkey } = req.body || {};
    if (!sessionId || !userPubkey) {
      return res.status(400).json({ success: false, error: 'sessionId and userPubkey are required' });
    }
    const moveService = require(path.join(process.cwd(), 'src/services/move-service.js'));
    const result = await moveService.resignGame({ sessionId, userPubkey });
    if (io) {
      try {
        const evt = { sessionId, userPubkey, result: result.result, settlement: result.settlement };
        io.to(sessionId).emit('game:ended', evt);
        if (gameNs) gameNs.to(`game_${sessionId}`).emit('game:ended', evt);
      } catch (_) {}
    }
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error?.message || 'Resign failed' });
  }
});

/**
 * POST /api/v1/rooms/:sessionId/join/build-tx - Build unsigned join tx for wallet signing
 * - Verifies whitelist and balance
 * - Returns base64 transaction (Memo + optional transfer to deterministic escrow)
 */
app.post('/api/v1/rooms/:sessionId/join/build-tx', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userPubkey } = req.body || {};
    if (!sessionId || !userPubkey) {
      return res.status(400).json({ success: false, error: 'sessionId and userPubkey are required' });
    }
    const built = await joinService.buildJoinTransaction({ sessionId, userPubkey });
    return res.json({ success: true, ...built });
  } catch (error) {
    return res.status(400).json({ success: false, error: error?.message || 'Failed to build join transaction' });
  }
});

/**
 * POST /api/v1/rooms/:sessionId/join/confirm - Confirm a signed join tx by signature
 * - Checks on-chain transaction contents
 * - Updates room status when full
 */
app.post('/api/v1/rooms/:sessionId/join/confirm', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userPubkey, signature } = req.body || {};
    if (!sessionId || !userPubkey || !signature) {
      return res.status(400).json({ success: false, error: 'sessionId, userPubkey, signature are required' });
    }
    const result = await joinService.confirmJoin({ sessionId, userPubkey, signature });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error?.message || 'Failed to confirm join' });
  }
});

/**
 * GET /api/v1/rooms/:sessionId/escrow - Get deterministic escrow address for a room
 */
app.get('/api/v1/rooms/:sessionId/escrow', (req, res) => {
  try {
    const { sessionId } = req.params;
    const escrow = joinService.getEscrowAddress(sessionId);
    return res.json({ success: true, sessionId, escrow });
  } catch (error) {
    return res.status(400).json({ success: false, error: error?.message || 'Failed to derive escrow' });
  }
});

/**
 * GET /api/v1/rooms/:sessionId/countdown - Get match countdown state if present
 */
app.get('/api/v1/rooms/:sessionId/countdown', (req, res) => {
  try {
    const { sessionId } = req.params;
    const record = roomService.readRoomBySessionId(sessionId);
    if (!record) return res.status(404).json({ success: false, error: 'Room not found' });
    const countdown = record.countdown || null;
    return res.json({ success: true, sessionId, countdown });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  refreshRoomsCache();
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    rooms: {
      total: roomsCache.length,
      active: roomsCache.filter(room => room.status === 'waiting' || room.status === 'ready').length
    }
  });
});

// Event bus listeners (placeholder for websockets)
eventBus.on('room:countdown_started', (evt) => {
  logger.info('Countdown started', evt);
  if (io) {
    try {
      // Emit to generic and game namespace rooms
      io.to(evt.sessionId).emit('room:countdown_started', evt);
      if (gameNs) gameNs.to(`game_${evt.sessionId}`).emit('room:countdown_started', evt);
    } catch (_) {}
  }
});

eventBus.on('room:activated', async (evt) => {
  logger.info('Room activated event', evt);
  try {
    const mb = require(path.join(process.cwd(), 'src/services/magicblock-client.js'));
    const start = await mb.startRollupForSession(evt.sessionId);
    const ready = await mb.waitUntilRollupReady(start.rollupId).catch(() => null);
    // Update persisted room to reflect started rollup
    const roomSvc = require(path.join(process.cwd(), 'src/services/rooms-devnet.js'));
    roomSvc.updateRoom(evt.sessionId, (r) => {
      r.rollup = r.rollup || {};
      r.rollup.status = ready ? 'ready' : 'starting';
      r.rollup.endpoint = start.endpoint;
      r.rollup.rollupId = start.rollupId;
      r.rollup.readyAt = ready?.readyAt || null;
      return r;
    });
    logger.info('Rollup started for room', { sessionId: evt.sessionId, endpoint: start.endpoint, rollupId: start.rollupId, ready: !!ready });
    if (io) {
      try {
        io.to(evt.sessionId).emit('room:rollup_started', { sessionId: evt.sessionId, endpoint: start.endpoint, rollupId: start.rollupId, ready: !!ready });
        if (gameNs) gameNs.to(`game_${evt.sessionId}`).emit('room:rollup_started', { sessionId: evt.sessionId, endpoint: start.endpoint, rollupId: start.rollupId, ready: !!ready });
      } catch (_) {}
    }
  } catch (e) {
    logger.error('Failed to start rollup on activation', { sessionId: evt.sessionId, error: e.message });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.originalUrl,
    method: req.method
  });

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3011;
const HOST = process.env.HOST || process.env.BACKEND_HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  logger.info('🚀 Nen Platform Rooms API Server started', {
    host: HOST,
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: `http://${HOST}:${PORT}/health`,
      createRoom: `http://${HOST}:${PORT}/api/v1/rooms`,
      listRooms: `http://${HOST}:${PORT}/api/v1/rooms`,
      roomDetails: `http://${HOST}:${PORT}/api/v1/rooms/:sessionId`
    }
  });
});

module.exports = app;
