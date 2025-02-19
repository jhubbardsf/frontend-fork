import React, { createContext, useContext, ReactNode, useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { useStore } from '../../store';
import { useAccount } from 'wagmi';
import { formatUnits } from 'ethers/lib/utils';
import { checkIfNewDepositsArePaused, getTokenBalance } from '../../utils/contractReadFunctions';
import { ERC20ABI, IS_FRONTEND_PAUSED } from '../../utils/constants';
import riftExchangeABI from '../../abis/RiftExchange.json';
import { getUSDPrices } from '../../utils/fetchUniswapPrices';
import { getSwapsForAddress } from '../../utils/dataEngineClient';

interface ContractDataContextType {
    loading: boolean;
    error: any;
    userSwapsFromAddress: any[];
    refreshConnectedUserBalance: () => Promise<void>;
    refreshUserSwapsFromAddress: () => Promise<void>;
}

const ContractDataContext = createContext<ContractDataContextType | undefined>(undefined);

export function ContractDataProvider({ children }: { children: ReactNode }) {
    const { address, isConnected } = useAccount();
    const ethersRpcProvider = useStore.getState().ethersRpcProvider;
    const setEthersRpcProvider = useStore((state) => state.setEthersRpcProvider);
    const setUserEthAddress = useStore((state) => state.setUserEthAddress);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const updatePriceUsd = useStore((state) => state.updatePriceUSD);
    const updateConnectedUserBalanceRaw = useStore((state) => state.updateConnectedUserBalanceRaw);
    const updateConnectedUserBalanceFormatted = useStore((state) => state.updateConnectedUserBalanceFormatted);
    const setAreNewDepositsPaused = useStore((state) => state.setAreNewDepositsPaused);
    const validAssets = useStore((state) => state.validAssets);
    const [isLoading, setIsLoading] = useState(false);
    const setUserSwapsFromAddress = useStore((state) => state.setUserSwapsFromAddress);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // [0] set ethers provider when selectedInputAsset changes
    useEffect(() => {
        if ((selectedInputAsset?.contractRpcURL && window.ethereum) || !ethersRpcProvider) {
            const provider = new ethers.providers.StaticJsonRpcProvider(selectedInputAsset.contractRpcURL, { chainId: selectedInputAsset.contractChainID, name: selectedInputAsset.name });
            if (!provider) return;
            setEthersRpcProvider(provider);
        }
    }, [selectedInputAsset?.contractRpcURL, address, isConnected]);

    // [1] fetch selected asset user balance
    const fetchSelectedAssetUserBalance = async () => {
        // [0] check if address, selectedInputAsset, and ethersRpcProvider are defined
        if (!address || !selectedInputAsset || !ethersRpcProvider) return;

        // [1] fetch raw token balance
        const balance = await getTokenBalance(ethersRpcProvider, selectedInputAsset.tokenAddress, address, ERC20ABI);
        updateConnectedUserBalanceRaw(selectedInputAsset.name, balance);

        // [2] format token balance based on asset decimals
        const formattedBalance = formatUnits(balance, useStore.getState().validAssets[selectedInputAsset.name].decimals);
        updateConnectedUserBalanceFormatted(selectedInputAsset.name, formattedBalance.toString());
    };

    // [2] refresh connected user balance function
    const refreshConnectedUserBalance = async () => {
        await fetchSelectedAssetUserBalance();
    };

    // [3] continuously fetch price data, user balance, and check for new deposits paused every 12 seconds
    useEffect(() => {
        // [0] fetch price data
        const fetchPriceData = async () => {
            try {
                let { btcPriceUSD, cbbtcPriceUSD } = await getUSDPrices();
                updatePriceUsd(useStore.getState().validAssets.BTC.name, parseFloat(btcPriceUSD));
                updatePriceUsd(useStore.getState().validAssets.CoinbaseBTC.name, parseFloat(cbbtcPriceUSD));
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
        setUserEthAddress,
        updateConnectedUserBalanceRaw,
        updateConnectedUserBalanceFormatted,
        setAreNewDepositsPaused,
        ethersRpcProvider,
        selectedInputAsset,
    ]);

    // New useEffect to call fetchUserSwapsFromAddress every 10 seconds
    useEffect(() => {
        console.log('useEffect');
        const swapsInterval = setInterval(() => {
            console.log('CALLING fetchUserSwapsFromAddress');
            fetchUserSwapsFromAddress();
        }, 2000);

        return () => clearInterval(swapsInterval); // Cleanup interval on component unmount
    }, [address, selectedInputAsset]);

    // [4] fetch deposit vaults
    const fetchUserSwapsFromAddress = async () => {
        console.log('fetchUserSwapsFromAddress');
        if (!address) {
            console.log('no wallet connected, cannot lookup swap data by address');
            return;
        }
        if (!selectedInputAsset) {
            console.log('no selected asset, cannot lookup swap data by address');
            return;
        }

        const rawSwaps = await getSwapsForAddress(selectedInputAsset.dataEngineUrl, {
            address: address,
            page: 0,
        });

        console.log('rawSwaps', rawSwaps);

        // Transform the raw data into your flattened Swap type
        const typedSwaps = rawSwaps.map((item: any) => {
            const d = item.deposit.deposit; // the nested deposit object

            return {
                // Flattened from deposit.deposit
                vaultIndex: d.vaultIndex,
                depositTimestamp: d.depositTimestamp,
                depositAmount: d.depositAmount,
                depositFee: d.depositFee,
                expectedSats: d.expectedSats,
                btcPayoutScriptPubKey: d.btcPayoutScriptPubKey,
                specifiedPayoutAddress: d.specifiedPayoutAddress,
                ownerAddress: d.ownerAddress,
                salt: d.salt,
                confirmationBlocks: d.confirmationBlocks,
                attestedBitcoinBlockHeight: d.attestedBitcoinBlockHeight,

                // Flattened from deposit
                deposit_block_number: item.deposit.deposit_block_number,
                deposit_block_hash: item.deposit.deposit_block_hash,
                deposit_txid: item.deposit.deposit_txid,

                // Existing field
                swap_proofs: item.swap_proofs,
            };
        });

        // Now we have typed swaps according to your Swap interface
        console.log('typedSwaps', typedSwaps);

        // Finally, set them in your component state (or wherever you're storing them)
        setUserSwapsFromAddress(typedSwaps);
    };

    // New function to refresh user swaps
    const refreshUserSwapsFromAddress = async () => {
        await fetchUserSwapsFromAddress();
    };

    const value = {
        loading: isLoading,
        error: null,
        userSwapsFromAddress: [],
        refreshConnectedUserBalance,
        refreshUserSwapsFromAddress,
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
