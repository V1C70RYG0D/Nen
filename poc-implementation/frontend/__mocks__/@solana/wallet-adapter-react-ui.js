import React from 'react';

export const WalletMultiButton = ({ className, ...props }) => {
  return React.createElement('button', {
    'data-testid': 'wallet-multi-button',
    className,
    ...props
  }, 'Connect Wallet');
};

export const WalletDisconnectButton = ({ className, ...props }) => {
  return React.createElement('button', {
    'data-testid': 'wallet-disconnect-button',
    className,
    ...props
  }, 'Disconnect');
};

export const WalletModalProvider = ({ children }) => {
  return React.createElement('div', { 'data-testid': 'wallet-modal-provider' }, children);
};
