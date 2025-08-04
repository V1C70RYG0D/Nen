import React from 'react';
import { render, screen } from '@testing-library/react';
import OddsDisplay from '../../../components/OddsDisplay/OddsDisplay';

// Mock data
const mockOdds = {
  agent1: 1.67,
  agent2: 2.5
};

const renderOddsDisplay = () => {
  return render(<OddsDisplay odds={mockOdds} />);
};

describe('OddsDisplay', () => {
  it('renders without crashing', () => {
    renderOddsDisplay();
    expect(screen.getByText(/agent 1/i)).toBeInTheDocument();
    expect(screen.getByText(/agent 2/i)).toBeInTheDocument();
  });

  it('displays the correct odds for each agent', () => {
    renderOddsDisplay();
    expect(screen.getByText(/1.67/i)).toBeInTheDocument();
    expect(screen.getByText(/2.5/i)).toBeInTheDocument();
  });
});

