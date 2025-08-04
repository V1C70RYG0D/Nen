// WalletSelector component for multi-wallet support
import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';

interface WalletSelectorProps {
  className?: string;
}

export const WalletSelector: React.FC<WalletSelectorProps> = ({ className = '' }) => {
  const { wallets, select, connected, disconnect } = useWallet();

  const readyWallets = wallets.filter(
    (wallet) => wallet.readyState === WalletReadyState.Installed
  );

  if (connected) {
    return (
      <button
        onClick={disconnect}
        className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors ${className}`}
        data-testid="disconnect-wallet"
      >
        Disconnect
      </button>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-sm font-medium text-gray-400 mb-3">Select Wallet</h3>
      {readyWallets.length > 0 ? (
        <div className="grid gap-2">
          {readyWallets.map((wallet) => (
            <button
              key={wallet.adapter.name}
              onClick={() => select(wallet.adapter.name)}
              className="flex items-center gap-3 p-3 rounded-lg border border-space-600 hover:border-emission-400 bg-space-700 hover:bg-space-600 transition-colors text-left"
              data-testid={`wallet-${wallet.adapter.name.toLowerCase()}`}
            >
              <img
                src={wallet.adapter.icon}
                alt={wallet.adapter.name}
                className="w-6 h-6"
              />
              <div>
                <div className="font-medium text-white">{wallet.adapter.name}</div>
                <div className="text-xs text-gray-400">
                  {wallet.readyState === WalletReadyState.Installed ? 'Installed' : 'Not Installed'}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">No wallets installed</p>
          <p className="text-xs text-gray-600 mt-1">
            Install a Solana wallet to continue
          </p>
        </div>
      )}
    </div>
  );
};
