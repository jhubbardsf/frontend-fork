import type { TokenMeta } from "@/types";

// Mapping of common networks to their Coingecko platform identifiers.
const networkMapping: Record<string, string> = {
    ethereum: "ethereum",
    bsc: "binance-smart-chain",
    polygon: "polygon-pos",
    base: "base",         // Adjust if Coingecko uses a different identifier for Base network.
    arbitrum: "arbitrum-one" // Commonly used identifier for Arbitrum.
};

/**
 * Retrieves the USD price for a given ERC20 token contract.
 *
 * @param tokenAddress - The ERC20 token contract address.
 * @param network - The network name (default is "ethereum").
 * @returns A promise that resolves to the token's USD price.
 */
export async function getTokenPrice(
    symbol: string
): Promise<number> {
    console.log("Inside GetPrices 2.1");
    // Build the Coingecko API URL.
    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${symbol}`;
    console.log("Inside GetPrices 2.2");
    // Fetch the price data from Coingecko.
    console.log("Inside GetPrices 2.3", url);
    const response = await fetch(url, {
        headers: {
            "X-CMC_PRO_API_KEY": process.env.COINMARKETCAP_API_KEY,
            "Accept": "*/*"
        },
        method: "GET"
    });
    console.log("Inside GetPrices 2.4", JSON.stringify(response, null, 2));
    if (!response.ok) {
        throw new Error(`Error fetching price: ${response.statusText}`);
    }
    console.log("Inside GetPrices2.5");
    const { data } = await response.json();
    console.log("JSH+ returned cmc data: ", { data });

    // The API returns an object where keys are lowercased contract addresses.
    const priceData = data[symbol.toUpperCase()][0].quote.USD.price; //.quote.USD.price;
    console.log({ priceData });
    // return priceData;
    if (!priceData || typeof priceData !== 'number') {
        throw new Error("Token price not found in the API response");
    }

    return priceData;
}

const sampleReturb = {
    "status": {
        "timestamp": "2025-02-25T23:53:57.397Z",
        "error_code": 0,
        "error_message": null,
        "elapsed": 128,
        "credit_count": 1,
        "notice": null
    },
    "data": {
        "ETH": [
            {
                "id": 1027,
                "name": "Ethereum",
                "symbol": "ETH",
                "slug": "ethereum",
                "num_market_pairs": 9950,
                "date_added": "2015-08-07T00:00:00.000Z",
                "tags": [
                    {
                        "slug": "pos",
                        "name": "PoS",
                        "category": "ALGORITHM"
                    },
                    {
                        "slug": "smart-contracts",
                        "name": "Smart Contracts",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "ethereum-ecosystem",
                        "name": "Ethereum Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "coinbase-ventures-portfolio",
                        "name": "Coinbase Ventures Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "three-arrows-capital-portfolio",
                        "name": "Three Arrows Capital Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "polychain-capital-portfolio",
                        "name": "Polychain Capital Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "heco-ecosystem",
                        "name": "HECO Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "binance-labs-portfolio",
                        "name": "Binance Labs Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "avalanche-ecosystem",
                        "name": "Avalanche Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "solana-ecosystem",
                        "name": "Solana Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "blockchain-capital-portfolio",
                        "name": "Blockchain Capital Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "boostvc-portfolio",
                        "name": "BoostVC Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "cms-holdings-portfolio",
                        "name": "CMS Holdings Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "dcg-portfolio",
                        "name": "DCG Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "dragonfly-capital-portfolio",
                        "name": "DragonFly Capital Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "electric-capital-portfolio",
                        "name": "Electric Capital Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "fabric-ventures-portfolio",
                        "name": "Fabric Ventures Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "framework-ventures-portfolio",
                        "name": "Framework Ventures Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "hashkey-capital-portfolio",
                        "name": "Hashkey Capital Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "kenetic-capital-portfolio",
                        "name": "Kenetic Capital Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "huobi-capital-portfolio",
                        "name": "Huobi Capital Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "alameda-research-portfolio",
                        "name": "Alameda Research Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "a16z-portfolio",
                        "name": "a16z Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "1confirmation-portfolio",
                        "name": "1Confirmation Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "winklevoss-capital-portfolio",
                        "name": "Winklevoss Capital Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "usv-portfolio",
                        "name": "USV Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "placeholder-ventures-portfolio",
                        "name": "Placeholder Ventures Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "pantera-capital-portfolio",
                        "name": "Pantera Capital Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "multicoin-capital-portfolio",
                        "name": "Multicoin Capital Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "paradigm-portfolio",
                        "name": "Paradigm Portfolio",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "tezos-ecosystem",
                        "name": "Tezos Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "near-protocol-ecosystem",
                        "name": "Near Protocol Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "velas-ecosystem",
                        "name": "Velas Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "ethereum-pow-ecosystem",
                        "name": "Ethereum PoW Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "osmosis-ecosystem",
                        "name": "Osmosis Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "layer-1",
                        "name": "Layer 1",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "ftx-bankruptcy-estate",
                        "name": "FTX Bankruptcy Estate ",
                        "category": "CATEGORY"
                    },
                    {
                        "slug": "zksync-era-ecosystem",
                        "name": "zkSync Era Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "viction-ecosystem",
                        "name": "Viction Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "klaytn-ecosystem",
                        "name": "Klaytn Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "sora-ecosystem",
                        "name": "Sora Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "rsk-rbtc-ecosystem",
                        "name": "RSK RBTC Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "starknet-ecosystem",
                        "name": "Starknet Ecosystem",
                        "category": "PLATFORM"
                    },
                    {
                        "slug": "world-liberty-financial-portfolio",
                        "name": "World Liberty Financial Portfolio",
                        "category": "CATEGORY"
                    }
                ],
                "max_supply": null,
                "circulating_supply": 120573726.51256987,
                "total_supply": 120573726.51256987,
                "is_active": 1,
                "infinite_supply": true,
                "platform": null,
                "cmc_rank": 2,
                "is_fiat": 0,
                "self_reported_circulating_supply": null,
                "self_reported_market_cap": null,
                "tvl_ratio": null,
                "last_updated": "2025-02-25T23:52:00.000Z",
                "quote": {
                    "USD": {
                        "price": 2495.590694204652,
                        "volume_24h": 39690464760.61106,
                        "volume_change_24h": 40.7699,
                        "percent_change_1h": -0.4713075,
                        "percent_change_24h": -0.38493311,
                        "percent_change_7d": -6.46557779,
                        "percent_change_30d": -22.97122321,
                        "percent_change_60d": -25.00847637,
                        "percent_change_90d": -31.92574447,
                        "market_cap": 300902669850.3461,
                        "market_cap_dominance": 10.2753,
                        "fully_diluted_market_cap": 300902669850.35,
                        "tvl": null,
                        "last_updated": "2025-02-25T23:52:00.000Z"
                    }
                }
            },
            {
                "id": 29991,
                "name": "The Infinite Garden",
                "symbol": "ETH",
                "slug": "the-infinite-garden",
                "num_market_pairs": 3,
                "date_added": "2024-03-20T07:20:55.000Z",
                "tags": [
                    {
                        "slug": "memes",
                        "name": "Memes",
                        "category": "INDUSTRY"
                    },
                    {
                        "slug": "ethereum-ecosystem",
                        "name": "Ethereum Ecosystem",
                        "category": "PLATFORM"
                    }
                ],
                "max_supply": 10000000,
                "circulating_supply": 0,
                "total_supply": 10000000,
                "platform": {
                    "id": 1027,
                    "name": "Ethereum",
                    "symbol": "ETH",
                    "slug": "ethereum",
                    "token_address": "0x5e21d1ee5cf0077b314c381720273ae82378d613"
                },
                "is_active": 1,
                "infinite_supply": false,
                "cmc_rank": 5124,
                "is_fiat": 0,
                "self_reported_circulating_supply": 10000000,
                "self_reported_market_cap": 48731.053182918266,
                "tvl_ratio": null,
                "last_updated": "2025-02-25T23:52:00.000Z",
                "quote": {
                    "USD": {
                        "price": 0.004873105318291827,
                        "volume_24h": 14967.53209966,
                        "volume_change_24h": 0,
                        "percent_change_1h": 0,
                        "percent_change_24h": 71.20061586,
                        "percent_change_7d": 79.70324979,
                        "percent_change_30d": 7.17715698,
                        "percent_change_60d": -3.80660006,
                        "percent_change_90d": -16.9722355,
                        "market_cap": 0,
                        "market_cap_dominance": 0,
                        "fully_diluted_market_cap": 48731.05,
                        "tvl": null,
                        "last_updated": "2025-02-25T23:52:00.000Z"
                    }
                }
            },
            {
                "id": 33661,
                "name": "THE TICKER IS",
                "symbol": "ETH",
                "slug": "the-ticker-is",
                "num_market_pairs": 1,
                "date_added": "2024-10-28T05:06:52.000Z",
                "tags": [
                    {
                        "slug": "ethereum-ecosystem",
                        "name": "Ethereum Ecosystem",
                        "category": "PLATFORM"
                    }
                ],
                "max_supply": 100000000000,
                "circulating_supply": 0,
                "total_supply": 100000000000,
                "platform": {
                    "id": 1027,
                    "name": "Ethereum",
                    "symbol": "ETH",
                    "slug": "ethereum",
                    "token_address": "0xC94729d93cB660BB346ce0084393015F99810919"
                },
                "is_active": 1,
                "infinite_supply": false,
                "cmc_rank": 10512,
                "is_fiat": 0,
                "self_reported_circulating_supply": 100000000000,
                "self_reported_market_cap": 10337.99577855728,
                "tvl_ratio": null,
                "last_updated": "2025-02-25T23:52:00.000Z",
                "quote": {
                    "USD": {
                        "price": 1.033799577855728e-7,
                        "volume_24h": 0,
                        "volume_change_24h": -100,
                        "percent_change_1h": 0,
                        "percent_change_24h": 0,
                        "percent_change_7d": -6.73581681,
                        "percent_change_30d": -28.67767852,
                        "percent_change_60d": -50.76100828,
                        "percent_change_90d": -51.1309607,
                        "market_cap": 0,
                        "market_cap_dominance": 0,
                        "fully_diluted_market_cap": 10338,
                        "tvl": null,
                        "last_updated": "2025-02-25T23:52:00.000Z"
                    }
                }
            }
        ]
    }
}