import { useState, useEffect } from 'react';
import { apiConfig } from '@/lib/api-config';

export default function DebugApi() {
  const [apiUrl, setApiUrl] = useState('');
  const [healthStatus, setHealthStatus] = useState('');
  const [matchesStatus, setMatchesStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setApiUrl(apiConfig.baseUrl);
  }, []);

  const testHealth = async () => {
    try {
      setHealthStatus('Testing...');
      console.log('Testing health endpoint:', `${apiConfig.baseUrl}/health`);
      
      const response = await fetch(`${apiConfig.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Health response status:', response.status);
      console.log('Health response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Health response data:', data);
      setHealthStatus(`✅ Success: ${JSON.stringify(data)}`);
    } catch (err) {
      console.error('Health endpoint error:', err);
      setHealthStatus(`❌ Error: ${(err as Error).message || err}`);
    }
  };

  const testMatches = async () => {
    try {
      setMatchesStatus('Testing...');
      console.log('Testing matches endpoint:', `${apiConfig.baseUrl}/api/matches`);
      
      const response = await fetch(`${apiConfig.baseUrl}/api/matches`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Matches response status:', response.status);
      console.log('Matches response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Matches response data:', data);
      setMatchesStatus(`✅ Success: Found ${data.data?.matches?.length || 0} matches`);
    } catch (err) {
      console.error('Matches endpoint error:', err);
      setMatchesStatus(`❌ Error: ${(err as Error).message || err}`);
    }
  };

  const testDirectConnection = async () => {
    try {
      setError('Testing direct connection...');
      
      // Test direct IP access
      const directUrl = 'http://127.0.0.1:3031/health';
      console.log('Testing direct connection:', directUrl);
      
      const response = await fetch(directUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Direct connection status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Direct connection data:', data);
      setError(`✅ Direct connection successful: ${JSON.stringify(data)}`);
    } catch (err) {
      console.error('Direct connection error:', err);
      setError(`❌ Direct connection failed: ${(err as Error).message || err}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white text-black">
      <h1 className="text-2xl font-bold mb-6">API Debug Page</h1>
      
      <div className="space-y-4">
        <div>
          <strong>API Base URL from config:</strong> {apiUrl}
        </div>
        
        <div>
          <strong>Direct backend URL:</strong> http://127.0.0.1:3031
        </div>
        
        <div className="space-x-4">
          <button 
            onClick={testHealth}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Health Endpoint
          </button>
          
          <button 
            onClick={testMatches}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test Matches Endpoint
          </button>
          
          <button 
            onClick={testDirectConnection}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Test Direct Connection
          </button>
        </div>
        
        <div>
          <h3 className="font-bold">Health Endpoint:</h3>
          <pre className="bg-gray-100 p-2 rounded border max-h-40 overflow-y-auto">{healthStatus}</pre>
        </div>
        
        <div>
          <h3 className="font-bold">Matches Endpoint:</h3>
          <pre className="bg-gray-100 p-2 rounded border max-h-40 overflow-y-auto">{matchesStatus}</pre>
        </div>
        
        <div>
          <h3 className="font-bold">Direct Connection Test:</h3>
          <pre className="bg-gray-100 p-2 rounded border max-h-40 overflow-y-auto">{error}</pre>
        </div>
        
        <div>
          <h3 className="font-bold">Environment Check:</h3>
          <pre className="bg-gray-100 p-2 rounded border">
            NODE_ENV: {process.env.NODE_ENV}
            {'\n'}NEXT_PUBLIC_API_URL: {process.env.NEXT_PUBLIC_API_URL}
            {'\n'}API Config Base URL: {apiConfig.baseUrl}
            {'\n'}Browser User Agent: {typeof window !== 'undefined' ? window.navigator.userAgent : 'Server Side'}
          </pre>
        </div>

        <div>
          <h3 className="font-bold">Browser Console Instructions:</h3>
          <div className="bg-yellow-100 p-3 rounded border">
            <p>Open your browser's developer tools (F12) and check the Console and Network tabs while clicking the test buttons above.</p>
            <p>Look for:</p>
            <ul className="list-disc ml-5 mt-2">
              <li>CORS errors in the console</li>
              <li>Failed network requests in the Network tab</li>
              <li>Any JavaScript errors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
