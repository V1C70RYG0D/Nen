import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    if (req.method === 'POST') {
      const r = await fetch(`${base}/api/nft-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {}),
      });
      const json = await r.json();
      return res.status(r.status).json(json);
    }
    if (req.method === 'GET') {
      const { id } = req.query;
      const r = await fetch(`${base}/api/nft-metadata/${id}`);
      const json = await r.json();
      return res.status(r.status).json(json);
    }
    res.setHeader('Allow', 'GET,POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
