// Wallet fallback component for unsupported browsers
import React, { useState, useEffect } from 'react';
import { 
  detectBrowserCapabilities, 
  checkWalletCompatibility, 
  getFallbackRecommendations,
  isWalletSupported,
  getMinimumRequirements 
} from '../../utils/browserCompatibility';

interface WalletFallbackProps {
  onContinueWithoutWallet?: () => void;
  className?: string;
}

export const WalletFallback: React.FC<WalletFallbackProps> = ({ 
  onContinueWithoutWallet,
  className = '' 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);

  useEffect(() => {
    const capabilities = detectBrowserCapabilities();
    const compatibility = checkWalletCompatibility();
    const fallbackRecs = getFallbackRecommendations();
    
    setBrowserInfo({ capabilities, compatibility });
    setRecommendations(fallbackRecs);
  }, []);

  if (!browserInfo || isWalletSupported()) {
    return null;
  }

  const requirements = getMinimumRequirements();

  return (
    <div className={`wallet-fallback bg-gradient-to-br from-space-800 to-space-900 border border-emission-600 rounded-xl p-6 max-w-2xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-emission-500/20 rounded-full flex items-center justify-center">
          <svg 
            className="w-8 h-8 text-emission-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            data-testid="wallet-fallback-icon"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2" data-testid="fallback-title">
          Wallet Integration Unavailable
        </h2>
        <p className="text-emission-300" data-testid="fallback-message">
          {recommendations?.message}
        </p>
      </div>

      {/* Browser Information */}
      <div className="bg-space-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Browser Information</h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-emission-400 hover:text-emission-300 text-sm"
            data-testid="toggle-details-btn"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Browser:</span>
            <span className="text-white" data-testid="browser-type">
              {browserInfo.capabilities.isChrome && 'Chrome'}
              {browserInfo.capabilities.isFirefox && 'Firefox'}
              {browserInfo.capabilities.isSafari && 'Safari'}
              {browserInfo.capabilities.isEdge && 'Edge'}
              {!browserInfo.capabilities.isChrome && !browserInfo.capabilities.isFirefox && 
               !browserInfo.capabilities.isSafari && !browserInfo.capabilities.isEdge && 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Version:</span>
            <span className="text-white" data-testid="browser-version">
              {browserInfo.capabilities.version}
            </span>
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 pt-4 border-t border-space-600">
            <h4 className="text-sm font-medium text-white mb-3">Capability Details</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Web Extensions:</span>
                <span className={browserInfo.capabilities.hasWebExtensions ? 'text-green-400' : 'text-red-400'}>
                  {browserInfo.capabilities.hasWebExtensions ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Local Storage:</span>
                <span className={browserInfo.capabilities.hasLocalStorage ? 'text-green-400' : 'text-red-400'}>
                  {browserInfo.capabilities.hasLocalStorage ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Web Crypto:</span>
                <span className={browserInfo.capabilities.hasWebCrypto ? 'text-green-400' : 'text-red-400'}>
                  {browserInfo.capabilities.hasWebCrypto ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Wallet Standard:</span>
                <span className={browserInfo.capabilities.supportsWalletStandard ? 'text-green-400' : 'text-red-400'}>
                  {browserInfo.capabilities.supportsWalletStandard ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recommended Actions */}
      <div className="space-y-3 mb-6">
        <h3 className="text-sm font-semibold text-white">Recommended Actions:</h3>
        {recommendations?.actions.map((action: any, index: number) => (
          <div 
            key={index}
            className="flex items-start gap-3 p-3 bg-space-700/30 rounded-lg border border-space-600 hover:border-emission-500 transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-emission-400 mt-2 flex-shrink-0"></div>
            <div className="flex-1">
              <h4 className="font-medium text-white text-sm">{action.title}</h4>
              <p className="text-xs text-gray-400 mt-1">{action.description}</p>
              {action.url && (
                <a
                  href={action.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emission-400 hover:text-emission-300 text-xs mt-2"
                  data-testid={`action-link-${index}`}
                >
                  Visit Website
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Minimum Requirements */}
      <div className="bg-emission-900/20 border border-emission-600/30 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-emission-300 mb-3">Minimum Browser Requirements:</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Chrome:</span>
            <span className="text-white">{requirements.chrome}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Firefox:</span>
            <span className="text-white">{requirements.firefox}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Safari:</span>
            <span className="text-white">{requirements.safari}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Edge:</span>
            <span className="text-white">{requirements.edge}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => window.location.reload()}
          className="flex-1 px-4 py-2 bg-emission-600 hover:bg-emission-500 text-white rounded-lg transition-colors text-sm font-medium"
          data-testid="retry-connection-btn"
        >
          Retry Connection
        </button>
        {onContinueWithoutWallet && (
          <button
            onClick={onContinueWithoutWallet}
            className="flex-1 px-4 py-2 bg-space-600 hover:bg-space-500 text-white rounded-lg transition-colors text-sm font-medium border border-space-500"
            data-testid="continue-without-wallet-btn"
          >
            Continue Without Wallet
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="text-center mt-4">
        <p className="text-xs text-gray-500">
          Need help? Visit our{' '}
          <a 
            href="/support" 
            className="text-emission-400 hover:text-emission-300"
            data-testid="support-link"
          >
            support page
          </a>{' '}
          for detailed setup instructions.
        </p>
      </div>
    </div>
  );
};
