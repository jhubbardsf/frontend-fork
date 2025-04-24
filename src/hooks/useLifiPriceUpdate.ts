// useLifiPriceUpdater.ts
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/store';
import type { ValidAsset } from '@/types';

export interface LifiToken {
    chainId: number;
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    priceUSD: string;
    coinKey: string;
    logoURI: string;
}

interface LifiResponse {
    tokens: {
        [chainId: string]: LifiToken[];
    };
}

/**
 * @deprecated Use fetchAndUpdateValidAssetPrice instead
 * Fetches the price for a token by its address and updates it in the store
 * @param chainId The chain ID where the token exists
 * @param tokenAddress The token's contract address
 * @returns A promise that resolves to a boolean indicating success or failure
 */
export const fetchAndUpdatePriceByAddress = async (chainId: number, tokenAddress: string): Promise<boolean> => {
    try {
        const price = await fetchTokenPrice(chainId, tokenAddress);

        if (price !== null) {
            const store = useStore.getState();
            // Find the asset by address and chain ID
            const asset = store.findAssetByAddress(tokenAddress, chainId);

            if (asset) {
                store.updatePriceForAsset(asset, price);
            } else {
                // Fallback to old method if asset not found
                store.updatePriceUSDByAddress(tokenAddress, price);
            }
            return true;
        }

        return false;
    } catch (error) {
        return false;
    }
};

/**
 * Fetches the price for a ValidAsset and updates it in the store
 * @param asset The ValidAsset to update the price for
 * @returns A promise that resolves to a boolean indicating success or failure
 */
export const fetchAndUpdateValidAssetPrice = async (asset: ValidAsset): Promise<boolean> => {
    try {
        const chainId = asset.contractChainID || asset.chainId;
        const tokenAddress = asset.tokenAddress || asset.address;

        if (!chainId || !tokenAddress) {
            return false;
        }

        const price = await fetchTokenPrice(chainId, tokenAddress);

        if (price !== null) {
            const store = useStore.getState();
            store.updatePriceForAsset(asset, price);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error updating ValidAsset price:', error);
        return false;
    }
};

// Function to fetch a single token price
export const fetchTokenPrice = async (chainId: number, tokenAddress: string): Promise<number | null> => {
    try {
        const url = `https://li.quest/v1/token?chain=${chainId}&token=${tokenAddress}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const json = await response.json();
        return json.priceUSD ? parseFloat(json.priceUSD) : null;
    } catch (e) {
        console.error('Error fetching price:', e);
        return null;
    }
};

/**
 * @deprecated Use fetchTokenPrice or fetchAndUpdateValidAssetPrice instead
 * This hook is deprecated and will be removed in a future version.
 */
export function useLifiPriceUpdater(chainId = 8453) {
    const LIFI_API_URL = `https://li.quest/v1/tokens?chains=${chainId}&chainTypes=EVM`;
    const validAssets = useStore((state) => state.validAssets);
    const findAssetByName = useStore((state) => state.findAssetByName);
    const updatePriceForAsset = useStore((state) => state.updatePriceForAsset);

    return useQuery({
        queryKey: ['lifiTokens', chainId],
        queryFn: async () => {
            const response = await fetch(LIFI_API_URL, {
                method: 'GET',
                headers: { accept: 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const json = (await response.json()) as LifiResponse;
            json.tokens[chainId]?.forEach((token) => {
                const asset = findAssetByName(token.name, chainId);
                if (asset && parseFloat(token.priceUSD) > 0) {
                    updatePriceForAsset(asset, parseFloat(token.priceUSD));
                }
            });

            return json;
        },
        refetchInterval: 15000, // poll every 15 seconds
    });
}
