/**
 * Simple Button Test Component
 * Basic test to verify click events work
 */

import React, { useState } from 'react';

export const ButtonTest: React.FC = () => {
  const [clickCount, setClickCount] = useState(0);
  const [message, setMessage] = useState('No clicks yet');

  const handleClick = () => {
    console.log('🟢 Button clicked!');
    setClickCount(prev => prev + 1);
    setMessage(`Button clicked ${clickCount + 1} times`);
  };

  const handleAsyncClick = async () => {
    console.log('🟡 Async button clicked!');
    setMessage('Processing async click...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setMessage('Async click completed!');
  };

  return (
    <div className="p-6 bg-gray-800 rounded-lg border border-gray-600">
      <h3 className="text-white text-xl mb-4">Button Test Component</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-gray-300 mb-2">Message: {message}</p>
          <p className="text-gray-300 mb-4">Click count: {clickCount}</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleClick}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            Test Click
          </button>

          <button
            onClick={handleAsyncClick}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
          >
            Test Async Click
          </button>

          <button
            onClick={() => {
              console.log('🔵 Inline click handler');
              setMessage('Inline handler worked!');
            }}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
          >
            Test Inline
          </button>
        </div>

        <button
          onClick={handleClick}
          disabled={true}
          className="px-4 py-2 bg-gray-500 text-gray-300 rounded cursor-not-allowed"
        >
          Disabled Button
        </button>

        <div className="relative">
          <button
            onClick={handleClick}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
          >
            Button with Overlay Test
          </button>
          {/* Test if overlays are blocking clicks */}
          <div className="absolute inset-0 bg-transparent pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};

export default ButtonTest;
