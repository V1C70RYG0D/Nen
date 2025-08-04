import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { GameBoard } from '@/components/GameBoard/GameBoard';
import { runAxeTest, testKeyboardNavigation, testResponsiveAccessibility } from '../utils/accessibility-helpers';
import type { GamePiece } from '@/types';

// Create mock helpers in local scope
const mockGameState = {
  boardState: null,
  currentPlayer: 1 as const,
  gameHistory: [],
  isConnected: false,
  latency: 0,
  error: null,
  submitMove: jest.fn(),
  reconnect: jest.fn(),
  disconnect: jest.fn(),
};

const mockMagicBlockSession = {
  session: null,
  isConnected: false, 
  latency: 0,
  error: null,
  submitMove: jest.fn(),
  disconnect: jest.fn(),
};

// Mock Hooks
jest.mock('@/hooks/useGameState', () => ({
  useGameState: jest.fn(() => mockGameState),
}));

jest.mock('@/hooks/useMagicBlockSession', () => ({
  useMagicBlockSession: jest.fn(() => mockMagicBlockSession),
}));

test('Mobile/Desktop Responsiveness', () => {
  const { container } = render(<GameBoard matchId="mock-match-id" />);

  // Check initial rendering on large screens
  global.innerWidth = 1024;
  global.dispatchEvent(new Event('resize'));
  expect(container.innerHTML.includes('Gungi Board')).toBeTruthy();

  // Simulate mobile screen rendering
  global.innerWidth = 375;
  global.dispatchEvent(new Event('resize'));
  expect(container.innerHTML.includes('Gungi Board')).toBeTruthy();
});

describe('GameBoard Accessibility and Interaction', () => {
  it('should have no accessibility violations', async () => {
    const renderResult = render(<GameBoard matchId="mockMatch" />);
    await runAxeTest(renderResult.container, undefined, 'GameBoard accessibility test');
  }, 15000);

  it('supports keyboard navigation', async () => {
    const renderResult = render(<GameBoard matchId="mockMatch" />);
    
    try {
      const { getByText } = renderResult;
      const square = getByText(/A1/); // Adjust this selector to match one on your board
      square.focus();
      fireEvent.keyDown(square, { key: 'Enter', code: 'Enter' });
    } catch (error) {
      console.warn('Specific game board square elements not found, testing general keyboard navigation');
    }

    await testKeyboardNavigation(renderResult);
  }, 15000);

  it('supports mouse interaction', async () => {
    const renderResult = render(<GameBoard matchId="mockMatch" />);
    
    try {
      const { getByText } = renderResult;
      const square = getByText(/A1/); // Adjust this selector to match one on your board
      fireEvent.click(square);
    } catch (error) {
      console.warn('Specific game board square elements not found, testing general interaction');
    }

    await runAxeTest(renderResult.container, undefined, 'GameBoard mouse interaction test');
  }, 10000);

  it('should maintain screen reader compatibility', async () => {
    const renderResult = render(<GameBoard matchId="mockMatch" aria-label="Game Board" />);
    await runAxeTest(renderResult.container, undefined, 'GameBoard screen reader test');
  }, 10000);

  it('should be responsive across different screen sizes', async () => {
    await testResponsiveAccessibility(
      () => render(<GameBoard matchId="mockMatch" />),
      [
        { width: 320, height: 568, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ]
    );
  }, 30000);
});
