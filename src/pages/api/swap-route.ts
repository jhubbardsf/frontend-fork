import type { NextApiRequest, NextApiResponse } from 'next';
import { type SwapRoute, type SwapOptions, AlphaRouter, SwapType } from '@uniswap/smart-order-router';
import { CurrencyAmount, TradeType, Percent, Token as UniToken } from '@uniswap/sdk-core';
import { ethers } from 'ethers';
import { DEVNET_BASE_BUNDLER_ADDRESS } from '@/utils/constants';

const cbBTC = {
    chainId: 8453,
    address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    decimals: 8,
    symbol: 'cbBTC',
    name: 'cbBTC',
};
const CHAIN_ID = 8453;

type ValidResponse =
    | { swapRoute: SwapRoute; formattedInputAmount: string; formattedOutputAmount: string }
    | { error: string };
export default async function handler(req: NextApiRequest, res: NextApiResponse<ValidResponse>) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const { inputToken, inputAmount } = req.body;
        console.log('API 0: ', { inputToken, inputAmount });
        console.log('API 0.1');
        if (!inputToken || !inputAmount) {
            throw new Error('Missing inputToken or inputAmount');
        }

        const rpcUrl = process.env.BASE_RPC_URL;

        console.log('API 1');
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        console.log('API 1.1');
        const router = new AlphaRouter({ chainId: CHAIN_ID, provider });
        console.log('API 1.2', { inputToken });
        const inputUniToken = new UniToken(
            inputToken.chainId,
            inputToken.address,
            inputToken.decimals,
            inputToken.symbol,
            inputToken.name,
        );
        console.log('API 1.3');
        const outputUniToken = new UniToken(cbBTC.chainId, cbBTC.address, cbBTC.decimals, cbBTC.symbol, cbBTC.name);

        console.log('API 2');
        const parsedAmount = ethers.utils.parseUnits(inputAmount, inputToken.decimals);
        const currencyAmountIn = CurrencyAmount.fromRawAmount(inputUniToken, parsedAmount.toString());
        console.log('API 3');
        const swapConfig: SwapOptions = {
            recipient: DEVNET_BASE_BUNDLER_ADDRESS,
            slippageTolerance: new Percent(100, 10000), // 1.0% slippage
            deadline: Math.floor(Date.now() / 1000 + 1800), // Math.floor(Date.now() / 1000 + 1800),
            type: Number(SwapType.SWAP_ROUTER_02),
        };
        console.log('API 4');
        const route = await router.route(currencyAmountIn, outputUniToken, TradeType.EXACT_INPUT, swapConfig, {
            blockNumber: 27091905,
        });
        if (!route || !route.trade) {
            return res.status(500).json({ error: 'No route found' });
        }
        console.log('API 5');
        // Convert the amounts from the fixed‑point representation to human‑readable values.
        const formattedInputAmount = route.trade.inputAmount.toSignificant(6);
        const formattedOutputAmount = route.trade.outputAmount.toSignificant(6);

        return res.status(200).json({ swapRoute: route, formattedInputAmount, formattedOutputAmount });
    } catch (error: unknown) {
        return res.status(500).json({ error: 'An unknown error occurred' });
    }
}
