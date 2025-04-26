import { BigNumber } from 'ethers';
import { base } from 'viem/chains';
import { TokenMeta, UniswapTokenList, ValidAsset, StoreState } from '../../types';
import {
    BITCOIN_DECIMALS,
    DEPLOYMENT_TYPE,
    DEVNET_BASE_CBBTC_TOKEN_ADDRESS,
    DEVNET_BASE_CHAIN_ID,
    DEVNET_BASE_ETHERSCAN_URL,
    DEVNET_BASE_RIFT_EXCHANGE_ADDRESS,
    DEVNET_BASE_RPC_URL,
    DEVNET_DATA_ENGINE_URL,
    MAINNET_BASE_CBBTC_TOKEN_ADDRESS,
    MAINNET_BASE_CHAIN_ID,
    MAINNET_BASE_ETHERSCAN_URL,
    MAINNET_BASE_RIFT_EXCHANGE_ADDRESS,
    MAINNET_BASE_RPC_URL,
    MAINNET_DATA_ENGINE_URL,
    TESTNET_BASE_CBBTC_TOKEN_ADDRESS,
    TESTNET_BASE_CHAIN_ID,
    TESTNET_BASE_ETHERSCAN_URL,
    TESTNET_BASE_RIFT_EXCHANGE_ADDRESS,
    TESTNET_BASE_RPC_URL,
    TESTNET_DATA_ENGINE_URL,
} from '../../utils/constants';
import { getDeploymentValue } from '../../utils/deploymentUtils';
import riftExchangeABI from '../../abis/RiftExchange.json';
import { Coinbase_BTC_Icon } from '../../components/other/SVGs';
import combinedTokenData from '../../json/tokenData.json';
import { StateCreator } from 'zustand';

/**
 * Deduplicates tokens in a token list to ensure only unique tokens per chain by address
 */
function deduplicateTokens(tokenList: UniswapTokenList): UniswapTokenList {
    const addressChainMap = new Map<string, TokenMeta>();

    tokenList.tokens.forEach((token) => {
        const key = `${token.chainId}-${token.address.toLowerCase()}`;
        if (!addressChainMap.has(key)) {
            addressChainMap.set(key, token);
        }
    });

    // Sort tokens alphabetically by symbol after deduplication
    const sortedTokens = Array.from(addressChainMap.values()).sort((a, b) =>
        a.symbol.toUpperCase().localeCompare(b.symbol.toUpperCase()),
    );

    return {
        ...tokenList,
        tokens: sortedTokens,
    };
}

/**
 * Merges a Uniswap token list into an existing record of valid assets.
 */
export function mergeTokenListIntoValidAssets(
    tokenList: UniswapTokenList,
    defaultAssetTemplate: ValidAsset,
    existingAssets: Record<string, ValidAsset> = {},
): Record<string, ValidAsset> {
    const convertIpfsUri = (uri: string | undefined, gateway: string = 'https://ipfs.io/ipfs/') => {
        if (!uri) return null;
        if (uri.startsWith('ipfs://')) {
            // Remove the "ipfs://" prefix.
            let cid = uri.slice('ipfs://'.length);
            // If the CID starts with "ipfs/", remove that segment.
            if (cid.startsWith('ipfs/')) {
                cid = cid.slice('ipfs/'.length);
            }
            return gateway + cid;
        }
        return uri;
    };

    // Start with the provided existing assets
    const mergedAssets: Record<string, ValidAsset> = { ...existingAssets };

    tokenList.tokens.forEach((token) => {
        // Use a unique key based on chain ID and address
        const key = `${token.chainId}-${token.address.toLowerCase()}`;

        // The new asset is built by taking the template and overriding
        // properties with those from the token.
        mergedAssets[key] = {
            ...defaultAssetTemplate,
            ...token,
            // Override with token-specific data:
            display_name: token.symbol,
            tokenAddress: token.address,
            // If available, use the token's logo URI; otherwise, fall back to the template icon.
            icon_svg: convertIpfsUri(token.logoURI) || defaultAssetTemplate.icon_svg,
            fromTokenList: true,
        };
    });

    return mergedAssets;
}

/**
 * Helper function to find an asset key by name in the validAssets Record
 */
function findAssetKeyByName(assets: Record<string, ValidAsset>, name: string, chainId: number): string | undefined {
    return Object.keys(assets).find(
        (key) => assets[key].name === name && (assets[key].chainId === chainId || !assets[key].chainId),
    );
}

// Initialize assets with default values
const initializeAssets = () => {
    // Get the current chain ID
    const currentChainId = getDeploymentValue(
        DEPLOYMENT_TYPE,
        MAINNET_BASE_CHAIN_ID,
        TESTNET_BASE_CHAIN_ID,
        DEVNET_BASE_CHAIN_ID,
    );

    // Create CoinbaseBTC asset with proper fields
    const coinbaseBtcAddress = getDeploymentValue(
        DEPLOYMENT_TYPE,
        MAINNET_BASE_CBBTC_TOKEN_ADDRESS,
        TESTNET_BASE_CBBTC_TOKEN_ADDRESS,
        DEVNET_BASE_CBBTC_TOKEN_ADDRESS,
    ).toLowerCase();

    const coinbaseBtc = {
        name: 'CoinbaseBTC',
        display_name: 'cbBTC',
        tokenAddress: coinbaseBtcAddress,
        dataEngineUrl: getDeploymentValue(
            DEPLOYMENT_TYPE,
            MAINNET_DATA_ENGINE_URL,
            TESTNET_DATA_ENGINE_URL,
            DEVNET_DATA_ENGINE_URL,
        ),
        decimals: BITCOIN_DECIMALS,
        riftExchangeContractAddress: getDeploymentValue(
            DEPLOYMENT_TYPE,
            MAINNET_BASE_RIFT_EXCHANGE_ADDRESS,
            TESTNET_BASE_RIFT_EXCHANGE_ADDRESS,
            DEVNET_BASE_RIFT_EXCHANGE_ADDRESS,
        ),
        riftExchangeAbi: riftExchangeABI.abi,
        chainDetails: base, // ONLY USE FOR MAINNET SWITCHING NETWORKS WITH METAMASK
        contractRpcURL: getDeploymentValue(
            DEPLOYMENT_TYPE,
            MAINNET_BASE_RPC_URL,
            TESTNET_BASE_RPC_URL,
            DEVNET_BASE_RPC_URL,
        ),
        etherScanBaseUrl: getDeploymentValue(
            DEPLOYMENT_TYPE,
            MAINNET_BASE_ETHERSCAN_URL,
            TESTNET_BASE_ETHERSCAN_URL,
            DEVNET_BASE_ETHERSCAN_URL,
        ),
        proverFee: BigNumber.from(0),
        releaserFee: BigNumber.from(0),
        icon_svg: Coinbase_BTC_Icon,
        bg_color: '#2E59BB',
        border_color: '#1C61FD',
        border_color_light: '#3B70E8',
        dark_bg_color: 'rgba(9, 36, 97, 0.3)',
        light_text_color: '#365B9F',
        exchangeRateInTokenPerBTC: 1.001,
        priceUSD: null,
        totalAvailableLiquidity: BigNumber.from(0),
        connectedUserBalanceRaw: BigNumber.from(0),
        connectedUserBalanceFormatted: '0',
        symbol: 'cbBTC',
        address: coinbaseBtcAddress,
        chainId: currentChainId,
        logoURI: 'https://assets.coingecko.com/coins/images/40143/standard/cbbtc.webp',
    };

    // Off-chain BTC is a special case
    const btc = {
        name: 'BTC',
        display_name: 'BTC',
        decimals: 8,
        icon_svg: null,
        bg_color: '#c26920',
        border_color: '#FFA04C',
        border_color_light: '#FFA04C',
        dark_bg_color: '#372412',
        light_text_color: '#7d572e',
        priceUSD: 88000, // TEST
        chainId: 0, // Non-EVM chain
        address: 'bitcoin', // Placeholder for off-chain BTC
    };

    // Use the new key format
    const initialValidAssets: Record<string, ValidAsset> = {
        [`${currentChainId}-${coinbaseBtcAddress}`]: coinbaseBtc,
        '0-bitcoin': btc,
    };

    return {
        initialValidAssets,
        coinbaseBtc,
        currentChainId,
    };
};

// Asset slice state and actions
export interface AssetSlice {
    validAssets: Record<string, ValidAsset>;
    selectedInputAsset: ValidAsset;
    isPayingFeesInBTC: boolean;

    // Actions
    setValidAssets: (assets: Record<string, ValidAsset>) => void;
    setSelectedInputAsset: (asset: ValidAsset) => void;
    setIsPayingFeesInBTC: (isPayingFeesInBTC: boolean) => void;
    mergeValidAssets: (newAssets: Record<string, ValidAsset>) => void;
    updatePriceUSD: (assetKey: string, newPrice: number) => void;
    updateTotalAvailableLiquidity: (assetKey: string, newLiquidity: BigNumber) => void;
    updateConnectedUserBalanceRaw: (assetKey: string, newBalance: BigNumber) => void;
    updateConnectedUserBalanceFormatted: (assetKey: string, newBalance: string) => void;
    updatePriceForAsset: (asset: ValidAsset, newPrice: number) => void;

    // Helper functions
    findAssetByName: (name: string, chainId?: number) => ValidAsset | undefined;
    getAssetKey: (asset: ValidAsset) => string;
}

// Create the asset slice
export const createAssetSlice: StateCreator<StoreState, [], [], AssetSlice> = (set, get) => {
    const { initialValidAssets, coinbaseBtc, currentChainId } = initializeAssets();

    // Create merged assets with token list
    const updatedValidAssets = mergeTokenListIntoValidAssets(
        deduplicateTokens(combinedTokenData as UniswapTokenList),
        coinbaseBtc,
        initialValidAssets,
    );

    return {
        validAssets: updatedValidAssets,
        selectedInputAsset: coinbaseBtc,
        isPayingFeesInBTC: true,

        setValidAssets: (assets) => set({ validAssets: assets }),
        setSelectedInputAsset: (asset) => set({ selectedInputAsset: asset }),
        setIsPayingFeesInBTC: (isPayingFeesInBTC) => set({ isPayingFeesInBTC }),

        mergeValidAssets: (newAssets) =>
            set((state) => {
                const mergedAssets = { ...state.validAssets };

                Object.entries(newAssets).forEach(([key, asset]) => {
                    const validAsset = asset as ValidAsset;

                    // Try to create a proper key if needed
                    let properKey = key;

                    if (!key.includes('-') && validAsset.address && validAsset.chainId) {
                        properKey = `${validAsset.chainId}-${validAsset.address.toLowerCase()}`;
                    } else if (key === 'BTC') {
                        properKey = '0-bitcoin';
                    } else if (key === 'CoinbaseBTC') {
                        const existingKey = findAssetKeyByName(state.validAssets, 'CoinbaseBTC', currentChainId);
                        if (existingKey) {
                            properKey = existingKey;
                        }
                    }

                    // Add or update the asset
                    mergedAssets[properKey] = validAsset;
                });

                return { validAssets: mergedAssets };
            }),

        updatePriceUSD: (assetKey, newPrice) => {
            return set((state) => {
                const assets = { ...state.validAssets };

                // Try to find the correct key if assetKey is a name
                let actualKey = assetKey;

                if (!assetKey.includes('-')) {
                    // Special handling for BTC and CoinbaseBTC
                    if (assetKey === 'BTC') {
                        actualKey = '0-bitcoin';
                    } else if (assetKey === 'CoinbaseBTC') {
                        actualKey = findAssetKeyByName(assets, 'CoinbaseBTC', currentChainId) || assetKey;
                    } else {
                        // Try to find by name
                        actualKey = findAssetKeyByName(assets, assetKey, currentChainId) || assetKey;
                    }
                }

                // Update the asset if we have the key
                if (assets[actualKey]) {
                    assets[actualKey] = { ...assets[actualKey], priceUSD: newPrice };
                }

                return { validAssets: assets };
            });
        },

        updateTotalAvailableLiquidity: (assetKey, newLiquidity) =>
            set((state) => {
                const assets = { ...state.validAssets };

                // Try to find the correct key if assetKey is a name
                let actualKey = assetKey;

                if (!assetKey.includes('-')) {
                    // Special handling for BTC and CoinbaseBTC
                    if (assetKey === 'BTC') {
                        actualKey = '0-bitcoin';
                    } else if (assetKey === 'CoinbaseBTC') {
                        actualKey = findAssetKeyByName(assets, 'CoinbaseBTC', currentChainId) || assetKey;
                    } else {
                        // Try to find by name
                        actualKey = findAssetKeyByName(assets, assetKey, currentChainId) || assetKey;
                    }
                }

                // Update the asset if we have the key
                if (assets[actualKey]) {
                    assets[actualKey] = { ...assets[actualKey], totalAvailableLiquidity: newLiquidity };
                }

                return { validAssets: assets };
            }),

        updateConnectedUserBalanceRaw: (assetKey, newBalance) =>
            set((state) => {
                const assets = { ...state.validAssets };

                // Try to find the correct key if assetKey is a name
                let actualKey = assetKey;

                if (!assetKey.includes('-')) {
                    // Special handling for BTC and CoinbaseBTC
                    if (assetKey === 'BTC') {
                        actualKey = '0-bitcoin';
                    } else if (assetKey === 'CoinbaseBTC') {
                        actualKey = findAssetKeyByName(assets, 'CoinbaseBTC', currentChainId) || assetKey;
                    } else {
                        // Try to find by name
                        actualKey = findAssetKeyByName(assets, assetKey, currentChainId) || assetKey;
                    }
                }

                // Update the asset if we have the key
                if (assets[actualKey]) {
                    assets[actualKey] = { ...assets[actualKey], connectedUserBalanceRaw: newBalance };
                }

                return { validAssets: assets };
            }),

        updateConnectedUserBalanceFormatted: (assetKey, newBalance) =>
            set((state) => {
                const assets = { ...state.validAssets };

                // Try to find the correct key if assetKey is a name
                let actualKey = assetKey;

                if (!assetKey.includes('-')) {
                    // Special handling for BTC and CoinbaseBTC
                    if (assetKey === 'BTC') {
                        actualKey = '0-bitcoin';
                    } else if (assetKey === 'CoinbaseBTC') {
                        actualKey = findAssetKeyByName(assets, 'CoinbaseBTC', currentChainId) || assetKey;
                    } else {
                        // Try to find by name
                        actualKey = findAssetKeyByName(assets, assetKey, currentChainId) || assetKey;
                    }
                }

                // Update the asset if we have the key
                if (assets[actualKey]) {
                    assets[actualKey] = { ...assets[actualKey], connectedUserBalanceFormatted: newBalance };
                }

                return { validAssets: assets };
            }),

        updatePriceForAsset: (asset: ValidAsset, newPrice: number) =>
            set((state) => {
                const key = state.getAssetKey(asset);

                if (state.validAssets[key]) {
                    const assets = { ...state.validAssets };
                    assets[key] = { ...assets[key], priceUSD: newPrice };
                    return { validAssets: assets };
                }

                return state;
            }),

        findAssetByName: (name: string, chainId?: number) => {
            const assets = get().validAssets;
            const effectiveChainId = chainId ?? currentChainId;

            // Special handling for BTC and CoinbaseBTC
            if (name === 'BTC' && assets['0-bitcoin']) {
                return assets['0-bitcoin'];
            }

            if (name === 'CoinbaseBTC') {
                const key = findAssetKeyByName(assets, 'CoinbaseBTC', effectiveChainId);
                if (key) return assets[key];
            }

            // Search across all assets
            return Object.values(assets).find(
                (asset) =>
                    asset.name?.toLowerCase() === name.toLowerCase() &&
                    (chainId === undefined || asset.chainId === chainId),
            );
        },

        getAssetKey: (asset: ValidAsset) => {
            return `${asset.chainId || 0}-${(asset.address || asset.tokenAddress || '').toLowerCase()}`;
        },
    };
};
