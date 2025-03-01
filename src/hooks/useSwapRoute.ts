import type { ValidAsset } from "@/types";
import { useQuery, type QueryFunctionContext } from "@tanstack/react-query";
import type { SwapRoute } from "@uniswap/smart-order-router";

export type SwapRouteParams = [
    selectedInputAsset: ValidAsset,
    coinbaseBtcDepositAmount: string,
    chainId: number,
];

export type SwapRouteResponse = {
    route: SwapRoute;
};

export const useSwapRoute = (
    selectedInputAsset: ValidAsset,
    coinbaseBtcDepositAmount: string,
    chainId: number
) => {
    return useQuery<SwapRouteResponse, Error>({
        queryKey: ["swapRoute", selectedInputAsset, coinbaseBtcDepositAmount, chainId],
        queryFn: fetchSwapRoute,
        enabled: () => {
            console.log("Bun ENABLED", !!(selectedInputAsset && coinbaseBtcDepositAmount !== "" && chainId));
            return !!(selectedInputAsset && coinbaseBtcDepositAmount !== "" && chainId)
        },
    });
};

const fetchSwapRoute = async ({ queryKey }): Promise<SwapRouteResponse> => {
    const [, selectedInputAsset, coinbaseBtcDepositAmount, chainId] = queryKey;
    console.log("Bun ", { selectedInputAsset, coinbaseBtcDepositAmount, chainId, queryKey });

    if (!selectedInputAsset || coinbaseBtcDepositAmount === "" || !chainId) {
        throw new Error("Missing required parameters for swap route");
    }

    console.log("Bun FETCHING SWAP ROUTE");
    const response = await fetch(`/api/swap-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputToken: selectedInputAsset, inputAmount: coinbaseBtcDepositAmount, chainId }),
    });

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    return response.json();
};
