import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { MULTICALL_ADDRESS, MULTICALL_ABI } from './constants';

dotenv.config({
    path: require('path').resolve(__dirname, '../.env'),
});

//
// --- Configuration and provider setup
//
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
//
// --- Addresses and constants
//
// const CUSTOM_AGGREGATOR = '0xd69B8A9e6D610ab0e377aACFC44cD5631d89a50a'; // Our multicall3 aggregator contract
const AERODROME_ADDRESS = '0x940181a94a35a4569e4529a3cdfb74e38fd98631';
const CBBTC_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const WBTC_ADDRESS = '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c';
const USDBC_ADDRESS = '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA';

// Use token A as Aerodrome (THRO) and token B as cBBTC
const TOKEN_A_ADDRESS = AERODROME_ADDRESS;
const TOKEN_B_ADDRESS = CBBTC_ADDRESS;

// Mapping for logging (for readability)
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

//
// --- Contract ABIs and instances
//

// Quoter ABI and instance
const QUOTER_ABI = [
    'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
];
const quoterContract = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, signer);

// ERC20 ABI (only decimals needed)
const ERC20_ABI = ['function decimals() view returns (uint8)'];
const decimalsCache: { [address: string]: number } = {};

// Multicall3 ABI and instance
// const MULTICALL3_ABI = [
//     'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) public payable returns (tuple(bool success, bytes returnData)[] returnData)',
// ];
const multicallContract = new ethers.Contract(
    MULTICALL_ADDRESS,
    [
        'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) public payable returns (tuple(bool success, bytes returnData)[] returnData)',
    ],
    signer,
);

//
// --- Utility: Get token decimals with caching
//
async function getTokenDecimals(tokenAddress: string): Promise<number> {
    if (decimalsCache[tokenAddress]) return decimalsCache[tokenAddress];
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const decimals = await tokenContract.decimals();
    decimalsCache[tokenAddress] = decimals;
    return decimals;
}

//
// --- Helper: Chunk an array into batches of a given size
//
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

//
// --- New batching function for fee–combo attempts using multicall3
//
// For a given route (an array of token addresses) and a feeCombination (one fee per hop),
// we want to simulate the sequential hops by batching up to 10 attempts per hop at once.
// Each fee–combo attempt starts with the same initialAmount. If any hop call fails (reverts),
// that attempt is marked as failed. Otherwise, the output of the hop becomes the input for the next.
//
interface FeeComboAttempt {
    feeCombo: number[];
    currentHop: number; // index of next hop to process
    currentAmount: ethers.BigNumber;
    failed: boolean;
}

async function batchProcessFeeCombos(
    route: string[],
    feeCombos: number[][],
    initialAmount: ethers.BigNumber,
): Promise<{ feeCombo: number[]; amountOut: ethers.BigNumber | null }[]> {
    const totalHops = route.length - 1;
    // Initialize an attempt for each fee combo
    const attempts: FeeComboAttempt[] = feeCombos.map((feeCombo) => ({
        feeCombo,
        currentHop: 0,
        currentAmount: initialAmount,
        failed: false,
    }));

    // Process each hop sequentially across all attempts.
    console.log(`total hops ${totalHops}`);
    // Process attempts until all are either failed or have reached totalHops
    while (true) {
        // Filter out attempts that haven't reached the final hop and haven't failed.
        const pending = attempts.filter((a) => !a.failed && a.currentHop < totalHops);
        if (pending.length === 0) break; // All attempts are done

        // Process attempts at the current minimum hop level
        const currentHop = Math.min(...pending.map((a) => a.currentHop));
        const currentBatch = pending.filter((a) => a.currentHop === currentHop);

        // Group these into batches of 10
        const batches = chunkArray(currentBatch, 5);
        let progressMade = false;

        for (const batch of batches) {
            // Prepare the calls for this hop.
            const calls = batch.map((attempt) => {
                const tokenIn = route[attempt.currentHop]; // use attempt.currentHop rather than hop loop variable
                const tokenOut = route[attempt.currentHop + 1];
                const feeTier = attempt.feeCombo[attempt.currentHop];
                const params = {
                    tokenIn,
                    tokenOut,
                    amountIn: attempt.currentAmount,
                    fee: feeTier,
                    sqrtPriceLimitX96: 0,
                };
                const callData = quoterContract.interface.encodeFunctionData('quoteExactInputSingle', [params]);
                return { target: QUOTER_ADDRESS, callData };
            });

            // Execute the batched multicall
            const results = await multicallContract.callStatic.tryAggregate(false, calls);
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const attempt = batch[i];
                if (!result.success) {
                    attempt.failed = true;
                } else {
                    try {
                        const decoded = quoterContract.interface.decodeFunctionResult(
                            'quoteExactInputSingle',
                            result.returnData,
                        );
                        const amountOut = decoded[0] as ethers.BigNumber;
                        attempt.currentAmount = amountOut;
                        attempt.currentHop++; // Mark progress for this attempt
                        progressMade = true;
                    } catch (err) {
                        attempt.failed = true;
                    }
                }
            }
        }

        // If none of the attempts at this hop advanced, then break to avoid an infinite loop.
        if (!progressMade) {
            console.error(`No progress made at hop ${currentHop}. Exiting loop to avoid infinite retry.`);
            break;
        }
    }

    // for (let hop = 0; hop < totalHops; hop++) {
    //     // Get all attempts that haven't failed and are at the current hop index.
    //     const pending = attempts.filter((a) => !a.failed && a.currentHop === hop);
    //     if (pending.length === 0) continue;

    //     // Batch the pending attempts in groups of 10.
    //     const batches = chunkArray(pending, 10);
    //     console.log('batches.length: ', batches.length);
    //     let progressMade = false;
    //     for (const batch of batches) {
    //         console.log(`Before processing batch: ${batch.map((a) => a.feeCombo.join('-') + ' hop:' + a.currentHop)}`);

    //         // Prepare the calls for this hop.
    //         const calls = batch.map((attempt) => {
    //             const tokenIn = route[hop];
    //             const tokenOut = route[hop + 1];
    //             const feeTier = attempt.feeCombo[hop];
    //             const params = {
    //                 tokenIn,
    //                 tokenOut,
    //                 amountIn: attempt.currentAmount,
    //                 fee: feeTier,
    //                 sqrtPriceLimitX96: 0,
    //             };
    //             // console.log({paramsbun})
    //             const callData = quoterContract.interface.encodeFunctionData('quoteExactInputSingle', [params]);
    //             return {
    //                 target: QUOTER_ADDRESS,
    //                 callData,
    //             };
    //         });
    //         // Call multicall3 with requireSuccess=false to allow failures.
    //         // console.log('Trying multicall');
    //         const results: { success: boolean; returnData: string }[] = await multicallContract.callStatic.tryAggregate(
    //             false,
    //             calls,
    //         );
    //         // console.log('Got results');
    //         // Process each result in the batch.
    //         for (let i = 0; i < results.length; i++) {
    //             const result = results[i];
    //             const attempt = batch[i];
    //             if (!result.success) {
    //                 attempt.failed = true;
    //             } else {
    //                 try {
    //                     // Decode result; note that the first element is the amountOut.
    //                     const decoded = quoterContract.interface.decodeFunctionResult(
    //                         'quoteExactInputSingle',
    //                         result.returnData,
    //                     );
    //                     const amountOut = decoded[0] as ethers.BigNumber;
    //                     console.log({ amountOut });
    //                     attempt.currentAmount = amountOut;
    //                     attempt.currentHop++; // move to next hop
    //                 } catch (err) {
    //                     console.log('Decode error: ', err);
    //                     attempt.failed = true;
    //                 }
    //             }
    //         }
    //         console.log(
    //             `After processing batch: ${batch.map((a) => a.feeCombo.join('-') + ' hop:' + a.currentHop + (a.failed ? ' FAILED' : ''))}`,
    //         );
    //     }
    //     if (!progressMade && pending.filter((a) => !a.failed).length > 0) {
    //         console.error(`No progress made at hop ${hop} for some attempts. Breaking out to avoid infinite loop.`);
    //         break;
    //     }
    // }
    // Return the final amountOut for each fee combo if all hops succeeded.
    return attempts.map((a) => ({
        feeCombo: a.feeCombo,
        amountOut: !a.failed && a.currentHop === totalHops ? a.currentAmount : null,
    }));
}

//
// --- Generate all fee combinations (one fee per hop)
//
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

//
// --- Helper: Generate all ordered combinations (permutations) of k elements from an array.
//
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

//
// --- Original route tester, modified to use batch processing for fee combos
//
interface RouteResult {
    route: string[];
    feeCombination: number[];
    amountOut: ethers.BigNumber;
}

// Metrics for logging
let totalAttempts = 0;
let totalFailures = 0;
let totalSuccesses = 0;

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
        { name: 'USDBC', address: USDBC_ADDRESS },
    ];

    // Direct route (0 intermediaries)
    const routes: string[][] = [[TOKEN_A_ADDRESS, TOKEN_B_ADDRESS]];

    // Only consider intermediaries with a valid address.
    const availableIntermediaries = intermediaries
        .filter((im) => im.address !== null)
        .map((im) => im.address!) as string[];

    // Choose a maximum number of intermediaries for the routes.
    const maxIntermediaryCount = availableIntermediaries.length;

    // Generate routes with 1 up to maxIntermediaryCount intermediaries.
    for (let count = 1; count <= maxIntermediaryCount; count++) {
        const perms = getPermutations(availableIntermediaries, count);
        for (const perm of perms) {
            // Full route is: TOKEN_A -> ...perm tokens... -> TOKEN_B
            routes.push([TOKEN_A_ADDRESS, ...perm, TOKEN_B_ADDRESS]);
        }
    }

    // Remove any duplicate routes.
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

    // Process fee combination checks for all routes in parallel.
    // console.log({ uniqueRoutes });
    const routeResultsPromises = uniqueRoutes.map(async (route) => {
        // console.log({ route });
        totalAttempts++;
        const numHops = route.length - 1;
        const feeCombos = generateFeeCombinations(numHops, feeTiers);

        // Instead of submitting each fee–combo attempt separately, we batch
        // process them.
        // get first 10 routes

        const feeResults = await batchProcessFeeCombos(route, feeCombos, initialAmount);

        // Filter for attempts that succeeded (amountOut not null)
        const validResults = feeResults.filter(
            (result): result is { feeCombo: number[]; amountOut: ethers.BigNumber } =>
                result.amountOut !== null && result.amountOut !== undefined,
        );

        if (validResults.length === 0) {
            totalFailures++;
            return null;
        }

        // Choose the fee combo that gives the highest output.
        let best = validResults[0];
        for (let i = 1; i < validResults.length; i++) {
            if (validResults[i].amountOut.gt(best.amountOut)) {
                best = validResults[i];
            }
        }
        totalSuccesses++;
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
        console.log(`Route ${i + 1}: ${r.route.map((addr) => nameMap[addr]).join(' -> ')}`);
        console.log(`  Fee combination: [${r.feeCombination.join(', ')}]`);
        console.log(
            `  Amount Out: ${ethers.utils.formatUnits(r.amountOut, tokenBDecimals)} (raw: ${r.amountOut.toString()})`,
        );
    }
    console.log(`Total successes: ${totalSuccesses}`);
    console.log(`Total attempts: ${totalAttempts}`);
}

runTests().catch(console.error);
