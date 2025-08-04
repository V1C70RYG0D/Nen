import { Router } from 'express';
import { createError } from '../middleware/errorHandler';

const router = Router();

// NFT service instance
let nftServiceInstance: any = null;

function getNFTService() {
  if (!nftServiceInstance) {
    try {
      const { NFTService } = require('../services/NFTService');
      nftServiceInstance = new NFTService();
    } catch (error) {
      throw createError('NFT service unavailable', 503);
    }
  }
  return nftServiceInstance;
}

// GET /api/nft/marketplace - Get NFT marketplace listings
router.get('/marketplace', async (req, res, next) => {
  try {
    const { category, rarity, priceRange } = req.query;

    // Integrate with actual NFT marketplace via NFT service
    const nftService = getNFTService();
    const listings = await nftService.getMarketplaceListings({
      category,
      rarity,
      priceRange
    });

    if (!listings) {
      res.json([]);
      return;
    }

    res.json({
      success: true,
      listings,
      total: listings.length
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/nft/mint - Mint new NFT
router.post('/mint', async (req, res, next) => {
  try {
    const { type, agentId, attributes } = req.body;

    if (!type) {
      throw createError('NFT type required', 400);
    }

    const tokenId = `nft_${type}_${Date.now()}`;

    // Integrate with Metaplex for actual minting via NFT service
    const nftService = getNFTService();
    const mintResult = await nftService.mintNFT({
      type,
      agentId,
      attributes,
      tokenId
    });

    if (!mintResult.success) {
      res.status(400).json({ error: mintResult.message || 'Minting failed' });
      return;
    }

    res.json({
      success: true,
      nft: mintResult
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/nft/list - List NFT for sale
router.post('/list', async (req, res, next) => {
  try {
    const { tokenId, price, duration } = req.body;

    if (!tokenId || !price) {
      throw createError('Token ID and price required', 400);
    }

    if (price < 0.1) {
      throw createError('Minimum listing price is 0.1 SOL', 400);
    }

    // Integrate with marketplace smart contract via NFT service
    const nftService = getNFTService();
    const listing = await nftService.listForSale({ tokenId, price, duration });

    if (!listing.success) {
      res.status(400).json({ error: listing.message || 'Listing failed' });
      return;
    }

    res.json({
      success: true,
      listing
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/nft/buy/:tokenId - Buy NFT
router.post('/buy/:tokenId', async (req, res, next) => {
  try {
    const { tokenId } = req.params;
    const { price } = req.body;

    // Integrate with marketplace smart contract via NFT service
    const nftService = getNFTService();
    const purchase = await nftService.buyNFT({ tokenId, price });

    if (!purchase.success) {
      res.status(400).json({ error: purchase.message || 'Purchase failed' });
      return;
    }

    res.json({
      success: true,
      purchase
    });

    res.json({
      success: true,
      purchase
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/nft/collection/:userId - Get user's NFT collection
router.get('/collection/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Get user NFTs from blockchain/database via NFT service
    const nftService = getNFTService();
    const userNfts = await nftService.getUserNFTs(userId);

    if (!userNfts) {
      res.json([]);
      return;
    }
    const collection = [
      {
        tokenId: 'nft_agent_owned_001',
        name: 'Custom Phantom Agent',
        type: 'agent',
        rarity: 'uncommon',
        attributes: {
          winRate: 0.72,
          elo: 1650,
          customizations: ['opening_book_expanded', 'defensive_training']
        },
        acquiredAt: new Date(Date.now() - 7 * 86400000).toISOString()
      }
    ];

    res.json({
      success: true,
      collection,
      total: collection.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;
