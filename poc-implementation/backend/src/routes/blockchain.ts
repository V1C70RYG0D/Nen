import express from 'express';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { getDatabase } from '../config/database';
import { getRedisClient } from '../config/redis';

const router = express.Router();
const db = getDatabase();
const redis = getRedisClient();

// Initialize Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'),
  'confirmed'
);

/**
 * @swagger
 * components:
 *   schemas:
 *     BlockchainTransaction:
 *       type: object
 *       properties:
 *         signature:
 *           type: string
 *         status:
 *           type: string
 *         amount:
 *           type: number
 *         timestamp:
 *           type: string
 *         blockTime:
 *           type: number
 */

/**
 * @swagger
 * /api/blockchain/balance/{address}:
 *   get:
 *     summary: Get SOL balance for a wallet address
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: The Solana wallet address
 *     responses:
 *       200:
 *         description: Balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                 address:
 *                   type: string
 *                 lamports:
 *                   type: number
 *       400:
 *         description: Invalid address
 *       500:
 *         description: Server error
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Validate Solana address format
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(address);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid Solana address format' });
    }

    // Check cache first
    const cacheKey = `balance:${address}`;
    const cachedBalance = await redis.get(cacheKey);
    
    if (cachedBalance !== null) {
      logger.debug('Returning cached balance', { address, balance: cachedBalance });
      return res.json({
        balance: cachedBalance.balance,
        address,
        lamports: cachedBalance.lamports,
        cached: true
      });
    }

    // Fetch balance from Solana network
    const lamports = await connection.getBalance(publicKey);
    const balance = lamports / 1000000000; // Convert lamports to SOL

    const result = {
      balance,
      address,
      lamports
    };

    // Cache the result for 30 seconds
    await redis.set(cacheKey, result, 30);

    logger.info('Balance retrieved', { address, balance, lamports });
    res.json(result);

  } catch (error) {
    logger.error('Error getting balance:', error);
    res.status(500).json({ error: 'Failed to retrieve balance' });
  }
});

/**
 * @swagger
 * /api/blockchain/transactions/{address}:
 *   get:
 *     summary: Get transaction history for a wallet address
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: The Solana wallet address
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of transactions to retrieve
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *         description: Transaction signature to paginate before
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BlockchainTransaction'
 *                 address:
 *                   type: string
 *                 hasMore:
 *                   type: boolean
 *       400:
 *         description: Invalid address or parameters
 *       500:
 *         description: Server error
 */
router.get('/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 20, before } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Validate Solana address format
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(address);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid Solana address format' });
    }

    // Validate limit
    const transactionLimit = Math.min(Math.max(parseInt(limit as string) || 20, 1), 100);

    // Check cache first
    const cacheKey = `transactions:${address}:${transactionLimit}:${before || 'latest'}`;
    const cachedTransactions = await redis.get(cacheKey);
    
    if (cachedTransactions !== null) {
      logger.debug('Returning cached transactions', { address, count: cachedTransactions.transactions.length });
      return res.json({
        ...cachedTransactions,
        cached: true
      });
    }

    // Fetch transaction signatures
    const options: any = { limit: transactionLimit };
    if (before) {
      options.before = before;
    }

    const signatures = await connection.getSignaturesForAddress(publicKey, options);

    // Fetch transaction details
    const transactions = [];
    for (const sig of signatures) {
      const transaction = await connection.getTransaction(sig.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (transaction) {
        transactions.push({
          signature: sig.signature,
          status: sig.err ? 'failed' : 'success',
          blockTime: transaction.blockTime,
          timestamp: transaction.blockTime ? new Date(transaction.blockTime * 1000).toISOString() : null,
          fee: transaction.meta?.fee || 0,
          preBalances: transaction.meta?.preBalances || [],
          postBalances: transaction.meta?.postBalances || [],
        });
      }
    }

    const result = {
      transactions,
      address,
      hasMore: signatures.length === transactionLimit
    };

    // Cache the result for 60 seconds
    await redis.set(cacheKey, result, 60);

    logger.info('Transaction history retrieved', { address, count: transactions.length });
    res.json(result);

  } catch (error) {
    logger.error('Error getting transactions:', error);
    res.status(500).json({ error: 'Failed to retrieve transaction history' });
  }
});

/**
 * @swagger
 * /api/blockchain/transaction/{signature}:
 *   get:
 *     summary: Get details of a specific transaction
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: signature
 *         required: true
 *         schema:
 *           type: string
 *         description: The transaction signature
 *     responses:
 *       200:
 *         description: Transaction details retrieved successfully
 *       400:
 *         description: Invalid signature
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.get('/transaction/:signature', async (req, res) => {
  try {
    const { signature } = req.params;

    if (!signature) {
      return res.status(400).json({ error: 'Transaction signature is required' });
    }

    // Check cache first
    const cacheKey = `transaction:${signature}`;
    const cachedTransaction = await redis.get(cacheKey);
    
    if (cachedTransaction !== null) {
      logger.debug('Returning cached transaction', { signature });
      return res.json({
        ...cachedTransaction,
        cached: true
      });
    }

    // Fetch transaction from Solana network
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const result = {
      signature,
      blockTime: transaction.blockTime,
      timestamp: transaction.blockTime ? new Date(transaction.blockTime * 1000).toISOString() : null,
      slot: transaction.slot,
      fee: transaction.meta?.fee || 0,
      status: transaction.meta?.err ? 'failed' : 'success',
      error: transaction.meta?.err,
      preBalances: transaction.meta?.preBalances || [],
      postBalances: transaction.meta?.postBalances || [],
      logMessages: transaction.meta?.logMessages || [],
      instructions: transaction.transaction.message.instructions.map((inst, index) => ({
        programIdIndex: inst.programIdIndex,
        accountKeyIndexes: inst.accounts,
        data: inst.data,
        index
      }))
    };

    // Cache the result for 5 minutes
    await redis.set(cacheKey, result, 300);

    logger.info('Transaction details retrieved', { signature });
    res.json(result);

  } catch (error) {
    logger.error('Error getting transaction details:', error);
    res.status(500).json({ error: 'Failed to retrieve transaction details' });
  }
});

/**
 * @swagger
 * /api/blockchain/network/status:
 *   get:
 *     summary: Get Solana network status
 *     tags: [Blockchain]
 *     responses:
 *       200:
 *         description: Network status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slot:
 *                   type: number
 *                 blockHeight:
 *                   type: number
 *                 epochInfo:
 *                   type: object
 *                 health:
 *                   type: string
 *                 version:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.get('/network/status', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'network:status';
    const cachedStatus = await redis.get(cacheKey);
    
    if (cachedStatus !== null) {
      logger.debug('Returning cached network status');
      return res.json({
        ...cachedStatus,
        cached: true
      });
    }

    // Fetch network information
    const [slot, blockHeight, epochInfo, version] = await Promise.all([
      connection.getSlot('finalized'),
      connection.getBlockHeight('finalized'),
      connection.getEpochInfo('finalized'),
      connection.getVersion()
    ]);

    const result = {
      slot,
      blockHeight,
      epochInfo,
      version,
      health: 'ok',
      timestamp: new Date().toISOString()
    };

    // Cache the result for 10 seconds
    await redis.set(cacheKey, result, 10);

    logger.info('Network status retrieved', { slot, blockHeight });
    res.json(result);

  } catch (error) {
    logger.error('Error getting network status:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve network status',
      health: 'error'
    });
  }
});

/**
 * @swagger
 * /api/blockchain/validate/address:
 *   post:
 *     summary: Validate a Solana address
 *     tags: [Blockchain]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *                 description: The Solana address to validate
 *     responses:
 *       200:
 *         description: Address validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 address:
 *                   type: string
 *                 isOnCurve:
 *                   type: boolean
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/validate/address', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    let isValid = false;
    let isOnCurve = false;

    try {
      const publicKey = new PublicKey(address);
      isValid = true;
      isOnCurve = PublicKey.isOnCurve(publicKey);
    } catch (error) {
      isValid = false;
    }

    const result = {
      valid: isValid,
      address,
      isOnCurve
    };

    logger.info('Address validated', { address, valid: isValid, isOnCurve });
    res.json(result);

  } catch (error) {
    logger.error('Error validating address:', error);
    res.status(500).json({ error: 'Failed to validate address' });
  }
});

/**
 * @swagger
 * /api/blockchain/health:
 *   get:
 *     summary: Health check for blockchain connection
 *     tags: [Blockchain]
 *     responses:
 *       200:
 *         description: Blockchain connection is healthy
 *       503:
 *         description: Blockchain connection is unhealthy
 */
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Simple health check - get the latest slot
    await connection.getSlot('finalized');
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      responseTime,
      rpcUrl: connection.rpcEndpoint,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Blockchain health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware for blockchain routes
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Blockchain route error:', error);
  res.status(500).json({
    error: 'Blockchain service error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

export default router;
