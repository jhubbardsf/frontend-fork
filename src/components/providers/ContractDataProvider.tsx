import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { BigNumber, ethers } from 'ethers';
import { useStore } from '../../store';
import { useAccount } from 'wagmi';
import { formatUnits } from 'ethers/lib/utils';
import { checkIfNewDepositsArePaused, getTokenBalance } from '../../utils/contractReadFunctions';
import { DEVNET_BASE_CHAIN_ID, DEVNET_BASE_RPC_URL, ERC20ABI, IS_FRONTEND_PAUSED } from '../../utils/constants';
import riftExchangeABI from '../../abis/RiftExchange.json';
import { getUSDPrices } from '../../utils/fetchUniswapPrices';
import { getSwapsForAddress } from '../../utils/dataEngineClient';
import { addNetwork } from '../../utils/dappHelper';
import { TokenMeta, ValidAsset, UserSwap, NestedDepositData, ContractDataContextType } from '../../types';
import { modal } from '../../config/reown';

// Define an interface for the nested deposit object if DepositVault isn't available
const ContractDataContext = createContext<ContractDataContextType | undefined>(undefined);

export function ContractDataProvider({ children }: { children: ReactNode }) {
    const { address, isConnected } = useAccount();
    const setEthersRpcProvider = useStore((state) => state.setEthersRpcProvider);
    const setUserEthAddress = useStore((state) => state.setUserEthAddress);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const updatePriceUsd = useStore((state) => state.updatePriceUSD);
    const updateConnectedUserBalanceRaw = useStore((state) => state.updateConnectedUserBalanceRaw);
    const updateConnectedUserBalanceFormatted = useStore((state) => state.updateConnectedUserBalanceFormatted);
    const setAreNewDepositsPaused = useStore((state) => state.setAreNewDepositsPaused);
    const [isLoading, setIsLoading] = useState(false);
    const setUserSwapsFromAddress = useStore((state) => state.setUserSwapsFromAddress);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const setUserSwapsLoadingState = useStore((state) => state.setUserSwapsLoadingState);

    const contractRpcURL = (selectedInputAsset as ValidAsset)?.contractRpcURL || DEVNET_BASE_RPC_URL;
    const contractChainID = (selectedInputAsset as ValidAsset)?.contractChainID || DEVNET_BASE_CHAIN_ID;

    // [1] fetch selected asset user balance - Reads latest state directly
    const fetchSelectedAssetUserBalance = async () => {
        const currentAddress = modal.getAddress();
        const currentAsset = useStore.getState().selectedInputAsset;
        const currentProvider = new ethers.providers.Web3Provider(window.ethereum);
        const currentIsConnected = modal.getIsConnectedState();

        if (!currentAddress || !currentAsset || !currentProvider || !currentIsConnected) {
            updateConnectedUserBalanceRaw(currentAsset?.name || 'unknown', BigNumber.from(0));
            updateConnectedUserBalanceFormatted(currentAsset?.name || 'unknown', '0');
            return;
        }

        try {
            const balance = await getTokenBalance(currentProvider, currentAsset.tokenAddress, currentAddress, ERC20ABI);

            updateConnectedUserBalanceRaw(currentAsset.name, balance);

            const formattedBalance = formatUnits(balance, currentAsset.decimals);
            updateConnectedUserBalanceFormatted(currentAsset.name, formattedBalance);
        } catch (error) {
            console.error(`FetchBalance: Error fetching ${currentAsset.name} balance:`, error);
            updateConnectedUserBalanceRaw(currentAsset.name, BigNumber.from(0));
            updateConnectedUserBalanceFormatted(currentAsset.name, '0');
        }
    };

    // [3] check if MetaMask is on the correct network and switch if needed
    useEffect(() => {
        const checkAndSwitchNetwork = async () => {
            const ethereum = window.ethereum as any;
            if (!ethereum?.request || !selectedInputAsset || !isConnected) {
                return;
            }

            try {
                const chainIdHex = await ethereum.request({ method: 'eth_chainId' });
                if (!chainIdHex) return;
                const currentChainId = parseInt(chainIdHex, 16);

                if (currentChainId === contractChainID) {
                    return;
                }

                const hexChainId = `0x${contractChainID.toString(16)}`;

                try {
                    await ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: hexChainId }],
                    });
                } catch (switchError: any) {
                    console.error('SwitchNetwork: Error during switch', switchError);
                    if (switchError.code === 4902) {
                        try {
                            if (!selectedInputAsset.chainDetails) {
                                console.error(
                                    'SwitchNetwork: Cannot add network, chainDetails missing on selectedInputAsset',
                                );
                                return;
                            }
                            await addNetwork(selectedInputAsset.chainDetails);
                            await ethereum.request({
                                method: 'wallet_switchEthereumChain',
                                params: [{ chainId: hexChainId }],
                            });
                        } catch (addError) {
                            console.error('SwitchNetwork: Failed to add or switch after adding:', addError);
                        }
                    }
                }
            } catch (error) {
                console.error('SwitchNetwork: Error checking network:', error);
            }
        };

        if (isConnected && contractChainID) {
            checkAndSwitchNetwork();
        }
    }, [selectedInputAsset, isConnected, contractChainID]);

    // [4] Continuously fetch non-wallet-dependent data (prices, pause status)
    useEffect(() => {
        const checkIfNewDepositsArePausedFromContract = async () => {
            if (!useStore.getState().ethersRpcProvider || !selectedInputAsset) return;
            // TODO - update this with new contract pause functionality if we have it
            // const areNewDepositsPausedBool = await checkIfNewDepositsArePaused(ethersRpcProvider, riftExchangeABI.abi, selectedInputAsset.riftExchangeContractAddress);
            setAreNewDepositsPaused(IS_FRONTEND_PAUSED);
        };

        // [4] call check if new deposits are paused in the contract
        checkIfNewDepositsArePausedFromContract();

        if (!intervalRef.current) {
            intervalRef.current = setInterval(() => {
                fetchSelectedAssetUserBalance();
                checkIfNewDepositsArePausedFromContract();
            }, 12000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedInputAsset, updatePriceUsd, setAreNewDepositsPaused]);

    // Define the function to fetch user swaps
    const fetchUserSwapsFromAddress = async () => {
        const currentAddress = useStore.getState().userEthAddress;
        if (!currentAddress || !selectedInputAsset?.dataEngineUrl) {
            setUserSwapsFromAddress([]);
            setUserSwapsLoadingState('error');
            return;
        }
        try {
            const { swaps: rawSwaps, status } = await getSwapsForAddress(selectedInputAsset.dataEngineUrl, {
                address: currentAddress,
                page: 0,
            });
            setUserSwapsLoadingState(status);

            const typedSwaps = rawSwaps.map((item): UserSwap => {
                const d = item.deposit.deposit as NestedDepositData;
                return {
                    vaultIndex: d.vaultIndex,
                    depositTimestamp: d.depositTimestamp,
                    depositAmount: d.depositAmount,
                    depositFee: d.depositFee,
                    expectedSats: d.expectedSats,
                    btcPayoutScriptPubKey: d.btcPayoutScriptPubKey,
                    specifiedPayoutAddress: d.specifiedPayoutAddress,
                    ownerAddress: d.ownerAddress,
                    salt: d.salt ?? '',
                    confirmationBlocks: d.confirmationBlocks,
                    attestedBitcoinBlockHeight: d.attestedBitcoinBlockHeight,
                    deposit_block_number: item.deposit.deposit_block_number,
                    deposit_block_hash: item.deposit.deposit_block_hash,
                    deposit_txid: item.deposit.deposit_txid,
                    swap_proofs: item.swap_proofs,
                };
            });
            setUserSwapsFromAddress(typedSwaps);
        } catch (error) {
            console.error('FetchSwaps: Error fetching swaps:', error);
            setUserSwapsFromAddress([]);
            setUserSwapsLoadingState('error');
        }
    };

    // [5] Fetch user swaps (can run less frequently)
    useEffect(() => {
        fetchUserSwapsFromAddress();
        const swapsInterval = setInterval(fetchUserSwapsFromAddress, 30000);

        return () => clearInterval(swapsInterval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedInputAsset, setUserSwapsFromAddress, setUserSwapsLoadingState]);

    const refreshConnectedUserBalance = async () => {
        await fetchSelectedAssetUserBalance();
    };

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
