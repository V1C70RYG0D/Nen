import React from 'react';

export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>NEN Platform Test Page</h1>
      <p>This is a simple test page to verify the frontend is working.</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>System Status</h2>
        <ul>
          <li>✅ Next.js is running</li>
          <li>✅ React components are rendering</li>
          <li>✅ TypeScript compilation is working</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>Navigation Links</h2>
        <ul>
          <li><a href="/">Homepage</a></li>
          <li><a href="/betting">Betting</a></li>
          <li><a href="/marketplace">Marketplace</a></li>
          <li><a href="/matches">Matches</a></li>
          <li><a href="/training">Training</a></li>
          <li><a href="/leaderboard">Leaderboard</a></li>
          <li><a href="/profile">Profile</a></li>
        </ul>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Backend Connection Test</h2>
        <TestBackendConnection />
      </div>
    </div>
  );
}

function TestBackendConnection() {
  const [status, setStatus] = React.useState('Testing...');
  
  React.useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setStatus('✅ Backend connected'))
      .catch(err => setStatus('❌ Backend connection failed: ' + err.message));
  }, []);
  
  return <p>{status}</p>;
}
