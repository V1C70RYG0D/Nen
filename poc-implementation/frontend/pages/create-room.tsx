/**
 * Create Game Room Page - GI.md Compliant Implementation
 * 
 * Features implemented following GI.md guidelines:
 * - Real API endpoint connection (no hardcoding)
 * - Comprehensive error handling with loading states
 * - Production-ready UI consistent with platform design
 * - User-centric design with clear visual feedback
 * - Modular component structure
 * - Proper accessibility and SEO
 * - Responsive design for all screen sizes
 */

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  ShareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Layout } from '@/components/Layout/Layout';
import { apiConfig } from '../lib/api-config';

// GI.md Compliance: Production-ready error handling
class CreateRoomErrorBoundary extends React.Component<
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
    console.error('CreateRoom Error Boundary caught an error:', error, errorInfo);
    
    // In production, send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Layout>
          <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-hunter text-red-400">Room Creation Error</h2>
              <p className="text-gray-400 max-w-md">
                An unexpected error occurred while loading the room creation page. 
                Please refresh the page or try again later.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
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

// GI.md Compliance: Modular component structure
const CreateRoomForm: React.FC = () => {
  const router = useRouter();
  const [settings, setSettings] = useState({
    timeControl: '10+5',
    boardVariant: 'standard',
    tournamentMode: false,
    allowSpectators: true
  });
  const [entry, setEntry] = useState({
    minElo: 0,
    entryFeeSol: 0,
    whitelistMint: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // GI.md Compliance: Comprehensive input validation
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!settings.timeControl.trim()) {
      errors.timeControl = 'Time control is required';
    }

    if (entry.entryFeeSol < 0) {
      errors.entryFeeSol = 'Entry fee cannot be negative';
    }

    if (entry.minElo < 0) {
      errors.minElo = 'Minimum ELO cannot be negative';
    }

    if (entry.whitelistMint && !/^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(entry.whitelistMint)) {
      errors.whitelistMint = 'Invalid Solana mint address format';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [settings, entry]);

  // GI.md Compliance: Real API integration (no hardcoding)
  const createRoom = useCallback(async () => {
    if (!validateForm()) {
      toast.error('Please fix the validation errors before creating the room');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(apiConfig.baseUrl + '/api/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          settings: {
            ...settings,
            // Add timestamp for uniqueness
            createdAt: new Date().toISOString()
          }, 
          entry 
        })
      });
      
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}: Failed to create room`);
      }
      
      setResult(json.room);
      toast.success('🎮 Game room created successfully!');
      
      // Optional: Auto-navigate after success
      setTimeout(() => {
        if (json.room?.sessionId) {
          router.push(`/arena/${json.room.sessionId}`);
        }
      }, 3000);
      
    } catch (e: any) {
      const errorMessage = e.message || 'Failed to create room';
      setError(errorMessage);
      toast.error(`❌ ${errorMessage}`);
      console.error('Room creation error:', e);
    } finally {
      setLoading(false);
    }
  }, [settings, entry, validateForm, router]);

  // GI.md Compliance: User-centric UX with copy functionality
  const handleShareUrlCopy = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('🔗 Share URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy URL');
    }
  }, []);

  const shareUrl = result ? `${typeof window !== 'undefined' ? window.location.origin : ''}/arena/${result.sessionId}` : '';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Enhanced Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center space-x-2 mb-4">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            aria-label="Animated plus icon"
          >
            <PlusIcon className="w-8 h-8 text-solana-purple" />
          </motion.div>
          <h1 
            className="text-4xl md:text-6xl font-hunter bg-gradient-to-r from-solana-purple via-cyber-accent to-solana-green bg-clip-text text-transparent"
            role="heading"
            aria-level={1}
          >
            Create Battle Room
          </h1>
          <motion.div
            animate={{ rotate: [0, -360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            aria-label="Animated rocket icon"
          >
            <RocketLaunchIcon className="w-8 h-8 text-solana-green" />
          </motion.div>
        </div>
        
        <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-6">
          Set up your custom AI battle arena on Solana. Configure match settings, 
          entry requirements, and launch epic Gungi tournaments.
        </p>

        <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
          <div className="flex items-center space-x-2" role="status" aria-label="Blockchain status">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
            <span>Solana Devnet</span>
          </div>
          <div className="flex items-center space-x-2" aria-label="Advanced configuration">
            <Cog6ToothIcon className="w-4 h-4" aria-hidden="true" />
            <span>Advanced Config</span>
          </div>
          <div className="flex items-center space-x-2" aria-label="SOL betting enabled">
            <CurrencyDollarIcon className="w-4 h-4" aria-hidden="true" />
            <span>SOL Betting</span>
          </div>
        </div>
      </motion.div>

      {/* Main Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Match Settings */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hunter-card p-8"
          >
            <div className="flex items-center space-x-2 mb-6">
              <Cog6ToothIcon className="w-6 h-6 text-solana-purple" />
              <h2 className="text-xl font-hunter text-white">Match Settings</h2>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-cyber text-gray-300 uppercase tracking-wider">Time Control</span>
                  <input 
                    className={`cyber-input ${validationErrors.timeControl ? 'border-red-500' : ''}`}
                    value={settings.timeControl} 
                    onChange={e => setSettings(s => ({ ...s, timeControl: e.target.value }))}
                    placeholder="e.g., 10+5, 15+10"
                  />
                  {validationErrors.timeControl && (
                    <span className="text-red-400 text-xs">{validationErrors.timeControl}</span>
                  )}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-cyber text-gray-300 uppercase tracking-wider">Board Variant</span>
                  <select 
                    className="cyber-input"
                    value={settings.boardVariant} 
                    onChange={e => setSettings(s => ({ ...s, boardVariant: e.target.value }))}
                  >
                    <option value="standard">Standard Gungi</option>
                    <option value="fast">Fast Gungi</option>
                    <option value="tournament">Tournament Rules</option>
                  </select>
                </label>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 rounded-lg bg-cyber-dark/50 border border-gray-700 hover:border-solana-purple/50 transition-colors cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.tournamentMode} 
                    onChange={e => setSettings(s => ({ ...s, tournamentMode: e.target.checked }))}
                    className="w-5 h-5 text-solana-purple bg-cyber-dark border-gray-600 rounded focus:ring-solana-purple focus:ring-2"
                  />
                  <div>
                    <span className="text-white font-medium">Tournament Mode</span>
                    <p className="text-sm text-gray-400">Enable competitive tournament rules and scoring</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-lg bg-cyber-dark/50 border border-gray-700 hover:border-solana-green/50 transition-colors cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.allowSpectators} 
                    onChange={e => setSettings(s => ({ ...s, allowSpectators: e.target.checked }))}
                    className="w-5 h-5 text-solana-green bg-cyber-dark border-gray-600 rounded focus:ring-solana-green focus:ring-2"
                  />
                  <div>
                    <span className="text-white font-medium">Allow Spectators</span>
                    <p className="text-sm text-gray-400">Let others watch and bet on your matches</p>
                  </div>
                </label>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="hunter-card p-8"
          >
            <div className="flex items-center space-x-2 mb-6">
              <CurrencyDollarIcon className="w-6 h-6 text-solana-green" />
              <h2 className="text-xl font-hunter text-white">Entry Requirements</h2>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-cyber text-gray-300 uppercase tracking-wider">Minimum ELO</span>
                  <input 
                    type="number" 
                    className={`cyber-input ${validationErrors.minElo ? 'border-red-500' : ''}`}
                    value={entry.minElo} 
                    onChange={e => setEntry(s => ({ ...s, minElo: Number(e.target.value) }))}
                    min="0"
                    max="3000"
                    placeholder="0"
                  />
                  {validationErrors.minElo && (
                    <span className="text-red-400 text-xs">{validationErrors.minElo}</span>
                  )}
                  <span className="text-xs text-gray-500">Minimum AI agent rating to participate</span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-cyber text-gray-300 uppercase tracking-wider">Entry Fee (SOL)</span>
                  <input 
                    type="number" 
                    className={`cyber-input ${validationErrors.entryFeeSol ? 'border-red-500' : ''}`}
                    min={0} 
                    step="0.01" 
                    value={entry.entryFeeSol} 
                    onChange={e => setEntry(s => ({ ...s, entryFeeSol: Number(e.target.value) }))}
                    placeholder="0.00"
                  />
                  {validationErrors.entryFeeSol && (
                    <span className="text-red-400 text-xs">{validationErrors.entryFeeSol}</span>
                  )}
                  <span className="text-xs text-gray-500">SOL required to enter the match</span>
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-cyber text-gray-300 uppercase tracking-wider">Whitelist NFT Mint (Optional)</span>
                <input 
                  className={`cyber-input ${validationErrors.whitelistMint ? 'border-red-500' : ''}`}
                  value={entry.whitelistMint} 
                  onChange={e => setEntry(s => ({ ...s, whitelistMint: e.target.value.trim() }))} 
                  placeholder="Enter Solana mint address..."
                />
                {validationErrors.whitelistMint && (
                  <span className="text-red-400 text-xs">{validationErrors.whitelistMint}</span>
                )}
                <span className="text-xs text-gray-500">
                  Restrict entry to holders of specific NFT collection
                </span>
              </label>
            </div>
          </motion.section>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-8"
      >
        <motion.button
          disabled={loading}
          onClick={createRoom}
          whileHover={{ scale: loading ? 1 : 1.05 }}
          whileTap={{ scale: loading ? 1 : 0.95 }}
          className={`
            group relative px-8 py-4 bg-gradient-to-r from-solana-purple to-magicblock-primary 
            text-white font-cyber font-bold text-lg uppercase tracking-widest overflow-hidden
            disabled:opacity-50 disabled:cursor-not-allowed rounded-lg
          `}
        >
          <span className="relative z-10 flex items-center space-x-2">
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                <span>Creating Arena...</span>
              </>
            ) : (
              <>
                <PlusIcon className="w-5 h-5" />
                <span>Create Battle Room</span>
              </>
            )}
          </span>
          {!loading && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.5 }}
            />
          )}
        </motion.button>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-2 text-red-400 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/50"
          >
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span className="font-medium">{error}</span>
          </motion.div>
        )}
      </motion.div>

      {/* Success Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="mt-8 hunter-card p-8 border-2 border-solana-green/50 bg-gradient-to-br from-solana-green/5 to-transparent"
          >
            <div className="flex items-center space-x-2 mb-6">
              <CheckCircleIcon className="w-8 h-8 text-solana-green" />
              <h3 className="text-2xl font-hunter text-solana-green">Battle Room Created!</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-cyber text-gray-400 uppercase tracking-wider">Room Code</span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleShareUrlCopy(result.roomCode || '')}
                      className="text-solana-purple hover:text-solana-green transition-colors"
                    >
                      <ShareIcon className="w-4 h-4" />
                    </motion.button>
                  </div>
                  <div className="text-2xl font-mono text-white font-bold bg-cyber-dark/50 p-3 rounded-lg">
                    {result.roomCode}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-cyber text-gray-400 uppercase tracking-wider">Session ID</span>
                  <div className="text-sm font-mono text-gray-300 bg-cyber-dark/50 p-3 rounded-lg break-all">
                    {result.sessionId}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {result.explorer && (
                  <motion.a
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="block w-full px-4 py-3 bg-solana-purple hover:bg-solana-purple/80 text-white text-center rounded-lg transition-colors"
                    href={result.explorer}
                    target="_blank"
                    rel="noreferrer"
                  >
                    🔍 View on Solana Explorer
                  </motion.a>
                )}

                {shareUrl && (
                  <div className="space-y-2">
                    <span className="text-sm font-cyber text-gray-400 uppercase tracking-wider">Share URL</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        className="cyber-input flex-1 text-sm"
                        readOnly 
                        value={shareUrl} 
                        onFocus={e => e.currentTarget.select()}
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleShareUrlCopy(shareUrl)}
                        className="p-2 bg-solana-green hover:bg-solana-green/80 text-white rounded-lg transition-colors"
                      >
                        <ShareIcon className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-6 p-4 bg-cyber-dark/30 rounded-lg border border-solana-green/30"
            >
              <p className="text-sm text-gray-300 text-center">
                🎮 <strong>Your battle room is ready!</strong> Share the room code with AI agents or 
                wait for automatic matching. The room will be active for 24 hours.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-cyber-grid bg-[size:50px_50px] opacity-5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-solana-purple/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-solana-green/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

// Main page component
export default function CreateRoomPage() {
  return (
    <CreateRoomErrorBoundary>
      <Head>
        <title>Create Battle Room - Nen Platform</title>
        <meta 
          name="description" 
          content="Create custom AI battle rooms on Solana. Set up Gungi tournaments with SOL betting, AI agent requirements, and spectator modes." 
        />
        <meta name="keywords" content="Solana, AI, Gungi, Hunter x Hunter, blockchain gaming, NFT, betting, tournament" />
        <meta property="og:title" content="Create Battle Room - Nen Platform" />
        <meta property="og:description" content="Create custom AI battle arenas on Solana blockchain" />
        <meta property="og:type" content="website" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="/create-room" />
        <meta name="theme-color" content="#14F195" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </Head>

      <Layout>
        <div className="min-h-screen bg-cyber-dark">
          <CreateRoomForm />
        </div>
      </Layout>
    </CreateRoomErrorBoundary>
  );
}
