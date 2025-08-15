import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useProductionBetting } from '../hooks/useProductionBetting';

/**
 * Simple Betting Interface using Production Hook
 * This uses the proper Anchor integration via useProductionBetting
 */
const SimpleBettingApp: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  
  // Use production betting hook for real Anchor integration
  const {
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
    isReady,
    needsAccountCreation,
    
    // Actions
    createBettingAccount,
    depositSol,
    withdrawSol,
    refreshAccountData,
    clearError,
  } = useProductionBetting();
  
  // Local state
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  
  // Load wallet balance
  const loadWalletBalance = async () => {
    if (!publicKey) return;
    try {
      const balance = await connection.getBalance(publicKey);
      setWalletBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Failed to load wallet balance:', error);
    }
  };
  
  useEffect(() => {
    if (connected && publicKey) {
      loadWalletBalance();
    }
  }, [connected, publicKey]);
  
  // Handle create account
  const handleCreateAccount = async () => {
    try {
      clearError();
      const signature = await createBettingAccount();
      alert(`✅ Account created! Transaction: ${signature}`);
    } catch (error) {
      console.error('❌ Create account failed:', error);
      alert(`❌ Failed to create account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Handle deposit
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
      if (result?.success) {
        alert(`✅ Deposited ${amount} SOL! New balance: ${result.newBalance} SOL`);
        setDepositAmount('');
        await loadWalletBalance();
      }
    } catch (error) {
      console.error('❌ Deposit failed:', error);
      alert(`❌ Deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Handle withdraw
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid withdrawal amount');
      return;
    }
    
    if (amount > availableBalance) {
      alert('Insufficient available balance');
      return;
    }
    
    try {
      const result = await withdrawSol(amount);
      if (result?.success) {
        alert(`✅ Withdrew ${amount} SOL! New balance: ${result.newBalance} SOL`);
        setWithdrawAmount('');
        await loadWalletBalance();
      }
    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      alert(`❌ Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  if (!connected) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        padding: '50px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        color: 'white'
      }}>
        <h1>🎲 Nen Betting Platform</h1>
        <p>Please connect your wallet to continue</p>
        <WalletMultiButton />
      </div>
    );
  }
  
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '20px',
      color: 'white'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '30px',
          padding: '20px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '15px'
        }}>
          <h1>🎲 Nen Betting Platform</h1>
          <WalletMultiButton />
        </div>
        
        {/* Error Display */}
        {error && (
          <div style={{ 
            background: 'rgba(255,0,0,0.2)', 
            border: '1px solid #ff4444',
            padding: '15px', 
            borderRadius: '10px',
            marginBottom: '20px',
            color: '#ff8888'
          }}>
            ❌ {error}
            <button 
              onClick={clearError}
              style={{ 
                marginLeft: '10px', 
                background: 'transparent',
                border: '1px solid #ff8888',
                color: '#ff8888',
                padding: '5px 10px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        )}
        
        {/* Loading */}
        {isLoading && (
          <div style={{ 
            background: 'rgba(255,193,7,0.2)', 
            border: '1px solid #ffc107',
            padding: '15px', 
            borderRadius: '10px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            ⏳ Processing...
          </div>
        )}
        
        {/* Account Status */}
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '25px', 
          borderRadius: '15px', 
          marginBottom: '20px'
        }}>
          <h2>📊 Account Status</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
              <h3>Wallet Balance</h3>
              <p style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '0' }}>
                {walletBalance.toFixed(6)} SOL
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
              <h3>Betting Balance</h3>
              <p style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '0', color: accountExists ? '#4ade80' : '#ff8888' }}>
                {accountExists ? `${balance.toFixed(6)} SOL` : 'No Account'}
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
              <h3>Available</h3>
              <p style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '0' }}>
                {availableBalance.toFixed(6)} SOL
              </p>
            </div>
          </div>
        </div>
        
        {/* Account Creation */}
        {!accountExists && (
          <div style={{ 
            background: 'rgba(255,193,7,0.1)', 
            border: '1px solid #ffc107',
            padding: '25px', 
            borderRadius: '15px', 
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <h2>🏗️ Create Betting Account</h2>
            <p>You need to create a betting account before you can deposit SOL</p>
            <button
              onClick={handleCreateAccount}
              disabled={isLoading}
              style={{
                background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
                color: 'white',
                padding: '15px 30px',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.1em',
                fontWeight: 'bold',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              {isLoading ? '⏳ Creating...' : '🚀 Create Betting Account'}
            </button>
          </div>
        )}
        
        {/* Deposit Interface */}
        {accountExists && (
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '25px', 
            borderRadius: '15px', 
            marginBottom: '20px'
          }}>
            <h2>💳 Deposit SOL</h2>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                placeholder="Amount in SOL"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="0.1"
                step="0.1"
                style={{
                  flex: '1',
                  minWidth: '200px',
                  padding: '12px',
                  fontSize: '1em',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                }}
              />
              <button
                onClick={handleDeposit}
                disabled={isLoading || !depositAmount}
                style={{
                  background: 'linear-gradient(45deg, #10b981, #059669)',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1em',
                  fontWeight: 'bold',
                  cursor: isLoading || !depositAmount ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !depositAmount ? 0.5 : 1,
                }}
              >
                💰 Deposit
              </button>
            </div>
          </div>
        )}
        
        {/* Withdraw Interface */}
        {accountExists && availableBalance > 0 && (
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '25px', 
            borderRadius: '15px', 
            marginBottom: '20px'
          }}>
            <h2>💸 Withdraw SOL</h2>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                placeholder="Amount in SOL"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min="0.01"
                max={availableBalance}
                step="0.01"
                style={{
                  flex: '1',
                  minWidth: '200px',
                  padding: '12px',
                  fontSize: '1em',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                }}
              />
              <button
                onClick={handleWithdraw}
                disabled={isLoading || !withdrawAmount}
                style={{
                  background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1em',
                  fontWeight: 'bold',
                  cursor: isLoading || !withdrawAmount ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !withdrawAmount ? 0.5 : 1,
                }}
              >
                💸 Withdraw
              </button>
            </div>
          </div>
        )}
        
        {/* Account Info */}
        {accountExists && (
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '25px', 
            borderRadius: '15px'
          }}>
            <h2>📈 Account Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
              <div>
                <strong>Total Deposited:</strong><br />
                {totalDeposited.toFixed(6)} SOL
              </div>
              <div>
                <strong>Total Withdrawn:</strong><br />
                {totalWithdrawn.toFixed(6)} SOL
              </div>
              <div>
                <strong>Deposit Count:</strong><br />
                {depositCount}
              </div>
              <div>
                <strong>Withdrawal Count:</strong><br />
                {withdrawalCount}
              </div>
              <div>
                <strong>Locked Balance:</strong><br />
                {lockedBalance.toFixed(6)} SOL
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default SimpleBettingApp;
