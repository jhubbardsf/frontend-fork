import { useState } from 'react';
import { ethers, BigNumberish } from 'ethers';
import { useContractData } from '../../components/providers/ContractDataProvider';

export enum WithdrawStatus {
    Idle = 'idle',
    WaitingForWalletConfirmation = 'waitingForWalletConfirmation',
    InitiatingWithdrawal = 'initiatingWithdrawal',
    WithdrawingLiquidity = 'withdrawingLiquidity',
    WithdrawalPending = 'withdrawalPending',
    Confirmed = 'confirmed',
    Error = 'error',
}

interface WithdrawLiquidityParams {
    signer: ethers.Signer;
    riftExchangeAbi: ethers.ContractInterface;
    riftExchangeContract: string;
    globalVaultIndex: number;
    amountToWithdraw: BigNumberish;
    expiredReservationIndexes: number[];
}

export function useWithdrawLiquidity() {
    const [status, setStatus] = useState<WithdrawStatus>(WithdrawStatus.Idle);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const { refreshUserSwapsFromAddress } = useContractData();

    const resetWithdrawState = () => {
        setStatus(WithdrawStatus.Idle);
        setError(null);
        setTxHash(null);
    };

    const withdrawLiquidity = async (params: WithdrawLiquidityParams) => {
        setStatus(WithdrawStatus.WaitingForWalletConfirmation);
        setError(null);
        setTxHash(null);

        try {
            console.log('Withdrawing liquidity...');
            console.log('globalVaultIndex:', params.globalVaultIndex);
            console.log('amountToWithdraw:', params.amountToWithdraw.toString());
            console.log('expiredReservationIndexes:', params.expiredReservationIndexes);

            setStatus(WithdrawStatus.InitiatingWithdrawal);

            const riftExchangeContractInstance = new ethers.Contract(params.riftExchangeContract, params.riftExchangeAbi, params.signer);

            setStatus(WithdrawStatus.WithdrawingLiquidity);

            const withdrawTx = await riftExchangeContractInstance.withdrawLiquidity(params.globalVaultIndex, params.amountToWithdraw, params.expiredReservationIndexes);

            setTxHash(withdrawTx.hash);
            setStatus(WithdrawStatus.WithdrawalPending);

            await withdrawTx.wait();

            console.log('Liquidity withdrawn successfully');
            setStatus(WithdrawStatus.Confirmed);
            refreshUserSwapsFromAddress();
        } catch (err) {
            console.error('Error in withdrawLiquidity:', err);
            setError(err instanceof Error ? err.message : String(err));
            setStatus(WithdrawStatus.Error);
        }
    };

    return {
        withdrawLiquidity,
        status,
        error,
        txHash,
        resetWithdrawState,
    };
}
