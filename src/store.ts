import { create } from 'zustand';
import { useEffect } from 'react';
import { CurrencyModalTitle, DepositVault, ReserveLiquidityParams, SwapReservation } from './types';
import { BigNumber, ethers } from 'ethers';
import { USDT_Icon, ETH_Icon, ETH_Logo, Coinbase_BTC_Icon } from './components/other/SVGs';
import {
    ERC20ABI,
    DEPLOYMENT_TYPE,
    MAINNET_BASE_CHAIN_ID,
    MAINNET_BASE_ETHERSCAN_URL,
    MAINNET_BASE_PAYMASTER_URL,
    MAINNET_BASE_RPC_URL,
    REQUIRED_BLOCK_CONFIRMATIONS,
    TESTNET_BASE_CHAIN_ID,
    TESTNET_BASE_ETHERSCAN_URL,
    TESTNET_BASE_PAYMASTER_URL,
    TESTNET_BASE_RIFT_EXCHANGE_ADDRESS,
    TESTNET_BASE_RPC_URL,
    DEVNET_BASE_CHAIN_ID,
    DEVNET_BASE_RPC_URL,
    DEVNET_BASE_ETHERSCAN_URL,
    DEVNET_BASE_PAYMASTER_URL,
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

type Store = {
    // setup & asset data
    userEthAddress: string;
    setUserEthAddress: (address: string) => void;
    ethersRpcProvider: ethers.providers.Provider | null;
    setEthersRpcProvider: (provider: ethers.providers.Provider) => void;
    validAssets: Record<string, ValidAsset>;
    setValidAssets: (assets: Record<string, ValidAsset>) => void;
    updateValidValidAsset: (assetKey: string, updates: Partial<ValidAsset>) => void;
    updatePriceUSD: (assetKey: string, newPrice: number) => void;
    updateTotalAvailableLiquidity: (assetKey: string, newLiquidity: BigNumber) => void;
    updateConnectedUserBalanceRaw: (assetKey: string, newBalance: BigNumber) => void;
    updateConnectedUserBalanceFormatted: (assetKey: string, newBalance: string) => void;
    selectedInputAsset: ValidAsset;
    setSelectedInputAsset: (asset: ValidAsset) => void;
    isPayingFeesInBTC: boolean;
    setIsPayingFeesInBTC: (isPayingFeesInBTC: boolean) => void;

    // contract data (deposit vaults, swap reservations)
    allDepositVaults: any;
    setAllDepositVaults: (allDepositVaults: DepositVault[]) => void;
    userActiveDepositVaults: DepositVault[];
    setUserActiveDepositVaults: (userActiveDepositVaults: DepositVault[]) => void;
    userCompletedDepositVaults: DepositVault[];
    setUserCompletedDepositVaults: (userCompletedDepositVaults: DepositVault[]) => void;
    allSwapReservations: SwapReservation[];
    setAllSwapReservations: (reservations: SwapReservation[]) => void;
    userSwapReservations: SwapReservation[];
    setUserSwapReservations: (reservations: SwapReservation[]) => void;
    totalExpiredReservations: number;
    setTotalExpiredReservations: (totalExpiredReservations: number) => void;
    totalUnlockedReservations: number;
    setTotalUnlockedReservations: (totalUnlockedReservations: number) => void;
    totalCompletedReservations: number;
    setTotalCompletedReservations: (totalCompletedReservations: number) => void;
    currentlyExpiredReservationIndexes: number[];
    setCurrentlyExpiredReservationIndexes: (indexes: number[]) => void;

    // manage deposits
    selectedVaultToManage: DepositVault | null;
    setSelectedVaultToManage: (vault: DepositVault | null) => void;
    showManageDepositVaultsScreen: boolean;
    setShowManageDepositVaultsScreen: (show: boolean) => void;

    // swap flow
    swapFlowState: '0-not-started' | '1-reserve-liquidity' | '2-send-bitcoin' | '3-receive-evm-token' | '4-completed' | '5-expired';
    setSwapFlowState: (state: '0-not-started' | '1-reserve-liquidity' | '2-send-bitcoin' | '3-receive-evm-token' | '4-completed' | '5-expired') => void;
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
    swapReservationData: SwapReservation | null;
    setSwapReservationData: (data: SwapReservation | null) => void;
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
};

export const useStore = create<Store>((set) => {
    const validAssets: Record<string, ValidAsset> = {
        CoinbaseBTC: {
            name: 'CoinbaseBTC',
            display_name: 'cbBTC',
            tokenAddress: getDeploymentValue(DEPLOYMENT_TYPE, MAINNET_BASE_CBBTC_TOKEN_ADDRESS, TESTNET_BASE_CBBTC_TOKEN_ADDRESS, DEVNET_BASE_CBBTC_TOKEN_ADDRESS),
            dataEngineUrl: getDeploymentValue(DEPLOYMENT_TYPE, MAINNET_DATA_ENGINE_URL, TESTNET_DATA_ENGINE_URL, DEVNET_DATA_ENGINE_URL),
            decimals: BITCOIN_DECIMALS,
            riftExchangeContractAddress: getDeploymentValue(DEPLOYMENT_TYPE, MAINNET_BASE_RIFT_EXCHANGE_ADDRESS, TESTNET_BASE_RIFT_EXCHANGE_ADDRESS, DEVNET_BASE_RIFT_EXCHANGE_ADDRESS),
            riftExchangeAbi: riftExchangeABI.abi,
            contractChainID: getDeploymentValue(DEPLOYMENT_TYPE, MAINNET_BASE_CHAIN_ID, TESTNET_BASE_CHAIN_ID, DEVNET_BASE_CHAIN_ID),
            chainDetails: base, // ONLY USE FOR MAINNET SWITCHING NETWORKS WITH METAMASK
            contractRpcURL: getDeploymentValue(DEPLOYMENT_TYPE, MAINNET_BASE_RPC_URL, TESTNET_BASE_RPC_URL, DEVNET_BASE_RPC_URL),
            etherScanBaseUrl: getDeploymentValue(DEPLOYMENT_TYPE, MAINNET_BASE_ETHERSCAN_URL, TESTNET_BASE_ETHERSCAN_URL, DEVNET_BASE_ETHERSCAN_URL),
            paymasterUrl: getDeploymentValue(DEPLOYMENT_TYPE, MAINNET_BASE_PAYMASTER_URL, TESTNET_BASE_PAYMASTER_URL, DEVNET_BASE_PAYMASTER_URL),
            proverFee: BigNumber.from(0),
            releaserFee: BigNumber.from(0),
            icon_svg: Coinbase_BTC_Icon,
            bg_color: '#2E59BB',
            border_color: '#1C61FD',
            border_color_light: '#3B70E8',
            dark_bg_color: 'rgba(9, 36, 97, 0.3)',
            light_text_color: '#365B9F',
            priceUSD: null,
            totalAvailableLiquidity: BigNumber.from(0),
            connectedUserBalanceRaw: BigNumber.from(0),
            connectedUserBalanceFormatted: '0',
        },
        BTC: {
            name: 'BTC',
            decimals: 8,
            icon_svg: null,
            bg_color: '#c26920',
            border_color: '#FFA04C',
            border_color_light: '#FFA04C',
            dark_bg_color: '#372412',
            light_text_color: '#7d572e',
            priceUSD: null,
        },
    };

    return {
        // setup & asset data
        selectedInputAsset: validAssets.CoinbaseBTC,
        setSelectedInputAsset: (selectedInputAsset) => set({ selectedInputAsset }),
        userEthAddress: '',
        setUserEthAddress: (userEthAddress) => set({ userEthAddress }),
        //console log the new ethers provider
        ethersRpcProvider: null,
        setEthersRpcProvider: (provider) => set({ ethersRpcProvider: provider }),
        validAssets,
        setValidAssets: (assets) => set({ validAssets: assets }),
        updateValidValidAsset: (assetKey, updates) =>
            set((state) => ({
                validAssets: {
                    ...state.validAssets,
                    [assetKey]: { ...state.validAssets[assetKey], ...updates },
                },
            })),
        updatePriceUSD: (assetKey, newPrice) =>
            set((state) => ({
                validAssets: {
                    ...state.validAssets,
                    [assetKey]: { ...state.validAssets[assetKey], priceUSD: newPrice },
                },
            })),
        updateTotalAvailableLiquidity: (assetKey, newLiquidity) =>
            set((state) => ({
                validAssets: {
                    ...state.validAssets,
                    [assetKey]: { ...state.validAssets[assetKey], totalAvailableLiquidity: newLiquidity },
                },
            })),
        updateConnectedUserBalanceRaw: (assetKey, newBalance) =>
            set((state) => ({
                validAssets: {
                    ...state.validAssets,
                    [assetKey]: { ...state.validAssets[assetKey], connectedUserBalanceRaw: newBalance },
                },
            })),
        updateConnectedUserBalanceFormatted: (assetKey, newBalance) =>
            set((state) => ({
                validAssets: {
                    ...state.validAssets,
                    [assetKey]: { ...state.validAssets[assetKey], connectedUserBalanceFormatted: newBalance },
                },
            })),
        isPayingFeesInBTC: true,
        setIsPayingFeesInBTC: (isPayingFeesInBTC) => set({ isPayingFeesInBTC }),

        // contract data (deposit vaults, swap reservations)
        allDepositVaults: [],
        setAllDepositVaults: (allDepositVaults) => set({ allDepositVaults }),
        userActiveDepositVaults: [],
        setUserActiveDepositVaults: (userActiveDepositVaults) => set({ userActiveDepositVaults }),
        userCompletedDepositVaults: [],
        setUserCompletedDepositVaults: (userCompletedDepositVaults) => set({ userCompletedDepositVaults }),
        allSwapReservations: [],
        setAllSwapReservations: (allSwapReservations) => set({ allSwapReservations }),
        userSwapReservations: [],
        setUserSwapReservations: (userSwapReservations) => set({ userSwapReservations }),
        totalExpiredReservations: 0,
        setTotalExpiredReservations: (totalExpiredReservations) => set({ totalExpiredReservations }),
        totalUnlockedReservations: 0,
        setTotalUnlockedReservations: (totalUnlockedReservations) => set({ totalUnlockedReservations }),
        totalCompletedReservations: 0,
        setTotalCompletedReservations: (totalCompletedReservations) => set({ totalCompletedReservations }),
        currentlyExpiredReservationIndexes: [],
        setCurrentlyExpiredReservationIndexes: (currentlyExpiredReservationIndexes) => set({ currentlyExpiredReservationIndexes }),

        // manage deposits
        selectedVaultToManage: null,
        setSelectedVaultToManage: (selectedVaultToManage) => set({ selectedVaultToManage }),
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
        swapReservationData: null,
        setSwapReservationData: (swapReservationData) => set({ swapReservationData }),
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
    };
});
