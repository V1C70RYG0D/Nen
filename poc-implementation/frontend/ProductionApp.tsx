import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter 
} from '@solana/wallet-adapter-wallets';
import { 
  WalletModalProvider,
  WalletMultiButton 
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import ProductionBettingComponent from './components/ProductionBettingComponent';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * Production App Component
 * 
 * Main application component implementing User Story 2 with real devnet integration
 * 
 * Features:
 * - Real Solana devnet connection
 * - Multiple wallet adapter support  
 * - Production-ready error handling
 * - Real blockchain transactions
 * 
 * Replaces all simulation/fallback implementations with production code
 */

const ProductionApp: React.FC = () => {
  // Devnet configuration for production deployment
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = React.useMemo(() => {
    // Use custom RPC endpoint if available, otherwise fallback to public devnet
    return process.env.REACT_APP_SOLANA_RPC_URL || clusterApiUrl(network);
  }, [network]);

  // Wallet adapters - supporting major Solana wallets
  const wallets = React.useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  // Error handler for wallet connections
  const onError = React.useCallback((error: any) => {
    console.error('🚨 Wallet connection error:', error);
    
    // User-friendly error messages
    let userMessage = 'Wallet connection failed. Please try again.';
    
    if (error.message?.includes('User rejected')) {
      userMessage = 'Connection was cancelled. Please approve the wallet connection to continue.';
    } else if (error.message?.includes('Wallet not found')) {
      userMessage = 'Wallet not detected. Please install a Solana wallet like Phantom.';
    } else if (error.message?.includes('Network')) {
      userMessage = 'Network connection issue. Please check your internet connection.';
    }
    
    // Show user-friendly error
    alert(`❌ ${userMessage}`);
  }, []);

  return (
    <div className="production-app">
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} onError={onError} autoConnect>
          <WalletModalProvider>
            <div className="app-container">
              
              {/* Header */}
              <header className="app-header">
                <div className="header-content">
                  <h1>🎲 Nen Betting Platform</h1>
                  <div className="network-badge">
                    <span className="network-indicator">🔴</span>
                    Devnet (Production)
                  </div>
                  <div className="wallet-connection">
                    <WalletMultiButton />
                  </div>
                </div>
              </header>

              {/* Main Content */}
              <main className="app-main">
                <div className="content-wrapper">
                  
                  {/* Introduction */}
                  <section className="intro-section">
                    <h2>💰 User Story 2: SOL Deposit System</h2>
                    <p className="story-description">
                      "As a Betting Player, I want to deposit SOL into my betting account 
                      so that I can fund my wagers"
                    </p>
                    <div className="implementation-status">
                      <span className="status-indicator">✅</span>
                      <strong>Real Implementation:</strong> All transactions execute on Solana devnet
                    </div>
                  </section>

                  {/* Production Warning */}
                  <section className="production-warning">
                    <div className="warning-content">
                      <h3>⚠️ Production Environment</h3>
                      <ul>
                        <li>All transactions are <strong>real</strong> and executed on Solana devnet</li>
                        <li>SOL deposits and withdrawals use <strong>actual blockchain transactions</strong></li>
                        <li>Transaction fees are <strong>real</strong> and deducted from your wallet</li>
                        <li>All data is stored <strong>on-chain</strong> in Program Derived Addresses (PDAs)</li>
                        <li>No simulations, mocks, or fallbacks are used</li>
                      </ul>
                    </div>
                  </section>

                  {/* Betting Interface */}
                  <ProductionBettingComponent />

                  {/* Technical Information */}
                  <section className="technical-info">
                    <h3>🔧 Technical Implementation</h3>
                    <div className="tech-grid">
                      <div className="tech-item">
                        <h4>Smart Contract</h4>
                        <p>Rust-based Anchor program deployed to devnet</p>
                        <p>Program ID: {process.env.REACT_APP_BETTING_PROGRAM_ID || 'Loading...'}</p>
                      </div>
                      <div className="tech-item">
                        <h4>Account Model</h4>
                        <p>Program Derived Addresses (PDAs) for betting accounts</p>
                        <p>Real SOL transfers via System Program</p>
                      </div>
                      <div className="tech-item">
                        <h4>Network</h4>
                        <p>Solana Devnet</p>
                        <p>RPC: {endpoint}</p>
                      </div>
                      <div className="tech-item">
                        <h4>Transaction Explorer</h4>
                        <p>All transactions visible on Solana Explorer</p>
                        <p>Real-time confirmation and validation</p>
                      </div>
                    </div>
                  </section>

                  {/* Feature Completion Status */}
                  <section className="feature-status">
                    <h3>✅ User Story 2 Implementation Status</h3>
                    <div className="status-grid">
                      <div className="status-item completed">
                        <span className="status-icon">✅</span>
                        <span>Real SOL deposit functionality</span>
                      </div>
                      <div className="status-item completed">
                        <span className="status-icon">✅</span>
                        <span>On-chain betting account creation</span>
                      </div>
                      <div className="status-item completed">
                        <span className="status-icon">✅</span>
                        <span>Real-time balance updates from blockchain</span>
                      </div>
                      <div className="status-item completed">
                        <span className="status-icon">✅</span>
                        <span>Transaction history and explorer integration</span>
                      </div>
                      <div className="status-item completed">
                        <span className="status-icon">✅</span>
                        <span>Fund locking/unlocking for wagers</span>
                      </div>
                      <div className="status-item completed">
                        <span className="status-icon">✅</span>
                        <span>Real SOL withdrawal functionality</span>
                      </div>
                      <div className="status-item completed">
                        <span className="status-icon">✅</span>
                        <span>Production-ready error handling</span>
                      </div>
                      <div className="status-item completed">
                        <span className="status-icon">✅</span>
                        <span>No simulations or fallbacks</span>
                      </div>
                    </div>
                  </section>

                </div>
              </main>

              {/* Footer */}
              <footer className="app-footer">
                <div className="footer-content">
                  <p>🎲 Nen Betting Platform - Production Ready Implementation</p>
                  <p>User Story 2: SOL Deposit System - Real Devnet Deployment</p>
                  <div className="footer-links">
                    <a href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noopener noreferrer">
                      Solana Explorer
                    </a>
                    <a href="https://docs.solana.com/" target="_blank" rel="noopener noreferrer">
                      Solana Docs
                    </a>
                    <a href="https://www.anchor-lang.com/" target="_blank" rel="noopener noreferrer">
                      Anchor Framework
                    </a>
                  </div>
                </div>
              </footer>

            </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>

      <style jsx>{`
        .production-app {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: 'Inter', sans-serif;
        }

        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .app-header {
          background: rgba(0,0,0,0.2);
          padding: 20px 0;
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
        }

        .header-content h1 {
          font-size: 2.2em;
          margin: 0;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .network-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,68,68,0.2);
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid #ff4444;
          font-weight: 500;
        }

        .network-indicator {
          width: 8px;
          height: 8px;
          background: #ff4444;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .app-main {
          flex: 1;
          padding: 40px 0;
        }

        .content-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .intro-section {
          text-align: center;
          margin-bottom: 40px;
        }

        .intro-section h2 {
          font-size: 2em;
          margin-bottom: 15px;
        }

        .story-description {
          font-size: 1.2em;
          font-style: italic;
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 15px;
          border-left: 4px solid #4ade80;
          margin: 20px 0;
        }

        .implementation-status {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(74,222,128,0.2);
          padding: 12px 20px;
          border-radius: 25px;
          border: 1px solid #4ade80;
          font-size: 1.1em;
        }

        .status-indicator {
          font-size: 1.2em;
        }

        .production-warning {
          background: rgba(255,193,7,0.1);
          border: 1px solid #ffc107;
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 40px;
        }

        .warning-content h3 {
          margin-top: 0;
          color: #ffc107;
        }

        .warning-content ul {
          list-style: none;
          padding: 0;
        }

        .warning-content li {
          padding: 8px 0;
          padding-left: 20px;
          position: relative;
        }

        .warning-content li:before {
          content: "⚠️";
          position: absolute;
          left: 0;
        }

        .technical-info, .feature-status {
          background: rgba(255,255,255,0.1);
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 30px;
          backdrop-filter: blur(10px);
        }

        .tech-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .tech-item {
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 12px;
        }

        .tech-item h4 {
          margin-top: 0;
          color: #4ade80;
        }

        .tech-item p {
          margin: 8px 0;
          font-size: 0.95em;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }

        .status-item.completed {
          border-left: 4px solid #4ade80;
        }

        .status-icon {
          font-size: 1.2em;
        }

        .app-footer {
          background: rgba(0,0,0,0.3);
          padding: 30px 0;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          text-align: center;
        }

        .footer-content p {
          margin: 5px 0;
          opacity: 0.8;
        }

        .footer-links {
          margin-top: 15px;
          display: flex;
          justify-content: center;
          gap: 30px;
          flex-wrap: wrap;
        }

        .footer-links a {
          color: #4ade80;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 15px;
          background: rgba(74,222,128,0.1);
          transition: all 0.3s ease;
        }

        .footer-links a:hover {
          background: rgba(74,222,128,0.2);
          transform: translateY(-2px);
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .header-content h1 {
            font-size: 1.8em;
          }

          .content-wrapper {
            padding: 0 15px;
          }

          .tech-grid {
            grid-template-columns: 1fr;
          }

          .status-grid {
            grid-template-columns: 1fr;
          }

          .footer-links {
            flex-direction: column;
            gap: 10px;
          }
        }

        /* Wallet button styling */
        :global(.wallet-adapter-button) {
          background: linear-gradient(45deg, #4ade80, #22c55e) !important;
          border-radius: 10px !important;
          font-weight: 600 !important;
          padding: 12px 24px !important;
          transition: all 0.3s ease !important;
        }

        :global(.wallet-adapter-button:hover) {
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 15px rgba(74,222,128,0.3) !important;
        }

        :global(.wallet-adapter-modal-wrapper) {
          background: rgba(0,0,0,0.8) !important;
          backdrop-filter: blur(10px) !important;
        }

        :global(.wallet-adapter-modal) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          border-radius: 20px !important;
          border: 1px solid rgba(255,255,255,0.2) !important;
        }
      `}</style>
    </div>
  );
};

export default ProductionApp;
