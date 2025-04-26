import { ethers } from 'ethers';
import { StateCreator } from 'zustand';
import { UserSwap, StoreState } from '../../types';

// User slice state and actions
export interface UserSlice {
    // User account
    userEthAddress: string;
    ethersRpcProvider: ethers.providers.Provider | null;

    // User swaps
    userSwapsFromAddress: UserSwap[];
    userSwapsLoadingState: 'loading' | 'error' | 'received';

    // Actions
    setUserEthAddress: (address: string) => void;
    setEthersRpcProvider: (provider: ethers.providers.Provider) => void;
    setUserSwapsFromAddress: (swaps: UserSwap[]) => void;
    setUserSwapsLoadingState: (state: 'loading' | 'error' | 'received') => void;
}

// Create the user slice
export const createUserSlice: StateCreator<StoreState, [], [], UserSlice> = (set) => ({
    // User account
    userEthAddress: '',
    ethersRpcProvider: null,

    // User swaps
    userSwapsFromAddress: [],
    userSwapsLoadingState: 'loading',

    // Actions
    setUserEthAddress: (userEthAddress) => set({ userEthAddress }),
    setEthersRpcProvider: (provider) => set({ ethersRpcProvider: provider }),
    setUserSwapsFromAddress: (swaps) => set({ userSwapsFromAddress: swaps }),
    setUserSwapsLoadingState: (state) => set({ userSwapsLoadingState: state }),
});
