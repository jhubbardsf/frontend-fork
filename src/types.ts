import type { BigNumber, BigNumberish, BytesLike, ethers } from 'ethers';
import type { Address } from 'viem';

export enum ReservationState {
    None,
    Created,
    Proved,
    Completed,
    Expired,
}

export type UserSwap = {
    vaultIndex: string;
    depositTimestamp: number;
    depositAmount: string;
    depositFee: string;
    expectedSats: number;
    btcPayoutScriptPubKey: string;
    specifiedPayoutAddress: string;
    ownerAddress: string;
    salt: string;
    confirmationBlocks: number;
    attestedBitcoinBlockHeight: number;
    deposit_block_number: number;
    deposit_block_hash: string;
    deposit_txid: string;
    swap_proofs: any[];
};

export type ReserveLiquidityParams = {
    swapAmountInSats: number;
    vaultIndexesToReserve: number[];
    amountsInMicroUsdtToReserve: BigNumberish[];
    amountsInSatsToBePaid: BigNumberish[];
    btcPayoutLockingScripts: string[];
    btcExchangeRates: BigNumberish[];
    ethPayoutAddress: string;
    expiredSwapReservationIndexes: number[];
    totalSatsInputInlcudingProxyFee: BigNumber;
};

export type UpdateExchangeRateParams = {
    globalVaultIndex: number;
    newExchangeRate: BigNumberish;
    expiredSwapReservationIndexes: number[];
};

export type ValidAsset = {
    name: string;
    display_name?: string;
    tokenAddress?: string;
    dataEngineUrl?: string;
    decimals: number;
    riftExchangeContractAddress?: string;
    riftExchangeAbi?: any;
    contractChainID?: number;
    chainDetails?: any;
    contractRpcURL?: string;
    etherScanBaseUrl?: string;
    proverFee?: BigNumber;
    releaserFee?: BigNumber;
    icon_svg: any;
    bg_color: string;
    border_color: string;
    border_color_light: string;
    dark_bg_color: string;
    light_text_color: string;
    exchangeRateInTokenPerBTC?: number | null;
    exchangeRateInSmallestTokenUnitPerSat?: BigNumber | null;
    priceUSD: number | null;
    totalAvailableLiquidity?: BigNumber;
    connectedUserBalanceRaw?: BigNumber;
    connectedUserBalanceFormatted?: string;
    fromTokenList?: boolean;
} & Partial<TokenMeta>;

export type LiqudityProvider = {
    depositVaultIndexes: number[];
};

export interface ProxyWalletLiquidityProvider {
    amount: string;
    btcExchangeRate: string;
    lockingScriptHex: string;
}

export interface ProxyWalletSwapArgs {
    orderNonceHex: string;
    liquidityProviders: Array<ProxyWalletLiquidityProvider>;
}

export type AssetType = 'BTC' | 'USDT' | 'USDC' | 'ETH' | 'WETH' | 'WBTC' | 'CoinbaseBTC' | 'cbBTC';

export type CurrencyModalTitle = 'send' | 'recieve' | 'deposit' | 'close';

export type LiquidityReservedEvent = {
    reserver: string;
    swapReservationIndex: string;
    orderNonce: string;
    event: ethers.Event;
};

export type RouteButton = 'Swap' | 'Manage' | 'About';

export const ROUTES: { [k in RouteButton]: string } = {
    Swap: '/',
    Manage: '/manage',
    About: '/about',
};

export type ReservationByPaymasterRequest = {
    sender: string;
    vault_indexes_to_reserve: Array<string>;
    amounts_to_reserve: Array<string>;
    eth_payout_address: string;
    total_sats_input_inlcuding_proxy_fee: string;
    expired_swap_reservation_indexes: Array<string>;
};

export type ReservationByPaymasterResponse = {
    status: boolean;
    tx_hash: string | null;
};

export enum DeploymentType {
    MAINNET = 'MAINNET',
    TESTNET = 'TESTNET',
    DEVNET = 'DEVNET',
}

export type BlockLeaf = {
    blockHash: string;
    height: number;
    cumulativeChainwork: BigNumber;
};

// types/UniswapTokenList.ts

type ChainIDString = string;

/**
 * Defines a Uniswap-compatible token list, e.g. from https://tokens.uniswap.org
 */
export interface UniswapTokenList {
    name: string;
    timestamp: string;
    version: {
        major: number;
        minor: number;
        patch: number;
    };
    tags: Record<string, unknown>;
    logoURI: string;
    keywords: string[];
    tokens: TokenMeta[];
}

/**
 * Individual token entry in the Uniswap token list
 */
export interface TokenMeta {
    chainId: number;
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
    extensions?: {
        bridgeInfo?: Record<
            ChainIDString,
            {
                tokenAddress: string;
            }
        >;
    };
}
export type SingleExecuteSwapAndDeposit = [
    amountIn: BigNumberish,
    swapCalldata: BytesLike,
    params: DepositLiquidityParamsStruct,
    owner: Address,
    permit: ISignatureTransfer.PermitTransferFromStruct,
    signature: BytesLike,
];
export type BatchExecuteSwapAndDeposit = [
    batchPermit: ISignatureTransfer.PermitBatchTransferFromStruct,
    transferDetails: ISignatureTransfer.SignatureTransferDetailsStruct[],
    owner: Address,
    signature: BytesLike,
    swapCalldata: BytesLike,
    params: DepositLiquidityParamsStruct,
];

export interface NestedDepositData {
    vaultIndex: string;
    depositTimestamp: number;
    depositAmount: string;
    depositFee: string;
    expectedSats: number;
    btcPayoutScriptPubKey: string;
    specifiedPayoutAddress: string;
    ownerAddress: string;
    salt?: string;
    confirmationBlocks: number;
    attestedBitcoinBlockHeight: number;
}

export interface ContractDataContextType {
    loading: boolean;
    error: any;
    userSwapsFromAddress: UserSwap[];
    refreshConnectedUserBalance: () => Promise<void>;
    refreshUserSwapsFromAddress: () => Promise<void>;
}

export type BlockLeafStruct = {
    blockHash: BytesLike;
    height: BigNumberish;
    cumulativeChainwork: BigNumberish;
};

export type DepositLiquidityParamsStruct = {
    depositOwnerAddress: string;
    specifiedPayoutAddress: string;
    depositAmount: BigNumberish;
    expectedSats: BigNumberish;
    btcPayoutScriptPubKey: BytesLike;
    depositSalt: BytesLike;
    confirmationBlocks: BigNumberish;
    safeBlockLeaf: BlockLeafStruct;
    safeBlockSiblings: BytesLike[];
    safeBlockPeaks: BytesLike[];
};

export declare namespace ISignatureTransfer {
    export type TokenPermissionsStruct = { token: string; amount: BigNumberish };

    export type TokenPermissionsStructOutput = [string, BigNumber] & {
        token: string;
        amount: BigNumber;
    };

    export type PermitTransferFromStruct = {
        permitted: ISignatureTransfer.TokenPermissionsStruct;
        nonce: BigNumberish;
        deadline: BigNumberish;
    };

    export type PermitTransferFromStructOutput = [
        ISignatureTransfer.TokenPermissionsStructOutput,
        BigNumber,
        BigNumber,
    ] & {
        permitted: ISignatureTransfer.TokenPermissionsStructOutput;
        nonce: BigNumber;
        deadline: BigNumber;
    };

    export type SignatureTransferDetailsStruct = {
        to: string;
        requestedAmount: BigNumberish;
    };

    export type SignatureTransferDetailsStructOutput = [string, BigNumber] & {
        to: string;
        requestedAmount: BigNumber;
    };

    export type PermitBatchTransferFromStruct = {
        permitted: ISignatureTransfer.TokenPermissionsStruct[];
        nonce: BigNumberish;
        deadline: BigNumberish;
    };

    export type PermitBatchTransferFromStructOutput = [
        ISignatureTransfer.TokenPermissionsStructOutput[],
        BigNumber,
        BigNumber,
    ] & {
        permitted: ISignatureTransfer.TokenPermissionsStructOutput[];
        nonce: BigNumber;
        deadline: BigNumber;
    };
}
