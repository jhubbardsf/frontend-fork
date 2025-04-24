// pages/api/token-colors.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Vibrant } from 'node-vibrant/node';
import Sharp from 'sharp'; // for image format conversion

// In-memory cache for color results
const cache = new Map<string, { borderColor: string; bgColor: string }>();

// Ensure bg is dark enough for white text
function ensureDarkEnoughColor(hex: string, minLum: number = 0.5): string {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum > minLum) {
        const factor = minLum / lum;
        const newR = Math.floor(r * factor * 255);
        const newG = Math.floor(g * factor * 255);
        const newB = Math.floor(b * factor * 255);
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
    return hex;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<{ borderColor: string; bgColor: string } | { error: string }>,
) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const rawUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
    if (!rawUrl) {
        return res.status(400).json({ error: 'Missing `url` query parameter' });
    }

    // Return cached result if available
    if (cache.has(rawUrl)) {
        return res.status(200).json(cache.get(rawUrl)!);
    }

    try {
        const response = await fetch(rawUrl);
        if (!response.ok) {
            return res.status(response.status).json({ error: `Fetch failed: ${response.statusText}` });
        }

        // Read raw buffer
        let buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || '';

        // Convert WebP (or other unsupported formats) to PNG so Vibrant can decode
        if (contentType.includes('image/webp') || contentType.includes('image/avif')) {
            buffer = Buffer.from(await Sharp(buffer).png().toBuffer());
        }

        // Extract palette
        const palette = await Vibrant.from(buffer).maxColorCount(16).getPalette();

        // Pick colors
        const vibrantHex = palette.Vibrant?.hex;
        const darkVibrantHex = palette.DarkVibrant?.hex;
        const mutedHex = palette.Muted?.hex;

        const borderColor = vibrantHex || mutedHex || '#666666';
        let bgColor = darkVibrantHex || vibrantHex || mutedHex || '#333333';
        bgColor = ensureDarkEnoughColor(bgColor);

        const result = { borderColor, bgColor };
        cache.set(rawUrl, result);

        // Cache in CDN for a day
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
        return res.status(200).json(result);
    } catch (err: any) {
        console.error('Palette extraction error:', err);
        return res.status(500).json({ error: 'Unable to process image' });
    }
}
