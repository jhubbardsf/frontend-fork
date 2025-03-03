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

export const useSwapQuery = (
    selectedInputAsset: Partial<ValidAsset>,
    coinbaseBtcDepositAmount: string,
    chainId: number,
) => {
    const inputAssetKey = {
        chainId: selectedInputAsset.chainId,
        decimals: selectedInputAsset.decimals,
        symbol: selectedInputAsset.symbol,
        name: selectedInputAsset.name,
        address: selectedInputAsset.address,
    };

    return useQuery<SwapRouteResponse, Error>({
        queryKey: [
            'swapRoute',
            JSON.stringify({
                inputAssetKey,
                coinbaseBtcDepositAmount,
                chainId,
            }),
        ],
        queryFn: fetchSwapRoute,
        enabled: !!(selectedInputAsset && coinbaseBtcDepositAmount !== '' && chainId),
    });
};

const fetchSwapRoute = async ({ queryKey }): Promise<SwapRouteResponse> => {
    const [, key] = queryKey;
    console.log('Bun++ fetchSwapRoute', { key });
    const { inputAssetKey: selectedInputAsset, coinbaseBtcDepositAmount, chainId } = JSON.parse(key);

    if (!selectedInputAsset || coinbaseBtcDepositAmount === '' || !chainId) {
        throw new Error('Missing required parameters for swap route');
    }

    return ky<SwapRouteResponse>('/api/swap-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        json: { inputToken: selectedInputAsset, inputAmount: coinbaseBtcDepositAmount, chainId },
    }).json();
};
