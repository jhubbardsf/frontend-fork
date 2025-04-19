import type { TokenMeta } from '@/types';

// Mapping of common networks to their Coingecko platform identifiers.
const networkMapping: Record<string, string> = {
    ethereum: 'ethereum',
    bsc: 'binance-smart-chain',
    polygon: 'polygon-pos',
    base: 'base', // Adjust if Coingecko uses a different identifier for Base network.
    arbitrum: 'arbitrum-one', // Commonly used identifier for Arbitrum.
};

/**
 * Retrieves the USD price for a given ERC20 token contract.
 *
 * @param tokenAddress - The ERC20 token contract address.
 * @param network - The network name (default is "ethereum").
 * @returns A promise that resolves to the token's USD price.
 */
export async function getTokenPrice(symbol: string): Promise<number> {
    // Build the Coingecko API URL.
    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${symbol}`;
    // Fetch the price data from Coingecko.
    const response = await fetch(url, {
        headers: {
            'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY,
            Accept: '*/*',
        },
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(`Error fetching price: ${response.statusText}`);
    }

    const { data } = await response.json();

    // The API returns an object where keys are lowercased contract addresses.
    const priceData = data[symbol.toUpperCase()][0].quote.USD.price; //.quote.USD.price;

    // return priceData;
    if (!priceData || typeof priceData !== 'number') {
        throw new Error('Token price not found in the API response');
    }

    return priceData;
}
