import { Redis } from '@upstash/redis';
import { WalletScreeningResult } from '../../types';
const redis = Redis.fromEnv();

// Cache TTL in seconds (1 week)
const CACHE_TTL = 60 * 60 * 24 * 7;

/**
 * Retrieves wallet screening data from Redis cache if available
 * @param address Wallet address to check
 * @param chain Blockchain network (e.g., 'ethereum')
 * @returns Cached wallet screening result or null if not found
 */
export async function getWalletScreeningFromCache(address: string, chain: string): Promise<WalletScreeningResult | null> {
    try {
        const cacheKey = `wallet-screen:${chain}:${address}`;
        const cachedData = await redis.get<WalletScreeningResult>(cacheKey);
        return cachedData || null;
    } catch (error) {
        console.error('Redis cache retrieval error:', error);
        return null; // Return null on cache error to allow fallback to API
    }
}

/**
 * Stores wallet screening data in Redis cache
 * @param address Wallet address
 * @param chain Blockchain network
 * @param data Wallet screening result to cache
 * @returns Boolean indicating if caching was successful
 */
export async function setWalletScreeningCache(address: string, chain: string, data: WalletScreeningResult): Promise<boolean> {
    try {
        const cacheKey = `wallet-screen:${chain}:${address}`;
        await redis.set(cacheKey, data, { ex: CACHE_TTL });
        return true;
    } catch (error) {
        console.error('Redis cache storage error:', error);
        return false; // Cache failure shouldn't affect the main flow
    }
}
