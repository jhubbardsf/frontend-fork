import { create } from 'zustand';
import { useEffect } from 'react';
import { CurrencyModalTitle, ReserveLiquidityParams, TokenMeta, UniswapTokenList, UserSwap } from './types';
import { BigNumber, ethers } from 'ethers';
import { USDT_Icon, ETH_Icon, ETH_Logo, Coinbase_BTC_Icon } from './components/other/SVGs';
import {
    ERC20ABI,
    DEPLOYMENT_TYPE,
    MAINNET_BASE_CHAIN_ID,
    MAINNET_BASE_ETHERSCAN_URL,
    MAINNET_BASE_RPC_URL,
    REQUIRED_BLOCK_CONFIRMATIONS,
    TESTNET_BASE_CHAIN_ID,
    TESTNET_BASE_ETHERSCAN_URL,
    TESTNET_BASE_RIFT_EXCHANGE_ADDRESS,
    TESTNET_BASE_RPC_URL,
    DEVNET_BASE_CHAIN_ID,
    DEVNET_BASE_RPC_URL,
    DEVNET_BASE_ETHERSCAN_URL,
    DEVNET_BASE_RIFT_EXCHANGE_ADDRESS,
    MAINNET_BASE_RIFT_EXCHANGE_ADDRESS,
    MAINNET_BASE_CBBTC_TOKEN_ADDRESS,
    DEVNET_BASE_CBBTC_TOKEN_ADDRESS,
    TESTNET_BASE_CBBTC_TOKEN_ADDRESS,
    BITCOIN_DECIMALS,
    MAINNET_DATA_ENGINE_URL,
    DEVNET_DATA_ENGINE_URL,
    TESTNET_DATA_ENGINE_URL,
} from './utils/constants';
import { ValidAsset } from './types';
import riftExchangeABI from './abis/RiftExchange.json';
import { base, baseGoerli, baseSepolia } from 'viem/chains';
import { DeploymentType } from './types';
import { getDeploymentValue } from './utils/deploymentUtils';
import combinedTokenData from '@/json/tokenData.json';
import { getEffectiveChainID } from './utils/dappHelper';

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
 *
 * @param tokenList - The Uniswap token list object.
 * @param defaultAssetTemplate - A template ValidAsset (e.g. your CoinbaseBTC asset) that contains all required properties.
 * @param existingAssets - (Optional) Existing valid assets record to merge into.
 * @param currentChainId - The current chain ID to filter tokens by.
 * @returns A new record of ValidAsset objects keyed by token symbol.
 */
export function mergeTokenListIntoValidAssets(
    tokenList: UniswapTokenList,
    defaultAssetTemplate: ValidAsset,
    existingAssets: Record<string, ValidAsset> = {},
    currentChainId?: number,
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

    // Filter tokens by current chain ID if provided
    const effectiveChainID = currentChainId ? getEffectiveChainID(currentChainId) : undefined;
    const tokensToAdd = effectiveChainID
        ? tokenList.tokens.filter((token) => token.chainId === effectiveChainID)
        : tokenList.tokens;

    tokensToAdd.forEach((token) => {
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
 * Helper function to find an asset by name in the validAssets Record
 */
function findAssetByName(assets: Record<string, ValidAsset>, name: string, chainId: number): ValidAsset | undefined {
    return Object.values(assets).find((asset) => asset.name === name && (asset.chainId === chainId || !asset.chainId));
}

/**
 * Helper function to find an asset key by name in the validAssets Record
 */
function findAssetKeyByName(assets: Record<string, ValidAsset>, name: string, chainId: number): string | undefined {
    return Object.keys(assets).find(
        (key) => assets[key].name === name && (assets[key].chainId === chainId || !assets[key].chainId),
    );
}

type Store = {
    // setup & asset data
    userEthAddress: string;
    setUserEthAddress: (address: string) => void;
    ethersRpcProvider: ethers.providers.Provider | null;
    setEthersRpcProvider: (provider: ethers.providers.Provider) => void;
    validAssets: Record<string, ValidAsset>;
    setValidAssets: (assets: Record<string, ValidAsset>) => void;
    updateValidValidAsset: (assetKey: string, updates: Partial<ValidAsset>) => void;
    mergeValidAssets: (assets: Record<string, ValidAsset>) => void;
    updatePriceUSD: (assetKey: string, newPrice: number) => void;
    updatePriceUSDByAddress: (address: string, newPrice: number) => void;
    updateTotalAvailableLiquidity: (assetKey: string, newLiquidity: BigNumber) => void;
    updateConnectedUserBalanceRaw: (assetKey: string, newBalance: BigNumber) => void;
    updateConnectedUserBalanceFormatted: (assetKey: string, newBalance: string) => void;
    selectedInputAsset: ValidAsset;
    setSelectedInputAsset: (asset: ValidAsset) => void;
    isPayingFeesInBTC: boolean;
    setIsPayingFeesInBTC: (isPayingFeesInBTC: boolean) => void;

    // Helper functions to find assets
    findAssetByAddress: (address: string, chainId?: number) => ValidAsset | undefined;
    findAssetByName: (name: string, chainId?: number) => ValidAsset | undefined;
    findAssetBySymbol: (symbol: string, chainId?: number) => ValidAsset | undefined;
    getAssetKey: (asset: ValidAsset) => string;

    // contract data (deposit vaults, swap reservations)
    setUserSwapsFromAddress: (swaps: UserSwap[]) => void;
    userSwapsFromAddress: UserSwap[];
    userSwapsLoadingState: 'loading' | 'error' | 'received';
    setUserSwapsLoadingState: (state: 'loading' | 'error' | 'received') => void;

    // activity page
    selectedSwapToManage: UserSwap | null;
    setSelectedSwapToManage: (swap: UserSwap | null) => void;
    showManageDepositVaultsScreen: boolean;
    setShowManageDepositVaultsScreen: (show: boolean) => void;

    // swap flow
    swapFlowState:
        | '0-not-started'
        | '1-reserve-liquidity'
        | '2-send-bitcoin'
        | '3-receive-evm-token'
        | '4-completed'
        | '5-expired';
    setSwapFlowState: (
        state:
            | '0-not-started'
            | '1-reserve-liquidity'
            | '2-send-bitcoin'
            | '3-receive-evm-token'
            | '4-completed'
            | '5-expired',
    ) => void;
    depositFlowState: '0-not-started' | '1-confirm-deposit';
    setDepositFlowState: (state: '0-not-started' | '1-confirm-deposit') => void;
    btcInputSwapAmount: string;
    setBtcInputSwapAmount: (amount: string) => void;
    coinbaseBtcDepositAmount: string;
    setCoinbaseBtcDepositAmount: (amount: string) => void;
    btcOutputAmount: string;
    setBtcOutputAmount: (amount: string) => void;
    coinbaseBtcOutputAmount: string;
    setCoinbaseBtcOutputAmount: (amount: string) => void;
    payoutBTCAddress: string;
    setPayoutBTCAddress: (address: string) => void;
    lowestFeeReservationParams: ReserveLiquidityParams | null;
    setLowestFeeReservationParams: (reservation: ReserveLiquidityParams | null) => void;
    showManageReservationScreen: boolean;
    setShowManageReservationScreen: (show: boolean) => void;
    depositMode: boolean;
    setDepositMode: (mode: boolean) => void;
    withdrawAmount: string;
    setWithdrawAmount: (amount: string) => void;
    protocolFeeAmountMicroUsdt: string;
    setProtocolFeeAmountMicroUsdt: (amount: string) => void;
    swapReservationNotFound: boolean;
    setSwapReservationNotFound: (notFound: boolean) => void;
    currentReservationState: string;
    setCurrentReservationState: (state: string) => void;
    areNewDepositsPaused: boolean;
    setAreNewDepositsPaused: (paused: boolean) => void;
    isGasFeeTooHigh: boolean;
    setIsGasFeeTooHigh: (isGasFeeTooHigh: boolean) => void;
    confirmationBlocksNeeded: number;
    setConfirmationBlocksNeeded: (blocks: number) => void;
    currentTotalBlockConfirmations: number;
    setCurrentTotalBlockConfirmations: (confirmations: number) => void;
    proxyWalletSwapStatus: number;
    setProxyWalletSwapStatus: (status: number) => void;

    // modals
    currencyModalTitle: CurrencyModalTitle;
    setCurrencyModalTitle: (x: CurrencyModalTitle) => void;
    ethPayoutAddress: string;
    setEthPayoutAddress: (address: string) => void;
    bitcoinSwapTransactionHash: string;
    setBitcoinSwapTransactionHash: (hash: string) => void;

    // global
    isOnline: boolean;
    setIsOnline: (b: boolean) => void;

    // Uniswap
    uniswapInputAssetPriceUSD: number;
    setUniswapInputAssetPriceUSD: (price: number) => void;
    selectedUniswapInputAsset: TokenMeta;
    setSelectedUniswapInputAsset: (asset: TokenMeta) => void;
    selectedChainID: number;
    setSelectChainID: (chainID: number) => void;
    uniswapTokens: TokenMeta[];
    setUniswapTokens: (tokens: TokenMeta[]) => void;
};

export const useStore = create<Store>((set, get) => {
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
        contractChainID: currentChainId,
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

    // Create default Uniswap asset from coinbaseBtc
    const defaultUniswapAsset: TokenMeta = {
        chainId: coinbaseBtc.chainId,
        name: 'Coinbase Wrapped BTC',
        address: coinbaseBtc.address,
        symbol: coinbaseBtc.symbol,
        decimals: coinbaseBtc.decimals,
        logoURI: coinbaseBtc.logoURI,
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

    const updatedValidAssets = mergeTokenListIntoValidAssets(
        deduplicateTokens(combinedTokenData),
        coinbaseBtc,
        initialValidAssets,
        currentChainId,
    );

    return {
        // setup & asset data
        selectedInputAsset: coinbaseBtc,
        setSelectedInputAsset: (selectedInputAsset) => set({ selectedInputAsset }),
        userEthAddress: '',
        setUserEthAddress: (userEthAddress) => set({ userEthAddress }),
        ethersRpcProvider: null,
        setEthersRpcProvider: (provider) => set({ ethersRpcProvider: provider }),
        validAssets: updatedValidAssets,
        setValidAssets: (assets) => set({ validAssets: assets }),
        updateValidValidAsset: (assetKey, updates) =>
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
                    assets[actualKey] = { ...assets[actualKey], ...updates };
                }

                return { validAssets: assets };
            }),
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
        updatePriceUSDByAddress: (address, newPrice) =>
            set((state) => {
                const assets = { ...state.validAssets };

                // Find keys for the given address across all chains
                const matchingKeys = Object.keys(assets).filter((key) => {
                    const asset = assets[key];
                    return (
                        asset.tokenAddress?.toLowerCase() === address.toLowerCase() ||
                        asset.address?.toLowerCase() === address.toLowerCase()
                    );
                });

                // If we have matching keys
                if (matchingKeys.length > 0) {
                    // Create a new object with updated price for all matching tokens
                    matchingKeys.forEach((key) => {
                        assets[key] = { ...assets[key], priceUSD: newPrice };
                    });

                    return { validAssets: assets };
                }
                return state;
            }),
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
        isPayingFeesInBTC: true,
        setIsPayingFeesInBTC: (isPayingFeesInBTC) => set({ isPayingFeesInBTC }),

        // contract data (deposit vaults, swap reservations)
        setUserSwapsFromAddress: (swaps: UserSwap[]) => set({ userSwapsFromAddress: swaps }),
        userSwapsFromAddress: [],
        userSwapsLoadingState: 'loading' as 'loading' | 'error' | 'received',
        setUserSwapsLoadingState: (state: 'loading' | 'error' | 'received') => set({ userSwapsLoadingState: state }),

        // activity page
        selectedSwapToManage: null,
        setSelectedSwapToManage: (selectedSwapToManage) => set({ selectedSwapToManage }),
        showManageDepositVaultsScreen: false,
        setShowManageDepositVaultsScreen: (showManageDepositVaultsScreen) => set({ showManageDepositVaultsScreen }),

        // swap flow
        swapFlowState: '0-not-started',
        setSwapFlowState: (swapFlowState) => set({ swapFlowState }),
        depositFlowState: '0-not-started',
        setDepositFlowState: (depositFlowState) => set({ depositFlowState }),
        btcInputSwapAmount: '',
        setBtcInputSwapAmount: (btcInputSwapAmount) => set({ btcInputSwapAmount }),
        coinbaseBtcDepositAmount: '',
        setCoinbaseBtcDepositAmount: (coinbaseBtcDepositAmount) => set({ coinbaseBtcDepositAmount }),
        btcOutputAmount: '',
        setBtcOutputAmount: (btcOutputAmount) => set({ btcOutputAmount }),
        coinbaseBtcOutputAmount: '',
        setCoinbaseBtcOutputAmount: (coinbaseBtcOutputAmount) => set({ coinbaseBtcOutputAmount }),
        payoutBTCAddress: '',
        setPayoutBTCAddress: (payoutBTCAddress) => set({ payoutBTCAddress }),
        lowestFeeReservationParams: null,
        setLowestFeeReservationParams: (lowestFeeReservationParams) => set({ lowestFeeReservationParams }),
        showManageReservationScreen: false,
        setShowManageReservationScreen: (showManageReservationScreen) => set({ showManageReservationScreen }),
        depositMode: true,
        setDepositMode: (depositMode) => set({ depositMode }),
        withdrawAmount: '',
        setWithdrawAmount: (withdrawAmount) => set({ withdrawAmount }),
        currencyModalTitle: 'close',
        setCurrencyModalTitle: (x) => set({ currencyModalTitle: x }),
        ethPayoutAddress: '',
        setEthPayoutAddress: (ethPayoutAddress) => set({ ethPayoutAddress }),
        bitcoinSwapTransactionHash: '',
        setBitcoinSwapTransactionHash: (bitcoinSwapTransactionHash) => set({ bitcoinSwapTransactionHash }),
        protocolFeeAmountMicroUsdt: '',
        setProtocolFeeAmountMicroUsdt: (protocolFeeAmountMicroUsdt) => set({ protocolFeeAmountMicroUsdt }),
        swapReservationNotFound: false,
        setSwapReservationNotFound: (swapReservationNotFound) => set({ swapReservationNotFound }),
        currentReservationState: '',
        setCurrentReservationState: (currentReservationState) => set({ currentReservationState }),
        areNewDepositsPaused: false,
        setAreNewDepositsPaused: (areNewDepositsPaused) => set({ areNewDepositsPaused }),
        isGasFeeTooHigh: false,
        setIsGasFeeTooHigh: (isGasFeeTooHigh) => set({ isGasFeeTooHigh }),
        confirmationBlocksNeeded: REQUIRED_BLOCK_CONFIRMATIONS,
        setConfirmationBlocksNeeded: (confirmationBlocksNeeded) => set({ confirmationBlocksNeeded }),
        currentTotalBlockConfirmations: 0,
        setCurrentTotalBlockConfirmations: (currentTotalBlockConfirmations) => set({ currentTotalBlockConfirmations }),
        proxyWalletSwapStatus: null,
        setProxyWalletSwapStatus: (proxyWalletSwapStatus) => set({ proxyWalletSwapStatus }),

        // global
        isOnline: true, // typeof window != 'undefined' ? navigator.onLine : true
        setIsOnline: (b) => set({ isOnline: b }),

        // Uniswap
        uniswapInputAssetPriceUSD: 0,
        setUniswapInputAssetPriceUSD: (price: number) => set({ uniswapInputAssetPriceUSD: price }),
        selectedUniswapInputAsset: defaultUniswapAsset,
        setSelectedUniswapInputAsset: (asset: TokenMeta) => {
            set({ selectedUniswapInputAsset: asset });
        },
        selectedChainID: currentChainId,
        setSelectChainID: (chainID: number) => set({ selectedChainID: chainID }),
        uniswapTokens: deduplicateTokens(combinedTokenData).tokens,
        setUniswapTokens: (tokens: TokenMeta[]) => set({ uniswapTokens: tokens }),

        // Helper functions to find assets
        findAssetByAddress: (address: string, chainId?: number) => {
            const assets = get().validAssets;

            // If chainId is provided, create a specific key to look up
            if (chainId !== undefined) {
                const key = `${chainId}-${address.toLowerCase()}`;
                return assets[key];
            }

            // Otherwise, search across all assets
            return Object.values(assets).find(
                (asset) =>
                    (asset.address?.toLowerCase() === address.toLowerCase() ||
                        asset.tokenAddress?.toLowerCase() === address.toLowerCase()) &&
                    (chainId === undefined || asset.chainId === chainId),
            );
        },
        findAssetByName: (name: string, chainId?: number) => {
            const assets = get().validAssets;

            // Special handling for BTC and CoinbaseBTC
            if (name === 'BTC' && assets['0-bitcoin']) {
                return assets['0-bitcoin'];
            }

            if (name === 'CoinbaseBTC') {
                const key = findAssetKeyByName(assets, 'CoinbaseBTC', chainId ?? currentChainId);
                if (key) return assets[key];
            }

            // Search across all assets
            return Object.values(assets).find(
                (asset) =>
                    asset.name?.toLowerCase() === name.toLowerCase() &&
                    (chainId === undefined || asset.chainId === chainId),
            );
        },
        findAssetBySymbol: (symbol: string, chainId?: number) => {
            const assets = get().validAssets;

            // Search across all assets
            return Object.values(assets).find(
                (asset) =>
                    (asset.symbol?.toLowerCase() === symbol.toLowerCase() ||
                        asset.display_name?.toLowerCase() === symbol.toLowerCase()) &&
                    (chainId === undefined || asset.chainId === chainId),
            );
        },
        getAssetKey: (asset: ValidAsset) => {
            return `${asset.chainId || 0}-${(asset.address || asset.tokenAddress || '').toLowerCase()}`;
        },
    };
});
