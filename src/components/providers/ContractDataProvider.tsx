import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useStore } from '../../store';
import { useDepositVaults } from '../../hooks/contract/useDepositVaults';
import { useAccount } from 'wagmi';
import { formatUnits } from 'ethers/lib/utils';
import { checkIfNewDepositsArePaused, getTokenBalance } from '../../utils/contractReadFunctions';
import { ERC20ABI, IS_FRONTEND_PAUSED } from '../../utils/constants';
import riftExchangeABI from '../../abis/RiftExchange.json';
import { getPrices } from '../../utils/fetchUniswapPrices';

interface ContractDataContextType {
    allDepositVaults: any;
    loading: boolean;
    error: any;
    refreshAllDepositData: () => Promise<void>;
    refreshConnectedUserBalance: () => Promise<void>;
}

const ContractDataContext = createContext<ContractDataContextType | undefined>(undefined);

export function ContractDataProvider({ children }: { children: ReactNode }) {
    const { address, isConnected } = useAccount();
    const ethersRpcProvider = useStore.getState().ethersRpcProvider;
    const setEthersRpcProvider = useStore((state) => state.setEthersRpcProvider);
    const setUserEthAddress = useStore((state) => state.setUserEthAddress);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const setBitcoinPriceUSD = useStore((state) => state.setBitcoinPriceUSD);
    const bitcoinPriceUSD = useStore((state) => state.bitcoinPriceUSD);
    const updateExchangeRateInTokenPerBTC = useStore((state) => state.updateExchangeRateInTokenPerBTC);
    const updateConnectedUserBalanceRaw = useStore((state) => state.updateConnectedUserBalanceRaw);
    const updateConnectedUserBalanceFormatted = useStore((state) => state.updateConnectedUserBalanceFormatted);
    const setAreNewDepositsPaused = useStore((state) => state.setAreNewDepositsPaused);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // [0] set ethers provider when selectedInputAsset changes
    useEffect(() => {
        if ((selectedInputAsset?.contractRpcURL && window.ethereum) || !ethersRpcProvider) {
            const provider = new ethers.providers.StaticJsonRpcProvider(selectedInputAsset.contractRpcURL, { chainId: selectedInputAsset.chainDetails.id, name: selectedInputAsset.chainDetails.name });
            if (!provider) return;
            setEthersRpcProvider(provider);
        }
    }, [selectedInputAsset?.contractRpcURL, address, isConnected]);

    // [1] fetch selected asset user balance
    const fetchSelectedAssetUserBalance = async () => {
        if (!address || !selectedInputAsset || !ethersRpcProvider) return;

        const balance = await getTokenBalance(ethersRpcProvider, selectedInputAsset.tokenAddress, address, ERC20ABI);
        updateConnectedUserBalanceRaw(selectedInputAsset.name, balance);

        const formattedBalance = formatUnits(balance, useStore.getState().validAssets[selectedInputAsset.name].decimals);
        updateConnectedUserBalanceFormatted(selectedInputAsset.name, formattedBalance.toString());
    };

    // [2] refresh connected user balance
    const refreshConnectedUserBalance = async () => {
        await fetchSelectedAssetUserBalance();
    };

    // [3] continuously fetch price data, user balance, and check for new deposits paused every 12 seconds
    useEffect(() => {
        // [0] fetch price data
        const fetchPriceData = async () => {
            try {
                let [btcPriceUSD, usdtPriceUSDBufferedTo8Decimals] = await getPrices();
                const usdtPriceUSD = formatUnits(usdtPriceUSDBufferedTo8Decimals, 8);
                const btcToUsdtRate = parseFloat(btcPriceUSD) / parseFloat(usdtPriceUSD);
                setBitcoinPriceUSD(parseFloat(btcPriceUSD));
                updateExchangeRateInTokenPerBTC('USDT', parseFloat(btcToUsdtRate.toFixed(2)));
            } catch (e) {
                console.error(e);
                return;
            }
        };

        // [1] check if new deposits are paused in the contract
        const checkIfNewDepositsArePausedFromContract = async () => {
            if (!ethersRpcProvider || !selectedInputAsset) return;
            // TODO - update this with new contract pause functionality if we have it
            // const areNewDepositsPausedBool = await checkIfNewDepositsArePaused(ethersRpcProvider, riftExchangeABI.abi, selectedInputAsset.riftExchangeContractAddress);
            setAreNewDepositsPaused(IS_FRONTEND_PAUSED);
        };

        // [2] set user eth address and fetch user balance
        if (address) {
            setUserEthAddress(address);
            if (selectedInputAsset && window.ethereum) {
                fetchSelectedAssetUserBalance();
            }
        }

        // [3] call fetch price data
        fetchPriceData();

        // [4] call check if new deposits are paused in the contract
        checkIfNewDepositsArePausedFromContract();

        // [5] set interval repeat useEffect every 12 seconds
        if (!intervalRef.current) {
            intervalRef.current = setInterval(() => {
                fetchPriceData();
                fetchSelectedAssetUserBalance();
                checkIfNewDepositsArePausedFromContract();
            }, 12000);
        }
    }, [
        selectedInputAsset?.tokenAddress,
        address,
        isConnected,
        setBitcoinPriceUSD,
        updateExchangeRateInTokenPerBTC,
        setUserEthAddress,
        updateConnectedUserBalanceRaw,
        updateConnectedUserBalanceFormatted,
        setAreNewDepositsPaused,
        ethersRpcProvider,
        selectedInputAsset,
    ]);

    // [4] fetch deposit vaults
    const { allFetchedDepositVaults, userActiveDepositVaults, userCompletedDepositVaults, allFetchedSwapReservations, loading, error, refreshAllDepositData } = useDepositVaults();
    const isLoading = false; // todo make a new hook for the above to get deposit vaults with event logs with a new loading state

    // [5] continuously refresh deposit data every 10 seconds
    useEffect(() => {
        const continuouslyRefreshDepositData = async () => {
            await refreshAllDepositData();
            if (isConnected && address) {
                await refreshConnectedUserBalance();
            }
        };

        continuouslyRefreshDepositData();
        const intervalId = setInterval(continuouslyRefreshDepositData, 10000); // 10 seconds
        return () => clearInterval(intervalId);
    }, [isConnected, address]);

    const value = {
        allDepositVaults: [],
        loading: isLoading,
        error,
        refreshAllDepositData,
        refreshConnectedUserBalance,
    };

    return <ContractDataContext.Provider value={value}>{children}</ContractDataContext.Provider>;
}

export function useContractData() {
    const context = useContext(ContractDataContext);
    if (context === undefined) {
        throw new Error('useContractData must be used within a ContractDataProvider');
    }
    return context;
}
