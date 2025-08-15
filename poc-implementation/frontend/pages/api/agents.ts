import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    if (req.method === 'GET') {
      const r = await fetch(`${base}/api/agents`);
      const json = await r.json();
      return res.status(r.status).json(json);
    }
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
