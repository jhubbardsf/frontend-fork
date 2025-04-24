import { NextApiRequest, NextApiResponse } from 'next';
import { getAverageColor } from 'fast-average-color-node';
// Use require for node-fetch v2
import fetch from 'node-fetch';

// Simple in-memory cache
const colorCache: Record<string, { borderColor: string; bgColor: string }> = {};

// Function to ensure bgColor is dark enough for white text contrast
function ensureDarkEnoughColor(hex: string, minBrightness: number = 60): string {
    if (!hex || !/^#([0-9A-Fa-f]{6})$/.test(hex)) return '#000000';

    // Extract RGB values
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Calculate brightness using perceived luminance formula
    const getBrightness = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
    let brightness = getBrightness(r, g, b);

    // If color is already dark enough, return it
    if (brightness <= minBrightness) return hex;

    // Calculate how much to darken
    const darkenFactor = minBrightness / brightness;

    // Apply darkening
    const newR = Math.max(0, Math.floor(r * darkenFactor));
    const newG = Math.max(0, Math.floor(g * darkenFactor));
    const newB = Math.max(0, Math.floor(b * darkenFactor));

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get image URL from query
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'Image URL is required' });
        }

        // Check cache first
        if (colorCache[url]) {
            return res.status(200).json(colorCache[url]);
        }

        // Fetch the image
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(response.status).json({
                error: `Failed to fetch image: ${response.statusText}`,
            });
        }

        // Get the image as a buffer for node-fetch v2
        const imageBuffer = await response.buffer();

        // Calculate color
        const result = await getAverageColor(imageBuffer, {
            algorithm: 'dominant',
            ignoredColor: [[255, 255, 255, 255, 30]], // Ignore white with threshold
        });

        // Extract colors and ensure dark enough background
        const borderColor = result.hex;
        const bgColor = ensureDarkEnoughColor(borderColor);

        // Create response
        const colorData = { borderColor, bgColor };

        // Cache the result
        colorCache[url] = colorData;

        // Return the colors
        return res.status(200).json(colorData);
    } catch (error) {
        console.error('Error processing image:', error);
        return res.status(500).json({
            error: 'Error processing image',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
