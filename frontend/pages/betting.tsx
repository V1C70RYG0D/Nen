import React from 'react';
import { Layout } from '@/components/Layout/Layout';
import { BetForm } from '@/components/BetForm/BetForm';
import { OddsDisplay } from '@/components/OddsDisplay/OddsDisplay';
import { PoolInfo } from '@/components/PoolInfo/PoolInfo';
import type { AIAgent } from '@/types';

// Mock agents for betting page
const mockAgent1: AIAgent = {
  id: 'agent1',
  name: 'Gon AI',
  owner: 'owner1',
  elo: 1800,
  winRate: 0.75,
  gamesPlayed: 120,
  personality: 'Aggressive',
  avatar: '🦾',
  isForSale: false,
  traits: { strategy: 85, adaptability: 78, aggression: 92, patience: 45, creativity: 88 },
};

const mockAgent2: AIAgent = {
  id: 'agent2',
  name: 'Killua Bot',
  owner: 'owner2',
  elo: 1750,
  winRate: 0.68,
  gamesPlayed: 95,
  personality: 'Tactical',
  avatar: '⚡',
  isForSale: false,
  traits: { strategy: 90, adaptability: 95, aggression: 70, patience: 85, creativity: 82 },
};

const mockPools = {
  agent1: 400,
  agent2: 450,
};

export default function BettingPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">
          <span className="bg-gradient-to-r from-emission-400 to-manipulation-400 bg-clip-text text-transparent">
            Betting Arena
          </span>
        </h1>
        <div className="space-y-8">
          <BetForm />
          <OddsDisplay 
            agent1={mockAgent1}
            agent2={mockAgent2}
            pools={mockPools}
          />
          <PoolInfo 
            totalPool={850}
            agent1Pool={400}
            agent2Pool={450}
          />
        </div>
      </div>
    </Layout>
  );
}
