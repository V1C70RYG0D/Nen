import { useQuery, useQueryClient } from 'react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

import { apiClient, ApiError } from '@/lib/api-client';
import { endpoints, apiConfig, validateFilters } from '@/lib/api-config';
import { buildQueryParams } from '@/lib/api-client';
import { 
  Match, 
  MatchFilters, 
  MatchListResponse, 
  MatchUpdate, 
  MatchWebSocketEvent,
  MatchesState 
} from '@/types/match';

interface UseMatchesOptions {
  filters?: MatchFilters;
  enableRealTime?: boolean;
  enableInfiniteScroll?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: string) => void;
  onMatchUpdate?: (update: MatchUpdate) => void;
}

interface UseMatchesReturn extends Omit<MatchesState, 'selectedMatch' | 'userBets'> {
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  updateFilters: (newFilters: Partial<MatchFilters>) => void;
  resetFilters: () => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  isConnecting: boolean;
  retryConnection: () => void;
}

const DEFAULT_FILTERS: MatchFilters = {
  page: 1,
  limit: 20,
  sortBy: 'startTime',
  sortOrder: 'desc',
};

const QUERY_KEY_BASE = 'matches';

export const useMatches = (options: UseMatchesOptions = {}): UseMatchesReturn => {
  const {
    filters: initialFilters = DEFAULT_FILTERS,
    enableRealTime = true,
    enableInfiniteScroll = false,
    autoRefresh = true,
    refreshInterval = 30000,
    onError,
    onMatchUpdate,
  } = options;

  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [filters, setFilters] = useState<MatchFilters>(initialFilters);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [webSocketConnected, setWebSocketConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Generate query key based on filters
  const getQueryKey = useCallback((queryFilters: MatchFilters) => {
    return [QUERY_KEY_BASE, queryFilters];
  }, []);

  // Fetch matches from API
  const fetchMatches = useCallback(async (queryFilters: MatchFilters): Promise<MatchListResponse> => {
    try {
      // Validate filters
      const validationErrors = validateFilters.matchFilters(queryFilters);
      if (validationErrors.length > 0) {
        throw new ApiError(
          `Invalid filters: ${validationErrors.join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      const queryParams = buildQueryParams({
        ...queryFilters,
        // Convert SOL amounts to lamports for API
        minBetRange: queryFilters.minBetRange ? queryFilters.minBetRange * 1e9 : undefined,
        maxBetRange: queryFilters.maxBetRange ? queryFilters.maxBetRange * 1e9 : undefined,
      });

      const response = await apiClient.get<MatchListResponse>(
        `${endpoints.matches.list}${queryParams}`,
        `matches-${JSON.stringify(queryFilters)}`
      );

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error || 'Failed to fetch matches',
          'SERVER_ERROR'
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'NETWORK_ERROR'
      );
    }
  }, []);

  // React Query for data fetching
  const {
    data: matchesResponse,
    isLoading,
    error,
    refetch: refetchQuery,
    isRefetching,
  } = useQuery(
    getQueryKey(filters),
    () => fetchMatches(filters),
    {
      enabled: true,
      refetchInterval: autoRefresh ? refreshInterval : false,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Don't retry validation errors
        if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error) => {
        const errorMessage = error instanceof ApiError 
          ? error.message 
          : 'Failed to load matches';
        
        console.error('Error fetching matches:', error);
        onError?.(errorMessage);
        
        // Show user-friendly error toast
        if (error instanceof ApiError) {
          switch (error.code) {
            case 'NETWORK_ERROR':
              toast.error('Network connection failed. Please check your internet connection.');
              break;
            case 'RATE_LIMITED':
              toast.error('Too many requests. Please wait before trying again.');
              break;
            case 'VALIDATION_ERROR':
              toast.error('Invalid search criteria. Please check your filters.');
              break;
            default:
              toast.error(errorMessage);
          }
        } else {
          toast.error('Failed to load matches. Please try again.');
        }
      },
      onSuccess: (data) => {
        // Update infinite scroll state
        if (enableInfiniteScroll) {
          if (filters.page === 1) {
            setAllMatches(data.matches);
          } else {
            setAllMatches(prev => [...prev, ...data.matches]);
          }
          setHasMore(data.hasNext);
        }
      },
    }
  );

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (!enableRealTime || socketRef.current?.connected) {
      return;
    }

    setIsConnecting(true);

    try {
      const socket = io(apiConfig.wsUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        maxReconnectionDelay: 10000,
        timeout: 10000,
      });

      socket.on('connect', () => {
        setWebSocketConnected(true);
        setIsConnecting(false);
        console.log('WebSocket connected for match updates');
        
        // Subscribe to match updates
        socket.emit('subscribe', { channel: 'matches' });
      });

      socket.on('disconnect', () => {
        setWebSocketConnected(false);
        console.log('WebSocket disconnected');
      });

      socket.on('reconnect', () => {
        setWebSocketConnected(true);
        console.log('WebSocket reconnected');
        // Re-subscribe to match updates
        socket.emit('subscribe', { channel: 'matches' });
      });

      socket.on('connect_error', (error) => {
        setIsConnecting(false);
        setWebSocketConnected(false);
        console.error('WebSocket connection error:', error);
      });

      // Handle match updates
      socket.on('match_update', (event: MatchWebSocketEvent) => {
        if (event.type === 'match_update') {
          const update = event.data as MatchUpdate;
          onMatchUpdate?.(update);

          // Update the cache
          queryClient.setQueryData<MatchListResponse>(
            getQueryKey(filters),
            (oldData) => {
              if (!oldData) return oldData;

              const updatedMatches = oldData.matches.map(match => {
                if (match.id === update.matchId) {
                  return {
                    ...match,
                    ...update.data,
                    bettingPool: update.data.bettingPool 
                      ? { ...match.bettingPool, ...update.data.bettingPool }
                      : match.bettingPool,
                    gameState: update.data.gameState
                      ? { ...match.gameState, ...update.data.gameState }
                      : match.gameState,
                  };
                }
                return match;
              });

              return { ...oldData, matches: updatedMatches };
            }
          );

          // Update infinite scroll state if enabled
          if (enableInfiniteScroll) {
            setAllMatches(prev => prev.map(match => {
              if (match.id === update.matchId) {
                return {
                  ...match,
                  ...update.data,
                  bettingPool: update.data.bettingPool 
                    ? { ...match.bettingPool, ...update.data.bettingPool }
                    : match.bettingPool,
                  gameState: update.data.gameState
                    ? { ...match.gameState, ...update.data.gameState }
                    : match.gameState,
                };
              }
              return match;
            }));
          }
        }
      });

      socketRef.current = socket;
    } catch (error) {
      setIsConnecting(false);
      setWebSocketConnected(false);
      console.error('Failed to initialize WebSocket:', error);
    }
  }, [enableRealTime, filters, getQueryKey, queryClient, onMatchUpdate, enableInfiniteScroll]);

  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setWebSocketConnected(false);
    }
  }, []);

  const retryConnection = useCallback(() => {
    disconnectWebSocket();
    setTimeout(connectWebSocket, 1000);
  }, [connectWebSocket, disconnectWebSocket]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<MatchFilters>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      // Reset page to 1 when filters change (except for page changes)
      if ('page' in newFilters) {
        return updated;
      }
      return { ...updated, page: 1 };
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Load more matches for infinite scroll
  const loadMore = useCallback(async () => {
    if (!enableInfiniteScroll || !hasMore || isLoading) {
      return;
    }

    const nextPage = (filters.page || 1) + 1;
    setFilters(prev => ({ ...prev, page: nextPage }));
  }, [enableInfiniteScroll, hasMore, isLoading, filters.page]);

  // Manual refetch
  const refetch = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (enableRealTime) {
      connectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [enableRealTime, connectWebSocket, disconnectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      apiClient.cancelAllRequests();
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  // Return the appropriate matches based on infinite scroll setting
  const matches = enableInfiniteScroll ? allMatches : (matchesResponse?.matches || []);
  const finalHasMore = enableInfiniteScroll ? hasMore : (matchesResponse?.hasNext || false);

  return {
    matches,
    loading: isLoading,
    error: error instanceof ApiError ? error.message : (error as Error)?.message || null,
    filters,
    hasMore: finalHasMore,
    lastUpdated: matchesResponse ? new Date() : null,
    webSocketConnected,
    refreshing: isRefetching,
    refetch,
    loadMore,
    updateFilters,
    resetFilters,
    connectWebSocket,
    disconnectWebSocket,
    isConnecting,
    retryConnection,
  };
}; 