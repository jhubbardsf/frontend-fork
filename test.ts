import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

const baseUrls = [
    'https://0xrpc.io/base',
    'https://mainnet.base.org',
    'https://base.meowrpc.com',
    'https://base-rpc.publicnode.com',
    'https://base.gateway.tenderly.co',
    'https://base.api.onfinality.io/public',
    'https://base-mainnet.public.blastapi.io',
    'https://developer-access-mainnet.base.org',
    'https://base.blockpi.network/v1/rpc/public',
];

// Ensure these environment variables are set in your .env file:
// RPC_URL, PRIVATE_KEY, TOKEN_A_ADDRESS, TOKEN_B_ADDRESS, QUOTER_ADDRESS
const RPC_URL =
    process.env.RPC_URL || 'https://base.gateway.tenderly.co/2CozPE8XkkiFQIO8uj4Ug1' || 'http://localhost:50101';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!RPC_URL || !PRIVATE_KEY) {
    throw new Error('RPC_URL and PRIVATE_KEY must be set in the environment.');
}

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const CUSTOM_AGGREGATOR = '0xd69B8A9e6D610ab0e377aACFC44cD5631d89a50a';

// Input/Output token addresses
// const TOKEN_A_ADDRESS = process.env.TOKEN_A_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // e.g. USDC
const TOKEN_A_ADDRESS = '0x940181a94a35a4569e4529a3cdfb74e38fd98631'; // Aerodrome
const TOKEN_B_ADDRESS = process.env.TOKEN_B_ADDRESS || '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf'; // e.g. cbBTC

// Intermediary token addresses
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const WBTC_ADDRESS = '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c';
const USDBC_ADDRESS = '0x3DdF264AC95D19e81f8c25f4c300C4e59e424d43';

// Quoter contract address (Uniswap QuoterV2)
const QUOTER_ADDRESS = process.env.QUOTER_ADDRESS || '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';

// Fee tiers to test for each hop
//               .01%, .05%,  .3%,     1%
const feeTiers = [100, 500, 3_000, 10_000];

// ABI for the Uniswap V3 Quoter V2 accepting a struct and returning four values.
const QUOTER_ABI = [
    'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
];
const quoterContract = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, signer);

// Minimal ERC20 ABI to get decimals.
const ERC20_ABI = ['function decimals() view returns (uint8)'];
const decimalsCache: { [address: string]: number } = {};

// Helper: Get token decimals (with caching)
async function getTokenDecimals(tokenAddress: string): Promise<number> {
    if (decimalsCache[tokenAddress]) return decimalsCache[tokenAddress];
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const decimals = await tokenContract.decimals();
    decimalsCache[tokenAddress] = decimals;
    return decimals;
}

// Single-hop quote using callStatic.
async function quoteHop(
    tokenIn: string,
    tokenOut: string,
    amountIn: ethers.BigNumber,
    feeTier: number,
): Promise<ethers.BigNumber> {
    const sqrtPriceLimitX96 = 0; // no price limit
    const params = { tokenIn, tokenOut, amountIn, fee: feeTier, sqrtPriceLimitX96 };
    const [amountOut] = await quoterContract.callStatic.quoteExactInputSingle(params);
    return amountOut;
}

// Simulate a multi-hop route with a specific fee combination.
// The feeCombination array length must equal (route.length - 1).
async function quoteRouteWithFees(
    route: string[],
    feeCombination: number[],
    initialAmount: ethers.BigNumber,
): Promise<ethers.BigNumber | null> {
    let amountIn = initialAmount;
    try {
        for (let i = 0; i < route.length - 1; i++) {
            amountIn = await quoteHop(route[i], route[i + 1], amountIn, feeCombination[i]);
        }
        console.log(`Route [${route.join(' -> ')}] with fees [${feeCombination.join(', ')}] succeeded ${amountIn}.`);
        return amountIn;
    } catch (error) {
        // Log errors per route/fee combo; you might choose to suppress these in production.
        console.error(`Route [${route.join(' -> ')}] with fees [${feeCombination.join(', ')}] failed.`);
        return null;
    }
}

// Generate all fee tier combinations for a given number of hops.
function generateFeeCombinations(numHops: number, feeTiers: number[]): number[][] {
    if (numHops === 0) return [[]];
    const results: number[][] = [];
    function helper(current: number[]) {
        if (current.length === numHops) {
            results.push([...current]);
            return;
        }
        for (const fee of feeTiers) {
            current.push(fee);
            helper(current);
            current.pop();
        }
    }
    helper([]);
    return results;
}

interface RouteResult {
    route: string[];
    feeCombination: number[];
    amountOut: ethers.BigNumber;
}

async function runTests() {
    // Human-readable input amount for TOKEN_A
    const amountInHuman = '100.0';
    const tokenADecimals = await getTokenDecimals(TOKEN_A_ADDRESS);
    const initialAmount = ethers.utils.parseUnits(amountInHuman, tokenADecimals);

    // Define intermediary options with a "none" option.
    type Intermediary = { name: string; address: string | null };
    const intermediaries: Intermediary[] = [
        { name: 'none', address: null },
        { name: 'USDC', address: USDC_ADDRESS },
        { name: 'WETH', address: WETH_ADDRESS },
        { name: 'WBTC', address: WBTC_ADDRESS },
    ];

    // Filter out intermediary tokens that match TOKEN_A or TOKEN_B.
    const filteredIntermediaries = intermediaries.filter((im) => {
        if (im.address === null) return true;
        const lower = im.address.toLowerCase();
        return lower !== TOKEN_A_ADDRESS.toLowerCase() && lower !== TOKEN_B_ADDRESS.toLowerCase();
    });

    // Generate routes.
    // For two slots: direct route if both "none", one-hop if one slot is set, and two hops if both are set.
    const routesSet = new Set<string>();
    const routes: string[][] = [];
    for (const im1 of filteredIntermediaries) {
        for (const im2 of filteredIntermediaries) {
            // If both intermediaries are non-null and identical, skip to avoid duplicate swaps (e.g., WETH -> WETH).
            if (
                im1.address !== null &&
                im2.address !== null &&
                im1.address.toLowerCase() === im2.address.toLowerCase()
            ) {
                continue;
            }

            let route: string[];
            if (im1.address === null && im2.address === null) {
                // Direct swap.
                route = [TOKEN_A_ADDRESS, TOKEN_B_ADDRESS];
            } else if (im1.address !== null && im2.address === null) {
                // One intermediary (im1)
                route = [TOKEN_A_ADDRESS, im1.address, TOKEN_B_ADDRESS];
            } else if (im1.address === null && im2.address !== null) {
                // One intermediary (im2)
                route = [TOKEN_A_ADDRESS, im2.address, TOKEN_B_ADDRESS];
            } else {
                // Two intermediaries.
                route = [TOKEN_A_ADDRESS, im1.address!, im2.address!, TOKEN_B_ADDRESS];
            }
            const key = route.join('->');
            if (!routesSet.has(key)) {
                routesSet.add(key);
                routes.push(route);
            }
        }
    }

    console.log(`Total unique routes: ${routes.length}`);

    const results: RouteResult[] = [];

    // For each route, try all fee tier combinations for its hops.
    for (const route of routes) {
        const numHops = route.length - 1;
        const feeCombos = generateFeeCombinations(numHops, feeTiers);
        console.log(`Route: ${route.join(' -> ')}, Fee Combos: ${feeCombos}`);
        let bestAmountOut: ethers.BigNumber | null = null;
        let bestFees: number[] = [];

        for (const feeCombo of feeCombos) {
            const amountOut = await quoteRouteWithFees(route, feeCombo, initialAmount);
            console.log(`Amount Out: ${amountOut}`);
            if (amountOut && (!bestAmountOut || amountOut.gt(bestAmountOut))) {
                bestAmountOut = amountOut;
                bestFees = feeCombo;
            }
        }
        if (bestAmountOut) {
            results.push({ route, feeCombination: bestFees, amountOut: bestAmountOut });
        }
    }

    // Sort all routes by the final TOKEN_B amount (largest first).
    results.sort((a, b) => (a.amountOut.eq(b.amountOut) ? 0 : a.amountOut.gt(b.amountOut) ? -1 : 1));

    // Get TOKEN_B decimals for proper formatting.
    const tokenBDecimals = await getTokenDecimals(TOKEN_B_ADDRESS);

    console.log('Top 5 routes by output amount:');
    for (let i = 0; i < Math.min(5, results.length); i++) {
        const r = results[i];
        console.log(`Route ${i + 1}: ${r.route.join(' -> ')}`);
        console.log(`  Fee combination: [${r.feeCombination.join(', ')}]`);
        console.log(
            `  Amount Out: ${ethers.utils.formatUnits(r.amountOut, tokenBDecimals)} (raw: ${r.amountOut.toString()})`,
        );
    }
}

runTests().catch(console.error);
