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

const fetchSwapRoute = async ({ queryKey }: QueryFunctionContext): Promise<SwapRouteResponse> => {
    const [, selectedInputAsset, coinbaseBtcDepositAmount, chainId] = queryKey;

    if (!selectedInputAsset || coinbaseBtcDepositAmount === '' || !chainId) {
        throw new Error('Missing required parameters for swap route');
    }

    return ky<SwapRouteResponse>('/api/swap-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        json: { inputToken: selectedInputAsset, inputAmount: coinbaseBtcDepositAmount, chainId },
    }).json();
};
