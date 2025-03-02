import type { TokenMeta } from '@/types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Older script, needs to be removed and merged with update_tokens.ts

// Define paths
const TOKEN_LIST_URL = 'https://tokens.uniswap.org/';
const IMAGE_OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'assets', 'tokens', 'originals');
const JSON_OUTPUT_PATH = path.join(__dirname, '..', 'src', 'json', 'tokenList.json');
const TOKEN_IMAGE_MAP_PATH = path.join(__dirname, '..', 'src', 'json', 'tokenImageMap.json');

// Function to download an image
async function downloadImage(url: string, filename: string) {
    if (url.includes('ipfs://')) {
        url = `https://ipfs.io/ipfs/${url.slice(7)}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filename, buffer);
        console.log(`Downloaded: ${filename}`);
    } catch (error) {
        console.error(`Failed to download ${url}:`, error.message);
    }
}

// Function to darken a color by reducing RGB values
function darkenColor(hex: string, factor: number = 0.8): string {
    if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) return '#000000'; // Fallback to black if invalid hex

    let [r, g, b] = hex
        .substring(1)
        .match(/.{2}/g)!
        .map((c) => Math.max(0, Math.min(255, Math.floor(parseInt(c, 16) * factor))));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Function to calculate brightness
function getBrightness(hex: string): number {
    const [r, g, b] = hex
        .substring(1)
        .match(/.{2}/g)!
        .map((c) => parseInt(c, 16));

    // Standard brightness formula (perceived luminance)
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Function to ensure bgColor is dark enough for white text
function ensureDarkEnoughColor(hex: string, minBrightness: number = 60): string {
    let darkenedColor = darkenColor(hex, 0.8);
    let brightness = getBrightness(darkenedColor);

    while (brightness > minBrightness) {
        darkenedColor = darkenColor(darkenedColor, 0.8);
        brightness = getBrightness(darkenedColor);
    }

    return darkenedColor;
}

// Function to check if a color is close to white
function isWhite(r: number, g: number, b: number, threshold: number = 245): boolean {
    return r >= threshold && g >= threshold && b >= threshold;
}

// Function to get the most used color in an image, ignoring white backgrounds
async function getMostUsedColor(imagePath: string): Promise<string | null> {
    try {
        const { data } = await sharp(imagePath)
            .resize(50, 50) // Reduce resolution for faster processing
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const colorCount: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a === 0 || isWhite(r, g, b)) continue; // Ignore transparent and white pixels

            const key = `${r},${g},${b}`;
            colorCount[key] = (colorCount[key] || 0) + 1;
        }

        if (Object.keys(colorCount).length === 0) {
            console.warn(`Warning: No valid colors found for ${imagePath}, defaulting to black.`);
            return "#000000"; // Default if no valid colors
        }

        const mostUsedColor = Object.entries(colorCount).reduce((a, b) =>
            b[1] > a[1] ? b : a
        )[0];

        return `#${mostUsedColor
            .split(',')
            .map((c) => parseInt(c).toString(16).padStart(2, '0'))
            .join('')}`;
    } catch (error) {
        console.error(`Error processing ${imagePath}:`, error.message);
        return null;
    }
}

// Main function
async function fetchTokenData() {
    try {
        const response = await fetch(TOKEN_LIST_URL);
        if (!response.ok) throw new Error('Failed to fetch token list');
        const tokenList = await response.json();

        if (!tokenList.tokens || !Array.isArray(tokenList.tokens)) {
            throw new Error('Invalid token list format');
        }

        // Ensure output directories exist
        if (!fs.existsSync(IMAGE_OUTPUT_DIR)) {
            fs.mkdirSync(IMAGE_OUTPUT_DIR, { recursive: true });
        }
        if (!fs.existsSync(path.dirname(JSON_OUTPUT_PATH))) {
            fs.mkdirSync(path.dirname(JSON_OUTPUT_PATH), { recursive: true });
        }

        // Save token list JSON
        fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify(tokenList, null, 2));
        console.log(`Token list saved to ${JSON_OUTPUT_PATH}`);

        const uniqueTokens = new Map<string, string>();
        const tokenImageMap: Record<string, { borderColor: string; bgColor: string; image: string }> = {};

        // Store only one icon per symbol
        tokenList.tokens.forEach((token: TokenMeta) => {
            if (token.symbol && token.logoURI && !uniqueTokens.has(token.symbol)) {
                uniqueTokens.set(token.symbol, token.logoURI);
            }
        });

        // Download each unique token icon and analyze colors
        const entries = Array.from(uniqueTokens.entries());
        for (const [symbol, logoURI] of entries) {
            const fileExtension = path.extname(new URL(logoURI).pathname) || '.png';
            const filename = `${symbol}${fileExtension}`;
            const filePath = path.join(IMAGE_OUTPUT_DIR, filename);
            await downloadImage(logoURI, filePath);

            // Extract the most used color, ignoring white
            const borderColor = await getMostUsedColor(filePath) || '#000000'; // Default to black if extraction fails
            const bgColor = ensureDarkEnoughColor(borderColor, 60); // Ensures bgColor is dark

            tokenImageMap[symbol] = {
                image: filename,
                borderColor,
                bgColor,
            };
        }

        // Save the token image map JSON
        fs.writeFileSync(TOKEN_IMAGE_MAP_PATH, JSON.stringify(tokenImageMap, null, 2));
        console.log(`Token image map saved to ${TOKEN_IMAGE_MAP_PATH}`);
    } catch (error) {
        console.error('Error fetching token list:', error.message);
    }
}

// Run script
fetchTokenData();
