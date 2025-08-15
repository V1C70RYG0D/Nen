export async function fetchBettingPools(matchId: string) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3011';
  const res = await fetch(`${apiBase}/api/betting/pools/${matchId}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch betting pools');
  return json.data as {
    matchId: string;
    escrow: string;
    totalPool: number;
    agent1Pool: number;
    agent2Pool: number;
    oddsAgent1: number;
    oddsAgent2: number;
    betsCount: number;
    minBet: number;
    maxBet: number;
    isOpenForBetting: boolean;
  };
}
