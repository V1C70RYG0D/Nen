import React from 'react';

export default function TestPage() {
  const handleClick = () => {
    console.log('🟢 BASIC BUTTON CLICKED!');
    alert('Button clicked successfully!');
  };

  return (
    <div style={{ 
      padding: '50px', 
      backgroundColor: '#1a1a1a', 
      minHeight: '100vh',
      color: 'white' 
    }}>
      <h1 style={{ color: 'white', marginBottom: '30px' }}>Button Test Page</h1>
      
      {/* Basic HTML button */}
      <button 
        onClick={handleClick}
        style={{
          padding: '20px 40px',
          backgroundColor: 'red',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          margin: '10px',
          cursor: 'pointer',
          fontSize: '18px',
          zIndex: 9999,
          position: 'relative'
        }}
      >
        BASIC TEST BUTTON
      </button>

      {/* With inline handler */}
      <button 
        onClick={() => {
          console.log('🔵 INLINE HANDLER CLICKED!');
          alert('Inline handler works!');
        }}
        style={{
          padding: '20px 40px',
          backgroundColor: 'blue',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          margin: '10px',
          cursor: 'pointer',
          fontSize: '18px',
          zIndex: 9999,
          position: 'relative'
        }}
      >
        INLINE HANDLER
      </button>

      {/* Test with different CSS classes */}
      <button 
        className="test-button"
        onClick={handleClick}
        style={{
          padding: '20px 40px',
          backgroundColor: 'green',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          margin: '10px',
          cursor: 'pointer',
          fontSize: '18px',
          zIndex: 9999,
          position: 'relative',
          pointerEvents: 'auto'
        }}
      >
        WITH CSS CLASS
      </button>

      {/* Native onclick */}
      <button 
        onClick={handleClick}
        style={{
          padding: '20px 40px',
          backgroundColor: 'purple',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          margin: '10px',
          cursor: 'pointer',
          fontSize: '18px',
          zIndex: 9999,
          position: 'relative'
        }}
        onMouseEnter={() => console.log('Mouse entered')}
        onMouseLeave={() => console.log('Mouse left')}
      >
        HOVER TEST
      </button>

      {/* Test clickable div */}
      <div 
        onClick={handleClick}
        style={{
          padding: '20px 40px',
          backgroundColor: 'orange',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          margin: '10px',
          cursor: 'pointer',
          fontSize: '18px',
          zIndex: 9999,
          position: 'relative',
          display: 'inline-block'
        }}
      >
        CLICKABLE DIV
      </div>

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#333' }}>
        <h3>Instructions:</h3>
        <p>1. Open browser dev tools (F12)</p>
        <p>2. Go to Console tab</p>
        <p>3. Click each button above</p>
        <p>4. Check if you see console logs and alerts</p>
        <p>5. If none work, there's a global JavaScript/CSS issue</p>
        <p>6. If some work but not others, it's specific to certain components</p>
      </div>
    </div>
  );
}
