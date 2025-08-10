// tests/phase3/frontend-ui.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { WalletProvider } from '@solana/wallet-adapter-react';
import { GameBoard } from '../frontend/src/components/GameBoard';
import { BettingInterface } from '../frontend/src/components/BettingInterface';

describe("Advanced Frontend Interface", () => {
  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <WalletProvider wallets={[]}>
          {component}
        </WalletProvider>
      </BrowserRouter>
    );
  };

  it("Should render WebGL game board", async () => {
    renderWithProviders(<GameBoard matchId="test-match" />);
    
    await waitFor(() => {
      const canvas = screen.getByTestId('webgl-canvas');
      expect(canvas).toBeInTheDocument();
    });
    
    // Test WebGL context
    const canvas = screen.getByTestId('webgl-canvas') as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2');
    expect(gl).not.toBeNull();
  });

  it("Should handle multi-wallet connections", async () => {
    renderWithProviders(<WalletConnectionManager />);
    
    const phantomButton = screen.getByTestId('connect-phantom');
    const solflareButton = screen.getByTestId('connect-solflare');
    
    expect(phantomButton).toBeInTheDocument();
    expect(solflareButton).toBeInTheDocument();
    
    fireEvent.click(phantomButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('wallet-connected')).toBeInTheDocument();
    });
  });

  it("Should display compliance information in betting UI", () => {
    renderWithProviders(<BettingInterface matchId="test-match" />);
    
    expect(screen.getByText(/KYC Required/i)).toBeInTheDocument();
    expect(screen.getByText(/Betting Limits/i)).toBeInTheDocument();
    expect(screen.getByText(/Responsible Gaming/i)).toBeInTheDocument();
  });
});

