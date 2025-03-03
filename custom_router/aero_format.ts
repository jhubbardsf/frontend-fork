import * as fs from 'fs';
import * as path from 'path';

function main() {
    // Input file containing the combined logs
    const inputFile = 'aerodrome_pools_all.json';
    // Output file for the combined result
    const outputFile = 'aerodrome_pools_final.json';

    // Read and parse the JSON file
    const rawData = fs.readFileSync(path.join(process.cwd(), inputFile), 'utf8');
    const entries = JSON.parse(rawData) as any[];

    // This object will hold the final combined data
    // Keys will be in the format: token0-token1
    // Values will either be a single object or an array of objects
    const combinedPools: { [key: string]: any } = {};

    // Process each entry
    for (const entry of entries) {
        const decoded = entry.decodedEvent;
        const token0 = decoded.token0;
        const token1 = decoded.token1;
        // Form the key as "{token0}-{token1}"
        const key = `${token0}-${token1}`;

        // Build the pool object; convert noname to a number
        const poolData = {
            stablepair: decoded.stable,
            poolAddress: decoded.pool,
            noname: Number(decoded.noname),
        };

        // If this key does not exist, add it; otherwise, handle multiple pools.
        if (!(key in combinedPools)) {
            combinedPools[key] = poolData;
        } else {
            // If already an array, push the new poolData.
            if (Array.isArray(combinedPools[key])) {
                combinedPools[key].push(poolData);
            } else {
                // Convert the existing object into an array along with the new one.
                combinedPools[key] = [combinedPools[key], poolData];
            }
        }
    }

    // Write the combined result to a new JSON file
    fs.writeFileSync(outputFile, JSON.stringify(combinedPools, null, 2));
    console.log(`Combined pool data written to ${outputFile}`);
}

main();
