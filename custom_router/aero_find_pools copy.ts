import { ethers } from 'ethers';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Replace with your RPC URL
const provider = new ethers.providers.JsonRpcProvider('https://base.gateway.tenderly.co/3WpaBaxXFFKAoUnTIfKUyj');

// Aerodrome factory address
const factoryAddress = '0x420DD381b31aEf6683db6B902084cB0FFECe40Da';

// Define the ABI for the PoolCreated event.
// Note: The event has three indexed parameters (token0, token1, stable).
const poolCreatedABI = [
    'event PoolCreated(address indexed token0, address indexed token1, bool indexed stable, address pool, uint256 noname)',
];
const poolCreatedInterface = new ethers.utils.Interface(poolCreatedABI);

// Compute the event topic using the event signature
const eventTopic = ethers.utils.id('PoolCreated(address,address,bool,in24,address)');

// Your tokens of interest (ensure these are checksummed, then padded to 32 bytes)
const tokensOfInterest = [
    '0x4200000000000000000000000000000000000006', // WETH
    '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', // cbBTC
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
    '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c', // WBTC
].map((addr) => ethers.utils.hexZeroPad(ethers.utils.getAddress(addr), 32));

// Set the overall start and end block numbers
const originalStartBlock = 27_000_000;
const originalEndBlock = 28_000_000;

// Define the chunk size (250k blocks)
const CHUNK_SIZE = 250_000;

async function getLogsForChunk(fromBlock: number, toBlock: number): Promise<ethers.providers.Log[]> {
    // Build filters for token0 and token1 for this chunk
    const filterToken0 = {
        address: factoryAddress,
        fromBlock,
        toBlock,
        topics: [
            eventTopic, // topic0: event signature
            tokensOfInterest, // topic1: token0 matches any of these padded addresses
            null, // topic2: no filtering on token1
            null, // topic3: no filtering on stable
        ],
    };

    const filterToken1 = {
        address: factoryAddress,
        fromBlock,
        toBlock,
        topics: [
            eventTopic, // topic0: event signature
            null, // topic1: no filtering on token0
            tokensOfInterest, // topic2: token1 matches any of these padded addresses
            null, // topic3: no filtering on stable
        ],
    };

    // Query logs concurrently for both filters
    const [logsToken0, logsToken1] = await Promise.all([
        provider.getLogs(filterToken0),
        provider.getLogs(filterToken1),
    ]);
    return [...logsToken0, ...logsToken1];
}

async function getAllPoolCreatedLogs(): Promise<ethers.providers.Log[]> {
    const allLogs: ethers.providers.Log[] = [];

    // Loop from originalStartBlock to originalEndBlock in increments of CHUNK_SIZE
    for (let currentStart = originalStartBlock; currentStart <= originalEndBlock; currentStart += CHUNK_SIZE) {
        const currentEnd = Math.min(currentStart + CHUNK_SIZE - 1, originalEndBlock);
        console.log(`Fetching logs for block range: ${currentStart}-${currentEnd}`);
        const chunkStartTime = Date.now();
        try {
            const chunkLogs = await getLogsForChunk(currentStart, currentEnd);
            const chunkDuration = Date.now() - chunkStartTime;
            console.log(`Found ${chunkLogs.length} logs in chunk. Took ${chunkDuration} ms.`);
            allLogs.push(...chunkLogs);
        } catch (error: any) {
            console.error(`Error fetching logs for range ${currentStart}-${currentEnd}: ${error.message}`);
            // Optionally, you could retry here or just continue.
        }
    }
    return allLogs;
}

// Helper function to format block numbers (in millions) for file naming.
// If the number is an integer, append "_0" (e.g., 14 becomes "14_0").
// Otherwise, replace the decimal point with an underscore.
function formatMillions(num: number): string {
    if (Number.isInteger(num)) {
        return `${num}_0`;
    } else {
        return num.toString().replace('.', '_');
    }
}

async function main() {
    const rawLogs = await getAllPoolCreatedLogs();

    // Deduplicate logs based on transactionHash and logIndex.
    const uniqueLogsMap = new Map<string, ethers.providers.Log>();
    for (const log of rawLogs) {
        const key = `${log.transactionHash}-${log.logIndex}`;
        uniqueLogsMap.set(key, log);
    }
    const uniqueLogs = Array.from(uniqueLogsMap.values());
    console.log(`Total unique logs found: ${uniqueLogs.length}`);

    // Decode logs using the interface.
    const decodedLogs = uniqueLogs.map((log) => {
        const parsed = poolCreatedInterface.parseLog(log);
        return {
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex,
            decodedEvent: {
                token0: parsed.args.token0,
                token1: parsed.args.token1,
                stable: parsed.args.stable,
                pool: parsed.args.pool,
                noname: parsed.args.noname.toString(),
            },
        };
    });

    // Build the file name using the original block range (converted to millions)
    const startMillions = originalStartBlock / 1e6;
    const endMillions = originalEndBlock / 1e6;
    const fileName = `aerodrome_pools_${formatMillions(startMillions)}-${formatMillions(endMillions)}.json`;

    fs.writeFileSync(fileName, JSON.stringify(decodedLogs, null, 2));
    console.log(`Decoded logs written to ${fileName}`);
}

main().catch(console.error);
