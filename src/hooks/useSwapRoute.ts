import type { ValidAsset } from '@/types';
import { useQuery, type QueryFunctionContext } from '@tanstack/react-query';
import type { SwapRoute } from '@uniswap/smart-order-router';
import { useDebounce } from '@uidotdev/usehooks';
import ky from 'ky';

export type SwapRouteParams = [selectedInputAsset: ValidAsset, coinbaseBtcDepositAmount: string, chainId: number];

export type SwapRouteResponse = {
    swapRoute: SwapRoute;
    formattedInputAmount: string;
    formattedOutputAmount: string;
};

export const useSwapQuery = (selectedInputAsset: ValidAsset, coinbaseBtcDepositAmount: string, chainId: number) => {
    return useQuery<SwapRouteResponse, Error>({
        queryKey: ['swapRoute', selectedInputAsset, coinbaseBtcDepositAmount, chainId],
        queryFn: fetchSwapRoute,
        enabled: !!(selectedInputAsset && coinbaseBtcDepositAmount !== '' && chainId),
    });
};

const fetchSwapRoute = async ({ queryKey }): Promise<SwapRouteResponse> => {
    const [, selectedInputAsset, coinbaseBtcDepositAmount, chainId] = queryKey;
    console.log('Bun fetchSwapRoute', { selectedInputAsset, coinbaseBtcDepositAmount, chainId, queryKey });

    if (!selectedInputAsset || coinbaseBtcDepositAmount === '' || !chainId) {
        throw new Error('Missing required parameters for swap route');
    }

    return ky<SwapRouteResponse>('/api/swap-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        json: { inputToken: selectedInputAsset, inputAmount: coinbaseBtcDepositAmount, chainId },
    }).json();
    // const response = await fetch(`/api/swap-route`, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ inputToken: selectedInputAsset, inputAmount: coinbaseBtcDepositAmount, chainId }),
    // });

    // if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    // return response.json();
};
