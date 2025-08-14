import { useState } from 'react';

export default function TrainingCompletePage() {
  const [walletPubkey, setWallet] = useState('');
  const [agentMint, setMint] = useState('');
  const [sessionId, setSession] = useState('');
  const [modelVersion, setVersion] = useState('v1.1');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null); setResult(null);
    try {
      const r = await fetch('/api/training/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletPubkey, agentMint, sessionId, modelVersion, metrics: { gamesPlayed: 5, wins: 4, losses: 1, draws: 0, winRate: 0.8, averageGameLength: 160, newElo: 1300 } })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed');
      setResult(data);
    } catch (e: any) {
      setError(e?.message || 'Error');
    }
  }

  return (
    <div style={{ padding: 24, color: '#eaeaea' }}>
      <h2>Complete Training (Devnet)</h2>
      <div style={{ display: 'grid', gap: 8, maxWidth: 600 }}>
        <input placeholder="Wallet Pubkey" value={walletPubkey} onChange={e => setWallet(e.target.value)} />
        <input placeholder="Agent Mint" value={agentMint} onChange={e => setMint(e.target.value)} />
        <input placeholder="Session Id" value={sessionId} onChange={e => setSession(e.target.value)} />
        <input placeholder="Model Version" value={modelVersion} onChange={e => setVersion(e.target.value)} />
        <button onClick={submit}>Complete Training</button>
      </div>
      {error && <pre style={{ color: 'tomato' }}>{error}</pre>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}


