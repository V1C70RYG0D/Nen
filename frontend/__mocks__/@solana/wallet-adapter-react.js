import React from 'react';

export const useWallet = jest.fn(() => ({
  connected: false,
  publicKey: null,
  connecting: false,
  disconnecting: false,
  wallet: null,
  connect: jest.fn(),
  disconnect: jest.fn(),
  sendTransaction: jest.fn(),
  signTransaction: jest.fn(),
  signAllTransactions: jest.fn(),
  signMessage: jest.fn(),
}));

export const useConnection = jest.fn(() => ({
  connection: {
    getAccountInfo: jest.fn(),
    getBalance: jest.fn(),
    sendTransaction: jest.fn(),
  },
}));

export const useAnchorWallet = jest.fn(() => null);

export const WalletProvider = ({ children }) => {
  return React.createElement('div', { 'data-testid': 'wallet-provider' }, children);
};

export const ConnectionProvider = ({ children }) => {
  return React.createElement('div', { 'data-testid': 'connection-provider' }, children);
};
