import type { NextApiRequest, NextApiResponse } from 'next'
import { AlphaRouter, SwapType } from '@uniswap/smart-order-router'
import {
    CurrencyAmount,
    TradeType,
    Percent,
    Token as UniToken
} from '@uniswap/sdk-core'
import { ethers } from 'ethers'
import { getTokenPrice } from '@/utils/getTokenPrice'

const cbBTC = {
    chainId: 8453,
    address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    decimals: 8,
    symbol: 'cbBTC',
    name: 'cbBTC'
}
const CHAIN_ID = 8453

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    console.log("Inside GetPrices");
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST'])
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
    }
    console.log("Inside GetPrices1");
    try {
        const { tokenSymbol } = req.body
        if (!tokenSymbol) {
            throw new Error('Missing tokenSymbol')
        }
        console.log("Inside GetPrices2", tokenSymbol);
        const price = await getTokenPrice(tokenSymbol);
        console.log("Inside GetPrices3");
        return res.status(200).json({ price })
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(501).json({ error: error.message });
        }
        return res.status(501).json({ error: 'An unknown error occurred' });
    }
}
