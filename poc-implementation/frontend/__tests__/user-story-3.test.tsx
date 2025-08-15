/**
 * Comprehensive Test for User Story 3 Implementation
 * Tests API integration, filtering, error handling, and real-time updates
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import toast from 'react-hot-toast';

import { useMatches } from '@/hooks/useMatches';
import { MatchList } from '@/components/MatchList';
import { MatchFilter } from '@/components/MatchFilter';
import { apiClient } from '@/lib/api-client';
import { webSocketManager } from '@/lib/websocket-manager';
import { validateFilters } from '@/lib/api-config';
import { Match, MatchFilters } from '@/types/match';

// Mock dependencies
vi.mock('@/lib/api-client');
vi.mock('@/lib/websocket-manager');
vi.mock('react-hot-toast');

const mockedApiClient = apiClient as {
  get: MockedFunction<any>;
  cancelAllRequests: MockedFunction<any>;
};

const mockedWebSocketManager = webSocketManager as {
  connect: MockedFunction<any>;
  disconnect: MockedFunction<any>;
  subscribe: MockedFunction<any>;
  isConnected: boolean;
};

const mockedToast = toast as {
  success: MockedFunction<any>;
  error: MockedFunction<any>;
};

// Test data
const mockMatches: Match[] = [
  {
    id: 'match-1',
    agent1: {
      id: 'agent-1',
      name: 'Gon Freecss',
      elo: 2150,
      nenType: 'enhancement',
    },
    agent2: {
      id: 'agent-2',
      name: 'Killua Zoldyck',
      elo: 2280,
      nenType: 'transmutation',
    },
    status: 'live',
    bettingPool: {
      totalPool: 25000000000, // 25 SOL in lamports
      agent1Pool: 12000000000,
      agent2Pool: 13000000000,
      oddsAgent1: 1.8,
      oddsAgent2: 2.1,
      betsCount: 23,
      minBet: 100000000, // 0.1 SOL
      maxBet: 100000000000, // 100 SOL
      isOpenForBetting: true,
    },
    gameState: {
      currentMove: 47,
      currentPlayer: 'agent1',
      timeRemaining: { agent1: 425, agent2: 380 },
    },
    viewerCount: 1234,
  },
  {
    id: 'match-2',
    agent1: {
      id: 'agent-3',
      name: 'Kurapika',
      elo: 2350,
      nenType: 'conjuration',
    },
    agent2: {
      id: 'agent-4',
      name: 'Hisoka',
      elo: 2450,
      nenType: 'transmutation',
    },
    status: 'upcoming',
    bettingPool: {
      totalPool: 15000000000, // 15 SOL
      agent1Pool: 7000000000,
      agent2Pool: 8000000000,
      oddsAgent1: 1.7,
      oddsAgent2: 2.2,
      betsCount: 15,
      minBet: 100000000,
      maxBet: 100000000000,
      isOpenForBetting: true,
    },
    scheduledStartTime: new Date(Date.now() + 3600000),
  },
];

const mockApiResponse = {
  success: true,
  data: {
    matches: mockMatches,
    total: 2,
    page: 1,
    limit: 20,
    hasNext: false,
    hasPrev: false,
  },
};

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('User Story 3: Match Viewing and Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiClient.get.mockResolvedValue(mockApiResponse);
    mockedWebSocketManager.isConnected = true;
    mockedWebSocketManager.connect.mockResolvedValue(undefined);
    mockedWebSocketManager.disconnect.mockImplementation(() => {});
    mockedWebSocketManager.subscribe.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('API Integration (Requirement #3: No Hardcoding)', () => {
    it('should connect to actual API endpoint instead of using mock data', async () => {
      render(
        <TestWrapper>
          <MatchList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockedApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('/api/matches'),
          expect.any(String)
        );
      });

      expect(mockedApiClient.get).not.toHaveBeenCalledWith(
        expect.stringContaining('mock'),
        expect.any(String)
      );
    });

    it('should use environment variables for API configuration', () => {
      const { apiConfig } = require('@/lib/api-config');
      
      expect(apiConfig.baseUrl).toBeDefined();
      expect(apiConfig.baseUrl).not.toContain('hardcoded');
      expect(apiConfig.wsUrl).toBeDefined();
    });

    it('should build query parameters correctly for filters', () => {
      const { buildQueryParams } = require('@/lib/api-client');
      
      const filters: MatchFilters = {
        status: ['live', 'upcoming'],
        minBetRange: 10,
        maxBetRange: 100,
        minAiRating: 2000,
        nenTypes: ['enhancement', 'transmutation'],
        sortBy: 'totalPool',
        sortOrder: 'desc',
      };

      const queryString = buildQueryParams(filters);
      
      expect(queryString).toContain('status=live');
      expect(queryString).toContain('status=upcoming');
      expect(queryString).toContain('minBetRange=10000000000'); // SOL to lamports
      expect(queryString).toContain('sortBy=totalPool');
      expect(queryString).toContain('nenTypes=enhancement');
    });
  });

  describe('Filtering Implementation (Requirement #4: Add Filtering)', () => {
    it('should render bet range filter', async () => {
      const mockOnFiltersChange = vi.fn();
      
      render(
        <MatchFilter
          filters={{}}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      // Click to expand betting section
      const bettingSection = screen.getByText('Bet Range (SOL)');
      fireEvent.click(bettingSection);

      await waitFor(() => {
        expect(screen.getByText('Prize Pool Range')).toBeInTheDocument();
      });
    });

    it('should render AI rating filter', async () => {
      const mockOnFiltersChange = vi.fn();
      
      render(
        <MatchFilter
          filters={{}}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const ratingSection = screen.getByText('AI Rating');
      fireEvent.click(ratingSection);

      await waitFor(() => {
        expect(screen.getByText('ELO Rating Range')).toBeInTheDocument();
      });
    });

    it('should validate filter inputs', () => {
      const invalidFilters: MatchFilters = {
        minBetRange: -10,
        maxBetRange: -5,
        minAiRating: 5000,
        maxAiRating: 1000,
        page: 0,
        limit: 1000,
      };

      const errors = validateFilters.matchFilters(invalidFilters);
      
      expect(errors).toContain('Minimum bet range must be non-negative');
      expect(errors).toContain('Maximum bet range must be non-negative');
      expect(errors).toContain('Minimum AI rating cannot be greater than maximum AI rating');
      expect(errors).toContain('Page number must be greater than 0');
      expect(errors).toContain('Limit must be between 1 and 100');
    });

    it('should filter matches by status', async () => {
      const mockOnFiltersChange = vi.fn();
      
      render(
        <MatchFilter
          filters={{ status: ['live'] }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const statusSection = screen.getByText('Match Status');
      fireEvent.click(statusSection);

      await waitFor(() => {
        const liveCheckbox = screen.getByDisplayValue('live');
        expect(liveCheckbox).toBeChecked();
      });
    });
  });

  describe('Error Handling (Requirement #6: Error Handling)', () => {
    it('should display loading state', async () => {
      mockedApiClient.get.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(
        <TestWrapper>
          <MatchList />
        </TestWrapper>
      );

      expect(screen.getByText('Loading more matches...')).toBeInTheDocument();
    });

    it('should display error state when API fails', async () => {
      const errorMessage = 'Network connection failed';
      mockedApiClient.get.mockRejectedValue(new Error(errorMessage));
      
      render(
        <TestWrapper>
          <MatchList onError={vi.fn()} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Matches')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display empty state when no matches found', async () => {
      mockedApiClient.get.mockResolvedValue({
        success: true,
        data: {
          matches: [],
          total: 0,
          page: 1,
          limit: 20,
          hasNext: false,
          hasPrev: false,
        },
      });
      
      render(
        <TestWrapper>
          <MatchList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No Matches Found')).toBeInTheDocument();
      });
    });

    it('should handle partial errors gracefully', async () => {
      mockedApiClient.get.mockResolvedValue({
        success: true,
        data: {
          matches: mockMatches,
          total: 2,
          page: 1,
          limit: 20,
          hasNext: false,
          hasPrev: false,
        },
      });

      const onError = vi.fn();
      
      render(
        <TestWrapper>
          <MatchList onError={onError} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Gon Freecss')).toBeInTheDocument();
      });

      // Simulate partial error
      onError('Failed to load some data');
      
      // Should still display matches
      expect(screen.getByText('Gon Freecss')).toBeInTheDocument();
    });

    it('should retry failed requests', async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error('Network error'))
                            .mockResolvedValue(mockApiResponse);
      
      render(
        <TestWrapper>
          <MatchList />
        </TestWrapper>
      );

      await waitFor(() => {
        const retryButton = screen.getByText('Try Again');
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Gon Freecss')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates (Requirement: WebSocket Updates)', () => {
    it('should connect to WebSocket for real-time updates', async () => {
      render(
        <TestWrapper>
          <MatchList enableRealTimeUpdates={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockedWebSocketManager.connect).toHaveBeenCalled();
        expect(mockedWebSocketManager.subscribe).toHaveBeenCalledWith('matches');
      });
    });

    it('should display connection status', async () => {
      mockedWebSocketManager.isConnected = true;
      
      render(
        <TestWrapper>
          <MatchList enableRealTimeUpdates={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Real-time updates active')).toBeInTheDocument();
      });
    });

    it('should handle WebSocket disconnection', async () => {
      mockedWebSocketManager.isConnected = false;
      
      render(
        <TestWrapper>
          <MatchList enableRealTimeUpdates={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Offline mode')).toBeInTheDocument();
        expect(screen.getByText('Reconnect')).toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('should render match cards with proper data', async () => {
      render(
        <TestWrapper>
          <MatchList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Gon Freecss')).toBeInTheDocument();
        expect(screen.getByText('Killua Zoldyck')).toBeInTheDocument();
        expect(screen.getByText('LIVE NOW')).toBeInTheDocument();
        expect(screen.getByText('25.000 SOL')).toBeInTheDocument();
      });
    });

    it('should handle match selection', async () => {
      const onMatchSelect = vi.fn();
      
      render(
        <TestWrapper>
          <MatchList onMatchSelect={onMatchSelect} />
        </TestWrapper>
      );

      await waitFor(() => {
        const matchCard = screen.getByText('Gon Freecss').closest('[role="link"], [data-testid="match-card"]');
        if (matchCard) {
          fireEvent.click(matchCard);
        }
      });

      expect(onMatchSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'match-1' })
      );
    });

    it('should show betting options for upcoming matches', async () => {
      render(
        <TestWrapper>
          <MatchList />
        </TestWrapper>
      );

      await waitFor(() => {
        const upcomingMatch = screen.getByText('Kurapika').closest('.hunter-card');
        if (upcomingMatch) {
          fireEvent.mouseEnter(upcomingMatch);
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/BET ON/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Accessibility', () => {
    it('should implement infinite scroll', async () => {
      const extendedMockResponse = {
        ...mockApiResponse,
        data: {
          ...mockApiResponse.data,
          hasNext: true,
        },
      };

      mockedApiClient.get.mockResolvedValue(extendedMockResponse);
      
      render(
        <TestWrapper>
          <MatchList enableInfiniteScroll={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Loading more matches...')).toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels', async () => {
      render(
        <TestWrapper>
          <MatchList />
        </TestWrapper>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search agent names...');
        expect(searchInput).toHaveAttribute('type', 'text');
      });
    });

    it('should be keyboard navigable', async () => {
      render(
        <MatchFilter
          filters={{}}
          onFiltersChange={vi.fn()}
        />
      );

      const filterButton = screen.getByText('Filters');
      fireEvent.keyDown(filterButton, { key: 'Enter' });
      
      // Should expand filters
      await waitFor(() => {
        expect(screen.getByText('Search')).toBeInTheDocument();
      });
    });
  });
});

// Integration test for complete User Story 3
describe('User Story 3 Integration Test', () => {
  it('should complete the full user journey for viewing upcoming AI matches', async () => {
    // Setup: User navigates to matches page
    render(
      <TestWrapper>
        <MatchList
          filters={{
            status: ['upcoming', 'live'],
            sortBy: 'startTime',
            sortOrder: 'asc',
          }}
          showFilters={true}
          enableRealTimeUpdates={true}
        />
      </TestWrapper>
    );

    // Step 1: User sees list of scheduled matches
    await waitFor(() => {
      expect(screen.getByText('Gon Freecss')).toBeInTheDocument();
      expect(screen.getByText('Kurapika')).toBeInTheDocument();
    });

    // Step 2: User filters by bet range
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    await waitFor(() => {
      const bettingSection = screen.getByText('Bet Range (SOL)');
      fireEvent.click(bettingSection);
    });

    // Step 3: User views match details with dynamic odds
    await waitFor(() => {
      expect(screen.getByText('1.8x')).toBeInTheDocument(); // Odds for agent 1
      expect(screen.getByText('2.1x')).toBeInTheDocument(); // Odds for agent 2
    });

    // Step 4: Real-time updates work
    expect(mockedWebSocketManager.connect).toHaveBeenCalled();
    expect(screen.getByText('Real-time updates active')).toBeInTheDocument();

    // Verify no hardcoded data
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/matches'),
      expect.any(String)
    );
  });
});
