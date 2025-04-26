import { StateCreator } from 'zustand';
import { ReserveLiquidityParams, UserSwap, StoreState } from '../../types';
import { REQUIRED_BLOCK_CONFIRMATIONS } from '../../utils/constants';

// Swap slice state and actions
export interface SwapSlice {
    // Swap flow state
    swapFlowState:
        | '0-not-started'
        | '1-reserve-liquidity'
        | '2-send-bitcoin'
        | '3-receive-evm-token'
        | '4-completed'
        | '5-expired';
    btcInputSwapAmount: string;
    btcOutputAmount: string;
    coinbaseBtcOutputAmount: string;
    payoutBTCAddress: string;
    lowestFeeReservationParams: ReserveLiquidityParams | null;
    showManageReservationScreen: boolean;
    swapReservationNotFound: boolean;
    currentReservationState: string;
    confirmationBlocksNeeded: number;
    currentTotalBlockConfirmations: number;
    proxyWalletSwapStatus: number;
    ethPayoutAddress: string;
    bitcoinSwapTransactionHash: string;
    protocolFeeAmountMicroUsdt: string;

    // Selected swap to manage
    selectedSwapToManage: UserSwap | null;
    showManageDepositVaultsScreen: boolean;

    // Actions
    setSwapFlowState: (
        state:
            | '0-not-started'
            | '1-reserve-liquidity'
            | '2-send-bitcoin'
            | '3-receive-evm-token'
            | '4-completed'
            | '5-expired',
    ) => void;
    setBtcInputSwapAmount: (amount: string) => void;
    setBtcOutputAmount: (amount: string) => void;
    setCoinbaseBtcOutputAmount: (amount: string) => void;
    setPayoutBTCAddress: (address: string) => void;
    setLowestFeeReservationParams: (reservation: ReserveLiquidityParams | null) => void;
    setShowManageReservationScreen: (show: boolean) => void;
    setSwapReservationNotFound: (notFound: boolean) => void;
    setCurrentReservationState: (state: string) => void;
    setConfirmationBlocksNeeded: (blocks: number) => void;
    setCurrentTotalBlockConfirmations: (confirmations: number) => void;
    setProxyWalletSwapStatus: (status: number) => void;
    setEthPayoutAddress: (address: string) => void;
    setBitcoinSwapTransactionHash: (hash: string) => void;
    setProtocolFeeAmountMicroUsdt: (amount: string) => void;
    setSelectedSwapToManage: (swap: UserSwap | null) => void;
    setShowManageDepositVaultsScreen: (show: boolean) => void;
}

// Create the swap slice
export const createSwapSlice: StateCreator<StoreState, [], [], SwapSlice> = (set) => ({
    // Swap flow state
    swapFlowState: '0-not-started',
    btcInputSwapAmount: '',
    btcOutputAmount: '',
    coinbaseBtcOutputAmount: '',
    payoutBTCAddress: '',
    lowestFeeReservationParams: null,
    showManageReservationScreen: false,
    swapReservationNotFound: false,
    currentReservationState: '',
    confirmationBlocksNeeded: REQUIRED_BLOCK_CONFIRMATIONS,
    currentTotalBlockConfirmations: 0,
    proxyWalletSwapStatus: 0,
    ethPayoutAddress: '',
    bitcoinSwapTransactionHash: '',
    protocolFeeAmountMicroUsdt: '',

    // Selected swap to manage
    selectedSwapToManage: null,
    showManageDepositVaultsScreen: false,

    // Actions
    setSwapFlowState: (swapFlowState) => set({ swapFlowState }),
    setBtcInputSwapAmount: (btcInputSwapAmount) => set({ btcInputSwapAmount }),
    setBtcOutputAmount: (btcOutputAmount) => set({ btcOutputAmount }),
    setCoinbaseBtcOutputAmount: (coinbaseBtcOutputAmount) => set({ coinbaseBtcOutputAmount }),
    setPayoutBTCAddress: (payoutBTCAddress) => set({ payoutBTCAddress }),
    setLowestFeeReservationParams: (lowestFeeReservationParams) => set({ lowestFeeReservationParams }),
    setShowManageReservationScreen: (showManageReservationScreen) => set({ showManageReservationScreen }),
    setSwapReservationNotFound: (swapReservationNotFound) => set({ swapReservationNotFound }),
    setCurrentReservationState: (currentReservationState) => set({ currentReservationState }),
    setConfirmationBlocksNeeded: (confirmationBlocksNeeded) => set({ confirmationBlocksNeeded }),
    setCurrentTotalBlockConfirmations: (currentTotalBlockConfirmations) => set({ currentTotalBlockConfirmations }),
    setProxyWalletSwapStatus: (proxyWalletSwapStatus) => set({ proxyWalletSwapStatus }),
    setEthPayoutAddress: (ethPayoutAddress) => set({ ethPayoutAddress }),
    setBitcoinSwapTransactionHash: (bitcoinSwapTransactionHash) => set({ bitcoinSwapTransactionHash }),
    setProtocolFeeAmountMicroUsdt: (protocolFeeAmountMicroUsdt) => set({ protocolFeeAmountMicroUsdt }),
    setSelectedSwapToManage: (selectedSwapToManage) => set({ selectedSwapToManage }),
    setShowManageDepositVaultsScreen: (showManageDepositVaultsScreen) => set({ showManageDepositVaultsScreen }),
});
