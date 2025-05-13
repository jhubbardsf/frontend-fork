import { BigNumber, BigNumberish, ethers, FixedNumber } from 'ethers';
import BigNumberJs from 'bignumber.js';
import { ReservationState } from '../types';
import { useStore } from '../store';
import * as bitcoin from 'bitcoinjs-lib';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import {
    BITCOIN_DECIMALS,
    DEVNET_BASE_CHAIN_ID,
    FRONTEND_RESERVATION_EXPIRATION_WINDOW_IN_SECONDS,
    MAINNET_BASE_CHAIN_ID,
    MAX_SWAP_LP_OUTPUTS,
    PROTOCOL_FEE,
    PROTOCOL_FEE_DENOMINATOR,
    SATS_PER_BTC,
} from './constants';
import { format } from 'path';
import swapReservationsAggregatorABI from '../abis/SwapReservationsAggregator.json';
import depositVaultAggregatorABI from '../abis/DepositVaultsAggregator.json';
import { arbitrumSepolia, arbitrum, Chain } from 'viem/chains';
import { DepositStatus } from '../hooks/contract/useDepositLiquidity';

// HELPER FUCTIONS
export function weiToEth(wei: BigNumber): BigNumberish {
    return ethers.utils.formatEther(wei);
}

export function ethToWei(eth: string): BigNumber {
    return ethers.utils.parseEther(eth);
}

export function satsToBtc(sats: BigNumber): string {
    const satsValue = BigNumber.from(sats);
    return formatUnits(satsValue, BITCOIN_DECIMALS);
}

export function btcToSats(btc: number): BigNumber {
    return parseUnits(btc.toString(), BITCOIN_DECIMALS);
}

export function bufferTo18Decimals(amount, tokenDecimals) {
    const bigAmount = BigNumber.from(amount);
    if (tokenDecimals < 18) {
        return bigAmount.mul(BigNumber.from(10).pow(18 - tokenDecimals));
    }
    return bigAmount;
}

export function unBufferFrom18Decimals(amount, tokenDecimals) {
    const bigAmount = BigNumber.from(amount);
    if (tokenDecimals < 18) {
        return bigAmount.div(BigNumber.from(10).pow(18 - tokenDecimals));
    }
    return bigAmount;
}

export function calculateBtcOutputAmountFromExchangeRate(
    depositAmountFromContract,
    depositAssetDecimals,
    exchangeRateFromContract,
) {
    // [0] buffer deposit amount to 18 decimals
    const depositAmountInSmallestTokenUnitsBufferedTo18Decimals = bufferTo18Decimals(
        depositAmountFromContract,
        depositAssetDecimals,
    );

    // [1] divide by exchange rate (which is already in smallest token units buffered to 18 decimals per sat)
    const outputAmountInSats = depositAmountInSmallestTokenUnitsBufferedTo18Decimals.div(exchangeRateFromContract);

    // [2] convert output amount from sats to btc
    const outputAmountInBtc = formatUnits(outputAmountInSats, BITCOIN_DECIMALS);

    return String(outputAmountInBtc);
}

export function formatBtcExchangeRate(exchangeRateInSmallestTokenUnitBufferedTo18DecimalsPerSat, depositAssetDecimals) {
    // [0] convert to smallest token amount per btc
    const exchangeRateInSmallestTokenUnitBufferedTo18DecimalsPerBtc = parseUnits(
        BigNumber.from(exchangeRateInSmallestTokenUnitBufferedTo18DecimalsPerSat).toString(),
        BITCOIN_DECIMALS,
    );

    // [1] unbuffer from 18 decimals
    const exchangeRateInSmallestTokenUnitPerBtc = unBufferFrom18Decimals(
        exchangeRateInSmallestTokenUnitBufferedTo18DecimalsPerBtc,
        depositAssetDecimals,
    );

    // [2] convert to btc per smallest token amount
    const exchangeRateInStandardUnitsPerBtc = formatUnits(exchangeRateInSmallestTokenUnitPerBtc, depositAssetDecimals);

    return exchangeRateInStandardUnitsPerBtc;
}

export function convertLockingScriptToBitcoinAddress(lockingScript: string): string {
    // Remove '0x' prefix if present
    const script = lockingScript.startsWith('0x') ? lockingScript.slice(2) : lockingScript;
    const scriptBuffer = Buffer.from(script, 'hex');

    try {
        // P2PKH
        if (
            scriptBuffer.length === 25 &&
            scriptBuffer[0] === bitcoin.opcodes.OP_DUP &&
            scriptBuffer[1] === bitcoin.opcodes.OP_HASH160 &&
            scriptBuffer[2] === 0x14 &&
            scriptBuffer[23] === bitcoin.opcodes.OP_EQUALVERIFY &&
            scriptBuffer[24] === bitcoin.opcodes.OP_CHECKSIG
        ) {
            const pubKeyHash = scriptBuffer.slice(3, 23);
            return bitcoin.address.toBase58Check(pubKeyHash, bitcoin.networks.bitcoin.pubKeyHash);
        }

        // P2SH
        if (
            scriptBuffer.length === 23 &&
            scriptBuffer[0] === bitcoin.opcodes.OP_HASH160 &&
            scriptBuffer[1] === 0x14 &&
            scriptBuffer[22] === bitcoin.opcodes.OP_EQUAL
        ) {
            const scriptHash = scriptBuffer.slice(2, 22);
            return bitcoin.address.toBase58Check(scriptHash, bitcoin.networks.bitcoin.scriptHash);
        }

        // P2WPKH
        if (scriptBuffer.length === 22 && scriptBuffer[0] === bitcoin.opcodes.OP_0 && scriptBuffer[1] === 0x14) {
            const witnessProgram = scriptBuffer.slice(2);
            return bitcoin.address.toBech32(witnessProgram, 0, bitcoin.networks.bitcoin.bech32);
        }

        // P2WSH
        if (scriptBuffer.length === 34 && scriptBuffer[0] === bitcoin.opcodes.OP_0 && scriptBuffer[1] === 0x20) {
            const witnessProgram = scriptBuffer.slice(2);
            return bitcoin.address.toBech32(witnessProgram, 0, bitcoin.networks.bitcoin.bech32);
        }

        // P2TR (Taproot)
        if (scriptBuffer.length === 34 && scriptBuffer[0] === bitcoin.opcodes.OP_1 && scriptBuffer[1] === 0x20) {
            const witnessProgram = scriptBuffer.slice(2);
            return bitcoin.address.toBech32(witnessProgram, 1, bitcoin.networks.bitcoin.bech32);
        }

        throw new Error('Unsupported locking script type');
    } catch (error) {
        console.error('Error converting locking script to address:', error);
        throw error;
    }
}

export function convertToBitcoinLockingScript(address: string): string {
    // TODO - validate and test all address types with alpine
    try {
        let script: Buffer;

        // Handle Bech32 addresses (including P2WPKH, P2WSH, and P2TR)
        if (address.toLowerCase().startsWith('bc1')) {
            const { data, version } = bitcoin.address.fromBech32(address);
            if (version === 0) {
                if (data.length === 20) {
                    // P2WPKH
                    script = bitcoin.script.compile([bitcoin.opcodes.OP_0, data]);
                } else if (data.length === 32) {
                    // P2WSH
                    script = bitcoin.script.compile([bitcoin.opcodes.OP_0, data]);
                }
            } else if (version === 1 && data.length === 32) {
                // P2TR (Taproot)
                script = bitcoin.script.compile([bitcoin.opcodes.OP_1, data]);
            }
        } else {
            // Handle legacy addresses (P2PKH and P2SH)
            const { version, hash } = bitcoin.address.fromBase58Check(address);

            // P2PKH
            if (version === bitcoin.networks.bitcoin.pubKeyHash) {
                script = bitcoin.script.compile([
                    bitcoin.opcodes.OP_DUP,
                    bitcoin.opcodes.OP_HASH160,
                    hash,
                    bitcoin.opcodes.OP_EQUALVERIFY,
                    bitcoin.opcodes.OP_CHECKSIG,
                ]);
            }

            // P2SH
            else if (version === bitcoin.networks.bitcoin.scriptHash) {
                script = bitcoin.script.compile([bitcoin.opcodes.OP_HASH160, hash, bitcoin.opcodes.OP_EQUAL]);
            }
        }

        if (!script) {
            throw new Error('Unsupported address type');
        }

        const padded = Buffer.alloc(25);
        // Copy script into padded. If script is shorter than 25 bytes, the rest remains zero.
        // If script is longer than 25 bytes, only the first 25 bytes are copied.
        // @ts-ignore
        script.copy(padded, 0, 0, Math.min(script.length, 25));
        return '0x' + padded.toString('hex');
    } catch (error) {
        console.error('Error converting address to locking script:', error);
        throw error;
    }
}

export const formatAmountToString = (selectedInputAsset, number) => {
    if (!number) return '';
    const roundedNumber = Number(number).toFixed(selectedInputAsset.decimals);
    return roundedNumber.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.$/, ''); // Remove trailing zeros and pointless decimal
};

export function createReservationUrl(orderNonce: string, reservationId: string): string {
    const combined = `${orderNonce}:${reservationId}`;
    return btoa(combined);
}

export function decodeReservationUrl(url: string): { orderNonce: string; reservationId: string } {
    const decoded = atob(url);
    const [orderNonce, reservationId] = decoded.split(':');

    return { orderNonce, reservationId };
}

// Helper function to format chain data for MetaMask
const formatChainForMetaMask = (chain: Chain) => {
    return {
        chainId: `0x${chain.id.toString(16)}`, // Convert the chain ID to hexadecimal
        chainName: chain.name,
        nativeCurrency: {
            name: chain.nativeCurrency.name,
            symbol: chain.nativeCurrency.symbol,
            decimals: chain.nativeCurrency.decimals,
        },
        rpcUrls: chain.rpcUrls.default.http,
        blockExplorerUrls: [chain.blockExplorers.default.url],
    };
};

// Function to add a new network using a chain object from viem/chains
export const addNetwork = async (chain: Chain) => {
    try {
        // Format the chain data
        const networkParams = formatChainForMetaMask(chain);

        // Prompt MetaMask to add the new network
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkParams],
        });

        console.log('Network added successfully');
    } catch (error) {
        console.error('Failed to add network:', error);
    }
};

export const validateP2WPKH = (address: string) => {
    try {
        const decoded = bitcoin.address.fromBech32(address);
        return decoded.version === 0 && address.length === 42;
    } catch (error) {
        return false;
    }
};

export const validateP2SH = (address: string) => {
    try {
        const decoded = bitcoin.address.fromBase58Check(address);
        return decoded.version === 0x05 && address.length === 34;
    } catch (error) {
        return false;
    }
};

export const validateP2PKH = (address: string) => {
    try {
        const decoded = bitcoin.address.fromBase58Check(address);
        return decoded.version === 0 && address.length === 34;
    } catch (error) {
        return false;
    }
};

/* 
Test cases:
1Q6hWEbKDqg2rTQeNYGJBQJkMTyYHSWsVi => pass
3ABE84ndJVq8DPikrHRaqn4GRgm65NRJEn => pass
bc1q30vayz8nnq9rzq2km3ag0zplatts6vhq4m6gqc => pass
bc1qzvgz7jp6aylxyy4q39gw3q0ydyd44xhyk35djf7xlkur37hzv73syy45f9 => fail
bc1pqurpm7u6tu69e2859nhhv4r473uqp4zgn90d9d2p7kf4tkjsj39qstkfyd => fail
*/

// the circuits accept P2WPKH, P2PKH, P2SH
export const validateBitcoinPayoutAddress = (address: string): boolean => {
    try {
        // attempt to decode the address
        // address type => prefix
        // p2wpkh => bc1
        // p2pkh => 1
        // p2sh => 3

        if (address.startsWith('bc1')) {
            return validateP2WPKH(address);
        } else if (address.startsWith('1')) {
            return validateP2PKH(address);
        } else if (address.startsWith('3')) {
            return validateP2SH(address);
        }

        return false; // address doesn't match any known prefix
    } catch (error) {
        // decoding failed, address is invalid
        return false;
    }
};

// Helper: compute effective chain id.
export const getEffectiveChainID = (selectedChainID: number): number =>
    selectedChainID === DEVNET_BASE_CHAIN_ID ? MAINNET_BASE_CHAIN_ID : selectedChainID;
