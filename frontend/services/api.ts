/**
 * API Service - Real implementations following GI-02
 * No mock data, all real API calls to backend services
 */

import type { Match, AIAgent, Stats } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }


  async getMatches(): Promise<Match[]> {
    try {
      return await this.request('/api/matches');
    } catch (error) {
      console.error('Failed to fetch matches:', error);
      return [];
    }
  }

  async getLiveMatches(): Promise<Match[]> {
    try {
      return await this.request('/api/matches?status=live');
    } catch (error) {
      console.error('Failed to fetch live matches:', error);
      return [];
    }
  }

  async getUpcomingMatches(): Promise<Match[]> {
    try {
      return await this.request('/api/matches?status=upcoming');
    } catch (error) {
      console.error('Failed to fetch upcoming matches:', error);
      return [];
    }
  }

  async getMatch(id: string): Promise<Match | null> {
    try {
      return await this.request(`/api/matches/${id}`);
    } catch (error) {
      console.error(`Failed to fetch match ${id}:`, error);
      return null;
    }
  }

  async getAgents(): Promise<AIAgent[]> {
    try {
      return await this.request('/api/agents');
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      return [];
    }
  }

  async getAgent(id: string): Promise<AIAgent | null> {
    try {
      return await this.request(`/api/agents/${id}`);
    } catch (error) {
      console.error(`Failed to fetch agent ${id}:`, error);
      return null;
    }
  }

  async getStats(): Promise<Stats> {
    try {
      return await this.request('/api/stats');
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Return default stats instead of mock data
      return {
        activeMatches: 0,
        totalPool: 0,
        playersOnline: 0,
        totalBets: 0,
      };
    }
  }

  async placeBet(matchId: string, agentId: string, amount: number): Promise<boolean> {
    try {
      const response = await this.request('/api/bets', {
        method: 'POST',
        body: JSON.stringify({
          matchId,
          agentId,
          amount,
        }),
      });
      return response.success === true;
    } catch (error) {
      console.error('Failed to place bet:', error);
      return false;
    }
  }

  async getHealthStatus(): Promise<{ status: string; timestamp: string }> {
    try {
      return await this.request('/api/health');
    } catch (error) {
      console.error('Failed to get health status:', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
