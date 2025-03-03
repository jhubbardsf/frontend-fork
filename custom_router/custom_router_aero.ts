import { ethers } from 'ethers';
import poolData from './aerodrome_pools_final.json';
import { MULTICALL_ADDRESS, MULTICALL_ABI_ETHERS } from './constants';

const outputFile = 'aerodrome_pools_final2.json';
// ----------------------------
// Configuration & Setup
// ----------------------------

// RPC & provider (using Base’s RPC in this example)
const RPC_URL = 'https://base.gateway.tenderly.co/3WpaBaxXFFKAoUnTIfKUyj';
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const multicall = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL_ABI_ETHERS, provider);

// Additional intermediary tokens (adjust as needed)
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const WBTC_ADDRESS = '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c';
const USDBC_ADDRESS = '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA';

// Token addresses (adjust as needed)
// const TOKEN_A_ADDRESS = '0x940181a94A35A4569E4529A3CDfB74e38FD98631'; // AERO
const TOKEN_A_ADDRESS = USDC_ADDRESS;
const TOKEN_B_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf'; // cBBTC

// For logging/readability:
const nameMap: { [address: string]: string } = {
    [TOKEN_A_ADDRESS]: 'USDC',
    [TOKEN_B_ADDRESS]: 'cBBTC',
    // [USDC_ADDRESS]: 'USDC',
    [WETH_ADDRESS]: 'WETH',
    [WBTC_ADDRESS]: 'wBTC',
    [USDBC_ADDRESS]: 'USDbc',
};

// Create a list of intermediary tokens (only valid addresses)
const intermediaries: string[] = [USDC_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS, USDBC_ADDRESS];

// ----------------------------
// Contract Interfaces
// ----------------------------

// Aerodrome pool interface: each pool implements getAmountOut(uint256, address) view returns (uint256)
const aerodromePoolABI = ['function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256)'];
const aerodromePoolInterface = new ethers.utils.Interface(aerodromePoolABI);

// ----------------------------
// Helper Functions
// ----------------------------

/**
 * Given a token pair (tokenIn and tokenOut) and an input amount, this function looks up available pools
 * from our poolData. It checks both the direct key ("tokenIn-tokenOut") and the reversed key ("tokenOut-tokenIn").
 * If the reversed key is used, it sets a flag and logs a debug message. Then it uses multicall3 to batch call
 * getAmountOut on each available pool and returns the highest output.
 */
async function simulateHop(
    tokenIn: string,
    tokenOut: string,
    amountIn: ethers.BigNumber,
): Promise<ethers.BigNumber | null> {
    const key1 = `${tokenIn}-${tokenOut}`;
    const key2 = `${tokenOut}-${tokenIn}`;
    let pools = poolData[key1];
    let reversed = false;
    if (!pools && poolData[key2]) {
        console.log('Reversed pool found');
        pools = poolData[key2];
        reversed = true;
    }
    if (!pools) {
        console.log(`No pool found for pair ${tokenIn}-${tokenOut}`);
        return null;
    }
    if (!Array.isArray(pools)) {
        pools = [pools];
    }
    if (reversed) {
        console.log(`Using reversed pool for pair ${tokenIn}-${tokenOut}`);
    }

    // Build multicall calls: for each pool, call getAmountOut with our original tokenIn.
    const calls = pools.map((pool: any) => {
        const target = pool.poolAddress;
        const callData = aerodromePoolInterface.encodeFunctionData('getAmountOut', [amountIn, tokenIn]);
        return { target, allowFailure: true, callData };
    });

    try {
        type Aggregate3Response = { success: boolean; returnData: string };
        const results: Aggregate3Response[] = await multicall.callStatic.aggregate3(calls);
        let bestOutput: ethers.BigNumber | null = null;
        for (let i = 0; i < results.length; i++) {
            if (results[i].success) {
                try {
                    const decoded = aerodromePoolInterface.decodeFunctionResult('getAmountOut', results[i].returnData);
                    const output: ethers.BigNumber = decoded[0];
                    if (bestOutput === null || output.gt(bestOutput)) {
                        bestOutput = output;
                    }
                } catch (e) {
                    console.error(`Error decoding result for pool ${pools[i].poolAddress}:`, e);
                }
            }
        }
        return bestOutput;
    } catch (e) {
        console.error(`Multicall failed for hop ${tokenIn}-${tokenOut}:`, e);
        return null;
    }
}

/**
 * Simulates an entire route by chaining hops. For each hop (from route[i] to route[i+1]),
 * it calls simulateHop. If any hop fails, the route fails.
 */
async function simulateRoute(route: string[], initialAmount: ethers.BigNumber): Promise<ethers.BigNumber | null> {
    let amount = initialAmount;
    for (let i = 0; i < route.length - 1; i++) {
        const from = route[i];
        const to = route[i + 1];
        const out = await simulateHop(from, to, amount);
        if (out === null) {
            console.log(
                `Route [${route.map((addr) => nameMap[addr] || addr).join(' -> ')}] fails at hop ${nameMap[from] || from} -> ${nameMap[to] || to}`,
            );
            return null;
        }
        amount = out;
    }
    return amount;
}

/**
 * Generates all routes given TOKEN_A -> TOKEN_B with 0 up to all intermediaries (without repetition).
 */
function generateRoutes(tokenA: string, tokenB: string, intermediaries: string[]): string[][] {
    const routes: string[][] = [];
    // Direct route.
    routes.push([tokenA, tokenB]);
    // Generate routes with 1 to all intermediaries.
    for (let count = 1; count <= intermediaries.length; count++) {
        const perms = getPermutations(intermediaries, count);
        for (const perm of perms) {
            routes.push([tokenA, ...perm, tokenB]);
        }
    }
    // Deduplicate routes.
    const seen = new Set<string>();
    const unique: string[][] = [];
    for (const route of routes) {
        const key = route.join('->');
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(route);
        }
    }
    return unique;
}

/**
 * Recursively generates all permutations of k elements from an array.
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

// ----------------------------
// Main Simulation Function
// ----------------------------

async function runSimulation() {
    // Define the input amount (for example, 100,000 AERO)
    const amountInHuman = '1000.0';
    // Assume AERO has 18 decimals (adjust if needed)
    const tokenADecimals = 18;
    const initialAmount = ethers.utils.parseUnits(amountInHuman, tokenADecimals);

    // Generate all possible routes: direct and via intermediaries.
    const routes = generateRoutes(TOKEN_A_ADDRESS, TOKEN_B_ADDRESS, intermediaries);
    console.log(`Total unique routes: ${routes.length}`);

    // Simulate all routes concurrently.
    const simulationPromises = routes.map(async (route) => {
        const out = await simulateRoute(route, initialAmount);
        return { route, output: out };
    });
    const simulationResults = await Promise.all(simulationPromises);
    const validRoutes = simulationResults.filter((res) => res.output !== null) as {
        route: string[];
        output: ethers.BigNumber;
    }[];

    // Sort valid routes by output descending.
    validRoutes.sort((a, b) => (a.output.eq(b.output) ? 0 : a.output.gt(b.output) ? -1 : 1));

    // Print top 5 routes.
    const tokenBDecimals = 18; // adjust if needed
    console.log('Top 5 routes by output amount:');
    for (let i = 0; i < Math.min(5, validRoutes.length); i++) {
        const { route, output } = validRoutes[i];
        console.log(`Route ${i + 1}: ${route.map((addr) => nameMap[addr] || addr).join(' -> ')}`);
        console.log(`  Output: ${ethers.utils.formatUnits(output, tokenBDecimals)} (raw: ${output.toString()})`);
    }
    // console.log(Object.keys(poolData));
    // console.log(poolData['0x4200000000000000000000000000000000000006-0x940181a94A35A4569E4529A3CDfB74e38FD98631']);

    // let newObject = {};
    // Object.keys(poolData).forEach((key) => {
    //     const token0 = ethers.utils.getAddress(key.split('-')[0]);
    //     const token1 = ethers.utils.getAddress(key.split('-')[1]);
    //     const newKey = `${token0}-${token1}`;
    //     newObject[newKey] = poolData[key];
    //     console.log({ key, newKey });
    // });
    // fs.writeFileSync(outputFile, JSON.stringify(newObject, null, 2));
}

runSimulation().catch((err) => {
    console.error('Simulation error:', err);
});
