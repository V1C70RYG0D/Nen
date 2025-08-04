// PoolInfo component for total betting pool information
import React from 'react';
import { formatSOL } from '@/utils/format';

interface PoolInfoProps {
  totalPool: number;
  agent1Pool: number;
  agent2Pool: number;
  className?: string;
}

export const PoolInfo: React.FC<PoolInfoProps> = ({
  totalPool,
  agent1Pool,
  agent2Pool,
  className = '',
}) => {
  return (
    <div className={`bg-space-800 rounded-lg p-4 border border-space-600 ${className}`}>
      <h3 className="text-lg font-bold text-gray-300 mb-4">Total Betting Pool</h3>
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-400">Total Pool:</span>
        <span className="font-mono text-green-400 font-bold" data-testid="total-pool">
          {formatSOL(totalPool)}
        </span>
      </div>
      <div className="flex justify-between items-center">
        {/* Agent 1 */}
        <div className="flex-1 py-2 px-3 rounded-lg mr-2 border border-enhancement-400 bg-enhancement-500/20 text-enhancement-400">
          <div className="flex justify-between items-center">
            <span>Agent 1 Pool:</span>
            <span className="font-mono font-bold" data-testid="agent1-pool">
              {formatSOL(agent1Pool)}
            </span>
          </div>
        </div>

        {/* Agent 2 */}
        <div className="flex-1 py-2 px-3 rounded-lg border border-emission-400 bg-emission-500/20 text-emission-400">
          <div className="flex justify-between items-center">
            <span>Agent 2 Pool:</span>
            <span className="font-mono font-bold" data-testid="agent2-pool">
              {formatSOL(agent2Pool)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

