// SuperGungiBoard component with enhanced 3D visualization
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box } from '@react-three/drei';

interface SuperGungiBoardProps {
  className?: string;
}

export const SuperGungiBoard: React.FC<SuperGungiBoardProps> = ({ className = '' }) => {
  const sceneStyle = {
    height: '500px',
    background: 'linear-gradient(180deg, #1a202c, #2d3748)',
  };

  return (
    <div className={`rounded-xl overflow-hidden ${className}`} style={sceneStyle}>
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        {/* Gungi Board Visualization */}
        <Box args={[3, 3, 0.1]} position={[0, 0, 0]}>
          <meshStandardMaterial attach="material" color="black" />
        </Box>

        {/* Add Gungi Pieces dynamically here if needed */}

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[0, 5, 5]} intensity={1} />

        {/* Controls */}
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
};

