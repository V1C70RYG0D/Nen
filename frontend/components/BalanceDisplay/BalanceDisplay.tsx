// BalanceDisplay component for SOL balance display
import React from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { formatSOL } from '@/utils/format';

interface BalanceDisplayProps {
  className?: string;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({ className = '' }) => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const getBalance = async () => {
      if (!connected || !publicKey) {
        setBalance(null);
        return;
      }

      setLoading(true);
      try {
        const lamports = await connection.getBalance(publicKey);
        setBalance(lamports);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance(null);
      } finally {
        setLoading(false);
      }
    };

    getBalance();
  }, [connected, publicKey, connection]);

  if (!connected) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <span className="text-gray-400">Balance:</span>
      {loading ? (
        <div className="nen-spinner w-4 h-4" />
      ) : balance !== null ? (
        <span className="font-mono text-green-400 font-bold" data-testid="sol-balance">
          {formatSOL(balance)}
        </span>
      ) : (
        <span className="text-gray-500">--</span>
      )}
    </div>
  );
};
