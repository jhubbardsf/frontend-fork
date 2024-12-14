import { ethers, BigNumberish, BigNumber } from 'ethers';
import { JsonFragment } from '@ethersproject/abi';
import { LiqudityProvider, LiquidityReservedEvent, ReservationByPaymasterRequest, ReservationState, SwapReservation } from '../types';
import { DepositVault, ValidAsset } from '../types';
import { useStore } from '../store';

// CONTRACT FUNCTIONS

export async function getDepositVaultsLength(provider: ethers.providers.Provider, abi: ethers.ContractInterface, rift_exchange_contract: string): Promise<number> {
    const contract = new ethers.Contract(rift_exchange_contract, abi, provider);

    const length = await contract.getDepositVaultsLength();
    return length.toNumber();
}

export async function getDepositVaultByIndex(provider: ethers.providers.Provider, abi: ethers.ContractInterface, rift_exchange_contract: string, index: number): Promise<DepositVault | null> {
    const contract = new ethers.Contract(rift_exchange_contract, abi, provider);

    try {
        const depositVault = await contract.getDepositVault(index);
        // console.log(`Raw deposit vault data for index ${index}:`, depositVault);

        if (!Array.isArray(depositVault) || depositVault.length < 4) {
            console.warn(`Deposit vault at index ${index} returned invalid data`);
            return null;
        }

        return {
            owner: depositVault[0],
            depositTimestamp: depositVault[1],
            initialBalance: BigNumber.from(depositVault[2]),
            unreservedBalanceFromContract: BigNumber.from(depositVault[3]),
            withdrawnAmount: BigNumber.from(depositVault[4]),
            btcExchangeRate: BigNumber.from(depositVault[5]),
            btcPayoutLockingScript: depositVault[6],
            depositAsset: useStore.getState().validAssets['USDT'], // TODO: get this from the contract you are reading from
            index: index,
        };
    } catch (error) {
        console.error(`Error fetching deposit vault at index ${index}:`, error);
        return null;
    }
}

export async function getSwapReservationsLength(provider: ethers.providers.Provider, abi: ethers.ContractInterface, rift_exchange_contract: string): Promise<number> {
    const contract = new ethers.Contract(rift_exchange_contract, abi, provider);

    const length = await contract.getReservationLength();
    return length.toNumber();
}

export async function getLiquidityProvider(
    provider: ethers.providers.Provider,
    abi: ethers.ContractInterface,
    riftExchangeContract: string,
    liquidityProviderAddress: string,
): Promise<LiqudityProvider> {
    const contract = new ethers.Contract(riftExchangeContract, abi, provider);
    return await contract.getLiquidityProvider(liquidityProviderAddress);
}

export async function validateReserveLiquidity(
    provider: ethers.providers.Provider,
    abi: ethers.ContractInterface,
    riftExchangeContract: string,
    reserveArgs: ReservationByPaymasterRequest,
): Promise<boolean> {
    const contract = new ethers.Contract(riftExchangeContract, abi, provider);
    const reserveLiquidityFunction = contract.interface.getFunction('reserveLiquidity');
    const callData = contract.interface.encodeFunctionData(reserveLiquidityFunction, [
        reserveArgs.sender,
        reserveArgs.vault_indexes_to_reserve,
        reserveArgs.amounts_to_reserve,
        reserveArgs.eth_payout_address,
        reserveArgs.total_sats_input_inlcuding_proxy_fee,
        reserveArgs.expired_swap_reservation_indexes,
    ]);

    const result = await provider.call({
        to: riftExchangeContract,
        data: callData,
    });

    console.log('validateReserveLiquidity call raw', result);

    return contract.interface.decodeFunctionResult(reserveLiquidityFunction, result)[0];
}

export async function getTokenBalance(provider: ethers.providers.Provider | ethers.Signer, tokenAddress: string, accountAddress: string, abi: ethers.ContractInterface): Promise<BigNumber> {
    const contract = new ethers.Contract(tokenAddress, abi, provider);

    try {
        const balance: BigNumber = await contract.balanceOf(accountAddress);
        return balance;
    } catch (error) {
        console.error(`Error fetching token balance for address ${accountAddress}:`, error);
        throw error;
    }
}

export async function checkIfNewDepositsArePaused(provider: ethers.providers.Provider, abi: ethers.ContractInterface, riftExchangeContract: string): Promise<boolean> {
    const contract = new ethers.Contract(riftExchangeContract, abi, provider);
    return await contract.getAreDepositsPaused();
}

// MULTICALL

export async function getDepositVaults(
    provider: ethers.providers.Provider,
    bytecode: string,
    abi: ethers.ContractInterface,
    rift_exchange_contract: string,
    indexesArray: number[],
): Promise<DepositVault[]> {
    const factory = new ethers.ContractFactory(abi, bytecode);
    const chunkSize = 30;
    const chunks = [];

    for (let i = 0; i < indexesArray.length; i += chunkSize) {
        chunks.push(indexesArray.slice(i, i + chunkSize));
    }

    const callChunk = async (chunk: number[]) => {
        const deployTransaction = factory.getDeployTransaction(chunk, rift_exchange_contract);
        return provider.call({ data: deployTransaction.data as string });
    };

    const results = await Promise.all(chunks.map(callChunk));

    const allDecodedResults = results.flatMap(decodeDepositVaults);
    return allDecodedResults;
}

export function decodeDepositVaults(data: string): DepositVault[] {
    const abiCoder = new ethers.utils.AbiCoder();

    // decode the outer array
    const decodedArray = abiCoder.decode(['bytes[]'], data)[0];

    // decode each element in the array
    const depositVaults: DepositVault[] = decodedArray.map((item: string) => {
        const [owner, depositTimestamp, initialBalance, unreservedBalanceFromContract, withdrawnAmount, btcExchangeRate, btcPayoutLockingScript] = abiCoder.decode(
            ['address', 'uint64', 'uint256', 'uint256', 'uint256', 'uint64', 'bytes22'],
            item,
        );

        return {
            owner: owner,
            depositTimestamp: depositTimestamp,
            initialBalance: initialBalance,
            unreservedBalanceFromContract: unreservedBalanceFromContract,
            withdrawnAmount: withdrawnAmount,
            btcExchangeRate: btcExchangeRate,
            btcPayoutLockingScript: ethers.utils.hexlify(btcPayoutLockingScript),
        };
    });

    return depositVaults;
}

export async function getSwapReservations(
    provider: ethers.providers.Provider,
    bytecode: string,
    abi: ethers.ContractInterface,
    rift_exchange_contract: string,
    indexesArray: number[],
): Promise<SwapReservation[]> {
    const factory = new ethers.ContractFactory(abi, bytecode);

    const chunkSize = 5;
    const chunks = [];
    for (let i = 0; i < indexesArray.length; i += chunkSize) {
        chunks.push(indexesArray.slice(i, i + chunkSize));
    }

    const retryEthCall = async <T>(fn: () => Promise<T>): Promise<T> => {
        return fn();
    };

    const callChunk = async (chunk: number[]) => {
        const deployTransaction = factory.getDeployTransaction(chunk, rift_exchange_contract);
        const result = await retryEthCall(() => provider.call({ data: deployTransaction.data as string }));
        return result;
    };

    try {
        const results = await Promise.all(chunks.map(callChunk));
        const decodedResults = results.flatMap((result) => decodeSwapReservations(result));
        return decodedResults;
    } catch (err) {
        console.error('Error in getSwapReservations:', err);
        return [];
    }
}

function decodeSwapReservations(data: string): SwapReservation[] {
    const abiCoder = new ethers.utils.AbiCoder();
    const decodedArray = abiCoder.decode(['bytes[]'], data)[0];

    const swapReservations: SwapReservation[] = decodedArray.map((item: any) => {
        const decodedResults = abiCoder.decode(
            [
                `tuple(
                    address owner,
                    uint32 confirmationBlockHeight,
                    uint64 reservationTimestamp,
                    uint64 liquidityUnlockedTimestamp,
                    uint8 state,
                    address ethPayoutAddress,
                    bytes32 lpReservationHash,
                    bytes32 nonce,
                    uint256 totalSatsInputInlcudingProxyFee,
                    uint256 totalSwapOutputAmount,
                    uint256 proposedBlockHeight,
                    bytes32 proposedBlockHash,
                    uint256[] vaultIndexes,
                    uint192[] amountsToReserve,
                    uint64[] expectedSatsOutput
                )`,
            ],
            item,
        );
        const [
            owner,
            confirmationBlockHeight,
            reservationTimestamp,
            liquidityUnlockedTimestamp,
            state,
            ethPayoutAddress,
            lpReservationHash,
            nonce,
            totalSatsInputInlcudingProxyFee,
            totalSwapOutputAmount,
            proposedBlockHeight,
            proposedBlockHash,
            vaultIndexes,
            amountsToReserve,
            expectedSatsOutput,
        ] = decodedResults[0];

        return {
            owner,
            confirmationBlockHeight,
            reservationTimestamp,
            liquidityUnlockedTimestamp,
            state: state as ReservationState,
            ethPayoutAddress,
            lpReservationHash,
            nonce,
            totalSatsInputInlcudingProxyFee: ethers.BigNumber.from(totalSatsInputInlcudingProxyFee),
            totalSwapOutputAmount: ethers.BigNumber.from(totalSwapOutputAmount),
            proposedBlockHeight: ethers.BigNumber.from(proposedBlockHeight),
            proposedBlockHash,
            vaultIndexes,
            amountsToReserve: amountsToReserve.map((amount: any) => ethers.BigNumber.from(amount)),
            expectedSatsOutput: expectedSatsOutput.map((amount: any) => ethers.BigNumber.from(amount)),
        };
    });

    return swapReservations;
}

export async function listenForLiquidityReservedEvent(
    provider: ethers.providers.Provider,
    contractAddress: string,
    abi: ethers.ContractInterface,
    reserverAddress: string,
    startBlockHeight: number,
): Promise<LiquidityReservedEvent> {
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const latestBlock = await provider.getBlockNumber();
    const adjustedStartBlockHeight = Math.max(0, startBlockHeight - 5);
    const adjustedLatestBlock = latestBlock + 50;

    console.log(`Setting up listener for LiquidityReserved events`);
    const eventPromise = new Promise<LiquidityReservedEvent>((resolve) => {
        const listener = (reserver: string, swapReservationIndex: ethers.BigNumber, orderNonce: string, event: ethers.Event) => {
            console.log(`New event received: Reserver: ${reserver}, SwapReservationIndex: ${swapReservationIndex}, OrderNonce: ${orderNonce}`);
            if (reserver.toLowerCase() === reserverAddress.toLowerCase()) {
                console.log(`Match found for reserver ${reserverAddress} in new event`);
                contract.off('LiquidityReserved', listener);
                resolve({
                    reserver,
                    swapReservationIndex: swapReservationIndex.toString(),
                    orderNonce,
                    event,
                });
            }
        };

        contract.on('LiquidityReserved', listener);
    });

    console.log(`Starting search from block ${adjustedStartBlockHeight} to ${adjustedLatestBlock}`);

    // Search historical blocks
    for (let blockNumber = adjustedStartBlockHeight; blockNumber <= adjustedLatestBlock; blockNumber++) {
        console.log(`Searching block ${blockNumber}`);
        try {
            const events = await contract.queryFilter('LiquidityReserved', blockNumber, blockNumber);
            console.log(`Found ${events.length} LiquidityReserved events in block ${blockNumber}`);
            for (const event of events) {
                const [reserver, swapReservationIndex, orderNonce] = event.args as [string, ethers.BigNumber, string];
                console.log(`Event found: Reserver: ${reserver}, SwapReservationIndex: ${swapReservationIndex}, OrderNonce: ${orderNonce}`);
                if (reserver.toLowerCase() === reserverAddress.toLowerCase()) {
                    console.log(`Match found for reserver ${reserverAddress} in block ${blockNumber}`);
                    contract.removeAllListeners('LiquidityReserved');
                    return {
                        reserver,
                        swapReservationIndex: swapReservationIndex.toString(),
                        orderNonce,
                        event,
                    };
                }
            }
        } catch (error) {
            console.error(`Error processing block ${blockNumber}:`, error);
            // Continue to next block instead of throwing
            continue;
        }
    }

    console.log(`No matching events found in historical blocks. Waiting for new events.`);

    return eventPromise;
}
