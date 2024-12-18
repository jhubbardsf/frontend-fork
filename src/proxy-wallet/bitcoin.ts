import { HDKey } from '@scure/bip32';
import BigNumber from 'bignumber.js';
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import { ec as EC } from 'elliptic';

import { MAX_RESERVATION_DURATION, UTXO_POLLING_INTERVAL } from './constants';
import * as storage from './db';
import { broadcastTransaction, fetchAddressUTXOs, fetchSerializedTransactionData, getBtcFeeRates } from './mempoolApi';
import { CreateRiftSwapArgs, LiquidityProvider, RiftSwapFees, SwapStatus } from './types';

const ec = new EC('secp256k1');

export function generateP2WPKH(orderNonceHex: string) {
    const network = bitcoin.networks.bitcoin;
    const mnemonic = bip39.generateMnemonic();
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = HDKey.fromMasterSeed(seed);
    const child = root.derive("m/84'/0'/0'/0/0");
    const publicKey = Buffer.from(child.publicKey);
    const privateKey = Buffer.from(child.privateKey).toString('hex');
    const { address } = bitcoin.payments.p2wpkh({ pubkey: publicKey, network });
    return { mnemonic, address, privateKey, associatedOrderNonceHex: orderNonceHex };
}

export type BitcoinWallet = {
    address: string;
    unlockScript: string;
    publicKey: string;
    hdKey: HDKey;
};

function normalizeHexStr(hex: string): string {
    return hex.startsWith('0x') ? hex.slice(2) : hex;
}

function weiToSatoshi(weiAmount: string, weiSatsExchangeRate: string): number {
    BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_DOWN });
    return new BigNumber(weiAmount).div(weiSatsExchangeRate).integerValue().toNumber();
}

function satsToWei(satsAmount: number, weiSatsExchangeRate: string): string {
    return new BigNumber(satsAmount).times(weiSatsExchangeRate).toString();
}

export function buildWalletFromMnemonic(mnemonic: string): BitcoinWallet {
    const network = bitcoin.networks.bitcoin;
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = HDKey.fromMasterSeed(seed);
    const child = root.derive("m/84'/0'/0'/0/0");
    const publicKey = Buffer.from(child.publicKey);
    const { address } = bitcoin.payments.p2wpkh({ pubkey: publicKey, network });
    const unlockScript = bitcoin.payments.p2wpkh({ pubkey: publicKey, network }).output!.toString('hex');
    return {
        address,
        unlockScript,
        publicKey: publicKey.toString('hex'),
        hdKey: child,
    };
}

function reserializeNoSegwit(serializedTxn: string): string {
    const txn = bitcoin.Transaction.fromHex(serializedTxn);
    const txnWithoutWitness = new bitcoin.Transaction();
    txnWithoutWitness.version = txn.version;
    txn.ins.forEach((input) => {
        txnWithoutWitness.addInput(input.hash, input.index, input.sequence, input.script);
    });
    txn.outs.forEach((output) => {
        txnWithoutWitness.addOutput(output.script, output.value);
    });
    txnWithoutWitness.locktime = txn.locktime;
    return txnWithoutWitness.toHex();
}

async function fetchFundingTxAmount(inTxidHex: string, inTxvout: number, mempoolApiHostname: string) {
    const serializedInputTransaction = await fetchSerializedTransactionData(normalizeHexStr(inTxidHex), mempoolApiHostname);
    const inputTransaction = bitcoin.Transaction.fromHex(serializedInputTransaction);

    return inputTransaction.outs[inTxvout].value;
}

// P2WPKH signing in bitcoinjs-lib
// https://github.com/bitcoinjs/bitcoinjs-lib/issues/999#issuecomment-361124950
async function buildRiftPaymentTransaction(
    orderNonceHex: string,
    liquidityProviders: LiquidityProvider[],
    inTxidHex: string,
    inTxvout: number,
    wallet: BitcoinWallet,
    vinSats: number,
    feeSats: number,
): Promise<{
    txSerializedNoSegwit: string;
    txid: string;
    txSerialized: string;
}> {
    try {
        const network = bitcoin.networks.bitcoin;

        const totalLpSumBtc = liquidityProviders.reduce((sum, lp) => sum + weiToSatoshi(lp.amount, lp.btcExchangeRate), 0);

        const lpOutputs = liquidityProviders.map((lp) => {
            return {
                value: weiToSatoshi(lp.amount, lp.btcExchangeRate),
                script: Buffer.from(normalizeHexStr(lp.lockingScriptHex), 'hex'),
            };
        });

        if (vinSats - totalLpSumBtc - feeSats < 0) {
            throw new Error('Insufficient funds');
        }

        const inscription = {
            value: 0,
            script: Buffer.concat([Buffer.from('6a20', 'hex'), Buffer.from(normalizeHexStr(orderNonceHex), 'hex')]),
        };

        const psbt = new bitcoin.Psbt({ network });
        psbt.addInput({
            hash: normalizeHexStr(inTxidHex),
            index: inTxvout,
            sequence: 0xfffffffd,
            witnessUtxo: {
                script: bitcoin.payments.p2wpkh({
                    pubkey: Buffer.from(wallet.publicKey, 'hex'),
                    network,
                }).output!,
                value: vinSats,
            },
        });
        [...lpOutputs, inscription].forEach((output) => {
            psbt.addOutput(output);
        });
        psbt.signInput(0, {
            publicKey: Buffer.from(wallet.publicKey, 'hex'),
            sign: (hash: Buffer) => Buffer.from(wallet.hdKey.sign(hash)),
        });

        psbt.finalizeAllInputs();

        const tx = psbt.extractTransaction();
        const txid = tx.getId();
        const txHex = normalizeHexStr(tx.toBuffer().toString('hex'));
        return {
            txSerializedNoSegwit: reserializeNoSegwit(txHex),
            txid,
            txSerialized: txHex,
        };
    } catch (e) {
        console.error(e);
        throw e;
    }
}

async function estimateRiftPaymentTransactionFees(liquidityProviderCount: number, wallet: BitcoinWallet, mempoolApiHostname: string): Promise<RiftSwapFees> {
    let dummy_lp: LiquidityProvider = {
        amount: '1000',
        btcExchangeRate: '1',
        lockingScriptHex: '001463dff5f8da08ca226ba01f59722c62ad9b9b3eaa',
    };
    let liquidityProviders = Array.from({ length: liquidityProviderCount }, () => dummy_lp);
    let arbitrary_bytes_32_hex = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    let { txSerialized } = await buildRiftPaymentTransaction(
        arbitrary_bytes_32_hex,
        liquidityProviders,
        arbitrary_bytes_32_hex,
        0,
        wallet,
        liquidityProviders.reduce((sum, lp) => sum + weiToSatoshi(lp.amount, lp.btcExchangeRate), 0) + 1,
        0,
    );

    const txn = bitcoin.Transaction.fromHex(txSerialized);
    // standard byte size for nonsegwit, minimized byte weight applied for segwit
    let virtualSize = txn.virtualSize();

    let feeRateQuote = await getBtcFeeRates(mempoolApiHostname);
    console.log('alpine feeRateQuote', feeRateQuote);

    let amount = liquidityProviders.reduce((sum, lp) => sum + weiToSatoshi(lp.amount, lp.btcExchangeRate), 0);

    return {
        virtualSize,
        feeRateQuote,
        fastFeeAmount: feeRateQuote.fastestFee * virtualSize,
        standardFeeAmount: feeRateQuote.economyFee * virtualSize,
        fastTotalAmount: feeRateQuote.fastestFee * virtualSize + amount,
        standardTotalAmount: feeRateQuote.economyFee * virtualSize + amount,
    };
}

async function executeRiftSwapOnAvailableUTXO(swapData: CreateRiftSwapArgs, receiverMnemonic: string, mempoolApiHostname: string, internalSwapId: string): Promise<void> {
    const wallet = buildWalletFromMnemonic(receiverMnemonic);
    const { orderNonceHex, liquidityProviders } = swapData;
    const swappedBtc = liquidityProviders.reduce((sum, lp) => sum + weiToSatoshi(lp.amount, lp.btcExchangeRate), 0);
    // Wait for the UTXO to be available, max wait is the reservation duration
    for (let i = 0; i < MAX_RESERVATION_DURATION / UTXO_POLLING_INTERVAL; i++) {
        // show minutes remaining
        console.log(`Polling for UTXO, ${MAX_RESERVATION_DURATION / 60 - (i * UTXO_POLLING_INTERVAL) / 60} minutes remaining`);
        try {
            const utxos = await fetchAddressUTXOs(wallet.address, mempoolApiHostname);

            const utilizedUtxo = utxos.find((utxo) => utxo.value >= swappedBtc);
            if (utilizedUtxo) {
                console.log('Found available UTXO', utilizedUtxo);
                const allocatedFees = utilizedUtxo.value - swappedBtc;
                console.log('Available UTXO Bal', utilizedUtxo.value);
                console.log('Allocated fees in sats:', allocatedFees);
                console.log('Swapped BTC in sats:', swappedBtc);
                const vinSats = await fetchFundingTxAmount(utilizedUtxo.txid, utilizedUtxo.vout, mempoolApiHostname);
                const txDetails = await buildRiftPaymentTransaction(orderNonceHex, liquidityProviders, utilizedUtxo.txid, utilizedUtxo.vout, wallet, vinSats, allocatedFees);
                console.log('Built Rift Payment Transaction:', txDetails);
                await broadcastTransaction(txDetails.txSerialized, mempoolApiHostname);
                await storage.updateSwapStatus(internalSwapId, SwapStatus.PAYMENT_TRANSACTION_SENT, txDetails.txid);
                console.log('Transaction broadcasted successfully');
                return;
            }
        } catch (e) {
            console.error(e);
        }
        await new Promise((resolve) => setTimeout(resolve, UTXO_POLLING_INTERVAL * 1000));
    }
}
async function buildSweepTransaction(
    utxos: { txid: string; vout: number; value: number; signer_wallet: BitcoinWallet }[],
    outputAddress: string,
    satPerVbyte: number,
): Promise<{
    txSerializedNoSegwit: string;
    txid: string;
    txSerialized: string;
}> {
    try {
        const network = bitcoin.networks.bitcoin;
        const psbt = new bitcoin.Psbt({ network });

        // Add inputs
        utxos.forEach((utxo) => {
            psbt.addInput({
                hash: utxo.txid,
                index: utxo.vout,
                witnessUtxo: {
                    script: bitcoin.payments.p2wpkh({
                        pubkey: Buffer.from(utxo.signer_wallet.publicKey, 'hex'),
                        network,
                    }).output!,
                    value: utxo.value,
                },
            });
        });

        // Calculate total input amount
        const totalInputSats = utxos.reduce((sum, utxo) => sum + utxo.value, 0);

        // Estimate the transaction size and calculate the fee
        const estimatedVsize = psbt.extractTransaction(true).virtualSize();
        const feeSats = Math.ceil(estimatedVsize * satPerVbyte);

        // Add output (sweep to the output wallet)
        const outputAmount = totalInputSats - feeSats;
        if (outputAmount <= 0) {
            throw new Error('Insufficient funds to cover the fee');
        }
        psbt.addOutput({
            address: outputAddress,
            value: outputAmount,
        });

        // Sign inputs
        utxos.forEach((utxo, index) => {
            psbt.signInput(index, {
                publicKey: Buffer.from(utxo.signer_wallet.publicKey, 'hex'),
                sign: (hash: Buffer) => Buffer.from(utxo.signer_wallet.hdKey.sign(hash)),
            });
        });

        psbt.finalizeAllInputs();

        const tx = psbt.extractTransaction();
        const txid = tx.getId();
        const txHex = tx.toHex();

        return {
            txSerializedNoSegwit: reserializeNoSegwit(txHex),
            txid,
            txSerialized: txHex,
        };
    } catch (e) {
        console.error(e);
        throw e;
    }
}
export { buildRiftPaymentTransaction, weiToSatoshi, satsToWei, executeRiftSwapOnAvailableUTXO, estimateRiftPaymentTransactionFees, buildSweepTransaction };
