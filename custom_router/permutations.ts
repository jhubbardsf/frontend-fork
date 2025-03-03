function getSwapRoutes(tokens: string[]): string[][] {
    const permutations = (arr: string[]): string[][] => {
        if (arr.length === 0) return [[]];
        return arr.flatMap((t, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [t, ...p]));
    };

    const TokenA = 'TokenA';
    const TokenB = 'TokenB';
    const allRoutes: string[][] = [];

    // Generate all subsets of the intermediary tokens
    const generateSubsets = (arr: string[]): string[][] => {
        return arr.reduce<string[][]>(
            (subsets, token) => subsets.concat(subsets.map((set) => [...set, token])),
            [[]], // Start with an empty set
        );
    };

    const subsets = generateSubsets(tokens);

    // Remove the empty subset (since it just represents TokenA -> TokenB)
    subsets.shift();

    // Generate all permutations of each subset
    for (const subset of subsets) {
        for (const perm of permutations(subset)) {
            allRoutes.push([TokenA, ...perm, TokenB]);
        }
    }

    return allRoutes;
}

// Example usage
const intermediaryTokens = [
    'Token1_100',
    'Token1_500',
    'Token1_3000',
    'Token1_10000',
    'Token2_100',
    'Token2_500',
    'Token2_3000',
    'Token2_10000',
    'Token3_100',
    'Token3_500',
    'Token3_3000',
    'Token3_10000',
    // 'Token4_100',
    // 'Token4_500',
    // 'Token4_3000',
    // 'Token4_10000',
];
const swapRoutes = getSwapRoutes(intermediaryTokens);

// Output result
console.log(`Total possible swap routes: ${swapRoutes.length}`);
// console.log(swapRoutes.map((route) => route.join(' -> ')).join('\n'));
