// Main layout component with Nen Platform theming
import React, { ReactNode, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { announceNavigation } from '@/utils/screenReader';
import { 
  isMobileDevice, 
  configureTouchButton, 
  TouchGestureHandler, 
  announceMobile,
  addHapticFeedback
} from '@/utils/mobileAccessibility';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const touchHandlerRef = useRef<TouchGestureHandler | null>(null);

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

  // Handle keyboard shortcuts
const handleKeyDown = (event: KeyboardEvent) => {
    // Navigate to Arena
    if (event.ctrlKey && event.key === '1') {
      router.push('/');
      announceNavigation('Arena');
    }
    // Navigate to Marketplace
    if (event.ctrlKey && event.key === '2') {
      router.push('/marketplace');
      announceNavigation('Marketplace');
    }
    // Navigate to Profile
    if (event.ctrlKey && event.key === '3') {
      router.push('/profile');
      announceNavigation('Profile');
    }
  };

  useEffect(() => {
    // Check for mobile device
    setIsMobile(isMobileDevice());
    
    // Set up keyboard shortcuts
    window.addEventListener('keydown', handleKeyDown);
    
    // Set up touch gestures for mobile navigation
    if (isMobileDevice() && mobileMenuRef.current) {
      touchHandlerRef.current = new TouchGestureHandler(mobileMenuRef.current);
      
      mobileMenuRef.current.addEventListener('swipe', (e: any) => {
        const { direction } = e.detail;
        if (direction === 'left' || direction === 'up') {
          setIsMobileMenuOpen(false);
          announceMobile('Navigation menu closed', 'polite');
        }
      });
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (touchHandlerRef.current) {
        touchHandlerRef.current.destroy();
      }
    };
  }, [router]);
  
  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    addHapticFeedback('light');
    announceMobile(
      `Navigation menu ${newState ? 'opened' : 'closed'}`,
      'polite'
    );
  };

  return (
    <div className="min-h-screen bg-space-900 text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Neural network background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="neural-pattern w-full h-full"></div>
        </div>
        
        {/* Floating particles */}
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-emission-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Skip Link */}
      <a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>
      
      {/* Navigation */}
      <nav className="relative z-50 glassmorphism border-b border-emission-500/30" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group" aria-label="Nen Platform Home">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-8 h-8 bg-aura-gradient rounded-lg flex items-center justify-center">
                  <span className="text-xl font-bold">念</span>
                </div>
                <div className="absolute inset-0 bg-aura-gradient rounded-lg blur-md opacity-50 group-hover:opacity-100 transition-opacity"></div>
              </motion.div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-emission-400 to-manipulation-400 bg-clip-text text-transparent">
                  Nen Platform
                </span>
                <span className="text-xs text-gray-400">Powered by MagicBlock</span>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  active={isActivePath(item.href)}
                  icon={item.icon}
                  aria-label={`Navigate to ${item.label}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

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
                className="md:hidden p-3 rounded-lg glassmorphism min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation" 
                aria-label={isMobileMenuOpen ? 'Close mobile navigation menu' : 'Open mobile navigation menu'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-navigation"
                onClick={toggleMobileMenu}
                ref={(el) => {
                  if (el && isMobile) {
                    configureTouchButton(el, {
                      haptic: 'light',
                      announcement: isMobileMenuOpen ? 'Menu closed' : 'Menu opened'
                    });
                  }
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <motion.div 
          id="mobile-navigation" 
          ref={mobileMenuRef}
          className={`md:hidden glassmorphism border-t border-emission-500/30 overflow-hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}
          aria-label="Mobile navigation menu"
          aria-hidden={!isMobileMenuOpen}
          initial={{ height: 0, opacity: 0 }}
          animate={{ 
            height: isMobileMenuOpen ? 'auto' : 0, 
            opacity: isMobileMenuOpen ? 1 : 0 
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 min-h-[44px] touch-manipulation ${
                    isActivePath(item.href)
                      ? 'bg-emission-500/20 text-emission-400 border border-emission-400/30'
                      : 'text-gray-300 hover:text-white hover:bg-space-700/50 border border-transparent'
                  }`}
                  aria-label={`Navigate to ${item.label}`}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    addHapticFeedback('medium');
                    announceMobile(`Navigating to ${item.label}`, 'polite');
                  }}
                  ref={(el) => {
                    if (el && isMobile) {
                      configureTouchButton(el, {
                        haptic: 'medium',
                        announcement: `${item.label} selected`
                      });
                    }
                  }}
                >
                  <span aria-hidden="true" className="text-xl">{item.icon}</span>
                  <span className="font-medium text-lg">{item.label}</span>
                  {isActivePath(item.href) && (
                    <motion.div
                      className="ml-auto w-2 h-2 bg-emission-400 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
            
            {/* Mobile Menu Instructions */}
            <div className="mt-4 pt-4 border-t border-space-600">
              <p className="text-xs text-gray-500 text-center">
                Swipe left or up to close menu
              </p>
            </div>
          </div>
        </motion.div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 min-h-screen">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 glassmorphism border-t border-emission-500/30 mt-auto" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-aura-gradient rounded flex items-center justify-center">
                  <span className="text-sm font-bold">念</span>
                </div>
                <span className="font-bold text-emission-400">Nen Platform</span>
              </div>
              <p className="text-gray-400 text-sm">
                The future of AI gaming on Solana. Experience the power of Nen in blockchain battles.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="font-bold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="text-gray-400 hover:text-emission-400 transition-colors">Live Matches</Link></li>
                <li><Link href="/marketplace" className="text-gray-400 hover:text-emission-400 transition-colors">AI Marketplace</Link></li>
                <li><Link href="/profile" className="text-gray-400 hover:text-emission-400 transition-colors">My Profile</Link></li>
              </ul>
            </div>

            {/* Technology */}
            <div>
              <h4 className="font-bold text-white mb-4">Technology</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-gray-400">Built on Solana</span></li>
                <li><span className="text-gray-400">Powered by MagicBlock</span></li>
                <li><span className="text-gray-400">Real-time Gaming</span></li>
              </ul>
            </div>

            {/* Stats */}
            <div>
              <h4 className="font-bold text-white mb-4">Live Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Matches:</span>
                  <span className="text-emission-400 font-mono">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Pool:</span>
                  <span className="text-emission-400 font-mono">1,247 SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Players Online:</span>
                  <span className="text-emission-400 font-mono">384</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 pt-8 border-t border-emission-500/30 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Nen Platform. Built with ⚡ by hunters, for hunters.
            </p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-emission-400 transition-colors" aria-label="Join our Discord community">
                <span className="sr-only">Discord</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-emission-400 transition-colors" aria-label="Follow us on Twitter">
                <span className="sr-only">Twitter</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Navigation Link Component
interface NavLinkProps {
  href: string;
  active: boolean;
  children: ReactNode;
  icon?: string;
}

const NavLink: React.FC<NavLinkProps> = ({ href, active, children, icon }) => (
  <Link href={href} className="group relative">
    <motion.div
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
        active
          ? 'text-emission-400 bg-emission-500/20'
          : 'text-gray-300 hover:text-white hover:bg-space-700/50'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span className="font-medium">{children}</span>
    </motion.div>
    
    {/* Active indicator */}
    {active && (
      <motion.div
        className="absolute -bottom-1 left-1/2 w-8 h-0.5 bg-emission-400 rounded-full"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        style={{ x: '-50%' }}
      />
    )}
  </Link>
);
