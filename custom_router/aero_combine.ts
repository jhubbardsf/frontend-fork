import * as fs from 'fs';
import * as path from 'path';

// Pattern to match the pool files
const filePattern = /^aerodrome_pools_.*\.json$/;

// Get the list of JSON files in the current directory matching the pattern.
const files = fs.readdirSync(process.cwd()).filter((file) => filePattern.test(file));

console.log('Found files:', files);

let combinedData: any[] = [];

// Loop through each file, parse its JSON content, and merge the arrays.
for (const file of files) {
    try {
        const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
        const json = JSON.parse(content);
        if (Array.isArray(json)) {
            combinedData = combinedData.concat(json);
        } else {
            console.error(`${file} does not contain an array; skipping.`);
        }
    } catch (err) {
        console.error(`Error processing file ${file}: ${err}`);
    }
}

// Deduplicate based on transactionHash and logIndex.
const deduped: any[] = [];
const seen = new Set<string>();

for (const item of combinedData) {
    // Assumes each item has transactionHash and logIndex properties.
    const key = `${item.transactionHash}-${item.logIndex}`;
    if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
    }
}

const outputFileName = 'aerodrome_pools_all.json';
fs.writeFileSync(outputFileName, JSON.stringify(deduped, null, 2));
console.log(`Combined ${combinedData.length} entries, deduplicated to ${deduped.length} entries.`);
console.log(`Output written to ${outputFileName}`);
