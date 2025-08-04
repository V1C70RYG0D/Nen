// WalletButton component for Solana wallet connection
import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface WalletButtonProps {
  className?: string;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ className = '' }) => {
  return (
    <WalletMultiButton 
      className={`nen-button !bg-solana-gradient !text-white ${className}`}
      data-testid="wallet-button"
    />
  );
};
