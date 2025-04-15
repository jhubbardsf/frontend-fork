export const abi = [
    {
        type: 'constructor',
        inputs: [
            {
                name: '_swapRouter',
                type: 'address',
                internalType: 'address',
            },
            {
                name: '_riftExchange',
                type: 'address',
                internalType: 'address',
            },
            {
                name: '_cbBTC',
                type: 'address',
                internalType: 'address',
            },
            {
                name: '_permit2',
                type: 'address',
                internalType: 'address',
            },
            {
                name: '_universalRouter',
                type: 'address',
                internalType: 'address',
            },
        ] as const,
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: '_permitTransfer',
        inputs: [
            {
                name: 'owner',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'amountIn',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'permitted',
                type: 'tuple',
                internalType: 'struct ISignatureTransfer.PermitTransferFrom',
                components: [
                    {
                        name: 'permitted',
                        type: 'tuple',
                        internalType: 'struct ISignatureTransfer.TokenPermissions',
                        components: [
                            {
                                name: 'token',
                                type: 'address',
                                internalType: 'address',
                            },
                            {
                                name: 'amount',
                                type: 'uint256',
                                internalType: 'uint256',
                            },
                        ] as const,
                    },
                    {
                        name: 'nonce',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'deadline',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                ] as const,
            },
            {
                name: 'signature',
                type: 'bytes',
                internalType: 'bytes',
            },
        ] as const,
        outputs: [] as const,
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'approveForSpender',
        inputs: [
            {
                name: 'amountIn',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'spender',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'tokenIn',
                type: 'address',
                internalType: 'address',
            },
        ] as const,
        outputs: [] as const,
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'cbBTC',
        inputs: [] as const,
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ] as const,
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'executeSwap',
        inputs: [
            {
                name: 'swapCalldata',
                type: 'bytes',
                internalType: 'bytes',
            },
            {
                name: 'owner',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'amountIn',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'tokenIn',
                type: 'address',
                internalType: 'address',
            },
        ] as const,
        outputs: [
            {
                name: 'result',
                type: 'tuple',
                internalType: 'struct Types.BundlerResult',
                components: [
                    {
                        name: 'initialCbBTCBalance',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'finalCbBTCBalance',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'cbBTCReceived',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                ] as const,
            },
        ] as const,
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'executeSwapAndDeposit',
        inputs: [
            {
                name: 'amountIn',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'swapCalldata',
                type: 'bytes',
                internalType: 'bytes',
            },
            {
                name: 'params',
                type: 'tuple',
                internalType: 'struct Types.DepositLiquidityParams',
                components: [
                    {
                        name: 'depositOwnerAddress',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'specifiedPayoutAddress',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'depositAmount',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'expectedSats',
                        type: 'uint64',
                        internalType: 'uint64',
                    },
                    {
                        name: 'btcPayoutScriptPubKey',
                        type: 'bytes22',
                        internalType: 'bytes22',
                    },
                    {
                        name: 'depositSalt',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'confirmationBlocks',
                        type: 'uint8',
                        internalType: 'uint8',
                    },
                    {
                        name: 'safeBlockLeaf',
                        type: 'tuple',
                        internalType: 'struct Types.BlockLeaf',
                        components: [
                            {
                                name: 'blockHash',
                                type: 'bytes32',
                                internalType: 'bytes32',
                            },
                            {
                                name: 'height',
                                type: 'uint32',
                                internalType: 'uint32',
                            },
                            {
                                name: 'cumulativeChainwork',
                                type: 'uint256',
                                internalType: 'uint256',
                            },
                        ] as const,
                    },
                    {
                        name: 'safeBlockSiblings',
                        type: 'bytes32[] as const',
                        internalType: 'bytes32[] as const',
                    },
                    {
                        name: 'safeBlockPeaks',
                        type: 'bytes32[] as const',
                        internalType: 'bytes32[] as const',
                    },
                ] as const,
            },
            {
                name: 'owner',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'permit',
                type: 'tuple',
                internalType: 'struct ISignatureTransfer.PermitTransferFrom',
                components: [
                    {
                        name: 'permitted',
                        type: 'tuple',
                        internalType: 'struct ISignatureTransfer.TokenPermissions',
                        components: [
                            {
                                name: 'token',
                                type: 'address',
                                internalType: 'address',
                            },
                            {
                                name: 'amount',
                                type: 'uint256',
                                internalType: 'uint256',
                            },
                        ] as const,
                    },
                    {
                        name: 'nonce',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'deadline',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                ] as const,
            },
            {
                name: 'signature',
                type: 'bytes',
                internalType: 'bytes',
            },
        ] as const,
        outputs: [
            {
                name: 'result',
                type: 'tuple',
                internalType: 'struct Types.BundlerResult',
                components: [
                    {
                        name: 'initialCbBTCBalance',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'finalCbBTCBalance',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'cbBTCReceived',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                ] as const,
            },
        ] as const,
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'executeSwapAndDepositTest',
        inputs: [
            {
                name: 'swapCalldata',
                type: 'bytes',
                internalType: 'bytes',
            },
            {
                name: 'owner',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'amountIn',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'tokenIn',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'params',
                type: 'tuple',
                internalType: 'struct Types.DepositLiquidityParams',
                components: [
                    {
                        name: 'depositOwnerAddress',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'specifiedPayoutAddress',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'depositAmount',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'expectedSats',
                        type: 'uint64',
                        internalType: 'uint64',
                    },
                    {
                        name: 'btcPayoutScriptPubKey',
                        type: 'bytes22',
                        internalType: 'bytes22',
                    },
                    {
                        name: 'depositSalt',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'confirmationBlocks',
                        type: 'uint8',
                        internalType: 'uint8',
                    },
                    {
                        name: 'safeBlockLeaf',
                        type: 'tuple',
                        internalType: 'struct Types.BlockLeaf',
                        components: [
                            {
                                name: 'blockHash',
                                type: 'bytes32',
                                internalType: 'bytes32',
                            },
                            {
                                name: 'height',
                                type: 'uint32',
                                internalType: 'uint32',
                            },
                            {
                                name: 'cumulativeChainwork',
                                type: 'uint256',
                                internalType: 'uint256',
                            },
                        ] as const,
                    },
                    {
                        name: 'safeBlockSiblings',
                        type: 'bytes32[] as const',
                        internalType: 'bytes32[] as const',
                    },
                    {
                        name: 'safeBlockPeaks',
                        type: 'bytes32[] as const',
                        internalType: 'bytes32[] as const',
                    },
                ] as const,
            },
        ] as const,
        outputs: [
            {
                name: 'result',
                type: 'tuple',
                internalType: 'struct Types.BundlerResult',
                components: [
                    {
                        name: 'initialCbBTCBalance',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'finalCbBTCBalance',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'cbBTCReceived',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                ] as const,
            },
        ] as const,
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'permit2',
        inputs: [] as const,
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ] as const,
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'permitTransferAndSwapDepositTest',
        inputs: [
            {
                name: 'owner',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'amountIn',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'permitted',
                type: 'tuple',
                internalType: 'struct ISignatureTransfer.PermitTransferFrom',
                components: [
                    {
                        name: 'permitted',
                        type: 'tuple',
                        internalType: 'struct ISignatureTransfer.TokenPermissions',
                        components: [
                            {
                                name: 'token',
                                type: 'address',
                                internalType: 'address',
                            },
                            {
                                name: 'amount',
                                type: 'uint256',
                                internalType: 'uint256',
                            },
                        ] as const,
                    },
                    {
                        name: 'nonce',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'deadline',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                ] as const,
            },
            {
                name: 'signature',
                type: 'bytes',
                internalType: 'bytes',
            },
            {
                name: 'swapCalldata',
                type: 'bytes',
                internalType: 'bytes',
            },
            {
                name: 'params',
                type: 'tuple',
                internalType: 'struct Types.DepositLiquidityParams',
                components: [
                    {
                        name: 'depositOwnerAddress',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'specifiedPayoutAddress',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'depositAmount',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'expectedSats',
                        type: 'uint64',
                        internalType: 'uint64',
                    },
                    {
                        name: 'btcPayoutScriptPubKey',
                        type: 'bytes22',
                        internalType: 'bytes22',
                    },
                    {
                        name: 'depositSalt',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'confirmationBlocks',
                        type: 'uint8',
                        internalType: 'uint8',
                    },
                    {
                        name: 'safeBlockLeaf',
                        type: 'tuple',
                        internalType: 'struct Types.BlockLeaf',
                        components: [
                            {
                                name: 'blockHash',
                                type: 'bytes32',
                                internalType: 'bytes32',
                            },
                            {
                                name: 'height',
                                type: 'uint32',
                                internalType: 'uint32',
                            },
                            {
                                name: 'cumulativeChainwork',
                                type: 'uint256',
                                internalType: 'uint256',
                            },
                        ] as const,
                    },
                    {
                        name: 'safeBlockSiblings',
                        type: 'bytes32[] as const',
                        internalType: 'bytes32[] as const',
                    },
                    {
                        name: 'safeBlockPeaks',
                        type: 'bytes32[] as const',
                        internalType: 'bytes32[] as const',
                    },
                ] as const,
            },
        ] as const,
        outputs: [] as const,
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'permitTransferAndSwapTest',
        inputs: [
            {
                name: 'owner',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'amountIn',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'permitted',
                type: 'tuple',
                internalType: 'struct ISignatureTransfer.PermitTransferFrom',
                components: [
                    {
                        name: 'permitted',
                        type: 'tuple',
                        internalType: 'struct ISignatureTransfer.TokenPermissions',
                        components: [
                            {
                                name: 'token',
                                type: 'address',
                                internalType: 'address',
                            },
                            {
                                name: 'amount',
                                type: 'uint256',
                                internalType: 'uint256',
                            },
                        ] as const,
                    },
                    {
                        name: 'nonce',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'deadline',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                ] as const,
            },
            {
                name: 'signature',
                type: 'bytes',
                internalType: 'bytes',
            },
            {
                name: 'swapCalldata',
                type: 'bytes',
                internalType: 'bytes',
            },
        ] as const,
        outputs: [] as const,
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'riftExchange',
        inputs: [] as const,
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ] as const,
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'swapRouter',
        inputs: [] as const,
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ] as const,
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'universalRouter',
        inputs: [] as const,
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ] as const,
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'BundlerExecution',
        inputs: [
            {
                name: 'owner',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'cbBTCReceived',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
        ] as const,
        anonymous: false,
    },
    {
        type: 'event',
        name: 'PermitTransferExecuted',
        inputs: [
            {
                name: 'owner',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'numTransfers',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
        ] as const,
        anonymous: false,
    },
    {
        type: 'event',
        name: 'RiftDepositExecuted',
        inputs: [
            {
                name: 'riftExchange',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'depositAmount',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
        ] as const,
        anonymous: false,
    },
    {
        type: 'event',
        name: 'SwapExecuted',
        inputs: [
            {
                name: 'initialCbBTCBalance',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
            {
                name: 'finalCbBTCBalance',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
            {
                name: 'cbBTCReceived',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
        ] as const,
        anonymous: false,
    },
    {
        type: 'error',
        name: 'ApprovalError',
        inputs: [
            {
                name: 'token',
                type: 'address',
                internalType: 'address',
            },
        ] as const,
    },
    {
        type: 'error',
        name: 'ApprovalToRiftExchangeFailed',
        inputs: [] as const,
    },
    {
        type: 'error',
        name: 'SwapExecutionFailed',
        inputs: [] as const,
    },
] as const;
