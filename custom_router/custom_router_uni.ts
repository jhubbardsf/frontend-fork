import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { MULTICALL_ADDRESS, MULTICALL_ABI } from './constants';
dotenv.config({
    path: '../.env',
});

// RPC URLs – you can cycle through them as needed
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
const signer = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

// Some addresses and constants
const CUSTOM_AGGREGATOR = '0xd69B8A9e6D610ab0e377aACFC44cD5631d89a50a';

const AERODROME_ADDRESS = '0x940181a94a35a4569e4529a3cdfb74e38fd98631';
const CBBTC_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const WBTC_ADDRESS = '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c';
const USDBC_ADDRESS = '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA';

const TOKEN_A_ADDRESS = AERODROME_ADDRESS; // For example, AERO
const TOKEN_B_ADDRESS = CBBTC_ADDRESS;

// For logging readability
const nameMap: { [address: string]: string } = {
    [AERODROME_ADDRESS]: 'AERO',
    [USDC_ADDRESS]: 'USDC',
    [WETH_ADDRESS]: 'WETH',
    [WBTC_ADDRESS]: 'wBTC',
    [USDBC_ADDRESS]: 'USDbc',
    [CBBTC_ADDRESS]: 'cBBTC',
};

const QUOTER_ADDRESS = process.env.QUOTER_ADDRESS || '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
const feeTiers = [100, 500, 3000, 10000];

const QUOTER_ABI = [
    'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
];
const quoterContract = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, provider);

// Multicall3 ABI and instance (using signer)
const MULTICALL3_ABI = [
    'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) public payable returns (tuple(bool success, bytes returnData)[] returnData)',
];
const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL3_ABI, signer);

// ERC20 decimals ABI and cache
const ERC20_ABI = ['function decimals() view returns (uint8)'];
const decimalsCache: { [address: string]: number } = {};

// Caches for quote hops
const hopCache: Map<string, Promise<ethers.BigNumber>> = new Map();
const failedHops: Map<string, Error> = new Map();

// Global stats
let totalAttempts = 0;
let totalFailures = 0;
let totalSuccesses = 0;
let cachesUsed = 0;
let negativeCacheUsed = 0;
let actualCalls = 0;

/**
 * Get token decimals with caching.
 */
async function getTokenDecimals(tokenAddress: string): Promise<number> {
    if (decimalsCache[tokenAddress]) return decimalsCache[tokenAddress];
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const decimals = await tokenContract.decimals();
    decimalsCache[tokenAddress] = decimals;
    return decimals;
}

/**
 * Helper: Batch quote calls for a single hop over multiple fee combinations.
 *
 * @param route - Array of token addresses in the route.
 * @param hopIndex - Which hop (from route[i] to route[i+1]) we are processing.
 * @param results - Array of objects each representing a fee combination attempt,
 *   with properties:
 *      feeCombo: number[],
 *      amountOut: ethers.BigNumber (current amount),
 *      failed: boolean
 */
async function batchQuoteHop(
    route: string[],
    hopIndex: number,
    results: { feeCombo: number[]; amountOut: ethers.BigNumber; failed: boolean }[],
): Promise<void> {
    const tokenIn = route[hopIndex];
    const tokenOut = route[hopIndex + 1];
    const sqrtPriceLimitX96 = 0;

    // Prepare array of calls for multicall that are not yet cached.
    const calls: { index: number; callData: string; fee: number; amountIn: ethers.BigNumber }[] = [];

    // For each fee combo result that hasn’t already failed:
    for (let i = 0; i < results.length; i++) {
        if (results[i].failed) continue;
        const fee = results[i].feeCombo[hopIndex];
        const amountIn = results[i].amountOut;
        const cacheKey = `${tokenIn}-${tokenOut}-${amountIn.toString()}-${fee}`;
        if (hopCache.has(cacheKey)) {
            // If we have a cached result, use it directly.
            try {
                const cached = await hopCache.get(cacheKey);
                results[i].amountOut = cached;
                cachesUsed++;
            } catch (err) {
                results[i].failed = true;
                const negKey = `${tokenIn}-${tokenOut}-${fee}`;
                failedHops.set(negKey, err as Error);
                negativeCacheUsed++;
            }
        } else {
            // Prepare the call data using quoter contract’s interface.
            const callData = quoterContract.interface.encodeFunctionData('quoteExactInputSingle', [
                {
                    tokenIn,
                    tokenOut,
                    amountIn,
                    fee,
                    sqrtPriceLimitX96,
                },
            ]);
            calls.push({ index: i, callData, fee, amountIn });
        }
    }

    if (calls.length === 0) return;

    // Build multicall array (each call is a tuple: target and callData)
    const multicallCalls = calls.map((c) => ({
        target: quoterContract.address,
        callData: c.callData,
    }));

    // Execute multicall – using requireSuccess = false so that a failing call returns false.
    let returnData: [boolean, string][];
    try {
        returnData = await multicallContract.callStatic.tryAggregate(false, multicallCalls);
        actualCalls++;
    } catch (e) {
        // If multicall itself fails, mark all these calls as failed.
        for (const c of calls) {
            results[c.index].failed = true;
            const negKey = `${tokenIn}-${tokenOut}-${c.fee}`;
            failedHops.set(negKey, e as Error);
            negativeCacheUsed++;
        }
        return;
    }

    // Process each response
    for (let j = 0; j < calls.length; j++) {
        const { index, fee, amountIn } = calls[j];
        const [success, data] = returnData[j];
        const cacheKey = `${tokenIn}-${tokenOut}-${amountIn.toString()}-${fee}`;
        if (success) {
            try {
                const decoded = quoterContract.interface.decodeFunctionResult('quoteExactInputSingle', data);
                const amountOut = decoded[0] as ethers.BigNumber;
                // Cache the successful result.
                hopCache.set(cacheKey, Promise.resolve(amountOut));
                results[index].amountOut = amountOut;
            } catch (err) {
                results[index].failed = true;
                const negKey = `${tokenIn}-${tokenOut}-${fee}`;
                failedHops.set(negKey, err as Error);
                negativeCacheUsed++;
            }
        } else {
            results[index].failed = true;
            const negKey = `${tokenIn}-${tokenOut}-${fee}`;
            failedHops.set(negKey, new Error('Multicall call failed'));
            negativeCacheUsed++;
        }
    }
}

/**
 * Batches all fee combination calls for a route using multicall3.
 *
 * @param route - Array of token addresses in the swap route.
 * @param feeCombos - Array of fee combinations for the hops.
 * @param initialAmount - The initial amountIn as a BigNumber.
 * @returns The best amountOut among the fee combinations or null if none succeeded.
 */
async function quoteRouteWithFeesMulticall(
    route: string[],
    feeCombos: number[][],
    initialAmount: ethers.BigNumber,
): Promise<{ feeCombo: number[]; amountOut: ethers.BigNumber } | null> {
    totalAttempts++;
    // For each fee combo, we track the current amount (starting with initialAmount) and a failure flag.
    const results = feeCombos.map((combo) => ({
        feeCombo: combo,
        amountOut: initialAmount,
        failed: false,
    }));

    // Process each hop (from token i to token i+1)
    for (let hopIndex = 0; hopIndex < route.length - 1; hopIndex++) {
        await batchQuoteHop(route, hopIndex, results);
    }

    // Filter out failed fee combos.
    const validResults = results.filter((r) => !r.failed);
    if (validResults.length === 0) {
        totalFailures++;
        console.log(`Route [${route.join(' -> ')}] failed.`);
        return null;
    }
    // Choose the best fee combo (highest final amountOut)
    let best = validResults[0];
    for (const r of validResults) {
        if (r.amountOut.gt(best.amountOut)) {
            best = r;
        }
    }
    totalSuccesses++;
    console.log(`Route [${route.join(' -> ')}] with fees [${best.feeCombo.join(', ')}] succeeded ${best.amountOut}.`);
    return { feeCombo: best.feeCombo, amountOut: best.amountOut };
}

/**
 * Generates all fee combinations for a given number of hops.
 */
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

/**
 * Helper: Generate all ordered combinations (permutations) of k elements from an array.
 */
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
    const amountInHuman = '100000.0';
    const tokenADecimals = await getTokenDecimals(TOKEN_A_ADDRESS);
    const initialAmount = ethers.utils.parseUnits(amountInHuman, tokenADecimals);

    // Define intermediary options.
    type Intermediary = { name: string; address: string | null };
    const intermediaries: Intermediary[] = [
        { name: 'none', address: null },
        { name: 'USDC', address: USDC_ADDRESS },
        { name: 'WETH', address: WETH_ADDRESS },
        { name: 'WBTC', address: WBTC_ADDRESS },
        // { name: 'USDbc', address: USDBC_ADDRESS },
    ];

    // Direct route (0 intermediaries)
    const routes: string[][] = [[TOKEN_A_ADDRESS, TOKEN_B_ADDRESS]];

    // Only consider intermediaries with a valid address.
    const availableIntermediaries = intermediaries
        .filter((im) => im.address !== null)
        .map((im) => im.address!) as string[];

    // For routes with 1 intermediary (or more if desired)
    const maxIntermediaryCount = availableIntermediaries.length;
    for (let count = 1; count <= maxIntermediaryCount; count++) {
        const perms = getPermutations(availableIntermediaries, count);
        for (const perm of perms) {
            routes.push([TOKEN_A_ADDRESS, ...perm, TOKEN_B_ADDRESS]);
        }
    }

    // Remove duplicate routes.
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

    // For each unique route, process fee combinations in parallel.
    const routeResultsPromises = uniqueRoutes.map(async (route) => {
        const numHops = route.length - 1;
        const feeCombos = generateFeeCombinations(numHops, feeTiers);
        const bestResult = await quoteRouteWithFeesMulticall(route, feeCombos, initialAmount);
        if (bestResult === null) return null;
        return { route, feeCombination: bestResult.feeCombo, amountOut: bestResult.amountOut };
    });

    const routeResultsUnfiltered = await Promise.all(routeResultsPromises);
    const results: RouteResult[] = routeResultsUnfiltered.filter((r): r is RouteResult => r !== null);

    // Sort routes by highest output amount.
    results.sort((a, b) => (a.amountOut.eq(b.amountOut) ? 0 : a.amountOut.gt(b.amountOut) ? -1 : 1));

    const tokenBDecimals = await getTokenDecimals(TOKEN_B_ADDRESS);
    console.log('Top 5 routes by output amount:');
    for (let i = 0; i < Math.min(5, results.length); i++) {
        const r = results[i];
        console.log(`Route ${i + 1}: ${r.route.map((addr) => nameMap[addr]).join(' -> ')}`);
        console.log(`  Fee combination (example): [${r.feeCombination.join(', ')}]`);
        console.log(
            `  Amount Out: ${ethers.utils.formatUnits(r.amountOut, tokenBDecimals)} (raw: ${r.amountOut.toString()})`,
        );
    }
    console.log(`Total successes: ${totalSuccesses}`);
    console.log(`Total failures: ${totalFailures}`);
    console.log(`Total attempts: ${totalAttempts}`);
    console.log(`Cache hits: ${cachesUsed}`);
    console.log(`Negative cache hits: ${negativeCacheUsed}`);
    console.log(`Actual calls: ${actualCalls}`);
}

runTests().catch(console.error);
