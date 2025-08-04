import React from 'react';
import { render, screen } from '@testing-library/react';
import { MatchCard } from '@/components/MatchCard/MatchCard';
import { formatSOL, formatRelativeTime } from '@/utils/format';

jest.mock('@/utils/format', () => ({
  formatSOL: jest.fn((value) => `${value} SOL`),
  formatRelativeTime: jest.fn(() => '5 minutes ago'),
}));

// Mock framer-motion to prevent DOM warnings
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, animate, transition, initial, ...props }: any) => 
      <div {...props}>{children}</div>,
  },
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  );
});

const mockMatch = {
  id: '1',
  status: 'live' as const,
  startTime: new Date(),
  viewers: 100,
  totalPool: 123.45,
  pools: {
    agent1: 60,
    agent2: 40,
    total: 100,
  },
  agent1: {
    id: 'agent1',
    name: 'Agent One',
    owner: 'owner1',
    avatar: 'A1',
    elo: 1500,
    winRate: 0.7,
    gamesPlayed: 100,
    personality: 'Aggressive' as const,
    isForSale: false,
    traits: {
      strategy: 85,
      adaptability: 70,
      aggression: 90,
      patience: 40,
      creativity: 65,
    },
  },
  agent2: {
    id: 'agent2',
    name: 'Agent Two',
    owner: 'owner2',
    avatar: 'A2',
    elo: 1450,
    winRate: 0.6,
    gamesPlayed: 80,
    personality: 'Defensive' as const,
    isForSale: false,
    traits: {
      strategy: 75,
      adaptability: 80,
      aggression: 30,
      patience: 90,
      creativity: 55,
    },
  },
};

describe('MatchCard', () => {
  it('should render match card with correct information', () => {
    render(<MatchCard match={mockMatch} />);

    expect(screen.getByText('LIVE NOW')).toBeInTheDocument();
    expect(screen.getByText('100 viewers')).toBeInTheDocument();
    expect(screen.getByText('123.45 SOL')).toBeInTheDocument();
    expect(formatSOL).toHaveBeenCalledWith(123.45);
    // formatRelativeTime is only called for upcoming matches, not live ones
  });

  it('should display agent information correctly', () => {
    render(<MatchCard match={mockMatch} />);

    expect(screen.getByText('Agent One')).toBeInTheDocument();
    expect(screen.getByText('Agent Two')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('A2')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByText('1450')).toBeInTheDocument();
  });

  it('should calculate and display win probability', () => {
    render(<MatchCard match={mockMatch} />);

    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('should handle zero total pool correctly', () => {
    const zeroPoolMatch = { ...mockMatch, pools: { agent1: 0, agent2: 0, total: 0 } };
    render(<MatchCard match={zeroPoolMatch} />);

    const percentages = screen.getAllByText('50%');
    expect(percentages).toHaveLength(2);
  });

  it('should render without crashing for different match statuses', () => {
    const statuses: ('live' | 'upcoming' | 'completed')[] = ['live', 'upcoming', 'completed'];
    statuses.forEach((status) => {
      const match = { ...mockMatch, status };
      render(<MatchCard match={match} />);
      
      if (status === 'live') {
        expect(screen.getByText('LIVE NOW')).toBeInTheDocument();
      } else if (status === 'upcoming') {
        // For upcoming matches, it shows "Starts <relative time>"
        expect(screen.getByText(/Starts/)).toBeInTheDocument();
      } else {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      }
    });
  });
});
