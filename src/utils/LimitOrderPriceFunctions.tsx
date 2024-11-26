import { ValidAsset } from '../types';
import { useStore } from '../store';
import { btcToSats } from './dappHelper';
import { BigNumber } from 'ethers';

// --------------- TYPES ---------------
export type BtcLimitOrder = {
    // market maker offering BTC
    btcAddress: string;
    // id?: string; // TODO - add id based on server?
    gainPercentage: number; // desired gain percentage (e.g., 0.01 for 1%)
    totalSatsAvailable: number; // amount of the asset available in the order in smallest token unit
};

export type UsdcLimitOrder = {
    // market maker offering USDC
    usdcAddress: string;
    // id?: string; // TODO - add id based on server?
    gainPercentage: number; // desired gain percentage (e.g., 0.01 for 1%)
    totalMicroUSDCAvailable: number; // amount of the asset available in the order in smallest token unit
};

export type Swap = {
    limitOrder: BtcLimitOrder | UsdcLimitOrder;
    inputAmount: number;
    outputAmount: number;
};

export type OptimalSwapsResult = {
    swaps: Swap[];
    inputAsset: ValidAsset;
    outputAsset: ValidAsset;
    totalInputAmount: number;
    totalOutputAmount: number;
};

// --------------- CONSTANTS ---------------
const FixedBtcFee = 0.00005; // TODO - update with proxy wallet real fee
const btcPriceUSDC = 95137.19; // TODO - update with real price

// --------------- FUNCTIONS ---------------
// [0] calculate Bitcoin amount out based on USDC input and gain percentage
export const calculateBTCAmountOut = (SwapAmountUSDC: number, GainPercentage: number): number => {
    const adjustedRate = btcPriceUSDC * (1 + GainPercentage);
    const btcOut = SwapAmountUSDC / adjustedRate;
    return btcOut;
};

// [1] find optimal swaps given a USDC input amount and a list of limit orders
export const findOptimalSwapsUsdcInput = (usdcAmount: number, limitOrders: BtcLimitOrder[]): OptimalSwapsResult => {
    // [0] sort limit orders by lowest gain percentage (highest bitcoin output)
    const sortedOrders = [...limitOrders].sort((a, b) => a.gainPercentage - b.gainPercentage);

    // [1] initialize variables
    let remainingUSDC = usdcAmount;
    const swaps: Swap[] = [];
    let totalBTCOut = 0;
    let totalUSDCInput = 0;

    // [2] iterate through sorted limit orders and calculate bitcoin output for each order
    for (const order of sortedOrders) {
        // [0] break if no more USDC to swap
        if (remainingUSDC <= 0) break;

        // [1] calculate max USDC that can be used for the current order
        const maxUSDCForOrder = order.totalSatsAvailable * btcPriceUSDC;
        const usdcToSwap = Math.min(remainingUSDC, maxUSDCForOrder);

        // [2] calculate bitcoin output for the current order
        if (usdcToSwap > 0) {
            const btcOut = calculateBTCAmountOut(usdcToSwap, order.gainPercentage);

            swaps.push({
                limitOrder: order,
                inputAmount: usdcToSwap,
                outputAmount: btcOut,
            });

            totalBTCOut += btcOut;
            totalUSDCInput += usdcToSwap;
            remainingUSDC -= usdcToSwap;
        }
    }

    // [2] return swaps and total amounts
    return {
        swaps,
        inputAsset: useStore.getState().validAssets.BASE_USDC,
        outputAsset: useStore.getState().validAssets.BTC,
        totalInputAmount: totalUSDCInput,
        totalOutputAmount: totalBTCOut,
    };
};

// --------------- TEST DATA ---------------
export const btcLimitOrders: BtcLimitOrder[] = [
    { btcAddress: '0x6969', gainPercentage: 0, totalSatsAvailable: 1 }, // 0%
    { btcAddress: '0x1234', gainPercentage: 0.01, totalSatsAvailable: 0.5 }, // 1%
    { btcAddress: '0x5678', gainPercentage: 0.02, totalSatsAvailable: 1.0 }, // 2%
    { btcAddress: '0x9abc', gainPercentage: 0.015, totalSatsAvailable: 0.3 }, // 1.5%
];

export const usdcLimitOrders: UsdcLimitOrder[] = [
    { usdcAddress: '0x6969', gainPercentage: 0, totalMicroUSDCAvailable: 1 }, // 0%
    { usdcAddress: '0x1234', gainPercentage: 0.01, totalMicroUSDCAvailable: 0.5 }, // 1%
    { usdcAddress: '0x5678', gainPercentage: 0.02, totalMicroUSDCAvailable: 1.0 }, // 2%
    { usdcAddress: '0x9abc', gainPercentage: 0.015, totalMicroUSDCAvailable: 0.3 }, // 1.5%
];
