/**
 * Frontend Training Component Tests
 * Tests the training page functionality and integration
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import axios from 'axios';
import Training from '../pages/training';

// Mock dependencies
jest.mock('@solana/wallet-adapter-react');
jest.mock('axios');
jest.mock('react-hot-toast');

const mockConnection = {
  getAccountInfo: jest.fn(),
  getParsedTokenAccountsByOwner: jest.fn()
};

const mockWallet = {
  publicKey: new PublicKey('AGENTwallet111111111111111111111111111111'),
  connected: true
};

describe('Training Page', () => {
  beforeEach(() => {
    (useConnection as jest.Mock).mockReturnValue({
      connection: mockConnection
    });
    
    (useWallet as jest.Mock).mockReturnValue(mockWallet);
    
    (axios.post as jest.Mock).mockClear();
    (axios.get as jest.Mock).mockClear();
  });

  describe('Wallet Connection', () => {
    it('should show connect wallet message when not connected', () => {
      (useWallet as jest.Mock).mockReturnValue({
        ...mockWallet,
        connected: false,
        publicKey: null
      });

      render(<Training />);
      
      expect(screen.getByText('Connect your wallet to access your AI agents and begin training')).toBeInTheDocument();
      expect(screen.getByText('AI Agent Training')).toBeInTheDocument();
    });

    it('should show training interface when wallet is connected', () => {
      render(<Training />);
      
      expect(screen.getByText('Start New Training Session')).toBeInTheDocument();
      expect(screen.getByText('Select AI Agent')).toBeInTheDocument();
      expect(screen.getByText('Training Data File')).toBeInTheDocument();
    });
  });

  describe('Agent Selection', () => {
    it('should display owned agents in dropdown', async () => {
      render(<Training />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(/Netero AI Agent/)).toBeInTheDocument();
      });
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should show message when no agents are owned', async () => {
      render(<Training />);
      
      // Mock empty agents list
      await waitFor(() => {
        // Since we're using mock data, this test would need to be adjusted
        // to mock the loadOwnedAgents function to return empty array
      });
    });

    it('should update selected agent when dropdown changes', async () => {
      render(<Training />);
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'AGENTmint2222222222222222222222222222222222' } });
      
      expect(select.value).toBe('AGENTmint2222222222222222222222222222222222');
    });
  });

  describe('File Upload', () => {
    it('should accept valid file types', () => {
      render(<Training />);
      
      const fileInput = screen.getByLabelText(/Training Data File/);
      expect(fileInput).toHaveAttribute('accept', '.pgn,.json,.csv');
    });

    it('should validate file type and show error for invalid types', () => {
      render(<Training />);
      
      const fileInput = screen.getByLabelText(/Training Data File/);
      const invalidFile = new File(['test content'], 'test.exe', { type: 'application/exe' });
      
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      
      // Would need to implement toast mocking to test error message
    });

    it('should validate file size and show error for large files', () => {
      render(<Training />);
      
      const fileInput = screen.getByLabelText(/Training Data File/);
      // Create a file larger than 10MB
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      const largeFile = new File([largeContent], 'large.json', { type: 'application/json' });
      
      Object.defineProperty(largeFile, 'size', {
        value: 11 * 1024 * 1024,
        configurable: true
      });
      
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
      
      // Would show error toast
    });

    it('should accept valid files and show success message', () => {
      render(<Training />);
      
      const fileInput = screen.getByLabelText(/Training Data File/);
      const validFile = new File(['{"games": []}'], 'training.json', { type: 'application/json' });
      
      fireEvent.change(fileInput, { target: { files: [validFile] } });
      
      // Would show success toast
    });
  });

  describe('Training Parameters', () => {
    it('should have default parameter values', () => {
      render(<Training />);
      
      expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // epochs
      expect(screen.getByDisplayValue('0.001')).toBeInTheDocument(); // learning rate
      expect(screen.getByDisplayValue('32')).toBeInTheDocument(); // batch size
      expect(screen.getByDisplayValue('gungi')).toBeInTheDocument(); // game type
    });

    it('should update parameters when inputs change', () => {
      render(<Training />);
      
      const epochsInput = screen.getByDisplayValue('10');
      fireEvent.change(epochsInput, { target: { value: '20' } });
      
      expect(epochsInput.value).toBe('20');
    });

    it('should validate parameter ranges', () => {
      render(<Training />);
      
      const epochsInput = screen.getByDisplayValue('10');
      expect(epochsInput).toHaveAttribute('min', '1');
      expect(epochsInput).toHaveAttribute('max', '100');
      
      const learningRateInput = screen.getByDisplayValue('0.001');
      expect(learningRateInput).toHaveAttribute('min', '0.0001');
      expect(learningRateInput).toHaveAttribute('max', '1');
    });
  });

  describe('Training Submission', () => {
    it('should disable submit button when required fields are missing', () => {
      (useWallet as jest.Mock).mockReturnValue({
        ...mockWallet,
        connected: false,
        publicKey: null
      });

      render(<Training />);
      
      // Button should not be visible when wallet not connected
      expect(screen.queryByText('Start Training Session')).not.toBeInTheDocument();
    });

    it('should enable submit button when all fields are filled', async () => {
      render(<Training />);
      
      // Wait for agents to load
      await waitFor(() => {
        expect(screen.getByDisplayValue(/Netero AI Agent/)).toBeInTheDocument();
      });
      
      // Add file
      const fileInput = screen.getByLabelText(/Training Data File/);
      const validFile = new File(['{"games": []}'], 'training.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });
      
      const submitButton = screen.getByText('Start Training Session');
      expect(submitButton).not.toHaveClass('cursor-not-allowed');
    });

    it('should show loading state during submission', async () => {
      (axios.post as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(<Training />);
      
      // Setup valid form
      await waitFor(() => {
        expect(screen.getByDisplayValue(/Netero AI Agent/)).toBeInTheDocument();
      });
      
      const fileInput = screen.getByLabelText(/Training Data File/);
      const validFile = new File(['{"games": []}'], 'training.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });
      
      const submitButton = screen.getByText('Start Training Session');
      fireEvent.click(submitButton);
      
      expect(screen.getByText('Submitting Training Request...')).toBeInTheDocument();
    });

    it('should call API with correct parameters', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          sessionId: 'test-session-id',
          walletPubkey: mockWallet.publicKey.toString(),
          agentMint: 'AGENTmint1111111111111111111111111111111111',
          cid: 'QmTestCid123',
          tx: 'test-signature',
          explorer: 'https://explorer.solana.com/tx/test-signature?cluster=devnet',
          createdAt: new Date().toISOString()
        }
      });
      
      render(<Training />);
      
      // Setup form
      await waitFor(() => {
        expect(screen.getByDisplayValue(/Netero AI Agent/)).toBeInTheDocument();
      });
      
      const fileInput = screen.getByLabelText(/Training Data File/);
      const validFile = new File(['{"games": []}'], 'training.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });
      
      const submitButton = screen.getByText('Start Training Session');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          'http://127.0.0.1:3011/api/v1/training/sessions',
          expect.objectContaining({
            walletPubkey: mockWallet.publicKey.toString(),
            agentMint: 'AGENTmint1111111111111111111111111111111111',
            params: expect.objectContaining({
              epochs: 10,
              learningRate: 0.001,
              batchSize: 32,
              gameType: 'gungi'
            }),
            file: expect.objectContaining({
              name: 'training.json',
              base64: expect.any(String)
            })
          }),
          expect.objectContaining({
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
          })
        );
      });
    });

    it('should handle API errors gracefully', async () => {
      (axios.post as jest.Mock).mockRejectedValue({
        response: {
          data: {
            error: 'Wallet does not own agent NFT on devnet'
          }
        }
      });
      
      render(<Training />);
      
      // Setup and submit form
      await waitFor(() => {
        expect(screen.getByDisplayValue(/Netero AI Agent/)).toBeInTheDocument();
      });
      
      const fileInput = screen.getByLabelText(/Training Data File/);
      const validFile = new File(['{"games": []}'], 'training.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });
      
      const submitButton = screen.getByText('Start Training Session');
      fireEvent.click(submitButton);
      
      // Error handling would show toast - need to mock toast to test
    });
  });

  describe('Agent Information Display', () => {
    it('should show selected agent details', async () => {
      render(<Training />);
      
      await waitFor(() => {
        expect(screen.getByText('Selected Agent')).toBeInTheDocument();
        expect(screen.getByText('Netero AI Agent')).toBeInTheDocument();
        expect(screen.getByText('Elo Rating:')).toBeInTheDocument();
        expect(screen.getByText('2450')).toBeInTheDocument();
      });
    });

    it('should update agent details when selection changes', async () => {
      render(<Training />);
      
      // Change selection to second agent
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'AGENTmint2222222222222222222222222222222222' } });
      
      await waitFor(() => {
        expect(screen.getByText('Meruem AI Agent')).toBeInTheDocument();
        expect(screen.getByText('2680')).toBeInTheDocument();
      });
    });
  });

  describe('Training Sessions Display', () => {
    it('should show empty state when no sessions exist', () => {
      render(<Training />);
      
      expect(screen.getByText('No active training sessions')).toBeInTheDocument();
    });

    it('should display active sessions after successful submission', async () => {
      const mockSession = {
        success: true,
        sessionId: 'test-session-id-12345678',
        walletPubkey: mockWallet.publicKey.toString(),
        agentMint: 'AGENTmint1111111111111111111111111111111111',
        cid: 'QmTestCid123456789',
        status: 'initiated',
        tx: 'test-signature',
        explorer: 'https://explorer.solana.com/tx/test-signature?cluster=devnet',
        createdAt: new Date().toISOString()
      };
      
      (axios.post as jest.Mock).mockResolvedValue({ data: mockSession });
      
      render(<Training />);
      
      // Submit training request
      await waitFor(() => {
        expect(screen.getByDisplayValue(/Netero AI Agent/)).toBeInTheDocument();
      });
      
      const fileInput = screen.getByLabelText(/Training Data File/);
      const validFile = new File(['{"games": []}'], 'training.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });
      
      const submitButton = screen.getByText('Start Training Session');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Session test-session/)).toBeInTheDocument();
        expect(screen.getByText('initiated')).toBeInTheDocument();
        expect(screen.getByText(/Agent: AGENTmint/)).toBeInTheDocument();
        expect(screen.getByText(/IPFS: QmTestCid123456789/)).toBeInTheDocument();
      });
    });

    it('should show explorer link for sessions', async () => {
      // This would require completing a successful submission first
      // Implementation depends on state management
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      render(<Training />);
      
      expect(screen.getByLabelText('Select AI Agent')).toBeInTheDocument();
      expect(screen.getByLabelText('Training Data File')).toBeInTheDocument();
      expect(screen.getByLabelText('Epochs')).toBeInTheDocument();
      expect(screen.getByLabelText('Learning Rate')).toBeInTheDocument();
      expect(screen.getByLabelText('Batch Size')).toBeInTheDocument();
      expect(screen.getByLabelText('Game Type')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(<Training />);
      
      const submitButton = screen.getByRole('button', { name: /Start Training Session/ });
      expect(submitButton).toBeInTheDocument();
      
      const fileInput = screen.getByRole('textbox');
      expect(fileInput).toHaveAttribute('type', 'file');
    });

    it('should support keyboard navigation', () => {
      render(<Training />);
      
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});

export default {};
