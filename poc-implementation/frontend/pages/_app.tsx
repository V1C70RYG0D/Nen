// Main App component with providers
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import React, { useEffect } from 'react';
import Head from 'next/head';
import { WalletContextProvider } from '@/components/WalletProvider/WalletProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { initWebVitals } from '../utils/webVitals';
import { reportWebVitals } from '../utils/webVitals';
import mixpanel from 'mixpanel-browser';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Initialize Mixpanel with your Project Token
type MixpanelConfig = {
  token: string;
  debug: boolean;
  api_host: string;
};

const mixpanelConfig: MixpanelConfig = {
  token: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '',
  debug: process.env.NODE_ENV !== 'production',
  api_host: process.env.NEXT_PUBLIC_MIXPANEL_URL || 'https://api.mixpanel.com',
};

if (mixpanelConfig.token) {
  mixpanel.init(mixpanelConfig.token, {
    debug: mixpanelConfig.debug,
    api_host: mixpanelConfig.api_host,
  });
}

// Web Vitals Provider Component
const WebVitalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Initialize Core Web Vitals tracking
    initWebVitals({
      enableLogging: process.env.NODE_ENV === 'development',
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% sampling in production
      endpoint: '/api/analytics/web-vitals',
    });

    // Track initial page load
    const handleLoad = () => {
      if (typeof window !== 'undefined') {
        const loadTime = performance.now();
        // Custom metric for initial page load
        import('../utils/webVitals').then(({ trackCustomMetric }) => {
          trackCustomMetric('page.initial.load', loadTime);
        });
      }
    };

    // Track if page is already loaded or wait for load event
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad, { once: true });
    }

    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  return <>{children}</>;
};

// Export the reportWebVitals function for Next.js built-in support
export { reportWebVitals };

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <html lang="en" />
        <title>Nen Platform - AI Gaming Arena</title>
        <meta name="description" content="Watch AI agents battle in real-time strategic games. Powered by MagicBlock on Solana blockchain." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <WebVitalsProvider>
        <QueryClientProvider client={queryClient}>
          <WalletContextProvider>
            {/* Screen reader announcement region */}
            <div id="sr-announcements" aria-live="polite" aria-atomic="true" className="sr-only"></div>
            <div id="sr-alerts" aria-live="assertive" aria-atomic="true" className="sr-only"></div>
            
            <Component {...pageProps} />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1A1F3A',
                  color: '#fff',
                  border: '1px solid #4ECDC4',
                },
                success: {
                  iconTheme: {
                    primary: '#4ECDC4',
                    secondary: '#1A1F3A',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#FF6B6B',
                    secondary: '#1A1F3A',
                  },
                },
              }}
            />
          </WalletContextProvider>
        </QueryClientProvider>
      </WebVitalsProvider>
    </>
  );
}
