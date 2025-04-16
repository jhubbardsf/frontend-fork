import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { load } from 'cheerio';
import sharp from 'sharp';

const TOKEN_LIST_PATH = path.join(__dirname, '..', 'src', 'json', 'tokenList.json');
const TOKEN_IMAGE_MAP_PATH = path.join(__dirname, '..', 'src', 'json', 'tokenImageMap.json');
const FAILED_TOKENS_PATH = path.join(__dirname, '..', 'src', 'json', 'failedTokens.json');

const ORIGINALS_DIR = path.join(__dirname, '..', 'public', 'images', 'assets', 'tokens', 'originals');
const ADDRESSES_DIR = path.join(__dirname, '..', 'public', 'images', 'assets', 'tokens', 'large');

const API_URL = 'https://api.coinmarketcap.com/gravity/v4/gravity/global-search';
const BASE_COIN_URL = 'https://coinmarketcap.com/currencies';

// Ensure directories exist
[ORIGINALS_DIR, ADDRESSES_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Read token list
function getTokenList(): { address: string; name: string; symbol: string; logoURI?: string }[] {
    if (!fs.existsSync(TOKEN_LIST_PATH)) {
        console.error('Token list JSON file not found.');
        return [];
    }
    const data = JSON.parse(fs.readFileSync(TOKEN_LIST_PATH, 'utf-8'));
    return data.tokens || [];
}

// Fetch CoinMarketCap slug
async function fetchCoinSlug(tokenSymbol: string): Promise<string | null> {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword: tokenSymbol, scene: 'community', limit: 5 }),
        });
        console.log(`Fetched slug for ${tokenSymbol}`);

        if (!response.ok) return null;

        const json = await response.json();
        if (!json.data?.suggestions) return null;

        for (const suggestion of json.data.suggestions) {
            if (suggestion.type === 'token' && suggestion.tokens.length > 0) {
                for (const token of suggestion.tokens) {
                    if (token.symbol === tokenSymbol) {
                        return token.slug;
                    }
                }
            }
        }
        return null;
    } catch (error) {
        console.error(`Error fetching slug for ${tokenSymbol}:`, error);
        return null;
    }
}

// Scrape CoinMarketCap for logo URL
async function fetchCoinLogoURL(slug: string): Promise<{ url: string; ext: string } | null> {
    try {
        const response = await fetch(`${BASE_COIN_URL}/${slug}/`);
        if (!response.ok) return null;

        const html = await response.text();
        const $ = load(html);
        const imgTag = $('div[data-role="coin-logo"] img');
        const imgSrc = imgTag.attr('src');

        if (!imgSrc) return null;

        const extMatch = imgSrc.match(/\.(png|jpg|jpeg|svg|webp)$/);
        return { url: imgSrc, ext: extMatch ? extMatch[1] : 'png' };
    } catch (error) {
        console.error(`Error scraping CoinMarketCap for ${slug}:`, error);
        return null;
    }
}

// Download image
async function downloadImage(url: string, filename: string): Promise<boolean> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);

        const buffer = await response.buffer();
        fs.writeFileSync(filename, buffer);
        console.log(`Downloaded: ${filename}`);
        return true;
    } catch (error) {
        console.error(`Failed to download ${url}:`, error.message);
        return false;
    }
}

// Get most used color from an image
async function getMostUsedColor(imagePath: string): Promise<string | null> {
    try {
        const { data } = await sharp(imagePath).resize(50, 50).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

        const colorCount: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a === 0 || (r >= 245 && g >= 245 && b >= 245)) continue;

            const key = `${r},${g},${b}`;
            colorCount[key] = (colorCount[key] || 0) + 1;
        }

        if (Object.keys(colorCount).length === 0) return "#000000";

        const mostUsedColor = Object.entries(colorCount).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
        return `#${mostUsedColor.split(',').map((c) => parseInt(c).toString(16).padStart(2, '0')).join('')}`;
    } catch (error) {
        console.error(`Error processing ${imagePath}:`, error.message);
        return null;
    }
}

// Function to ensure bgColor is dark enough for white text contrast
function ensureDarkEnoughColor(hex: string, minBrightness: number = 60): string {
    if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) return '#000000'; // Fallback to black if invalid hex

    let [r, g, b] = hex
        .substring(1)
        .match(/.{2}/g)!
        .map((c) => parseInt(c, 16));

    // Calculate brightness using perceived luminance formula
    const getBrightness = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

    let brightness = getBrightness(r, g, b);

    // Darken the color iteratively until it's dark enough
    while (brightness > minBrightness) {
        r = Math.max(0, Math.floor(r * 0.8));
        g = Math.max(0, Math.floor(g * 0.8));
        b = Math.max(0, Math.floor(b * 0.8));
        brightness = getBrightness(r, g, b);
    }

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}


// Process token
async function processToken(token: { address: string; name: string; symbol: string; logoURI?: string }) {
    const key = `${token.address}-${token.symbol}`;

    const originalFileExt = token.logoURI ? path.extname(new URL(token.logoURI).pathname) : ".png";
    const originalFilename = `${key}${originalFileExt}`;
    const originalFilePath = path.join(ORIGINALS_DIR, originalFilename);

    let originalImageExists = false;
    if (token.logoURI) {
        originalImageExists = await downloadImage(token.logoURI, originalFilePath);
    }

    const slug = await fetchCoinSlug(token.symbol);
    let largeImageExists = false;
    let largeFilename = null;
    if (slug) {
        const coinLogoInfo = await fetchCoinLogoURL(slug);
        if (coinLogoInfo) {
            largeFilename = `${key}.png`;
            const largeFilePath = path.join(ADDRESSES_DIR, largeFilename);
            largeImageExists = await downloadImage(coinLogoInfo.url, largeFilePath);
        }
    }

    // Determine which image to sample for colors
    const colorSamplePath = largeImageExists ? path.join(ADDRESSES_DIR, largeFilename!) : originalFilePath;
    const borderColor = await getMostUsedColor(colorSamplePath) || "#000000";
    const bgColor = ensureDarkEnoughColor(borderColor);

    return {
        key,
        data: {
            originalImage: originalImageExists ? originalFilename : null,
            largeImage: largeImageExists ? largeFilename : null,
            borderColor,
            bgColor,
        }
    };
}

// Main function (parallel processing)
async function processTokens(batchSize = 10) {
    const tokens = getTokenList();
    if (tokens.length === 0) {
        console.error('No tokens found.');
        return;
    }

    const tokenImageMap: Record<string, { originalImage: string | null, largeImage: string | null, borderColor: string, bgColor: string }> = {};
    const failedTokens: { token: { address: string; name: string; symbol: string }; reason: string }[] = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1}/${Math.ceil(tokens.length / batchSize)}`);

        const results = await Promise.allSettled(batch.map(processToken));

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                tokenImageMap[result.value.key] = result.value.data;
            } else if (result.status === 'rejected') {
                failedTokens.push({ token: batch[results.indexOf(result)], reason: result.reason });
            }
        }
    }

    fs.writeFileSync(TOKEN_IMAGE_MAP_PATH, JSON.stringify(tokenImageMap, null, 2));
    console.log(`Token image map saved to ${TOKEN_IMAGE_MAP_PATH}`);

    if (failedTokens.length > 0) {
        fs.writeFileSync(FAILED_TOKENS_PATH, JSON.stringify(failedTokens, null, 2));
        console.log(`Saved failed tokens to ${FAILED_TOKENS_PATH}`);
    }
}

// Run script
processTokens(10);
