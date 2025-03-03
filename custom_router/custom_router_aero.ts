import { ethers } from 'ethers';
import poolData from './aerodrome_pools_final.json';
import { MULTICALL_ADDRESS, MULTICALL_ABI_ETHERS } from './constants';

// ----------------------------
// Configuration & Setup
// ----------------------------

const RPC_URL = 'https://base.gateway.tenderly.co/3WpaBaxXFFKAoUnTIfKUyj';
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const multicall = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL_ABI_ETHERS, provider);

// Token & intermediary addresses
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const WBTC_ADDRESS = '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c';
const USDBC_ADDRESS = '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA';

// For this simulation, TOKEN_A is USDC and TOKEN_B is cBBTC.
const TOKEN_A_ADDRESS = USDC_ADDRESS;
const TOKEN_B_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';

// For logging/readability:
const nameMap: { [address: string]: string } = {
    [TOKEN_A_ADDRESS]: 'USDC',
    [TOKEN_B_ADDRESS]: 'cBBTC',
    [WETH_ADDRESS]: 'WETH',
    [WBTC_ADDRESS]: 'wBTC',
    [USDBC_ADDRESS]: 'USDbc',
};

// List of intermediary tokens
const intermediaries: string[] = [USDC_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS, USDBC_ADDRESS];

// ----------------------------
// Contract Interfaces
// ----------------------------

const aerodromePoolABI = ['function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256)'];
const aerodromePoolInterface = new ethers.utils.Interface(aerodromePoolABI);

// ----------------------------
// ERC20 & Decimals Helper
// ----------------------------

const ERC20_ABI = ['function decimals() view returns (uint8)'];
const decimalsCache: { [address: string]: number } = {};

/**
 * Returns the decimals for a given token address, caching the result.
 */
async function getTokenDecimals(tokenAddress: string): Promise<number> {
    if (decimalsCache[tokenAddress]) return decimalsCache[tokenAddress];
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const decimals = await tokenContract.decimals();
    decimalsCache[tokenAddress] = decimals;
    return decimals;
}

// ----------------------------
// Helper Functions
// ----------------------------

/**
 * Returns a normalized pool key and a flag indicating if the key is reversed.
 * The key is in the form "tokenA-tokenB" (using checksummed addresses).
 */
function getPoolKey(tokenA: string, tokenB: string): { key: string; reversed: boolean } {
    const normA = ethers.utils.getAddress(tokenA);
    const normB = ethers.utils.getAddress(tokenB);
    const directKey = `${normA}-${normB}`;
    const reverseKey = `${normB}-${normA}`;
    if (poolData[directKey]) {
        return { key: directKey, reversed: false };
    } else if (poolData[reverseKey]) {
        return { key: reverseKey, reversed: true };
    } else {
        return { key: directKey, reversed: false };
    }
}

/**
 * Uses multicall to batch call getAmountOut on all pools for a given token pair,
 * and returns the highest output.
 */
async function simulateHop(
    tokenIn: string,
    tokenOut: string,
    amountIn: ethers.BigNumber,
): Promise<ethers.BigNumber | null> {
    const { key, reversed } = getPoolKey(tokenIn, tokenOut);
    let pools = poolData[key];
    if (!pools) {
        console.log(`No pool found for pair ${ethers.utils.getAddress(tokenIn)}-${ethers.utils.getAddress(tokenOut)}`);
        return null;
    }
    if (!Array.isArray(pools)) pools = [pools];
    if (reversed) console.log(`Using reversed pool for pair ${tokenIn}-${tokenOut}`);

    const calls = pools.map((pool: any) => ({
        target: pool.poolAddress,
        allowFailure: true,
        callData: aerodromePoolInterface.encodeFunctionData('getAmountOut', [amountIn, tokenIn]),
    }));

    try {
        type Aggregate3Response = { success: boolean; returnData: string };
        const results: Aggregate3Response[] = await multicall.callStatic.aggregate3(calls);
        let bestOutput: ethers.BigNumber | null = null;
        results.forEach((res, i) => {
            if (res.success) {
                try {
                    const decoded = aerodromePoolInterface.decodeFunctionResult('getAmountOut', res.returnData);
                    const output: ethers.BigNumber = decoded[0];
                    if (bestOutput === null || output.gt(bestOutput)) bestOutput = output;
                } catch (e) {
                    console.error(`Error decoding result for pool ${pools[i].poolAddress}:`, e);
                }
            }
        });
        return bestOutput;
    } catch (e) {
        console.error(`Multicall failed for hop ${nameMap[tokenIn]}-${nameMap[tokenOut]}:`, e);
        return null;
    }
}

/**
 * Chains simulateHop calls for each hop in the route. If any hop fails, the route fails.
 */
async function simulateRoute(route: string[], initialAmount: ethers.BigNumber): Promise<ethers.BigNumber | null> {
    let amount = initialAmount;
    for (let i = 0; i < route.length - 1; i++) {
        const output = await simulateHop(route[i], route[i + 1], amount);
        if (output === null) {
            console.log(
                `Route [${route.map((addr) => nameMap[addr] || addr).join(' -> ')}] fails at hop ${route[i]} -> ${route[i + 1]} (${nameMap[route[i]]} -> ${nameMap[route[i + 1]]})`,
            );
            return null;
        }
        amount = output;
    }
    return amount;
}

/**
 * Generates all unique routes from tokenA to tokenB using 0 to all intermediaries.
 */
function generateRoutes(tokenA: string, tokenB: string, intermediaries: string[]): string[][] {
    const routes: string[][] = [];
    routes.push([tokenA, tokenB]); // Direct route.
    for (let count = 1; count <= intermediaries.length; count++) {
        const perms = getPermutations(intermediaries, count);
        perms.forEach((perm) => routes.push([tokenA, ...perm, tokenB]));
    }
    const seen = new Set<string>();
    const unique: string[][] = [];
    routes.forEach((route) => {
        const key = route.join('->');
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(route);
        }
    });
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
        perms.forEach((perm) => results.push([arr[i], ...perm]));
    }
    return results;
}

// ----------------------------
// Main Simulation Function
// ----------------------------

async function runSimulation() {
    const amountInHuman = '1000.0'; // For example, 1000 USDC.
    const tokenADecimals = await getTokenDecimals(TOKEN_A_ADDRESS);
    const initialAmount = ethers.utils.parseUnits(amountInHuman, tokenADecimals);

    const routes = generateRoutes(TOKEN_A_ADDRESS, TOKEN_B_ADDRESS, intermediaries);
    console.log(`Total unique routes: ${routes.length}`);

    const simulationResults = await Promise.all(
        routes.map(async (route) => {
            const output = await simulateRoute(route, initialAmount);
            return { route, output };
        }),
    );

    const validRoutes = simulationResults.filter((res) => res.output !== null) as {
        route: string[];
        output: ethers.BigNumber;
    }[];

    validRoutes.sort((a, b) => (a.output.eq(b.output) ? 0 : a.output.gt(b.output) ? -1 : 1));
    const TOKEN_B_DECIMALS = await getTokenDecimals(TOKEN_B_ADDRESS);
    console.log('Top 5 routes by output amount:');
    validRoutes.slice(0, 5).forEach((res, i) => {
        console.log(`Route ${i + 1}: ${res.route.map((addr) => nameMap[addr] || addr).join(' -> ')}`);
        console.log(
            `  Output: ${ethers.utils.formatUnits(res.output, TOKEN_B_DECIMALS)} (raw: ${res.output.toString()})`,
        );
        for (let i = 0; i < res.route.length - 1; i++) {
            const poolKey = getPoolKey(res.route[i], res.route[i + 1]);
            console.log(`Pool info for hop ${i + 1} is ${JSON.stringify(poolData[poolKey.key])}`);
        }
    });
}

runSimulation().catch((err) => {
    console.error('Simulation error:', err);
});
