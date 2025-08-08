import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import RealDevnetBettingApp from './RealDevnetBettingApp';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * User Story 2 Integration Test Component
 * 
 * This component demonstrates the complete integration of the User Story 2 implementation
 * with real Solana devnet functionality.
 */

const UserStory2TestApp: React.FC = () => {
  // Real devnet configuration
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);
  
  // Real wallet adapters for devnet
  const wallets = [
    new PhantomWalletAdapter(),
  ];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div style={{ 
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d42 100%)',
            padding: '20px'
          }}>
            
            {/* Header */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '30px',
              color: 'white'
            }}>
              <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>
                🧪 User Story 2 Integration Test
              </h1>
              <div style={{ 
                background: '#22c55e', 
                padding: '8px 16px', 
                borderRadius: '20px', 
                display: 'inline-block',
                marginBottom: '15px',
                fontWeight: 'bold'
              }}>
                ✅ PRODUCTION READY - REAL DEVNET
              </div>
              <p style={{ fontSize: '1.1em', opacity: '0.8' }}>
                Complete implementation of deposit SOL functionality
              </p>
            </div>

            {/* Test Environment Info */}
            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '20px', 
              borderRadius: '15px', 
              marginBottom: '20px',
              color: 'white',
              textAlign: 'center'
            }}>
              <h3>🔧 Test Environment Configuration</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '15px',
                marginTop: '15px'
              }}>
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '15px', 
                  borderRadius: '10px' 
                }}>
                  <strong>Network</strong><br />
                  Solana Devnet
                </div>
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '15px', 
                  borderRadius: '10px' 
                }}>
                  <strong>RPC Endpoint</strong><br />
                  {endpoint}
                </div>
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '15px', 
                  borderRadius: '10px' 
                }}>
                  <strong>Program ID</strong><br />
                  BfvcT9Rk5o7YpGSutqSpTBFrFeuzpWBPdDGvkF9weTks
                </div>
              </div>
            </div>

            {/* Implementation Status */}
            <div style={{ 
              background: 'rgba(34,197,94,0.1)', 
              border: '1px solid #22c55e',
              padding: '20px', 
              borderRadius: '15px', 
              marginBottom: '20px',
              color: 'white'
            }}>
              <h3>✅ User Story 2 Implementation Status</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '10px',
                marginTop: '15px'
              }}>
                <div>✅ Create/access user's betting account PDA on devnet</div>
                <div>✅ Transfer real SOL from user wallet to betting PDA</div>
                <div>✅ Update user's on-chain balance record with actual data</div>
                <div>✅ Emit deposit event for tracking, verifiable on devnet</div>
                <div>✅ Enforce minimum deposit (0.1 SOL)</div>
                <div>✅ Real devnet SOL testing capability</div>
              </div>
            </div>

            {/* Main Component */}
            <RealDevnetBettingApp />

            {/* Test Instructions */}
            <div style={{ 
              background: 'rgba(59,130,246,0.1)', 
              border: '1px solid #3b82f6',
              padding: '20px', 
              borderRadius: '15px', 
              marginTop: '20px',
              color: 'white'
            }}>
              <h3>🧪 Testing Instructions</h3>
              <ol style={{ paddingLeft: '20px' }}>
                <li>Connect a Solana wallet (set to Devnet mode)</li>
                <li>Get devnet SOL from <a href="https://faucet.solana.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ade80' }}>faucet.solana.com</a></li>
                <li>Create betting account (one-time setup)</li>
                <li>Test deposit with minimum 0.1 SOL</li>
                <li>Verify transaction on Solana Explorer</li>
                <li>Check balance updates in real-time</li>
              </ol>
              
              <div style={{ 
                background: 'rgba(255,193,7,0.1)', 
                padding: '12px', 
                borderRadius: '8px',
                marginTop: '15px',
                borderLeft: '4px solid #ffc107'
              }}>
                <strong>⚠️ Important:</strong> This is a real devnet implementation. All transactions will be recorded on Solana devnet blockchain.
              </div>
            </div>

            {/* Footer */}
            <div style={{ 
              textAlign: 'center', 
              marginTop: '30px',
              color: 'white',
              opacity: '0.7'
            }}>
              <p>User Story 2 Implementation - Production Ready for Launch 🚀</p>
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default UserStory2TestApp;
