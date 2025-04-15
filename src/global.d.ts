import type { EthereumProvider } from 'viem';

declare global {
    interface Window {
        ethereum?: EthereumProvider;

        rift: {
            getProxyWallet: (args: GetProxyWalletArgs) => Promise<GetProxyWalletResponse>;
            getRiftSwapFees: (args: GetRiftSwapFeesArgs) => Promise<RiftSwapFees>;
            spawn: () => Promise<void>;
            createRiftSwap: (args: CreateRiftSwapArgs) => Promise<ProxyWalletStatus>;
            getRiftSwapStatus: (args: GetRiftSwapStatusArgs) => Promise<ProxyWalletStatus>;
            getAllRiftSwapStatuses: () => Promise<ProxyWalletStatus[]>;
            clearLocalSwaps: () => Promise<void>;
            getAggregateProxyBalance: () => Promise<number>;
            sweepKeysToWallet: (outputAddress: string) => Promise<string | undefined>;
        };
    }
}
