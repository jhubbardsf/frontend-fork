// useLifiPriceUpdater.ts
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/store';

interface LifiToken {
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


export function useLifiPriceUpdater(chainId = 8453) {
    const LIFI_API_URL = 'https://li.quest/v1/tokens?chains=8453&chainTypes=EVM';
    const updatePriceUSD = useStore((state) => state.updatePriceUSD);
    const validAssets = useStore.getState().validAssets;

    return useQuery<LifiResponse>({
        queryKey: ['lifiTokens', chainId],
        queryFn: async () => {
            const response = await fetch(LIFI_API_URL, {
                method: 'GET',
                headers: { accept: 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const json: LifiResponse = await response.json();
            json.tokens[chainId].forEach((token) => {
                if (validAssets[token.name] && parseFloat(token.priceUSD) > 0) {
                    console.log('Updating price for', token.name, parseFloat(token.priceUSD));
                    updatePriceUSD(token.name, parseFloat(token.priceUSD));
                }
            });

            return new Promise<LifiResponse>((resolve) => {
                resolve(json);
            });
        },
        refetchInterval: 15000, // poll every 15 seconds 
    });
}