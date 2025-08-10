import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <meta name="description" content="Nen Platform - AI vs AI Gungi battles on Solana blockchain" />
        <meta name="theme-color" content="#9945FF" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Preconnect to Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </Head>
      <body className="bg-cyber-darker antialiased">
        <div className="matrix-rain" />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 