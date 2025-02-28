import { Address } from 'viem';
import { BlockLeaf } from '../types';
import { BigNumber, BigNumberish, ethers } from 'ethers';
import { toastError } from '../hooks/toast';
import { useStore } from '../store';

const u8ArrayToHex = (bytes: number[]): string => '0x' + Buffer.from(bytes).toString('hex');

export interface TipProof {
    leaf: BlockLeaf;
    siblings: string[];
    peaks: string[];
}

// returned by the API:
interface RawLeaf {
    height: number;
    block_hash: number[];
    cumulative_chainwork: number[];
}

interface RawTipProof {
    leaf: RawLeaf;
    siblings: number[][];
    peaks: number[][];
}

// convert raw tip proof to tip proof
const decodeRawTipProof = (response: RawTipProof) => {
    return {
        leaf: {
            height: response.leaf.height,
            blockHash: u8ArrayToHex(response.leaf.block_hash),
            cumulativeChainwork: BigNumber.from(Buffer.from(response.leaf.cumulative_chainwork)),
        },
        siblings: response.siblings.map(u8ArrayToHex),
        peaks: response.peaks.map(u8ArrayToHex),
    };
};

export const getTipProof = async (baseUrl: string): Promise<TipProof> => {
    const response = await fetch(`${baseUrl}/tip-proof`);
    console.log('[alpine] response', response);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return decodeRawTipProof(await response.json());
};

export interface VirtualSwapQuery {
    address: string;
    page: number;
}

interface DepositVault {
    vaultIndex: string;
    depositTimestamp: number;
    depositAmount: string;
    depositFee: string;
    expectedSats: number;
    btcPayoutScriptPubKey: string;
    specifiedPayoutAddress: string;
    ownerAddress: string;
    nonce: string;
    confirmationBlocks: number;
    attestedBitcoinBlockHeight: number;
}

interface ProposedSwap {
    swapIndex: string;
    aggregateVaultCommitment: string;
    depositVaultNonce: string;
    swapBitcoinBlockHash: string;
    confirmationBlocks: number;
    liquidityUnlockTimestamp: number;
    specifiedPayoutAddress: string;
    totalSwapFee: string;
    totalSwapOutput: string;
    state: SwapStatus;
}

enum SwapStatus {
    PaymentPending = 'PaymentPending',
    ChallengePeriod = 'ChallengePeriod',
    Completed = 'Completed',
    LiquidityWithdrawn = 'LiquidityWithdrawn',
}

interface ChainAwareDeposit {
    deposit: DepositVault;
    deposit_block_number: number;
    deposit_block_hash: string;
    deposit_txid: string;
}

interface ChainAwareProposedSwap {
    swap: ProposedSwap;
    swap_proof_txid: string;
    swap_proof_block_hash: string;
    swap_proof_block_number: number;
    release?: ChainAwareRelease;
}

interface ChainAwareWithdraw {
    withdraw_txid: string;
    withdraw_block_hash: string;
    withdraw_block_number: number;
}

interface ChainAwareRelease {
    release_txid: string;
    release_block_hash: string;
    release_block_number: number;
}

interface OTCSwap {
    deposit: ChainAwareDeposit;
    swap_proofs: ChainAwareProposedSwap[];
    withdraw?: ChainAwareWithdraw;
}

interface RawChainAwareDeposit {
    deposit: DepositVault;
    deposit_block_number: number;
    deposit_block_hash: number[];
    deposit_txid: number[];
}

interface RawChainAwareProposedSwap {
    swap: ProposedSwap;
    swap_proof_txid: number[];
    swap_proof_block_hash: number[];
    swap_proof_block_number: number;
    release?: RawChainAwareRelease;
}

interface RawChainAwareWithdraw {
    withdraw_txid: number[];
    withdraw_block_hash: number[];
    withdraw_block_number: number;
}

interface RawChainAwareRelease {
    release_txid: number[];
    release_block_hash: number[];
    release_block_number: number;
}

interface RawOTCSwap {
    deposit: RawChainAwareDeposit;
    swap_proofs: RawChainAwareProposedSwap[];
    withdraw: RawChainAwareWithdraw | null;
}

/**
 * Decodes a `RawOTCSwap` response into a structured `OTCSwap`
 * ensuring byte arrays (`number[]`) are converted to hex strings.
 */
const decodeOtcSwap = (response: RawOTCSwap): OTCSwap => {
    return {
        deposit: {
            ...response.deposit,
            deposit_block_hash: u8ArrayToHex(response.deposit.deposit_block_hash),
            deposit_txid: u8ArrayToHex(response.deposit.deposit_txid),
        },
        swap_proofs: response.swap_proofs.map((swap) => ({
            ...swap,
            swap_proof_txid: u8ArrayToHex(swap.swap_proof_txid),
            swap_proof_block_hash: u8ArrayToHex(swap.swap_proof_block_hash),
            release: swap.release
                ? {
                      release_txid: u8ArrayToHex(swap.release.release_txid),
                      release_block_hash: u8ArrayToHex(swap.release.release_block_hash),
                      release_block_number: swap.release.release_block_number,
                  }
                : undefined,
        })),
        withdraw: response.withdraw
            ? {
                  ...response.withdraw,
                  withdraw_txid: u8ArrayToHex(response.withdraw.withdraw_txid),
                  withdraw_block_hash: u8ArrayToHex(response.withdraw.withdraw_block_hash),
              }
            : undefined,
    };
};

export const getSwapsForAddress = async (baseUrl: string, query: VirtualSwapQuery): Promise<{ swaps: OTCSwap[]; status: 'loading' | 'error' | 'received' }> => {
    try {
        const params = new URLSearchParams({
            address: query.address,
            page: query.page.toString(),
        });

        const response = await fetch(`${baseUrl}/swaps?${params}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to fetch swap data', errorText);
            toastError('', { title: 'Failed to fetch swap data', description: 'Rift data engine is currently down. Please try again later.' });
            return { swaps: [], status: 'error' };
        }

        const rawSwaps: RawOTCSwap[] = await response.json();
        return { swaps: rawSwaps.map(decodeOtcSwap), status: 'received' };
    } catch (error) {
        toastError('', { title: 'Failed to fetch swap data', description: 'Rift data engine is currently down. Please try again later.' });
        return { swaps: [], status: 'error' };
    }
};
