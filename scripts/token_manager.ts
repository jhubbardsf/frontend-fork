import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define paths
const TOKEN_LIST_URL = 'https://tokens.uniswap.org/';
const TEMP_DIR = path.join(__dirname, '..', 'temp_images');
const COMBINED_JSON_PATH = path.join(__dirname, '..', 'src', 'json', 'tokenData.json');

// Optimization settings
const MAX_CONCURRENT_OPERATIONS = 20; // Control parallelism
const IMAGE_RESIZE_SIZE = 64; // Larger size for better color representation
const CHUNK_SIZE = 20; // Process more tokens in parallel

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// A simple semaphore for limiting concurrent operations
class Semaphore {
    private max: number;
    private count: number;
    private waiting: Array<() => void>;

    constructor(max: number) {
        this.max = max;
        this.count = 0;
        this.waiting = [];
    }

    acquire(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.count < this.max) {
                this.count++;
                resolve();
            } else {
                this.waiting.push(resolve);
            }
        });
    }

    release(): void {
        this.count--;
        if (this.waiting.length > 0) {
            this.count++;
            const next = this.waiting.shift();
            next?.();
        }
    }
}

// Create semaphore instance
const semaphore = new Semaphore(MAX_CONCURRENT_OPERATIONS);

// Generate cache key for a token
function generateCacheKey(token) {
    if (!token.logoURI) return null;

    // Create a hash of the token data to use as a cache key
    const hash = crypto.createHash('md5');
    hash.update(`${token.address}-${token.symbol}-${token.logoURI}`);
    return hash.digest('hex');
}

// Function to download an image directly to buffer (no temporary file)
async function downloadImageToBuffer(url: string): Promise<Buffer | null> {
    if (!url) return null;

    if (url.includes('ipfs://')) {
        url = `https://ipfs.io/ipfs/${url.slice(7)}`;
    }

    try {
        await semaphore.acquire();

        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // Shorter timeout

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Failed to fetch ${url}`);

        // Convert directly to buffer
        return Buffer.from(await response.arrayBuffer());
    } catch (error) {
        console.error(`Failed to download ${url}:`, error.message);
        return null;
    } finally {
        semaphore.release();
    }
}

// Get most used color from an image buffer
async function getMostUsedColorFromBuffer(imageBuffer: Buffer): Promise<string | null> {
    if (!imageBuffer || imageBuffer.length === 0) {
        return '#000000'; // Default to black
    }

    try {
        // Process the image
        const { data, info } = await sharp(imageBuffer)
            .resize(IMAGE_RESIZE_SIZE, IMAGE_RESIZE_SIZE) // Resize for processing
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        if (!data || data.length === 0) {
            return '#000000';
        }

        // Process all pixels for better color analysis
        const colorCount: Record<string, number> = {};
        const saturationWeights: Record<string, number> = {}; // Track saturation for each color

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i],
                g = data[i + 1],
                b = data[i + 2],
                a = data[i + 3];

            // Skip transparent or near-white pixels
            if (a < 128 || (r >= 240 && g >= 240 && b >= 240)) continue;

            // Calculate color saturation and brightness
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            const saturation = max === 0 ? 0 : delta / max;
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

            // Give more weight to more saturated colors (tends to pick more vibrant colors)
            const weight = saturation * 2 + brightness;

            const key = `${r},${g},${b}`;
            colorCount[key] = (colorCount[key] || 0) + 1;
            saturationWeights[key] = (saturationWeights[key] || 0) + weight;
        }

        if (Object.keys(colorCount).length === 0) {
            return '#000000';
        }

        // Find colors that appear frequently and have good saturation
        const weightedColors = Object.keys(colorCount).map((key) => {
            const count = colorCount[key];
            const weight = saturationWeights[key];
            return { key, count, weight };
        });

        // Sort by a combination of frequency and saturation
        weightedColors.sort((a, b) => {
            // Use a weighted score of count and saturation
            const scoreA = a.count * (a.weight / a.count);
            const scoreB = b.count * (b.weight / b.count);
            return scoreB - scoreA;
        });

        // Take the top color
        const topColor = weightedColors[0].key;

        return `#${topColor
            .split(',')
            .map((c) => parseInt(c).toString(16).padStart(2, '0'))
            .join('')}`;
    } catch (error) {
        console.error(`Error processing image buffer:`, error.message);
        return '#000000';
    }
}

// Function to ensure bgColor is dark enough for white text contrast
function ensureDarkEnoughColor(hex: string, minBrightness: number = 60): string {
    if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) return '#000000';

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

// Process a single token
async function processToken(token, cache) {
    if (!token.logoURI) return null;

    // Generate cache key
    const cacheKey = generateCacheKey(token);

    // If we have a cached result, use it
    if (cacheKey && cache[cacheKey]) {
        return {
            token,
            style: cache[cacheKey],
            fromCache: true,
        };
    }

    // Download image to buffer
    const imageBuffer = await downloadImageToBuffer(token.logoURI);
    if (!imageBuffer) return null;

    try {
        // Extract colors
        const borderColor = (await getMostUsedColorFromBuffer(imageBuffer)) || '#000000';
        const bgColor = ensureDarkEnoughColor(borderColor);

        // Create style info
        const style = {
            borderColor,
            bgColor,
        };

        // Cache the result for this session only
        if (cacheKey) {
            cache[cacheKey] = style;
        }

        return {
            token,
            style,
            fromCache: false,
        };
    } catch (error) {
        console.error(`Error processing token ${token.symbol}:`, error);
        return null;
    }
}

// Process tokens in batches with controlled parallelism
async function processTokenBatch(tokens, cache) {
    const results = [];

    // Process tokens in chunks with controlled concurrency
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
        const chunk = tokens.slice(i, i + CHUNK_SIZE);

        // Process chunk in parallel
        const chunkPromises = chunk.map((token) => processToken(token, cache));
        const chunkResults = await Promise.all(chunkPromises);

        // Add valid results
        for (const result of chunkResults) {
            if (result) {
                results.push(result);
            }
        }
    }

    return results;
}

// Main function
async function fetchAndProcessTokens() {
    console.time('Total Processing Time');

    try {
        // Create a new in-memory cache for this run only
        const sessionCache = {};

        console.log('Fetching token list from Uniswap...');
        const response = await fetch(TOKEN_LIST_URL);
        if (!response.ok) throw new Error('Failed to fetch token list');
        const tokenList = await response.json();

        if (!tokenList.tokens || !Array.isArray(tokenList.tokens)) {
            throw new Error('Invalid token list format');
        }

        // Process all tokens
        const enhancedTokens = [...tokenList.tokens];
        const tokenStyleMap = {};

        console.log(`Processing ${enhancedTokens.length} tokens with optimized parallel processing...`);

        let processedCount = 0;
        let cacheHits = 0;

        // Process in larger batches
        const batchSize = 100;
        for (let i = 0; i < enhancedTokens.length; i += batchSize) {
            const batch = enhancedTokens.slice(i, i + batchSize);
            console.log(
                `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(enhancedTokens.length / batchSize)}`,
            );

            // Process this batch
            const batchResults = await processTokenBatch(batch, sessionCache);

            // Update tokens and style map
            for (const result of batchResults) {
                const { token, style, fromCache } = result;
                const index = enhancedTokens.findIndex((t) => t.address === token.address && t.symbol === token.symbol);

                if (index !== -1) {
                    enhancedTokens[index] = {
                        ...token,
                        style,
                    };

                    // Create keys for the style map
                    const mainKey = `${token.address}-${token.symbol}`;
                    tokenStyleMap[mainKey] = style;
                    tokenStyleMap[token.symbol] = style;

                    processedCount++;
                    if (fromCache) cacheHits++;
                }
            }
        }

        console.log(`Processed ${processedCount} tokens (${cacheHits} from in-memory cache during this run)`);

        // Create combined data
        const combinedData = {
            ...tokenList,
            tokens: enhancedTokens,
            styleMap: tokenStyleMap,
        };

        // Save combined JSON file
        fs.writeFileSync(COMBINED_JSON_PATH, JSON.stringify(combinedData, null, 2));
        console.log(`Combined token data saved to ${COMBINED_JSON_PATH}`);

        // Clean up temp directory
        try {
            if (fs.existsSync(TEMP_DIR)) {
                fs.rmSync(TEMP_DIR, { recursive: true, force: true });
                console.log('Cleaned up temporary files');
            }
        } catch (error) {
            console.log('Note: Could not clean up temporary directory', error);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }

    console.timeEnd('Total Processing Time');
}

// Run the script
fetchAndProcessTokens();
