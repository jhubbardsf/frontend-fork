import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { useStore } from '../../store';
import { useAccount } from 'wagmi';
import { formatUnits } from 'ethers/lib/utils';
import { checkIfNewDepositsArePaused, getTokenBalance } from '../../utils/contractReadFunctions';
import { DEVNET_BASE_CHAIN_ID, DEVNET_BASE_RPC_URL, ERC20ABI, IS_FRONTEND_PAUSED } from '../../utils/constants';
import riftExchangeABI from '../../abis/RiftExchange.json';
import { getUSDPrices } from '../../utils/fetchUniswapPrices';
import { getSwapsForAddress } from '../../utils/dataEngineClient';
import { addNetwork } from '../../utils/dappHelper';
import { TokenMeta, ValidAsset } from '../../types';

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

    const isTokenMeta = !('contractRpcURL' in selectedInputAsset);

    const contractRpcURL = (selectedInputAsset as ValidAsset).contractRpcURL || DEVNET_BASE_RPC_URL;
    const contractChainID = (selectedInputAsset as ValidAsset).contractChainID || DEVNET_BASE_CHAIN_ID;
    // [0] set ethers provider when selectedInputAsset changes
    useEffect(() => {
        if ((contractRpcURL && window.ethereum) || !ethersRpcProvider) {
            const provider = new ethers.providers.StaticJsonRpcProvider(contractRpcURL, { chainId: contractChainID, name: selectedInputAsset.name });
            if (!provider) return;
            setEthersRpcProvider(provider);
        }
    }, [contractRpcURL, address, isConnected]);

    // [1] check if MetaMask is on the correct network and switch if needed
    useEffect(() => {
        const checkAndSwitchNetwork = async () => {
            if (!window.ethereum || !selectedInputAsset || !isConnected) return;

            try {
                // Get current chain ID from MetaMask
                const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                const currentChainId = parseInt(chainIdHex, 16);

                // If already on the correct chain, no need to switch
                if (currentChainId === contractChainID) return;

                console.log('Switching network to match selected asset');
                console.log('Current chainId:', currentChainId);
                console.log('Target chainId:', contractChainID);

                // Convert chainId to hex format for MetaMask
                const hexChainId = `0x${contractChainID.toString(16)}`;

                try {
                    // Attempt to switch to the target network
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: hexChainId }],
                    });
                    console.log('Switched to the existing network successfully');
                } catch (error) {
                    // Error code 4902 indicates the chain is not available
                    console.error('Network switch error:', error);
                    if (error.code === 4902) {
                        console.log('Network not available in MetaMask. Attempting to add network.');

                        try {
                            // Attempt to add the network if it's not found
                            await addNetwork(selectedInputAsset.chainDetails);
                            console.log('Network added successfully');

                            // After adding, attempt to switch to the new network
                            await window.ethereum.request({
                                method: 'wallet_switchEthereumChain',
                                params: [{ chainId: hexChainId }],
                            });
                            console.log('Switched to the newly added network successfully');
                        } catch (addNetworkError) {
                            console.error('Failed to add or switch to network:', addNetworkError);
                        }
                    } else {
                        console.error('Error switching network:', error);
                    }
                }
            } catch (error) {
                console.error('Error checking or switching network:', error);
            }
        };

        checkAndSwitchNetwork();
    }, [selectedInputAsset, isConnected]);

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
                // TODO: This needs updating
                if (btcPriceUSD !== '0') updatePriceUsd(useStore.getState().validAssets.BTC.name, parseFloat(btcPriceUSD));
                if (cbbtcPriceUSD !== '0') updatePriceUsd(useStore.getState().validAssets.CoinbaseBTC.name, parseFloat(cbbtcPriceUSD));
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

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
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
        const typedSwaps = rawSwaps.map((item) => {
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
