import {
    Tabs,
    TabList,
    Tooltip,
    TabPanels,
    Tab,
    Button,
    Flex,
    Text,
    useColorModeValue,
    Box,
    Spacer,
    Input,
    Spinner,
    Skeleton,
} from '@chakra-ui/react';
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
    ethToWei,
    formatAmountToString,
    formatBtcExchangeRate,
    unBufferFrom18Decimals,
    weiToEth,
} from '../../utils/dappHelper';
import { ProxyWalletLiquidityProvider, ReservationState, ReserveLiquidityParams } from '../../types';
import {
    bitcoin_bg_color,
    bitcoin_dark_bg_color,
    BITCOIN_DECIMALS,
    MAX_SWAP_LP_OUTPUTS,
    opaqueBackgroundColor,
    PROTOCOL_FEE_DENOMINATOR,
    PROTOCOL_FEE,
    MIN_SWAP_AMOUNT_SATS,
    MAX_SWAP_AMOUNT_SATS,
} from '../../utils/constants';
import { AssetTag } from '../other/AssetTag';
import { useAccount } from 'wagmi';
import { useConnectModal } from '../../hooks/useReownConnect';
import WebAssetTag from '../other/WebAssetTag';
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
    const btcOutputAmount = useStore((state) => state.btcOutputAmount);
    const findAssetByName = useStore.getState().findAssetByName;
    const btcPriceUSD = findAssetByName('BTC')?.priceUSD || 0;
    const coinbasebtcPriceUSD = findAssetByName('CoinbaseBTC')?.priceUSD || 0;
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
    const { loading } = useContractData();
    const actualBorderColor = '#323232';
    const borderColor = `2px solid ${actualBorderColor}`;
    const coinbaseBtcDepositAmount = useStore((state) => state.coinbaseBtcDepositAmount);
    const setCoinbaseBtcDepositAmount = useStore((state) => state.setCoinbaseBtcDepositAmount);
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
    const areNewDepositsPaused = useStore((state) => state.areNewDepositsPaused);
    const [isLiquidityLoading, setIsLiquidityLoading] = useState(true);
    const coinbaseBtcOutputAmount = useStore((state) => state.coinbaseBtcOutputAmount);
    const setCoinbaseBtcOutputAmount = useStore((state) => state.setCoinbaseBtcOutputAmount);

    // // update token price and available liquidity
    // useEffect(() => {
    //     if (selectedInputAsset && validAssets[selectedInputAsset.name] && !usdtExchangeRatePerBTC) {
    //         const totalAvailableLiquidity = validAssets[selectedInputAsset.name]?.totalAvailableLiquidity;
    //         setAvailableLiquidity(totalAvailableLiquidity ?? BigNumber.from(0));
    //         setUsdtExchangeRatePerBTC(validAssets[selectedInputAsset.name].exchangeRateInTokenPerBTC);
    //     }
    // }, [selectedInputAsset, validAssets, btcInputSwapAmount, coinbaseBtcOutputAmount]);

    // loading dots effect
    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setDots((prev) => (prev === '...' ? '' : prev + '.'));
            }, 350);
            return () => clearInterval(interval);
        }
    }, [loading]);

    // ----------------- BITCOIN INPUT ----------------- //

    const handleBtcInputChange = (e, amount = null) => {
        const btcValue = amount !== null ? amount : e.target.value;
        setIsBelowMinUsdtOutput(false);
        setIsLiquidityExceeded(false);
        setIsAboveMaxSwapLimitUsdtOutput(false);
        setIsNoLiquidityAvailable(false);

        // if (allDepositVaults.length === 0) { // TODO: replace with if there are no MMs online
        //     setIsNoLiquidityAvailableBtcInput(true);
        //     setCoinbaseBtcDepositAmount('');
        //     setBtcInputSwapAmount(btcValue);
        //     setBtcOutputAmount(btcValue);
        //     setLowestFeeReservationParams(null);
        //     return;
        // } else {
        //     setIsNoLiquidityAvailableBtcInput(false);
        // }

        if (parseFloat(btcValue) === 0 || !btcValue) {
            setUsdtExchangeRatePerBTC(null);
        }
        if (validateBtcInput(btcValue)) {
            setBtcInputSwapAmount(btcValue);
            setBtcOutputAmount(btcValue);
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
            // if (allDepositVaults.length === 0) { // TODO: replace with if there are no MMs online
            //     setIsNoLiquidityAvailable(true);
            //     setBtcInputSwapAmount('');
            //     setBtcOutputAmount('');
            //     setCoinbaseBtcDepositAmount('');
            //     setLowestFeeReservationParams(null);
            //     return;
            // }
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
                                color={
                                    loading
                                        ? colors.offerWhite
                                        : !btcInputSwapAmount
                                          ? colors.offWhite
                                          : colors.textGray
                                }
                                fontSize={'14px'}
                                letterSpacing={'-1px'}
                                fontWeight={'normal'}
                                fontFamily={'Aux'}>
                                {loading ? `Loading contract data${dots}` : 'You Send'}
                            </Text>
                            {loading && !isMobile ? (
                                <Skeleton
                                    height='62px'
                                    pt='40px'
                                    mt='5px'
                                    mb='0.5px'
                                    w='200px'
                                    borderRadius='5px'
                                    startColor={'#795436'}
                                    endColor={'#6C4525'}
                                />
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
                                    color={
                                        overpayingBtcInput ||
                                        isBelowMinBtcInput ||
                                        isAboveMaxSwapLimitBtcInput ||
                                        isNoLiquidityAvailableBtcInput
                                            ? colors.red
                                            : colors.offWhite
                                    }
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
                                            overpayingBtcInput ||
                                            isBelowMinBtcInput ||
                                            isAboveMaxSwapLimitBtcInput ||
                                            isNoLiquidityAvailableBtcInput
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
                                                  : btcPriceUSD
                                                    ? btcInputSwapAmount
                                                        ? (btcPriceUSD * parseFloat(btcInputSwapAmount)).toLocaleString(
                                                              'en-US',
                                                              {
                                                                  style: 'currency',
                                                                  currency: 'USD',
                                                              },
                                                          )
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
                                        onClick={() => handleUsdtOutputChange(null, MAX_SWAP_AMOUNT_SATS.toString())}
                                        _hover={{ textDecoration: 'underline' }}
                                        letterSpacing={'-1.5px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {`${MAX_SWAP_AMOUNT_SATS} USDT Max`}
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
                                        onClick={() =>
                                            handleUsdtOutputChange(
                                                null,
                                                formatUnits(availableLiquidity, selectedInputAsset.decimals).toString(),
                                            )
                                        }
                                        _hover={{ textDecoration: 'underline' }}
                                        letterSpacing={'-1.5px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {`${parseFloat(maxBtcInputExceeded).toFixed(8)} BTC Max`}{' '}
                                        {/* Max available BTC */}
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
                                        onClick={() => handleUsdtOutputChange(null, `${MIN_SWAP_AMOUNT_SATS}`)}
                                        _hover={{ textDecoration: 'underline' }}
                                        letterSpacing={'-1.5px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {`${parseFloat(minBtcInputAmount).toFixed(8)} BTC Min`}{' '}
                                        {/* Min 1 USDT output worth of sats input */}
                                    </Text>
                                )}
                            </Flex>
                        </Flex>
                        <Spacer />
                        <Flex mr='6px'>
                            <WebAssetTag
                                asset='BTC'
                                cursor='pointer'
                                onDropDown={() => setCurrencyModalTitle('send')}
                            />
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
                    <Flex
                        mt='5px'
                        px='10px'
                        bg={selectedInputAsset.dark_bg_color}
                        w='100%'
                        h='117px'
                        border='2px solid'
                        borderColor={selectedInputAsset.bg_color}
                        borderRadius={'10px'}>
                        <Flex direction={'column'} py='10px' px='5px'>
                            <Text
                                color={
                                    loading
                                        ? colors.offerWhite
                                        : !coinbaseBtcOutputAmount
                                          ? colors.offWhite
                                          : colors.textGray
                                }
                                fontSize={'14px'}
                                letterSpacing={'-1px'}
                                fontWeight={'normal'}
                                fontFamily={'Aux'}
                                userSelect='none'>
                                {loading ? `Loading contract data${dots}` : 'You Receive'}
                            </Text>
                            {loading && !isMobile ? (
                                <Skeleton
                                    height='62px'
                                    pt='40px'
                                    mt='5px'
                                    mb='0.5px'
                                    w='200px'
                                    borderRadius='5px'
                                    startColor={'#255283'}
                                    endColor={'#255283'}
                                />
                            ) : (
                                <Input
                                    value={coinbaseBtcOutputAmount}
                                    onChange={handleUsdtOutputChange}
                                    fontFamily={'Aux'}
                                    border='none'
                                    mt='6px'
                                    mr='-150px'
                                    ml='-5px'
                                    p='0px'
                                    letterSpacing={'-6px'}
                                    color={
                                        isLiquidityExceeded ||
                                        isBelowMinUsdtOutput ||
                                        isAboveMaxSwapLimitUsdtOutput ||
                                        isNoLiquidityAvailable
                                            ? colors.red
                                            : colors.offWhite
                                    }
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
                                            isLiquidityExceeded ||
                                            isBelowMinUsdtOutput ||
                                            isNoLiquidityAvailable ||
                                            isAboveMaxSwapLimitUsdtOutput ||
                                            isNoLiquidityAvailable
                                                ? colors.redHover
                                                : !coinbaseBtcOutputAmount
                                                  ? colors.offWhite
                                                  : colors.textGray
                                        }
                                        fontSize={'14px'}
                                        mt='6px'
                                        ml='1px'
                                        mr={
                                            isLiquidityExceeded ||
                                            isBelowMinUsdtOutput ||
                                            isNoLiquidityAvailable ||
                                            isNoLiquidityAvailable ||
                                            isAboveMaxSwapLimitUsdtOutput
                                                ? '8px'
                                                : '0px'
                                        }
                                        letterSpacing={'-1px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {isNoLiquidityAvailable
                                            ? `No USDT liquidity available -`
                                            : isLiquidityExceeded
                                              ? `Exceeds available liquidity -`
                                              : isBelowMinUsdtOutput
                                                ? `Minimum ${MIN_SWAP_AMOUNT_SATS} SATS required -`
                                                : isAboveMaxSwapLimitUsdtOutput
                                                  ? `Exceeds maximum swap limit -`
                                                  : usdtPriceUSD
                                                    ? coinbaseBtcOutputAmount
                                                        ? (
                                                              usdtPriceUSD * parseFloat(coinbaseBtcOutputAmount)
                                                          ).toLocaleString('en-US', {
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
                                        onClick={() =>
                                            handleUsdtOutputChange(
                                                null,
                                                formatUnits(availableLiquidity, selectedInputAsset.decimals).toString(),
                                            )
                                        }
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
                                        onClick={() => handleUsdtOutputChange(null, `${MIN_SWAP_AMOUNT_SATS}`)}
                                        _hover={{ textDecoration: 'underline' }}
                                        letterSpacing={'-1.5px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {`${MIN_SWAP_AMOUNT_SATS} ${selectedInputAsset.name} Min`}
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
                                        onClick={() => handleUsdtOutputChange(null, MIN_SWAP_AMOUNT_SATS.toString())}
                                        _hover={{ textDecoration: 'underline' }}
                                        letterSpacing={'-1.5px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        {`${MIN_SWAP_AMOUNT_SATS} USDT Max`}
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
                                            setCoinbaseBtcOutputAmount('');
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
                                asset='USDC'
                                cursor='pointer'
                                onDropDown={() => {
                                    setCurrencyModalTitle('recieve');
                                }}
                            />
                        </Flex>
                    </Flex>
                </Flex>
                {/* Rate/Liquidity Details */}
                <Flex mt='12px'>
                    <Text
                        color={colors.textGray}
                        fontSize={'14px'}
                        ml='3px'
                        letterSpacing={'-1.5px'}
                        fontWeight={'normal'}
                        fontFamily={'Aux'}>
                        1 BTC ≈{' '}
                        {usdtExchangeRatePerBTC
                            ? usdtExchangeRatePerBTC.toLocaleString('en-US', {
                                  maximumFractionDigits: 4,
                              })
                            : 'N/A'}{' '}
                        {selectedInputAsset.display_name}{' '}
                        {/* TODO: implemnt above where its based on the selected asset */}
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
                    <Flex
                        color={colors.textGray}
                        fontSize={'13px'}
                        mr='3px'
                        letterSpacing={'-1.5px'}
                        fontWeight={'normal'}
                        fontFamily={'Aux'}>
                        <Tooltip
                            fontFamily={'Aux'}
                            letterSpacing={'-0.5px'}
                            color={colors.offWhite}
                            bg={'#121212'}
                            fontSize={'12px'}
                            label='Exchange rate includes the hypernode, protocol, and reservation fees. There are no additional or hidden fees.'
                            aria-label='A tooltip'>
                            <Flex pr='3px' mt='-2px' cursor={'pointer'} userSelect={'none'}>
                                <Text
                                    color={colors.textGray}
                                    fontSize={'14px'}
                                    mr='8px'
                                    mt='1px'
                                    letterSpacing={'-1.5px'}
                                    fontWeight={'normal'}
                                    fontFamily={'Aux'}>
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
                    bg={
                        coinbaseBtcOutputAmount && btcInputSwapAmount
                            ? colors.purpleBackground
                            : colors.purpleBackgroundDisabled
                    }
                    _hover={{ bg: colors.purpleHover }}
                    w='100%'
                    mt='15px'
                    transition={'0.2s'}
                    h='48px'
                    onClick={
                        areNewDepositsPaused
                            ? null
                            : isMobile
                              ? () =>
                                    toastInfo({
                                        title: 'Hop on your laptop',
                                        description: 'This app is too cool for small screens, mobile coming soon!',
                                    })
                              : coinbaseBtcOutputAmount && btcInputSwapAmount
                                ? () => setSwapFlowState('1-reserve-liquidity')
                                : null
                    }
                    fontSize={'16px'}
                    align={'center'}
                    userSelect={'none'}
                    cursor={'pointer'}
                    borderRadius={'10px'}
                    justify={'center'}
                    border={coinbaseBtcOutputAmount && btcInputSwapAmount ? '3px solid #445BCB' : '3px solid #3242a8'}>
                    <Text
                        color={
                            coinbaseBtcOutputAmount && btcInputSwapAmount && !areNewDepositsPaused
                                ? colors.offWhite
                                : colors.darkerGray
                        }
                        fontFamily='Nostromo'>
                        {areNewDepositsPaused ? 'NEW SWAPS ARE DISABLED FOR TESTING' : 'Exchange'}
                    </Text>
                </Flex>
            </Flex>
        </Flex>
    );
};
