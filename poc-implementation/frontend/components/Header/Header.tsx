// Header component with navigation and wallet integration
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const router = useRouter();
  const { connected, publicKey } = useWallet();

  const navItems = [
    { href: '/', label: 'Arena', icon: '⚔️' },
    { href: '/marketplace', label: 'Marketplace', icon: '🏪' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  const isActivePath = (path: string) => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  return (
    <header 
      className={`glassmorphism border-b border-emission-500/30 ${className}`}
      role="banner"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center space-x-3 group"
            aria-label="Nen Platform home"
          >
            <motion.div
              className="relative"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div 
                className="w-8 h-8 bg-aura-gradient rounded-lg flex items-center justify-center"
                role="img"
                aria-label="Nen Platform logo"
              >
                <span className="text-xl font-bold" aria-hidden="true">念</span>
              </div>
              <div className="absolute inset-0 bg-aura-gradient rounded-lg blur-md opacity-50 group-hover:opacity-100 transition-opacity" aria-hidden="true"></div>
            </motion.div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-emission-400 to-manipulation-400 bg-clip-text text-transparent">
                Nen Platform
              </span>
              <span className="text-xs text-gray-400">Powered by MagicBlock</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav 
            className="hidden md:flex items-center space-x-8"
            role="navigation"
            aria-label="Main navigation menu"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  isActivePath(item.href)
                    ? 'text-emission-400 bg-emission-500/20'
                    : 'text-gray-300 hover:text-white hover:bg-space-700/50'
                }`}
                aria-current={isActivePath(item.href) ? 'page' : undefined}
                aria-label={`Navigate to ${item.label}`}
              >
                <span className="text-lg" aria-hidden="true">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                {isActivePath(item.href) && (
                  <motion.div
                    className="absolute -bottom-1 left-1/2 w-8 h-0.5 bg-emission-400 rounded-full"
                    layoutId="activeNav"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{ x: '-50%' }}
                    aria-hidden="true"
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Wallet & User Actions */}
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="hidden sm:flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-emission-400 rounded-full animate-pulse"></div>
                <span className="text-gray-400">Live</span>
              </div>
            </div>

            {/* Wallet Button */}
            <div className="wallet-adapter-button-container">
              <WalletMultiButton className="nen-button !bg-solana-gradient !text-white" />
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-lg glassmorphism"
              data-testid="mobile-menu-button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
