import { BigNumber, BigNumberish, ethers } from 'ethers';
import { ValidAsset, DepositVault } from '../types';
import { useStore } from '../store';
import { ETH_Icon, ETH_Logo, USDT_Icon } from '../components/other/SVGs';

export const IS_MAINNET = true;
export const IS_FRONTEND_PAUSED = false;
export const MAX_SWAP_AMOUNT_USDT = 100; // USDT
export const MIN_SWAP_AMOUNT_USDT = 1; // USDT
export const MINIMUM_PROTOCOL_FEE_IN_MICRO_USDT = 100_000; // 0.1 USDT

// MAINNET ARBITRUM
export const MAINNET_ARBITRUM_CHAIN_ID = 42161;
export const MAINNET_ARBITRUM_ETHERSCAN_URL = 'https://arbiscan.io/';
export const MAINNET_ARBITRUM_PAYMASTER_URL = 'https://rift-paymaster-arbitrum.up.railway.app';
export const MAINNET_ARBITRUM_RPC_URL = 'https://arbitrum.gateway.tenderly.co/4H6CSEj1eY5HDcfZbiUEP1';
export const MAINNET_ARBITRUM_USDT_TOKEN_ADDRESS = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';

// TESTNET ARBITRUM
export const TESTNET_ARBITRUM_CHAIN_ID = 421614;
export const TESTNET_ARBITRUM_ETHERSCAN_URL = 'https://sepolia.arbiscan.io/';
export const TESTNET_ARBITRUM_PAYMASTER_URL = 'https://rift-paymaster-arbitrum-sepolia.up.railway.app';
export const TESTNET_ARBITRUM_RPC_URL = 'https://arbitrum-sepolia.gateway.tenderly.co/r5qQTaEWNQHaU4iClbRdt';
export const TESTNET_ARBITRUM_USDT_TOKEN_ADDRESS = '0xC4af7CFe412805C4A751321B7b0799ca9b8dbE56';

// ----------------------------------------------------------------//
export const MEMPOOL_HOST = 'https://mempool.space';
export const MAINNET_ETH_RPC_URL = 'https://archive-node.tail0a0b83.ts.net/ethereum/?key=7a29b610f3c03ebe55c4dcc5138884bea1976a7b9804fefc796da213610e0bf5';
export const MAX_SWAP_AMOUNT_MICRO_USDT = MAX_SWAP_AMOUNT_USDT * 10 ** 6;
export const MIN_SWAP_AMOUNT_MICRO_USDT = MIN_SWAP_AMOUNT_USDT * 10 ** 6;
export const MAX_SWAP_LP_OUTPUTS = 175;
export const REQUIRED_BLOCK_CONFIRMATIONS = 2;
export const PROTOCOL_FEE = BigNumber.from(1); // 0.1% -
export const PROTOCOL_FEE_DENOMINATOR = BigNumber.from(1000); // 100% / 0.1% = 1000
export const CONTRACT_RESERVATION_EXPIRATION_WINDOW_IN_SECONDS = 4 * 60 * 60; // 4 hours
export const FRONTEND_RESERVATION_EXPIRATION_WINDOW_IN_SECONDS = 1 * 60 * 60; // 1 hour

export const BITCOIN_DECIMALS = 8;
export const SATS_PER_BTC = 100000000; // 10^8

export const opaqueBackgroundColor = { bg: 'rgba(15, 15, 15, 0.55)', backdropFilter: 'blur(10px)' };
export const bitcoin_bg_color = '#c26920';
export const bitcoin_border_color = '#FFA04C';
export const bitcoin_dark_bg_color = '#372412';
export const bitcoin_light_text_color = '#7d572e';

export const ERC20ABI = [
    {
        type: 'event',
        name: 'Approval',
        inputs: [
            {
                indexed: true,
                name: 'owner',
                type: 'address',
            },
            {
                indexed: true,
                name: 'spender',
                type: 'address',
            },
            {
                indexed: false,
                name: 'value',
                type: 'uint256',
            },
        ],
    },
    {
        type: 'event',
        name: 'Transfer',
        inputs: [
            {
                indexed: true,
                name: 'from',
                type: 'address',
            },
            {
                indexed: true,
                name: 'to',
                type: 'address',
            },
            {
                indexed: false,
                name: 'value',
                type: 'uint256',
            },
        ],
    },
    {
        type: 'function',
        name: 'allowance',
        stateMutability: 'view',
        inputs: [
            {
                name: 'owner',
                type: 'address',
            },
            {
                name: 'spender',
                type: 'address',
            },
        ],
        outputs: [
            {
                type: 'uint256',
            },
        ],
    },
    {
        type: 'function',
        name: 'approve',
        stateMutability: 'nonpayable',
        inputs: [
            {
                name: 'spender',
                type: 'address',
            },
            {
                name: 'amount',
                type: 'uint256',
            },
        ],
        outputs: [
            {
                type: 'bool',
            },
        ],
    },
    {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [
            {
                name: 'account',
                type: 'address',
            },
        ],
        outputs: [
            {
                type: 'uint256',
            },
        ],
    },
    {
        type: 'function',
        name: 'decimals',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'uint8',
            },
        ],
    },
    {
        type: 'function',
        name: 'name',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'string',
            },
        ],
    },
    {
        type: 'function',
        name: 'symbol',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'string',
            },
        ],
    },
    {
        type: 'function',
        name: 'totalSupply',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'uint256',
            },
        ],
    },
    {
        type: 'function',
        name: 'transfer',
        stateMutability: 'nonpayable',
        inputs: [
            {
                name: 'recipient',
                type: 'address',
            },
            {
                name: 'amount',
                type: 'uint256',
            },
        ],
        outputs: [
            {
                type: 'bool',
            },
        ],
    },
    {
        type: 'function',
        name: 'transferFrom',
        stateMutability: 'nonpayable',
        inputs: [
            {
                name: 'sender',
                type: 'address',
            },
            {
                name: 'recipient',
                type: 'address',
            },
            {
                name: 'amount',
                type: 'uint256',
            },
        ],
        outputs: [
            {
                type: 'bool',
            },
        ],
    },
];
