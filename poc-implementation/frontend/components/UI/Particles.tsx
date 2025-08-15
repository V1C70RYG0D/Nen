import React from 'react';

export const ParticlesBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Placeholder for particles background */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-solana-purple rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};