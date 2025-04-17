import { anvilChain } from '@/pages/_app';
import { bundlerAbi } from '@/generatedWagmi';
import { useWriteContract, useAccount } from 'wagmi';
import { DEVNET_BASE_BUNDLER_ADDRESS } from './constants';
import type { AbiParametersToPrimitiveTypes, ExtractAbiFunction } from 'abitype';
import { useWatchContractEvent } from 'wagmi';
import { useEffect } from 'react';

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
            chain: anvilChain,
            account: account.address,
        });
    };

    // const returnT = useWatchContractEvent({
    //     address: DEVNET_BASE_BUNDLER_ADDRESS,
    //     abi: bundlerAbi,
    //     eventName: 'BundlerExecution',
    //     onLogs(logs) {
    //         console.log('bun BundlerExecution logs!', logs);
    //     },
    // });

    // useWatchContractEvent({
    //     address: DEVNET_BASE_BUNDLER_ADDRESS,
    //     abi: bundlerAbi,
    //     eventName: 'PermitTransferExecuted',
    //     onLogs(logs) {
    //         console.log('bun PermitTransferExecuted logs!', logs);
    //     },
    // });

    // useWatchContractEvent({
    //     address: DEVNET_BASE_BUNDLER_ADDRESS,
    //     abi: bundlerAbi,
    //     eventName: 'RiftDepositExecuted',
    //     onLogs(logs) {
    //         console.log('bun RiftDepositExecuted logs!', logs);
    //     },
    // });

    // useWatchContractEvent({
    //     address: DEVNET_BASE_BUNDLER_ADDRESS,
    //     abi: bundlerAbi,
    //     eventName: 'SwapExecuted',
    //     onLogs(logs) {
    //         console.log('bun SwapExecuted logs!', logs);
    //     },
    // });

    return { executeSwapAndDeposit, ...rest };
};
