import { useStore } from "@/store"
import { DEVNET_BASE_CHAIN_ID, DEVNET_BASE_RIFT_EXCHANGE_ADDRESS, DEVNET_BASE_BUNDLER_ADDRESS, DEVNET_DATA_ENGINE_URL, ERC20ABI } from "./constants";
import { getTipProof } from "./dataEngineClient";
import { parseUnits } from "ethers/lib/utils";
import { convertToBitcoinLockingScript } from "./dappHelper";
import { BigNumber, type Signer, constants, ethers } from "ethers";
import { Bundler__factory } from "./typechain-types"; // adjust the path accordingly
import { SignatureTransfer, type PermitTransferFrom, PERMIT2_ADDRESS } from "@uniswap/permit2-sdk";
import { decodeError, ErrorType } from 'ethers-decode-error'
import ErrorsABI from "@/abis/Errors.json";
import RiftExchangeABI from "@/abis/RiftExchange.json";
import BundlerABI from "@/abis/Bundler.json";
import type { SwapRoute } from "@uniswap/smart-order-router";
// import type { DepositLiquidityParamsStruct } from "./typechain-types/contracts/Bundler.sol/Bundler";
import type { Address } from "viem";
import type { SingleExecuteSwapAndDeposit } from "@/types";
import type { DepositLiquidityParamsStruct } from "./typechain-types/contracts/Bundler.sol/BundlerSwapAndDepositWithPermit2";
import path from 'path';

/**
 * Fetches the next available nonce for a given owner from the Permit2 contract.
 *
 * Permit2 stores nonces as a bitmap per owner and word index. This function queries the
 * nonceBitmap and returns the lowest bit index (0–255) that is not set.
 *
 * @param permit2Address The address of the Permit2 contract.
 * @param owner The address of the token owner.
 * @param wordIndex The word index to check in the nonce bitmap (default is 0).
 * @param provider An ethers.js provider.
 * @returns The next available nonce as a string.
 */
export async function getNextNonce(
    permit2Address: string,
    owner: string,
    wordIndex: number = 0,
    provider: ethers.providers.Provider
): Promise<string> {
    // Minimal ABI for nonceBitmap
    const abi = ["function nonceBitmap(address, uint256) view returns (uint256)"];
    const permit2Contract = new ethers.Contract(permit2Address, abi, provider);
    const bitmap: BigNumber = await permit2Contract.nonceBitmap(owner, wordIndex);

    // Scan bits 0 through 255 and return the first bit index that is not set.
    for (let i = 0; i < 256; i++) {
        if (bitmap.shr(i).and(1).eq(0)) {
            return i.toString();
        }
    }
    throw new Error("No available nonce in this word");
}

// Helper to build a batch permit from route data.
// This example iterates over the tokenPath (except the final output token)
// and creates a permit for each token using the same total input amount.
// In practice, you’d want to derive the correct per‑hop amounts from your route.
const buildBatchPermitFromRoute = async (swapRoute: SwapRoute, totalInputAmount: ethers.BigNumber) => {
    console.log({ swapRoute })
    // const tokenPath = swapRoute.data.route.trade.routes[0].tokenPath;
    const tokenPath = swapRoute.route[0].tokenPath;
    console.log({ tokenPath })
    if (!tokenPath || tokenPath.length < 2) {
        throw new Error("Invalid token path");
    }

    if (!('address' in tokenPath[0])) {
        throw new Error("Token path is not a token", { cause: tokenPath });
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    console.log({ 'metamaskAddress': address })
    const batchNonce = await getNextNonce(PERMIT2_ADDRESS, address, 0, provider);
    console.log(({ batchNonce }))
    // const batchPermit: PermitBatchTransferFrom = {
    const permit: PermitTransferFrom = {
        permitted: {
            token: tokenPath[0].address,
            amount: totalInputAmount,
        },//permit,
        nonce: batchNonce, // In production, fetch the nonce from Permit2 contract. (getNextNonce function above)
        spender: DEVNET_BASE_BUNDLER_ADDRESS, // the bundler contract’s address
        deadline: constants.MaxUint256 //TODO: TESTING Math.floor(Date.now() / 1000) + 360000,
    };


    const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        PERMIT2_ADDRESS,
        DEVNET_BASE_CHAIN_ID
    );

    // Now sign the typed data:
    console.log({ domain, types, values })
    const signature = await signer._signTypedData(domain, types, values);

    //  transferDetails, 
    return { permit, signature };
};

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

export const useBundleCaller = () => {
    const store = useStore.getState();
    const selectedInputAsset = store.selectedUniswapInputAsset;
    const coinbaseBtcDepositAmount = store.coinbaseBtcDepositAmount;
    const btcOutputAmount = store.btcOutputAmount;
    const BITCOIN_DECIMALS = 8;
    const payoutBTCAddress = "bc1qpy7q5sjv448kkaln44r7726pa9xyzsskk84tw7";

    const proceedWithBundler = async (swapRoute: SwapRoute) => {
        if (typeof window === "undefined" || !window.ethereum) {
            throw new Error("No Ethereum provider found");
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress() as Address;
        console.log({ userAddress })

        // --- Generate DepositLiquidityParams ---
        const depositTokenDecimals = selectedInputAsset.decimals;
        const depositAmountInSmallestTokenUnit = (parseUnits(btcOutputAmount, BITCOIN_DECIMALS)).toString();
        const bitcoinOutputAmountInSats = (parseUnits(btcOutputAmount, BITCOIN_DECIMALS)).toString();
        const btcPayoutScriptPubKey = convertToBitcoinLockingScript(payoutBTCAddress);

        // Generate a random salt using crypto.getRandomValues.
        const randomBytes = new Uint8Array(32);
        window.crypto.getRandomValues(randomBytes);
        const generatedDepositSalt = "0x" + Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");

        // Fetch tip proof data.
        const tipProof = await getTipProof(DEVNET_DATA_ENGINE_URL);
        // Assemble deposit parameters.
        const depositParams: DepositLiquidityParamsStruct = {
            depositOwnerAddress: userAddress,
            specifiedPayoutAddress: "0xA976a1F4Ee6DC8011e777133C6719087C10b6259", // What should this be?
            depositAmount: BigNumber.from(depositAmountInSmallestTokenUnit),  //  depositAmountInSmallestTokenUnit,
            expectedSats: BigNumber.from(bitcoinOutputAmountInSats), // adjust as needed
            btcPayoutScriptPubKey,
            depositSalt: generatedDepositSalt,
            confirmationBlocks: 2,
            safeBlockLeaf: tipProof.leaf,
            safeBlockSiblings: tipProof.siblings,
            safeBlockPeaks: tipProof.peaks,
        };

        console.log("Bun DepositLiquidityParams:", { debug: { ...depositParams } });

        // --- Build Permit2 Batch Data from Route Data ---
        const totalInputAmount = parseUnits(coinbaseBtcDepositAmount, selectedInputAsset.decimals);
        console.log("+++++ totalInputAmount", totalInputAmount.toString());
        const { permit, signature } = await buildBatchPermitFromRoute(swapRoute, totalInputAmount);
        console.log("Bun Single Permit Data:", permit);

        // --- Call the Bundler Contract ---
        console.log("Bun Connecting to...", DEVNET_BASE_BUNDLER_ADDRESS);
        const bundlerContract = Bundler__factory.connect(DEVNET_BASE_BUNDLER_ADDRESS, signer);


        try {

            // 1. Check if Permit2 is approved as spender
            const isApproved = await checkIfPermit2IsApproved(permit.permitted.token, signer);
            if (!isApproved) {
                console.log("Bundler: Permit2 is not approved as spender, approving now");
                await approvePermit2AsSpender(permit.permitted.token, ethers.constants.MaxUint256, signer);
            }

            const singleArray: SingleExecuteSwapAndDeposit = [totalInputAmount, swapRoute.methodParameters.calldata, depositParams, userAddress, permit, signature]
            // REAL TEST
            console.log("Bun estimating gas");
            const estimatedGas = await bundlerContract.estimateGas.executeSwapAndDeposit(totalInputAmount, swapRoute.methodParameters.calldata, depositParams, userAddress, permit, signature);
            console.log("Bun estimated gas:", estimatedGas.toString());
            console.log("Bun sending executeSwapAndDeposit REAL test: ", { debug: { totalInputAmount, calldata: swapRoute.methodParameters.calldata, depositParams, userAddress, permit, signature } });
            const tx0 = await bundlerContract.executeSwapAndDeposit(totalInputAmount, swapRoute.methodParameters.calldata, depositParams, userAddress, permit, signature);
            console.log("Bundler transaction:", { tx0 });
            const receipt0 = await tx0.wait();
            console.log("Bundler transaction receipt:", { receipt0 });


            // Send simple permit test (STEP 1)
            console.log("Bun sending PermitTransfer test: ", { userAddress, totalInputAmount, permit, signature });
            const tx1 = await bundlerContract.permitTransfer(userAddress, totalInputAmount, permit, signature);
            console.log("Bundler transaction 1:", { tx1 });
            const receipt = await tx1.wait();
            console.log("Bundler transaction receipt:", { receipt });

            // // Send simple permit and swaps test (STEP 2)
            console.log("Bun sending executeSwap test: ", { userAddress, totalInputAmount, permit, signature });
            const tx2 = await bundlerContract.executeSwap(swapRoute.methodParameters.calldata, DEVNET_BASE_BUNDLER_ADDRESS, totalInputAmount, permit.permitted.token);
            console.log("Bundler transaction 2:", { tx2 });
            const receipt2 = await tx2.wait();
            console.log("Bundler transaction 2 receipt:", { receipt2 });

            // Send simple permit and swap test (STEP 1 + 2)
            // console.log("Bun sending PermitTransferAndSwap test: ", { userAddress, totalInputAmount, permit, signature, calldata: swapRoute.methodParameters.calldata });
            // const tx3 = await bundlerContract.permitTransferAndSwapTest(userAddress, totalInputAmount, permit, signature, swapRoute.methodParameters.calldata);
            // console.log("Bundler transaction 1:", { tx3 });
            // const receipt3 = await tx3.wait();
            // console.log("Bundler transaction receipt:", { receipt3 });
        } catch (err) {
            console.log("Bun ERROR", { err });
            const decodedError = decodeError(err, BundlerABI.abi)
            console.log("Bun DECODED ERROR", { decodedError, errorMessage: decodedError.error, type: ErrorType[decodedError.type] });
        }
    };

    return { proceedWithBundler, buildBatchPermitFromRoute };
};
