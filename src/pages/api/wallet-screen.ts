// pages/api/wallet-screen.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

const TRM_API_URL = process.env.TRM_SCREENING_URL!;
const API_KEY = process.env.TRM_API_KEY!;
const AUTH_HEADER = 'Basic ' + Buffer.from(`${API_KEY}:${API_KEY}`).toString('base64');

type ScreeningRequestItem = {
    accountExternalId: string | null;
    address: string;
    chain: string;
    externalId: string;
    includeDataPerChain?: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log('wallet-screen api called');
    if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

    const { address, chain = 'ethereum', includeDataPerChain = false } = req.body;
    if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid `address`' });
    }

    // Build payload per TRM docs (Batch up to 10; we send one)
    const payload: ScreeningRequestItem[] = [
        {
            accountExternalId: process.env.NEXT_PUBLIC_ACCOUNT_EXTERNAL_ID || null,
            address,
            chain,
            externalId: uuidv4(),
            includeDataPerChain: Boolean(includeDataPerChain),
        },
    ];

    // Call TRM Screening API
    let apiRes: Response;
    try {
        apiRes = await fetch(TRM_API_URL, {
            method: 'POST',
            headers: {
                Authorization: AUTH_HEADER,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    } catch (err) {
        return res.status(502).json({ error: 'Network error calling TRM' });
    }

    // Rate‑limit handling
    if (apiRes.status === 429) {
        const retryAfter = apiRes.headers.get('Retry-After') || '1';
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({ error: 'Rate limit exceeded', retryAfter });
    }

    // Error handling
    if (!apiRes.ok) {
        const text = await apiRes.text();
        return res.status(apiRes.status).json({
            error: `TRM error ${apiRes.status}: ${text}`,
        });
    }

    // Success: parse result (201 -> JSON array)
    const data = (await apiRes.json()) as any[];
    const result = data[0];
    return res.status(200).json(result);
}
