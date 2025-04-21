import { BigNumber, BigNumberish, ethers } from 'ethers';
import { ValidAsset, DeploymentType } from '../types';
import { useStore } from '../store';
import { ETH_Icon, ETH_Logo, USDT_Icon } from '../components/other/SVGs';

export const DEPLOYMENT_TYPE: DeploymentType = DeploymentType.DEVNET; // Local devnet
export const IS_FRONTEND_PAUSED = false;
export const MIN_SWAP_AMOUNT_SATS = 3000; // 1000 sats = ~$0.96 currently
export const MAX_SWAP_AMOUNT_SATS = 100_000_000_000; // 1,000 cbBTC
export const SAMEES_DEMO_CB_BTC_ADDRESS = '0xA976a1F4Ee6DC8011e777133C6719087C10b6259';

// BASE MAINNET
export const MAINNET_BASE_CHAIN_ID = 8453;
export const MAINNET_BASE_ETHERSCAN_URL = 'https://basescan.org/';
export const MAINNET_BASE_RPC_URL = 'https://base.gateway.tenderly.co/2CozPE8XkkiFQIO8uj4Ug1';
export const MAINNET_DATA_ENGINE_URL = 'https://ip-172-31-22-251.tail0a0b83.ts.net/contract-data-engine';
export const MAINNET_BASE_CBBTC_TOKEN_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
export const MAINNET_BASE_RIFT_EXCHANGE_ADDRESS = '0x14cacc70eb61a1340fcc28d1e21b367da5c21a70'; // TODO: REPLACE

// BASE TESTNET
export const TESTNET_BASE_CHAIN_ID = 84532;
export const TESTNET_BASE_ETHERSCAN_URL = 'https://base-sepolia.g.alchemy.com/v2/demo';
export const TESTNET_BASE_RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/demo';
export const TESTNET_DATA_ENGINE_URL = 'null';
export const TESTNET_BASE_CBBTC_TOKEN_ADDRESS = '0x83358384d0c3874356f590d220e1064212525379';
export const TESTNET_BASE_RIFT_EXCHANGE_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'; // TODO: REPLACE

// BASE DEVNET
export const DEVNET_BASE_CHAIN_ID = 1337;
export const DEVNET_BASE_ETHERSCAN_URL = 'http://localhost:50101';
export const DEVNET_BASE_RPC_URL = 'http://localhost:50101';
export const DEVNET_DATA_ENGINE_URL = 'http://localhost:50100';
export const DEVNET_BASE_CBBTC_TOKEN_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
export const DEVNET_BASE_RIFT_EXCHANGE_ADDRESS = '0x737b8F095E3c575a6Ae5FE1711AdB8F271E20269';

// // MAINNET ARBITRUM
// export const MAINNET_ARBITRUM_CHAIN_ID = 42161;
// export const MAINNET_ARBITRUM_ETHERSCAN_URL = 'https://arbiscan.io/';
// export const MAINNET_ARBITRUM_PAYMASTER_URL = 'https://rift-paymaster-arbitrum.up.railway.app';
// export const MAINNET_ARBITRUM_RPC_URL = 'https://arbitrum.gateway.tenderly.co/4H6CSEj1eY5HDcfZbiUEP1';
// export const MAINNET_ARBITRUM_USDT_TOKEN_ADDRESS = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';

// ----------------------------------------------------------------//
export const MEMPOOL_HOST = 'https://mempool.space';
export const MAINNET_ETH_RPC_URL = [
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://mainnet.gateway.tenderly.co',
    'https://ethereum-rpc.publicnode.com',
    'https://api.securerpc.com/v1',
    'https://eth.rpc.blxrbdn.com',
    'https://eth-mainnet.g.alchemy.com/v2/demo',
    'https://eth-mainnet.public.blastapi.io',
    'https://singapore.rpc.blxrbdn.com',
    'https://eth-mainnet.nodereal.io/v1/1659dfb40aa24bbb8153a677b98064d7',
    'https://virginia.rpc.blxrbdn.com',
    'https://uk.rpc.blxrbdn.com',
    'https://gateway.tenderly.co/public/mainnet',
    'https://ethereum.blockpi.network/v1/rpc/public',
];

export const MAX_SWAP_LP_OUTPUTS = 175;
export const REQUIRED_BLOCK_CONFIRMATIONS = 2;
export const PROTOCOL_FEE = BigNumber.from(1); // 0.1%
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
