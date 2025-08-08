import React, { useState } from 'react';
import useWalletConnection from '../hooks/useWalletConnection';

interface WalletConnectionProps {
  onConnectionSuccess?: (data: { publicKey: string; hasAccount: boolean }) => void;
  onConnectionError?: (error: string) => void;
  className?: string;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({
  onConnectionSuccess,
  onConnectionError,
  className = '',
}) => {
  const {
    connected,
    connecting,
    publicKey,
    pdaResult,
    balance,
    error,
    connectWallet,
    disconnectWallet,
    refreshPDA,
    refreshBalance,
    hasExistingAccount,
    isFirstTimeUser,
    pdaAddress,
  } = useWalletConnection();

  const [showDetails, setShowDetails] = useState(false);

  const handleConnect = async () => {
    try {
      const result = await connectWallet();
      if (onConnectionSuccess) {
        onConnectionSuccess({
          publicKey: result.publicKey,
          hasAccount: result.pdaResult.hasAccount,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      if (onConnectionError) {
        onConnectionError(errorMessage);
      }
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (!connected) {
    return (
      <div className={`wallet-connection ${className}`}>
        <div className="wallet-connect-container">
          <h3 className="text-lg font-semibold mb-4">Connect Your Wallet</h3>
          <p className="text-gray-600 mb-6">
            Connect your Solana wallet to start playing and betting on Nen Platform
          </p>
          
          <button
            onClick={handleConnect}
            disabled={connecting}
            className={`
              w-full px-6 py-3 rounded-lg font-medium transition-all duration-200
              ${connecting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {connecting ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Connecting...
              </div>
            ) : (
              'Connect Wallet'
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mt-6 text-sm text-gray-500">
            <p>Supported wallets:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Phantom</li>
              <li>Solflare</li>
              <li>Backpack</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`wallet-connected ${className}`}>
      <div className="wallet-info-container">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="font-medium">Wallet Connected</span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Disconnect
          </button>
        </div>

        <div className="space-y-3">
          {/* Wallet Address */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Address:</span>
            <span className="font-mono text-sm">
              {publicKey ? truncateAddress(publicKey) : 'N/A'}
            </span>
          </div>

          {/* SOL Balance */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">SOL Balance:</span>
            <span className="font-medium">
              {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
            </span>
          </div>

          {/* PDA Account Status */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Platform Account:</span>
            <div className="flex items-center">
              {hasExistingAccount ? (
                <span className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  {pdaResult?.isNewAccount ? 'Just Created' : 'Active'}
                </span>
              ) : (
                <span className="flex items-center text-orange-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                  Pending
                </span>
              )}
            </div>
          </div>

          {/* Account Status Messages */}
          {pdaResult?.isNewAccount && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <div className="w-5 h-5 text-green-500 mr-2 mt-0.5">✅</div>
                <div>
                  <p className="text-sm text-green-800 font-medium">Account Created Successfully!</p>
                  <p className="text-xs text-green-600 mt-1">
                    Your Nen Platform account has been initialized. You're ready to start playing!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* First Time User Notice (for cases where auto-init might have failed) */}
          {isFirstTimeUser && !pdaResult?.isNewAccount && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <div className="w-5 h-5 text-blue-500 mr-2 mt-0.5">ℹ️</div>
                <div>
                  <p className="text-sm text-blue-800 font-medium">Welcome to Nen Platform!</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Setting up your account... This may take a moment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Message from Backend */}
          {pdaResult?.message && (
            <div className="mt-2 text-xs text-gray-600 italic">
              {pdaResult.message}
            </div>
          )}

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>

          {/* Detailed Information */}
          {showDetails && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
              <div>
                <span className="text-xs text-gray-500">Full Address:</span>
                <p className="font-mono text-xs break-all">{publicKey}</p>
              </div>
              
              {pdaAddress && (
                <div>
                  <span className="text-xs text-gray-500">PDA Address:</span>
                  <p className="font-mono text-xs break-all">{pdaAddress}</p>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={refreshBalance}
                  className="flex-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Refresh Balance
                </button>
                <button
                  onClick={refreshPDA}
                  className="flex-1 px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  Check Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletConnection;
