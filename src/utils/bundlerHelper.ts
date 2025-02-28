import { useStore } from "@/store";
import {
    DEVNET_BASE_CHAIN_ID,
    DEVNET_BASE_RIFT_EXCHANGE_ADDRESS,
    DEVNET_BASE_BUNDLER_ADDRESS,
    DEVNET_DATA_ENGINE_URL,
    ERC20ABI,
} from "./constants";
import { getTipProof } from "./dataEngineClient";
import { parseUnits } from "ethers/lib/utils";
import { convertToBitcoinLockingScript } from "./dappHelper";
import { Bundler__factory } from "./typechain-types";
import { decodeError, ErrorType } from "ethers-decode-error";
import { type PermitTransferFrom, SignatureTransfer, PERMIT2_ADDRESS } from "@uniswap/permit2-sdk";
import { type BigNumber, type Signer, constants, ethers } from "ethers";
import type { SwapRoute } from "@uniswap/smart-order-router";
// import   } from "./typechain-types/contracts/Bundler.sol/Bundler";
import type { Address } from "viem";
import type { SingleExecuteSwapAndDeposit } from "@/types";
import type { Currency, Token } from "@uniswap/sdk-core";
import BundlerABI from "@/abis/Bundler.json";
import ErrorsABI from "@/abis/Errors.json";
import RiftABI from "@/abis/RiftExchange.json";
import type { DepositLiquidityParamsStruct } from "./typechain-types/contracts/Bundler.sol/BundlerSwapAndDepositWithPermit2";
// src/errorCombiner.ts

const BITCOIN_DECIMALS = 8;
const PAYOUT_BTC_ADDRESS = "bc1qpy7q5sjv448kkaln44r7726pa9xyzsskk84tw7";

async function getNextNonce(
    permit2Address: string,
    owner: string,
    wordIndex = 0,
    provider: ethers.providers.Provider
): Promise<string> {
    console.log("Bundler: Getting next nonce for owner ", owner);
    const permit2Contract = new ethers.Contract(permit2Address, ["function nonceBitmap(address, uint256) view returns (uint256)"], provider);
    const bitmap: BigNumber = await permit2Contract.nonceBitmap(owner, wordIndex);

    console.log("Bundler: Got bitmap ", bitmap.toString());
    for (let i = 0; i < 256; i++) {
        if (bitmap.shr(i).and(1).eq(0)) {
            return i.toString();
        }
    }
    console.error("Bundler: No available nonce in this word");
    throw new Error("Bundler No available nonce in this word");
}

// Type Guard
function isTokenArray(tokens: Token[] | Currency[]): tokens is Token[] {
    return tokens.length > 0 && tokens.every((token) => "address" in token);
}

async function buildPermitForToken(swapRoute: SwapRoute, totalInputAmount: BigNumber): Promise<{ permit: PermitTransferFrom; signature: string }> {
    console.log("Bundler: Building permit for token ", swapRoute.route[0].tokenPath[0]);
    const tokenPath = swapRoute.route[0].tokenPath;
    if (!tokenPath || tokenPath.length < 2 || !isTokenArray(tokenPath)) {
        throw new Error("Bundler Invalid token path");
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const batchNonce = await getNextNonce(PERMIT2_ADDRESS, address, 0, provider);

    const permit: PermitTransferFrom = {
        permitted: { token: tokenPath[0].address, amount: totalInputAmount },
        spender: DEVNET_BASE_BUNDLER_ADDRESS,
        nonce: batchNonce,
        deadline: totalInputAmount,
    };

    console.log("Bundler: Getting permit data ", permit);
    const { domain, types, values } = SignatureTransfer.getPermitData(permit, PERMIT2_ADDRESS, DEVNET_BASE_CHAIN_ID);
    const signature = await signer._signTypedData(domain, types, values);

    return { permit, signature };
}


export const bundleCaller = () => {
    const store = useStore.getState();
    const { selectedUniswapInputAsset, coinbaseBtcDepositAmount, btcOutputAmount } = store;

    async function executeBundlerTransaction(
        signer: Signer,
        singleArray: SingleExecuteSwapAndDeposit
    ): Promise<ethers.ContractReceipt> {
        const bundlerContract = Bundler__factory.connect(DEVNET_BASE_BUNDLER_ADDRESS, signer);
        //Simulate swap
        console.log(singleArray)
        console.log("Bundler: Calling executeSwapAndDeposit with parameters:", { ...singleArray });
        // const txE = await
        // bundlerContract.estimateGas.executeSwapAndDeposit(...singleArray);
        // function permitTransfer(
        //     address owner,
        //     uint256 amountIn,
        //     IPermit2.PermitTransferFrom calldata permitted,
        //     bytes calldata signature
        // ) public {
        console.log("Bun sending: ", { owner: singleArray[3], amountIn: singleArray[0], permit: singleArray[4], signature: singleArray[5], totalInputAmountInInt: singleArray[0].toBigInt() });
        const txE = await bundlerContract.permitTransfer(singleArray[3], singleArray[0], singleArray[4], singleArray[5]);
        // console.log("Bundler: Gas estimate", txE.toString());

        // Real swap
        console.log(singleArray)
        console.log("Bundler: Calling executeSwapAndDeposit with parameters:", { ...singleArray });
        const tx = await bundlerContract.executeSwapAndDeposit(...singleArray);
        return tx.wait();
    }


    const checkIfPermit2IsApproved = async (
        tokenAddress: string,
        owner: Signer
    ): Promise<boolean> => {
        try {
            console.log("Bundler: Checking if Permit2 is approved as spender");
            const provider = new ethers.providers.JsonRpcProvider("http://localhost:50101");
            const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
            const allowance: BigNumber = await tokenContract.allowance(
                await owner.getAddress(),
                PERMIT2_ADDRESS
            );
            console.log("Bundler: Permit2 allowance:", allowance.toString());

            return allowance.gt(0);
        } catch (error) {
            console.error('Bundler Error checking Permit2 approval:', error);
            throw error; // Re-throw the error for the caller to handle
        }
    };

    const approvePermit2AsSpender = async (
        tokenAddress: string,
        amount: ethers.BigNumberish,
        owner: Signer
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

    const proceedWithBundler = async (swapRoute: SwapRoute) => {
        if (typeof window === "undefined" || !window.ethereum) return;

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const userAddress = (await signer.getAddress()) as Address;

        const contract = new ethers.Contract(DEVNET_BASE_BUNDLER_ADDRESS, BundlerABI.abi, signer);
        // const tx = await contract.testFunction();
        // console.log("Bundler: Test function result", tx);
        // const receipt = await tx.wait();
        // console.log("Bundler: Test function receipt", receipt);

        const depositParams = await createDepositParams(userAddress);
        const totalInputAmount = parseUnits(coinbaseBtcDepositAmount, selectedUniswapInputAsset.decimals);
        const { permit, signature } = await buildPermitForToken(swapRoute, totalInputAmount);

        try {
            // 1. Check if Permit2 is approved as spender
            const isApproved = await checkIfPermit2IsApproved(selectedUniswapInputAsset.address, signer);
            if (!isApproved) {
                console.log("Bundler: Permit2 is not approved as spender, approving now");
                await approvePermit2AsSpender(selectedUniswapInputAsset.address, constants.MaxUint256, signer);
            }

            // 2. Execute bundler transaction
            console.log("Bundler: Proceeding with bundler transaction");
            const singleArray: SingleExecuteSwapAndDeposit = [totalInputAmount, swapRoute.methodParameters.calldata, depositParams, userAddress, permit, signature];
            console.log("totalInputAmount: ", totalInputAmount.toBigInt());
            console.log("swapRoute.methodParameters.calldata: ", swapRoute.methodParameters.calldata);
            console.log("depositParams: ", { depositParams });
            console.log("userAddress: ", userAddress);
            console.log("permit: ", { permit });
            console.log("signature: ", { signature });


            const receipt = await executeBundlerTransaction(signer, singleArray);

            console.log("Bundler transaction receipt:", { receipt });
        } catch (err: unknown) {
            console.log("Bundler: Error executing bundler transaction");
            try {
                const decodedError = decodeError(err, RiftABI.abi)
                console.error({ decodedError, errorMessage: decodedError.error, type: ErrorType[decodedError.type] });
            } catch (error) {
                console.error("Bundler: Error decoding error", error);
            }
        }
    };

    const createDepositParams = async (userAddress: Address): Promise<DepositLiquidityParamsStruct> => {
        console.log("Bundler: Creating deposit parameters");
        const { selectedUniswapInputAsset, coinbaseBtcDepositAmount, btcOutputAmount } = useStore.getState();
        const depositTokenDecimals = selectedUniswapInputAsset.decimals;
        const depositAmountInSmallestTokenUnit = parseUnits(coinbaseBtcDepositAmount, depositTokenDecimals).toString();
        const bitcoinOutputAmountInSats = parseUnits(btcOutputAmount, BITCOIN_DECIMALS).toString();
        const btcPayoutScriptPubKey = convertToBitcoinLockingScript(PAYOUT_BTC_ADDRESS);
        const randomBytes = new Uint8Array(32);
        window.crypto.getRandomValues(randomBytes);
        const generatedDepositSalt = "0x" + Array.from(randomBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
        const tipProof = await getTipProof(DEVNET_DATA_ENGINE_URL);

        return {
            depositOwnerAddress: userAddress,
            specifiedPayoutAddress: DEVNET_BASE_BUNDLER_ADDRESS,
            depositAmount: depositAmountInSmallestTokenUnit,
            expectedSats: parseInt(bitcoinOutputAmountInSats),
            btcPayoutScriptPubKey,
            depositSalt: generatedDepositSalt,
            confirmationBlocks: 2,
            safeBlockLeaf: tipProof.leaf,
            safeBlockSiblings: tipProof.siblings,
            safeBlockPeaks: tipProof.peaks,
        };
    };

    return { proceedWithBundler, buildBatchPermitFromRoute: buildPermitForToken };
};