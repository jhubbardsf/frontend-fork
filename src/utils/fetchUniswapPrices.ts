import { ethers } from 'ethers';
import { MAINNET_ETH_RPC_URL } from './constants';

const wbtcAddress = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
const chainLinkUsdcPriceOracleAddress = '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6';
const uniswapV3PoolAddress = '0xCBCdF9626bC03E24f779434178A73a0B4bad62eD';
const wbtcUsdcPool = '0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35';

const chainLinkUsdcPriceOracleAddressABI = [
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

export async function getPricesDataProvider(mainnetRpcIndex: number) {
    const mainnetChainId = 1;
    const utilizedRpcUrl = MAINNET_ETH_RPC_URL[mainnetRpcIndex];
    const staticMainnetProvider = new ethers.providers.StaticJsonRpcProvider(utilizedRpcUrl, {
        chainId: mainnetChainId,
        name: 'mainnet',
    });
    const contract = new ethers.Contract(
        chainLinkUsdcPriceOracleAddress,
        chainLinkUsdcPriceOracleAddressABI,
        staticMainnetProvider,
    );
    const poolContract = new ethers.Contract(wbtcUsdcPool, univ3ABI, staticMainnetProvider);

    const dataProvider = {
        mainnetProvider: staticMainnetProvider,
        contract,
        poolContract,
        chainId: mainnetChainId,
        utilizedRpcUrl,
    };

    return dataProvider;
}

export async function getUSDPrices(): Promise<{ btcPriceUSD: string; cbbtcPriceUSD: string }> {
    // TODO: get these BTC and CoinbaseBTC USD prices from coinbase API from MM server
    return {
        btcPriceUSD: '96900',
        cbbtcPriceUSD: '96885',
    };
    // for (let i = 0; i < MAINNET_ETH_RPC_URL.length; i++) {
    //     if (i > 0) {
    //         // first RPC failed, retrying `i`
    //         console.warn(`Mainnet RPC retrying ${i + 1}/${MAINNET_ETH_RPC_URL.length}`);
    //     }
    //     try {
    //         let { contract, poolContract, utilizedRpcUrl } = await getPricesDataProvider(i);
    //         const usdcPrice = await contract.latestAnswer();
    //         console.log('alpine usdcPrice', usdcPrice);
    //         const usdcPriceInUSD = parseFloat(ethers.utils.formatUnits(usdcPrice, 8)); // Assuming 8 decimals for USDT oracle
    //         console.log('alpine usdcPriceInUSD', usdcPriceInUSD);

    //         const slot0 = await poolContract.slot0();
    //         const sqrtPriceX96 = slot0.sqrtPriceX96.toString();

    //         // Convert sqrtPriceX96 to a regular number
    //         const sqrtPrice = parseFloat(sqrtPriceX96) / 2 ** 96;

    //         // Calculate the price
    //         const price = sqrtPrice * sqrtPrice * 10 ** 2;

    //         // If you need to adjust for USDT's price in USD:
    //         const wbtcPriceInUSD = price * usdcPriceInUSD;
    //         console.log('alpine wbtcPriceInUSD', wbtcPriceInUSD);

    //         // return wbtcPriceInUSD.toFixed(18);
    //     } catch (e) {
    //         console.error('alpine error fetching prices', e);
    //     }
    // }
}
