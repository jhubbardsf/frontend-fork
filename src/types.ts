import { BigNumber, BigNumberish, ethers } from 'ethers';
import { ComponentType, ReactElement } from 'react';
import { Chain } from 'viem';

export enum ReservationState {
    None,
    Created,
    Proved,
    Completed,
    Expired,
}

export type SwapReservation = {
    owner: string;
    confirmationBlockHeight: number;
    reservationTimestamp: number;
    liquidityUnlockedTimestamp: number;
    state: ReservationState;
    stateOffChain?: ReservationState;
    ethPayoutAddress: string;
    lpReservationHash: string;
    nonce: string;
    indexInContract?: number;
    totalSatsInputInlcudingProxyFee: BigNumber;
    totalSwapOutputAmount: BigNumber;
    proposedBlockHeight: BigNumber;
    proposedBlockHash: string;
    vaultIndexes: number[];
    amountsToReserve: BigNumber[];
    expectedSatsOutput: BigNumber[];
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

export type DepositVault = {
    owner: string;
    depositTimestamp: number;
    initialBalance: BigNumberish;
    unreservedBalanceFromContract: BigNumberish;
    trueUnreservedBalance?: BigNumberish;
    withdrawnAmount: BigNumberish;
    activelyReservedAmount?: BigNumberish;
    completedAmount?: BigNumberish;
    provedAmount?: BigNumberish;
    btcExchangeRate: BigNumberish;
    btcPayoutLockingScript: string;
    index?: number;
    depositAsset: ValidAsset;
};

export type ValidAsset = {
    name: string;
    display_name?: string;
    tokenAddress?: string;
    decimals: number;
    riftExchangeContractAddress?: string;
    riftExchangeAbi?: any;
    contractChainID?: number;
    chainDetails?: any;
    contractRpcURL?: string;
    etherScanBaseUrl?: string;
    paymasterUrl?: string;
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
};

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

export type AssetType = 'BTC' | 'USDT' | 'USDC' | 'ETH' | 'WETH' | 'WBTC';

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
