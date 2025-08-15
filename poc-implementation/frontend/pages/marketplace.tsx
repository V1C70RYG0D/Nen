import React, { useMemo, useState } from 'react';
import { Layout } from '@/components/Layout/Layout';
import { AIAgentCard } from '@/components/AIAgentCard/AIAgentCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from 'react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { mintAgentNft } from '@/lib/nft/mintAgentNft';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { apiConfig } from '@/lib/api-config';

type SortBy = 'elo' | 'price' | 'winRate' | 'rarity';
type FilterRarity = 'all' | 'common' | 'rare' | 'epic' | 'legendary';
type FilterNenType = 'all' | 'enhancement' | 'emission' | 'manipulation' | 'transmutation' | 'conjuration' | 'specialization';

type UIAgent = {
  id: string;
  name: string;
  owner: string;
  elo: number;
  winRate: number;
  gamesPlayed: number;
  price?: number;
  personality: string;
  isForSale: boolean;
  nenType: string;
  specialAbilities: string[];
  generation: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
};

export default function MarketplacePage() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [sortBy, setSortBy] = useState<SortBy>('elo');
  const [filterRarity, setFilterRarity] = useState<FilterRarity>('all');
  const [filterNenType, setFilterNenType] = useState<FilterNenType>('all');
  const [showOnlyForSale, setShowOnlyForSale] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch AI agents from backend via Next API proxy
  const { data: agents, isLoading } = useQuery<UIAgent[]>('agents', async () => {
    const r = await fetch('/api/agents');
    const json = await r.json();
    const list = json?.data?.agents || [];
    // map into the shape used by UI grid
    return (list as any[]).map((a: any, idx: number): UIAgent => ({
      id: a.id || String(idx + 1),
      name: a.name,
      owner: a.owner || '',
      elo: a.elo,
      winRate: a.winRate,
      gamesPlayed: a.totalMatches,
      price: a.price || 0,
      personality: a.personality,
      isForSale: true,
      nenType: a.nenType,
      specialAbilities: a.specialAbilities || [],
      generation: a.generation || 1,
      rarity: (a.rarity || 'epic') as UIAgent['rarity'],
    }));
  });

  // Filter and sort agents
  const filteredAgents: UIAgent[] = (agents || [])
    .filter((agent: UIAgent) => {
      if (showOnlyForSale && !agent.isForSale) return false;
      if (filterRarity !== 'all' && agent.rarity !== filterRarity) return false;
      if (filterNenType !== 'all' && agent.nenType !== filterNenType) return false;
      if (searchQuery && !agent.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a: UIAgent, b: UIAgent) => {
      switch (sortBy) {
        case 'elo':
          return b.elo - a.elo;
        case 'price':
          return (a.price || 0) - (b.price || 0);
        case 'winRate':
          return b.winRate - a.winRate;
        case 'rarity':
          const rarityOrder: Record<UIAgent['rarity'], number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
          return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        default:
          return 0;
      }
    });

  const handleBuy = async (agentId: string) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      // In a real implementation, this would call the smart contract
      toast.success('Purchase successful!');
    } catch (error) {
      toast.error('Purchase failed. Please try again.');
    }
  };

  // Mint UI state
  const [showMint, setShowMint] = useState(false);
  const [mintName, setMintName] = useState('Nen Agent');
  const [mintSymbol, setMintSymbol] = useState('NENAI');
  const [description, setDescription] = useState('AI Agent NFT trained on real match replays');
  const [personality, setPersonality] = useState('Aggressive');
  const [openings, setOpenings] = useState('Sicilian Defense');
  const [elo, setElo] = useState(2000);
  const [winRate, setWinRate] = useState(0.7);
  const [totalMatches, setTotalMatches] = useState(100);
  const [modelHash, setModelHash] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_PUBLIC_KEY || '';
  const treasuryPubkey = treasuryAddress ? new PublicKey(treasuryAddress) : null;
  const feeDisplaySol = useMemo(() => {
    const envFee = Number(process.env.NEXT_PUBLIC_AGENT_MINT_FEE_LAMPORTS || 0.1 * LAMPORTS_PER_SOL);
    return envFee / LAMPORTS_PER_SOL;
  }, []);

  const onMint = async () => {
    try {
      if (!publicKey || !signTransaction) {
        toast.error('Connect wallet first');
        return;
      }
      if (!treasuryPubkey) {
        toast.error('Treasury not configured');
        return;
      }
      if (!modelHash) {
        toast.error('Model hash required');
        return;
      }

      // If preset selected, prefill fields
      if (selectedAgentId && agents?.length) {
        const picked = (agents as UIAgent[]).find((a: UIAgent) => a.id === selectedAgentId);
        if (picked) {
          // keep user overrides if already typed
          if (!mintName) setMintName(picked.name);
          if (!personality) setPersonality(picked.personality || '');
          if (!openings) setOpenings('');
          if (!elo) setElo(picked.elo || 0);
          if (!winRate) setWinRate(picked.winRate || 0);
          if (!totalMatches) setTotalMatches(picked.gamesPlayed || 0);
        }
      }

      // 1) Create metadata JSON on backend
      const resp = await fetch(`/api/nft-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mintName,
          symbol: mintSymbol,
          description,
          attributes: [
            { trait_type: 'ELO', value: elo },
            { trait_type: 'Win Rate', value: winRate },
            { trait_type: 'Total Matches', value: totalMatches },
            { trait_type: 'Personality', value: personality },
            { trait_type: 'Openings', value: openings },
            { trait_type: 'Model Hash', value: modelHash },
          ],
          ai: {
            performance: { elo, winRate, totalMatches },
            traits: { personality, openings },
          },
          modelHash,
        }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.url) {
        throw new Error(json?.error || 'Failed to create metadata');
      }

      // 2) Mint NFT using Metaplex
      const feeLamports = Number(process.env.NEXT_PUBLIC_AGENT_MINT_FEE_LAMPORTS || 0.1 * LAMPORTS_PER_SOL);
      const result = await mintAgentNft({
        connection,
        walletAdapter: { publicKey, signTransaction },
        owner: publicKey,
        metadataUrl: json.url,
        name: mintName,
        symbol: mintSymbol,
        sellerFeeBasisPoints: 500,
        creators: [{ address: publicKey, share: 100, verified: true }],
        mintFeeLamports: feeLamports,
        treasury: treasuryPubkey,
      });

      const explorer = `https://explorer.solana.com/tx/${result.createSig}?cluster=devnet`;
      toast.success('NFT minted');
      toast.success(`View: ${explorer}`);
      // Note: Update authority is the user; mint authority is effectively controlled by token-standard; for Metaplex NFTs the update authority controls metadata.
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Mint failed');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-hunter text-transparent bg-clip-text bg-gradient-to-r from-solana-purple to-solana-green mb-4">
            HUNTER MARKETPLACE
          </h1>
          <p className="text-gray-400 font-cyber text-lg">
            ACQUIRE LEGENDARY AI HUNTERS • BUILD YOUR COLLECTION • DOMINATE THE ARENA
          </p>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hunter-card p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-cyber text-gray-400 uppercase mb-2">
                Search Hunters
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter name..."
                className="w-full px-4 py-2 bg-cyber-dark/50 border border-solana-purple/30 focus:border-solana-purple text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-solana-purple/50"
              />
            </div>

            {/* Rarity Filter */}
            <div>
              <label className="block text-sm font-cyber text-gray-400 uppercase mb-2">
                Rarity
              </label>
              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value as FilterRarity)}
                className="w-full px-4 py-2 bg-cyber-dark/50 border border-solana-purple/30 focus:border-solana-purple text-white focus:outline-none focus:ring-2 focus:ring-solana-purple/50"
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>

            {/* Nen Type Filter */}
            <div>
              <label className="block text-sm font-cyber text-gray-400 uppercase mb-2">
                Nen Type
              </label>
              <select
                value={filterNenType}
                onChange={(e) => setFilterNenType(e.target.value as FilterNenType)}
                className="w-full px-4 py-2 bg-cyber-dark/50 border border-solana-purple/30 focus:border-solana-purple text-white focus:outline-none focus:ring-2 focus:ring-solana-purple/50"
              >
                <option value="all">All Types</option>
                <option value="enhancement">Enhancement</option>
                <option value="emission">Emission</option>
                <option value="manipulation">Manipulation</option>
                <option value="transmutation">Transmutation</option>
                <option value="conjuration">Conjuration</option>
                <option value="specialization">Specialization</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-cyber text-gray-400 uppercase mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="w-full px-4 py-2 bg-cyber-dark/50 border border-solana-purple/30 focus:border-solana-purple text-white focus:outline-none focus:ring-2 focus:ring-solana-purple/50"
              >
                <option value="elo">ELO Rating</option>
                <option value="price">Price</option>
                <option value="winRate">Win Rate</option>
                <option value="rarity">Rarity</option>
              </select>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="mt-4 flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyForSale}
                onChange={(e) => setShowOnlyForSale(e.target.checked)}
                className="w-4 h-4 bg-transparent border-2 border-solana-purple text-solana-purple focus:ring-solana-purple focus:ring-2"
              />
              <span className="text-sm font-cyber text-gray-300">FOR SALE ONLY</span>
            </label>
            
            <div className="text-sm text-gray-400">
              {filteredAgents.length} HUNTERS FOUND
            </div>
          </div>
        </motion.div>

        {/* Agent Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="nen-spinner" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredAgents.map((agent: UIAgent, index: number) => (
                <motion.div
                  key={agent.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AIAgentCard
                    agent={agent}
                    onBuy={() => handleBuy(agent.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {filteredAgents.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-hunter text-gray-400 mb-2">
              NO HUNTERS FOUND
            </h3>
            <p className="text-gray-500">
              Try adjusting your filters or search criteria
            </p>
          </motion.div>
        )}

        {/* Mint Agent NFT Panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 w-full max-w-md p-4 bg-cyber-dark/90 border border-solana-purple/30"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-hunter text-lg">Mint AI Agent NFT (Devnet)</h3>
            <button className="text-sm text-gray-400 hover:text-white" onClick={() => setShowMint(!showMint)}>
              {showMint ? 'Hide' : 'Show'}
            </button>
          </div>
          {showMint && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2">
                <label className="block text-gray-400 mb-1">Select Trained Agent (optional)</label>
                <select className="w-full px-3 py-2 bg-black/40 border border-solana-purple/30" value={selectedAgentId} onChange={(e)=>setSelectedAgentId(e.target.value)}>
                  <option value="">-- Choose preset --</option>
                  {agents?.map((a: UIAgent)=> (
                    <option key={a.id} value={a.id}>{a.name} • ELO {a.elo} • WR {(a.winRate*100).toFixed(0)}%</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-gray-400 mb-1">Name</label>
                <input className="w-full px-3 py-2 bg-black/40 border border-solana-purple/30" value={mintName} onChange={(e)=>setMintName(e.target.value)} />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Symbol</label>
                <input className="w-full px-3 py-2 bg-black/40 border border-solana-purple/30" value={mintSymbol} onChange={(e)=>setMintSymbol(e.target.value)} />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Personality</label>
                <input className="w-full px-3 py-2 bg-black/40 border border-solana-purple/30" value={personality} onChange={(e)=>setPersonality(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-400 mb-1">Openings</label>
                <input className="w-full px-3 py-2 bg-black/40 border border-solana-purple/30" value={openings} onChange={(e)=>setOpenings(e.target.value)} />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">ELO</label>
                <input type="number" className="w-full px-3 py-2 bg-black/40 border border-solana-purple/30" value={elo} onChange={(e)=>setElo(parseInt(e.target.value||'0'))} />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Win Rate</label>
                <input type="number" step="0.01" className="w-full px-3 py-2 bg-black/40 border border-solana-purple/30" value={winRate} onChange={(e)=>setWinRate(parseFloat(e.target.value||'0'))} />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Matches</label>
                <input type="number" className="w-full px-3 py-2 bg-black/40 border border-solana-purple/30" value={totalMatches} onChange={(e)=>setTotalMatches(parseInt(e.target.value||'0'))} />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-400 mb-1">Model Hash (commitment)</label>
                <input className="w-full px-3 py-2 bg-black/40 border border-solana-purple/30" value={modelHash} onChange={(e)=>setModelHash(e.target.value)} placeholder="Qm..." />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-400 mb-1">Description</label>
                <textarea className="w-full px-3 py-2 bg-black/40 border border-solana-purple/30" value={description} onChange={(e)=>setDescription(e.target.value)} />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <div className="text-xs text-gray-400">Fee: {feeDisplaySol} SOL • Royalty: 5%</div>
                <button onClick={onMint} className="px-4 py-2 bg-solana-purple text-white hover:bg-purple-600">Mint</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}