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
import TrainingReplaySelection from '@/components/TrainingReplaySelection';
import TrainingParametersConfig, { TrainingParameters } from '@/components/TrainingParametersConfig';

interface AgentNFT {
  mint: string;
  name: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  description?: string;
  symbol?: string;
}

interface TrainingSession {
  sessionId: string;
  walletPubkey: string;
  agentMint: string;
  replayIds: string[];
  params: TrainingParameters;
  status: string;
  tx: string;
  explorer: string;
  createdAt: string;
}

const Training: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [ownedAgents, setOwnedAgents] = useState<AgentNFT[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedReplays, setSelectedReplays] = useState<string[]>([]);
  const [trainingParams, setTrainingParams] = useState<TrainingParameters>({
    focusArea: 'all',
    intensity: 'medium',
    maxMatches: 100,
    learningRate: 0.01,
    batchSize: 32,
    epochs: 10
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [activeSessions, setActiveSessions] = useState<TrainingSession[]>([]);

  // API Base URL from environment
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3011';

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  // Load owned agent NFTs when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      loadOwnedAgents();
      loadActiveSessions();
    } else {
      setOwnedAgents([]);
      setActiveSessions([]);
    }
  }, [connected, publicKey]);

  const loadOwnedAgents = async () => {
    if (!publicKey) return;
    
    setIsLoadingAgents(true);
    try {
      // In production, this would query the blockchain for actual NFTs
      // For demo purposes, we'll provide some mock owned agents
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
          description: 'Advanced AI agent trained on tactical gameplay patterns'
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
          description: 'Elite AI agent with superior strategic capabilities'
        }
      ];
      
      setOwnedAgents(mockAgents);
      if (mockAgents.length > 0) {
        setSelectedAgent(mockAgents[0].mint);
      }
    } catch (error) {
      console.error('Failed to load owned agents:', error);
      toast.error('Failed to load owned agents');
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const loadActiveSessions = async () => {
    // Load active training sessions for this wallet
    // Implementation would query backend for sessions
  };

  const submitTrainingRequest = async () => {
    if (!publicKey || !selectedAgent || selectedReplays.length === 0) {
      toast.error('Please connect wallet, select an agent, and choose training replays');
      return;
    }

    if (selectedReplays.length > trainingParams.maxMatches) {
      toast.error(`Too many replays selected. Maximum allowed: ${trainingParams.maxMatches}`);
      return;
    }

    setIsLoading(true);
    try {
      const requestData = {
        walletPubkey: publicKey.toString(),
        agentMint: selectedAgent,
        replayIds: selectedReplays,
        params: trainingParams
      };

      const response = await axios.post(`${API_BASE_URL}/api/v1/replay-training/process`, requestData, {
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
          maxMatches: 100,
          learningRate: 0.01,
          batchSize: 32,
          epochs: 10
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
                ENHANCE YOUR AI HUNTERS WITH ADVANCED TRAINING
              </p>
              
              {/* Description */}
              <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-12" data-aos="fade-up" data-aos-delay="400">
                Select on-chain match replays to train your AI agents. Improve your hunters with strategic 
                gameplay patterns and unlock their true potential on the Solana blockchain.
              </p>
              
              {/* Connect Wallet Button */}
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
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-solana-purple/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-solana-green/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 
              className="text-5xl md:text-6xl font-hunter mb-4 glitch-text" 
              data-text="AI TRAINING PROTOCOL"
              data-aos="fade-up"
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-solana-purple via-solana-green to-magicblock-primary animate-gradient text-glow">
                AI TRAINING PROTOCOL
              </span>
            </h1>
            <p className="text-xl font-cyber text-gray-300" data-aos="fade-up" data-aos-delay="200">
              ENHANCE YOUR HUNTERS WITH ON-CHAIN REPLAY TRAINING
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Training Flow - Takes 2 columns */}
            <div className="lg:col-span-2 space-y-8">
              {/* Agent Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="hunter-card p-8"
                data-aos="fade-up"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-solana-purple to-magicblock-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-hunter">🤖</span>
                  </div>
                  <h2 className="text-2xl font-hunter text-white">SELECT AI HUNTER</h2>
                </div>
                
                {isLoadingAgents ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="nen-spinner" />
                  </div>
                ) : ownedAgents.length === 0 ? (
                  <div className="text-center py-8 bg-cyber-dark/30 rounded-lg border border-gray-600">
                    <span className="text-2xl mb-2 block">🎯</span>
                    <p className="text-gray-400 font-cyber">NO HUNTERS FOUND</p>
                    <p className="text-sm text-gray-500">Deploy hunters to begin training</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ownedAgents.map((agent) => (
                      <motion.div
                        key={agent.mint}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedAgent(agent.mint)}
                        className={`
                          p-4 rounded-lg border-2 cursor-pointer transition-all duration-300
                          ${selectedAgent === agent.mint
                            ? 'border-solana-purple bg-solana-purple/10 shadow-lg shadow-solana-purple/20'
                            : 'border-gray-600 hover:border-gray-500 bg-cyber-dark/30'
                          }
                        `}
                      >
                        <div className="flex items-center space-x-4">
                          {agent.image && (
                            <img
                              src={agent.image}
                              alt={agent.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-cyber text-white text-lg">{agent.name}</h4>
                            <p className="text-sm text-gray-400 font-mono">
                              {agent.mint.slice(0, 8)}...{agent.mint.slice(-8)}
                            </p>
                            {agent.attributes && (
                              <div className="flex space-x-4 mt-2">
                                {agent.attributes.map((attr, index) => (
                                  <span key={index} className="text-xs text-solana-green">
                                    {attr.trait_type}: {attr.value}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {selectedAgent === agent.mint && (
                            <div className="w-6 h-6 bg-solana-purple rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">✓</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Replay Selection */}
              {selectedAgent && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  data-aos="fade-up"
                  data-aos-delay="200"
                >
                  <TrainingReplaySelection
                    agentId={selectedAgent}
                    onReplaySelectionChange={setSelectedReplays}
                    maxSelectable={trainingParams.maxMatches}
                  />
                </motion.div>
              )}

              {/* Training Parameters */}
              {selectedAgent && selectedReplays.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  data-aos="fade-up"
                  data-aos-delay="400"
                >
                  <TrainingParametersConfig
                    parameters={trainingParams}
                    onParametersChange={setTrainingParams}
                    selectedReplayCount={selectedReplays.length}
                  />
                </motion.div>
              )}

              {/* Submit Training */}
              {selectedAgent && selectedReplays.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="hunter-card p-8 bg-gradient-to-r from-solana-purple/10 to-magicblock-primary/10 border-2 border-solana-purple/30"
                  data-aos="fade-up"
                  data-aos-delay="600"
                >
                  <div className="text-center">
                    <h3 className="text-2xl font-hunter text-white mb-4">INITIATE TRAINING PROTOCOL</h3>
                    <p className="text-gray-300 font-cyber mb-6">
                      Ready to train your AI Hunter with {selectedReplays.length} selected replays
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={submitTrainingRequest}
                      disabled={isLoading || selectedReplays.length === 0}
                      className={`
                        px-12 py-4 rounded-lg font-cyber uppercase tracking-wider transition-all text-lg
                        ${isLoading || selectedReplays.length === 0
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'cyber-button'
                        }
                      `}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="nen-spinner w-5 h-5" />
                          <span>INITIATING TRAINING...</span>
                        </div>
                      ) : (
                        'START TRAINING SESSION'
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar - Active Sessions & Agent Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Selected Agent Info */}
              {selectedAgent && ownedAgents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="hunter-card p-6"
                  data-aos="fade-left"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-solana-green to-magicblock-primary rounded-full flex items-center justify-center">
                      <span className="text-sm font-hunter">👤</span>
                    </div>
                    <h3 className="text-xl font-hunter text-white">SELECTED HUNTER</h3>
                  </div>
                  {(() => {
                    const agent = ownedAgents.find(a => a.mint === selectedAgent);
                    return agent ? (
                      <div className="flex items-start space-x-4">
                        {agent.image && (
                          <div className="relative">
                            <img
                              src={agent.image}
                              alt={agent.name}
                              className="w-20 h-20 rounded-lg object-cover border-2 border-solana-purple/30"
                            />
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-solana-green rounded-full border-2 border-cyber-dark flex items-center justify-center">
                              <span className="text-xs">✓</span>
                            </div>
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="text-lg font-cyber text-white mb-1">{agent.name}</h4>
                          <p className="text-sm text-gray-400 font-mono mb-3">
                            {agent.mint.slice(0, 8)}...{agent.mint.slice(-8)}
                          </p>
                          {agent.attributes && (
                            <div className="space-y-2">
                              {agent.attributes.map((attr, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="text-gray-300 font-cyber">{attr.trait_type}:</span>
                                  <span className="text-solana-green font-mono">{attr.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </motion.div>
              )}

              {/* Training Sessions */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="hunter-card p-6"
                data-aos="fade-left"
                data-aos-delay="200"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-magicblock-primary to-cyber-accent rounded-full flex items-center justify-center">
                    <span className="text-sm font-hunter">📊</span>
                  </div>
                  <h3 className="text-xl font-hunter text-white">TRAINING SESSIONS</h3>
                </div>
                {activeSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-2 block">🎯</span>
                    <p className="text-gray-400 font-cyber">NO ACTIVE SESSIONS</p>
                    <p className="text-sm text-gray-500">Start your first training session</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {activeSessions.map((session, index) => (
                        <motion.div
                          key={session.sessionId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-cyber-dark/30 rounded-lg p-4 border border-gray-600"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="text-sm font-cyber text-white">
                              SESSION {session.sessionId.slice(0, 8)}...
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-cyber uppercase tracking-wider ${
                              session.status === 'initiated' 
                                ? 'bg-yellow-900/50 text-yellow-200 border border-yellow-500/30'
                                : session.status === 'completed'
                                ? 'bg-green-900/50 text-green-200 border border-green-500/30'
                                : 'bg-blue-900/50 text-blue-200 border border-blue-500/30'
                            }`}>
                              {session.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 space-y-1 font-mono">
                            <div className="flex justify-between">
                              <span>Hunter:</span>
                              <span>{session.agentMint.slice(0, 8)}...</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Replays:</span>
                              <span>{session.replayIds.length} matches</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Created:</span>
                              <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                            </div>
                            {session.explorer && (
                              <motion.a
                                whileHover={{ scale: 1.05 }}
                                href={session.explorer}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-solana-purple hover:text-solana-green transition-colors mt-2"
                              >
                                <span>View on Explorer</span>
                                <span>↗</span>
                              </motion.a>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-hunter text-white mb-4">
              ADVANCED TRAINING TECHNOLOGY
            </h2>
            <p className="text-gray-400 font-cyber">
              POWERED BY BLOCKCHAIN AND AI
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'ON-CHAIN REPLAYS',
                description: 'Train with verified match data stored on MagicBlock',
                icon: '🔗',
                color: 'solana-purple',
              },
              {
                title: 'DEVNET INTEGRATION',
                description: 'Real-time NFT ownership verification on Solana',
                icon: '🛡️',
                color: 'solana-green',
              },
              {
                title: 'AI OPTIMIZATION',
                description: 'Advanced training parameters for optimal performance',
                icon: '🧠',
                color: 'magicblock-primary',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="hunter-card p-8 text-center group"
                data-aos="fade-up"
                data-aos-delay={index * 200}
              >
                <div className={`text-6xl mb-4 text-${feature.color}`}>{feature.icon}</div>
                <h3 className="text-xl font-hunter text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Training;
