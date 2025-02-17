import { useState, useCallback, useEffect } from 'react';
import { ethers, BigNumber } from 'ethers';
import { useStore } from '../../store';
import { ERC20ABI } from '../../utils/constants';
import { BlockLeaf } from '../../types';
import { useContractData } from '../../components/providers/ContractDataProvider';

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

// Updated to match the smart contract struct
interface DepositLiquidityParams {
    signer: ethers.providers.JsonRpcSigner;
    riftExchangeAbi: ethers.ContractInterface;
    riftExchangeContractAddress: string;
    tokenAddress: string;
    params: {
        specifiedPayoutAddress: string;
        depositAmount: BigNumber;
        expectedSats: BigNumber;
        btcPayoutScriptPubKey: string;
        depositSalt: string;
        confirmationBlocks: number;
        tipBlockLeaf: BlockLeaf;
        tipBlockSiblings: string[];
        tipBlockPeaks: string[];
    };
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
    const validAssets = useStore((state) => state.validAssets);
    const { refreshUserSwapsFromAddress } = useContractData();

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
                const riftExchangeContractInstance = new ethers.Contract(params.riftExchangeContractAddress, params.riftExchangeAbi, params.signer);

                // Check allowance
                const allowance = await tokenContract.allowance(userEthAddress, params.riftExchangeContractAddress);
                if (BigNumber.from(allowance).lt(params.params.depositAmount)) {
                    setStatus(DepositStatus.WaitingForDepositTokenApproval);
                    const approveTx = await tokenContract.approve(params.riftExchangeContractAddress, validAssets[selectedInputAsset.name].connectedUserBalanceRaw);

                    setStatus(DepositStatus.ApprovalPending);
                    await approveTx.wait();
                }

                setStatus(DepositStatus.WaitingForWalletConfirmation);

                // Estimate gas with the new struct parameter
                const estimatedGas = await riftExchangeContractInstance.estimateGas.depositLiquidity(params.params);
                const doubledGasLimit = estimatedGas.mul(2);

                // Call depositLiquidity with the new struct parameter
                const depositTx = await riftExchangeContractInstance.depositLiquidity(params.params, {
                    gasLimit: doubledGasLimit,
                });

                setStatus(DepositStatus.DepositPending);
                setTxHash(depositTx.hash);
                await depositTx.wait();
                setStatus(DepositStatus.Confirmed);
                refreshUserSwapsFromAddress();
            } catch (err) {
                console.error('Error in depositLiquidity:', err);
                setError(err instanceof Error ? err.message : JSON.stringify(err, null, 2));
                setStatus(DepositStatus.Error);
            }
        },
        [isClient, userEthAddress, selectedInputAsset, validAssets],
    );

    if (!isClient) {
        return {
            depositLiquidity: () => Promise.resolve(),
            status: DepositStatus.Idle,
            error: null,
            txHash: null,
            resetDepositState: () => {},
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
