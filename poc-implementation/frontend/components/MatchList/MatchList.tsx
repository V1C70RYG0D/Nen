/**
 * MatchList Component
 * Displays a list of matches with filtering, infinite scroll, real-time updates,
 * and comprehensive error handling as per User Story 3
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  WifiIcon,
  SignalSlashIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { useInView } from 'react-intersection-observer';
import toast from 'react-hot-toast';

import { useMatches } from '@/hooks/useMatches';
import { MatchCard } from '@/components/MatchCard';
import { MatchFilter } from '@/components/MatchFilter';
import { 
  Match, 
  MatchFilters, 
  MatchListProps,
  UserBet 
} from '@/types/match';

// Loading skeleton component
const MatchCardSkeleton: React.FC = () => (
  <div className="hunter-card p-6 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="h-6 w-24 bg-gray-700 rounded" />
      <div className="h-4 w-16 bg-gray-700 rounded" />
    </div>
    <div className="grid grid-cols-3 gap-4 items-center mb-4">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto" />
        <div className="h-4 w-16 bg-gray-700 rounded mx-auto" />
        <div className="h-3 w-12 bg-gray-700 rounded mx-auto" />
      </div>
      <div className="flex justify-center">
        <div className="h-8 w-12 bg-gray-700 rounded" />
      </div>
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto" />
        <div className="h-4 w-16 bg-gray-700 rounded mx-auto" />
        <div className="h-3 w-12 bg-gray-700 rounded mx-auto" />
      </div>
    </div>
    <div className="pt-4 border-t border-gray-800">
      <div className="flex justify-between items-center">
        <div className="h-4 w-20 bg-gray-700 rounded" />
        <div className="h-6 w-24 bg-gray-700 rounded" />
      </div>
    </div>
  </div>
);

// Error component
interface ErrorStateProps {
  error: string;
  onRetry: () => void;
  canRetry?: boolean;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry, canRetry = true }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4"
    >
      <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
    </motion.div>
    <h3 className="text-lg font-hunter text-red-400 mb-2">Failed to Load Matches</h3>
    <p className="text-gray-400 text-sm mb-6 max-w-md">{error}</p>
    {canRetry && (
      <motion.button
        onClick={onRetry}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
      >
        <ArrowPathIcon className="w-4 h-4" />
        <span>Try Again</span>
      </motion.button>
    )}
  </div>
);

// Empty state component
interface EmptyStateProps {
  message: string;
  showFilters?: boolean;
  onResetFilters?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  message, 
  showFilters = true, 
  onResetFilters 
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mb-4"
    >
      <NoSymbolIcon className="w-8 h-8 text-gray-400" />
    </motion.div>
    <h3 className="text-lg font-hunter text-gray-400 mb-2">No Matches Found</h3>
    <p className="text-gray-500 text-sm mb-6 max-w-md">{message}</p>
    {showFilters && onResetFilters && (
      <motion.button
        onClick={onResetFilters}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
      >
        <AdjustmentsHorizontalIcon className="w-4 h-4" />
        <span>Reset Filters</span>
      </motion.button>
    )}
  </div>
);

// Connection status indicator
interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  onRetryConnection: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  isConnecting, 
  onRetryConnection 
}) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs ${
      isConnected 
        ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
        : 'bg-red-500/20 text-red-400 border border-red-500/50'
    }`}
  >
    {isConnecting ? (
      <>
        <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <span>Connecting...</span>
      </>
    ) : isConnected ? (
      <>
        <WifiIcon className="w-3 h-3" />
        <span>Real-time updates active</span>
      </>
    ) : (
      <>
        <SignalSlashIcon className="w-3 h-3" />
        <span>Offline mode</span>
        <button
          onClick={onRetryConnection}
          className="ml-2 text-blue-400 hover:text-blue-300 underline"
        >
          Reconnect
        </button>
      </>
    )}
  </motion.div>
);

// Main MatchList component
export const MatchList: React.FC<MatchListProps> = ({
  filters: initialFilters,
  showFilters = true,
  enableInfiniteScroll = true,
  enableRealTimeUpdates = true,
  onMatchSelect,
  onError,
  className = '',
  emptyStateMessage = 'No matches available at the moment. Check back soon for new AI battles!',
  loadingComponent: LoadingComponent,
  errorComponent: ErrorComponent,
}) => {
  const [userBets, setUserBets] = useState<Record<string, UserBet[]>>({});
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    matches,
    loading,
    error,
    filters,
    hasMore,
    lastUpdated,
    webSocketConnected,
    refreshing,
    refetch,
    loadMore,
    updateFilters,
    resetFilters,
    connectWebSocket,
    disconnectWebSocket,
    isConnecting,
    retryConnection,
  } = useMatches({
    filters: initialFilters,
    enableRealTime: enableRealTimeUpdates,
    enableInfiniteScroll,
    autoRefresh: true,
    refreshInterval: 30000,
    onError: (errorMessage) => {
      console.error('MatchList error:', errorMessage);
      onError?.(errorMessage);
      
      // Auto-retry logic for network errors
      if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = setTimeout(() => {
          console.log('Auto-retrying failed request...');
          refetch();
        }, 5000);
      }
    },
    onMatchUpdate: (update) => {
      // Handle real-time match updates
      if (update.type === 'betting_update') {
        toast.success(`Betting pool updated for ${update.matchId}`);
      } else if (update.type === 'status_change' && update.data.status === 'live') {
        toast.success('Match started! 🎮');
      }
    },
  });

  // Infinite scroll detection
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    skip: !enableInfiniteScroll || !hasMore || loading,
  });

  // Load more when scrolled to bottom
  useEffect(() => {
    if (inView && enableInfiniteScroll && hasMore && !loading) {
      loadMore();
    }
  }, [inView, enableInfiniteScroll, hasMore, loading, loadMore]);

  // Cleanup retry timeout
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const handleRetry = useCallback(async () => {
    try {
      setLastRefresh(new Date());
      await refetch();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  }, [refetch]);

  const handleResetFilters = useCallback(() => {
    resetFilters();
    toast.success('Filters reset');
  }, [resetFilters]);

  const handleMatchClick = useCallback((match: Match) => {
    onMatchSelect?.(match);
  }, [onMatchSelect]);

  const handleBetClick = useCallback((match: Match, agent: 1 | 2) => {
    // This would typically open a betting modal
    console.log(`Bet on agent ${agent} for match ${match.id}`);
    toast.success(`Betting on ${agent === 1 ? match.agent1.name : match.agent2.name}`);
  }, []);

  // Render loading state
  if (loading && matches.length === 0) {
    if (LoadingComponent) {
      return <LoadingComponent />;
    }
    
    return (
      <div className={`space-y-6 ${className}`}>
        {showFilters && enableRealTimeUpdates && (
          <ConnectionStatus
            isConnected={webSocketConnected}
            isConnecting={isConnecting}
            onRetryConnection={retryConnection}
          />
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <MatchCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error && matches.length === 0) {
    if (ErrorComponent) {
      return <ErrorComponent error={error} onRetry={handleRetry} />;
    }
    
    return (
      <div className={className}>
        <ErrorState error={error} onRetry={handleRetry} />
      </div>
    );
  }

  // Render empty state
  if (!loading && matches.length === 0) {
    return (
      <div className={className}>
        {showFilters && (
          <MatchFilter
            filters={filters}
            onFiltersChange={updateFilters}
            onReset={handleResetFilters}
            className="mb-6"
          />
        )}
        <EmptyState
          message={emptyStateMessage}
          showFilters={showFilters}
          onResetFilters={handleResetFilters}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with connection status and refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {enableRealTimeUpdates && (
            <ConnectionStatus
              isConnected={webSocketConnected}
              isConnecting={isConnecting}
              onRetryConnection={retryConnection}
            />
          )}
          
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <motion.button
          onClick={handleRetry}
          disabled={refreshing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center space-x-2 px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </motion.button>
      </div>

      {/* Filters */}
      {showFilters && (
        <MatchFilter
          filters={filters}
          onFiltersChange={updateFilters}
          onReset={handleResetFilters}
        />
      )}

      {/* Error notification for partial failures */}
      {error && matches.length > 0 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-400 font-medium">Partial loading error</p>
              <p className="text-xs text-gray-400 mt-1">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="text-yellow-400 hover:text-yellow-300 text-xs underline ml-auto"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Matches Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {matches.map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              layout
            >
              <MatchCard
                match={match}
                onMatchClick={handleMatchClick}
                onBetClick={handleBetClick}
                userBets={userBets[match.id] || []}
                showBettingOptions={true}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Infinite scroll loader */}
      {enableInfiniteScroll && hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          <div className="flex items-center space-x-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-600 border-t-solana-purple rounded-full animate-spin" />
            <span className="text-sm">Loading more matches...</span>
          </div>
        </div>
      )}

      {/* End of results indicator */}
      {!hasMore && matches.length > 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-xs text-gray-400">
            <span>🎯</span>
            <span>You've seen all available matches</span>
          </div>
        </div>
      )}
    </div>
  );
};
