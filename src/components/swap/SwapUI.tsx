import { Tabs, TabList, Tooltip, TabPanels, Tab, Button, Flex, Text, useColorModeValue, Box, Spacer, Input, Spinner, Skeleton } from '@chakra-ui/react';
import useWindowSize from '../../hooks/useWindowSize';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { colors } from '../../utils/colors';
import { useStore } from '../../store';
import { ARBITRUM_LOGO, BTCSVG, ETHSVG, InfoSVG } from '../other/SVGs';
import { BigNumber } from 'ethers';
import { formatUnits, parseEther, parseUnits } from 'ethers/lib/utils';
import {
    btcToSats,
    bufferTo18Decimals,
    calculateBestVaultsForBitcoinInput,
    calculateBestVaultsForUsdtOutput,
    calculateProtocolFeeInMicroUsdt,
    ethToWei,
    formatAmountToString,
    formatBtcExchangeRate,
    unBufferFrom18Decimals,
    weiToEth,
} from '../../utils/dappHelper';
import { ProxyWalletLiquidityProvider, ReservationState, ReserveLiquidityParams, SwapReservation } from '../../types';
import {
    bitcoin_bg_color,
    bitcoin_dark_bg_color,
    BITCOIN_DECIMALS,
    MAX_SWAP_LP_OUTPUTS,
    opaqueBackgroundColor,
    PROTOCOL_FEE_DENOMINATOR,
    PROTOCOL_FEE,
    MAX_SWAP_AMOUNT_MICRO_USDT,
    MAX_SWAP_AMOUNT_USDT,
    MIN_SWAP_AMOUNT_USDT,
    MIN_SWAP_AMOUNT_MICRO_USDT,
} from '../../utils/constants';
import { AssetTag } from '../other/AssetTag';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import WebAssetTag from '../other/WebAssetTag';
import { getSwapReservations } from '../../utils/contractReadFunctions';
import { useContractData } from '../providers/ContractDataProvider';
import { parse } from 'path';
import { toastError, toastInfo, toastLoad, toastSuccess } from '../../hooks/toast';
import { getRiftSwapFees } from '../../utils/btcFeeCalc';

export const SwapUI = () => {
    const { isMobile } = useWindowSize();
    const router = useRouter();
    const fontSize = isMobile ? '20px' : '20px';
    const btcInputSwapAmount = useStore((state) => state.btcInputSwapAmount);
    const setBtcInputSwapAmount = useStore((state) => state.setBtcInputSwapAmount);
    const usdtOutputSwapAmount = useStore((state) => state.usdtOutputSwapAmount);
    const setUsdtOutputSwapAmount = useStore((state) => state.setUsdtOutputSwapAmount);
    const allDepositVaults = useStore((state) => state.allDepositVaults);
    const bitcoinPriceUSD = useStore((state) => state.bitcoinPriceUSD);
    const lowestFeeReservationParams = useStore((state) => state.lowestFeeReservationParams);
    const setLowestFeeReservationParams = useStore((state) => state.setLowestFeeReservationParams);
    const userEthAddress = useStore((state) => state.userEthAddress);
    const [isLiquidityExceeded, setIsLiquidityExceeded] = useState(false);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const usdtPriceUSD = useStore.getState().validAssets[selectedInputAsset.name].priceUSD;
    const [availableLiquidity, setAvailableLiquidity] = useState(BigNumber.from(0));
    const [maxBtcInputExceeded, setMaxBtcInputExceeded] = useState('');
    const [availableLiquidityInUSDT, setAvailableLiquidityInUSDT] = useState('');
    const [usdtExchangeRatePerBTC, setUsdtExchangeRatePerBTC] = useState(0);
    const depositMode = useStore((state) => state.depositMode);
    const setDepositMode = useStore((state) => state.setDepositMode);
    const { address, isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();
    const setSwapFlowState = useStore((state) => state.setSwapFlowState);
    const depositFlowState = useStore((state) => state.depositFlowState);
    const setDepositFlowState = useStore((state) => state.setDepositFlowState);
    const [isWaitingForConnection, setIsWaitingForConnection] = useState(false);
    const setCurrencyModalTitle = useStore((state) => state.setCurrencyModalTitle);
    const [overpayingBtcInput, setOverpayingBtcInput] = useState(false);
    const [isBelowMinUsdtOutput, setIsBelowMinUsdtOutput] = useState(false);
    const [isBelowMinBtcInput, setIsBelowMinBtcInput] = useState(false);
    const [minBtcInputAmount, setMinBtcInputAmount] = useState('');
    const { refreshAllDepositData, loading } = useContractData();
    const actualBorderColor = '#323232';
    const borderColor = `2px solid ${actualBorderColor}`;
    const setUsdtDepositAmount = useStore((state) => state.setUsdtDepositAmount);
    const setBtcOutputAmount = useStore((state) => state.setBtcOutputAmount);
    const validAssets = useStore((state) => state.validAssets);
    const [proxyWalletSwapFastFee, setProxyWalletSwapFastFee] = useState(0);
    const protocolFeeAmountMicroUsdt = useStore((state) => state.protocolFeeAmountMicroUsdt);
    const setProtocolFeeAmountMicroUsdt = useStore((state) => state.setProtocolFeeAmountMicroUsdt);
    const [dots, setDots] = useState('');
    const [isNoLiquidityAvailable, setIsNoLiquidityAvailable] = useState(false);
    const [isNoLiquidityAvailableBtcInput, setIsNoLiquidityAvailableBtcInput] = useState(false);
    const [isAboveMaxSwapLimitBtcInput, setIsAboveMaxSwapLimitBtcInput] = useState(false);
    const [isAboveMaxSwapLimitUsdtOutput, setIsAboveMaxSwapLimitUsdtOutput] = useState(false);
    const [fastestProxyWalletFeeInSats, setFastestProxyWalletFeeInSats] = useState(500);
    const areNewSwapsPaused = useStore((state) => state.areNewSwapsPaused);
    const currentlyExpiredReservationIndexes = useStore((state) => state.currentlyExpiredReservationIndexes);
    const [isLiquidityLoading, setIsLiquidityLoading] = useState(true);

    // monitor bitcoin price changes
    useEffect(() => {
        console.log('tristanBitcoin price changed:', bitcoinPriceUSD);
    }, [bitcoinPriceUSD]);

    // update token price and available liquidity
    useEffect(() => {
        if (selectedInputAsset && validAssets[selectedInputAsset.name] && !usdtExchangeRatePerBTC) {
            const totalAvailableLiquidity = validAssets[selectedInputAsset.name]?.totalAvailableLiquidity;
            setAvailableLiquidity(totalAvailableLiquidity ?? BigNumber.from(0));
            setUsdtExchangeRatePerBTC(validAssets[selectedInputAsset.name].exchangeRateInTokenPerBTC);
        }
    }, [selectedInputAsset, validAssets, btcInputSwapAmount, usdtOutputSwapAmount]);

    // if usdtswapoutput exists, recalate it
    useEffect(() => {
        if (usdtOutputSwapAmount) {
            console.log('HELP:', usdtOutputSwapAmount);
            handleUsdtOutputChange(null, usdtOutputSwapAmount);
        }
    }, []);

    // loading dots effect
    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setDots((prev) => (prev === '...' ? '' : prev + '.'));
            }, 350);
            return () => clearInterval(interval);
        }
    }, [loading]);

    // set available liquidity
    useEffect(() => {
        if (selectedInputAsset && validAssets[selectedInputAsset.name]) {
            setIsLiquidityLoading(true);
            const totalAvailableLiquidity = validAssets[selectedInputAsset.name]?.totalAvailableLiquidity;
            const protocolFeeAmount = calculateProtocolFeeInMicroUsdt(totalAvailableLiquidity);
            const liquidityMinusFee = totalAvailableLiquidity.sub(protocolFeeAmount);
            setAvailableLiquidity(liquidityMinusFee);
            setAvailableLiquidityInUSDT(Number(formatUnits(liquidityMinusFee, selectedInputAsset.decimals)).toFixed(2).toString());
            setIsLiquidityLoading(false);
        }
    }, [selectedInputAsset, validAssets]);

    // function to continuously call refreshAllDepositData
    useEffect(() => {
        const continuouslyRefreshUserDepositData = () => {
            if (isConnected && address) {
                refreshAllDepositData();
            }
        };

        if (isConnected && address) {
            continuouslyRefreshUserDepositData();
            const intervalId = setInterval(continuouslyRefreshUserDepositData, 12000);
            return () => clearInterval(intervalId);
        }
    }, [isConnected, address]);

    const checkAmountBelowMinUsdtOutput = useCallback(
        (amount: string | null): boolean => {
            if (!amount || amount == '.') return false;

            const isBelowMin = Number(amount) < MIN_SWAP_AMOUNT_USDT;
            setIsBelowMinUsdtOutput(isBelowMin);
            return isBelowMin;
        },
        [selectedInputAsset.decimals],
    );

    useEffect(() => {
        const continuouslyCalculateProxyWalletFee = () => {
            getRiftSwapFees(lowestFeeReservationParams?.vaultIndexesToReserve.length ?? 1).then((fees) => {
                setFastestProxyWalletFeeInSats(fees?.fastFeeAmount !== undefined ? fees.fastFeeAmount : 550);
            });
        };

        continuouslyCalculateProxyWalletFee();
        const intervalId = setInterval(continuouslyCalculateProxyWalletFee, 5000);
        return () => clearInterval(intervalId);
    }, [usdtOutputSwapAmount, btcInputSwapAmount]);

    // calculate ideal reservation for bitcoin input
    const calculateIdealReservationBitcoinInput = async (amountBtcSwapInput) => {
        // [0] ensure there is liquidity available
        setOverpayingBtcInput(false);
        setIsBelowMinBtcInput(false);

        if (allDepositVaults.length === 0 || availableLiquidity.lt(BigNumber.from(MIN_SWAP_AMOUNT_MICRO_USDT))) {
            setIsNoLiquidityAvailable(true);
        }

        // [0] ensure deposit vaults exist and swap input is valid (convert to sats)
        if (!amountBtcSwapInput || amountBtcSwapInput == '.' || allDepositVaults.length === 0) {
            setIsAboveMaxSwapLimitBtcInput(false);
            setUsdtOutputSwapAmount('');
            setUsdtDepositAmount('');
            setLowestFeeReservationParams(null);
            return;
        } else {
            setIsNoLiquidityAvailable(false);
        }
        const amountSatsSwapInput = parseUnits(amountBtcSwapInput, BITCOIN_DECIMALS);

        // [1] calculate INITIAL best vault combo given input value
        let idealReservationDetails = calculateBestVaultsForBitcoinInput(allDepositVaults, amountSatsSwapInput);
        console.log(' INITIAL idealReservationDetails:', idealReservationDetails);

        // [2] ensure there is a valid initial reservation output
        if (!idealReservationDetails?.totalMicroUsdtSwapOutput) {
            setUsdtOutputSwapAmount('');
            setUsdtDepositAmount('');
            setLowestFeeReservationParams(null);
            return;
        }

        // [3] calculate the proxy wallet fee using number of LP outputs, then subtract fee from the "input"
        const proxyWalletSwapFeeInSats = fastestProxyWalletFeeInSats;
        const newAmountSatsSwapInput = amountSatsSwapInput.sub(BigNumber.from(proxyWalletSwapFeeInSats));

        console.log(' FIRST ROUND totalMicroUsdtSwapOutput', idealReservationDetails.totalMicroUsdtSwapOutput.toString());
        console.log(' typed sats input amount', amountSatsSwapInput.toString());
        console.log(' -proxy wallet fee in sats', proxyWalletSwapFeeInSats);
        console.log(' new amountSatsSwapInput:', newAmountSatsSwapInput.toString());

        // if new amount sats swap input is less than the typed amount + fees, set overpaying flag
        if (amountSatsSwapInput.sub(BigNumber.from(proxyWalletSwapFeeInSats)).gt(idealReservationDetails.totalSatsUsed)) {
            //  check if output is above max swap limit
            console.log(' ABOVE MAX SWAP LIMIT', idealReservationDetails?.totalMicroUsdtSwapOutput);
            if (idealReservationDetails.totalMicroUsdtSwapOutput.gt(BigNumber.from(MAX_SWAP_AMOUNT_MICRO_USDT))) {
                console.log(' ABOVE MAX SWAP LIMIT', idealReservationDetails?.totalMicroUsdtSwapOutput);
                setIsAboveMaxSwapLimitBtcInput(true);
                setUsdtOutputSwapAmount('');
                setUsdtDepositAmount('');
                setUsdtExchangeRatePerBTC(null);
                setLowestFeeReservationParams(null);
                return;
            }
            setOverpayingBtcInput(true);
            setMaxBtcInputExceeded(formatUnits(idealReservationDetails.totalSatsUsed.add(proxyWalletSwapFastFee), BITCOIN_DECIMALS).toString());
            setUsdtDepositAmount('');
            setUsdtOutputSwapAmount('');
            setUsdtExchangeRatePerBTC(null);
            setLowestFeeReservationParams(null);
            return;
        } else {
            setOverpayingBtcInput(false);
        }

        // check if sats to spend is less than 0 (meaning fees are too high)
        console.log('newAmountSatsSwapInput:', newAmountSatsSwapInput.toString());
        if (newAmountSatsSwapInput.lte(BigNumber.from(0))) {
            console.log('NEGATIVE SATS below min btc input');
            setIsBelowMinBtcInput(true);
            setUsdtOutputSwapAmount('');
            setUsdtDepositAmount('');
            setUsdtExchangeRatePerBTC(null);
            setLowestFeeReservationParams(null);
            return;
        }

        // [4] re-run vault combo calculation with new input amount
        const newIdealReservationDetails = calculateBestVaultsForBitcoinInput(allDepositVaults, newAmountSatsSwapInput);
        console.log(' NEW idealReservationDetails:', newIdealReservationDetails);
        console.log(' SECOND ROUND idealReservationDetails.totalMicroUsdtSwapOutput', newIdealReservationDetails.totalMicroUsdtSwapOutput.toString());
        console.log(' SECOND ROUND idealReservationDetails.protocolFeeInMicroUsdt', newIdealReservationDetails.protocolFeeInMicroUsdt.toString());
        console.log(' SECOND ROUND new totalMicroUsdtSwapOutput', newIdealReservationDetails.totalMicroUsdtSwapOutput.sub(newIdealReservationDetails.protocolFeeInMicroUsdt).toString());

        // check if output is above max swap limit
        if (newIdealReservationDetails.totalMicroUsdtSwapOutput.gt(BigNumber.from(MAX_SWAP_AMOUNT_MICRO_USDT))) {
            console.log('ABOVE MAX SWAP LIMIT', newIdealReservationDetails?.totalMicroUsdtSwapOutput);
            setIsAboveMaxSwapLimitBtcInput(true);
            setUsdtOutputSwapAmount('');
            setUsdtDepositAmount('');
            setUsdtExchangeRatePerBTC(null);
            setLowestFeeReservationParams(null);
            return;
        } else {
            setIsAboveMaxSwapLimitBtcInput(false);
        }

        // check if output - protocol fee is less than 1 usdt
        if (parseFloat(formatUnits(newIdealReservationDetails.totalMicroUsdtSwapOutput.sub(newIdealReservationDetails.protocolFeeInMicroUsdt), selectedInputAsset.decimals)) < MIN_SWAP_AMOUNT_USDT) {
            console.log(`BELOW MIN ${MIN_SWAP_AMOUNT_USDT} USDT OUTPUT`, newIdealReservationDetails?.totalMicroUsdtSwapOutput);
            setIsBelowMinBtcInput(true);
            setUsdtOutputSwapAmount('');
            setUsdtDepositAmount('');
            setUsdtExchangeRatePerBTC(null);
            setLowestFeeReservationParams(null);
            return;
        } else {
            setIsBelowMinBtcInput(false);
        }

        // set new exchange rate & usdt output based on new ideal reservation
        if (newIdealReservationDetails) {
            console.log('proc newIdealReservationDetails.protocolFeeInMicroUsdt:', newIdealReservationDetails.protocolFeeInMicroUsdt.toString());
            console.log('proc newIdealReservationDetails.totalMicroUsdtSwapOutput:', newIdealReservationDetails.totalMicroUsdtSwapOutput.toString());
            console.log(
                'proc newIdealReservationDetails.totalMicroUsdtSwapOutput.sub(newIdealReservationDetails.protocolFeeInMicroUsdt):',
                newIdealReservationDetails.totalMicroUsdtSwapOutput.sub(newIdealReservationDetails.protocolFeeInMicroUsdt).toString(),
            );

            setProtocolFeeAmountMicroUsdt(newIdealReservationDetails.protocolFeeInMicroUsdt.toString());
            setUsdtOutputSwapAmount(
                formatAmountToString(
                    selectedInputAsset,
                    formatUnits(newIdealReservationDetails?.totalMicroUsdtSwapOutput.sub(newIdealReservationDetails.protocolFeeInMicroUsdt) ?? BigNumber.from(0), selectedInputAsset.decimals),
                ),
            );
            setUsdtDepositAmount(
                formatAmountToString(
                    selectedInputAsset,
                    formatUnits(newIdealReservationDetails?.totalMicroUsdtSwapOutput.sub(newIdealReservationDetails.protocolFeeInMicroUsdt) ?? BigNumber.from(0), selectedInputAsset.decimals),
                ),
            );

            setUsdtExchangeRatePerBTC(parseFloat(parseFloat(formatBtcExchangeRate(newIdealReservationDetails?.effectiveExchangeRateForUser, selectedInputAsset.decimals)).toFixed(2)));
            const reserveLiquidityParams: ReserveLiquidityParams = {
                swapAmountInSats: BigNumber.from(newIdealReservationDetails?.totalSatsUsed).toNumber(),
                vaultIndexesToReserve: newIdealReservationDetails.vaultIndexes,
                amountsInMicroUsdtToReserve: newIdealReservationDetails.amountsInMicroUsdtToReserve,
                amountsInSatsToBePaid: newIdealReservationDetails.amountsInSatsToBePaid,
                btcPayoutLockingScripts: newIdealReservationDetails.btcPayoutLockingScripts,
                btcExchangeRates: newIdealReservationDetails.btcExchangeRates,
                ethPayoutAddress: '', // this is set when user inputs their eth payout address
                totalSatsInputInlcudingProxyFee: amountSatsSwapInput,
                expiredSwapReservationIndexes: currentlyExpiredReservationIndexes,
            };

            setLowestFeeReservationParams(reserveLiquidityParams);
        } else {
            setUsdtOutputSwapAmount('');
            setUsdtDepositAmount('');
            setUsdtExchangeRatePerBTC(null);
            setLowestFeeReservationParams(null);
        }
    };

    // calculate minimum sats input amount for minimum usdt output
    const calcuateMinimumReservationSatsInputAmount = () => {
        const minReservation = calculateBestVaultsForUsdtOutput(allDepositVaults, parseUnits(MIN_SWAP_AMOUNT_USDT.toString(), selectedInputAsset.decimals));
        if (!minReservation) return;
        const minProxyFee = fastestProxyWalletFeeInSats;
        if (!minProxyFee) return;
        const updatedMinReservationSatsInputAmount = minReservation.totalSatsUsed.add(BigNumber.from(minProxyFee));
        const minReservationBtcInputAmount = formatUnits(updatedMinReservationSatsInputAmount.add(BigNumber.from(1)), BITCOIN_DECIMALS).toString();
        setMinBtcInputAmount(minReservationBtcInputAmount);
        return minReservationBtcInputAmount;
    };
    // calculate ideal reservation for usdt output
    const calculateIdealReservationUsdtOutput = async (amountUsdtSwapOutput) => {
        // [0] ensure deposit vaults exist and swap input is valid (convert to sats)
        if (!amountUsdtSwapOutput || amountUsdtSwapOutput == '.' || allDepositVaults.length === 0) {
            setBtcInputSwapAmount('');
            setBtcOutputAmount('');
            setLowestFeeReservationParams(null);
            return;
        } else {
            setIsNoLiquidityAvailable(false);
            setIsAboveMaxSwapLimitBtcInput(false);
        }
        const amountMicroUsdtSwapOutput = parseUnits(amountUsdtSwapOutput, selectedInputAsset.decimals);

        // [1] calculate best vault combo given input value
        let idealReservationDetails = calculateBestVaultsForUsdtOutput(allDepositVaults, amountMicroUsdtSwapOutput);
        console.log('reallyidealReservationDetails:', idealReservationDetails);

        // // [2] ensure there is a valid initial reservation output
        if (!idealReservationDetails?.totalSatsUsed) {
            setBtcInputSwapAmount('');
            setBtcOutputAmount('');
            setLowestFeeReservationParams(null);
            return;
        }

        // [3] calculate the proxy wallet fee using number of LP outputs, then subtract fee from the "input"
        const proxyWalletSwapFeeInSats = fastestProxyWalletFeeInSats;
        const newAmountSatsSwapInput = idealReservationDetails.totalSatsUsed.add(BigNumber.from(proxyWalletSwapFeeInSats));
        console.log('og input amount in sats', idealReservationDetails.totalSatsUsed.toString());
        console.log('+ proxy wallet fee in sats', proxyWalletSwapFeeInSats);
        console.log('= new amountSatsSwapInput:', newAmountSatsSwapInput.toString());

        // set new exchange rate & usdt output based on new ideal reservation
        if (idealReservationDetails) {
            console.log('proc idealReservationDetails.protocolFeeInMicroUsdt:', idealReservationDetails.protocolFeeInMicroUsdt.toString());
            setProtocolFeeAmountMicroUsdt(idealReservationDetails.protocolFeeInMicroUsdt.toString());
            setBtcInputSwapAmount(formatUnits(newAmountSatsSwapInput, BITCOIN_DECIMALS).toString());
            setBtcOutputAmount(formatUnits(newAmountSatsSwapInput, BITCOIN_DECIMALS).toString());
            setUsdtExchangeRatePerBTC(parseFloat(parseFloat(formatBtcExchangeRate(idealReservationDetails?.effectiveExchangeRateForUser, selectedInputAsset.decimals)).toFixed(2)));
            const reserveLiquidityParams: ReserveLiquidityParams = {
                swapAmountInSats: BigNumber.from(idealReservationDetails?.totalSatsUsed).toNumber(),
                vaultIndexesToReserve: idealReservationDetails.vaultIndexes,
                amountsInMicroUsdtToReserve: idealReservationDetails.amountsInMicroUsdtToReserve,
                amountsInSatsToBePaid: idealReservationDetails.amountsInSatsToBePaid,
                btcPayoutLockingScripts: idealReservationDetails.btcPayoutLockingScripts,
                btcExchangeRates: idealReservationDetails.btcExchangeRates,
                ethPayoutAddress: '', // this is set when user inputs their eth payout address
                totalSatsInputInlcudingProxyFee: newAmountSatsSwapInput,
                expiredSwapReservationIndexes: currentlyExpiredReservationIndexes,
            };

            console.log('reserveLiquidityParams:', reserveLiquidityParams);
            console.log(' reserveLiquidityParamseffective exchange rate for user:', idealReservationDetails.effectiveExchangeRateForUser.toString());

            setLowestFeeReservationParams(reserveLiquidityParams);
            return reserveLiquidityParams;
        } else {
            setBtcInputSwapAmount('');
            setBtcOutputAmount('');
            setLowestFeeReservationParams(null);
        }
    };

    // ----------------- BITCOIN INPUT ----------------- //

    const handleBtcInputChange = (e, amount = null) => {
        const btcValue = amount !== null ? amount : e.target.value;
        setIsBelowMinUsdtOutput(false);
        setIsLiquidityExceeded(false);
        setIsAboveMaxSwapLimitUsdtOutput(false);
        setIsNoLiquidityAvailable(false);

        if (allDepositVaults.length === 0 || availableLiquidity.lt(BigNumber.from(MIN_SWAP_AMOUNT_MICRO_USDT))) {
            setIsNoLiquidityAvailableBtcInput(true);
            setUsdtOutputSwapAmount('');
            setUsdtDepositAmount('');
            setBtcInputSwapAmount(btcValue);
            setBtcOutputAmount(btcValue);
            setLowestFeeReservationParams(null);
            return;
        } else {
            setIsNoLiquidityAvailableBtcInput(false);
        }

        if (parseFloat(btcValue) === 0 || !btcValue) {
            setUsdtExchangeRatePerBTC(null);
        }
        if (validateBtcInput(btcValue)) {
            setBtcInputSwapAmount(btcValue);
            setBtcOutputAmount(btcValue);
            calculateIdealReservationBitcoinInput(btcValue);
            calcuateMinimumReservationSatsInputAmount();
        }
    };

    const validateBtcInput = (value) => {
        if (value === '') return true; // Allow empty input for backspacing
        if (value === '.') return false; // Prevent leading decimal point

        // match only digits and an optional decimal point with up to 8 digits after it
        const regex = /^\d*\.?\d{0,8}$/;
        if (!regex.test(value)) return null;

        // split by decimal point
        const parts = value.split('.');

        // ensure no more than one leading zero before the decimal point, but allow a single "0."
        if (parts[0].length > 1 && parts[0][0] === '0') {
            parts[0] = parts[0].replace(/^0+/, '') || '0'; // Strip leading zeros, but allow '0'
        }

        // limit to 8 digits after the decimal point
        if (parts.length > 1 && parts[1].length > BITCOIN_DECIMALS) {
            parts[1] = parts[1].slice(0, BITCOIN_DECIMALS);
        }

        // return the validated value, allowing a trailing decimal if needed
        return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0] + (value.endsWith('.') ? '.' : '');
    };

    // ----------------- USDT OUTPUT ----------------- //

    const handleUsdtOutputChange = async (e, amount = null) => {
        const usdtValue = amount !== null ? amount : e.target.value;
        setIsBelowMinBtcInput(false);
        setIsNoLiquidityAvailableBtcInput(false);
        setIsBelowMinUsdtOutput(false);
        setIsAboveMaxSwapLimitUsdtOutput(false);
        setIsNoLiquidityAvailable(false);

        if (parseFloat(usdtValue) === 0 || !usdtValue) {
            setUsdtExchangeRatePerBTC(null);
            setIsAboveMaxSwapLimitUsdtOutput(false);
        }

        if (validateUsdtOutputChange(usdtValue)) {
            // ensure there is liquidity available for minimum swap

            if (allDepositVaults.length === 0 || validAssets[selectedInputAsset.name]?.totalAvailableLiquidity.lt(BigNumber.from(MIN_SWAP_AMOUNT_MICRO_USDT))) {
                setIsNoLiquidityAvailable(true);
                setBtcInputSwapAmount('');
                setBtcOutputAmount('');
                setUsdtOutputSwapAmount(usdtValue);
                setUsdtDepositAmount(usdtValue);
                setLowestFeeReservationParams(null);
                return;
            }

            // check if output is above max swap limit
            if (parseFloat(usdtValue) > parseFloat(formatUnits(MAX_SWAP_AMOUNT_MICRO_USDT, selectedInputAsset.decimals))) {
                setIsAboveMaxSwapLimitUsdtOutput(true);
                setBtcInputSwapAmount('');
                setBtcOutputAmount('');
                setUsdtOutputSwapAmount(usdtValue);
                setUsdtDepositAmount(usdtValue);
                setLowestFeeReservationParams(null);
                return;
            } else {
                setIsAboveMaxSwapLimitUsdtOutput(false);
            }

            // ensure there is liquidity available for the swap output
            const amountBufferedTo6Decimals = Number(usdtValue).toFixed(selectedInputAsset.decimals);
            const microUsdtAmount = parseUnits(amountBufferedTo6Decimals, selectedInputAsset.decimals);
            const isExceeded = BigNumber.from(microUsdtAmount).gt(validAssets[selectedInputAsset.name]?.totalAvailableLiquidity);
            setIsLiquidityExceeded(isExceeded);

            if (isExceeded) {
                setBtcInputSwapAmount('');
                setBtcOutputAmount('');
                setLowestFeeReservationParams(null);
            }

            const isBelowMin = checkAmountBelowMinUsdtOutput(usdtValue);
            if (isBelowMin) {
                setIsBelowMinUsdtOutput(true);
                setBtcInputSwapAmount('');
                setBtcOutputAmount('');
                setLowestFeeReservationParams(null);
            } else {
                setIsBelowMinUsdtOutput(false);
            }

            setOverpayingBtcInput(false);

            setUsdtOutputSwapAmount(usdtValue);
            setUsdtDepositAmount(usdtValue);
            let reserveLiquidityParams = null;
            if (!isBelowMin) {
                reserveLiquidityParams = await calculateIdealReservationUsdtOutput(usdtValue);
            } else {
                setBtcInputSwapAmount('');
                setBtcOutputAmount('');
                setLowestFeeReservationParams(null);
            }
        }
    };

    const validateUsdtOutputChange = (value: string) => {
        const maxDecimals = selectedInputAsset.decimals;
        if (value === '.') return false;

        const regex = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`); // max 2 decimals
        return regex.test(value);
    };

    // INITIAL SWAP UI
    return (
        <Flex
            direction='column'
            align='center'
            py={isMobile ? '20px' : '27px'}
            w={isMobile ? '100%' : '630px'}
            borderRadius='20px'
            {...opaqueBackgroundColor}
            borderBottom={borderColor}
            borderLeft={borderColor}
            borderTop={borderColor}
            borderRight={borderColor}>
            <Flex w='90%' direction={'column'}>
                <Flex w='100%' flexDir='column' position='relative'>
                    {/* BTC Input */}
                    <Flex px='10px' bg='#2E1C0C' w='100%' h='117px' border='2px solid #78491F' borderRadius={'10px'}>
                        <Flex direction={'column'} py='10px' px='5px'>
                            <Text
                                color={loading ? colors.offerWhite : !btcInputSwapAmount ? colors.offWhite : colors.textGray}
                                fontSize={'14px'}
                                letterSpacing={'-1px'}
                                fontWeight={'normal'}
                                fontFamily={'Aux'}>
                                {loading ? `Loading contract data${dots}` : 'You Send'}
                            </Text>
                            {loading && !isMobile ? (
                                <Skeleton height='62px' pt='40px' mt='5px' mb='0.5px' w='200px' borderRadius='5px' startColor={'#795436'} endColor={'#6C4525'} />
                            ) : (
                                <Input
                                    value={btcInputSwapAmount}
                                    onChange={handleBtcInputChange}
                                    fontFamily={'Aux'}
                                    border='none'
                                    mt='6px'
                                    mr='-150px'
                                    ml='-5px'
                                    p='0px'
                                    letterSpacing={'-6px'}
                                    color={overpayingBtcInput || isBelowMinBtcInput || isAboveMaxSwapLimitBtcInput || isNoLiquidityAvailableBtcInput ? colors.red : colors.offWhite}
                                    _active={{ border: 'none', boxShadow: 'none' }}
                                    _focus={{ border: 'none', boxShadow: 'none' }}
                                    _selected={{ border: 'none', boxShadow: 'none' }}
                                    fontSize='46px'
                                    placeholder='0.0'
                                    _placeholder={{ color: '#805530' }}
                                />
                            )}
                            <Flex>
                                {!loading && (
                                    <Text
                                        color={
                                            overpayingBtcInput || isBelowMinBtcInput || isAboveMaxSwapLimitBtcInput || isNoLiquidityAvailableBtcInput
                                                ? colors.redHover
                                                : !btcInputSwapAmount
                                                ? colors.offWhite
                                                : colors.textGray
                                        }
                                        fontSize={'14px'}
                                        mt='6px'
                                        ml='1px'
                                        letterSpacing={'-1px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {isNoLiquidityAvailableBtcInput
                                            ? `No USDT liquidity available - `
                                            : overpayingBtcInput
                                            ? `Exceeds available liquidity - `
                                            : isBelowMinBtcInput
                                            ? `Below minimum required - `
                                            : isAboveMaxSwapLimitBtcInput
                                            ? `Exceeds maximum swap output - `
                                            : bitcoinPriceUSD
                                            ? btcInputSwapAmount
                                                ? (Number(bitcoinPriceUSD) * parseFloat(btcInputSwapAmount)).toLocaleString('en-US', {
                                                      style: 'currency',
                                                      currency: 'USD',
                                                  })
                                                : '$0.00'
                                            : '$0.00'}
                                    </Text>
                                )}
                                {/* USDT FEE ESTIMATE */}
                                {/* commented out for arbitrum launch */}
                                {/* {parseFloat(btcInputSwapAmount) != 0 &&
                                    btcInputSwapAmount &&
                                    !isAboveMaxSwapLimitBtcInput &&
                                    protocolFeeAmountMicroUsdt &&
                                    !overpayingBtcInput &&
                                    !isBelowMinBtcInput && (
                                        <Text
                                            ml='8px'
                                            fontSize={'13px'}
                                            mt='2px'
                                            mr='-116px'
                                            zIndex={'10'}
                                            color={colors.textGray}
                                            letterSpacing={'-1.5px'}
                                            fontWeight={'normal'}
                                            fontFamily={'Aux'}>
                                            {`+ $${parseFloat(formatUnits(protocolFeeAmountMicroUsdt, selectedInputAsset.decimals)).toFixed(2)} USDT`}
                                        </Text>
                                    )} */}
                                {isNoLiquidityAvailableBtcInput && (
                                    <Text
                                        fontSize={'13px'}
                                        mt='7px'
                                        ml='10px'
                                        mr='-116px'
                                        zIndex={'10'}
                                        color={selectedInputAsset.border_color_light}
                                        cursor='pointer'
                                        onClick={() => {
                                            setBtcInputSwapAmount('');
                                            setBtcOutputAmount('');
                                            setDepositMode(true);
                                        }}
                                        _hover={{ textDecoration: 'underline' }}
                                        letterSpacing={'-1.5px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        Provide Liquidity
                                    </Text>
                                )}
                                {isAboveMaxSwapLimitBtcInput && (
                                    <Text
                                        ml='8px'
                                        fontSize={'13px'}
                                        mt='7px'
                                        mr='-116px'
                                        zIndex={'10'}
                                        color={selectedInputAsset.border_color_light}
                                        cursor='pointer'
                                        onClick={() => handleUsdtOutputChange(null, MAX_SWAP_AMOUNT_USDT.toString())}
                                        _hover={{ textDecoration: 'underline' }}
                                        letterSpacing={'-1.5px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {`${MAX_SWAP_AMOUNT_USDT} USDT Max`}
                                    </Text>
                                )}
                                {overpayingBtcInput && (
                                    <Text
                                        ml='8px'
                                        fontSize={'13px'}
                                        mt='7px'
                                        mr='-116px'
                                        zIndex={'10'}
                                        color={selectedInputAsset.border_color_light}
                                        cursor='pointer'
                                        onClick={() => handleUsdtOutputChange(null, formatUnits(availableLiquidity, selectedInputAsset.decimals).toString())}
                                        _hover={{ textDecoration: 'underline' }}
                                        letterSpacing={'-1.5px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {`${parseFloat(maxBtcInputExceeded).toFixed(8)} BTC Max`} {/* Max available BTC */}
                                    </Text>
                                )}
                                {isBelowMinBtcInput && (
                                    <Text
                                        ml='8px'
                                        fontSize={'13px'}
                                        mt='7px'
                                        mr='-116px'
                                        zIndex={'10'}
                                        color={selectedInputAsset.border_color_light}
                                        cursor='pointer'
                                        onClick={() => handleUsdtOutputChange(null, `${MIN_SWAP_AMOUNT_USDT}`)}
                                        _hover={{ textDecoration: 'underline' }}
                                        letterSpacing={'-1.5px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {`${parseFloat(minBtcInputAmount).toFixed(8)} BTC Min`} {/* Min 1 USDT output worth of sats input */}
                                    </Text>
                                )}
                            </Flex>
                        </Flex>
                        <Spacer />
                        <Flex mr='6px'>
                            <WebAssetTag asset='BTC' cursor='pointer' onDropDown={() => setCurrencyModalTitle('send')} />
                        </Flex>
                    </Flex>

                    {/* Switch Button */}
                    <Flex
                        w='36px'
                        h='36px'
                        borderRadius={'20%'}
                        alignSelf={'center'}
                        align={'center'}
                        justify={'center'}
                        cursor={'pointer'}
                        _hover={{ bg: '#333' }}
                        onClick={() => setDepositMode(true)}
                        position={'absolute'}
                        bg='#161616'
                        border='2px solid #323232'
                        top='50%'
                        left='50%'
                        transform='translate(-50%, -50%)'>
                        <svg xmlns='http://www.w3.org/2000/svg' width='22px' height='22px' viewBox='0 0 20 20'>
                            <path
                                fill='#909090'
                                fillRule='evenodd'
                                d='M2.24 6.8a.75.75 0 0 0 1.06-.04l1.95-2.1v8.59a.75.75 0 0 0 1.5 0V4.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0L2.2 5.74a.75.75 0 0 0 .04 1.06m8 6.4a.75.75 0 0 0-.04 1.06l3.25 3.5a.75.75 0 0 0 1.1 0l3.25-3.5a.75.75 0 1 0-1.1-1.02l-1.95 2.1V6.75a.75.75 0 0 0-1.5 0v8.59l-1.95-2.1a.75.75 0 0 0-1.06-.04'
                                clipRule='evenodd'
                            />
                        </svg>
                    </Flex>

                    {/* USDT Output */}
                    <Flex mt='5px' px='10px' bg={selectedInputAsset.dark_bg_color} w='100%' h='117px' border='2px solid' borderColor={selectedInputAsset.bg_color} borderRadius={'10px'}>
                        <Flex direction={'column'} py='10px' px='5px'>
                            <Text
                                color={loading ? colors.offerWhite : !usdtOutputSwapAmount ? colors.offWhite : colors.textGray}
                                fontSize={'14px'}
                                letterSpacing={'-1px'}
                                fontWeight={'normal'}
                                fontFamily={'Aux'}
                                userSelect='none'>
                                {loading ? `Loading contract data${dots}` : 'You Receive'}
                            </Text>
                            {loading && !isMobile ? (
                                <Skeleton height='62px' pt='40px' mt='5px' mb='0.5px' w='200px' borderRadius='5px' startColor={'#2E5F50'} endColor={'#0F4534'} />
                            ) : (
                                <Input
                                    value={usdtOutputSwapAmount}
                                    onChange={handleUsdtOutputChange}
                                    fontFamily={'Aux'}
                                    border='none'
                                    mt='6px'
                                    mr='-150px'
                                    ml='-5px'
                                    p='0px'
                                    letterSpacing={'-6px'}
                                    color={isLiquidityExceeded || isBelowMinUsdtOutput || isAboveMaxSwapLimitUsdtOutput || isNoLiquidityAvailable ? colors.red : colors.offWhite}
                                    _active={{ border: 'none', boxShadow: 'none' }}
                                    _focus={{ border: 'none', boxShadow: 'none' }}
                                    _selected={{ border: 'none', boxShadow: 'none' }}
                                    fontSize='46px'
                                    placeholder='0.0'
                                    _placeholder={{ color: selectedInputAsset.light_text_color }}
                                />
                            )}
                            <Flex>
                                {!loading && (
                                    <Text
                                        color={
                                            isLiquidityExceeded || isBelowMinUsdtOutput || isNoLiquidityAvailable || isAboveMaxSwapLimitUsdtOutput || isNoLiquidityAvailable
                                                ? colors.redHover
                                                : !usdtOutputSwapAmount
                                                ? colors.offWhite
                                                : colors.textGray
                                        }
                                        fontSize={'14px'}
                                        mt='6px'
                                        ml='1px'
                                        mr={isLiquidityExceeded || isBelowMinUsdtOutput || isNoLiquidityAvailable || isNoLiquidityAvailable || isAboveMaxSwapLimitUsdtOutput ? '8px' : '0px'}
                                        letterSpacing={'-1px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {isNoLiquidityAvailable
                                            ? `No USDT liquidity available -`
                                            : isLiquidityExceeded
                                            ? `Exceeds available liquidity -`
                                            : isBelowMinUsdtOutput
                                            ? `Minimum ${MIN_SWAP_AMOUNT_USDT} USDT required -`
                                            : isAboveMaxSwapLimitUsdtOutput
                                            ? `Exceeds maximum swap limit -`
                                            : usdtPriceUSD
                                            ? usdtOutputSwapAmount
                                                ? (usdtPriceUSD * parseFloat(usdtOutputSwapAmount)).toLocaleString('en-US', {
                                                      style: 'currency',
                                                      currency: 'USD',
                                                  })
                                                : '$0.00'
                                            : '$0.00'}
                                    </Text>
                                )}

                                {isLiquidityExceeded && !isNoLiquidityAvailable && (
                                    <Text
                                        fontSize={'14px'}
                                        mt='7px'
                                        mr='-116px'
                                        zIndex={'10'}
                                        color={selectedInputAsset.border_color_light}
                                        cursor='pointer'
                                        onClick={() => handleUsdtOutputChange(null, formatUnits(availableLiquidity, selectedInputAsset.decimals).toString())}
                                        _hover={{ textDecoration: 'underline' }}
                                        letterSpacing={'-1.5px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {`${parseFloat(availableLiquidityInUSDT).toFixed(2)} ${selectedInputAsset.name} Max`}
                                    </Text>
                                )}

                                {isBelowMinUsdtOutput && !isNoLiquidityAvailable && (
                                    <Text
                                        fontSize={'14px'}
                                        mt='7px'
                                        mr='-116px'
                                        zIndex={'10'}
                                        color={selectedInputAsset.border_color_light}
                                        cursor='pointer'
                                        onClick={() => handleUsdtOutputChange(null, `${MIN_SWAP_AMOUNT_USDT}`)}
                                        _hover={{ textDecoration: 'underline' }}
                                        letterSpacing={'-1.5px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {`${MIN_SWAP_AMOUNT_USDT} ${selectedInputAsset.name} Min`}
                                    </Text>
                                )}

                                {isAboveMaxSwapLimitUsdtOutput && !isLiquidityExceeded && !isNoLiquidityAvailable && (
                                    <Text
                                        fontSize={'14px'}
                                        mt='7px'
                                        mr='-116px'
                                        zIndex={'10'}
                                        color={selectedInputAsset.border_color_light}
                                        cursor='pointer'
                                        onClick={() => handleUsdtOutputChange(null, MAX_SWAP_AMOUNT_USDT.toString())}
                                        _hover={{ textDecoration: 'underline' }}
                                        letterSpacing={'-1.5px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {`${MAX_SWAP_AMOUNT_USDT} USDT Max`}
                                    </Text>
                                )}

                                {isNoLiquidityAvailable && (
                                    <Text
                                        fontSize={'14px'}
                                        mt='7px'
                                        mr='-116px'
                                        zIndex={'10'}
                                        color={selectedInputAsset.border_color_light}
                                        cursor='pointer'
                                        onClick={() => {
                                            setBtcInputSwapAmount('');
                                            setBtcOutputAmount('');
                                            setUsdtOutputSwapAmount('');
                                            setUsdtDepositAmount('');
                                            setDepositMode(true);
                                        }}
                                        _hover={{ textDecoration: 'underline' }}
                                        letterSpacing={'-1.5px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        Provide Liquidity
                                    </Text>
                                )}
                            </Flex>
                        </Flex>
                        <Spacer />
                        <Flex mr='6px'>
                            <WebAssetTag
                                asset='USDT'
                                cursor='pointer'
                                onDropDown={() => {
                                    console.log('CALLING');
                                    setCurrencyModalTitle('recieve');
                                }}
                            />
                        </Flex>
                    </Flex>
                </Flex>
                {/* Rate/Liquidity Details */}
                <Flex mt='12px'>
                    <Text color={colors.textGray} fontSize={'14px'} ml='3px' letterSpacing={'-1.5px'} fontWeight={'normal'} fontFamily={'Aux'}>
                        1 BTC ≈{' '}
                        {usdtExchangeRatePerBTC
                            ? usdtExchangeRatePerBTC.toLocaleString('en-US', {
                                  maximumFractionDigits: 4,
                              })
                            : 'N/A'}{' '}
                        {selectedInputAsset.name} {/* TODO: implemnt above where its based on the selected asset */}
                        <Box
                            as='span'
                            color={colors.textGray}
                            _hover={{
                                cursor: 'pointer',
                                //open popup about fee info
                            }}
                            letterSpacing={'-1.5px'}
                            style={{
                                textDecoration: 'underline',
                                textUnderlineOffset: '6px',
                            }}></Box>
                    </Text>
                    <Spacer />
                    <Flex color={colors.textGray} fontSize={'13px'} mr='3px' letterSpacing={'-1.5px'} fontWeight={'normal'} fontFamily={'Aux'}>
                        <Tooltip
                            fontFamily={'Aux'}
                            letterSpacing={'-0.5px'}
                            color={colors.offWhite}
                            bg={'#121212'}
                            fontSize={'12px'}
                            label='Exchange rate includes the hypernode, protocol, and reservation fees. There are no additional or hidden fees.'
                            aria-label='A tooltip'>
                            <Flex pr='3px' mt='-2px' cursor={'pointer'} userSelect={'none'}>
                                <Text color={colors.textGray} fontSize={'14px'} mr='8px' mt='1px' letterSpacing={'-1.5px'} fontWeight={'normal'} fontFamily={'Aux'}>
                                    Includes Fees
                                </Text>
                                <Flex mt='0.5px'>
                                    <InfoSVG width='14px' />
                                </Flex>{' '}
                            </Flex>
                        </Tooltip>
                    </Flex>
                </Flex>
                {/* Exchange Button */}
                <Flex
                    bg={usdtOutputSwapAmount && btcInputSwapAmount ? colors.purpleBackground : colors.purpleBackgroundDisabled}
                    _hover={{ bg: colors.purpleHover }}
                    w='100%'
                    mt='15px'
                    transition={'0.2s'}
                    h='48px'
                    onClick={
                        areNewSwapsPaused
                            ? () => toastInfo({ title: 'New swaps paused', description: 'in preparation for our upcoming Base launch!' })
                            : isMobile
                            ? () => toastInfo({ title: 'Hop on your laptop', description: 'This app is too cool for small screens, mobile coming soon!' })
                            : usdtOutputSwapAmount && btcInputSwapAmount
                            ? () => setSwapFlowState('1-reserve-liquidity')
                            : null
                    }
                    fontSize={'16px'}
                    align={'center'}
                    userSelect={'none'}
                    cursor={'pointer'}
                    borderRadius={'10px'}
                    justify={'center'}
                    border={usdtOutputSwapAmount && btcInputSwapAmount ? '3px solid #445BCB' : '3px solid #3242a8'}>
                    <Text color={usdtOutputSwapAmount && btcInputSwapAmount && !areNewSwapsPaused ? colors.offWhite : colors.darkerGray} fontFamily='Nostromo'>
                        {areNewSwapsPaused ? 'NEW SWAPS DISABLED' : 'Exchange'}
                    </Text>
                </Flex>
            </Flex>
        </Flex>
    );
};
