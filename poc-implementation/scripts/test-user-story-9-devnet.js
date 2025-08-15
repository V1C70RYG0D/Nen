#!/usr/bin/env node
/**
 * Devnet E2E test for User Story 9
 * - Starts a training session (via backend route or directly)
 * - Completes training with on-chain memo including model commitment
 * - Verifies commitment
 * - Publishes a practice match
 * - Prints outputs for manual verification
 */

require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function main() {
  const backend = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
  const wallet = process.env.TEST_TRAINER_WALLET || '8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC';
  const agentMint = process.env.TEST_AGENT_MINT || 'H4o5x8s4A3pYsG47yPCsGMe4GzLDXdbdJPQ7VHG89FzY';

  const sessionRes = await fetch(`${backend}/api/v1/training/sessions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletPubkey: wallet, agentMint, params: { focusArea: 'all', intensity: 'medium', maxMatches: 10 } , cid: 'bafybeigdyrzt' })
  });
  const sessionJson = await sessionRes.json();
  if (!sessionRes.ok) throw new Error(`session init failed: ${sessionJson.error}`);
  const sessionId = sessionJson.sessionId || sessionJson.session?.sessionId;
  console.log('Session initiated:', sessionId, sessionJson.tx);

  const metrics = { gamesPlayed: 20, wins: 14, losses: 6, draws: 0, winRate: 0.7, averageGameLength: 180, newElo: 2150 };
  const completeRes = await fetch(`${backend}/api/v1/training/complete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletPubkey: wallet, agentMint, sessionId, modelVersion: 'v1.1', metrics })
  });
  const completeJson = await completeRes.json();
  if (!completeRes.ok) throw new Error(`complete failed: ${completeJson.error}`);
  console.log('Training complete on-chain:', completeJson.onchain);
  console.log('Commitment verify:', completeJson.verify);

  // Verify endpoint
  const commitment = completeJson.verify?.expected || completeJson.verify?.onchain;
  const verifyGet = await fetch(`${backend}/api/devnet/agents/${agentMint}/verify-commitment?expected=${commitment}`);
  const verifyJson = await verifyGet.json();
  console.log('GET verify-commitment:', verifyJson);

  // Fetch matches to confirm practice publication
  const matchesRes = await fetch(`${backend}/api/devnet/matches`);
  const matchesJson = await matchesRes.json();
  console.log('Devnet matches count:', matchesJson.count);
  const practice = (matchesJson.data || []).find(m => String(m.id || '').startsWith('practice_'));
  console.log('Practice match found:', !!practice, practice && practice.id);

  console.log('User Story 9 E2E OK');
}

main().catch((e) => { console.error('User Story 9 E2E failed:', e.message); process.exit(1); });


