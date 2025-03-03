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

const RPC_URL = 'https://base.gateway.tenderly.co/3WpaBaxXFFKAoUnTIfKUyj';
if (!RPC_URL) {
    throw new Error('RPC_URL must be set in the environment.');
}

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const CUSTOM_AGGREGATOR = '0xd69B8A9e6D610ab0e377aACFC44cD5631d89a50a';

const TOKEN_A_ADDRESS = '0x940181a94a35a4569e4529a3cdfb74e38fd98631'; // Aerodrome
const TOKEN_B_ADDRESS = process.env.TOKEN_B_ADDRESS || '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const WBTC_ADDRESS = '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c';
const USDBC_ADDRESS = '0x3DdF264AC95D19e81f8c25f4c300C4e59e424d43';

// Mapping for names (for logging/readability)
const nameMap: { [address: string]: string } = {
    [TOKEN_A_ADDRESS]: 'Aerodrome',
    [USDC_ADDRESS]: 'USDC',
    [WETH_ADDRESS]: 'WETH',
    [WBTC_ADDRESS]: 'WBTC',
    [USDBC_ADDRESS]: 'USDBC',
};

const QUOTER_ADDRESS = process.env.QUOTER_ADDRESS || '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
const feeTiers = [100, 500, 3_000, 10_000];

const QUOTER_ABI = [
    'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
];
const quoterContract = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, provider);

const ERC20_ABI = ['function decimals() view returns (uint8)'];
const decimalsCache: { [address: string]: number } = {};

// Cache for hop quotes. The key is built from tokenIn, tokenOut, amountIn, and feeTier.
const hopCache: Map<string, Promise<ethers.BigNumber>> = new Map();

let totalAttempts = 0;
let totalFailures = 0;
let totalSuccesses = 0;
let cachesUsed = 0;

async function getTokenDecimals(tokenAddress: string): Promise<number> {
    if (decimalsCache[tokenAddress]) return decimalsCache[tokenAddress];
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const decimals = await tokenContract.decimals();
    decimalsCache[tokenAddress] = decimals;
    return decimals;
}

async function quoteHop(
    tokenIn: string,
    tokenOut: string,
    amountIn: ethers.BigNumber,
    feeTier: number,
): Promise<ethers.BigNumber> {
    const sqrtPriceLimitX96 = 0;
    const params = { tokenIn, tokenOut, amountIn, fee: feeTier, sqrtPriceLimitX96 };
    // Build a unique cache key for the hop.
    const key = `${tokenIn}-${tokenOut}-${amountIn.toString()}-${feeTier}`;
    if (hopCache.has(key)) {
        cachesUsed++;
        return hopCache.get(key)!;
    }
    const promise = quoterContract.callStatic
        .quoteExactInputSingle(params)
        .then(([amountOut]: [ethers.BigNumber, unknown, unknown, unknown]) => amountOut)
        .catch((err: any) => {
            hopCache.delete(key);
            throw err;
        });
    hopCache.set(key, promise);
    return promise;
}

async function quoteRouteWithFees(
    route: string[],
    feeCombination: number[],
    initialAmount: ethers.BigNumber,
): Promise<ethers.BigNumber | null> {
    totalAttempts++;
    let amountIn = initialAmount;
    try {
        for (let i = 0; i < route.length - 1; i++) {
            amountIn = await quoteHop(route[i], route[i + 1], amountIn, feeCombination[i]);
        }
        console.log(`Route [${route.join(' -> ')}] with fees [${feeCombination.join(', ')}] succeeded ${amountIn}.`);
        totalSuccesses++;
        return amountIn;
    } catch (error) {
        console.error(`Route [${route.join(' -> ')}] with fees [${feeCombination.join(', ')}] failed.`);
        totalFailures++;
        return null;
    }
}

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

// Helper: generate all ordered combinations (permutations) of k elements from an array.
function getPermutations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    const results: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
        const rest = arr.slice(0, i).concat(arr.slice(i + 1));
        const perms = getPermutations(rest, k - 1);
        for (const perm of perms) {
            results.push([arr[i], ...perm]);
        }
    }
    return results;
}

interface RouteResult {
    route: string[];
    feeCombination: number[];
    amountOut: ethers.BigNumber;
}

async function runTests() {
    // Get input amount in human-readable form.
    const amountInHuman = '100.0';
    const tokenADecimals = await getTokenDecimals(TOKEN_A_ADDRESS);
    const initialAmount = ethers.utils.parseUnits(amountInHuman, tokenADecimals);

    // Define intermediary options.
    // Note: Instead of including a "none" option, we now treat a direct swap (no intermediary) separately.
    type Intermediary = { name: string; address: string | null };
    const intermediaries: Intermediary[] = [
        { name: 'none', address: null },
        { name: 'USDC', address: USDC_ADDRESS },
        { name: 'WETH', address: WETH_ADDRESS },
        { name: 'WBTC', address: WBTC_ADDRESS },
    ];

    // Direct route (0 intermediaries)
    const routes: string[][] = [[TOKEN_A_ADDRESS, TOKEN_B_ADDRESS]];

    // Only consider intermediaries with a valid address.
    const availableIntermediaries = intermediaries
        .filter((im) => im.address !== null)
        .map((im) => im.address!) as string[];

    // Choose a maximum number of intermediaries for the routes.
    // You can adjust this value as needed.
    const maxIntermediaryCount = availableIntermediaries.length;

    // Generate routes with 1 up to maxIntermediaryCount intermediaries.
    for (let count = 1; count <= maxIntermediaryCount; count++) {
        const perms = getPermutations(availableIntermediaries, count);
        for (const perm of perms) {
            // Full route is: TOKEN_A -> ...perm tokens... -> TOKEN_B
            routes.push([TOKEN_A_ADDRESS, ...perm, TOKEN_B_ADDRESS]);
        }
    }

    // Remove any duplicate routes by using a set.
    const routesSet = new Set<string>();
    const uniqueRoutes: string[][] = [];
    for (const route of routes) {
        const key = route.join('->');
        if (!routesSet.has(key)) {
            routesSet.add(key);
            uniqueRoutes.push(route);
        }
    }
    console.log(`Total unique routes: ${uniqueRoutes.length}`);

    // Run fee combination checks for all routes in parallel.
    const routeResultsPromises = uniqueRoutes.map(async (route) => {
        const numHops = route.length - 1;
        const feeCombos = generateFeeCombinations(numHops, feeTiers);
        console.log(`Route: ${route.join(' -> ')}, Fee Combos: ${JSON.stringify(feeCombos)}`);

        const feeResults = await Promise.all(
            feeCombos.map(async (feeCombo) => {
                const amountOut = await quoteRouteWithFees(route, feeCombo, initialAmount);
                console.log(`Fee Combo: ${feeCombo}, Amount Out: ${amountOut}`);
                return { feeCombo, amountOut };
            }),
        );

        const validResults = feeResults.filter(
            (result): result is { feeCombo: number[]; amountOut: ethers.BigNumber } =>
                result.amountOut !== null && result.amountOut !== undefined,
        );

        if (validResults.length === 0) return null;
        let best = validResults[0];
        for (let i = 1; i < validResults.length; i++) {
            if (validResults[i].amountOut.gt(best.amountOut)) {
                best = validResults[i];
            }
        }
        return { route, feeCombination: best.feeCombo, amountOut: best.amountOut };
    });

    const routeResultsUnfiltered = await Promise.all(routeResultsPromises);
    const results: RouteResult[] = routeResultsUnfiltered.filter((r): r is RouteResult => r !== null);

    // Sort routes by highest output amount.
    results.sort((a, b) => (a.amountOut.eq(b.amountOut) ? 0 : a.amountOut.gt(b.amountOut) ? -1 : 1));

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
    console.log(`Total successes: ${totalSuccesses}`);
    console.log(`Total failures: ${totalFailures}`);
    console.log(`Total attempts: ${totalAttempts}`);
    console.log(`Cache hits: ${cachesUsed}`);
}

runTests().catch(console.error);
