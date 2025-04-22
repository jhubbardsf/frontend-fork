// useLifiPriceUpdater.ts
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/store';

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

export function useLifiPriceUpdater(chainId = 8453) {
    const LIFI_API_URL = `https://li.quest/v1/tokens?chains=${chainId}&chainTypes=EVM`;
    const updatePriceUSD = useStore((state) => state.updatePriceUSD);
    const validAssets = useStore.getState().validAssets;

    return useQuery<LifiResponse>({
        queryKey: ['lifiTokens', chainId],
        queryFn: async () => {
            const response = await fetch(LIFI_API_URL, {
                method: 'GET',
                headers: { accept: 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const json: LifiResponse = await response.json();
            json.tokens[chainId]?.forEach((token) => {
                if (validAssets[token.name] && parseFloat(token.priceUSD) > 0) {
                    console.log('Updating price for', token.name, parseFloat(token.priceUSD));
                    updatePriceUSD(token.name, parseFloat(token.priceUSD));
                }
            });

            return json;
        },
        refetchInterval: 15000, // poll every 15 seconds
    });
}
