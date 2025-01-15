import { BigNumber, BigNumberish, ethers, FixedNumber } from 'ethers';
import BigNumberJs from 'bignumber.js';
import { DepositVault, ReservationState, SwapReservation } from '../types';
import { useStore } from '../store';
import * as bitcoin from 'bitcoinjs-lib';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { BITCOIN_DECIMALS, FRONTEND_RESERVATION_EXPIRATION_WINDOW_IN_SECONDS, MAX_SWAP_LP_OUTPUTS, PROTOCOL_FEE, PROTOCOL_FEE_DENOMINATOR, SATS_PER_BTC } from './constants';
import { format } from 'path';
import swapReservationsAggregatorABI from '../abis/SwapReservationsAggregator.json';
import { getDepositVaults, getSwapReservations } from '../utils/contractReadFunctions';
import depositVaultAggregatorABI from '../abis/DepositVaultsAggregator.json';
import { arbitrumSepolia, arbitrum, Chain } from 'viem/chains';

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

export function calculateBtcOutputAmountFromExchangeRate(depositAmountFromContract, depositAssetDecimals, exchangeRateFromContract) {
    // [0] buffer deposit amount to 18 decimals
    const depositAmountInSmallestTokenUnitsBufferedTo18Decimals = bufferTo18Decimals(depositAmountFromContract, depositAssetDecimals);

    // [1] divide by exchange rate (which is already in smallest token units buffered to 18 decimals per sat)
    const outputAmountInSats = depositAmountInSmallestTokenUnitsBufferedTo18Decimals.div(exchangeRateFromContract);

    // [2] convert output amount from sats to btc
    const outputAmountInBtc = formatUnits(outputAmountInSats, BITCOIN_DECIMALS);

    return String(outputAmountInBtc);
}

export function formatBtcExchangeRate(exchangeRateInSmallestTokenUnitBufferedTo18DecimalsPerSat, depositAssetDecimals) {
    // [0] convert to smallest token amount per btc
    const exchangeRateInSmallestTokenUnitBufferedTo18DecimalsPerBtc = parseUnits(BigNumber.from(exchangeRateInSmallestTokenUnitBufferedTo18DecimalsPerSat).toString(), BITCOIN_DECIMALS);

    // [1] unbuffer from 18 decimals
    const exchangeRateInSmallestTokenUnitPerBtc = unBufferFrom18Decimals(exchangeRateInSmallestTokenUnitBufferedTo18DecimalsPerBtc, depositAssetDecimals);

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
        if (scriptBuffer.length === 23 && scriptBuffer[0] === bitcoin.opcodes.OP_HASH160 && scriptBuffer[1] === 0x14 && scriptBuffer[22] === bitcoin.opcodes.OP_EQUAL) {
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
                script = bitcoin.script.compile([bitcoin.opcodes.OP_DUP, bitcoin.opcodes.OP_HASH160, hash, bitcoin.opcodes.OP_EQUALVERIFY, bitcoin.opcodes.OP_CHECKSIG]);
            }

            // P2SH
            else if (version === bitcoin.networks.bitcoin.scriptHash) {
                script = bitcoin.script.compile([bitcoin.opcodes.OP_HASH160, hash, bitcoin.opcodes.OP_EQUAL]);
            }
        }

        if (!script) {
            throw new Error('Unsupported address type');
        }

        return '0x' + script.toString('hex');
    } catch (error) {
        console.error('Error converting address to locking script:', error);
        throw error; // Re-throw the error for proper handling in the calling code
    }
}

export const formatAmountToString = (selectedInputAsset, number) => {
    if (!number) return '';
    const roundedNumber = Number(number).toFixed(selectedInputAsset.decimals);
    return roundedNumber.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.$/, ''); // Remove trailing zeros and pointless decimal
};

export function calculateFillPercentage(vault: DepositVault) {
    // return 20;
    const fillPercentageBigNumber = BigNumber.from(vault.initialBalance).sub(BigNumber.from(vault.unreservedBalanceFromContract)).div(BigNumber.from(vault.initialBalance)).mul(100);

    const fillPercentage = fillPercentageBigNumber.toNumber();
    return Math.min(Math.max(fillPercentage, 0), 100);
}

export function createReservationUrl(orderNonce: string, reservationId: string): string {
    const combined = `${orderNonce}:${reservationId}`;
    return btoa(combined);
}

export function decodeReservationUrl(url: string): { orderNonce: string; reservationId: string } {
    const decoded = atob(url);
    const [orderNonce, reservationId] = decoded.split(':');

    return { orderNonce, reservationId };
}

export const fetchReservationDetails = async (swapReservationURL: string, ethersRpcProvider: ethers.providers.Provider, selectedInputAsset: any) => {
    if (swapReservationURL) {
        try {
            // [0] Decode swap reservation details from URL
            const reservationDetails = decodeReservationUrl(swapReservationURL);

            console.log('URL reservationDetails:', reservationDetails);

            // [1] Fetch and decode swap reservation details from contract
            const swapAggregatorBytecode = swapReservationsAggregatorABI.bytecode;
            const swapAggregatorAbi = swapReservationsAggregatorABI.abi;
            const swapReservations = await getSwapReservations(ethersRpcProvider, swapAggregatorBytecode.object, swapAggregatorAbi, selectedInputAsset.riftExchangeContractAddress, [
                parseInt(reservationDetails.reservationId),
            ]);

            const swapReservationData: SwapReservation = swapReservations[0];

            // check if expired and update state
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const isExpired = currentTimestamp - swapReservationData.reservationTimestamp > FRONTEND_RESERVATION_EXPIRATION_WINDOW_IN_SECONDS;
            if (isExpired && swapReservationData.state === ReservationState.Created) {
                swapReservationData.state = ReservationState.Expired;
            }

            console.log('swapReservationData from URL:', swapReservationData);

            const totalInputAmountInSatsIncludingProxyWalletFee = swapReservationData.totalSatsInputInlcudingProxyFee;
            const totalReservedAmountInMicroUsdt = swapReservationData.totalSwapOutputAmount;

            // [2] Convert BigNumber reserved vault indexes to numbers
            const reservedVaultIndexesConverted = Array.isArray(swapReservationData.vaultIndexes) ? swapReservationData.vaultIndexes.map((index) => index) : [swapReservationData.vaultIndexes];

            // [3] Fetch the reserved deposit vaults on the reservation
            const depositVaultBytecode = depositVaultAggregatorABI.bytecode;
            const depositVaultAbi = depositVaultAggregatorABI.abi;
            const reservedVaults = await getDepositVaults(
                ethersRpcProvider,
                depositVaultBytecode.object,
                depositVaultAbi,
                selectedInputAsset.riftExchangeContractAddress,
                reservedVaultIndexesConverted,
            );

            const reservedAmounts = swapReservationData.amountsToReserve;
            console.log('reservedVaults:', reservedVaults);
            console.log('reservedAmounts:', reservedAmounts[0].toString());

            // Convert to USDT
            const totalReservedAmountInUsdt = formatUnits(totalReservedAmountInMicroUsdt, selectedInputAsset.decimals);

            const btcInputSwapAmount = formatUnits(totalInputAmountInSatsIncludingProxyWalletFee.toString(), BITCOIN_DECIMALS).toString();

            const totalSwapAmountInSats = totalInputAmountInSatsIncludingProxyWalletFee.toNumber();

            return {
                swapReservationData,
                totalReservedAmountInUsdt,
                totalReservedAmountInMicroUsdt,
                btcInputSwapAmount,
                totalSwapAmountInSats,
                reservedVaults,
                reservedAmounts,
            };
        } catch (error) {
            console.error('Error fetching reservation details:', error);
            throw error;
        }
    }
    throw new Error('swapReservationURL is required');
};

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
