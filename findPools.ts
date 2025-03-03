import { ethers } from 'ethers';

// Replace with your RPC URL
const provider = new ethers.providers.JsonRpcProvider('https://base.gateway.tenderly.co/3WpaBaxXFFKAoUnTIfKUyj');

// Aerodrome factory address
const factoryAddress = '0x420DD381b31aEf6683db6B902084cB0FFECe40Da';

// The event signature for PoolCreated
const poolCreatedSignature = 'PoolCreated(address,address,bool,address,uint256)';
const eventTopic = ethers.utils.id(poolCreatedSignature);

// Your tokens of interest (ensure these are checksummed or lowercased consistently)
const tokensOfInterest = [
    '0x4200000000000000000000000000000000000006', // WETH
    '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', // cbBTC
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
    '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c', // WBTC
].map((addr) => ethers.utils.hexZeroPad(ethers.utils.getAddress(addr), 32));

// Create a filter for logs where token0 (topic[1]) is one of your tokens.
const filterToken0 = {
    address: factoryAddress,
    // fromBlock: 3_200_558,
    fromBlock: 27_005_026,
    toBlock: 27_105_026,
    topics: [
        eventTopic, // Event signature
        tokensOfInterest, // topic1: token0 matches any of these addresses
        null, // no filter for token1 (topic2)
    ],
};

// Create a filter for logs where token1 (topic[2]) is one of your tokens.
const filterToken1 = {
    address: factoryAddress,
    // fromBlock: 3_200_558,
    fromBlock: 27_005_026,
    toBlock: 27_105_026,
    topics: [
        eventTopic, // Event signature
        null, // no filter for token0 (topic[1])
        tokensOfInterest, // topic2: token1 matches any of these addresses
    ],
};

async function getPoolCreatedLogs() {
    try {
        // Query logs matching the token0 filter
        const logsToken0 = await provider.getLogs(filterToken0);

        // Query logs matching the token1 filter
        const logsToken1 = await provider.getLogs(filterToken1);

        // Merge the logs (remove duplicates if necessary)
        const combinedLogs = [...logsToken0, ...logsToken1];

        // Optionally, deduplicate logs based on transactionHash and logIndex:
        const uniqueLogsMap = new Map<string, ethers.providers.Log>();
        for (const log of combinedLogs) {
            const key = `${log.transactionHash}-${log.logIndex}`;
            uniqueLogsMap.set(key, log);
        }
        const uniqueLogs = Array.from(uniqueLogsMap.values());

        console.log('Found logs:', uniqueLogs);
        return uniqueLogs;
    } catch (error) {
        console.error('Error fetching logs:', error);
        return [];
    }
}

getPoolCreatedLogs().catch(console.error);
