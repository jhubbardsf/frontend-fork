import {
    createUseReadContract,
    createUseWriteContract,
    createUseSimulateContract,
    createUseWatchContractEvent,
} from 'wagmi/codegen';

import {
    createReadContract,
    createWriteContract,
    createSimulateContract,
    createWatchContractEvent,
} from 'wagmi/codegen';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Bundler
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const bundlerAbi = [
    {
        type: 'constructor',
        inputs: [
            { name: '_swapRouter', internalType: 'address', type: 'address' },
            { name: '_riftExchange', internalType: 'address', type: 'address' },
            { name: '_cbBTC', internalType: 'address', type: 'address' },
            { name: '_permit2', internalType: 'address', type: 'address' },
            { name: '_universalRouter', internalType: 'address', type: 'address' },
        ],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        inputs: [
            { name: 'owner', internalType: 'address', type: 'address' },
            { name: 'amountIn', internalType: 'uint256', type: 'uint256' },
            {
                name: 'permitted',
                internalType: 'struct ISignatureTransfer.PermitTransferFrom',
                type: 'tuple',
                components: [
                    {
                        name: 'permitted',
                        internalType: 'struct ISignatureTransfer.TokenPermissions',
                        type: 'tuple',
                        components: [
                            { name: 'token', internalType: 'address', type: 'address' },
                            { name: 'amount', internalType: 'uint256', type: 'uint256' },
                        ],
                    },
                    { name: 'nonce', internalType: 'uint256', type: 'uint256' },
                    { name: 'deadline', internalType: 'uint256', type: 'uint256' },
                ],
            },
            { name: 'signature', internalType: 'bytes', type: 'bytes' },
        ],
        name: '_permitTransfer',
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        inputs: [
            { name: 'amountIn', internalType: 'uint256', type: 'uint256' },
            { name: 'spender', internalType: 'address', type: 'address' },
            { name: 'tokenIn', internalType: 'address', type: 'address' },
        ],
        name: 'approveForSpender',
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        inputs: [],
        name: 'cbBTC',
        outputs: [{ name: '', internalType: 'address', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        inputs: [
            { name: 'swapCalldata', internalType: 'bytes', type: 'bytes' },
            { name: 'owner', internalType: 'address', type: 'address' },
            { name: 'amountIn', internalType: 'uint256', type: 'uint256' },
            { name: 'tokenIn', internalType: 'address', type: 'address' },
        ],
        name: 'executeSwap',
        outputs: [
            {
                name: 'result',
                internalType: 'struct Types.BundlerResult',
                type: 'tuple',
                components: [
                    {
                        name: 'initialCbBTCBalance',
                        internalType: 'uint256',
                        type: 'uint256',
                    },
                    {
                        name: 'finalCbBTCBalance',
                        internalType: 'uint256',
                        type: 'uint256',
                    },
                    { name: 'cbBTCReceived', internalType: 'uint256', type: 'uint256' },
                ],
            },
        ],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        inputs: [
            { name: 'amountIn', internalType: 'uint256', type: 'uint256' },
            { name: 'swapCalldata', internalType: 'bytes', type: 'bytes' },
            {
                name: 'params',
                internalType: 'struct Types.DepositLiquidityParams',
                type: 'tuple',
                components: [
                    {
                        name: 'depositOwnerAddress',
                        internalType: 'address',
                        type: 'address',
                    },
                    {
                        name: 'specifiedPayoutAddress',
                        internalType: 'address',
                        type: 'address',
                    },
                    { name: 'depositAmount', internalType: 'uint256', type: 'uint256' },
                    { name: 'expectedSats', internalType: 'uint64', type: 'uint64' },
                    {
                        name: 'btcPayoutScriptPubKey',
                        internalType: 'bytes22',
                        type: 'bytes22',
                    },
                    { name: 'depositSalt', internalType: 'bytes32', type: 'bytes32' },
                    { name: 'confirmationBlocks', internalType: 'uint8', type: 'uint8' },
                    {
                        name: 'safeBlockLeaf',
                        internalType: 'struct Types.BlockLeaf',
                        type: 'tuple',
                        components: [
                            { name: 'blockHash', internalType: 'bytes32', type: 'bytes32' },
                            { name: 'height', internalType: 'uint32', type: 'uint32' },
                            {
                                name: 'cumulativeChainwork',
                                internalType: 'uint256',
                                type: 'uint256',
                            },
                        ],
                    },
                    {
                        name: 'safeBlockSiblings',
                        internalType: 'bytes32[]',
                        type: 'bytes32[]',
                    },
                    {
                        name: 'safeBlockPeaks',
                        internalType: 'bytes32[]',
                        type: 'bytes32[]',
                    },
                ],
            },
            { name: 'owner', internalType: 'address', type: 'address' },
            {
                name: 'permit',
                internalType: 'struct ISignatureTransfer.PermitTransferFrom',
                type: 'tuple',
                components: [
                    {
                        name: 'permitted',
                        internalType: 'struct ISignatureTransfer.TokenPermissions',
                        type: 'tuple',
                        components: [
                            { name: 'token', internalType: 'address', type: 'address' },
                            { name: 'amount', internalType: 'uint256', type: 'uint256' },
                        ],
                    },
                    { name: 'nonce', internalType: 'uint256', type: 'uint256' },
                    { name: 'deadline', internalType: 'uint256', type: 'uint256' },
                ],
            },
            { name: 'signature', internalType: 'bytes', type: 'bytes' },
        ],
        name: 'executeSwapAndDeposit',
        outputs: [
            {
                name: 'result',
                internalType: 'struct Types.BundlerResult',
                type: 'tuple',
                components: [
                    {
                        name: 'initialCbBTCBalance',
                        internalType: 'uint256',
                        type: 'uint256',
                    },
                    {
                        name: 'finalCbBTCBalance',
                        internalType: 'uint256',
                        type: 'uint256',
                    },
                    { name: 'cbBTCReceived', internalType: 'uint256', type: 'uint256' },
                ],
            },
        ],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        inputs: [
            { name: 'swapCalldata', internalType: 'bytes', type: 'bytes' },
            { name: 'owner', internalType: 'address', type: 'address' },
            { name: 'amountIn', internalType: 'uint256', type: 'uint256' },
            { name: 'tokenIn', internalType: 'address', type: 'address' },
            {
                name: 'params',
                internalType: 'struct Types.DepositLiquidityParams',
                type: 'tuple',
                components: [
                    {
                        name: 'depositOwnerAddress',
                        internalType: 'address',
                        type: 'address',
                    },
                    {
                        name: 'specifiedPayoutAddress',
                        internalType: 'address',
                        type: 'address',
                    },
                    { name: 'depositAmount', internalType: 'uint256', type: 'uint256' },
                    { name: 'expectedSats', internalType: 'uint64', type: 'uint64' },
                    {
                        name: 'btcPayoutScriptPubKey',
                        internalType: 'bytes22',
                        type: 'bytes22',
                    },
                    { name: 'depositSalt', internalType: 'bytes32', type: 'bytes32' },
                    { name: 'confirmationBlocks', internalType: 'uint8', type: 'uint8' },
                    {
                        name: 'safeBlockLeaf',
                        internalType: 'struct Types.BlockLeaf',
                        type: 'tuple',
                        components: [
                            { name: 'blockHash', internalType: 'bytes32', type: 'bytes32' },
                            { name: 'height', internalType: 'uint32', type: 'uint32' },
                            {
                                name: 'cumulativeChainwork',
                                internalType: 'uint256',
                                type: 'uint256',
                            },
                        ],
                    },
                    {
                        name: 'safeBlockSiblings',
                        internalType: 'bytes32[]',
                        type: 'bytes32[]',
                    },
                    {
                        name: 'safeBlockPeaks',
                        internalType: 'bytes32[]',
                        type: 'bytes32[]',
                    },
                ],
            },
        ],
        name: 'executeSwapAndDepositTest',
        outputs: [
            {
                name: 'result',
                internalType: 'struct Types.BundlerResult',
                type: 'tuple',
                components: [
                    {
                        name: 'initialCbBTCBalance',
                        internalType: 'uint256',
                        type: 'uint256',
                    },
                    {
                        name: 'finalCbBTCBalance',
                        internalType: 'uint256',
                        type: 'uint256',
                    },
                    { name: 'cbBTCReceived', internalType: 'uint256', type: 'uint256' },
                ],
            },
        ],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        inputs: [],
        name: 'permit2',
        outputs: [{ name: '', internalType: 'address', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        inputs: [
            { name: 'owner', internalType: 'address', type: 'address' },
            { name: 'amountIn', internalType: 'uint256', type: 'uint256' },
            {
                name: 'permitted',
                internalType: 'struct ISignatureTransfer.PermitTransferFrom',
                type: 'tuple',
                components: [
                    {
                        name: 'permitted',
                        internalType: 'struct ISignatureTransfer.TokenPermissions',
                        type: 'tuple',
                        components: [
                            { name: 'token', internalType: 'address', type: 'address' },
                            { name: 'amount', internalType: 'uint256', type: 'uint256' },
                        ],
                    },
                    { name: 'nonce', internalType: 'uint256', type: 'uint256' },
                    { name: 'deadline', internalType: 'uint256', type: 'uint256' },
                ],
            },
            { name: 'signature', internalType: 'bytes', type: 'bytes' },
            { name: 'swapCalldata', internalType: 'bytes', type: 'bytes' },
            {
                name: 'params',
                internalType: 'struct Types.DepositLiquidityParams',
                type: 'tuple',
                components: [
                    {
                        name: 'depositOwnerAddress',
                        internalType: 'address',
                        type: 'address',
                    },
                    {
                        name: 'specifiedPayoutAddress',
                        internalType: 'address',
                        type: 'address',
                    },
                    { name: 'depositAmount', internalType: 'uint256', type: 'uint256' },
                    { name: 'expectedSats', internalType: 'uint64', type: 'uint64' },
                    {
                        name: 'btcPayoutScriptPubKey',
                        internalType: 'bytes22',
                        type: 'bytes22',
                    },
                    { name: 'depositSalt', internalType: 'bytes32', type: 'bytes32' },
                    { name: 'confirmationBlocks', internalType: 'uint8', type: 'uint8' },
                    {
                        name: 'safeBlockLeaf',
                        internalType: 'struct Types.BlockLeaf',
                        type: 'tuple',
                        components: [
                            { name: 'blockHash', internalType: 'bytes32', type: 'bytes32' },
                            { name: 'height', internalType: 'uint32', type: 'uint32' },
                            {
                                name: 'cumulativeChainwork',
                                internalType: 'uint256',
                                type: 'uint256',
                            },
                        ],
                    },
                    {
                        name: 'safeBlockSiblings',
                        internalType: 'bytes32[]',
                        type: 'bytes32[]',
                    },
                    {
                        name: 'safeBlockPeaks',
                        internalType: 'bytes32[]',
                        type: 'bytes32[]',
                    },
                ],
            },
        ],
        name: 'permitTransferAndSwapDepositTest',
        outputs: [],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        inputs: [
            { name: 'owner', internalType: 'address', type: 'address' },
            { name: 'amountIn', internalType: 'uint256', type: 'uint256' },
            {
                name: 'permitted',
                internalType: 'struct ISignatureTransfer.PermitTransferFrom',
                type: 'tuple',
                components: [
                    {
                        name: 'permitted',
                        internalType: 'struct ISignatureTransfer.TokenPermissions',
                        type: 'tuple',
                        components: [
                            { name: 'token', internalType: 'address', type: 'address' },
                            { name: 'amount', internalType: 'uint256', type: 'uint256' },
                        ],
                    },
                    { name: 'nonce', internalType: 'uint256', type: 'uint256' },
                    { name: 'deadline', internalType: 'uint256', type: 'uint256' },
                ],
            },
            { name: 'signature', internalType: 'bytes', type: 'bytes' },
            { name: 'swapCalldata', internalType: 'bytes', type: 'bytes' },
        ],
        name: 'permitTransferAndSwapTest',
        outputs: [],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        inputs: [],
        name: 'riftExchange',
        outputs: [{ name: '', internalType: 'address', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        inputs: [],
        name: 'swapRouter',
        outputs: [{ name: '', internalType: 'address', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        inputs: [],
        name: 'universalRouter',
        outputs: [{ name: '', internalType: 'address', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        anonymous: false,
        inputs: [
            {
                name: 'owner',
                internalType: 'address',
                type: 'address',
                indexed: true,
            },
            {
                name: 'cbBTCReceived',
                internalType: 'uint256',
                type: 'uint256',
                indexed: false,
            },
        ],
        name: 'BundlerExecution',
    },
    {
        type: 'event',
        anonymous: false,
        inputs: [
            {
                name: 'owner',
                internalType: 'address',
                type: 'address',
                indexed: true,
            },
            {
                name: 'numTransfers',
                internalType: 'uint256',
                type: 'uint256',
                indexed: false,
            },
        ],
        name: 'PermitTransferExecuted',
    },
    {
        type: 'event',
        anonymous: false,
        inputs: [
            {
                name: 'riftExchange',
                internalType: 'address',
                type: 'address',
                indexed: true,
            },
            {
                name: 'depositAmount',
                internalType: 'uint256',
                type: 'uint256',
                indexed: false,
            },
        ],
        name: 'RiftDepositExecuted',
    },
    {
        type: 'event',
        anonymous: false,
        inputs: [
            {
                name: 'initialCbBTCBalance',
                internalType: 'uint256',
                type: 'uint256',
                indexed: false,
            },
            {
                name: 'finalCbBTCBalance',
                internalType: 'uint256',
                type: 'uint256',
                indexed: false,
            },
            {
                name: 'cbBTCReceived',
                internalType: 'uint256',
                type: 'uint256',
                indexed: false,
            },
        ],
        name: 'SwapExecuted',
    },
    {
        type: 'error',
        inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
        name: 'ApprovalError',
    },
    { type: 'error', inputs: [], name: 'ApprovalToRiftExchangeFailed' },
    { type: 'error', inputs: [], name: 'SwapExecutionFailed' },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link bundlerAbi}__
 */
export const useReadBundler = /*#__PURE__*/ createUseReadContract({
    abi: bundlerAbi,
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"cbBTC"`
 */
export const useReadBundlerCbBtc = /*#__PURE__*/ createUseReadContract({
    abi: bundlerAbi,
    functionName: 'cbBTC',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"permit2"`
 */
export const useReadBundlerPermit2 = /*#__PURE__*/ createUseReadContract({
    abi: bundlerAbi,
    functionName: 'permit2',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"riftExchange"`
 */
export const useReadBundlerRiftExchange = /*#__PURE__*/ createUseReadContract({
    abi: bundlerAbi,
    functionName: 'riftExchange',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"swapRouter"`
 */
export const useReadBundlerSwapRouter = /*#__PURE__*/ createUseReadContract({
    abi: bundlerAbi,
    functionName: 'swapRouter',
});

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"universalRouter"`
 */
export const useReadBundlerUniversalRouter = /*#__PURE__*/ createUseReadContract({
    abi: bundlerAbi,
    functionName: 'universalRouter',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link bundlerAbi}__
 */
export const useWriteBundler = /*#__PURE__*/ createUseWriteContract({
    abi: bundlerAbi,
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"_permitTransfer"`
 */
export const useWriteBundlerPermitTransfer = /*#__PURE__*/ createUseWriteContract({
    abi: bundlerAbi,
    functionName: '_permitTransfer',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"approveForSpender"`
 */
export const useWriteBundlerApproveForSpender = /*#__PURE__*/ createUseWriteContract({
    abi: bundlerAbi,
    functionName: 'approveForSpender',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwap"`
 */
export const useWriteBundlerExecuteSwap = /*#__PURE__*/ createUseWriteContract({
    abi: bundlerAbi,
    functionName: 'executeSwap',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwapAndDeposit"`
 */
export const useWriteBundlerExecuteSwapAndDeposit = /*#__PURE__*/ createUseWriteContract({
    abi: bundlerAbi,
    functionName: 'executeSwapAndDeposit',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwapAndDepositTest"`
 */
export const useWriteBundlerExecuteSwapAndDepositTest = /*#__PURE__*/ createUseWriteContract({
    abi: bundlerAbi,
    functionName: 'executeSwapAndDepositTest',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"permitTransferAndSwapDepositTest"`
 */
export const useWriteBundlerPermitTransferAndSwapDepositTest = /*#__PURE__*/ createUseWriteContract({
    abi: bundlerAbi,
    functionName: 'permitTransferAndSwapDepositTest',
});

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"permitTransferAndSwapTest"`
 */
export const useWriteBundlerPermitTransferAndSwapTest = /*#__PURE__*/ createUseWriteContract({
    abi: bundlerAbi,
    functionName: 'permitTransferAndSwapTest',
});

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link bundlerAbi}__
 */
export const useSimulateBundler = /*#__PURE__*/ createUseSimulateContract({
    abi: bundlerAbi,
});

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"_permitTransfer"`
 */
export const useSimulateBundlerPermitTransfer = /*#__PURE__*/ createUseSimulateContract({
    abi: bundlerAbi,
    functionName: '_permitTransfer',
});

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"approveForSpender"`
 */
export const useSimulateBundlerApproveForSpender = /*#__PURE__*/ createUseSimulateContract({
    abi: bundlerAbi,
    functionName: 'approveForSpender',
});

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwap"`
 */
export const useSimulateBundlerExecuteSwap = /*#__PURE__*/ createUseSimulateContract({
    abi: bundlerAbi,
    functionName: 'executeSwap',
});

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwapAndDeposit"`
 */
export const useSimulateBundlerExecuteSwapAndDeposit = /*#__PURE__*/ createUseSimulateContract({
    abi: bundlerAbi,
    functionName: 'executeSwapAndDeposit',
});

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwapAndDepositTest"`
 */
export const useSimulateBundlerExecuteSwapAndDepositTest = /*#__PURE__*/ createUseSimulateContract({
    abi: bundlerAbi,
    functionName: 'executeSwapAndDepositTest',
});

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"permitTransferAndSwapDepositTest"`
 */
export const useSimulateBundlerPermitTransferAndSwapDepositTest = /*#__PURE__*/ createUseSimulateContract({
    abi: bundlerAbi,
    functionName: 'permitTransferAndSwapDepositTest',
});

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"permitTransferAndSwapTest"`
 */
export const useSimulateBundlerPermitTransferAndSwapTest = /*#__PURE__*/ createUseSimulateContract({
    abi: bundlerAbi,
    functionName: 'permitTransferAndSwapTest',
});

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link bundlerAbi}__
 */
export const useWatchBundlerEvent = /*#__PURE__*/ createUseWatchContractEvent({
    abi: bundlerAbi,
});

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link bundlerAbi}__ and `eventName` set to `"BundlerExecution"`
 */
export const useWatchBundlerBundlerExecutionEvent = /*#__PURE__*/ createUseWatchContractEvent({
    abi: bundlerAbi,
    eventName: 'BundlerExecution',
});

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link bundlerAbi}__ and `eventName` set to `"PermitTransferExecuted"`
 */
export const useWatchBundlerPermitTransferExecutedEvent = /*#__PURE__*/ createUseWatchContractEvent({
    abi: bundlerAbi,
    eventName: 'PermitTransferExecuted',
});

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link bundlerAbi}__ and `eventName` set to `"RiftDepositExecuted"`
 */
export const useWatchBundlerRiftDepositExecutedEvent = /*#__PURE__*/ createUseWatchContractEvent({
    abi: bundlerAbi,
    eventName: 'RiftDepositExecuted',
});

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link bundlerAbi}__ and `eventName` set to `"SwapExecuted"`
 */
export const useWatchBundlerSwapExecutedEvent = /*#__PURE__*/ createUseWatchContractEvent({
    abi: bundlerAbi,
    eventName: 'SwapExecuted',
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link bundlerAbi}__
 */
export const readBundler = /*#__PURE__*/ createReadContract({ abi: bundlerAbi });

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"cbBTC"`
 */
export const readBundlerCbBtc = /*#__PURE__*/ createReadContract({
    abi: bundlerAbi,
    functionName: 'cbBTC',
});

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"permit2"`
 */
export const readBundlerPermit2 = /*#__PURE__*/ createReadContract({
    abi: bundlerAbi,
    functionName: 'permit2',
});

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"riftExchange"`
 */
export const readBundlerRiftExchange = /*#__PURE__*/ createReadContract({
    abi: bundlerAbi,
    functionName: 'riftExchange',
});

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"swapRouter"`
 */
export const readBundlerSwapRouter = /*#__PURE__*/ createReadContract({
    abi: bundlerAbi,
    functionName: 'swapRouter',
});

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"universalRouter"`
 */
export const readBundlerUniversalRouter = /*#__PURE__*/ createReadContract({
    abi: bundlerAbi,
    functionName: 'universalRouter',
});

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link bundlerAbi}__
 */
export const writeBundler = /*#__PURE__*/ createWriteContract({
    abi: bundlerAbi,
});

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"_permitTransfer"`
 */
export const writeBundlerPermitTransfer = /*#__PURE__*/ createWriteContract({
    abi: bundlerAbi,
    functionName: '_permitTransfer',
});

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"approveForSpender"`
 */
export const writeBundlerApproveForSpender = /*#__PURE__*/ createWriteContract({
    abi: bundlerAbi,
    functionName: 'approveForSpender',
});

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwap"`
 */
export const writeBundlerExecuteSwap = /*#__PURE__*/ createWriteContract({
    abi: bundlerAbi,
    functionName: 'executeSwap',
});

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwapAndDeposit"`
 */
export const writeBundlerExecuteSwapAndDeposit = /*#__PURE__*/ createWriteContract({
    abi: bundlerAbi,
    functionName: 'executeSwapAndDeposit',
});

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwapAndDepositTest"`
 */
export const writeBundlerExecuteSwapAndDepositTest = /*#__PURE__*/ createWriteContract({
    abi: bundlerAbi,
    functionName: 'executeSwapAndDepositTest',
});

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"permitTransferAndSwapDepositTest"`
 */
export const writeBundlerPermitTransferAndSwapDepositTest = /*#__PURE__*/ createWriteContract({
    abi: bundlerAbi,
    functionName: 'permitTransferAndSwapDepositTest',
});

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"permitTransferAndSwapTest"`
 */
export const writeBundlerPermitTransferAndSwapTest = /*#__PURE__*/ createWriteContract({
    abi: bundlerAbi,
    functionName: 'permitTransferAndSwapTest',
});

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link bundlerAbi}__
 */
export const simulateBundler = /*#__PURE__*/ createSimulateContract({
    abi: bundlerAbi,
});

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"_permitTransfer"`
 */
export const simulateBundlerPermitTransfer = /*#__PURE__*/ createSimulateContract({
    abi: bundlerAbi,
    functionName: '_permitTransfer',
});

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"approveForSpender"`
 */
export const simulateBundlerApproveForSpender = /*#__PURE__*/ createSimulateContract({
    abi: bundlerAbi,
    functionName: 'approveForSpender',
});

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwap"`
 */
export const simulateBundlerExecuteSwap = /*#__PURE__*/ createSimulateContract({
    abi: bundlerAbi,
    functionName: 'executeSwap',
});

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwapAndDeposit"`
 */
export const simulateBundlerExecuteSwapAndDeposit = /*#__PURE__*/ createSimulateContract({
    abi: bundlerAbi,
    functionName: 'executeSwapAndDeposit',
});

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwapAndDepositTest"`
 */
export const simulateBundlerExecuteSwapAndDepositTest = /*#__PURE__*/ createSimulateContract({
    abi: bundlerAbi,
    functionName: 'executeSwapAndDepositTest',
});

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"permitTransferAndSwapDepositTest"`
 */
export const simulateBundlerPermitTransferAndSwapDepositTest = /*#__PURE__*/ createSimulateContract({
    abi: bundlerAbi,
    functionName: 'permitTransferAndSwapDepositTest',
});

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"permitTransferAndSwapTest"`
 */
export const simulateBundlerPermitTransferAndSwapTest = /*#__PURE__*/ createSimulateContract({
    abi: bundlerAbi,
    functionName: 'permitTransferAndSwapTest',
});

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link bundlerAbi}__
 */
export const watchBundlerEvent = /*#__PURE__*/ createWatchContractEvent({
    abi: bundlerAbi,
});

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link bundlerAbi}__ and `eventName` set to `"BundlerExecution"`
 */
export const watchBundlerBundlerExecutionEvent = /*#__PURE__*/ createWatchContractEvent({
    abi: bundlerAbi,
    eventName: 'BundlerExecution',
});

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link bundlerAbi}__ and `eventName` set to `"PermitTransferExecuted"`
 */
export const watchBundlerPermitTransferExecutedEvent = /*#__PURE__*/ createWatchContractEvent({
    abi: bundlerAbi,
    eventName: 'PermitTransferExecuted',
});

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link bundlerAbi}__ and `eventName` set to `"RiftDepositExecuted"`
 */
export const watchBundlerRiftDepositExecutedEvent = /*#__PURE__*/ createWatchContractEvent({
    abi: bundlerAbi,
    eventName: 'RiftDepositExecuted',
});

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link bundlerAbi}__ and `eventName` set to `"SwapExecuted"`
 */
export const watchBundlerSwapExecutedEvent = /*#__PURE__*/ createWatchContractEvent({
    abi: bundlerAbi,
    eventName: 'SwapExecuted',
});
