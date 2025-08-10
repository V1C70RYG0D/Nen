/**
 * User Story 2a - Withdrawal Interface Component
 * Real SOL withdrawal from betting account with devnet integration
 * 
 * Implements all acceptance criteria:
 * - User enters withdrawal amount in SOL
 * - User approves transaction in wallet  
 * - User sees updated balance
 * - Enforce 24-hour cooldown for security; show error if locked funds exceed amount
 * 
 * Following GI.md guidelines:
 * - Real implementations over simulations
 * - Error-free, working systems
 * - Extensive testing coverage
 * - Production-ready security
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { RealBettingClient, WithdrawalResult } from '../lib/real-betting-client';

interface WithdrawalComponentProps {
  onWithdrawalSuccess?: (result: WithdrawalResult) => void;
  onWithdrawalError?: (error: Error) => void;
}

interface AccountState {
  balance: number;
  lockedFunds: number;
  availableBalance: number;
  lastWithdrawal: number;
  canWithdraw: boolean;
  cooldownRemaining: number;
  nextWithdrawalTime: number;
}

export const WithdrawalInterface: React.FC<WithdrawalComponentProps> = ({
  onWithdrawalSuccess,
  onWithdrawalError,
}) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  
  // Component state
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [accountState, setAccountState] = useState<AccountState>({
    balance: 0,
    lockedFunds: 0,
    availableBalance: 0,
    lastWithdrawal: 0,
    canWithdraw: true,
    cooldownRemaining: 0,
    nextWithdrawalTime: 0,
  });
  
  // Real betting client instance
  const [bettingClient] = useState(() => new RealBettingClient());
  
  /**
   * Load current account state from devnet
   * User Story 2a: Query real balance and cooldown data
   */
  const loadAccountState = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      // Get betting account data
      const account = await bettingClient.getBettingAccount(publicKey);
      if (!account) {
        setAccountState(prev => ({ ...prev, balance: 0, availableBalance: 0 }));
        return;
      }
      
      const balance = account.balance.toNumber() / LAMPORTS_PER_SOL;
      const lockedFunds = account.lockedFunds.toNumber() / LAMPORTS_PER_SOL;
      const availableBalance = balance - lockedFunds;
      
      // Check withdrawal cooldown
      const cooldownStatus = await bettingClient.canWithdraw(publicKey);
      
      setAccountState({
        balance,
        lockedFunds,
        availableBalance,
        lastWithdrawal: account.lastWithdrawal.toNumber() * 1000,
        canWithdraw: cooldownStatus.canWithdraw,
        cooldownRemaining: cooldownStatus.cooldownRemaining,
        nextWithdrawalTime: cooldownStatus.nextWithdrawalTime,
      });
      
    } catch (error) {
      console.error('Failed to load account state:', error);
      setError('Failed to load account information');
    }
  }, [publicKey, bettingClient]);
  
  /**
   * Load account state on mount and publicKey change
   */
  useEffect(() => {
    loadAccountState();
  }, [loadAccountState]);
  
  /**
   * Handle withdrawal form submission
   * User Story 2a: Core withdrawal functionality
   */
  const handleWithdrawal = useCallback(async () => {
    if (!publicKey || !sendTransaction) {
      setError('Wallet not connected');
      return;
    }
    
    const amount = parseFloat(withdrawalAmount);
    
    // Validation
    if (!amount || amount <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }
    
    if (amount < 0.01) {
      setError('Minimum withdrawal is 0.01 SOL');
      return;
    }
    
    if (amount > accountState.availableBalance) {
      setError(
        `Insufficient available balance. Available: ${accountState.availableBalance.toFixed(6)} SOL, ` +
        `Locked: ${accountState.lockedFunds.toFixed(6)} SOL`
      );
      return;
    }
    
    if (!accountState.canWithdraw) {
      const hoursRemaining = Math.ceil(accountState.cooldownRemaining / (60 * 60 * 1000));
      setError(`Withdrawal cooldown active. Please wait ${hoursRemaining} more hours.`);
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      console.log(`🚀 Starting withdrawal of ${amount} SOL...`);
      
      // Execute real withdrawal on devnet
      const result = await bettingClient.withdrawSol(
        publicKey,
        amount,
        sendTransaction
      );
      
      // Success handling
      const successMessage = `✅ Withdrawal successful! ${amount} SOL withdrawn.`;
      setSuccess(successMessage);
      setWithdrawalAmount('');
      
      // Refresh account state
      await loadAccountState();
      
      // Call success callback
      if (onWithdrawalSuccess) {
        onWithdrawalSuccess(result);
      }
      
      // Show explorer link
      const explorerUrl = `https://explorer.solana.com/tx/${result.transactionSignature}?cluster=devnet`;
      console.log(`🔗 Transaction: ${explorerUrl}`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Withdrawal failed';
      console.error('❌ Withdrawal failed:', errorMsg);
      setError(errorMsg);
      
      // Call error callback
      if (onWithdrawalError) {
        onWithdrawalError(error instanceof Error ? error : new Error(errorMsg));
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    publicKey,
    sendTransaction,
    withdrawalAmount,
    accountState.availableBalance,
    accountState.lockedFunds,
    accountState.canWithdraw,
    accountState.cooldownRemaining,
    bettingClient,
    loadAccountState,
    onWithdrawalSuccess,
    onWithdrawalError,
  ]);
  
  /**
   * Format time remaining for cooldown display
   */
  const formatCooldownTime = (milliseconds: number): string => {
    if (milliseconds <= 0) return 'Ready';
    
    const hours = Math.floor(milliseconds / (60 * 60 * 1000));
    const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };
  
  /**
   * Refresh account data manually
   */
  const handleRefresh = useCallback(() => {
    setError('');
    setSuccess('');
    loadAccountState();
  }, [loadAccountState]);
  
  if (!publicKey) {
    return (
      <div style={{ 
        background: 'rgba(239, 68, 68, 0.1)', 
        padding: '20px', 
        borderRadius: '10px',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        textAlign: 'center' 
      }}>
        <p>Please connect your wallet to access withdrawal functionality.</p>
      </div>
    );
  }
  
  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.1)', 
      padding: '25px', 
      borderRadius: '15px', 
      marginBottom: '20px',
      border: '1px solid rgba(255, 255, 255, 0.2)' 
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#fb923c' }}>
          💸 Withdraw SOL (User Story 2a)
        </h2>
        <p style={{ 
          background: 'rgba(251, 146, 60, 0.2)', 
          padding: '12px', 
          borderRadius: '8px',
          borderLeft: '4px solid #fb923c',
          fontStyle: 'italic',
          margin: '0'
        }}>
          ✅ Real Implementation: Withdraw actual SOL from your betting account to your wallet on Solana devnet
        </p>
      </div>
      
      {/* Account Information */}
      <div style={{ 
        background: 'rgba(59, 130, 246, 0.1)', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid rgba(59, 130, 246, 0.3)' 
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Account Balance</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9em' }}>
          <div>
            <strong>Total Balance:</strong> {accountState.balance.toFixed(6)} SOL
          </div>
          <div>
            <strong>Locked Funds:</strong> {accountState.lockedFunds.toFixed(6)} SOL
          </div>
          <div style={{ color: '#10b981' }}>
            <strong>Available:</strong> {accountState.availableBalance.toFixed(6)} SOL
          </div>
          <div>
            <strong>Withdrawal Status:</strong> {
              accountState.canWithdraw ? 
                <span style={{ color: '#10b981' }}>Ready</span> : 
                <span style={{ color: '#f59e0b' }}>{formatCooldownTime(accountState.cooldownRemaining)}</span>
            }
          </div>
        </div>
        <button 
          onClick={handleRefresh}
          style={{
            marginTop: '10px',
            padding: '5px 10px',
            background: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '5px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.8em'
          }}
        >
          🔄 Refresh
        </button>
      </div>
      
      {/* Withdrawal Form */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Withdrawal Amount (SOL):
        </label>
        <input
          type=\"number\"
          step=\"0.001\"
          min=\"0.01\"
          max={accountState.availableBalance}
          value={withdrawalAmount}
          onChange={(e) => setWithdrawalAmount(e.target.value)}
          placeholder=\"Enter amount to withdraw\"
          disabled={isLoading || !accountState.canWithdraw}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            fontSize: '16px',
          }}
        />
        <div style={{ fontSize: '0.8em', opacity: '0.7', marginTop: '5px' }}>
          Min: 0.01 SOL | Max: {accountState.availableBalance.toFixed(6)} SOL
        </div>
      </div>
      
      {/* Quick Amount Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[0.1, 0.5, 1.0].map(amount => (
          <button
            key={amount}
            onClick={() => setWithdrawalAmount(amount.toString())}
            disabled={isLoading || amount > accountState.availableBalance || !accountState.canWithdraw}
            style={{
              padding: '8px 15px',
              background: amount <= accountState.availableBalance && accountState.canWithdraw ? 
                'rgba(59, 130, 246, 0.2)' : 'rgba(107, 114, 128, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              color: 'white',
              cursor: amount <= accountState.availableBalance && accountState.canWithdraw ? 'pointer' : 'not-allowed',
              fontSize: '0.9em',
              opacity: amount <= accountState.availableBalance && accountState.canWithdraw ? 1 : 0.5
            }}
          >
            {amount} SOL
          </button>
        ))}
        <button
          onClick={() => setWithdrawalAmount(accountState.availableBalance.toFixed(6))}
          disabled={isLoading || accountState.availableBalance <= 0 || !accountState.canWithdraw}
          style={{
            padding: '8px 15px',
            background: accountState.availableBalance > 0 && accountState.canWithdraw ? 
              'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            color: 'white',
            cursor: accountState.availableBalance > 0 && accountState.canWithdraw ? 'pointer' : 'not-allowed',
            fontSize: '0.9em',
            opacity: accountState.availableBalance > 0 && accountState.canWithdraw ? 1 : 0.5
          }}
        >
          Max ({accountState.availableBalance.toFixed(3)} SOL)
        </button>
      </div>
      
      {/* Error Display */}
      {error && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          color: '#fca5a5', 
          padding: '10px', 
          borderRadius: '6px', 
          marginBottom: '15px',
          border: '1px solid rgba(239, 68, 68, 0.3)' 
        }}>
          ⚠️ {error}
        </div>
      )}
      
      {/* Success Display */}
      {success && (
        <div style={{ 
          background: 'rgba(34, 197, 94, 0.1)', 
          color: '#86efac', 
          padding: '10px', 
          borderRadius: '6px', 
          marginBottom: '15px',
          border: '1px solid rgba(34, 197, 94, 0.3)' 
        }}>
          {success}
        </div>
      )}
      
      {/* Withdrawal Button */}
      <button
        onClick={handleWithdrawal}
        disabled={
          isLoading || 
          !withdrawalAmount || 
          parseFloat(withdrawalAmount) <= 0 ||
          parseFloat(withdrawalAmount) > accountState.availableBalance ||
          !accountState.canWithdraw
        }
        style={{
          width: '100%',
          padding: '15px',
          background: (
            !isLoading && 
            withdrawalAmount && 
            parseFloat(withdrawalAmount) > 0 && 
            parseFloat(withdrawalAmount) <= accountState.availableBalance &&
            accountState.canWithdraw
          ) ? 
            'linear-gradient(135deg, #fb923c, #f97316)' : 
            'rgba(107, 114, 128, 0.5)',
          border: 'none',
          borderRadius: '10px',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: (
            !isLoading && 
            withdrawalAmount && 
            parseFloat(withdrawalAmount) > 0 && 
            parseFloat(withdrawalAmount) <= accountState.availableBalance &&
            accountState.canWithdraw
          ) ? 'pointer' : 'not-allowed',
          opacity: (
            !isLoading && 
            withdrawalAmount && 
            parseFloat(withdrawalAmount) > 0 && 
            parseFloat(withdrawalAmount) <= accountState.availableBalance &&
            accountState.canWithdraw
          ) ? 1 : 0.5,
          transition: 'all 0.2s ease',
        }}
      >
        {isLoading ? 
          '⏳ Processing Withdrawal...' : 
          '💸 Withdraw SOL from Betting Account'
        }
      </button>
      
      {/* Information Footer */}
      <div style={{ 
        marginTop: '15px', 
        fontSize: '0.85em', 
        opacity: '0.8',
        background: 'rgba(255, 193, 7, 0.1)',
        padding: '10px',
        borderRadius: '6px',
        border: '1px solid rgba(255, 193, 7, 0.3)'
      }}>
        <p style={{ margin: '0 0 5px 0' }}>
          🔒 <strong>Security Notice:</strong> 24-hour cooldown enforced between withdrawals
        </p>
        <p style={{ margin: '0 0 5px 0' }}>
          🎯 <strong>Real Transaction:</strong> This creates actual SOL transfers on Solana devnet
        </p>
        <p style={{ margin: '0' }}>
          🔍 <strong>Verification:</strong> All transactions are verifiable on Solana Explorer
        </p>
      </div>
    </div>
  );
};

export default WithdrawalInterface;
