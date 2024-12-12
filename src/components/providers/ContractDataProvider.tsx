import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useStore } from '../../store';
import { useDepositVaults } from '../../hooks/contract/useDepositVaults';
import { useAccount } from 'wagmi';
import { formatUnits } from 'ethers/lib/utils';
import { checkIfNewDepositsArePaused, getTokenBalance } from '../../utils/contractReadFunctions';
import { ERC20ABI, NEW_DEPOSISTS_PAUSED, NEW_SWAPS_PAUSED } from '../../utils/constants';
import riftExchangeABI from '../../abis/RiftExchange.json';
import { getPrices } from '../../utils/fetchUniswapPrices';

interface ContractDataContextType {
    allDepositVaults: any;
    userActiveDepositVaults: any;
    userCompletedDepositVaults: any;
    allSwapReservations: any;
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
    const setAreNewSwapsPaused = useStore((state) => state.setAreNewSwapsPaused);
    // set ethers provider when selectedInputAsset changes
    useEffect(() => {
        if ((selectedInputAsset?.contractRpcURL && window.ethereum) || !ethersRpcProvider) {
            const provider = new ethers.providers.StaticJsonRpcProvider(selectedInputAsset.contractRpcURL, { chainId: selectedInputAsset.chainDetails.id, name: selectedInputAsset.chainDetails.name });
            if (!provider) return;
            setEthersRpcProvider(provider);
        }
    }, [selectedInputAsset?.contractRpcURL, address, isConnected]);

    // reference to store the interval ID
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchSelectedAssetUserBalance = async () => {
        if (!address || !selectedInputAsset || !ethersRpcProvider) return;

        const balance = await getTokenBalance(ethersRpcProvider, selectedInputAsset.tokenAddress, address, ERC20ABI);
        updateConnectedUserBalanceRaw(selectedInputAsset.name, balance);

        const formattedBalance = formatUnits(balance, useStore.getState().validAssets[selectedInputAsset.name].decimals);
        updateConnectedUserBalanceFormatted(selectedInputAsset.name, formattedBalance.toString());
    };

    const refreshConnectedUserBalance = async () => {
        await fetchSelectedAssetUserBalance();
    };

    // fetch price data, user balance, and check for new deposits paused
    useEffect(() => {
        const fetchPriceData = async () => {
            try {
                // let [btcPriceUSD, usdtPriceUSDBufferedTo8Decimals] = await getPrices();
                let btcPriceUSD;
                // const usdtPriceUSD = formatUnits(usdtPriceUSDBufferedTo8Decimals, 8);
                const usdtPriceUSD = '1.00000000'; // TODO: remove this hardcoded value
                // Add CoinGecko price fetch
                try {
                    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=wrapped-bitcoin&vs_currencies=usd');
                    const data = await response.json();
                    if (data['wrapped-bitcoin']?.usd) {
                        console.log('tristan wbtcPriceInUSD', data['wrapped-bitcoin'].usd);
                        btcPriceUSD = data['wrapped-bitcoin'].usd;
                    }
                } catch (error) {
                    console.error('tristan Failed to fetch CoinGecko price, using 100k as fallback');
                    btcPriceUSD = '100000';
                }
                console.log('tristan btcPriceUSD', btcPriceUSD);
                const btcToUsdtRate = parseFloat(btcPriceUSD) / parseFloat(usdtPriceUSD);

                setBitcoinPriceUSD(parseFloat(btcPriceUSD));
                updateExchangeRateInTokenPerBTC('USDT', parseFloat(btcToUsdtRate.toFixed(2)));
            } catch (e) {
                console.error('tristan error', e);
                return;
            }
        };

        const checkIfNewDepositsArePausedFromContract = async () => {
            if (!ethersRpcProvider || !selectedInputAsset) return;

            const areNewDepositsPausedBool = await checkIfNewDepositsArePaused(ethersRpcProvider, riftExchangeABI.abi, selectedInputAsset.riftExchangeContractAddress);
            setAreNewDepositsPaused(areNewDepositsPausedBool || NEW_DEPOSISTS_PAUSED);
            setAreNewSwapsPaused(NEW_SWAPS_PAUSED);
        };

        if (address) {
            setUserEthAddress(address);
            if (selectedInputAsset && window.ethereum) {
                fetchSelectedAssetUserBalance();
            }
        }

        fetchPriceData();
        fetchSelectedAssetUserBalance();
        checkIfNewDepositsArePausedFromContract();

        if (!intervalRef.current) {
            intervalRef.current = setInterval(() => {
                fetchPriceData();
                fetchSelectedAssetUserBalance();
                checkIfNewDepositsArePausedFromContract();
            }, 12000); // get data every 12 seconds
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

    // fetch deposit vaults
    const { allFetchedDepositVaults, userActiveDepositVaults, userCompletedDepositVaults, allFetchedSwapReservations, loading, error, refreshAllDepositData } = useDepositVaults();

    // continuously refresh deposit data
    useEffect(() => {
        const continuouslyRefreshDepositData = async () => {
            await refreshAllDepositData();
            if (isConnected && address) {
                await refreshConnectedUserBalance();
            }
        };

        continuouslyRefreshDepositData();
        const intervalId = setInterval(continuouslyRefreshDepositData, 3000); // 3 seconds
        return () => clearInterval(intervalId);
    }, [isConnected, address]);

    const isLoading = loading || bitcoinPriceUSD === 0;

    const value = {
        allDepositVaults: allFetchedDepositVaults,
        userActiveDepositVaults: userActiveDepositVaults,
        userCompletedDepositVaults: userCompletedDepositVaults,
        allSwapReservations: allFetchedSwapReservations,
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
