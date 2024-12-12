import { ethers } from 'ethers';
import { useStore } from '../store';
import { MAINNET_ETH_RPC_URL } from './constants';

const wbtcAddress = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
const chainLinkUsdtPriceOracleAddress = '0x3e7d1eab13ad0104d2750b8863b489d65364e32d';
const uniswapV3PoolAddress = '0x9db9e0e53058c89e5b94e29621a205198648425b';
const chainLinkUsdtPriceOracleAddressABI = [
    {
        inputs: [],
        name: 'latestAnswer',
        outputs: [
            {
                internalType: 'int256',
                name: '',
                type: 'int256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
];

const wbtcUsdtPool = '0x9Db9e0e53058C89e5B94e29621a205198648425B';
const univ3ABI = [
    {
        inputs: [],
        name: 'slot0',
        outputs: [
            {
                internalType: 'uint160',
                name: 'sqrtPriceX96',
                type: 'uint160',
            },
            {
                internalType: 'int24',
                name: 'tick',
                type: 'int24',
            },
            {
                internalType: 'uint16',
                name: 'observationIndex',
                type: 'uint16',
            },
            {
                internalType: 'uint16',
                name: 'observationCardinality',
                type: 'uint16',
            },
            {
                internalType: 'uint16',
                name: 'observationCardinalityNext',
                type: 'uint16',
            },
            {
                internalType: 'uint8',
                name: 'feeProtocol',
                type: 'uint8',
            },
            {
                internalType: 'bool',
                name: 'unlocked',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
];

let dataProviderCache = undefined;

export async function getPricesDataProvider() {
    if (dataProviderCache) {
        return dataProviderCache;
    }

    const mainnetChainId = 1;
    const staticMainnetProvider = new ethers.providers.StaticJsonRpcProvider(MAINNET_ETH_RPC_URL, { chainId: mainnetChainId, name: 'mainnet' });

    const contract = new ethers.Contract(chainLinkUsdtPriceOracleAddress, chainLinkUsdtPriceOracleAddressABI, staticMainnetProvider);

    const poolContract = new ethers.Contract(wbtcUsdtPool, univ3ABI, staticMainnetProvider);

    dataProviderCache = {
        mainnetProvider: staticMainnetProvider,
        contract,
        poolContract,
        chainId: mainnetChainId,
    };

    return dataProviderCache;
}

export async function getPrices(): Promise<string[]> {
    let { contract, poolContract } = await getPricesDataProvider();
    try {
        const usdtPrice = await contract.latestAnswer();
        let usdtPriceInUSD = parseFloat(ethers.utils.formatUnits(usdtPrice, 8)); // Assuming 8 decimals for USDT oracle
        usdtPriceInUSD = 1.0; // TODO: remove this hardcoded value

        const slot0 = await poolContract.slot0();
        const sqrtPriceX96 = slot0.sqrtPriceX96.toString();

        // Convert sqrtPriceX96 to a regular number
        const sqrtPrice = parseFloat(sqrtPriceX96) / 2 ** 96;

        // Calculate the price
        const price = sqrtPrice * sqrtPrice * 10 ** 2;

        // If you need to adjust for USDT's price in USD:
        let wbtcPriceInUSD = price * usdtPriceInUSD;

        return [wbtcPriceInUSD.toFixed(18), usdtPrice.toString()];
    } catch (e) {
        console.error(e);
    }
}
