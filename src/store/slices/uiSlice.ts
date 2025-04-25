// src/store/slices/uiSlice.ts
import { StateCreator } from 'zustand';
import { CurrencyModalTitle, StoreState } from '../../types';
import { getDeploymentValue } from '../../utils/deploymentUtils';
import {
    DEPLOYMENT_TYPE,
    MAINNET_BASE_CHAIN_ID,
    TESTNET_BASE_CHAIN_ID,
    DEVNET_BASE_CHAIN_ID,
} from '../../utils/constants';

// UI slice state and actions
export interface UiSlice {
    // Modal state
    currencyModalTitle: CurrencyModalTitle;

    // Network
    isOnline: boolean;
    selectedChainID: number;

    // Actions
    setCurrencyModalTitle: (title: CurrencyModalTitle) => void;
    setIsOnline: (isOnline: boolean) => void;
    setSelectChainID: (chainID: number) => void;
}

// Create the UI slice
export const createUiSlice: StateCreator<StoreState, [], [], UiSlice> = (set) => {
    // Get the current chain ID
    const currentChainId = getDeploymentValue(
        DEPLOYMENT_TYPE,
        MAINNET_BASE_CHAIN_ID,
        TESTNET_BASE_CHAIN_ID,
        DEVNET_BASE_CHAIN_ID,
    );

    return {
        // Modal state
        currencyModalTitle: 'close',

        // Network
        isOnline: true,
        selectedChainID: currentChainId,

        // Actions
        setCurrencyModalTitle: (currencyModalTitle) => set({ currencyModalTitle }),
        setIsOnline: (isOnline) => set({ isOnline }),
        setSelectChainID: (selectedChainID) => set({ selectedChainID }),
    };
};
