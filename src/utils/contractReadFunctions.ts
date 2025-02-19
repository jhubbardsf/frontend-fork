import { ethers, BigNumberish, BigNumber } from 'ethers';
import { JsonFragment } from '@ethersproject/abi';
import { LiqudityProvider, LiquidityReservedEvent, ReservationByPaymasterRequest, ReservationState, UserSwap } from '../types';
import { ValidAsset } from '../types';
import { useStore } from '../store';

// CONTRACT READ FUNCTIONS
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
    }

    console.log(`No matching events found in historical blocks. Waiting for new events.`);

    return eventPromise;
}
