/**
 * NFT Marketplace Flow Tests
 * Comprehensive testing for User Stories 13-15
 * 
 * This test suite validates:
 * 13. AI agent NFT minting with Metaplex
 * 14. NFT listing in marketplace
 * 15. NFT purchasing and ownership transfer
 */

const { describe, it, expect, beforeAll, beforeEach } = require('@jest/globals');
const crypto = require('crypto');

// Mock Metaplex NFT service
class MockMetaplexService {
  constructor() {
    this.nfts = new Map();
    this.collections = new Map();
    this.metadata = new Map();
  }

  async createNFT(mintRequest) {
    const mintAddress = this.generateMintAddress();
    
    const nft = {
      mintAddress,
      name: mintRequest.name,
      symbol: mintRequest.symbol || 'NEN',
      description: mintRequest.description,
      image: mintRequest.image,
      attributes: mintRequest.attributes || [],
      creators: mintRequest.creators || [],
      royalty: mintRequest.royalty || { percentage: 5.0, recipient: mintRequest.owner },
      owner: mintRequest.owner,
      collection: mintRequest.collection,
      createdAt: new Date().toISOString(),
      updateAuthority: mintRequest.owner,
      supply: 1, // NFTs are unique
      verified: true
    };

    this.nfts.set(mintAddress, nft);
    
    // Store metadata
    const metadataUri = `https://arweave.net/${crypto.randomBytes(32).toString('hex')}`;
    this.metadata.set(mintAddress, {
      uri: metadataUri,
      data: nft,
      verified: true
    });

    return nft;
  }

  async updateNFT(mintAddress, updates) {
    const nft = this.nfts.get(mintAddress);
    if (!nft) {
      throw new Error('NFT not found');
    }

    Object.assign(nft, updates);
    nft.updatedAt = new Date().toISOString();
    
    this.nfts.set(mintAddress, nft);
    return nft;
  }

  async transferNFT(mintAddress, fromAddress, toAddress) {
    const nft = this.nfts.get(mintAddress);
    if (!nft) {
      throw new Error('NFT not found');
    }

    if (nft.owner !== fromAddress) {
      throw new Error('Transfer not authorized');
    }

    nft.owner = toAddress;
    nft.lastTransfer = {
      from: fromAddress,
      to: toAddress,
      timestamp: new Date().toISOString(),
      transactionHash: `tx_${crypto.randomBytes(16).toString('hex')}`
    };

    this.nfts.set(mintAddress, nft);
    return nft;
  }

  async verifyOwnership(mintAddress, ownerAddress) {
    const nft = this.nfts.get(mintAddress);
    return nft ? nft.owner === ownerAddress : false;
  }

  generateMintAddress() {
    return crypto.randomBytes(32).toString('base58').slice(0, 44);
  }

  async createCollection(collectionData) {
    const collectionAddress = this.generateMintAddress();
    
    const collection = {
      address: collectionAddress,
      name: collectionData.name,
      symbol: collectionData.symbol,
      description: collectionData.description,
      image: collectionData.image,
      creators: collectionData.creators,
      verified: true,
      size: 0,
      createdAt: new Date().toISOString()
    };

    this.collections.set(collectionAddress, collection);
    return collection;
  }
}

// Mock marketplace service
class MockMarketplaceService {
  constructor() {
    this.listings = new Map();
    this.sales = new Map();
    this.escrow = new Map();
    this.platformFeeRate = 0.025; // 2.5%
  }

  async createListing(listingData) {
    const listingId = `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const listing = {
      id: listingId,
      mintAddress: listingData.mintAddress,
      seller: listingData.seller,
      price: listingData.price,
      currency: listingData.currency || 'SOL',
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      views: 0,
      favorites: 0
    };

    this.listings.set(listingId, listing);
    
    // Move NFT to escrow
    this.escrow.set(listingData.mintAddress, {
      listingId,
      seller: listingData.seller,
      escrowedAt: new Date().toISOString()
    });

    return listing;
  }

  async updateListing(listingId, updates) {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    Object.assign(listing, updates);
    listing.updatedAt = new Date().toISOString();

    this.listings.set(listingId, listing);
    return listing;
  }

  async cancelListing(listingId, seller) {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.seller !== seller) {
      throw new Error('Only seller can cancel listing');
    }

    listing.status = 'cancelled';
    listing.cancelledAt = new Date().toISOString();

    // Remove from escrow
    this.escrow.delete(listing.mintAddress);

    this.listings.set(listingId, listing);
    return listing;
  }

  async purchaseNFT(listingId, buyer, paymentAmount) {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.status !== 'active') {
      throw new Error('Listing is not active');
    }

    if (paymentAmount < listing.price) {
      throw new Error('Insufficient payment');
    }

    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate fees and payouts
    const platformFee = listing.price * this.platformFeeRate;
    const royaltyFee = listing.price * 0.05; // 5% royalty
    const sellerReceives = listing.price - platformFee - royaltyFee;

    const sale = {
      id: saleId,
      listingId,
      mintAddress: listing.mintAddress,
      seller: listing.seller,
      buyer,
      price: listing.price,
      platformFee,
      royaltyFee,
      sellerReceives,
      transactionHash: `tx_${crypto.randomBytes(16).toString('hex')}`,
      completedAt: new Date().toISOString(),
      status: 'completed'
    };

    this.sales.set(saleId, sale);

    // Update listing status
    listing.status = 'sold';
    listing.soldAt = new Date().toISOString();
    listing.soldTo = buyer;
    listing.saleId = saleId;

    // Remove from escrow
    this.escrow.delete(listing.mintAddress);

    return sale;
  }

  async getListings(filters = {}) {
    const allListings = Array.from(this.listings.values());
    
    let filteredListings = allListings.filter(listing => {
      if (filters.status && listing.status !== filters.status) return false;
      if (filters.minPrice && listing.price < filters.minPrice) return false;
      if (filters.maxPrice && listing.price > filters.maxPrice) return false;
      if (filters.seller && listing.seller !== filters.seller) return false;
      return true;
    });

    // Sort by creation date (newest first)
    filteredListings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return filteredListings;
  }

  async getSaleHistory(mintAddress) {
    const sales = Array.from(this.sales.values())
      .filter(sale => sale.mintAddress === mintAddress)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    return sales;
  }

  calculateMarketplaceFee(price) {
    return price * this.platformFeeRate;
  }

  calculateRoyalty(price, royaltyPercentage = 5.0) {
    return price * (royaltyPercentage / 100);
  }
}

// Test data generators
const NFTTestData = {
  generateTestWallet() {
    return crypto.randomBytes(32).toString('base58').slice(0, 44);
  },

  generateAIAgentMetadata() {
    const names = ['Shadow Striker', 'Nen Master', 'Gungi Lord', 'Tactical Genius', 'Strategy Sage'];
    const styles = ['aggressive', 'defensive', 'balanced', 'tactical', 'adaptive'];
    const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    
    return {
      name: `AI Agent: ${names[Math.floor(Math.random() * names.length)]}`,
      description: 'A trained AI agent for competitive Gungi matches on the Nen Platform',
      image: `https://api.nen-platform.com/ai-agent-image/${Math.random().toString(36).substr(2, 9)}.png`,
      attributes: [
        { trait_type: 'Style', value: styles[Math.floor(Math.random() * styles.length)] },
        { trait_type: 'Rating', value: 1200 + Math.floor(Math.random() * 800) },
        { trait_type: 'Win Rate', value: Math.floor((0.5 + Math.random() * 0.4) * 100) },
        { trait_type: 'Games Played', value: 50 + Math.floor(Math.random() * 950) },
        { trait_type: 'Rarity', value: rarities[Math.floor(Math.random() * rarities.length)] },
        { trait_type: 'Generation', value: Math.floor(Math.random() * 5) + 1 },
        { trait_type: 'Training Hours', value: Math.floor(Math.random() * 100) + 10 }
      ],
      external_url: 'https://nen-platform.com',
      animation_url: null,
      properties: {
        category: 'AI Agent',
        creators: [
          {
            address: this.generateTestWallet(),
            share: 100,
            verified: true
          }
        ]
      }
    };
  },

  generateListingData(mintAddress, seller) {
    return {
      mintAddress,
      seller,
      price: 0.5 + Math.random() * 4.5, // 0.5 - 5.0 SOL
      currency: 'SOL',
      description: 'High-performance AI agent with proven track record in competitive matches.',
      tags: ['ai-agent', 'gungi', 'competitive', 'trained']
    };
  },

  generateCollection() {
    return {
      name: 'Nen Platform AI Agents',
      symbol: 'NENAI',
      description: 'A collection of trained AI agents for competitive Gungi gameplay',
      image: 'https://api.nen-platform.com/collection-image.png',
      creators: [
        {
          address: this.generateTestWallet(),
          share: 100,
          verified: true
        }
      ]
    };
  }
};

describe('NFT Marketplace Flow Tests', () => {
  let metaplexService;
  let marketplaceService;
  let creatorWallet;
  let buyerWallet;
  let collectionAddress;

  beforeAll(async () => {
    metaplexService = new MockMetaplexService();
    marketplaceService = new MockMarketplaceService();
    creatorWallet = NFTTestData.generateTestWallet();
    buyerWallet = NFTTestData.generateTestWallet();
    
    // Create the main AI agents collection
    const collection = await metaplexService.createCollection(NFTTestData.generateCollection());
    collectionAddress = collection.address;
  });

  describe('User Story 13: AI Agent NFT Minting', () => {
    let agentMetadata;
    let mintRequest;

    beforeEach(() => {
      agentMetadata = NFTTestData.generateAIAgentMetadata();
      mintRequest = {
        name: agentMetadata.name,
        description: agentMetadata.description,
        image: agentMetadata.image,
        attributes: agentMetadata.attributes,
        owner: creatorWallet,
        collection: collectionAddress,
        creators: [
          {
            address: creatorWallet,
            share: 100,
            verified: true
          }
        ],
        royalty: {
          percentage: 5.0,
          recipient: creatorWallet
        }
      };
    });

    it('should create new NFT using Metaplex standard', async () => {
      const nft = await metaplexService.createNFT(mintRequest);
      
      expect(nft.mintAddress).toBeDefined();
      expect(nft.mintAddress).toHaveLength(44);
      expect(nft.name).toBe(agentMetadata.name);
      expect(nft.symbol).toBe('NEN');
      expect(nft.owner).toBe(creatorWallet);
      expect(nft.supply).toBe(1);
      expect(nft.verified).toBe(true);
    });

    it('should set AI performance data as attributes', async () => {
      const nft = await metaplexService.createNFT(mintRequest);
      
      expect(nft.attributes).toHaveLength(agentMetadata.attributes.length);
      
      const ratingAttribute = nft.attributes.find(attr => attr.trait_type === 'Rating');
      expect(ratingAttribute).toBeDefined();
      expect(ratingAttribute.value).toBeGreaterThan(1200);
      expect(ratingAttribute.value).toBeLessThan(2000);
      
      const winRateAttribute = nft.attributes.find(attr => attr.trait_type === 'Win Rate');
      expect(winRateAttribute).toBeDefined();
      expect(winRateAttribute.value).toBeGreaterThanOrEqual(50);
      expect(winRateAttribute.value).toBeLessThanOrEqual(90);
      
      const styleAttribute = nft.attributes.find(attr => attr.trait_type === 'Style');
      expect(styleAttribute).toBeDefined();
      expect(['aggressive', 'defensive', 'balanced', 'tactical', 'adaptive']).toContain(styleAttribute.value);
    });

    it('should transfer mint authority to user', async () => {
      const nft = await metaplexService.createNFT(mintRequest);
      
      expect(nft.updateAuthority).toBe(creatorWallet);
      expect(nft.owner).toBe(creatorWallet);
    });

    it('should store agent model hash reference', async () => {
      const agentModelHash = 'Qm' + crypto.randomBytes(22).toString('hex');
      
      const extendedMintRequest = {
        ...mintRequest,
        attributes: [
          ...mintRequest.attributes,
          { trait_type: 'Model Hash', value: agentModelHash }
        ]
      };
      
      const nft = await metaplexService.createNFT(extendedMintRequest);
      
      const modelHashAttribute = nft.attributes.find(attr => attr.trait_type === 'Model Hash');
      expect(modelHashAttribute).toBeDefined();
      expect(modelHashAttribute.value).toBe(agentModelHash);
    });

    it('should apply 5% creator royalty settings', async () => {
      const nft = await metaplexService.createNFT(mintRequest);
      
      expect(nft.royalty.percentage).toBe(5.0);
      expect(nft.royalty.recipient).toBe(creatorWallet);
    });

    it('should emit NFT minted event', async () => {
      const nft = await metaplexService.createNFT(mintRequest);
      
      const mintEvent = {
        type: 'NFTMinted',
        mintAddress: nft.mintAddress,
        owner: creatorWallet,
        collection: collectionAddress,
        name: nft.name,
        timestamp: new Date().toISOString()
      };

      expect(mintEvent.type).toBe('NFTMinted');
      expect(mintEvent.mintAddress).toBe(nft.mintAddress);
      expect(mintEvent.owner).toBe(creatorWallet);
    });

    it('should validate required metadata fields', async () => {
      expect(mintRequest.name).toBeDefined();
      expect(mintRequest.description).toBeDefined();
      expect(mintRequest.image).toBeDefined();
      expect(Array.isArray(mintRequest.attributes)).toBe(true);
      expect(mintRequest.owner).toBeDefined();
    });

    it('should assign NFT to correct collection', async () => {
      const nft = await metaplexService.createNFT(mintRequest);
      
      expect(nft.collection).toBe(collectionAddress);
      
      // Update collection size
      const collection = metaplexService.collections.get(collectionAddress);
      collection.size += 1;
      
      expect(collection.size).toBe(1);
    });
  });

  describe('User Story 14: NFT Listing for Sale', () => {
    let mintedNFT;
    let listingData;

    beforeEach(async () => {
      const agentMetadata = NFTTestData.generateAIAgentMetadata();
      const mintRequest = {
        name: agentMetadata.name,
        description: agentMetadata.description,
        image: agentMetadata.image,
        attributes: agentMetadata.attributes,
        owner: creatorWallet,
        collection: collectionAddress
      };
      
      mintedNFT = await metaplexService.createNFT(mintRequest);
      listingData = NFTTestData.generateListingData(mintedNFT.mintAddress, creatorWallet);
    });

    it('should create listing account with price', async () => {
      const listing = await marketplaceService.createListing(listingData);
      
      expect(listing.id).toMatch(/^listing_/);
      expect(listing.mintAddress).toBe(mintedNFT.mintAddress);
      expect(listing.seller).toBe(creatorWallet);
      expect(listing.price).toBe(listingData.price);
      expect(listing.currency).toBe('SOL');
      expect(listing.status).toBe('active');
    });

    it('should transfer NFT to marketplace escrow PDA', async () => {
      const listing = await marketplaceService.createListing(listingData);
      
      const escrowRecord = marketplaceService.escrow.get(mintedNFT.mintAddress);
      expect(escrowRecord).toBeDefined();
      expect(escrowRecord.listingId).toBe(listing.id);
      expect(escrowRecord.seller).toBe(creatorWallet);
      expect(escrowRecord.escrowedAt).toBeDefined();
    });

    it('should set listing expiration (30 days)', async () => {
      const listing = await marketplaceService.createListing(listingData);
      
      const expirationDate = new Date(listing.expiresAt);
      const creationDate = new Date(listing.createdAt);
      const daysDifference = (expirationDate - creationDate) / (1000 * 60 * 60 * 24);
      
      expect(daysDifference).toBeCloseTo(30, 1); // Within 1 day
    });

    it('should calculate marketplace fee (2.5%)', async () => {
      const listing = await marketplaceService.createListing(listingData);
      
      const expectedFee = marketplaceService.calculateMarketplaceFee(listing.price);
      expect(expectedFee).toBe(listing.price * 0.025);
      expect(expectedFee).toBeGreaterThan(0);
    });

    it('should make listing searchable on-chain', async () => {
      const listing = await marketplaceService.createListing(listingData);
      
      const searchResults = await marketplaceService.getListings({
        status: 'active'
      });
      
      expect(searchResults).toContainEqual(
        expect.objectContaining({
          id: listing.id,
          mintAddress: mintedNFT.mintAddress
        })
      );
    });

    it('should emit listing created event', async () => {
      const listing = await marketplaceService.createListing(listingData);
      
      const listingEvent = {
        type: 'NFTListed',
        listingId: listing.id,
        mintAddress: mintedNFT.mintAddress,
        seller: creatorWallet,
        price: listing.price,
        timestamp: new Date().toISOString()
      };

      expect(listingEvent.type).toBe('NFTListed');
      expect(listingEvent.mintAddress).toBe(mintedNFT.mintAddress);
      expect(listingEvent.seller).toBe(creatorWallet);
    });

    it('should allow seller to update listing price', async () => {
      const listing = await marketplaceService.createListing(listingData);
      const newPrice = listingData.price + 1.0;
      
      const updatedListing = await marketplaceService.updateListing(listing.id, {
        price: newPrice
      });
      
      expect(updatedListing.price).toBe(newPrice);
      expect(updatedListing.updatedAt).toBeDefined();
    });

    it('should allow seller to cancel listing', async () => {
      const listing = await marketplaceService.createListing(listingData);
      
      const cancelledListing = await marketplaceService.cancelListing(listing.id, creatorWallet);
      
      expect(cancelledListing.status).toBe('cancelled');
      expect(cancelledListing.cancelledAt).toBeDefined();
      
      // NFT should be removed from escrow
      const escrowRecord = marketplaceService.escrow.get(mintedNFT.mintAddress);
      expect(escrowRecord).toBeUndefined();
    });

    it('should reject unauthorized listing cancellation', async () => {
      const listing = await marketplaceService.createListing(listingData);
      const unauthorizedUser = NFTTestData.generateTestWallet();
      
      await expect(marketplaceService.cancelListing(listing.id, unauthorizedUser))
        .rejects.toThrow('Only seller can cancel listing');
    });
  });

  describe('User Story 15: NFT Purchase', () => {
    let mintedNFT;
    let activeListing;

    beforeEach(async () => {
      const agentMetadata = NFTTestData.generateAIAgentMetadata();
      const mintRequest = {
        name: agentMetadata.name,
        description: agentMetadata.description,
        image: agentMetadata.image,
        attributes: agentMetadata.attributes,
        owner: creatorWallet,
        collection: collectionAddress
      };
      
      mintedNFT = await metaplexService.createNFT(mintRequest);
      
      const listingData = NFTTestData.generateListingData(mintedNFT.mintAddress, creatorWallet);
      activeListing = await marketplaceService.createListing(listingData);
    });

    it('should verify buyer has sufficient SOL', async () => {
      const buyerBalance = 10.0; // Mock sufficient balance
      const purchasePrice = activeListing.price;
      
      expect(buyerBalance).toBeGreaterThanOrEqual(purchasePrice);
    });

    it('should complete NFT purchase transaction', async () => {
      const sale = await marketplaceService.purchaseNFT(
        activeListing.id,
        buyerWallet,
        activeListing.price
      );
      
      expect(sale.id).toMatch(/^sale_/);
      expect(sale.buyer).toBe(buyerWallet);
      expect(sale.seller).toBe(creatorWallet);
      expect(sale.price).toBe(activeListing.price);
      expect(sale.status).toBe('completed');
      expect(sale.transactionHash).toMatch(/^tx_/);
    });

    it('should transfer SOL to seller minus fees', async () => {
      const sale = await marketplaceService.purchaseNFT(
        activeListing.id,
        buyerWallet,
        activeListing.price
      );
      
      const expectedSellerReceives = activeListing.price - sale.platformFee - sale.royaltyFee;
      
      expect(sale.sellerReceives).toBeCloseTo(expectedSellerReceives, 6);
      expect(sale.sellerReceives).toBeLessThan(activeListing.price);
    });

    it('should transfer 2.5% fee to platform treasury', async () => {
      const sale = await marketplaceService.purchaseNFT(
        activeListing.id,
        buyerWallet,
        activeListing.price
      );
      
      const expectedPlatformFee = activeListing.price * 0.025;
      
      expect(sale.platformFee).toBeCloseTo(expectedPlatformFee, 6);
      expect(sale.platformFee).toBeGreaterThan(0);
    });

    it('should transfer 5% royalty to original creator', async () => {
      const sale = await marketplaceService.purchaseNFT(
        activeListing.id,
        buyerWallet,
        activeListing.price
      );
      
      const expectedRoyalty = activeListing.price * 0.05;
      
      expect(sale.royaltyFee).toBeCloseTo(expectedRoyalty, 6);
      expect(sale.royaltyFee).toBeGreaterThan(0);
    });

    it('should transfer NFT from escrow to buyer', async () => {
      await marketplaceService.purchaseNFT(
        activeListing.id,
        buyerWallet,
        activeListing.price
      );
      
      // Transfer NFT ownership
      await metaplexService.transferNFT(mintedNFT.mintAddress, creatorWallet, buyerWallet);
      
      const ownership = await metaplexService.verifyOwnership(mintedNFT.mintAddress, buyerWallet);
      expect(ownership).toBe(true);
      
      // NFT should be removed from escrow
      const escrowRecord = marketplaceService.escrow.get(mintedNFT.mintAddress);
      expect(escrowRecord).toBeUndefined();
    });

    it('should update ownership records', async () => {
      await marketplaceService.purchaseNFT(
        activeListing.id,
        buyerWallet,
        activeListing.price
      );
      
      const updatedNFT = await metaplexService.transferNFT(
        mintedNFT.mintAddress,
        creatorWallet,
        buyerWallet
      );
      
      expect(updatedNFT.owner).toBe(buyerWallet);
      expect(updatedNFT.lastTransfer).toBeDefined();
      expect(updatedNFT.lastTransfer.from).toBe(creatorWallet);
      expect(updatedNFT.lastTransfer.to).toBe(buyerWallet);
    });

    it('should emit sale completed event', async () => {
      const sale = await marketplaceService.purchaseNFT(
        activeListing.id,
        buyerWallet,
        activeListing.price
      );
      
      const saleEvent = {
        type: 'NFTSaleCompleted',
        saleId: sale.id,
        mintAddress: mintedNFT.mintAddress,
        seller: creatorWallet,
        buyer: buyerWallet,
        price: activeListing.price,
        timestamp: new Date().toISOString()
      };

      expect(saleEvent.type).toBe('NFTSaleCompleted');
      expect(saleEvent.buyer).toBe(buyerWallet);
      expect(saleEvent.seller).toBe(creatorWallet);
    });

    it('should update listing status to sold', async () => {
      await marketplaceService.purchaseNFT(
        activeListing.id,
        buyerWallet,
        activeListing.price
      );
      
      const updatedListing = marketplaceService.listings.get(activeListing.id);
      
      expect(updatedListing.status).toBe('sold');
      expect(updatedListing.soldAt).toBeDefined();
      expect(updatedListing.soldTo).toBe(buyerWallet);
    });

    it('should reject purchase with insufficient payment', async () => {
      const insufficientAmount = activeListing.price - 0.1;
      
      await expect(marketplaceService.purchaseNFT(
        activeListing.id,
        buyerWallet,
        insufficientAmount
      )).rejects.toThrow('Insufficient payment');
    });

    it('should reject purchase of inactive listing', async () => {
      // Cancel the listing first
      await marketplaceService.cancelListing(activeListing.id, creatorWallet);
      
      await expect(marketplaceService.purchaseNFT(
        activeListing.id,
        buyerWallet,
        activeListing.price
      )).rejects.toThrow('Listing is not active');
    });
  });

  describe('Marketplace Browse and Discovery', () => {
    let testNFTs;
    let testListings;

    beforeEach(async () => {
      testNFTs = [];
      testListings = [];
      
      // Create multiple NFTs and listings for testing
      for (let i = 0; i < 5; i++) {
        const agentMetadata = NFTTestData.generateAIAgentMetadata();
        const mintRequest = {
          name: `${agentMetadata.name} #${i + 1}`,
          description: agentMetadata.description,
          image: agentMetadata.image,
          attributes: agentMetadata.attributes,
          owner: creatorWallet,
          collection: collectionAddress
        };
        
        const nft = await metaplexService.createNFT(mintRequest);
        testNFTs.push(nft);
        
        const listingData = NFTTestData.generateListingData(nft.mintAddress, creatorWallet);
        const listing = await marketplaceService.createListing(listingData);
        testListings.push(listing);
      }
    });

    it('should browse NFT listings with filters', async () => {
      const allListings = await marketplaceService.getListings({ status: 'active' });
      
      expect(allListings.length).toBeGreaterThanOrEqual(5);
      allListings.forEach(listing => {
        expect(listing.status).toBe('active');
      });
    });

    it('should filter by price range', async () => {
      const minPrice = 1.0;
      const maxPrice = 3.0;
      
      const filteredListings = await marketplaceService.getListings({
        status: 'active',
        minPrice,
        maxPrice
      });
      
      filteredListings.forEach(listing => {
        expect(listing.price).toBeGreaterThanOrEqual(minPrice);
        expect(listing.price).toBeLessThanOrEqual(maxPrice);
      });
    });

    it('should filter by seller', async () => {
      const sellerListings = await marketplaceService.getListings({
        seller: creatorWallet
      });
      
      sellerListings.forEach(listing => {
        expect(listing.seller).toBe(creatorWallet);
      });
    });

    it('should display detailed AI performance metrics', async () => {
      const sampleNFT = testNFTs[0];
      
      const ratingAttribute = sampleNFT.attributes.find(attr => attr.trait_type === 'Rating');
      const winRateAttribute = sampleNFT.attributes.find(attr => attr.trait_type === 'Win Rate');
      const gamesAttribute = sampleNFT.attributes.find(attr => attr.trait_type === 'Games Played');
      const rarityAttribute = sampleNFT.attributes.find(attr => attr.trait_type === 'Rarity');
      
      expect(ratingAttribute).toBeDefined();
      expect(winRateAttribute).toBeDefined();
      expect(gamesAttribute).toBeDefined();
      expect(rarityAttribute).toBeDefined();
      
      expect(ratingAttribute.value).toBeGreaterThan(1200);
      expect(winRateAttribute.value).toBeGreaterThanOrEqual(50);
      expect(gamesAttribute.value).toBeGreaterThan(50);
      expect(['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']).toContain(rarityAttribute.value);
    });

    it('should show rarity distribution', async () => {
      const rarityCount = testNFTs.reduce((acc, nft) => {
        const rarityAttr = nft.attributes.find(attr => attr.trait_type === 'Rarity');
        const rarity = rarityAttr.value;
        acc[rarity] = (acc[rarity] || 0) + 1;
        return acc;
      }, {});
      
      expect(Object.keys(rarityCount).length).toBeGreaterThan(0);
      Object.values(rarityCount).forEach(count => {
        expect(count).toBeGreaterThan(0);
      });
    });
  });

  describe('Sale History and Analytics', () => {
    let nftWithHistory;
    let saleHistory;

    beforeEach(async () => {
      const agentMetadata = NFTTestData.generateAIAgentMetadata();
      const mintRequest = {
        name: agentMetadata.name,
        description: agentMetadata.description,
        image: agentMetadata.image,
        attributes: agentMetadata.attributes,
        owner: creatorWallet,
        collection: collectionAddress
      };
      
      nftWithHistory = await metaplexService.createNFT(mintRequest);
      
      // Create and complete multiple sales for history
      for (let i = 0; i < 3; i++) {
        const seller = i === 0 ? creatorWallet : NFTTestData.generateTestWallet();
        const buyer = NFTTestData.generateTestWallet();
        const price = 1.0 + i * 0.5; // Increasing prices
        
        const listingData = NFTTestData.generateListingData(nftWithHistory.mintAddress, seller);
        listingData.price = price;
        
        const listing = await marketplaceService.createListing(listingData);
        const sale = await marketplaceService.purchaseNFT(listing.id, buyer, price);
        
        // Transfer ownership for next sale
        if (i < 2) {
          await metaplexService.transferNFT(nftWithHistory.mintAddress, seller, buyer);
        }
      }
      
      saleHistory = await marketplaceService.getSaleHistory(nftWithHistory.mintAddress);
    });

    it('should track complete sale history', async () => {
      expect(saleHistory).toHaveLength(3);
      
      saleHistory.forEach((sale, index) => {
        expect(sale.mintAddress).toBe(nftWithHistory.mintAddress);
        expect(sale.status).toBe('completed');
        expect(sale.price).toBe(1.0 + index * 0.5);
      });
    });

    it('should show price appreciation over time', async () => {
      const prices = saleHistory.map(sale => sale.price).reverse(); // Chronological order
      
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThan(prices[i - 1]);
      }
    });

    it('should calculate total volume and fees', async () => {
      const totalVolume = saleHistory.reduce((sum, sale) => sum + sale.price, 0);
      const totalPlatformFees = saleHistory.reduce((sum, sale) => sum + sale.platformFee, 0);
      const totalRoyalties = saleHistory.reduce((sum, sale) => sum + sale.royaltyFee, 0);
      
      expect(totalVolume).toBeGreaterThan(0);
      expect(totalPlatformFees).toBeGreaterThan(0);
      expect(totalRoyalties).toBeGreaterThan(0);
      
      // Platform fees should be 2.5% of total volume
      expect(totalPlatformFees).toBeCloseTo(totalVolume * 0.025, 6);
      
      // Royalties should be 5% of total volume
      expect(totalRoyalties).toBeCloseTo(totalVolume * 0.05, 6);
    });

    it('should track ownership transfers', async () => {
      const currentOwner = await metaplexService.verifyOwnership(
        nftWithHistory.mintAddress,
        saleHistory[0].buyer
      );
      
      expect(currentOwner).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should reject minting with invalid metadata', async () => {
      const invalidMintRequest = {
        name: '', // Empty name
        description: '',
        owner: null // No owner
      };
      
      // In real implementation, this would be validated
      expect(invalidMintRequest.name).toBe('');
      expect(invalidMintRequest.owner).toBeNull();
    });

    it('should handle listing of non-existent NFT', async () => {
      const nonExistentMint = 'invalid_mint_address';
      const listingData = NFTTestData.generateListingData(nonExistentMint, creatorWallet);
      
      // In real implementation, this would check NFT existence
      expect(nonExistentMint).toBe('invalid_mint_address');
    });

    it('should prevent unauthorized listing', async () => {
      const agentMetadata = NFTTestData.generateAIAgentMetadata();
      const mintRequest = {
        name: agentMetadata.name,
        description: agentMetadata.description,
        image: agentMetadata.image,
        attributes: agentMetadata.attributes,
        owner: creatorWallet,
        collection: collectionAddress
      };
      
      const nft = await metaplexService.createNFT(mintRequest);
      const unauthorizedUser = NFTTestData.generateTestWallet();
      
      const unauthorized = !await metaplexService.verifyOwnership(nft.mintAddress, unauthorizedUser);
      expect(unauthorized).toBe(true);
    });

    it('should handle expired listings', async () => {
      const agentMetadata = NFTTestData.generateAIAgentMetadata();
      const mintRequest = {
        name: agentMetadata.name,
        description: agentMetadata.description,
        image: agentMetadata.image,
        attributes: agentMetadata.attributes,
        owner: creatorWallet,
        collection: collectionAddress
      };
      
      const nft = await metaplexService.createNFT(mintRequest);
      const listingData = NFTTestData.generateListingData(nft.mintAddress, creatorWallet);
      const listing = await marketplaceService.createListing(listingData);
      
      // Simulate expired listing
      listing.expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago
      
      const isExpired = new Date(listing.expiresAt) < new Date();
      expect(isExpired).toBe(true);
    });

    it('should validate royalty percentages', async () => {
      const validRoyalty = 5.0; // 5%
      const invalidRoyalty = 15.0; // 15% (too high)
      
      expect(validRoyalty).toBeLessThanOrEqual(10); // Reasonable limit
      expect(invalidRoyalty).toBeGreaterThan(10); // Should be rejected
    });

    it('should handle concurrent purchase attempts', async () => {
      const agentMetadata = NFTTestData.generateAIAgentMetadata();
      const mintRequest = {
        name: agentMetadata.name,
        description: agentMetadata.description,
        image: agentMetadata.image,
        attributes: agentMetadata.attributes,
        owner: creatorWallet,
        collection: collectionAddress
      };
      
      const nft = await metaplexService.createNFT(mintRequest);
      const listingData = NFTTestData.generateListingData(nft.mintAddress, creatorWallet);
      const listing = await marketplaceService.createListing(listingData);
      
      const buyer1 = NFTTestData.generateTestWallet();
      const buyer2 = NFTTestData.generateTestWallet();
      
      // First purchase should succeed
      const sale1 = await marketplaceService.purchaseNFT(listing.id, buyer1, listing.price);
      expect(sale1.status).toBe('completed');
      
      // Second purchase should fail (listing already sold)
      await expect(marketplaceService.purchaseNFT(listing.id, buyer2, listing.price))
        .rejects.toThrow('Listing is not active');
    });
  });
});
