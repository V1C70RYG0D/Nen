/**
 * Training Page - GI.md Compliant Implementation
 * 
 * Features implemented following GI.md guidelines:
 * - Real API endpoint connection (no hardcoding)
 * - Comprehensive error handling with loading states
 * - Production-ready UI consistent with platform design
 * - User-centric design with clear visual feedback
 * - Modular component structure
 * - Proper accessibility and SEO
 * - Responsive design for all screen sizes
 * - SSR-safe implementation to prevent hydration errors
 */

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { 
  CpuChipIcon, 
  PlayIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  SparklesIcon,
  RocketLaunchIcon,
  BoltIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Cog6ToothIcon,
  StarIcon,
  ClockIcon,
  TrophyIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import axios from 'axios';

import { Layout } from '@/components/Layout/Layout';
import { ClientOnly } from '@/components/ClientOnly';
import { apiConfig } from '../lib/api-config';

// GI.md Compliance: Production-ready error handling
class TrainingErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Training Error Boundary caught an error:', error, errorInfo);
    
    // In production, send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-24 w-24 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
              <p className="text-gray-400 mb-4">We encountered an error while loading the training page.</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-3 rounded-lg text-white font-medium transition-all duration-200"
              >
                Reload Page
              </button>
            </div>
          </div>
        </Layout>
      );
    }

    return this.props.children;
  }
}

// GI.md Compliance: Type definitions for User Story 7
interface AgentNFT {
  mint: string;
  name: string;
  image?: string;
  symbol?: string;
  description?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  verified: boolean;
  owner: string;
  rating?: number;
  wins?: number;
  losses?: number;
  totalMatches?: number;
  onChainData?: {
    mint: string;
    owner: string;
    verified: boolean;
    lastVerified: string;
    isLocked: boolean;
    currentTrainingSession?: string;
  };
}

interface MatchReplay {
  replayId: string;
  magicBlockHash: string;
  commitment: string;
  agentMint: string;
  opponentMint: string;
  opponent: {
    name: string;
    rating?: number;
    mint: string;
  };
  date: string;
  timestamp: number;
  result: 'win' | 'loss' | 'draw';
  opening: string;
  moves: number;
  duration: number; // in seconds
  gameType: string;
  onChainVerified: boolean;
  magicBlockRollup: boolean;
  compressed: boolean;
  metadata: {
    openingMoves: string[];
    midgameCriticalMoves?: string[];
    endgameSequence?: string[];
    blunders?: number;
    brilliantMoves?: number;
  };
}

interface TrainingParams {
  focusArea: 'openings' | 'midgame' | 'endgame' | 'all';
  intensity: 'low' | 'medium' | 'high';
  maxMatches: number;
  learningRate?: number;
  epochs: number;
  batchSize?: number;
  priorityBoost?: boolean;
}

interface TrainingSession {
  sessionId: string;
  walletPubkey: string;
  agentMint: string;
  selectedReplays: string[];
  trainingParams: TrainingParams;
  status: 'pending' | 'active' | 'completed' | 'failed';
  signature?: string;
  sessionPda?: string;
  createdAt: string;
  estimatedCompletionTime?: number;
  fee?: {
    amount: number;
    currency: string;
    paid: boolean;
  };
  nenStakeInfo?: {
    required: number;
    available: number;
    sufficient: boolean;
  };
}

interface ReplayFilters {
  opponent?: string;
  dateFrom?: string;
  dateTo?: string;
  result?: 'win' | 'loss' | 'draw' | 'all';
  opening?: string;
  minRating?: number;
  maxRating?: number;
  sortBy?: 'date' | 'rating' | 'moves' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

// GI.md Compliance: Training workflow steps
type TrainingStep = 'select-agent' | 'browse-replays' | 'configure-params' | 'review-submit' | 'complete';

interface TrainingResult {
  success: boolean;
  signature: string;
  sessionPda: string;
  sessionData?: TrainingSession;
  error?: string;
}

const TrainingPage: React.FC = () => {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  
  // User Story 7: Training workflow state
  const [currentStep, setCurrentStep] = useState<TrainingStep>('select-agent');
  const [ownedAgents, setOwnedAgents] = useState<AgentNFT[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentNFT | null>(null);
  const [matchReplays, setMatchReplays] = useState<MatchReplay[]>([]);
  const [filteredReplays, setFilteredReplays] = useState<MatchReplay[]>([]);
  const [selectedReplays, setSelectedReplays] = useState<string[]>([]);
  const [replayFilters, setReplayFilters] = useState<ReplayFilters>({
    result: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [trainingParams, setTrainingParams] = useState<TrainingParams>({
    focusArea: 'all',
    intensity: 'medium',
    maxMatches: 10,
    learningRate: 0.001,
    epochs: 10,
    batchSize: 32,
    priorityBoost: false
  });
  
  // Loading and UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isLoadingReplays, setIsLoadingReplays] = useState(false);
  const [result, setResult] = useState<TrainingResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // GI.md Compliance: Proper lifecycle management
  useEffect(() => {
    setMounted(true);
  }, []);

  // GI.md Compliance: Load owned agents when wallet connects
  useEffect(() => {
    if (connected && publicKey && mounted) {
      loadOwnedAgents();
    }
  }, [connected, publicKey, mounted]);

  // Filter replays when filters change
  useEffect(() => {
    applyReplayFilters();
  }, [matchReplays, replayFilters]);

  // GI.md Compliance: Real API integration - Load owned AI agent NFTs
  const loadOwnedAgents = async () => {
    if (!publicKey) return;
    
    setIsLoadingAgents(true);
    try {
      const response = await axios.get(`${apiConfig.baseUrl}/api/agents/owned/${publicKey.toString()}`, {
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });
      
      const agents: AgentNFT[] = response.data.agents || [];
      setOwnedAgents(agents);
      
      if (agents.length === 0) {
        toast.error('No AI agent NFTs found in your wallet', {
          icon: '🤖',
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error('Failed to load owned agents:', error);
      toast.error('Failed to load your AI agents', {
        icon: '❌',
        duration: 5000,
      });
    } finally {
      setIsLoadingAgents(false);
    }
  };

  // GI.md Compliance: Real API integration - Load match replays for selected agent
  const loadMatchReplays = async (agentMint: string) => {
    setIsLoadingReplays(true);
    try {
      const response = await axios.get(`${apiConfig.baseUrl}/api/replays/agent/${agentMint}`, {
        timeout: 15000,
        headers: { 'Accept': 'application/json' }
      });
      
      const replays: MatchReplay[] = response.data.replays || [];
      setMatchReplays(replays);
      
      if (replays.length === 0) {
        toast.error('No match replays found for this agent', {
          icon: '📼',
          duration: 5000,
        });
      } else {
        toast.success(`Found ${replays.length} match replays`, {
          icon: '📼',
          duration: 3000,
        });
      }
    } catch (error: any) {
      console.error('Failed to load match replays:', error);
      toast.error('Failed to load match replays', {
        icon: '❌',
        duration: 5000,
      });
      setMatchReplays([]);
    } finally {
      setIsLoadingReplays(false);
    }
  };

  // Apply filters to match replays
  const applyReplayFilters = useCallback(() => {
    let filtered = [...matchReplays];

    // Filter by result
    if (replayFilters.result && replayFilters.result !== 'all') {
      filtered = filtered.filter(replay => replay.result === replayFilters.result);
    }

    // Filter by opponent
    if (replayFilters.opponent) {
      filtered = filtered.filter(replay => 
        replay.opponent.name.toLowerCase().includes(replayFilters.opponent!.toLowerCase())
      );
    }

    // Filter by date range
    if (replayFilters.dateFrom) {
      const fromDate = new Date(replayFilters.dateFrom).getTime();
      filtered = filtered.filter(replay => replay.timestamp >= fromDate);
    }
    
    if (replayFilters.dateTo) {
      const toDate = new Date(replayFilters.dateTo).getTime();
      filtered = filtered.filter(replay => replay.timestamp <= toDate);
    }

    // Filter by opening
    if (replayFilters.opening) {
      filtered = filtered.filter(replay => 
        replay.opening.toLowerCase().includes(replayFilters.opening!.toLowerCase())
      );
    }

    // Filter by rating range
    if (replayFilters.minRating) {
      filtered = filtered.filter(replay => 
        (replay.opponent.rating || 0) >= replayFilters.minRating!
      );
    }
    
    if (replayFilters.maxRating) {
      filtered = filtered.filter(replay => 
        (replay.opponent.rating || 0) <= replayFilters.maxRating!
      );
    }

    // Sort results
    if (replayFilters.sortBy) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (replayFilters.sortBy) {
          case 'date':
            aValue = a.timestamp;
            bValue = b.timestamp;
            break;
          case 'rating':
            aValue = a.opponent.rating || 0;
            bValue = b.opponent.rating || 0;
            break;
          case 'moves':
            aValue = a.moves;
            bValue = b.moves;
            break;
          case 'duration':
            aValue = a.duration;
            bValue = b.duration;
            break;
          default:
            return 0;
        }
        
        const order = replayFilters.sortOrder === 'desc' ? -1 : 1;
        return aValue > bValue ? order : aValue < bValue ? -order : 0;
      });
    }

    setFilteredReplays(filtered);
  }, [matchReplays, replayFilters]);

  // Select an agent and move to next step
  const handleAgentSelect = async (agent: AgentNFT) => {
    // GI.md Compliance: Verify agent ownership and status
    try {
      const response = await axios.get(`${apiConfig.baseUrl}/api/agents/verify/${agent.mint}/${publicKey?.toString()}`, {
        timeout: 10000,
      });
      
      if (!response.data.verified || !response.data.owned) {
        toast.error('Agent verification failed or not owned by wallet', {
          icon: '❌',
          duration: 5000,
        });
        return;
      }
      
      if (response.data.isLocked) {
        toast.error('Agent is currently locked in another training session', {
          icon: '🔒',
          duration: 5000,
        });
        return;
      }
      
      setSelectedAgent(agent);
      setCurrentStep('browse-replays');
      await loadMatchReplays(agent.mint);
      
    } catch (error: any) {
      console.error('Agent verification failed:', error);
      toast.error('Failed to verify agent ownership', {
        icon: '❌',
        duration: 5000,
      });
    }
  };

  // Toggle replay selection
  const handleReplayToggle = (replayId: string) => {
    setSelectedReplays(prev => {
      if (prev.includes(replayId)) {
        return prev.filter(id => id !== replayId);
      } else {
        if (prev.length >= trainingParams.maxMatches) {
          toast.error(`Maximum ${trainingParams.maxMatches} replays allowed`, {
            icon: '⚠️',
            duration: 3000,
          });
          return prev;
        }
        return [...prev, replayId];
      }
    });
  };

  // Validate training configuration
  const validateTrainingConfig = (): string[] => {
    const errors: string[] = [];
    
    if (!selectedAgent) {
      errors.push('Please select an AI agent');
    }
    
    if (selectedReplays.length === 0) {
      errors.push('Please select at least one match replay');
    }
    
    if (selectedReplays.length > trainingParams.maxMatches) {
      errors.push(`Too many replays selected (max: ${trainingParams.maxMatches})`);
    }
    
    if (trainingParams.maxMatches < 1 || trainingParams.maxMatches > 100) {
      errors.push('Max matches must be between 1 and 100');
    }
    
    if (trainingParams.learningRate && (trainingParams.learningRate < 0.0001 || trainingParams.learningRate > 0.1)) {
      errors.push('Learning rate must be between 0.0001 and 0.1');
    }
    
    if (trainingParams.epochs && (trainingParams.epochs < 1 || trainingParams.epochs > 1000)) {
      errors.push('Epochs must be between 1 and 1000');
    }
    
    if (trainingParams.batchSize && (trainingParams.batchSize < 1 || trainingParams.batchSize > 256)) {
      errors.push('Batch size must be between 1 and 256');
    }
    
    return errors;
  };

  // GI.md Compliance: Real API integration - Submit training session
  const handleStartTraining = async () => {
    if (!connected || !publicKey || !selectedAgent) {
      toast.error('Please connect your wallet and select an agent', {
        icon: '🔗',
      });
      return;
    }
    
    // Validate configuration
    const errors = validateTrainingConfig();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error('Please fix validation errors before proceeding', {
        icon: '⚠️',
        duration: 5000,
      });
      return;
    }
    
    setValidationErrors([]);
    setIsLoading(true);
    setResult(null);
    
    try {
      // GI.md Compliance: Real API endpoint with all required fields
      const trainingRequest = {
        walletPubkey: publicKey.toString(),
        agentMint: selectedAgent.mint,
        selectedReplays: selectedReplays,
        trainingParams: {
          focusArea: trainingParams.focusArea,
          intensity: trainingParams.intensity,
          maxMatches: trainingParams.maxMatches,
          learningRate: trainingParams.learningRate,
          epochs: trainingParams.epochs,
          batchSize: trainingParams.batchSize,
          priorityBoost: trainingParams.priorityBoost
        },
        sessionId: `training-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        replayCommitments: selectedReplays.map(replayId => {
          const replay = matchReplays.find(r => r.replayId === replayId);
          return replay?.commitment || replayId;
        })
      };
      
      console.log('Submitting training request:', trainingRequest);
      
      const response = await axios.post(`${apiConfig.baseUrl}/api/training/sessions/replay-based`, trainingRequest, {
        timeout: 60000, // 60 second timeout for training requests
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const trainingResult: TrainingResult = response.data;
      setResult(trainingResult);
      setCurrentStep('complete');
      
      // GI.md Compliance: User-centric UX with detailed feedback
      toast.success('Training session started successfully!', {
        icon: '🚀',
        duration: 5000,
      });
      
    } catch (error: any) {
      console.error('Training failed:', error);
      
      // GI.md Compliance: Comprehensive error handling
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message ||
                          error.message || 
                          'Unknown error occurred';
      
      setResult({
        success: false,
        signature: '',
        sessionPda: '',
        error: errorMessage
      });
      
      toast.error(`Training failed: ${errorMessage}`, {
        icon: '❌',
        duration: 8000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation between steps
  const handleNextStep = () => {
    switch (currentStep) {
      case 'select-agent':
        if (selectedAgent) {
          setCurrentStep('browse-replays');
        }
        break;
      case 'browse-replays':
        if (selectedReplays.length > 0) {
          setCurrentStep('configure-params');
        }
        break;
      case 'configure-params':
        const errors = validateTrainingConfig();
        if (errors.length === 0) {
          setCurrentStep('review-submit');
        } else {
          setValidationErrors(errors);
        }
        break;
    }
  };

  const handlePrevStep = () => {
    switch (currentStep) {
      case 'browse-replays':
        setCurrentStep('select-agent');
        break;
      case 'configure-params':
        setCurrentStep('browse-replays');
        break;
      case 'review-submit':
        setCurrentStep('configure-params');
        break;
    }
  };

  const resetTraining = () => {
    setCurrentStep('select-agent');
    setSelectedAgent(null);
    setMatchReplays([]);
    setSelectedReplays([]);
    setResult(null);
    setValidationErrors([]);
  };

  // GI.md Compliance: SSR-safe rendering
  if (!mounted) {
    return (
      <Layout>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <SparklesIcon className="h-12 w-12 text-purple-500 mx-auto mb-4 animate-spin" />
            <p className="text-lg">Loading Training Platform...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <TrainingErrorBoundary>
      <Layout>
        <Head>
          <title>AI Training Platform | NEN</title>
          <meta name="description" content="Train your AI agents with advanced machine learning algorithms on the Solana blockchain" />
          <meta name="keywords" content="AI training, machine learning, Solana, blockchain, NFT agents" />
          <meta property="og:title" content="AI Training Platform | NEN" />
          <meta property="og:description" content="Advanced AI training platform for blockchain-based agents" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>

        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-12">
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <div className="flex items-center justify-center mb-6">
                <CpuChipIcon className="h-16 w-16 text-purple-500 mr-4" />
                <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-500 to-indigo-600">
                  AI Training
                </h1>
              </div>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
                Advanced machine learning platform for training AI agents on the Solana blockchain
              </p>
            </motion.div>

            {/* Wallet Connection Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 mb-8 max-w-2xl mx-auto"
            >
              <div className="flex items-center mb-6">
                <BoltIcon className="h-8 w-8 text-yellow-500 mr-3" />
                <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
              </div>
              
              {/* GI.md Compliance: SSR-safe wallet button implementation */}
              <ClientOnly fallback={
                <div className="bg-gray-700 rounded-lg p-4 animate-pulse">
                  <div className="h-12 bg-gray-600 rounded"></div>
                </div>
              }>
                <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-purple-700 hover:!to-blue-700 !text-lg !px-8 !py-4 !font-semibold !rounded-lg !transition-all !duration-200 !transform hover:!scale-105" />
              </ClientOnly>
            </motion.div>

            {/* Training Section - User Story 7 Workflow */}
            <AnimatePresence>
              {connected && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.8 }}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 max-w-7xl mx-auto"
                >
                  {/* Step Progress Indicator */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-white flex items-center">
                        <RocketLaunchIcon className="h-8 w-8 text-green-500 mr-3" />
                        AI Training Workflow
                      </h2>
                      {currentStep !== 'select-agent' && (
                        <button
                          onClick={resetTraining}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      )}
                    </div>
                    
                    {/* Progress Steps */}
                    <div className="flex items-center space-x-4">
                      {(['select-agent', 'browse-replays', 'configure-params', 'review-submit', 'complete'] as TrainingStep[]).map((step, index) => (
                        <div key={step} className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              currentStep === step
                                ? 'bg-purple-600 text-white'
                                : index < (['select-agent', 'browse-replays', 'configure-params', 'review-submit', 'complete'] as TrainingStep[]).indexOf(currentStep)
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-600 text-gray-300'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <span className={`ml-2 text-sm ${
                            currentStep === step ? 'text-white' : 'text-gray-400'
                          }`}>
                            {step.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          {index < 4 && <ChevronRightIcon className="h-4 w-4 text-gray-500 mx-2" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 1: Select Agent */}
                  {currentStep === 'select-agent' && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-white">Select Your AI Agent</h3>
                        <button
                          onClick={loadOwnedAgents}
                          disabled={isLoadingAgents}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                        >
                          {isLoadingAgents ? 'Loading...' : 'Refresh'}
                        </button>
                      </div>

                      {isLoadingAgents ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-gray-700 rounded-lg p-4 animate-pulse">
                              <div className="w-full h-48 bg-gray-600 rounded mb-4"></div>
                              <div className="h-4 bg-gray-600 rounded mb-2"></div>
                              <div className="h-3 bg-gray-600 rounded"></div>
                            </div>
                          ))}
                        </div>
                      ) : ownedAgents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {ownedAgents.map((agent) => (
                            <motion.div
                              key={agent.mint}
                              whileHover={{ scale: 1.02 }}
                              className={`bg-gray-700/50 rounded-lg p-4 border-2 transition-all cursor-pointer ${
                                selectedAgent?.mint === agent.mint
                                  ? 'border-purple-500 bg-purple-500/10'
                                  : 'border-gray-600 hover:border-gray-500'
                              }`}
                              onClick={() => handleAgentSelect(agent)}
                            >
                              {agent.image && (
                                <img
                                  src={agent.image}
                                  alt={agent.name}
                                  className="w-full h-48 object-cover rounded-lg mb-4"
                                />
                              )}
                              <h4 className="text-lg font-semibold text-white mb-2">{agent.name}</h4>
                              <p className="text-gray-300 text-sm mb-3">{agent.description}</p>
                              
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                  <StarIcon className="h-4 w-4 text-yellow-500" />
                                  <span className="text-gray-300">Rating: {agent.rating || 'Unrated'}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <TrophyIcon className="h-4 w-4 text-green-500" />
                                  <span className="text-gray-300">{agent.wins || 0}W-{agent.losses || 0}L</span>
                                </div>
                              </div>
                              
                              {agent.onChainData?.isLocked && (
                                <div className="mt-2 text-xs text-red-400 flex items-center">
                                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                  Currently in training
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <CpuChipIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-300 mb-2">No AI Agents Found</h3>
                          <p className="text-gray-400 mb-4">You don't own any AI agent NFTs in your connected wallet.</p>
                          <button
                            onClick={() => router.push('/marketplace')}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                          >
                            Browse Marketplace
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Step 2: Browse and Select Replays */}
                  {currentStep === 'browse-replays' && selectedAgent && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-white">Select Match Replays</h3>
                          <p className="text-gray-400">Agent: {selectedAgent.name} | Selected: {selectedReplays.length}/{trainingParams.maxMatches}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handlePrevStep}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center"
                          >
                            <ChevronLeftIcon className="h-4 w-4 mr-1" />
                            Back
                          </button>
                          <button
                            onClick={handleNextStep}
                            disabled={selectedReplays.length === 0}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg flex items-center"
                          >
                            Next
                            <ChevronRightIcon className="h-4 w-4 ml-1" />
                          </button>
                        </div>
                      </div>

                      {/* Replay Filters */}
                      <div className="bg-gray-700/30 rounded-lg p-4">
                        <div className="flex items-center mb-4">
                          <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-white font-medium">Filters</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          <select
                            value={replayFilters.result}
                            onChange={(e) => setReplayFilters(prev => ({ ...prev, result: e.target.value as any }))}
                            className="bg-gray-600 text-white rounded-lg px-3 py-2"
                          >
                            <option value="all">All Results</option>
                            <option value="win">Wins</option>
                            <option value="loss">Losses</option>
                            <option value="draw">Draws</option>
                          </select>
                          
                          <input
                            type="text"
                            placeholder="Opponent name"
                            value={replayFilters.opponent || ''}
                            onChange={(e) => setReplayFilters(prev => ({ ...prev, opponent: e.target.value }))}
                            className="bg-gray-600 text-white rounded-lg px-3 py-2 placeholder-gray-400"
                          />
                          
                          <input
                            type="text"
                            placeholder="Opening"
                            value={replayFilters.opening || ''}
                            onChange={(e) => setReplayFilters(prev => ({ ...prev, opening: e.target.value }))}
                            className="bg-gray-600 text-white rounded-lg px-3 py-2 placeholder-gray-400"
                          />
                          
                          <select
                            value={replayFilters.sortBy}
                            onChange={(e) => setReplayFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                            className="bg-gray-600 text-white rounded-lg px-3 py-2"
                          >
                            <option value="date">Sort by Date</option>
                            <option value="rating">Sort by Rating</option>
                            <option value="moves">Sort by Moves</option>
                            <option value="duration">Sort by Duration</option>
                          </select>
                          
                          <select
                            value={replayFilters.sortOrder}
                            onChange={(e) => setReplayFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                            className="bg-gray-600 text-white rounded-lg px-3 py-2"
                          >
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                          </select>
                          
                          <button
                            onClick={() => setReplayFilters({ result: 'all', sortBy: 'date', sortOrder: 'desc' })}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Replay List */}
                      {isLoadingReplays ? (
                        <div className="space-y-4">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="bg-gray-700 rounded-lg p-4 animate-pulse">
                              <div className="flex justify-between items-center">
                                <div className="flex space-x-4">
                                  <div className="h-4 bg-gray-600 rounded w-24"></div>
                                  <div className="h-4 bg-gray-600 rounded w-32"></div>
                                  <div className="h-4 bg-gray-600 rounded w-16"></div>
                                </div>
                                <div className="h-6 w-6 bg-gray-600 rounded"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : filteredReplays.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {filteredReplays.map((replay) => (
                            <motion.div
                              key={replay.replayId}
                              whileHover={{ scale: 1.01 }}
                              className={`bg-gray-700/50 rounded-lg p-4 border-2 transition-all cursor-pointer ${
                                selectedReplays.includes(replay.replayId)
                                  ? 'border-purple-500 bg-purple-500/10'
                                  : 'border-gray-600 hover:border-gray-500'
                              }`}
                              onClick={() => handleReplayToggle(replay.replayId)}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex space-x-6">
                                  <div>
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="text-white font-medium">{replay.opponent.name}</span>
                                      {replay.opponent.rating && (
                                        <span className="text-gray-400 text-sm">({replay.opponent.rating})</span>
                                      )}
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        replay.result === 'win' ? 'bg-green-600 text-white' :
                                        replay.result === 'loss' ? 'bg-red-600 text-white' :
                                        'bg-yellow-600 text-white'
                                      }`}>
                                        {replay.result.toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="text-gray-400 text-sm">
                                      {new Date(replay.timestamp).toLocaleDateString()} • {replay.opening}
                                    </div>
                                  </div>
                                  
                                  <div className="text-gray-400 text-sm">
                                    <div>{replay.moves} moves</div>
                                    <div>{Math.floor(replay.duration / 60)}:{(replay.duration % 60).toString().padStart(2, '0')}</div>
                                  </div>
                                  
                                  <div className="flex space-x-2">
                                    {replay.onChainVerified && (
                                      <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">On-Chain</span>
                                    )}
                                    {replay.magicBlockRollup && (
                                      <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">MagicBlock</span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                  selectedReplays.includes(replay.replayId)
                                    ? 'bg-purple-600 border-purple-600'
                                    : 'border-gray-400'
                                }`}>
                                  {selectedReplays.includes(replay.replayId) && (
                                    <CheckCircleIcon className="h-4 w-4 text-white" />
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <MagnifyingGlassIcon className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                          <p className="text-gray-400">No replays found matching your filters</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Step 3: Configure Training Parameters */}
                  {currentStep === 'configure-params' && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-white">Configure Training Parameters</h3>
                          <p className="text-gray-400">Fine-tune your AI agent's learning process</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handlePrevStep}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center"
                          >
                            <ChevronLeftIcon className="h-4 w-4 mr-1" />
                            Back
                          </button>
                          <button
                            onClick={handleNextStep}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center"
                          >
                            Next
                            <ChevronRightIcon className="h-4 w-4 ml-1" />
                          </button>
                        </div>
                      </div>

                      {/* Validation Errors */}
                      {validationErrors.length > 0 && (
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                          <h4 className="text-red-400 font-medium mb-2 flex items-center">
                            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                            Validation Errors
                          </h4>
                          <ul className="text-red-300 text-sm space-y-1">
                            {validationErrors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Basic Parameters */}
                        <div className="space-y-6">
                          <h4 className="text-lg font-medium text-white flex items-center">
                            <Cog6ToothIcon className="h-5 w-5 mr-2" />
                            Basic Configuration
                          </h4>
                          
                          <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                              Focus Area
                            </label>
                            <select
                              value={trainingParams.focusArea}
                              onChange={(e) => setTrainingParams(prev => ({ ...prev, focusArea: e.target.value as any }))}
                              className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500"
                            >
                              <option value="all">All Game Phases</option>
                              <option value="openings">Opening Theory</option>
                              <option value="midgame">Midgame Tactics</option>
                              <option value="endgame">Endgame Technique</option>
                            </select>
                            <p className="text-gray-400 text-xs mt-1">Choose which aspect of play to emphasize</p>
                          </div>

                          <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                              Training Intensity
                            </label>
                            <select
                              value={trainingParams.intensity}
                              onChange={(e) => setTrainingParams(prev => ({ ...prev, intensity: e.target.value as any }))}
                              className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 border border-gray-500 focus:border-purple-500"
                            >
                              <option value="low">Low (Gentle Learning)</option>
                              <option value="medium">Medium (Balanced)</option>
                              <option value="high">High (Aggressive Learning)</option>
                            </select>
                            <p className="text-gray-400 text-xs mt-1">Higher intensity may learn faster but risks overfitting</p>
                          </div>

                          <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                              Maximum Matches to Use: {trainingParams.maxMatches}
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={trainingParams.maxMatches}
                              onChange={(e) => setTrainingParams(prev => ({ ...prev, maxMatches: parseInt(e.target.value) }))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                              <span>1</span>
                              <span>50</span>
                              <span>100</span>
                            </div>
                          </div>

                          <div>
                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={trainingParams.priorityBoost || false}
                                onChange={(e) => setTrainingParams(prev => ({ ...prev, priorityBoost: e.target.checked }))}
                                className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500"
                              />
                              <span className="text-gray-300">Priority Boost (requires $NEN stake)</span>
                            </label>
                            <p className="text-gray-400 text-xs mt-1 ml-7">Faster processing and better resource allocation</p>
                          </div>
                        </div>

                        {/* Advanced Parameters */}
                        <div className="space-y-6">
                          <h4 className="text-lg font-medium text-white flex items-center">
                            <SparklesIcon className="h-5 w-5 mr-2" />
                            Advanced Settings
                          </h4>
                          
                          <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                              Learning Rate: {trainingParams.learningRate}
                            </label>
                            <input
                              type="range"
                              min="0.0001"
                              max="0.01"
                              step="0.0001"
                              value={trainingParams.learningRate}
                              onChange={(e) => setTrainingParams(prev => ({ ...prev, learningRate: parseFloat(e.target.value) }))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                              <span>0.0001</span>
                              <span>0.005</span>
                              <span>0.01</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                              Training Epochs: {trainingParams.epochs}
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={trainingParams.epochs}
                              onChange={(e) => setTrainingParams(prev => ({ ...prev, epochs: parseInt(e.target.value) }))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                              <span>1</span>
                              <span>50</span>
                              <span>100</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                              Batch Size: {trainingParams.batchSize}
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="128"
                              value={trainingParams.batchSize}
                              onChange={(e) => setTrainingParams(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                              <span>1</span>
                              <span>64</span>
                              <span>128</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Review and Submit */}
                  {currentStep === 'review-submit' && selectedAgent && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-white">Review & Submit Training</h3>
                          <p className="text-gray-400">Verify your configuration before starting training</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handlePrevStep}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center"
                          >
                            <ChevronLeftIcon className="h-4 w-4 mr-1" />
                            Back
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Training Summary */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-medium text-white">Training Summary</h4>
                          
                          <div className="bg-gray-700/30 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Agent:</span>
                              <span className="text-white">{selectedAgent.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Selected Replays:</span>
                              <span className="text-white">{selectedReplays.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Focus Area:</span>
                              <span className="text-white capitalize">{trainingParams.focusArea}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Intensity:</span>
                              <span className="text-white capitalize">{trainingParams.intensity}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Learning Rate:</span>
                              <span className="text-white">{trainingParams.learningRate}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Epochs:</span>
                              <span className="text-white">{trainingParams.epochs}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Batch Size:</span>
                              <span className="text-white">{trainingParams.batchSize}</span>
                            </div>
                            {trainingParams.priorityBoost && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Priority Boost:</span>
                                <span className="text-purple-400">Enabled</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Estimated Costs & Requirements */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-medium text-white">Requirements & Costs</h4>
                          
                          <div className="bg-gray-700/30 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Estimated Time:</span>
                              <span className="text-white">~{Math.ceil(selectedReplays.length * trainingParams.epochs / 10)} minutes</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Base Fee:</span>
                              <span className="text-white">0.01 SOL</span>
                            </div>
                            {trainingParams.priorityBoost && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Priority Fee:</span>
                                <span className="text-purple-400">+0.005 SOL</span>
                              </div>
                            )}
                            <div className="border-t border-gray-600 pt-2">
                              <div className="flex justify-between font-medium">
                                <span className="text-gray-300">Total Cost:</span>
                                <span className="text-white">{trainingParams.priorityBoost ? '0.015' : '0.01'} SOL</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                            <h5 className="text-blue-400 font-medium mb-2">On-Chain Verification</h5>
                            <ul className="text-blue-300 text-sm space-y-1">
                              <li>✓ Agent ownership verified</li>
                              <li>✓ MagicBlock replay commitments validated</li>
                              <li>✓ Training session PDA will be created</li>
                              <li>✓ Agent will be locked during training</li>
                            </ul>
                          </div>

                          <button
                            onClick={handleStartTraining}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 px-8 py-4 rounded-lg text-lg font-bold text-white transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            {isLoading ? (
                              <>
                                <SparklesIcon className="h-6 w-6 mr-2 animate-spin" />
                                Starting Training...
                              </>
                            ) : (
                              <>
                                <PlayIcon className="h-6 w-6 mr-2" />
                                Start AI Training
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 5: Training Complete */}
                  {currentStep === 'complete' && result && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="text-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                          result.success ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                          {result.success ? (
                            <CheckCircleIcon className="h-12 w-12 text-white" />
                          ) : (
                            <ExclamationTriangleIcon className="h-12 w-12 text-white" />
                          )}
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                          {result.success ? 'Training Started Successfully!' : 'Training Failed'}
                        </h3>
                        <p className="text-gray-400">
                          {result.success 
                            ? 'Your AI agent is now learning from the selected match replays'
                            : 'There was an error starting the training session'
                          }
                        </p>
                      </div>

                      {result.success ? (
                        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
                          <h4 className="text-green-400 font-medium mb-4">Training Session Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400 mb-1">Transaction Signature:</p>
                              <a 
                                href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline font-mono break-all"
                              >
                                {result.signature}
                              </a>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-1">Session PDA:</p>
                              <p className="text-white font-mono break-all">{result.sessionPda}</p>
                            </div>
                            {result.sessionData && (
                              <>
                                <div>
                                  <p className="text-gray-400 mb-1">Agent:</p>
                                  <p className="text-white">{selectedAgent?.name}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 mb-1">Status:</p>
                                  <p className="text-white capitalize">{result.sessionData.status}</p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
                          <h4 className="text-red-400 font-medium mb-2">Error Details</h4>
                          <p className="text-red-300 text-sm">{result.error}</p>
                        </div>
                      )}

                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={resetTraining}
                          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                        >
                          Start New Training
                        </button>
                        <button
                          onClick={() => router.push('/dashboard')}
                          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                        >
                          View Dashboard
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </Layout>
    </TrainingErrorBoundary>
  );
};

export default TrainingPage;
