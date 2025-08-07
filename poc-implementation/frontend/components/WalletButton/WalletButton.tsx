import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { motion, AnimatePresence } from 'framer-motion';

interface WalletButtonProps {
  className?: string;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ className = '' }) => {
  const { connected, connecting, disconnect, publicKey, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = () => {
    setVisible(true);
  };

  const handleDisconnect = async () => {
    await disconnect();
    setIsMenuOpen(false);
  };

  const copyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (connecting) {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        disabled
        className={`cyber-button !cursor-not-allowed ${className}`}
      >
        <span className="flex items-center space-x-2">
          <span>CONNECTING</span>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
          />
        </span>
      </motion.button>
    );
  }

  if (connected && publicKey) {
    return (
      <div className="relative" ref={menuRef}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`cyber-button flex items-center space-x-2 ${className}`}
        >
          {wallet?.adapter.icon && (
            <img
              src={wallet.adapter.icon}
              alt={wallet.adapter.name}
              className="w-5 h-5"
            />
          )}
          <span className="font-mono">
            {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
          </span>
          <motion.span
            animate={{ rotate: isMenuOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm"
          >
            ▼
          </motion.span>
        </motion.button>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-64 bg-cyber-dark/95 backdrop-blur-xl border border-solana-purple/30 rounded-lg overflow-hidden z-50"
            >
              {/* Wallet Info */}
              <div className="p-4 border-b border-solana-purple/20">
                <div className="flex items-center space-x-3 mb-3">
                  {wallet?.adapter.icon && (
                    <img
                      src={wallet.adapter.icon}
                      alt={wallet.adapter.name}
                      className="w-8 h-8"
                    />
                  )}
                  <div>
                    <div className="text-sm font-cyber text-white uppercase">
                      {wallet?.adapter.name}
                    </div>
                    <div className="text-xs text-solana-green">Connected</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">
                    Wallet Address
                  </div>
                  <div className="flex items-center justify-between bg-cyber-darker/50 px-3 py-2 rounded">
                    <span className="font-mono text-sm text-white">
                      {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={copyAddress}
                      className="text-solana-green hover:text-solana-purple transition-colors"
                    >
                      {copied ? '✓' : '📋'}
                    </motion.button>
                  </div>
                  {copied && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xs text-solana-green text-center"
                    >
                      Address copied!
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Menu Actions */}
              <div className="p-2">
                <motion.button
                  whileHover={{ backgroundColor: 'rgba(255, 107, 107, 0.1)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDisconnect}
                  className="w-full px-4 py-3 text-left text-red-400 hover:text-red-300 font-cyber uppercase tracking-wider transition-colors rounded-lg"
                >
                  🔌 Disconnect
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleConnect}
      className={`cyber-button ${className}`}
    >
      🔗 CONNECT WALLET
    </motion.button>
  );
};
