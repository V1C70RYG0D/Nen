/**
 * Dashboard Page - AI Agent Management & Training Overview
 * 
 * Features:
 * - AI agent collection overview
 * - Active and completed training sessions
 * - Performance metrics and statistics
 * - Quick access to marketplace and training
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  CpuChipIcon, 
  ChartBarIcon,
  SparklesIcon,
  RocketLaunchIcon,
  TrophyIcon,
  StarIcon,
  ClockIcon,
  BoltIcon,
  ShoppingCartIcon,
  AcademicCapIcon,
  FireIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as PendingIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Layout } from '@/components/Layout/Layout';
import { ClientOnly } from '@/components/ClientOnly';

// Types for dashboard data
interface DashboardAgent {
  mint: string;
  name: string;
  image?: string;
  rating: number;
  wins: number;
  losses: number;
  totalMatches: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  isTraining: boolean;
  lastActive?: string;
  value?: number; // SOL value
}

interface TrainingSession {
  sessionId: string;
  agentName: string;
  agentMint: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  startTime: string;
  estimatedCompletion?: string;
  progress?: number;
  selectedReplays: number;
  trainingParams: {
    focusArea: string;
    intensity: string;
    epochs: number;
  };
  fee: number;
}

interface DashboardStats {
  totalAgents: number;
  totalValue: number; // Total SOL value of collection
  averageRating: number;
  totalWins: number;
  totalMatches: number;
  winRate: number;
  activeTrainingSessions: number;
  completedTrainingSessions: number;
  totalTrainingSpent: number;
}

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  
  const [agents, setAgents] = useState<DashboardAgent[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (connected && publicKey && mounted) {
      loadDashboardData();
    }
  }, [connected, publicKey, mounted]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load demo data for dashboard
      const demoAgents: DashboardAgent[] = [
        {
          mint: 'demo-kurapika-training-mint-2024-1',
          name: 'Kurapika',
          image: 'https://i.imgur.com/kurapika.jpg',
          rating: 2450,
          wins: 89,
          losses: 23,
          totalMatches: 112,
          rarity: 'mythic',
          isTraining: false,
          lastActive: '2 hours ago',
          value: 5.8
        },
        {
          mint: 'demo-hisoka-training-mint-2024-2',
          name: 'Hisoka',
          image: 'https://i.imgur.com/hisoka.jpg',
          rating: 2380,
          wins: 156,
          losses: 44,
          totalMatches: 200,
          rarity: 'legendary',
          isTraining: true,
          lastActive: 'Training now',
          value: 4.2
        },
        {
          mint: 'demo-killua-training-mint-2024-3',
          name: 'Killua',
          image: 'https://i.imgur.com/killua.jpg',
          rating: 2290,
          wins: 134,
          losses: 31,
          totalMatches: 165,
          rarity: 'legendary',
          isTraining: false,
          lastActive: '1 day ago',
          value: 3.8
        },
        {
          mint: 'demo-gon-training-mint-2024-4',
          name: 'Gon',
          image: 'https://i.imgur.com/gon.jpg',
          rating: 2180,
          wins: 98,
          losses: 27,
          totalMatches: 125,
          rarity: 'epic',
          isTraining: false,
          lastActive: '3 days ago',
          value: 2.1
        },
        {
          mint: 'demo-bisky-training-mint-2024-5',
          name: 'Bisky',
          image: 'https://i.imgur.com/bisky.jpg',
          rating: 2340,
          wins: 187,
          losses: 38,
          totalMatches: 225,
          rarity: 'legendary',
          isTraining: false,
          lastActive: '5 hours ago',
          value: 3.2
        }
      ];

      const demoTrainingSessions: TrainingSession[] = [
        {
          sessionId: 'demo-session-1',
          agentName: 'Hisoka',
          agentMint: 'demo-hisoka-training-mint-2024-2',
          status: 'active',
          startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          estimatedCompletion: new Date(Date.now() + 1800000).toISOString(), // 30 min from now
          progress: 65,
          selectedReplays: 6,
          trainingParams: {
            focusArea: 'midgame',
            intensity: 'medium',
            epochs: 15
          },
          fee: 0.023
        },
        {
          sessionId: 'demo-session-2',
          agentName: 'Kurapika',
          agentMint: 'demo-kurapika-training-mint-2024-1',
          status: 'completed',
          startTime: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          estimatedCompletion: new Date(Date.now() - 82800000).toISOString(), // 23 hours ago
          progress: 100,
          selectedReplays: 8,
          trainingParams: {
            focusArea: 'all',
            intensity: 'high',
            epochs: 25
          },
          fee: 0.041
        },
        {
          sessionId: 'demo-session-3',
          agentName: 'Killua',
          agentMint: 'demo-killua-training-mint-2024-3',
          status: 'completed',
          startTime: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          estimatedCompletion: new Date(Date.now() - 255600000).toISOString(),
          progress: 100,
          selectedReplays: 5,
          trainingParams: {
            focusArea: 'openings',
            intensity: 'low',
            epochs: 10
          },
          fee: 0.018
        }
      ];

      setAgents(demoAgents);
      setTrainingSessions(demoTrainingSessions);

      // Calculate stats
      const totalAgents = demoAgents.length;
      const totalValue = demoAgents.reduce((sum, agent) => sum + (agent.value || 0), 0);
      const totalWins = demoAgents.reduce((sum, agent) => sum + agent.wins, 0);
      const totalMatches = demoAgents.reduce((sum, agent) => sum + agent.totalMatches, 0);
      const totalRating = demoAgents.reduce((sum, agent) => sum + agent.rating, 0);
      const averageRating = totalRating / totalAgents;
      const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
      const activeTrainingSessions = demoTrainingSessions.filter(s => s.status === 'active').length;
      const completedTrainingSessions = demoTrainingSessions.filter(s => s.status === 'completed').length;
      const totalTrainingSpent = demoTrainingSessions.reduce((sum, session) => sum + session.fee, 0);

      setStats({
        totalAgents,
        totalValue,
        averageRating,
        totalWins,
        totalMatches,
        winRate,
        activeTrainingSessions,
        completedTrainingSessions,
        totalTrainingSpent
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data', { icon: '❌' });
    } finally {
      setIsLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'mythic': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      case 'legendary': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'epic': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'rare': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <SparklesIcon className="h-4 w-4 text-blue-400" />;
      case 'completed': return <CheckCircleIcon className="h-4 w-4 text-green-400" />;
      case 'failed': return <XCircleIcon className="h-4 w-4 text-red-400" />;
      default: return <PendingIcon className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  if (!mounted) {
    return (
      <Layout>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <SparklesIcon className="h-12 w-12 text-purple-500 mx-auto mb-4 animate-spin" />
            <p className="text-lg">Loading Dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Dashboard | NEN Platform</title>
        <meta name="description" content="AI Agent collection and training overview dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-6">
              <ChartBarIcon className="h-16 w-16 text-purple-500 mr-4" />
              <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-500 to-indigo-600">
                Dashboard
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              AI Agent Collection & Training Management
            </p>
          </motion.div>

          {/* Wallet Connection */}
          {!connected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 mb-8 max-w-2xl mx-auto text-center"
            >
              <BoltIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6">Connect your wallet to view your AI agent collection and training data</p>
              <ClientOnly fallback={<div className="bg-gray-700 rounded-lg p-4 animate-pulse h-12"></div>}>
                <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-purple-700 hover:!to-blue-700 !text-lg !px-8 !py-4 !font-semibold !rounded-lg" />
              </ClientOnly>
            </motion.div>
          )}

          {/* Dashboard Content */}
          {connected && (
            <>
              {/* Stats Overview */}
              {stats && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
                >
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <CpuChipIcon className="h-8 w-8 text-purple-500" />
                      <span className="text-2xl font-bold text-white">{stats.totalAgents}</span>
                    </div>
                    <h3 className="text-gray-300 font-medium">AI Agents</h3>
                    <p className="text-gray-400 text-sm">Total collection</p>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
                      <span className="text-2xl font-bold text-white">{stats.totalValue.toFixed(1)}</span>
                    </div>
                    <h3 className="text-gray-300 font-medium">Collection Value</h3>
                    <p className="text-gray-400 text-sm">SOL estimated</p>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <TrophyIcon className="h-8 w-8 text-yellow-500" />
                      <span className="text-2xl font-bold text-white">{stats.winRate.toFixed(1)}%</span>
                    </div>
                    <h3 className="text-gray-300 font-medium">Win Rate</h3>
                    <p className="text-gray-400 text-sm">{stats.totalWins}/{stats.totalMatches} matches</p>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <StarIcon className="h-8 w-8 text-blue-500" />
                      <span className="text-2xl font-bold text-white">{Math.round(stats.averageRating)}</span>
                    </div>
                    <h3 className="text-gray-300 font-medium">Avg Rating</h3>
                    <p className="text-gray-400 text-sm">ELO average</p>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* AI Agents Collection */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="lg:col-span-2"
                >
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-white flex items-center">
                        <UserGroupIcon className="h-8 w-8 text-purple-500 mr-3" />
                        Your AI Agents
                      </h2>
                      <button
                        onClick={() => router.push('/marketplace')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center text-sm"
                      >
                        <ShoppingCartIcon className="h-4 w-4 mr-2" />
                        Browse Market
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {agents.map((agent) => (
                        <motion.div
                          key={agent.mint}
                          whileHover={{ scale: 1.02 }}
                          className="bg-gray-700/30 rounded-lg p-4 border border-gray-600"
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-16 h-16 bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                              {agent.image ? (
                                <img
                                  src={agent.image}
                                  alt={agent.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="text-2xl">🤖</div>';
                                    }
                                  }}
                                />
                              ) : (
                                <div className="text-2xl">🤖</div>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-white font-semibold">{agent.name}</h3>
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${getRarityColor(agent.rarity)}`}>
                                  {agent.rarity}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-400">
                                <div className="flex items-center">
                                  <StarIcon className="h-4 w-4 text-yellow-500 mr-1" />
                                  {agent.rating}
                                </div>
                                <div>{agent.wins}W-{agent.losses}L</div>
                                <div>{agent.value} SOL</div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-xs text-gray-400">{agent.lastActive}</span>
                                {agent.isTraining ? (
                                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                                    Training
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => router.push('/training')}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center"
                                  >
                                    <AcademicCapIcon className="h-3 w-3 mr-1" />
                                    Train
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Training Sessions */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="lg:col-span-1"
                >
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center">
                        <AcademicCapIcon className="h-6 w-6 text-green-500 mr-2" />
                        Training Sessions
                      </h2>
                      <button
                        onClick={() => router.push('/training')}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                      >
                        New Session
                      </button>
                    </div>

                    <div className="space-y-4">
                      {trainingSessions.map((session) => (
                        <div
                          key={session.sessionId}
                          className="bg-gray-700/30 rounded-lg p-4 border border-gray-600"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-white font-medium">{session.agentName}</h3>
                            <div className={`px-2 py-1 rounded text-xs font-medium border flex items-center ${getStatusColor(session.status)}`}>
                              {getStatusIcon(session.status)}
                              <span className="ml-1 capitalize">{session.status}</span>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-400 space-y-1">
                            <div>Focus: {session.trainingParams.focusArea}</div>
                            <div>Replays: {session.selectedReplays}</div>
                            <div>Fee: {session.fee} SOL</div>
                            
                            {session.status === 'active' && session.progress && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs mb-1">
                                  <span>Progress</span>
                                  <span>{session.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-600 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${session.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="mt-12"
              >
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <RocketLaunchIcon className="h-8 w-8 text-purple-500 mr-3" />
                    Quick Actions
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => router.push('/marketplace')}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 p-6 rounded-xl text-left transition-all duration-200 transform hover:scale-105"
                    >
                      <ShoppingCartIcon className="h-8 w-8 text-white mb-3" />
                      <h3 className="text-lg font-semibold text-white mb-2">Browse Marketplace</h3>
                      <p className="text-gray-200 text-sm">Discover and purchase new AI agents</p>
                    </button>

                    <button
                      onClick={() => router.push('/training')}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 p-6 rounded-xl text-left transition-all duration-200 transform hover:scale-105"
                    >
                      <AcademicCapIcon className="h-8 w-8 text-white mb-3" />
                      <h3 className="text-lg font-semibold text-white mb-2">Start Training</h3>
                      <p className="text-gray-200 text-sm">Train your agents with match replays</p>
                    </button>

                    <button
                      onClick={() => router.push('/arena')}
                      className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 p-6 rounded-xl text-left transition-all duration-200 transform hover:scale-105"
                    >
                      <FireIcon className="h-8 w-8 text-white mb-3" />
                      <h3 className="text-lg font-semibold text-white mb-2">Enter Arena</h3>
                      <p className="text-gray-200 text-sm">Battle other AI agents in matches</p>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </main>
    </Layout>
  );
};

export default DashboardPage;
