// Footer component with platform info and links
import React from 'react';
import Link from 'next/link';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  return (
    <footer className={`glassmorphism border-t border-emission-500/30 mt-auto ${className}`}>
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
              <li>
                <Link 
                  href="/" 
                  className="text-gray-400 hover:text-emission-400 transition-colors"
                  data-testid="footer-live-matches"
                >
                  Live Matches
                </Link>
              </li>
              <li>
                <Link 
                  href="/marketplace" 
                  className="text-gray-400 hover:text-emission-400 transition-colors"
                  data-testid="footer-marketplace"
                >
                  AI Marketplace
                </Link>
              </li>
              <li>
                <Link 
                  href="/profile" 
                  className="text-gray-400 hover:text-emission-400 transition-colors"
                  data-testid="footer-profile"
                >
                  My Profile
                </Link>
              </li>
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
                <span className="text-emission-400 font-mono" data-testid="active-matches-count">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Pool:</span>
                <span className="text-emission-400 font-mono" data-testid="total-pool-amount">1,247 SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Players Online:</span>
                <span className="text-emission-400 font-mono" data-testid="players-online-count">384</span>
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
            <a 
              href="#" 
              className="text-gray-400 hover:text-emission-400 transition-colors"
              data-testid="discord-link"
              aria-label="Discord"
            >
              <span className="sr-only">Discord</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </a>
            <a 
              href="#" 
              className="text-gray-400 hover:text-emission-400 transition-colors"
              data-testid="twitter-link"
              aria-label="Twitter"
            >
              <span className="sr-only">Twitter</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
