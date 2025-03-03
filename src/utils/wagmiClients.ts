import { bundlerAbi } from '@/generatedWagmi';
import { useWriteContract, useAccount } from 'wagmi';
import { DEVNET_BASE_BUNDLER_ADDRESS, DEVNET_BASE_RPC_URL } from './constants';
import type { AbiParametersToPrimitiveTypes, ExtractAbiFunction } from 'abitype';

const anvilChain = {
    id: 1337,
    name: 'Anvil Testnet',
    network: 'anvil',
    nativeCurrency: {
        name: 'Anvil Ether',
        symbol: 'aETH',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: [DEVNET_BASE_RPC_URL], // Replace with your Anvil testnet RPC URL
        },
    },
    blockExplorers: {
        default: { name: 'Anvil Explorer', url: DEVNET_BASE_RPC_URL }, // Replace with your block explorer URL if available
    },
    testnet: true,
};

export type ExecuteSwapAndDepositFunction = ExtractAbiFunction<typeof bundlerAbi, 'executeSwapAndDeposit'>;
export type ExecuteSwapAndDepositArgs = AbiParametersToPrimitiveTypes<ExecuteSwapAndDepositFunction['inputs']>;

export const useBundlerContract = () => {
    const { writeContract, writeContractAsync, ...rest } = useWriteContract();
    const account = useAccount();

    const executeSwapAndDeposit = ([
        amountIn,
        swapCalldata,
        params,
        owner,
        permit,
        signature,
    ]: ExecuteSwapAndDepositArgs) => {
        return writeContractAsync({
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
