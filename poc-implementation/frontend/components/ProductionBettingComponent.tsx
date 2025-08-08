import React, { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useProductionBetting } from '../hooks/useProductionBetting';

/**
 * Production Betting Component
 * 
 * Implements User Story 2 with real devnet transactions
 * Replaces all simulation/fallback UI with production-ready interface
 * 
 * User Story 2: "As a Betting Player, I want to deposit SOL into my betting account 
 * so that I can fund my wagers"
 * 
 * Features:
 * - Real SOL deposits via devnet transactions
 * - Real-time account balance from blockchain
 * - Transaction history from on-chain events
 * - Explorer links for all transactions
 * - Production error handling
 */

const ProductionBettingComponent: React.FC = () => {
  const { connection } = useConnection();
  const {
    // State
    balance,
    availableBalance,
    lockedBalance,
    totalDeposited,
    totalWithdrawn,
    depositCount,
    withdrawalCount,
    accountExists,
    isLoading,
    error,
    connected,
    publicKey,
    isReady,
    needsAccountCreation,
    
    // Actions
    createBettingAccount,
    depositSol,
    withdrawSol,
    lockFunds,
    unlockFunds,
    refreshAccountData,
    getNetworkInfo,
    clearError,
  } = useProductionBetting();

  // Form states
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [lockAmount, setLockAmount] = useState<string>('');
  
  // UI states
  const [lastTransaction, setLastTransaction] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  /**
   * Get wallet SOL balance
   */
  const updateWalletBalance = async () => {
    if (!publicKey) return;
    
    try {
      const balance = await connection.getBalance(publicKey);
      setWalletBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
    }
  };

  /**
   * Load network information
   */
  const loadNetworkInfo = async () => {
    const info = await getNetworkInfo();
    setNetworkInfo(info);
  };

  /**
   * Handle account creation
   */
  const handleCreateAccount = async () => {
    try {
      const signature = await createBettingAccount();
      setLastTransaction(signature);
      console.log('✅ Betting account created successfully');
    } catch (error) {
      console.error('❌ Failed to create account:', error);
    }
  };

  /**
   * Handle SOL deposit - User Story 2 implementation
   */
  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    
    if (!amount || amount <= 0) {
      alert('Please enter a valid deposit amount');
      return;
    }
    
    if (amount > walletBalance) {
      alert('Insufficient wallet balance');
      return;
    }

    try {
      const result = await depositSol(amount);
      
      if (result.success) {
        setLastTransaction(result.transactionSignature);
        setDepositAmount('');
        
        // Show success with explorer link
        const confirmation = confirm(
          `✅ Deposit successful!\n\n` +
          `Amount: ${amount} SOL\n` +
          `New Balance: ${result.newBalance} SOL\n` +
          `Transaction: ${result.transactionSignature}\n\n` +
          `View on Solana Explorer?`
        );
        
        if (confirmation) {
          window.open(result.explorerUrl, '_blank');
        }
        
        // Update wallet balance
        await updateWalletBalance();
        
        console.log(`✅ Deposited ${amount} SOL successfully`);
      }
    } catch (error) {
      console.error('❌ Deposit failed:', error);
      alert(`Deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Handle SOL withdrawal
   */
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount <= 0) {
      alert('Please enter a valid withdrawal amount');
      return;
    }
    
    if (amount > availableBalance) {
      alert('Insufficient available balance (some funds may be locked in bets)');
      return;
    }

    try {
      const result = await withdrawSol(amount);
      
      if (result.success) {
        setLastTransaction(result.transactionSignature);
        setWithdrawAmount('');
        
        // Show success with explorer link
        const confirmation = confirm(
          `✅ Withdrawal successful!\n\n` +
          `Amount: ${amount} SOL\n` +
          `New Balance: ${result.newBalance} SOL\n` +
          `Transaction: ${result.transactionSignature}\n\n` +
          `View on Solana Explorer?`
        );
        
        if (confirmation) {
          window.open(result.explorerUrl, '_blank');
        }
        
        // Update wallet balance
        await updateWalletBalance();
        
        console.log(`✅ Withdrew ${amount} SOL successfully`);
      }
    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      alert(`Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Handle fund locking for betting
   */
  const handleLockFunds = async () => {
    const amount = parseFloat(lockAmount);
    
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount to lock');
      return;
    }
    
    if (amount > availableBalance) {
      alert('Insufficient available balance');
      return;
    }

    try {
      const signature = await lockFunds(amount);
      setLastTransaction(signature);
      setLockAmount('');
      console.log(`✅ Locked ${amount} SOL for betting`);
    } catch (error) {
      console.error('❌ Failed to lock funds:', error);
      alert(`Failed to lock funds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Handle fund unlocking
   */
  const handleUnlockFunds = async () => {
    const amount = parseFloat(lockAmount);
    
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount to unlock');
      return;
    }
    
    if (amount > lockedBalance) {
      alert('Cannot unlock more than locked balance');
      return;
    }

    try {
      const signature = await unlockFunds(amount);
      setLastTransaction(signature);
      setLockAmount('');
      console.log(`✅ Unlocked ${amount} SOL`);
    } catch (error) {
      console.error('❌ Failed to unlock funds:', error);
      alert(`Failed to unlock funds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Load wallet balance and network info when ready
  useEffect(() => {
    if (isReady) {
      updateWalletBalance();
      loadNetworkInfo();
    }
  }, [isReady]);

  // Auto-refresh wallet balance
  useEffect(() => {
    if (!publicKey) return;

    const interval = setInterval(updateWalletBalance, 15000);
    return () => clearInterval(interval);
  }, [publicKey]);

  // Connection status display
  if (!connected) {
    return (
      <div className="betting-container">
        <div className="wallet-prompt">
          <h2>🔗 Connect Wallet</h2>
          <p>Please connect your Solana wallet to use the betting platform</p>
          <p className="network-info">Network: Devnet</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="betting-container">
        <div className="loading-state">
          <h2>⏳ Processing...</h2>
          <p>Executing blockchain transaction...</p>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="betting-container">
      <div className="betting-header">
        <h1>🎲 Nen Betting Platform</h1>
        <p className="production-badge">🔴 PRODUCTION • Real Devnet Transactions</p>
        <p className="wallet-info">
          Wallet: {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span>❌ {error}</span>
          <button onClick={clearError}>✕</button>
        </div>
      )}

      {/* Account Creation */}
      {needsAccountCreation && (
        <div className="account-creation">
          <h2>🏗️ Create Betting Account</h2>
          <p>You need to create a betting account before you can deposit SOL</p>
          <button onClick={handleCreateAccount} className="create-account-btn">
            Create Betting Account
          </button>
        </div>
      )}

      {/* Main Interface */}
      {accountExists && (
        <>
          {/* Account Overview */}
          <div className="account-overview">
            <h2>💰 Account Overview</h2>
            <div className="balance-grid">
              <div className="balance-card">
                <h3>Total Balance</h3>
                <p className="balance-amount">{balance.toFixed(6)} SOL</p>
              </div>
              <div className="balance-card">
                <h3>Available</h3>
                <p className="balance-amount available">{availableBalance.toFixed(6)} SOL</p>
              </div>
              <div className="balance-card">
                <h3>Locked in Bets</h3>
                <p className="balance-amount locked">{lockedBalance.toFixed(6)} SOL</p>
              </div>
              <div className="balance-card">
                <h3>Wallet Balance</h3>
                <p className="balance-amount">{walletBalance.toFixed(6)} SOL</p>
              </div>
            </div>
          </div>

          {/* User Story 2: SOL Deposit Interface */}
          <div className="deposit-section">
            <h2>💳 Deposit SOL</h2>
            <p className="user-story-info">
              User Story 2: Deposit SOL into your betting account to fund wagers
            </p>
            <div className="deposit-form">
              <div className="input-group">
                <label>Deposit Amount (SOL)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max={walletBalance}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter SOL amount"
                />
                <div className="input-actions">
                  <button
                    onClick={() => setDepositAmount((walletBalance * 0.1).toFixed(3))}
                    className="quick-amount"
                  >
                    10%
                  </button>
                  <button
                    onClick={() => setDepositAmount((walletBalance * 0.5).toFixed(3))}
                    className="quick-amount"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setDepositAmount((walletBalance * 0.9).toFixed(3))}
                    className="quick-amount"
                  >
                    90%
                  </button>
                </div>
              </div>
              <button
                onClick={handleDeposit}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0 || parseFloat(depositAmount) > walletBalance}
                className="deposit-btn"
              >
                🚀 Deposit SOL to Betting Account
              </button>
            </div>
          </div>

          {/* Withdrawal Interface */}
          <div className="withdrawal-section">
            <h2>💸 Withdraw SOL</h2>
            <div className="withdrawal-form">
              <div className="input-group">
                <label>Withdrawal Amount (SOL)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max={availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter SOL amount"
                />
                <div className="input-actions">
                  <button
                    onClick={() => setWithdrawAmount((availableBalance * 0.25).toFixed(3))}
                    className="quick-amount"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setWithdrawAmount((availableBalance * 0.5).toFixed(3))}
                    className="quick-amount"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setWithdrawAmount(availableBalance.toFixed(6))}
                    className="quick-amount"
                  >
                    All
                  </button>
                </div>
              </div>
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > availableBalance}
                className="withdraw-btn"
              >
                💰 Withdraw SOL to Wallet
              </button>
            </div>
          </div>

          {/* Advanced Controls */}
          <div className="advanced-section">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="toggle-advanced"
            >
              {showAdvanced ? '▼' : '▶'} Advanced Controls
            </button>
            
            {showAdvanced && (
              <div className="advanced-controls">
                <h3>🔒 Fund Management</h3>
                <div className="lock-form">
                  <div className="input-group">
                    <label>Lock/Unlock Amount (SOL)</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={lockAmount}
                      onChange={(e) => setLockAmount(e.target.value)}
                      placeholder="Enter SOL amount"
                    />
                  </div>
                  <div className="lock-actions">
                    <button onClick={handleLockFunds} className="lock-btn">
                      🔒 Lock for Betting
                    </button>
                    <button onClick={handleUnlockFunds} className="unlock-btn">
                      🔓 Unlock Funds
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="statistics-section">
            <h2>📊 Account Statistics</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Deposited:</span>
                <span className="stat-value">{totalDeposited.toFixed(6)} SOL</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Withdrawn:</span>
                <span className="stat-value">{totalWithdrawn.toFixed(6)} SOL</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Deposit Count:</span>
                <span className="stat-value">{depositCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Withdrawal Count:</span>
                <span className="stat-value">{withdrawalCount}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="actions-section">
            <button onClick={refreshAccountData} className="refresh-btn">
              🔄 Refresh Account Data
            </button>
            
            {lastTransaction && (
              <div className="last-transaction">
                <span>Last Transaction: </span>
                <a
                  href={`https://explorer.solana.com/tx/${lastTransaction}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transaction-link"
                >
                  {lastTransaction.slice(0, 8)}...{lastTransaction.slice(-8)}
                </a>
              </div>
            )}
          </div>

          {/* Network Info */}
          {networkInfo && (
            <div className="network-info-section">
              <h3>🌐 Network Information</h3>
              <pre>{JSON.stringify(networkInfo, null, 2)}</pre>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .betting-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: white;
        }

        .betting-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .betting-header h1 {
          font-size: 2.5em;
          margin-bottom: 10px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .production-badge {
          background: #ff4444;
          padding: 5px 15px;
          border-radius: 20px;
          font-weight: bold;
          display: inline-block;
          margin: 10px 0;
          box-shadow: 0 2px 10px rgba(255,68,68,0.3);
        }

        .wallet-info {
          font-family: 'Courier New', monospace;
          background: rgba(255,255,255,0.1);
          padding: 8px 16px;
          border-radius: 15px;
          display: inline-block;
        }

        .wallet-prompt, .loading-state, .account-creation {
          text-align: center;
          background: rgba(255,255,255,0.1);
          padding: 40px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }

        .error-banner {
          background: #ff4444;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .account-overview, .deposit-section, .withdrawal-section, 
        .advanced-section, .statistics-section, .actions-section {
          background: rgba(255,255,255,0.1);
          padding: 25px;
          border-radius: 15px;
          margin-bottom: 20px;
          backdrop-filter: blur(10px);
        }

        .balance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .balance-card {
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        }

        .balance-card h3 {
          margin: 0 0 10px 0;
          font-size: 0.9em;
          opacity: 0.8;
        }

        .balance-amount {
          font-size: 1.4em;
          font-weight: bold;
          margin: 0;
          font-family: 'Courier New', monospace;
        }

        .balance-amount.available {
          color: #4ade80;
        }

        .balance-amount.locked {
          color: #fbbf24;
        }

        .user-story-info {
          background: rgba(255,255,255,0.1);
          padding: 12px;
          border-radius: 8px;
          font-style: italic;
          margin-bottom: 20px;
          border-left: 4px solid #4ade80;
        }

        .input-group {
          margin-bottom: 15px;
        }

        .input-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }

        .input-group input {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: white;
          font-size: 1.1em;
        }

        .input-group input::placeholder {
          color: rgba(255,255,255,0.5);
        }

        .input-actions {
          display: flex;
          gap: 10px;
          margin-top: 8px;
        }

        .quick-amount {
          padding: 5px 12px;
          border-radius: 15px;
          border: none;
          background: rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
          font-size: 0.9em;
        }

        .quick-amount:hover {
          background: rgba(255,255,255,0.3);
        }

        .deposit-btn, .withdraw-btn, .create-account-btn, 
        .lock-btn, .unlock-btn, .refresh-btn {
          width: 100%;
          padding: 15px;
          border-radius: 10px;
          border: none;
          font-size: 1.1em;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .deposit-btn {
          background: linear-gradient(45deg, #4ade80, #22c55e);
          color: white;
        }

        .withdraw-btn {
          background: linear-gradient(45deg, #f59e0b, #d97706);
          color: white;
        }

        .create-account-btn {
          background: linear-gradient(45deg, #3b82f6, #1d4ed8);
          color: white;
        }

        .lock-btn {
          background: linear-gradient(45deg, #fbbf24, #f59e0b);
          color: white;
          width: 48%;
        }

        .unlock-btn {
          background: linear-gradient(45deg, #8b5cf6, #7c3aed);
          color: white;
          width: 48%;
        }

        .lock-actions {
          display: flex;
          gap: 4%;
        }

        .refresh-btn {
          background: linear-gradient(45deg, #6366f1, #4f46e5);
          color: white;
        }

        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .toggle-advanced {
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          padding: 10px 15px;
          border-radius: 8px;
          cursor: pointer;
          width: 100%;
          text-align: left;
        }

        .advanced-controls {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid rgba(255,255,255,0.2);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .stat-label {
          opacity: 0.8;
        }

        .stat-value {
          font-family: 'Courier New', monospace;
          font-weight: bold;
        }

        .last-transaction {
          margin-top: 15px;
          text-align: center;
        }

        .transaction-link {
          color: #4ade80;
          text-decoration: none;
          font-family: 'Courier New', monospace;
        }

        .transaction-link:hover {
          text-decoration: underline;
        }

        .network-info-section {
          background: rgba(0,0,0,0.2);
          padding: 20px;
          border-radius: 10px;
          margin-top: 20px;
        }

        .network-info-section pre {
          background: rgba(0,0,0,0.3);
          padding: 15px;
          border-radius: 8px;
          overflow-x: auto;
          font-size: 0.9em;
        }

        .spinner {
          border: 4px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top: 4px solid white;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .betting-container {
            padding: 15px;
          }
          
          .balance-grid {
            grid-template-columns: 1fr 1fr;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductionBettingComponent;
