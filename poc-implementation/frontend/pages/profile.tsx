import React, { useEffect, useMemo, useState } from 'react';
import { WalletBalance } from '@/components/WalletBalance/WalletBalance';
import WalletBalanceDebug from '@/components/WalletBalance/WalletBalanceDebug';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { formatSOL, shortenAddress } from '@/utils/format';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { Layout } from '@/components/Layout/Layout';
import { useConnection } from '@solana/wallet-adapter-react';
import { fetchUserAgentNfts, AgentNftSummary } from '@/lib/nft/fetchUserAgentNfts';

// Simple test component to debug
const TestWalletBalance = () => {
  return (
    <div className="hunter-card p-6">
      <h3 className="text-xl font-hunter text-white mb-4">TEST WALLET BALANCE</h3>
      <p className="text-gray-400">This is a test component</p>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'bets' | 'history'>('overview');
  const [agentNfts, setAgentNfts] = useState<AgentNftSummary[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  const handleReturnToArena = (e: React.MouseEvent) => {
    if (router.pathname === '/') {
      e.preventDefault();
      router.replace('/', undefined, { shallow: true });
    } else {
      router.push('/');
    }
  };

  // Load agent NFTs owned by the user (devnet)
  useEffect(() => {
    (async () => {
      if (!connected || !publicKey) return;
      setLoadingAgents(true);
      setAgentsError(null);
      try {
        const list = await fetchUserAgentNfts(connection, publicKey);
        setAgentNfts(list);
      } catch (e: any) {
        setAgentsError(e?.message || 'Failed to load NFTs');
      } finally {
        setLoadingAgents(false);
      }
    })();
  }, [connected, publicKey, connection]);

  // Mock user data - move this inside component but after hooks
  const userData = useMemo(() => ({
    address: publicKey?.toBase58() || '',
    balance: 125500000000, // 125.5 SOL
    totalBets: 45,
    totalWinnings: 85000000000, // 85 SOL
    winRate: 0.62,
    rank: 42,
    joinDate: new Date('2024-01-15'),
    agents: [
      {
        id: '1',
        name: 'Shadow Hunter X',
        elo: 2450,
        winRate: 0.78,
        gamesPlayed: 234,
        nenType: 'enhancement',
      },
      {
        id: '2',
        name: 'Mind Weaver',
        elo: 2280,
        winRate: 0.65,
        gamesPlayed: 156,
        nenType: 'manipulation',
      },
    ],
    recentBets: [
      {
        id: '1',
        matchId: 'match1',
        agent: 'Shadow Hunter X',
        amount: 5000000000,
        odds: 2.3,
        status: 'won',
        payout: 11500000000,
      },
      {
        id: '2',
        matchId: 'match2',
        agent: 'Mind Weaver',
        amount: 3000000000,
        odds: 1.8,
        status: 'lost',
        payout: 0,
      },
    ],
  }), [publicKey]);

  if (!connected || !publicKey) {
    return (
      <Layout>
        <div className="min-h-screen bg-cyber-darker">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-3xl font-hunter text-gray-400 mb-4">ACCESS DENIED</h2>
              <p className="text-gray-500 mb-8">Connect your wallet to view your profile</p>
              <button
                onClick={handleReturnToArena}
                className="cyber-button"
              >
                RETURN TO ARENA
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-cyber-darker">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hunter-card p-8 mb-8"
          >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-solana-purple to-solana-green p-1">
                <div className="w-full h-full rounded-full bg-cyber-darker flex items-center justify-center">
                  <span className="text-5xl">👤</span>
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-yellow-500 text-black text-xs font-cyber rounded-full">
                RANK #{userData.rank}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-hunter text-white mb-2">HUNTER PROFILE</h1>
              <p className="text-gray-400 font-mono mb-4">{shortenAddress(userData.address, 6)}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-solana-green">{formatSOL(userData.balance)}</div>
                  <div className="text-xs font-cyber text-gray-400 uppercase">Balance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{userData.totalBets}</div>
                  <div className="text-xs font-cyber text-gray-400 uppercase">Total Bets</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{(userData.winRate * 100).toFixed(0)}%</div>
                  <div className="text-xs font-cyber text-gray-400 uppercase">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-magicblock-primary">{userData.agents.length}</div>
                  <div className="text-xs font-cyber text-gray-400 uppercase">AI Agents</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-cyber-dark/50 backdrop-blur-sm border border-solana-purple/30 p-1 rounded-full">
            {(['overview', 'agents', 'bets', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-6 py-2 font-cyber text-sm uppercase tracking-wider transition-all rounded-full
                  ${activeTab === tab 
                    ? 'bg-gradient-to-r from-solana-purple to-magicblock-primary text-white' 
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Wallet Balance Component */}
                <div className="md:col-span-1" style={{ position: 'relative', zIndex: 1000 }}>
                  <WalletBalance />
                </div>

                {/* Stats Card */}
                <div className="hunter-card p-6">
                  <h3 className="text-xl font-hunter text-white mb-4">PERFORMANCE STATS</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Total Winnings</span>
                        <span className="font-mono text-solana-green">{formatSOL(userData.totalWinnings)} SOL</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-solana-green to-emerald-500" style={{ width: '75%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Win Rate</span>
                        <span className="font-mono text-cyan-400">{(userData.winRate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${userData.winRate * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Card */}
                <div className="hunter-card p-6">
                  <h3 className="text-xl font-hunter text-white mb-4">RECENT ACTIVITY</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-cyber-dark/50 rounded">
                      <span className="text-sm text-gray-400">Last Match Bet</span>
                      <span className="text-sm font-mono text-white">2 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-cyber-dark/50 rounded">
                      <span className="text-sm text-gray-400">Join Date</span>
                      <span className="text-sm font-mono text-white">{userData.joinDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-cyber-dark/50 rounded">
                      <span className="text-sm text-gray-400">Total Games</span>
                      <span className="text-sm font-mono text-white">{userData.totalBets}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="space-y-4">
              {loadingAgents && (
                <div className="text-center text-gray-400">Loading your agent NFTs…</div>
              )}
              {agentsError && (
                <div className="text-center text-red-400">{agentsError}</div>
              )}
              {!loadingAgents && !agentsError && agentNfts.length === 0 && (
                <div className="text-center text-gray-400">No agent NFTs found.</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agentNfts.map((nft) => (
                  <div key={nft.mint} className="hunter-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className={`text-lg font-hunter`}>{nft.name}</h4>
                      <span className="text-xs font-cyber text-gray-400 uppercase">{nft.symbol}</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">ELO</span>
                        <span className="font-mono">{nft.performance?.elo ?? '-'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Win Rate</span>
                        <span className="font-mono text-solana-green">{nft.performance?.winRate != null ? `${(nft.performance.winRate * 100).toFixed(1)}%` : '-'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Matches</span>
                        <span className="font-mono">{nft.performance?.totalMatches ?? '-'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Personality</span>
                        <span className="font-mono">{nft.traits?.personality ?? '-'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Openings</span>
                        <span className="font-mono">{nft.traits?.openings ?? '-'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Model Hash</span>
                        <span className="font-mono text-gray-400">{nft.modelHash ? `${String(nft.modelHash).slice(0,6)}…${String(nft.modelHash).slice(-6)}` : '-'}</span>
                      </div>
                    </div>
                    <a className="w-full mt-4 block text-center py-2 bg-solana-purple/20 hover:bg-solana-purple/30 border border-solana-purple/50 text-solana-purple font-cyber text-sm uppercase transition-all" href={`https://explorer.solana.com/address/${nft.mint}?cluster=devnet`} target="_blank" rel="noreferrer">
                      View on Explorer
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'bets' && (
            <div className="space-y-4">
              {userData.recentBets.map((bet) => (
                <div key={bet.id} className="hunter-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-hunter text-white mb-1">{bet.agent}</h4>
                      <p className="text-sm text-gray-400">Match ID: {bet.matchId}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono text-white">{formatSOL(bet.amount)} SOL</div>
                      <div className={`text-sm ${bet.status === 'won' ? 'text-solana-green' : 'text-red-400'}`}>
                        {bet.status === 'won' ? `+${formatSOL(bet.payout)} SOL` : 'Lost'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="hunter-card p-6">
              <p className="text-center text-gray-400">Match history coming soon...</p>
            </div>
          )}
        </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage; 