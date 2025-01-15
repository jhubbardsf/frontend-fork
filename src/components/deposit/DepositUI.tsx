import { Tabs, TabList, Tooltip, TabPanels, Tab, Button, Flex, Text, useColorModeValue, Box, Spacer, Input, Skeleton } from '@chakra-ui/react';
import useWindowSize from '../../hooks/useWindowSize';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { colors } from '../../utils/colors';
import { useStore } from '../../store';
import { BTCSVG, ETHSVG, InfoSVG } from '../other/SVGs';
import { BigNumber } from 'ethers';
import { formatUnits, parseEther } from 'ethers/lib/utils';
import { btcToSats, ethToWei, formatAmountToString, satsToBtc, weiToEth } from '../../utils/dappHelper';
import { BITCOIN_DECIMALS, MAX_SWAP_AMOUNT_SATS, MAX_SWAP_LP_OUTPUTS, MIN_SWAP_AMOUNT_SATS, opaqueBackgroundColor } from '../../utils/constants';
import { AssetTag } from '../other/AssetTag';
import { useAccount } from 'wagmi';
import { connectorsForWallets, useConnectModal } from '@rainbow-me/rainbowkit';
import { DepositConfirmation } from './DepositConfirmation';
import WebAssetTag from '../other/WebAssetTag';
import { useContractData } from '../providers/ContractDataProvider';
import { toastInfo } from '../../hooks/toast';
import { DepositAmounts } from './DepositAmounts';
import { findOptimalSwapsUsdcInput, btcLimitOrders, usdcLimitOrders, OptimalSwapsResult } from '../../utils/LimitOrderPriceFunctions';

export const DepositUI = () => {
    const { isMobile } = useWindowSize();
    const router = useRouter();
    const fontSize = isMobile ? '20px' : '20px';
    const coinbaseBtcDepositAmount = useStore((state) => state.coinbaseBtcDepositAmount);
    const setCoinbaseBtcDepositAmount = useStore((state) => state.setCoinbaseBtcDepositAmount);
    const allDepositVaults = useStore((state) => state.allDepositVaults);
    const btcPriceUSD = useStore.getState().validAssets['BTC'].priceUSD;
    const userEthAddress = useStore((state) => state.userEthAddress);
    const [userBalanceExceeded, setUserBalanceExceeded] = useState(false);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const coinbaseBtcPriceUSD = useStore.getState().validAssets[selectedInputAsset.name]?.priceUSD;
    const [availableLiquidity, setAvailableLiquidity] = useState(BigNumber.from(0));
    const [coinbaseBtcExchangeRatePerBTC, setCoinbaseBtcExchangeRatePerBTC] = useState(0);
    const depositMode = useStore((state) => state.depositMode);
    const setDepositMode = useStore((state) => state.setDepositMode);
    const validAssets = useStore((state) => state.validAssets);
    const { address, isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();
    const depositFlowState = useStore((state) => state.depositFlowState);
    const setDepositFlowState = useStore((state) => state.setDepositFlowState);
    const setSwapFlowState = useStore((state) => state.setSwapFlowState);
    const setCurrencyModalTitle = useStore((state) => state.setCurrencyModalTitle);
    const [isWaitingForConnection, setIsWaitingForConnection] = useState(false);
    const actualBorderColor = '#323232';
    const borderColor = `2px solid ${actualBorderColor}`;
    const [userCoinbaseBtcBalance, setUserCoinbaseBtcBalance] = useState('0.00');
    const setBtcOutputAmount = useStore((state) => state.setBtcOutputAmount);
    const btcOutputAmount = useStore((state) => state.btcOutputAmount);
    const setBtcInputSwapAmount = useStore((state) => state.setBtcInputSwapAmount);
    const [isAwaitingConnection, setIsAwaitingConnection] = useState(false);
    const { refreshAllDepositData, refreshConnectedUserBalance, loading } = useContractData();
    const [isAboveMaxSwapLimitCoinbaseBtcDeposit, setIsAboveMaxSwapLimitCoinbaseBtcDeposit] = useState(false);
    const [isAboveMaxSwapLimitBtcOutput, setIsAboveMaxSwapLimitBtcOutput] = useState(false);
    const [isBelowMinCoinbaseBtcDeposit, setIsBelowMinCoinbaseBtcDeposit] = useState(false);
    const [isBelowMinBtcOutput, setIsBelowMinBtcOutput] = useState(false);
    const [minBtcOutputAmount, setMinBtcOutputAmount] = useState('0.00000001'); // Default to 1 sat
    const areNewDepositsPaused = useStore((state) => state.areNewDepositsPaused);
    const [dots, setDots] = useState('');

    // update token price and available liquidity
    useEffect(() => {
        if (selectedInputAsset && validAssets[selectedInputAsset.name]) {
            const totalAvailableLiquidity = validAssets[selectedInputAsset.name]?.totalAvailableLiquidity;
            setAvailableLiquidity(totalAvailableLiquidity ?? BigNumber.from(0));
            setCoinbaseBtcExchangeRatePerBTC(validAssets[selectedInputAsset.name].exchangeRateInTokenPerBTC);
            setUserCoinbaseBtcBalance(validAssets[selectedInputAsset.name].connectedUserBalanceFormatted);
        }
    }, [selectedInputAsset, validAssets]);

    // update min btc output amount
    useEffect(() => {
        if (coinbaseBtcExchangeRatePerBTC) {
            const minBtcAmount = 1 / coinbaseBtcExchangeRatePerBTC;
            setMinBtcOutputAmount(minBtcAmount.toFixed(8)); // Adjust precision as needed
        }
    }, [coinbaseBtcExchangeRatePerBTC]);

    useEffect(() => {
        setUserBalanceExceeded(false);
    }, []);

    // --------------- cbBTC INPUT ---------------
    const handleCoinbaseBtcInputChange = (e, amount = null) => {
        setIsAboveMaxSwapLimitBtcOutput(false);
        setIsBelowMinBtcOutput(false);
        setUserBalanceExceeded(false);

        const maxDecimals = useStore.getState().validAssets[selectedInputAsset.name]?.decimals;
        const coinbaseBtcValue = amount !== null ? amount : e.target.value;

        const validateCoinbaseBtcInputChange = (value: string) => {
            if (value === '') return true;
            const regex = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`);
            return regex.test(value);
        };

        if (validateCoinbaseBtcInputChange(coinbaseBtcValue)) {
            setIsAboveMaxSwapLimitCoinbaseBtcDeposit(false);
            setIsBelowMinCoinbaseBtcDeposit(false);

            // check if input is above max swap limit
            if (parseFloat(coinbaseBtcValue) > parseFloat(formatUnits(MAX_SWAP_AMOUNT_SATS, selectedInputAsset.decimals))) {
                setIsAboveMaxSwapLimitCoinbaseBtcDeposit(true);
                setCoinbaseBtcDepositAmount(coinbaseBtcValue);
                setBtcOutputAmount('');
                setBtcInputSwapAmount('');
                return;
            }

            // check if input is below min required amount
            if (parseFloat(coinbaseBtcValue) < 1) {
                setIsBelowMinCoinbaseBtcDeposit(true);
                setCoinbaseBtcDepositAmount(coinbaseBtcValue);
                setBtcOutputAmount('');
                setBtcInputSwapAmount('');
                return;
            }

            setCoinbaseBtcDepositAmount(coinbaseBtcValue);
            const optimalSwapsResult: OptimalSwapsResult = findOptimalSwapsUsdcInput(parseFloat(coinbaseBtcValue), btcLimitOrders);
            console.log('test optimal swaps result', optimalSwapsResult);
            setBtcOutputAmount(formatAmountToString(selectedInputAsset, optimalSwapsResult.totalOutputAmount));
            setBtcInputSwapAmount(formatAmountToString(selectedInputAsset, optimalSwapsResult.totalOutputAmount));

            // check if exceeds user balance
            if (isConnected) {
                checkLiquidityExceeded(coinbaseBtcValue);
            }
        }
    };

    const checkLiquidityExceeded = (amount: number) => {
        if (isConnected) setUserBalanceExceeded(amount > parseFloat(userCoinbaseBtcBalance));
    };

    // --------------- BTC OUTPUT ---------------
    const handleBtcOutputChange = (e) => {
        setIsAboveMaxSwapLimitCoinbaseBtcDeposit(false);
        const btcValue = validateBtcOutput(e.target.value);

        if (btcValue !== null) {
            setIsAboveMaxSwapLimitBtcOutput(false);
            setIsBelowMinBtcOutput(false);
            setIsBelowMinCoinbaseBtcDeposit(false);

            // calculate equivalent cbBTC deposit amount
            const coinbaseBtcInputValueLocal = btcValue && parseFloat(btcValue) > 0 ? parseFloat(btcValue) * useStore.getState().validAssets[selectedInputAsset.name].exchangeRateInTokenPerBTC : 0;

            // check if BTC output exceeds max swap limit
            if (coinbaseBtcInputValueLocal > parseFloat(formatUnits(MAX_SWAP_AMOUNT_SATS, selectedInputAsset.decimals))) {
                setIsAboveMaxSwapLimitBtcOutput(true);
                setBtcOutputAmount(btcValue);
                setCoinbaseBtcDepositAmount('');
                return;
            }

            // check if coinbaseBtc input is below min 1
            if (coinbaseBtcInputValueLocal && coinbaseBtcInputValueLocal < 1 && coinbaseBtcInputValueLocal !== 0) {
                setIsBelowMinBtcOutput(true);
                setBtcOutputAmount(btcValue);
                setCoinbaseBtcDepositAmount('');
                return;
            }

            setBtcOutputAmount(btcValue);
            setBtcInputSwapAmount(btcValue);
            let coinbaseBtcInputValue = btcValue && parseFloat(btcValue) > 0 ? parseFloat(btcValue) * useStore.getState().validAssets[selectedInputAsset.name].exchangeRateInTokenPerBTC : 0;
            setCoinbaseBtcDepositAmount(formatAmountToString(selectedInputAsset, coinbaseBtcInputValue));
            checkLiquidityExceeded(coinbaseBtcInputValue);
        }
    };

    const validateBtcOutput = (value) => {
        if (value === '') return '';
        const regex = /^\d*\.?\d*$/;
        if (!regex.test(value)) return null;
        const parts = value.split('.');
        if (parts.length > 1 && parts[1].length > BITCOIN_DECIMALS) {
            return parts[0] + '.' + parts[1].slice(0, BITCOIN_DECIMALS);
        }
        return value;
    };

    useEffect(() => {
        const handleConnection = async () => {
            if (isConnected && isAwaitingConnection) {
                setIsAwaitingConnection(false);

                console.log('validAssets[selectedInputAsset.name].connectedUserBalanceFormatted:', validAssets[selectedInputAsset.name].connectedUserBalanceFormatted);

                const userBalance = await refreshConnectedUserBalance();

                // fetch the latest balance after refreshing
                const latestUserCoinbaseBtcBalance = validAssets[selectedInputAsset.name].connectedUserBalanceFormatted;

                if (parseFloat(coinbaseBtcDepositAmount || '0') > parseFloat(latestUserCoinbaseBtcBalance || '0')) {
                    setUserBalanceExceeded(true);
                } else {
                    proceedWithDeposit();
                }
            }
        };

        handleConnection();
    }, [isConnected, isAwaitingConnection, refreshConnectedUserBalance, validAssets, selectedInputAsset, coinbaseBtcDepositAmount]);

    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setDots((prev) => (prev === '...' ? '' : prev + '.'));
            }, 350);
            return () => clearInterval(interval);
        }
    }, [loading]);

    const initiateDeposit = async () => {
        if (!isConnected) {
            setIsAwaitingConnection(true);

            openConnectModal();
            return;
        }

        proceedWithDeposit();
    };

    const proceedWithDeposit = async () => {
        setDepositFlowState('1-confirm-deposit');
    };

    // DEPOSIT INPUTS UI
    return (
        <>
            {depositFlowState === '1-confirm-deposit' && (
                <Flex mt='-50px' mb='30px'>
                    <DepositAmounts />
                </Flex>
            )}
            <Flex
                direction='column'
                align='center'
                py={isMobile ? '20px' : '27px'}
                w={isMobile ? '100%' : depositFlowState === '1-confirm-deposit' ? '800px' : '630px'}
                borderRadius='20px'
                {...opaqueBackgroundColor}
                borderBottom={borderColor}
                borderLeft={borderColor}
                borderTop={borderColor}
                borderRight={borderColor}>
                <Flex w='90%' direction={'column'}>
                    {depositFlowState === '1-confirm-deposit' ? (
                        <DepositConfirmation />
                    ) : (
                        <>
                            <Flex w='100%' flexDir='column' position='relative'>
                                {/* cbBTC Input */}
                                <Flex px='10px' bg={selectedInputAsset.dark_bg_color} w='100%' h='117px' border='2px solid' borderColor={selectedInputAsset.bg_color} borderRadius={'10px'}>
                                    <Flex direction={'column'} py='10px' px='5px'>
                                        <Text
                                            color={loading ? colors.offerWhite : !coinbaseBtcDepositAmount ? colors.offWhite : colors.textGray}
                                            fontSize={'14px'}
                                            letterSpacing={'-1px'}
                                            fontWeight={'normal'}
                                            fontFamily={'Aux'}
                                            userSelect='none'>
                                            {loading ? `Loading contract data${dots}` : 'You Send'}
                                        </Text>
                                        {loading && !isMobile ? (
                                            <Skeleton height='62px' pt='40px' mt='5px' mb='0.5px' w='200px' borderRadius='5px' startColor={'#255283'} endColor={'#255283'} />
                                        ) : (
                                            <Input
                                                value={coinbaseBtcDepositAmount}
                                                onChange={handleCoinbaseBtcInputChange}
                                                fontFamily={'Aux'}
                                                border='none'
                                                mt='6px'
                                                mr='-150px'
                                                ml='-5px'
                                                p='0px'
                                                letterSpacing={'-6px'}
                                                color={isAboveMaxSwapLimitCoinbaseBtcDeposit || isBelowMinCoinbaseBtcDeposit || userBalanceExceeded ? colors.red : colors.offWhite}
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
                                                        isAboveMaxSwapLimitCoinbaseBtcDeposit || isBelowMinCoinbaseBtcDeposit || userBalanceExceeded
                                                            ? colors.redHover
                                                            : !coinbaseBtcDepositAmount
                                                            ? colors.offWhite
                                                            : colors.textGray
                                                    }
                                                    fontSize={'14px'}
                                                    mt='6px'
                                                    ml='1px'
                                                    mr='8px'
                                                    letterSpacing={'-1px'}
                                                    fontWeight={'normal'}
                                                    fontFamily={'Aux'}>
                                                    {isAboveMaxSwapLimitCoinbaseBtcDeposit
                                                        ? `Exceeds maximum swap limit - `
                                                        : isBelowMinCoinbaseBtcDeposit
                                                        ? `Minimum ${MIN_SWAP_AMOUNT_SATS} cbBTC required - `
                                                        : userBalanceExceeded
                                                        ? `Exceeds your available balance - `
                                                        : coinbaseBtcPriceUSD
                                                        ? coinbaseBtcDepositAmount
                                                            ? (coinbaseBtcPriceUSD * parseFloat(coinbaseBtcDepositAmount)).toLocaleString('en-US', {
                                                                  style: 'currency',
                                                                  currency: 'USD',
                                                              })
                                                            : '$0.00'
                                                        : '$0.00'}
                                                </Text>
                                            )}
                                            {/* Actionable Suggestion */}
                                            {(isAboveMaxSwapLimitCoinbaseBtcDeposit || isBelowMinCoinbaseBtcDeposit || userBalanceExceeded) && (
                                                <Text
                                                    fontSize={'14px'}
                                                    mt='7px'
                                                    mr='-116px'
                                                    zIndex={'10'}
                                                    color={selectedInputAsset.border_color_light}
                                                    cursor='pointer'
                                                    onClick={() =>
                                                        handleCoinbaseBtcInputChange(
                                                            null,
                                                            isAboveMaxSwapLimitCoinbaseBtcDeposit
                                                                ? MAX_SWAP_AMOUNT_SATS.toString()
                                                                : isBelowMinCoinbaseBtcDeposit
                                                                ? `${MIN_SWAP_AMOUNT_SATS}`
                                                                : userCoinbaseBtcBalance,
                                                        )
                                                    }
                                                    _hover={{ textDecoration: 'underline' }}
                                                    letterSpacing={'-1.5px'}
                                                    fontWeight={'normal'}
                                                    fontFamily={'Aux'}>
                                                    {isAboveMaxSwapLimitCoinbaseBtcDeposit
                                                        ? `${MAX_SWAP_AMOUNT_SATS} sats Max`
                                                        : isBelowMinCoinbaseBtcDeposit
                                                        ? `${MIN_SWAP_AMOUNT_SATS} cbBTC Min`
                                                        : `${parseFloat(userCoinbaseBtcBalance).toFixed(4)} cbBTC Max`}
                                                </Text>
                                            )}
                                        </Flex>
                                    </Flex>

                                    <Spacer />
                                    <Flex mr='6px'>
                                        <WebAssetTag cursor='pointer' asset='CoinbaseBTC' onDropDown={() => setCurrencyModalTitle('deposit')} />
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
                                    onClick={() => toastInfo({ title: 'BTC -> cbBTC swaps coming soon!', description: 'if only bitcoin had OP_CAT, this would be a lot easier to build!' })}
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
                                {/* BTC Output */}
                                <Flex mt={'5px'} px='10px' bg='#2E1C0C' w='100%' h='117px' border='2px solid #78491F' borderRadius={'10px'}>
                                    <Flex direction={'column'} py='10px' px='5px'>
                                        <Text
                                            color={
                                                loading ? colors.offerWhite : isAboveMaxSwapLimitBtcOutput || isBelowMinBtcOutput ? colors.red : !btcOutputAmount ? colors.offWhite : colors.textGray
                                            }
                                            fontSize={'14px'}
                                            letterSpacing={'-1px'}
                                            fontWeight={'normal'}
                                            fontFamily={'Aux'}
                                            userSelect='none'>
                                            {loading ? `Loading contract data${dots}` : `You Receive`}
                                        </Text>
                                        {loading && !isMobile ? (
                                            <Skeleton height='62px' pt='40px' mt='5px' mb='0.5px' w='200px' borderRadius='5px' startColor={'#795436'} endColor={'#6C4525'} />
                                        ) : (
                                            <Input
                                                value={btcOutputAmount}
                                                onChange={handleBtcOutputChange}
                                                fontFamily={'Aux'}
                                                border='none'
                                                mt='6px'
                                                mr='-150px'
                                                ml='-5px'
                                                p='0px'
                                                letterSpacing={'-6px'}
                                                color={isAboveMaxSwapLimitBtcOutput || isBelowMinBtcOutput ? colors.red : colors.offWhite}
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
                                                    color={isAboveMaxSwapLimitBtcOutput || isBelowMinBtcOutput ? colors.redHover : !btcOutputAmount ? colors.offWhite : colors.textGray}
                                                    fontSize={'14px'}
                                                    mt='6px'
                                                    ml='1px'
                                                    mr='8px'
                                                    letterSpacing={'-1px'}
                                                    fontWeight={'normal'}
                                                    fontFamily={'Aux'}>
                                                    {isAboveMaxSwapLimitBtcOutput
                                                        ? `Exceeds maximum swap limit - `
                                                        : isBelowMinBtcOutput
                                                        ? `Below minimum required - `
                                                        : btcPriceUSD
                                                        ? btcOutputAmount
                                                            ? (btcPriceUSD * parseFloat(btcOutputAmount)).toLocaleString('en-US', {
                                                                  style: 'currency',
                                                                  currency: 'USD',
                                                              })
                                                            : '$0.00'
                                                        : '$0.00'}
                                                </Text>
                                            )}
                                            {/* Actionable Suggestion */}
                                            {(isAboveMaxSwapLimitBtcOutput || isBelowMinBtcOutput) && (
                                                <Text
                                                    fontSize={'13px'}
                                                    mt='7px'
                                                    mr='-116px'
                                                    zIndex={'10'}
                                                    color={selectedInputAsset.border_color_light}
                                                    cursor='pointer'
                                                    onClick={() => {
                                                        if (isAboveMaxSwapLimitBtcOutput) {
                                                            handleCoinbaseBtcInputChange(null, satsToBtc(BigNumber.from(MIN_SWAP_AMOUNT_SATS)).toString());
                                                        } else {
                                                            handleBtcOutputChange({
                                                                target: {
                                                                    value: minBtcOutputAmount,
                                                                },
                                                            });
                                                        }
                                                    }}
                                                    _hover={{ textDecoration: 'underline' }}
                                                    letterSpacing={'-1.5px'}
                                                    fontWeight={'normal'}
                                                    fontFamily={'Aux'}>
                                                    {isAboveMaxSwapLimitBtcOutput
                                                        ? `${(MIN_SWAP_AMOUNT_SATS / coinbaseBtcExchangeRatePerBTC).toFixed(8)} BTC Max`
                                                        : `${parseFloat(minBtcOutputAmount).toFixed(8)} BTC Min`}
                                                </Text>
                                            )}
                                        </Flex>
                                    </Flex>

                                    <Spacer />
                                    <Flex mr='6px'>
                                        <WebAssetTag cursor='pointer' asset='BTC' onDropDown={() => setCurrencyModalTitle('recieve')} />
                                    </Flex>
                                </Flex>
                            </Flex>{' '}
                            {/* Rate/Liquidity Details */}
                            <Flex mt='12px'>
                                <Text color={colors.textGray} fontSize={'14px'} ml='3px' letterSpacing={'-1.5px'} fontWeight={'normal'} fontFamily={'Aux'}>
                                    1 BTC ≈{' '}
                                    {coinbaseBtcExchangeRatePerBTC
                                        ? coinbaseBtcExchangeRatePerBTC.toLocaleString('en-US', {
                                              maximumFractionDigits: 4,
                                          })
                                        : 'N/A'}{' '}
                                    {selectedInputAsset.display_name}
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
                                            </Flex>
                                        </Flex>
                                    </Tooltip>
                                </Flex>
                            </Flex>
                            {/* Exchange Button */}
                            <Flex
                                bg={
                                    coinbaseBtcDepositAmount && !isAboveMaxSwapLimitCoinbaseBtcDeposit && !isBelowMinCoinbaseBtcDeposit && !userBalanceExceeded
                                        ? colors.purpleBackground
                                        : colors.purpleBackgroundDisabled
                                }
                                _hover={{
                                    bg: coinbaseBtcDepositAmount && !isAboveMaxSwapLimitCoinbaseBtcDeposit && !isBelowMinCoinbaseBtcDeposit && !userBalanceExceeded ? colors.purpleHover : undefined,
                                }}
                                w='100%'
                                mt='15px'
                                transition={'0.2s'}
                                h='48px'
                                onClick={
                                    areNewDepositsPaused
                                        ? null
                                        : isMobile
                                        ? () => toastInfo({ title: 'Hop on your laptop', description: 'This app is too cool for small screens, mobile coming soon!' })
                                        : coinbaseBtcDepositAmount && !isAboveMaxSwapLimitCoinbaseBtcDeposit && !isBelowMinCoinbaseBtcDeposit && !userBalanceExceeded && btcOutputAmount
                                        ? () => initiateDeposit()
                                        : null
                                }
                                fontSize={'16px'}
                                align={'center'}
                                userSelect={'none'}
                                cursor={
                                    coinbaseBtcDepositAmount && !isAboveMaxSwapLimitCoinbaseBtcDeposit && !isBelowMinCoinbaseBtcDeposit && !userBalanceExceeded && btcOutputAmount
                                        ? 'pointer'
                                        : 'not-allowed'
                                }
                                borderRadius={'10px'}
                                justify={'center'}
                                border={
                                    coinbaseBtcDepositAmount && !isAboveMaxSwapLimitCoinbaseBtcDeposit && !isBelowMinCoinbaseBtcDeposit && !userBalanceExceeded && btcOutputAmount
                                        ? '3px solid #445BCB'
                                        : '3px solid #3242a8'
                                }>
                                <Text
                                    color={
                                        coinbaseBtcDepositAmount &&
                                        !isAboveMaxSwapLimitCoinbaseBtcDeposit &&
                                        !isBelowMinCoinbaseBtcDeposit &&
                                        !userBalanceExceeded &&
                                        btcOutputAmount &&
                                        !areNewDepositsPaused
                                            ? colors.offWhite
                                            : colors.darkerGray
                                    }
                                    fontFamily='Nostromo'>
                                    {areNewDepositsPaused ? 'NEW SWAPS ARE DISABLED FOR TESTING' : isConnected ? 'Exchange' : 'Connect Wallet'}
                                </Text>
                            </Flex>
                        </>
                    )}
                </Flex>
            </Flex>
        </>
    );
};
