import { useStore } from '@/store';
import {
    DEVNET_BASE_CHAIN_ID,
    DEVNET_BASE_RIFT_EXCHANGE_ADDRESS,
    DEVNET_BASE_BUNDLER_ADDRESS,
    DEVNET_DATA_ENGINE_URL,
    ERC20ABI,
    DEVNET_BASE_RPC_URL,
    SAMEES_DEMO_CB_BTC_ADDRESS,
} from './constants';
import { getTipProof } from './dataEngineClient';
import { parseUnits } from 'ethers/lib/utils';
import { convertToBitcoinLockingScript } from './dappHelper';
import { type BigNumber, type Signer, constants, ethers } from 'ethers';
import { Bundler__factory } from './typechain-types'; // adjust the path accordingly
import { SignatureTransfer, type PermitTransferFrom, PERMIT2_ADDRESS } from '@uniswap/permit2-sdk';
import { decodeError, ErrorType } from '@jhubbardsf/ethers-decode-error';
import ErrorsABI from '@/abis/Errors.json';
import RiftExchangeABI from '@/abis/RiftExchange.json';
import BundlerABI from '@/abis/Bundler.json';
import type { SwapRoute } from '@uniswap/smart-order-router';
// import type { DepositLiquidityParamsStruct } from "./typechain-types/contracts/Bundler.sol/Bundler";
import type { Address } from 'viem';
import type { SingleExecuteSwapAndDeposit } from '@/types';
import type { Types } from './typechain-types/contracts/Bundler';
import { useLogState } from '@/hooks/useLogState';
import { getContract } from 'viem';
import { useBundlerContract } from '@/utils/wagmiClients';
import { extendTheme } from '@chakra-ui/react';
import { useAccount } from 'wagmi';
import { useCallback } from 'react';
import { useWatchPendingTransactions } from 'wagmi';
import { DepositStatus } from '@/hooks/contract/useDepositLiquidity';

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

const log = (str: string, obj?: object) => {
    const enabled = true;
    if (enabled) console.log(str, obj);
};

const buildPermit = async (swapRoute: SwapRoute, totalInputAmount: ethers.BigNumber) => {
    console.log('Bundler: ', { swapRoute });
    const tokenPath = swapRoute.route[0].tokenPath;
    const token = tokenPath[0];
    console.log('Bundler: ', { tokenPath });
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
    console.log('bundler: ', { domain, types, values });
    const signature = await signer._signTypedData(domain, types, values);

    //  transferDetails,
    return { permit, signature };
};

const checkIfPermit2IsApproved = async (tokenAddress: string, owner: Signer): Promise<boolean> => {
    try {
        console.log('Bundler: Checking if Permit2 is approved as spender');
        const provider = new ethers.providers.JsonRpcProvider(DEVNET_BASE_RPC_URL);
        const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
        const allowance: BigNumber = await tokenContract.allowance(await owner.getAddress(), PERMIT2_ADDRESS);
        console.log('Bundler: Permit2 allowance:', { allowance });

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

        console.log('Bundler Permit2 approval successful:', receipt);
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
    console.log('Bundler LOG');
    useLogState('BundlerCaller useBundlerContract Rest: ', { rest });
    const BITCOIN_DECIMALS = 8;
    const payoutBTCAddress = 'bc1qpy7q5sjv448kkaln44r7726pa9xyzsskk84tw7';
    useLogState('Bundle Caller: ', { selectedInputAsset, coinbaseBtcDepositAmount, btcOutputAmount, payoutBTCAddress });
    useWatchPendingTransactions({
        onTransactions(transactions) {
            console.log('Bun New transactions!', transactions);
        },
    });

    const proceedWithBundler = useCallback(
        async (swapRoute: SwapRoute, depositParams: Types.DepositLiquidityParamsStruct, setStatus: any) => {
            if (typeof window === 'undefined' || !window.ethereum) {
                throw new Error('No Ethereum provider found');
            }

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            // const userAddress = (await signer.getAddress()) as Address;
            // console.log('bundler: ', { userAddress });
            console.log('Bun DepositLiquidityParams:', { debug: { ...depositParams } });

            // --- Build Permit2 Batch Data from Route Data ---
            console.log('Bun: ', {
                coinbaseBtcDepositAmount,
                'selectedInputAsset.decimals': selectedInputAsset.decimals,
            });
            const totalInputAmount = parseUnits(coinbaseBtcDepositAmount, selectedInputAsset.decimals);
            console.log('Bun totalInputAmount', { totalInputAmount });
            const { permit, signature } = await buildPermit(swapRoute, totalInputAmount);
            console.log('Bun Single Permit Data:', permit);

            // --- Call the Bundler Contract ---
            console.log('Bun Connecting to...', { DEVNET_BASE_BUNDLER_ADDRESS });
            // const bundlerContract = Bundler__factory.connect(DEVNET_BASE_BUNDLER_ADDRESS, signer);

            try {
                // 1. Check if Permit2 is approved as spender
                const isApproved = await checkIfPermit2IsApproved(permit.permitted.token, signer);
                if (!isApproved) {
                    console.log('Bundler: Permit2 is not approved as spender, approving now');
                    setStatus(DepositStatus.ApprovalPending);
                    await approvePermit2AsSpender(permit.permitted.token, ethers.constants.MaxUint256, signer);
                }

                // const singleArray: SingleExecuteSwapAndDeposit = [
                //     totalInputAmount,
                //     swapRoute.methodParameters.calldata,
                //     depositParams,
                //     userAddress,
                //     permit,
                //     signature,
                // ];
                // REAL TEST
                console.log('Bun estimating gas');
                console.log('Bun sending executeSwapAndDeposit REAL test: ', {
                    amoutIn: totalInputAmount.toBigInt(),
                    calldata: swapRoute.methodParameters.calldata as `0x${string}`,
                    depositParams: {
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
                    owner: userAddress,
                    permit: {
                        permitted: {
                            token: permit.permitted.token as `0x${string}`,
                            amount: (permit.permitted.amount as BigNumber).toBigInt(),
                        },
                        nonce: permit.nonce,
                        deadline: permit.deadline,
                    },
                    signature: signature as `0x${string}`,

                    // totalInputAmount,
                    // totalInputAmountInt: totalInputAmount.toBigInt(),
                    // calldata: swapRoute.methodParameters.calldata,
                    // depositParams,
                    // depositParamsExpectsSats: (depositParams.expectedSats as BigNumber).toBigInt(),
                    // depositParamsDepositAmount: (depositParams.depositAmount as BigNumber).toBigInt(),
                    // userAddress,

                    // permit,
                    // permitPermittedAmount: (permit.permitted.amount as BigNumber).toBigInt(),
                    // permitDeadline: (permit.deadline as BigNumber).toBigInt(),
                    // signature,
                });
                // const estimatedGas = await bundlerContract.estimateGas.executeSwapAndDeposit(
                //     totalInputAmount,
                //     swapRoute.methodParameters.calldata,
                //     depositParams,
                //     userAddress,
                //     permit,
                //     signature,
                // );
                // console.log('Bun estimated gas:', { estimatedGas });

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
                // const tx = await bundlerContract.executeSwapAndDeposit(
                //     totalInputAmount,
                //     swapRoute.methodParameters.calldata,
                //     depositParams,
                //     userAddress,
                //     permit,
                //     signature,
                // );
                // console.log('Bun transaction:', { tx });
                // const receipt = await tx.wait();
                // console.log('Bun transaction receipt:', { receipt });
                return;
                // const tx0 = await bundlerContract.executeSwapAndDeposit(
                //     totalInputAmount,
                //     swapRoute.methodParameters.calldata,
                //     depositParams,
                //     userAddress,
                //     permit,
                //     signature,
                // );
                // console.log('Bundler transaction:', { tx0 });
                // const receipt0 = await tx0.wait();
                // console.log('Bundler transaction receipt:', { receipt0 });

                // // Send simple permit test (STEP 1)
                // console.log('Bun sending PermitTransfer test: ', { userAddress, totalInputAmount, permit, signature });
                // const tx1 = await bundlerContract._permitTransfer(userAddress, totalInputAmount, permit, signature);
                // console.log('Bundler transaction 1:', { tx1 });
                // // const receipt = await tx1.wait();
                // console.log('Bundler transaction receipt:', { receipt });

                // // // Send simple permit and swaps test (STEP 2)
                // console.log('Bun sending executeSwap test: ', { userAddress, totalInputAmount, permit, signature });
                // const tx2 = await bundlerContract.executeSwap(
                //     swapRoute.methodParameters.calldata,
                //     DEVNET_BASE_BUNDLER_ADDRESS,
                //     totalInputAmount,
                //     permit.permitted.token,
                // );
                // console.log('Bundler transaction 2:', { tx2 });
                // const receipt2 = await tx2.wait();
                // console.log('Bundler transaction 2 receipt:', { receipt2 });

                // Send simple permit and swap test (STEP 1 + 2)
                // console.log("Bun sending PermitTransferAndSwap test: ", { userAddress, totalInputAmount, permit, signature, calldata: swapRoute.methodParameters.calldata });
                // const tx3 = await bundlerContract.permitTransferAndSwapTest(userAddress, totalInputAmount, permit, signature, swapRoute.methodParameters.calldata);
                // console.log("Bundler transaction 1:", { tx3 });
                // const receipt3 = await tx3.wait();
                // console.log("Bundler transaction receipt:", { receipt3 });
            } catch (err) {
                console.error('Bun ERROR', { err });
                const decodedError = decodeError(err, BundlerABI.abi);
                console.error('Bun DECODED ERROR', {
                    decodedError,
                    errorMessage: decodedError.error,
                    type: ErrorType[decodedError.type],
                });
            }
        },
        [coinbaseBtcDepositAmount, executeSwapAndDeposit, selectedInputAsset.decimals, userAddress],
    );

    return { proceedWithBundler, buildPermit, ...rest };
};
