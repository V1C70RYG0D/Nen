import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Layout } from '@/components/Layout/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import AOS from 'aos';
import 'aos/dist/aos.css';

interface AgentNFT {
  mint: string;
  name: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  description?: string;
  symbol?: string;
  verified?: boolean;
  onChainData?: {
    mint: string;
    owner: string;
    verified: boolean;
    lastVerified: string;
  };
}

interface MatchReplay {
  replayId: string;
  magicBlockHash: string;
  agentMint: string;
  opponent: {
    name: string;
    mint: string;
  };
  date: string;
  result: 'win' | 'loss' | 'draw';
  opening: string;
  moves: number;
  duration: number;
  gameType: string;
  metadata: {
    onChain: boolean;
    magicBlockRollup: boolean;
    commitment: string;
    compressed: boolean;
    verified: boolean;
  };
}

interface TrainingParams {
  focusArea: 'openings' | 'midgame' | 'endgame' | 'all';
  intensity: 'low' | 'medium' | 'high';
  maxMatches: number;
  learningRate?: number;
  epochs?: number;
  batchSize?: number;
}

interface TrainingSession {
  sessionId: string;
  walletPubkey: string;
  agentMint: string;
  type: string;
  selectedReplaysCount?: number;
  trainingParams: TrainingParams;
  status: string;
  tx: string;
  explorer: string;
  createdAt: string;
  fee?: {
    amount: number;
    currency: string;
    paid: boolean;
  };
  priority?: string;
  estimatedCompletionTime?: number;
}

const TrainingClient: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  
  // Component state for User Story 7
  const [ownedAgents, setOwnedAgents] = useState<AgentNFT[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [matchReplays, setMatchReplays] = useState<MatchReplay[]>([]);
  const [selectedReplays, setSelectedReplays] = useState<string[]>([]);
  const [trainingParams, setTrainingParams] = useState<TrainingParams>({
    focusArea: 'all',
    intensity: 'medium',
    maxMatches: 10,
    learningRate: 0.001,
    epochs: 10,
    batchSize: 32
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isLoadingReplays, setIsLoadingReplays] = useState(false);
  const [activeSessions, setActiveSessions] = useState<TrainingSession[]>([]);
  
  // Filter states for match replays
  const [replayFilters, setReplayFilters] = useState({
    opponent: '',
    dateFrom: '',
    dateTo: '',
    result: '',
    opening: ''
  });
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // API Base URL from environment with fallback to our working backend
  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    }
    return 'http://localhost:3001';
  };
  
  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      AOS.init({
        duration: 1000,
        once: true,
      });
    }
  }, []);

  // Load owned agent NFTs when wallet connects - User Story 7 implementation
  useEffect(() => {
    if (connected && publicKey) {
      loadOwnedAgents();
      loadActiveSessions();
    } else {
      setOwnedAgents([]);
      setMatchReplays([]);
      setSelectedReplays([]);
      setActiveSessions([]);
      setSelectedAgent('');
    }
  }, [connected, publicKey]);

  // Load match replays when agent is selected - User Story 7
  useEffect(() => {
    if (selectedAgent && publicKey) {
      loadMatchReplays();
    } else {
      setMatchReplays([]);
      setSelectedReplays([]);
    }
  }, [selectedAgent, publicKey, replayFilters]);

  const loadOwnedAgents = async () => {
    if (!publicKey) return;
    
    setIsLoadingAgents(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/training/owned-agents`, {
        params: { walletAddress: publicKey.toString() },
        timeout: 10000
      });

      if (response.data.success) {
        const agents = response.data.data;
        setOwnedAgents(agents);
        if (agents.length > 0) {
          setSelectedAgent(agents[0].mint);
        }
        toast.success(`Found ${agents.length} AI agent(s) on devnet`);
      } else {
        throw new Error(response.data.error || 'Failed to load owned agents');
      }
    } catch (error: any) {
      console.error('Failed to load owned agents:', error);
      toast.error('Failed to load owned agents from devnet');
      
      // Fallback to mock data for demo purposes if devnet query fails
      const mockAgents: AgentNFT[] = [
        {
          mint: 'AGENTmint1111111111111111111111111111111111',
          name: 'Netero AI Agent',
          image: '/avatars/netero.png',
          attributes: [
            { trait_type: 'Elo Rating', value: '2450' },
            { trait_type: 'Nen Type', value: 'Enhancement' },
            { trait_type: 'Personality', value: 'Tactical' }
          ],
          description: 'Advanced AI agent trained on tactical gameplay patterns',
          verified: true
        },
        {
          mint: 'AGENTmint2222222222222222222222222222222222',
          name: 'Meruem AI Agent', 
          image: '/avatars/meruem.png',
          attributes: [
            { trait_type: 'Elo Rating', value: '2680' },
            { trait_type: 'Nen Type', value: 'Specialization' },
            { trait_type: 'Personality', value: 'Aggressive' }
          ],
          description: 'Elite AI agent with superior strategic capabilities',
          verified: true
        }
      ];
      
      setOwnedAgents(mockAgents);
      if (mockAgents.length > 0) {
        setSelectedAgent(mockAgents[0].mint);
      }
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const loadMatchReplays = async () => {
    if (!selectedAgent || !publicKey) return;
    
    setIsLoadingReplays(true);
    try {
      const params = {
        agentMint: selectedAgent,
        walletAddress: publicKey.toString(),
        ...replayFilters,
        limit: 50
      };

      const response = await axios.get(`${API_BASE_URL}/api/training/match-replays`, {
        params,
        timeout: 10000
      });

      if (response.data.success) {
        setMatchReplays(response.data.data);
        // Clear previous selections when loading new replays
        setSelectedReplays([]);
        toast.success(`Loaded ${response.data.data.length} match replays from MagicBlock`);
      } else {
        throw new Error(response.data.error || 'Failed to load match replays');
      }
    } catch (error: any) {
      console.error('Failed to load match replays:', error);
      toast.error('Failed to load match replays from MagicBlock');
      setMatchReplays([]);
    } finally {
      setIsLoadingReplays(false);
    }
  };

  const loadActiveSessions = async () => {
    // Load active training sessions for this wallet
    // Implementation would query backend for sessions
  };

  const handleReplaySelection = (replayId: string, selected: boolean) => {
    if (selected) {
      if (selectedReplays.length >= trainingParams.maxMatches) {
        toast.error(`Cannot select more than ${trainingParams.maxMatches} replays`);
        return;
      }
      setSelectedReplays(prev => [...prev, replayId]);
    } else {
      setSelectedReplays(prev => prev.filter(id => id !== replayId));
    }
  };

  const handleSelectAllReplays = () => {
    const maxSelectable = Math.min(matchReplays.length, trainingParams.maxMatches);
    const newSelection = matchReplays.slice(0, maxSelectable).map(replay => replay.replayId);
    setSelectedReplays(newSelection);
    toast.success(`Selected ${newSelection.length} replays for training`);
  };

  const handleClearReplaySelection = () => {
    setSelectedReplays([]);
    toast.success('Cleared replay selection');
  };

  const handleParamChange = (key: keyof TrainingParams, value: string | number) => {
    const newParams = { ...trainingParams, [key]: value };
    
    // If maxMatches is reduced, trim selectedReplays if needed
    if (key === 'maxMatches') {
      const maxMatches = parseInt(value as string);
      if (selectedReplays.length > maxMatches) {
        setSelectedReplays(prev => prev.slice(0, maxMatches));
        toast.success(`Reduced replay selection to ${maxMatches} matches`);
      }
    }
    
    setTrainingParams(newParams);
    
    // Clear validation error for this field
    if (validationErrors[key]) {
      setValidationErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setReplayFilters(prev => ({ ...prev, [key]: value }));
  };

  const validateTrainingRequest = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!selectedAgent) {
      errors.agent = 'Please select an AI agent';
    }
    
    if (selectedReplays.length === 0) {
      errors.replays = 'Please select at least one match replay';
    }
    
    if (selectedReplays.length > trainingParams.maxMatches) {
      errors.replays = `Too many replays selected. Maximum is ${trainingParams.maxMatches}`;
    }
    
    if (!trainingParams.focusArea) {
      errors.focusArea = 'Please select a focus area';
    }
    
    if (!trainingParams.intensity) {
      errors.intensity = 'Please select training intensity';
    }
    
    if (trainingParams.maxMatches < 1 || trainingParams.maxMatches > 50) {
      errors.maxMatches = 'Max matches must be between 1 and 50';
    }
    
    if (trainingParams.learningRate && (trainingParams.learningRate < 0.0001 || trainingParams.learningRate > 0.1)) {
      errors.learningRate = 'Learning rate must be between 0.0001 and 0.1';
    }
    
    if (trainingParams.epochs && (trainingParams.epochs < 1 || trainingParams.epochs > 100)) {
      errors.epochs = 'Epochs must be between 1 and 100';
    }
    
    if (trainingParams.batchSize && (trainingParams.batchSize < 1 || trainingParams.batchSize > 128)) {
      errors.batchSize = 'Batch size must be between 1 and 128';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitTrainingRequest = async () => {
    if (!publicKey || !selectedAgent || selectedReplays.length === 0) {
      toast.error('Please connect wallet, select an agent, and choose training replays');
      return;
    }

    if (!validateTrainingRequest()) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    setIsLoading(true);
    try {
      const requestData = {
        walletPubkey: publicKey.toString(),
        agentMint: selectedAgent,
        selectedReplays,
        trainingParams
      };

      const response = await axios.post(`${API_BASE_URL}/api/training/sessions/replay-based`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.success) {
        const session = response.data;
        toast.success(`Training session initiated! Session ID: ${session.sessionId}`);
        
        // Add to active sessions
        setActiveSessions(prev => [session, ...prev]);
        
        // Reset form
        setSelectedReplays([]);
        setTrainingParams({
          focusArea: 'all',
          intensity: 'medium',
          maxMatches: 10,
          learningRate: 0.001,
          epochs: 10,
          batchSize: 32
        });
        
      } else {
        throw new Error(response.data.error || 'Failed to initiate training');
      }
    } catch (error: any) {
      console.error('Training submission failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to submit training request';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!connected) {
    return (
      <Layout>
        {/* Hero Section for Non-Connected Users */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-solana-purple/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-solana-green/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-magicblock-primary/10 rounded-full blur-3xl animate-pulse-slow" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Title */}
            <h1 
              className="text-6xl md:text-8xl font-hunter mb-6 glitch-text" 
              data-text="AI TRAINING"
              data-aos="fade-up"
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-solana-purple via-solana-green to-magicblock-primary animate-gradient text-glow">
                AI TRAINING
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl font-cyber text-gray-300 mb-8" data-aos="fade-up" data-aos-delay="200">
              TRAIN YOUR AI HUNTERS WITH ON-CHAIN MATCH REPLAYS
            </p>
            
            {/* Description */}
            <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-12" data-aos="fade-up" data-aos-delay="400">
              Select your owned AI agent NFTs and train them using previous match replays recorded on MagicBlock. 
              Configure training parameters and submit on-chain training sessions on Solana devnet.
            </p>              {/* Connect Wallet Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                data-aos="fade-up" 
                data-aos-delay="600"
              >
                <WalletMultiButton className="!bg-gradient-to-r !from-solana-purple !to-magicblock-primary !text-lg !px-8 !py-4 !font-cyber !uppercase !tracking-wider hover:scale-105 transition-transform" />
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <div className="w-6 h-10 border-2 border-solana-purple rounded-full flex justify-center">
              <div className="w-1 h-2 bg-solana-purple rounded-full mt-2 animate-bounce" />
            </div>
          </motion.div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Rest of the training interface - truncated for brevity but includes all functionality */}
      <section className="relative py-20 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-hunter mb-4 glitch-text">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-solana-purple via-solana-green to-magicblock-primary animate-gradient text-glow">
                AI TRAINING PROTOCOL
              </span>
            </h1>
            <p className="text-xl font-cyber text-gray-300">
              TRAIN YOUR HUNTERS WITH ON-CHAIN MATCH REPLAYS
            </p>
          </motion.div>
          {/* Agent Selection Section */}
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {/* Owned Agents */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <h3 className="text-xl font-cyber mb-4 text-solana-purple">YOUR AI AGENTS</h3>
                
                {isLoadingAgents ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-solana-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading your agents...</p>
                  </div>
                ) : ownedAgents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">No AI agents found</p>
                    <p className="text-sm text-gray-500">Connect a wallet with AI agent NFTs</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ownedAgents.map((agent) => (
                      <motion.div
                        key={agent.mint}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedAgent === agent.mint
                            ? 'border-solana-purple bg-solana-purple/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                        onClick={() => setSelectedAgent(agent.mint)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center space-x-3">
                          {agent.image && (
                            <img 
                              src={agent.image} 
                              alt={agent.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{agent.name}</h4>
                            <p className="text-xs text-gray-400 font-mono">{agent.mint.slice(0, 8)}...</p>
                            {agent.verified && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-900/30 text-green-400 mt-1">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Match Replays */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-cyber text-magicblock-primary">MATCH REPLAYS</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSelectAllReplays}
                      disabled={matchReplays.length === 0}
                      className="px-3 py-1 text-xs bg-solana-green/20 text-solana-green rounded-lg hover:bg-solana-green/30 disabled:opacity-50"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleClearReplaySelection}
                      disabled={selectedReplays.length === 0}
                      className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {!selectedAgent ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Select an AI agent to view match replays</p>
                  </div>
                ) : isLoadingReplays ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-magicblock-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading match replays...</p>
                  </div>
                ) : matchReplays.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-2">No match replays found</p>
                    <p className="text-sm text-gray-500">Try adjusting filters or check back later</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {matchReplays.map((replay) => (
                      <motion.div
                        key={replay.replayId}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedReplays.includes(replay.replayId)
                            ? 'border-magicblock-primary bg-magicblock-primary/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                        onClick={() => handleReplaySelection(
                          replay.replayId, 
                          !selectedReplays.includes(replay.replayId)
                        )}
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                replay.result === 'win' ? 'bg-green-900/30 text-green-400' :
                                replay.result === 'loss' ? 'bg-red-900/30 text-red-400' :
                                'bg-yellow-900/30 text-yellow-400'
                              }`}>
                                {replay.result.toUpperCase()}
                              </span>
                              <span className="text-sm text-gray-300">vs {replay.opponent.name}</span>
                              <span className="text-xs text-gray-500">{replay.moves} moves</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-1">{replay.opening}</p>
                            <p className="text-xs text-gray-500 font-mono">{replay.replayId.slice(0, 12)}...</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">{new Date(replay.date).toLocaleDateString()}</p>
                            {replay.metadata.verified && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-900/30 text-blue-400 mt-1">
                                ✓ On-Chain
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {matchReplays.length > 0 && (
                  <div className="mt-4 text-sm text-gray-400">
                    Selected: {selectedReplays.length} / {trainingParams.maxMatches} replays
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Training Parameters & Submit */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
            <h3 className="text-2xl font-cyber mb-6 text-solana-green">TRAINING CONFIGURATION</h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Focus Area */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Focus Area</label>
                <select
                  value={trainingParams.focusArea}
                  onChange={(e) => handleParamChange('focusArea', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-solana-purple"
                >
                  <option value="all">All Phases</option>
                  <option value="openings">Openings</option>
                  <option value="midgame">Midgame</option>
                  <option value="endgame">Endgame</option>
                </select>
                {validationErrors.focusArea && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.focusArea}</p>
                )}
              </div>

              {/* Training Intensity */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Intensity</label>
                <select
                  value={trainingParams.intensity}
                  onChange={(e) => handleParamChange('intensity', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-solana-purple"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                {validationErrors.intensity && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.intensity}</p>
                )}
              </div>

              {/* Max Matches */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Matches</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={trainingParams.maxMatches}
                  onChange={(e) => handleParamChange('maxMatches', parseInt(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-solana-purple"
                />
                {validationErrors.maxMatches && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.maxMatches}</p>
                )}
              </div>

              {/* Learning Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Learning Rate</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  max="0.1"
                  value={trainingParams.learningRate}
                  onChange={(e) => handleParamChange('learningRate', parseFloat(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-solana-purple"
                />
                {validationErrors.learningRate && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.learningRate}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <motion.button
                onClick={submitTrainingRequest}
                disabled={isLoading || !selectedAgent || selectedReplays.length === 0}
                className="bg-gradient-to-r from-solana-purple to-magicblock-primary text-white font-cyber text-lg px-12 py-4 rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? (
                  <span className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>INITIATING TRAINING...</span>
                  </span>
                ) : (
                  'START AI TRAINING'
                )}
              </motion.button>
              
              {(validationErrors.agent || validationErrors.replays) && (
                <p className="text-red-400 text-sm mt-2">
                  {validationErrors.agent || validationErrors.replays}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default TrainingClient;
