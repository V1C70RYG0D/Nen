import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/WalletButton';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { href: '/', label: 'Arena', icon: '⚔️', nenType: 'enhancement' },
    { href: '/marketplace', label: 'Hunters', icon: '🎯', nenType: 'emission' },
    { href: '/leaderboard', label: 'Rankings', icon: '🏆', nenType: 'manipulation' },
    { href: '/profile', label: 'Profile', icon: '👤', nenType: 'specialization', requiresAuth: true },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 3D Background */}
      <div className="fixed inset-0 -z-20">
        <Canvas camera={{ position: [0, 0, 1] }}>
          <Stars radius={300} depth={60} count={3000} factor={7} fade />
          <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        </Canvas>
      </div>

      {/* Animated Grid Background */}
      <div className="fixed inset-0 -z-10 bg-cyber-grid bg-[size:50px_50px] opacity-20" />
      
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-cyber-dark/80 backdrop-blur-xl border-b border-solana-purple/30'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="group relative">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-3"
              >
                {/* Hunter Association Inspired Logo */}
                <div className="relative w-14 h-14 nen-aura">
                  <div className="absolute inset-0 bg-gradient-to-br from-solana-purple to-solana-green rounded-full animate-pulse-slow" />
                  <div className="absolute inset-1 bg-cyber-darker rounded-full flex items-center justify-center">
                    <span className="text-2xl font-hunter text-transparent bg-clip-text bg-gradient-to-r from-solana-purple to-solana-green text-glow">
                      N
                    </span>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-hunter text-white glitch-text" data-text="NEN PLATFORM">
                    NEN PLATFORM
                  </h1>
                  <p className="text-xs text-solana-green font-cyber tracking-wider">
                    HUNTER PROTOCOL v2.077
                  </p>
                </div>
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                if (item.requiresAuth && !connected) return null;
                
                const isActive = router.pathname === item.href;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        relative px-6 py-3 font-cyber text-sm uppercase tracking-wider
                        transition-all duration-300 group
                        ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}
                      `}
                    >
                      {/* Nen Type Indicator */}
                      <div
                        className={`
                          absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity
                          nen-${item.nenType}
                        `}
                        style={{
                          clipPath: 'polygon(0 0, 100% 0, 90% 100%, 10% 100%)',
                          background: `linear-gradient(135deg, transparent, currentColor, transparent)`,
                          filter: 'blur(20px)',
                        }}
                      />
                      
                      <span className="relative flex items-center space-x-2">
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </span>
                      
                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-solana-purple to-solana-green"
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {/* Wallet & Mobile Menu */}
            <div className="flex items-center space-x-4">
              {/* Balance Display */}
              {connected && publicKey && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="hidden md:flex items-center space-x-2 px-4 py-2 bg-solana-dark/50 backdrop-blur-sm border border-solana-purple/30 rounded-full"
                >
                  <div className="w-2 h-2 bg-solana-green rounded-full animate-pulse" />
                  <span className="text-sm font-mono text-solana-green">
                    {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                  </span>
                </motion.div>
              )}
              
              {/* Wallet Button */}
              <WalletButton className="!text-sm" />
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden relative w-10 h-10 flex items-center justify-center"
              >
                <div className="w-6 flex flex-col space-y-1.5">
                  <motion.span
                    animate={{ rotate: isMenuOpen ? 45 : 0, y: isMenuOpen ? 8 : 0 }}
                    className="block h-0.5 bg-white"
                  />
                  <motion.span
                    animate={{ opacity: isMenuOpen ? 0 : 1 }}
                    className="block h-0.5 bg-white"
                  />
                  <motion.span
                    animate={{ rotate: isMenuOpen ? -45 : 0, y: isMenuOpen ? -8 : 0 }}
                    className="block h-0.5 bg-white"
                  />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-cyber-dark/95 backdrop-blur-xl border-t border-solana-purple/30"
            >
              <div className="px-4 py-6 space-y-4">
                {navItems.map((item) => {
                  if (item.requiresAuth && !connected) return null;
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsMenuOpen(false)}
                        className={`
                          flex items-center space-x-3 px-4 py-3 rounded-lg
                          transition-all duration-300
                          ${router.pathname === item.href
                            ? 'bg-solana-purple/20 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }
                        `}
                      >
                        <span className="text-2xl">{item.icon}</span>
                        <span className="font-cyber uppercase tracking-wider">
                          {item.label}
                        </span>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="relative pt-20 min-h-screen">
        {children}
      </main>

      {/* Futuristic Footer */}
      <footer className="relative mt-20 border-t border-solana-purple/30 bg-cyber-dark/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About */}
            <div>
              <h3 className="text-lg font-hunter text-solana-purple mb-4">HUNTER PROTOCOL</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Advanced AI combat simulation powered by Solana blockchain and MagicBlock's 
                sub-50ms ephemeral rollups. Experience the future of decentralized gaming.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-hunter text-solana-green mb-4">QUICK ACCESS</h3>
              <div className="space-y-2">
                <a href="#" className="block text-sm text-gray-400 hover:text-white transition-colors">
                  Documentation
                </a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white transition-colors">
                  Smart Contracts
                </a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white transition-colors">
                  API Reference
                </a>
              </div>
            </div>
            
            {/* Stats */}
            <div>
              <h3 className="text-lg font-hunter text-magicblock-primary mb-4">NETWORK STATUS</h3>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Block Height:</span>
                  <span className="text-solana-green">247,892,451</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TPS:</span>
                  <span className="text-solana-green">2,847</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Latency:</span>
                  <span className="text-solana-green">47ms</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-solana-purple/20 text-center">
            <p className="text-sm text-gray-500 font-cyber">
              © 2077 NEN PLATFORM • BUILT ON SOLANA • POWERED BY MAGICBLOCK
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}; 