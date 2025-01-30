import { Address } from 'viem';
import { BlockLeaf } from '../types';
import { BigNumber, BigNumberish, ethers } from 'ethers';

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
            blockHash: '0x' + Buffer.from(response.leaf.block_hash).toString('hex'),
            cumulativeChainwork: BigNumber.from(Buffer.from(response.leaf.cumulative_chainwork)),
        },
        siblings: response.siblings.map((sibling) => '0x' + Buffer.from(sibling).toString('hex')),
        peaks: response.peaks.map((peak) => '0x' + Buffer.from(peak).toString('hex')),
    };
};

export const getTipProof = async (baseUrl: string): Promise<TipProof> => {
    const response = await fetch(`${baseUrl}/tip-proof`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return decodeRawTipProof(await response.json());
};
