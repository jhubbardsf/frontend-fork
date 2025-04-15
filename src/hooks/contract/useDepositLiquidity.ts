import { useState, useCallback, useEffect } from 'react';
import { ethers, BigNumber } from 'ethers';
import { useStore } from '../../store';
import { ERC20ABI } from '../../utils/constants';
import { BlockLeaf } from '../../types';
import { useContractData } from '../../components/providers/ContractDataProvider';
import { useBundlerCaller } from '@/utils/bundleCaller';
import { SwapRoute } from '@uniswap/smart-order-router';
import { useWaitForTransactionReceipt } from 'wagmi';

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

/*
      *
     * @notice Struct for depositLiquidity parameters
     *
     * @param specifiedPayoutAddress Address to receive swap proceeds
     * @param depositAmount Amount of ERC20 tokens to deposit including fee
     * @param expectedSats Expected BTC output in satoshis
     * @param btcPayoutScriptPubKey Bitcoin script for receiving BTC
     * @param depositSalt User generated salt for vault nonce
     * @param confirmationBlocks Number of Bitcoin blocks required for confirmation
     * @param safeBlockLeaf The leaf representing a block the depositor believes is highly unlikely to be reorged out of the chain
     * @param safeBlockSiblings Merkle proof siblings for safe block inclusion
     * @param safeBlockPeaks MMR peaks for safe block inclusion
    struct DepositLiquidityParams {
        address depositOwnerAddress;
        address specifiedPayoutAddress;
        uint256 depositAmount;
        uint64 expectedSats;
        bytes22 btcPayoutScriptPubKey;
        bytes32 depositSalt;
        uint8 confirmationBlocks;
        Types.BlockLeaf safeBlockLeaf;
        bytes32[] safeBlockSiblings;
        bytes32[] safeBlockPeaks;
    }
  */

// Updated to match the smart contract struct
interface DepositLiquidityParams {
    signer: ethers.providers.JsonRpcSigner;
    riftExchangeAbi: ethers.ContractInterface;
    riftExchangeContractAddress: string;
    tokenAddress: string;
    params: {
        depositOwnerAddress: string;
        specifiedPayoutAddress: string;
        depositAmount: BigNumber;
        expectedSats: BigNumber;
        btcPayoutScriptPubKey: string;
        depositSalt: string;
        confirmationBlocks: number;
        safeBlockLeaf: BlockLeaf;
        safeBlockSiblings: string[];
        safeBlockPeaks: string[];
    };
    forceError?: string;
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
    const {
        proceedWithBundler,
        status: bundlerStatus,
        error: bundlerError,
        data: bundlerTxHash,
        ...rest
    } = useBundlerCaller();

    const {
        data,
        isLoading: ConfirmingCreation,
        isSuccess: creationSuccess,
        error: transactionError,
        ...receiptRest
    } = useWaitForTransactionReceipt({
        confirmations: 1,
        hash: bundlerTxHash,
    });

    console.log('Bundler transaction receipt data', {
        data,
        ConfirmingCreation,
        creationSuccess,
        transactionError,
        ...receiptRest,
    });

    useEffect(() => {
        if (bundlerStatus === DepositStatus.Error || transactionError) {
            setError(bundlerError?.message || transactionError.message);
            setStatus(DepositStatus.Error);
        }

        if (bundlerStatus === 'pending') {
            setError(null);
            setTxHash(bundlerTxHash);
            setStatus(DepositStatus.DepositPending);
        }

        if (bundlerStatus === 'success' && ConfirmingCreation) {
            setTxHash(bundlerTxHash);
            setStatus(DepositStatus.DepositPending);
        }

        if (bundlerStatus === 'success' && creationSuccess) {
            setTxHash(bundlerTxHash);
            setStatus(DepositStatus.Confirmed);
        }
    }, [ConfirmingCreation, bundlerError, bundlerStatus, bundlerTxHash, creationSuccess, rest, transactionError]);

    const resetDepositState = useCallback(() => {
        if (isClient) {
            setStatus(DepositStatus.Idle);
            setError(null);
            setTxHash(null);
        }
    }, [isClient]);

    const depositLiquidity = useCallback(
        async (params: DepositLiquidityParams, swapRoute: SwapRoute = undefined) => {
            if (!isClient) return;

            setStatus(DepositStatus.WaitingForWalletConfirmation);
            setError(null);
            setTxHash(null);

            if (params.forceError) {
                setError(params.forceError);
                setStatus(DepositStatus.Error);
                return;
            }

            try {
                const tokenContract = new ethers.Contract(params.tokenAddress, ERC20ABI, params.signer);
                const riftExchangeContractInstance = new ethers.Contract(
                    params.riftExchangeContractAddress,
                    params.riftExchangeAbi,
                    params.signer,
                );

                // TODO: Separate cbBTC/other ERC20 tokens from BTC
                const isCoinbaseBTC = selectedInputAsset.symbol === 'cbBTC';
                // Check allowance
                if (isCoinbaseBTC) {
                    console.log('Is Coinbase BTC');
                    const allowance = await tokenContract.allowance(userEthAddress, params.riftExchangeContractAddress);
                    if (BigNumber.from(allowance).lt(params.params.depositAmount)) {
                        setStatus(DepositStatus.WaitingForDepositTokenApproval);
                        const approveTx = await tokenContract.approve(
                            params.riftExchangeContractAddress,
                            validAssets[selectedInputAsset.name].connectedUserBalanceRaw,
                        );

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

                    // REPEATED CODE
                    setStatus(DepositStatus.DepositPending);
                    setTxHash(depositTx.hash);
                    await depositTx.wait();
                    setStatus(DepositStatus.Confirmed);
                    refreshUserSwapsFromAddress();
                } else {
                    // Other ERC20, use bundler
                    console.log('Is not Coinbase BTC');
                    await proceedWithBundler(swapRoute, params.params, setStatus);

                    // REPEATED CODE
                    // setStatus(DepositStatus.DepositPending);
                    // setTxHash(depositTx.hash);
                    // await depositTx.wait();
                    // setStatus(DepositStatus.Confirmed);
                    // refreshUserSwapsFromAddress();
                }
            } catch (err) {
                console.error('Error in depositLiquidity:', err);

                // Improved error handling to capture contract error data
                let errorMessage = '';
                if (err instanceof Error) {
                    errorMessage = err.message;

                    // Try to extract error data from ethers error
                    if (err.message.includes('UNPREDICTABLE_GAS_LIMIT')) {
                        // Type assertion to access nested properties safely
                        const errorObj = err as any;
                        if (
                            errorObj.error &&
                            typeof errorObj.error === 'object' &&
                            errorObj.error.data &&
                            typeof errorObj.error.data === 'object'
                        ) {
                            const errorData = errorObj.error.data.data;
                            if (errorData) {
                                // Store the error selector for later use
                                errorMessage = JSON.stringify({
                                    message: err.message,
                                    data: errorData,
                                });
                            }
                        }
                    }
                } else {
                    errorMessage = JSON.stringify(err, null, 2);
                }

                setError(errorMessage);
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
