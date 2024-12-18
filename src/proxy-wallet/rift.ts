// BGSW Rift API
import { MEMPOOL_HOST } from '../utils/constants';
import { buildSweepTransaction, buildWalletFromMnemonic, estimateRiftPaymentTransactionFees, executeRiftSwapOnAvailableUTXO, generateP2WPKH } from './bitcoin';
import * as storage from './db';
import { broadcastTransaction, fetchAddressUTXOs, getBtcFeeRates } from './mempoolApi';
import { CreateRiftSwapArgs, GetProxyWalletArgs, GetProxyWalletResponse, GetRiftSwapFeesArgs, GetRiftSwapStatusArgs, ProxyWalletStatus, RiftSwapFees, SwapStatus } from './types';

async function _getProxyWallet(orderNonceHex: string): Promise<{
    address: string;
    privateKey: string;
    mnemonic: string;
}> {
    const wallet = await storage.getWalletFromOrderNonce(orderNonceHex);
    if (wallet) {
        return wallet;
    }
    // otherwise generate new
    const newWallet = generateP2WPKH(orderNonceHex);
    await storage.addWallet(newWallet);
    return newWallet;
}

export const RiftApi = {
    async getProxyWallet(args: GetProxyWalletArgs): Promise<GetProxyWalletResponse> {
        return { address: (await _getProxyWallet(args.orderNonceHex)).address };
    },

    async getRiftSwapFees(args: GetRiftSwapFeesArgs): Promise<RiftSwapFees> {
        const mnemonic = 'ladder crystal wool wheat fossil large unable firm vicious index index outer';
        let wallet = buildWalletFromMnemonic(mnemonic);

        return await estimateRiftPaymentTransactionFees(args.lps, wallet, MEMPOOL_HOST);
    },

    async spawn(): Promise<void> {
        const swaps = await storage.getSwaps();
        const waitingSwaps = swaps.filter((swap) => swap.status === SwapStatus.WAITING_FOR_FUNDING_TRANSACTION);

        for (const swap of waitingSwaps) {
            try {
                const { mnemonic } = await _getProxyWallet(swap.orderNonceHex);

                // Reconstruct the CreateRiftSwapArgs from the stored swap data
                const args: CreateRiftSwapArgs = {
                    orderNonceHex: swap.orderNonceHex,
                    liquidityProviders: swap.liquidityProviders,
                };

                // Execute the swap
                executeRiftSwapOnAvailableUTXO(args, mnemonic, MEMPOOL_HOST, swap.id);
            } catch (error) {
                console.error(`Error processing swap ${swap.id}:`, error);
            }
        }
    },

    async createRiftSwap(args: CreateRiftSwapArgs): Promise<ProxyWalletStatus> {
        console.log('Creating rift swap with args:', args);
        await storage.addSwap(args);
        console.log('Swap stored successfully');

        const { mnemonic } = await _getProxyWallet(args.orderNonceHex);
        console.log('Waiting for rift swap on available UTXO');
        // TODO: Grab a custom mempool host if the user provided one in options
        // This is purposefully not being awaited because this function is meant to be fire-and-forget
        executeRiftSwapOnAvailableUTXO(args, mnemonic, MEMPOOL_HOST, args.orderNonceHex);

        return {
            status: SwapStatus.WAITING_FOR_FUNDING_TRANSACTION,
            paymentTxid: '',
            internalId: args.orderNonceHex,
        };
    },

    async getRiftSwapStatus(args: GetRiftSwapStatusArgs): Promise<ProxyWalletStatus> {
        const swap = await storage.getFromStore<storage.Swap>('swaps', args.internalId);
        if (!swap) {
            throw new Error('No swap found with that ID');
        }
        return {
            status: swap.status,
            paymentTxid: swap.paymentTxid,
            internalId: swap.id,
        };
    },

    async getAllRiftSwapStatuses(): Promise<ProxyWalletStatus[]> {
        const swaps = await storage.getSwaps();
        return swaps.map((swap) => ({
            status: swap.status,
            paymentTxid: swap.paymentTxid,
            internalId: swap.id,
        }));
    },

    async clearLocalSwaps() {
        await storage.clearSwaps();
    },

    async getAggregateProxyBalance() {
        const wallets = await storage.getWallets();
        const utxos = [];
        for (const wallet of wallets) {
            // sleep for 250ms
            await new Promise((resolve) => setTimeout(resolve, 250));
            const utxos = await fetchAddressUTXOs(wallet.address, MEMPOOL_HOST);
            utxos.push(...utxos);
        }
        return utxos.reduce((acc, utxo) => acc + utxo.value, 0);
    },

    async sweepKeysToWallet(outputAddress: string) {
        // get all wallets that have a UTXO
        const wallets = await storage.getWallets();
        const signable_utxos = [];
        for (const wallet of wallets) {
            const utxos = await fetchAddressUTXOs(wallet.address, MEMPOOL_HOST);
            if (utxos.length === 0) {
                continue;
            }
            const bitcoinWallet = buildWalletFromMnemonic(wallet.mnemonic);
            utxos.forEach((utxo) => {
                signable_utxos.push({
                    txid: utxo.txid,
                    vout: utxo.vout,
                    value: utxo.value,
                    signer_wallet: bitcoinWallet,
                });
            });
        }
        if (signable_utxos.length === 0) {
            console.warn('No UTXOs to sweep');
            return undefined;
        }
        const feeRate = await getBtcFeeRates(MEMPOOL_HOST);
        const { txSerializedNoSegwit, txid, txSerialized } = await buildSweepTransaction(signable_utxos, outputAddress, feeRate.fastestFee);
        await broadcastTransaction(txSerialized, MEMPOOL_HOST);
        return txid;
    },
};
