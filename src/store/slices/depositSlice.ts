import { StateCreator } from 'zustand';
import { StoreState } from '../../types';

// Deposit slice state and actions
export interface DepositSlice {
    // Deposit flow state
    depositFlowState: '0-not-started' | '1-confirm-deposit';
    coinbaseBtcDepositAmount: string;
    depositMode: boolean;
    withdrawAmount: string;
    areNewDepositsPaused: boolean;
    isGasFeeTooHigh: boolean;

    // Actions
    setDepositFlowState: (state: '0-not-started' | '1-confirm-deposit') => void;
    setCoinbaseBtcDepositAmount: (amount: string) => void;
    setDepositMode: (mode: boolean) => void;
    setWithdrawAmount: (amount: string) => void;
    setAreNewDepositsPaused: (paused: boolean) => void;
    setIsGasFeeTooHigh: (isGasFeeTooHigh: boolean) => void;
}

// Create the deposit slice
export const createDepositSlice: StateCreator<StoreState, [], [], DepositSlice> = (set) => ({
    // Deposit flow state
    depositFlowState: '0-not-started',
    coinbaseBtcDepositAmount: '',
    depositMode: true,
    withdrawAmount: '',
    areNewDepositsPaused: false,
    isGasFeeTooHigh: false,

    // Actions
    setDepositFlowState: (depositFlowState) => set({ depositFlowState }),
    setCoinbaseBtcDepositAmount: (coinbaseBtcDepositAmount) => set({ coinbaseBtcDepositAmount }),
    setDepositMode: (depositMode) => set({ depositMode }),
    setWithdrawAmount: (withdrawAmount) => set({ withdrawAmount }),
    setAreNewDepositsPaused: (areNewDepositsPaused) => set({ areNewDepositsPaused }),
    setIsGasFeeTooHigh: (isGasFeeTooHigh) => set({ isGasFeeTooHigh }),
});
