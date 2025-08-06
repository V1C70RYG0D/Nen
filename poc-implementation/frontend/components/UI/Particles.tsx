import React, { useCallback } from 'react';
import Particles from 'react-particles';
import type { Engine } from 'tsparticles-engine';
import { loadSlim } from 'tsparticles-slim';

interface ParticlesBackgroundProps {
  nenType?: 'enhancement' | 'emission' | 'manipulation' | 'transmutation' | 'conjuration' | 'specialization';
}

export const ParticlesBackground: React.FC<ParticlesBackgroundProps> = ({ nenType = 'specialization' }) => {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  const getParticleColor = () => {
    switch (nenType) {
      case 'enhancement':
        return ['#FF6B6B', '#FF4757'];
      case 'emission':
        return ['#4ECDC4', '#00D9FF'];
      case 'manipulation':
        return ['#FFE66D', '#FFA502'];
      case 'transmutation':
        return ['#95E1D3', '#00FF41'];
      case 'conjuration':
        return ['#A8E6CF', '#7BED9F'];
      case 'specialization':
        return ['#C7CEEA', '#9945FF'];
      default:
        return ['#9945FF', '#14F195'];
    }
  };

  const colors = getParticleColor();

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        background: {
          color: {
            value: 'transparent',
          },
        },
        fpsLimit: 60,
        interactivity: {
          events: {
            onClick: {
              enable: true,
              mode: 'push',
            },
            onHover: {
              enable: true,
              mode: 'repulse',
            },
            resize: true,
          },
          modes: {
            push: {
              quantity: 4,
            },
            repulse: {
              distance: 200,
              duration: 0.4,
            },
          },
        },
        particles: {
          color: {
            value: colors,
          },
          links: {
            color: colors[0],
            distance: 150,
            enable: true,
            opacity: 0.2,
            width: 1,
          },
          move: {
            direction: 'none',
            enable: true,
            outModes: {
              default: 'bounce',
            },
            random: false,
            speed: 1,
            straight: false,
          },
          number: {
            density: {
              enable: true,
              area: 800,
            },
            value: 80,
          },
          opacity: {
            value: 0.5,
          },
          shape: {
            type: 'circle',
          },
          size: {
            value: { min: 1, max: 5 },
          },
        },
        detectRetina: true,
      }}
      className="absolute inset-0 -z-10"
    />
  );
}; 