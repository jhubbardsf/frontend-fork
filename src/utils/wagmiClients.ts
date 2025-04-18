import { bundlerAbi } from '@/generatedWagmi';
import { useWriteContract, useAccount } from 'wagmi';
import { DEVNET_BASE_BUNDLER_ADDRESS } from './constants';
import type { AbiParametersToPrimitiveTypes, ExtractAbiFunction } from 'abitype';
import { base } from 'viem/chains';

export type ExecuteSwapAndDepositFunction = ExtractAbiFunction<typeof bundlerAbi, 'executeSwapAndDeposit'>;
export type ExecuteSwapAndDepositArgs = AbiParametersToPrimitiveTypes<ExecuteSwapAndDepositFunction['inputs']>;

export const useBundlerContract = () => {
    const { writeContract, ...rest } = useWriteContract();
    const account = useAccount();

    const executeSwapAndDeposit = ([
        amountIn,
        swapCalldata,
        params,
        owner,
        permit,
        signature,
    ]: ExecuteSwapAndDepositArgs) => {
        return writeContract({
            address: DEVNET_BASE_BUNDLER_ADDRESS,
            abi: bundlerAbi,
            functionName: 'executeSwapAndDeposit',
            args: [amountIn, swapCalldata, params, owner, permit, signature],
            chain: base,
            account: account.address,
        });
    };

    return { executeSwapAndDeposit, ...rest };
};
