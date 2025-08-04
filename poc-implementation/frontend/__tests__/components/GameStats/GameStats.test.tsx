import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameStats } from '../../../components/GameStats/GameStats';

const mockStats = {
  currentPlayer: 1,
  moveCount: 5,
  player1Name: 'Agent Alpha',
  player2Name: 'Agent Beta',
  player1Elo: 1500,
  player2Elo: 1450,
  player1WinRate: 0.75,
  player2WinRate: 0.68
};

describe('GameStats', () => {
  it('should render game statistics correctly', () => {
    render(<GameStats {...mockStats} />);
    
    expect(screen.getByText('Current Turn')).toBeInTheDocument();
    expect(screen.getByText('Agent Alpha')).toBeInTheDocument();
    expect(screen.getByText('Move Count')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display player ELO ratings', () => {
    render(<GameStats {...mockStats} />);
    
    expect(screen.getByText('ELO:')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByText('1450')).toBeInTheDocument();
  });

  it('should show player win rates', () => {
    render(<GameStats {...mockStats} />);
    
    expect(screen.getByText('Win Rate:')).toBeInTheDocument();
    expect(screen.getByText('75.0%')).toBeInTheDocument();
    expect(screen.getByText('68.0%')).toBeInTheDocument();
  });

  it('should handle different current players', () => {
    const player2Stats = { ...mockStats, currentPlayer: 2 };
    render(<GameStats {...player2Stats} />);
    
    expect(screen.getByText('Agent Beta')).toBeInTheDocument();
  });
});
