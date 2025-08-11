// Centralized frontend configuration (no hardcoding)
// Reads from environment variables with safe fallbacks.

export const getApiBase = () => {
  // NEXT_PUBLIC_API_BASE can be absolute (e.g., http://localhost:3011) or relative (/api)
  const base = process.env.NEXT_PUBLIC_API_BASE || '';
  if (base) return base.replace(/\/$/, '');
  // Fallback to same-origin proxy path if not provided
  return '';
};

export const API = {
  ownedAgents: (wallet: string) => `${getApiBase()}/api/training/owned-agents?walletAddress=${encodeURIComponent(wallet)}`,
  matchReplays: (params: {
    agentMint: string;
    walletAddress: string;
    opponent?: string;
    dateFrom?: string;
    dateTo?: string;
    result?: string;
    opening?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    q.set('agentMint', params.agentMint);
    q.set('walletAddress', params.walletAddress);
    if (params.opponent) q.set('opponent', params.opponent);
    if (params.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params.dateTo) q.set('dateTo', params.dateTo);
    if (params.result) q.set('result', params.result);
    if (params.opening) q.set('opening', params.opening);
    if (params.limit != null) q.set('limit', String(params.limit));
    if (params.offset != null) q.set('offset', String(params.offset));
    return `${getApiBase()}/api/training/match-replays?${q.toString()}`;
  },
  createReplayTrainingSession: () => `${getApiBase()}/api/training/sessions/replay-based`,
};
