import { useState } from 'react';
import Head from 'next/head';
import { apiConfig } from '../lib/api-config';

export default function CreateRoomPage() {
  const [settings, setSettings] = useState({
    timeControl: '10+5',
    boardVariant: 'standard',
    tournamentMode: false,
    allowSpectators: true
  });
  const [entry, setEntry] = useState({
    minElo: 0,
    entryFeeSol: 0,
    whitelistMint: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  async function createRoom() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
  const res = await fetch(apiConfig.baseUrl + '/api/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, entry })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed');
      setResult(json.room);
    } catch (e: any) {
      setError(e.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  }

  const shareUrl = result ? `${typeof window !== 'undefined' ? window.location.origin : ''}/arena/${result.sessionId}` : '';

  return (
    <>
      <Head>
        <title>Create Game Room</title>
      </Head>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Create Game Room</h1>

        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-medium mb-2">Match Settings</h2>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span>Time Control</span>
                <input className="border rounded p-2" value={settings.timeControl} onChange={e => setSettings(s => ({ ...s, timeControl: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Board Variant</span>
                <select className="border rounded p-2" value={settings.boardVariant} onChange={e => setSettings(s => ({ ...s, boardVariant: e.target.value }))}>
                  <option value="standard">Standard</option>
                  <option value="fast">Fast</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.tournamentMode} onChange={e => setSettings(s => ({ ...s, tournamentMode: e.target.checked }))} />
                <span>Tournament mode</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.allowSpectators} onChange={e => setSettings(s => ({ ...s, allowSpectators: e.target.checked }))} />
                <span>Allow spectators</span>
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-2">Entry Requirements</h2>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span>Minimum ELO</span>
                <input type="number" className="border rounded p-2" value={entry.minElo} onChange={e => setEntry(s => ({ ...s, minElo: Number(e.target.value) }))} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Entry Fee (SOL)</span>
                <input type="number" className="border rounded p-2" min={0} step="0.01" value={entry.entryFeeSol} onChange={e => setEntry(s => ({ ...s, entryFeeSol: Number(e.target.value) }))} />
              </label>
              <label className="flex flex-col gap-1 col-span-2">
                <span>Whitelist NFT Mint (optional)</span>
                <input className="border rounded p-2" value={entry.whitelistMint} onChange={e => setEntry(s => ({ ...s, whitelistMint: e.target.value.trim() }))} placeholder="Mint address" />
              </label>
            </div>
          </section>

          <div className="flex gap-4 items-center">
            <button disabled={loading} onClick={createRoom} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">
              {loading ? 'Creating…' : 'Create Game'}
            </button>
            {error && <span className="text-red-600">{error}</span>}
          </div>

          {result && (
            <div className="mt-6 border rounded p-4 bg-gray-50">
              <h3 className="font-medium mb-2">Room Created</h3>
              <div className="space-y-1 text-sm">
                <div><span className="font-mono">Room Code:</span> <strong>{result.roomCode}</strong></div>
                <div><span className="font-mono">Session ID:</span> {result.sessionId}</div>
                <div><a className="text-blue-600 underline" href={result.explorer} target="_blank" rel="noreferrer">View on Solana Explorer (devnet)</a></div>
                {shareUrl && <div><span className="font-mono">Share URL:</span> <input className="border rounded p-1 w-full" readOnly value={shareUrl} onFocus={e => e.currentTarget.select()} /></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
