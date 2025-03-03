import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

import {
  createReadContract,
  createWriteContract,
  createSimulateContract,
  createWatchContractEvent,
} from 'wagmi/codegen'

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
    inputs: [],
    name: 'cbBTC',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
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
      { name: 'cbBTCReceived', internalType: 'uint256', type: 'uint256' },
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
      {
        name: 'amountIn',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'tokenIn',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'BundlerExecution',
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'ApprovalError',
  },
  { type: 'error', inputs: [], name: 'ApprovalToRiftExchangeFailed' },
  { type: 'error', inputs: [], name: 'SwapExecutionFailed' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link bundlerAbi}__
 */
export const useReadBundler = /*#__PURE__*/ createUseReadContract({
  abi: bundlerAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"cbBTC"`
 */
export const useReadBundlerCbBtc = /*#__PURE__*/ createUseReadContract({
  abi: bundlerAbi,
  functionName: 'cbBTC',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"permit2"`
 */
export const useReadBundlerPermit2 = /*#__PURE__*/ createUseReadContract({
  abi: bundlerAbi,
  functionName: 'permit2',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"riftExchange"`
 */
export const useReadBundlerRiftExchange = /*#__PURE__*/ createUseReadContract({
  abi: bundlerAbi,
  functionName: 'riftExchange',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"swapRouter"`
 */
export const useReadBundlerSwapRouter = /*#__PURE__*/ createUseReadContract({
  abi: bundlerAbi,
  functionName: 'swapRouter',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"universalRouter"`
 */
export const useReadBundlerUniversalRouter =
  /*#__PURE__*/ createUseReadContract({
    abi: bundlerAbi,
    functionName: 'universalRouter',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link bundlerAbi}__
 */
export const useWriteBundler = /*#__PURE__*/ createUseWriteContract({
  abi: bundlerAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwapAndDeposit"`
 */
export const useWriteBundlerExecuteSwapAndDeposit =
  /*#__PURE__*/ createUseWriteContract({
    abi: bundlerAbi,
    functionName: 'executeSwapAndDeposit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link bundlerAbi}__
 */
export const useSimulateBundler = /*#__PURE__*/ createUseSimulateContract({
  abi: bundlerAbi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwapAndDeposit"`
 */
export const useSimulateBundlerExecuteSwapAndDeposit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: bundlerAbi,
    functionName: 'executeSwapAndDeposit',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link bundlerAbi}__
 */
export const useWatchBundlerEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: bundlerAbi,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link bundlerAbi}__ and `eventName` set to `"BundlerExecution"`
 */
export const useWatchBundlerBundlerExecutionEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: bundlerAbi,
    eventName: 'BundlerExecution',
  })

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link bundlerAbi}__
 */
export const readBundler = /*#__PURE__*/ createReadContract({ abi: bundlerAbi })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"cbBTC"`
 */
export const readBundlerCbBtc = /*#__PURE__*/ createReadContract({
  abi: bundlerAbi,
  functionName: 'cbBTC',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"permit2"`
 */
export const readBundlerPermit2 = /*#__PURE__*/ createReadContract({
  abi: bundlerAbi,
  functionName: 'permit2',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"riftExchange"`
 */
export const readBundlerRiftExchange = /*#__PURE__*/ createReadContract({
  abi: bundlerAbi,
  functionName: 'riftExchange',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"swapRouter"`
 */
export const readBundlerSwapRouter = /*#__PURE__*/ createReadContract({
  abi: bundlerAbi,
  functionName: 'swapRouter',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"universalRouter"`
 */
export const readBundlerUniversalRouter = /*#__PURE__*/ createReadContract({
  abi: bundlerAbi,
  functionName: 'universalRouter',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link bundlerAbi}__
 */
export const writeBundler = /*#__PURE__*/ createWriteContract({
  abi: bundlerAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwapAndDeposit"`
 */
export const writeBundlerExecuteSwapAndDeposit =
  /*#__PURE__*/ createWriteContract({
    abi: bundlerAbi,
    functionName: 'executeSwapAndDeposit',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link bundlerAbi}__
 */
export const simulateBundler = /*#__PURE__*/ createSimulateContract({
  abi: bundlerAbi,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link bundlerAbi}__ and `functionName` set to `"executeSwapAndDeposit"`
 */
export const simulateBundlerExecuteSwapAndDeposit =
  /*#__PURE__*/ createSimulateContract({
    abi: bundlerAbi,
    functionName: 'executeSwapAndDeposit',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link bundlerAbi}__
 */
export const watchBundlerEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: bundlerAbi,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link bundlerAbi}__ and `eventName` set to `"BundlerExecution"`
 */
export const watchBundlerBundlerExecutionEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: bundlerAbi,
    eventName: 'BundlerExecution',
  })
