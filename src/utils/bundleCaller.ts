import { useStore } from '@/store';
import {
    DEVNET_BASE_CHAIN_ID,
    DEVNET_BASE_BUNDLER_ADDRESS,
    ERC20ABI,
    DEVNET_BASE_RPC_URL,
    SAMEES_DEMO_CB_BTC_ADDRESS,
} from './constants';
import { parseUnits } from 'ethers/lib/utils';
import { convertToBitcoinLockingScript } from './dappHelper';
import { type BigNumber, type Signer, constants, ethers } from 'ethers';
import { SignatureTransfer, type PermitTransferFrom, PERMIT2_ADDRESS } from '@uniswap/permit2-sdk';
import { decodeError, ErrorType } from '@jhubbardsf/ethers-decode-error';
import BundlerABI from '@/abis/Bundler.json';
import type { SwapRoute } from '@uniswap/smart-order-router';
import { useBundlerContract } from '@/utils/wagmiClients';
import { useAccount } from 'wagmi';
import { useCallback } from 'react';
import { useWatchPendingTransactions } from 'wagmi';
import { DepositStatus } from '@/hooks/contract/useDepositLiquidity';
import { DepositLiquidityParamsStruct } from '@/types';

/**
 * Fetches the next available nonce for a given owner from the Permit2 contract.
 *
 * Permit2 stores nonces as a bitmap per owner and word index. This function queries the
 * nonceBitmap and returns the lowest bit index (0–255) that is not set.
 */
export async function getNextNonce(
    permit2Address: string,
    owner: string,
    wordIndex: number = 0,
    provider: ethers.providers.Provider,
): Promise<string> {
    // Minimal ABI for nonceBitmap
    const abi = ['function nonceBitmap(address, uint256) view returns (uint256)'] as const;
    const permit2Contract = new ethers.Contract(permit2Address, abi, provider);
    const bitmap: BigNumber = await permit2Contract.nonceBitmap(owner, wordIndex);

    // Scan bits 0 through 255 and return the first bit index that is not set.
    for (let i = 0; i < 256; i++) {
        if (bitmap.shr(i).and(1).eq(0)) {
            return i.toString();
        }
    }
    throw new Error('No available nonce in this word');
}

const buildPermit = async (swapRoute: SwapRoute, totalInputAmount: ethers.BigNumber) => {
    const tokenPath = swapRoute.route[0].tokenPath;
    const token = tokenPath[0];

    if (!tokenPath || tokenPath.length < 2) {
        console.error('Invalid token path', { tokenPath });
        return;
    }

    if (!('address' in token)) {
        console.error('Token path is not a token', { tokenPath });
        return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const batchNonce = await getNextNonce(PERMIT2_ADDRESS, address, 0, provider);

    // const batchPermit: PermitBatchTransferFrom = {
    const permit: PermitTransferFrom = {
        permitted: {
            token: token.address,
            amount: totalInputAmount,
        }, //permit,
        nonce: batchNonce, // In production, fetch the nonce from Permit2 contract. (getNextNonce function above)
        spender: DEVNET_BASE_BUNDLER_ADDRESS, // the bundler contract’s address
        deadline: constants.MaxUint256, //TODO: TESTING Math.floor(Date.now() / 1000) + 360000,
    };

    const { domain, types, values } = SignatureTransfer.getPermitData(permit, PERMIT2_ADDRESS, DEVNET_BASE_CHAIN_ID);

    // Now sign the typed data:
    const signature = await signer._signTypedData(domain, types, values);

    //  transferDetails,
    return { permit, signature };
};

const checkIfPermit2IsApproved = async (tokenAddress: string, owner: Signer): Promise<boolean> => {
    try {
        const provider = new ethers.providers.JsonRpcProvider(DEVNET_BASE_RPC_URL);
        const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
        const allowance: BigNumber = await tokenContract.allowance(await owner.getAddress(), PERMIT2_ADDRESS);

        return allowance.gt(0);
    } catch (error) {
        console.error('Bundler Error checking Permit2 approval:', error);
        throw error; // Re-throw the error for the caller to handle
    }
};

const approvePermit2AsSpender = async (
    tokenAddress: string,
    amount: ethers.BigNumberish,
    owner: Signer,
): Promise<void> => {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, owner);
        const tx = await tokenContract.approve(PERMIT2_ADDRESS, amount);
        const receipt = await tx.wait();

        if (receipt.status !== 1) {
            throw new Error('Bundler Approval transaction failed');
        }
    } catch (error) {
        console.error('Bundler Error approving Permit2:', error);
        throw error; // Re-throw the error for the caller to handle
    }
};

export const useBundlerCaller = () => {
    // const store = useStore.getState();
    const selectedInputAsset = useStore((store) => store.selectedInputAsset);
    const coinbaseBtcDepositAmount = useStore((store) => store.coinbaseBtcDepositAmount);
    const btcOutputAmount = useStore((store) => store.btcOutputAmount);
    const { executeSwapAndDeposit, ...rest } = useBundlerContract();
    const { address: userAddress } = useAccount();
    const BITCOIN_DECIMALS = 8;
    const payoutBTCAddress = 'bc1qpy7q5sjv448kkaln44r7726pa9xyzsskk84tw7';
    useWatchPendingTransactions({
        onTransactions(transactions) {
            console.log('Bun New transactions!', transactions);
        },
    });

    const proceedWithBundler = useCallback(
        async (swapRoute: SwapRoute, depositParams: DepositLiquidityParamsStruct, setStatus: any) => {
            if (typeof window === 'undefined' || !window.ethereum) {
                throw new Error('No Ethereum provider found');
            }

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            const totalInputAmount = parseUnits(coinbaseBtcDepositAmount, selectedInputAsset.decimals);
            const { permit, signature } = await buildPermit(swapRoute, totalInputAmount);

            try {
                // 1. Check if Permit2 is approved as spender
                const isApproved = await checkIfPermit2IsApproved(permit.permitted.token, signer);
                if (!isApproved) {
                    console.log('Bundler: Permit2 is not approved as spender, approving now');
                    setStatus(DepositStatus.ApprovalPending);
                    await approvePermit2AsSpender(permit.permitted.token, ethers.constants.MaxUint256, signer);
                }

                executeSwapAndDeposit([
                    totalInputAmount.toBigInt(),
                    swapRoute.methodParameters.calldata as `0x${string}`,
                    {
                        depositOwnerAddress: userAddress as `0x${string}`,
                        specifiedPayoutAddress: SAMEES_DEMO_CB_BTC_ADDRESS,
                        depositAmount: (depositParams.depositAmount as BigNumber).toBigInt(),
                        expectedSats: (depositParams.expectedSats as BigNumber).toBigInt(),
                        btcPayoutScriptPubKey: convertToBitcoinLockingScript(payoutBTCAddress) as `0x${string}`,
                        depositSalt: depositParams.depositSalt as `0x${string}`,
                        confirmationBlocks: depositParams.confirmationBlocks as number,
                        safeBlockLeaf: {
                            height: depositParams.safeBlockLeaf.height as number,
                            blockHash: depositParams.safeBlockLeaf.blockHash as `0x${string}`,
                            cumulativeChainwork: (
                                depositParams.safeBlockLeaf.cumulativeChainwork as BigNumber
                            ).toBigInt(),
                        },
                        safeBlockSiblings: depositParams.safeBlockSiblings as `0x${string}`[],
                        safeBlockPeaks: depositParams.safeBlockPeaks as `0x${string}`[],
                    },
                    userAddress,
                    {
                        permitted: {
                            token: permit.permitted.token as `0x${string}`,
                            amount: (permit.permitted.amount as BigNumber).toBigInt(),
                        },
                        nonce: BigInt(permit.nonce as number),
                        deadline: BigInt(permit.deadline as number),
                    },
                    signature as `0x${string}`,
                ]);

                return;
            } catch (err) {
                const decodedError = decodeError(err, BundlerABI.abi);
                console.error('Bundle Decoded Error', {
                    decodedError,
                    errorMessage: decodedError.error,
                    type: ErrorType[decodedError.type],
                    originalError: err,
                });
            }
        },
        [coinbaseBtcDepositAmount, executeSwapAndDeposit, selectedInputAsset.decimals, userAddress],
    );

    return { proceedWithBundler, buildPermit, ...rest };
};
