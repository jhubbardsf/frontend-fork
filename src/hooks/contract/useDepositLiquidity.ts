import { useState, useCallback, useEffect } from 'react';
import { ethers, BigNumber, BigNumberish } from 'ethers';
import { useStore } from '../../store';
import { ERC20ABI } from '../../utils/constants';
import { useAccount } from 'wagmi';
import { useContractData } from '../../components/providers/ContractDataProvider';
import { BlockLeaf } from '../../types';
import { getSwapsForAddress } from '../../utils/dataEngineClient';

export enum DepositStatus {
    Idle = 'idle',
    WaitingForWalletConfirmation = 'waitingForWalletConfirmation',
    WaitingForDepositTokenApproval = 'ApprovingDepositToken',
    ApprovalPending = 'approvalPending',
    WaitingForDepositApproval = 'WaitingForDepositApproval',
    DepositPending = 'depositPending',
    Confirmed = 'confirmed',
    Error = 'error',
}

interface DepositLiquidityParams {
    signer: ethers.Signer;
    riftExchangeAbi: ethers.ContractInterface;
    riftExchangeContractAddress: string;
    tokenAddress: string;
    // ---- depositLiquidity() contract params -----
    specifiedPayoutAddress: string;
    depositAmountInSmallestTokenUnit: BigNumber;
    expectedSats: BigNumber;
    btcPayoutScriptPubKey: string;
    depositSalt: string;
    confirmationBlocks: number;
    tipBlockLeaf: BlockLeaf;
    tipBlockSiblings: string[];
    tipBlockPeaks: string[];
}

function useIsClient() {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);
    return isClient;
}

export function useDepositLiquidity() {
    const isClient = useIsClient();
    const [status, setStatus] = useState<DepositStatus>(DepositStatus.Idle);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const userEthAddress = useStore((state) => state.userEthAddress);
    const { refreshAllDepositData } = useContractData();
    const validAssets = useStore((state) => state.validAssets);

    const resetDepositState = useCallback(() => {
        if (isClient) {
            setStatus(DepositStatus.Idle);
            setError(null);
            setTxHash(null);
        }
    }, [isClient]);

    const depositLiquidity = useCallback(
        async (params: DepositLiquidityParams) => {
            if (!isClient) return;

            setStatus(DepositStatus.WaitingForWalletConfirmation);
            setError(null);
            setTxHash(null);

            try {
                const tokenContract = new ethers.Contract(params.tokenAddress, ERC20ABI, params.signer);
                console.log('tokenContractAddress', params.tokenAddress);
                console.log('riftExchangeContractAddress', params.riftExchangeContractAddress);
                const riftExchangeContractInstance = new ethers.Contract(params.riftExchangeContractAddress, params.riftExchangeAbi, params.signer);
                console.log("userEthAddress", userEthAddress);

                // [0] TODO: Replace with n allowance system from alpine ------------------------
                const allowance = await tokenContract.allowance(userEthAddress, params.riftExchangeContractAddress);
                console.log('allowance:', allowance.toString());
                console.log('tokenDepositAmountInSmallestTokenUnits:', params.depositAmountInSmallestTokenUnit.toString());
                if (BigNumber.from(allowance).lt(BigNumber.from(params.depositAmountInSmallestTokenUnit))) {
                    setStatus(DepositStatus.WaitingForDepositTokenApproval);
                    const approveTx = await tokenContract.approve(params.riftExchangeContractAddress, validAssets[selectedInputAsset.name].connectedUserBalanceRaw);

                    setStatus(DepositStatus.ApprovalPending);
                    await approveTx.wait();
                }
                // --------------------------------

                setStatus(DepositStatus.WaitingForWalletConfirmation);

                // [1] set gas limit as 2x estimated gas
                const estimatedGas = await riftExchangeContractInstance.estimateGas.depositLiquidity(
                    params.specifiedPayoutAddress,
                    params.depositAmountInSmallestTokenUnit,
                    params.expectedSats,
                    params.btcPayoutScriptPubKey,
                    params.depositSalt,
                    params.confirmationBlocks,
                    params.tipBlockLeaf,
                    params.tipBlockSiblings,
                    params.tipBlockPeaks,
                );
                const doubledGasLimit = estimatedGas.mul(2);
                console.log("Estimate gas succeeded!");

                // [2] deposit liquidity
                const depositTx = await riftExchangeContractInstance.depositLiquidity(
                    params.specifiedPayoutAddress,
                    params.depositAmountInSmallestTokenUnit,
                    params.expectedSats,
                    params.btcPayoutScriptPubKey,
                    params.depositSalt,
                    params.confirmationBlocks,
                    params.tipBlockLeaf,
                    params.tipBlockSiblings,
                    params.tipBlockPeaks,
                    {
                        gasLimit: doubledGasLimit,
                    },
                );
                setStatus(DepositStatus.DepositPending);

                setTxHash(depositTx.hash);
                await depositTx.wait();
                setStatus(DepositStatus.Confirmed);
                refreshAllDepositData();
                console.log('Deposit confirmed');

            } catch (err) {
                console.error('Error in depositLiquidity:', err);
                setError(err instanceof Error ? err.message : JSON.stringify(err, null, 2));
                setStatus(DepositStatus.Error);
            }
        },
        [isClient, userEthAddress, selectedInputAsset, validAssets, refreshAllDepositData],
    );

    if (!isClient) {
        return {
            depositLiquidity: () => Promise.resolve(),
            status: DepositStatus.Idle,
            error: null,
            txHash: null,
            resetDepositState: () => { },
        };
    }

    return {
        depositLiquidity,
        status,
        error,
        txHash,
        resetDepositState,
    };
}
