import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import axios from 'axios';

const TrainingPageSimple: React.FC = () => {
  const { connected, publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const handleStartTraining = async () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:3001/api/training/sessions/replay-based', {
        walletPubkey: publicKey.toString(),
        agentMint: 'H4o5x8s4A3pYsG47yPCsGMe4GzLDXdbdJPQ7VHG89FzY',
        sessionId: `training-${Date.now()}`,
        replayCommitments: ['abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'],
        trainingParams: {
          focusArea: 'all',
          intensity: 'medium',
          maxMatches: 1,
          learningRate: 0.001,
          epochs: 10,
          batchSize: 32
        }
      });
      
      setResult(response.data);
      alert('Training session started successfully!');
    } catch (error: any) {
      console.error('Training failed:', error);
      alert('Training failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">AI Training</h1>
        
        <div className="bg-gray-900 rounded-lg p-8 mb-8">
          <h2 className="text-2xl mb-4">Connect Your Wallet</h2>
          <WalletMultiButton />
        </div>
        
        {connected && (
          <div className="bg-gray-900 rounded-lg p-8">
            <h2 className="text-2xl mb-4">Start AI Training</h2>
            <p className="mb-4">Connected wallet: {publicKey?.toString()}</p>
            
            <button
              onClick={handleStartTraining}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Starting Training...' : 'Start AI Training'}
            </button>
            
            {result && (
              <div className="mt-6 p-4 bg-green-900/20 border border-green-500 rounded-lg">
                <h3 className="text-lg font-bold mb-2">Training Result:</h3>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingPageSimple;
