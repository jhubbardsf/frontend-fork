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
import { btcToSats, ethToWei, formatAmountToString, weiToEth } from '../../utils/dappHelper';
import { BITCOIN_DECIMALS, MAX_SWAP_LP_OUTPUTS, MIN_SWAP_AMOUNT_USDT, opaqueBackgroundColor } from '../../utils/constants';
import { AssetTag } from '../other/AssetTag';
import { useAccount } from 'wagmi';
import { connectorsForWallets, useConnectModal } from '@rainbow-me/rainbowkit';
import { DepositConfirmation } from './DepositConfirmation';
import WebAssetTag from '../other/WebAssetTag';
import { useContractData } from '../providers/ContractDataProvider';
import { toastInfo } from '../../hooks/toast';
import { DepositAmounts } from './DepositAmounts';
import { MAX_SWAP_AMOUNT_MICRO_USDT, MAX_SWAP_AMOUNT_USDT } from '../../utils/constants';

export const DepositUI = () => {
    const { isMobile } = useWindowSize();
    const router = useRouter();
    const fontSize = isMobile ? '20px' : '20px';
    const usdtDepositAmount = useStore((state) => state.usdtDepositAmount);
    const setUsdtDepositAmount = useStore((state) => state.setUsdtDepositAmount);
    const allDepositVaults = useStore((state) => state.allDepositVaults);
    const bitcoinPriceUSD = useStore((state) => state.bitcoinPriceUSD);
    const userEthAddress = useStore((state) => state.userEthAddress);
    const [userBalanceExceeded, setUserBalanceExceeded] = useState(false);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const usdtPriceUSD = useStore.getState().validAssets[selectedInputAsset.name]?.priceUSD;
    const [availableLiquidity, setAvailableLiquidity] = useState(BigNumber.from(0));
    const [usdtExchangeRatePerBTC, setUsdtExchangeRatePerBTC] = useState(0);
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
    const [userUsdtBalance, setUserUsdtBalance] = useState('0.00');
    const setBtcOutputAmount = useStore((state) => state.setBtcOutputAmount);
    const btcOutputAmount = useStore((state) => state.btcOutputAmount);
    const setUsdtOutputSwapAmount = useStore((state) => state.setUsdtOutputSwapAmount);
    const setBtcInputSwapAmount = useStore((state) => state.setBtcInputSwapAmount);
    const [isAwaitingConnection, setIsAwaitingConnection] = useState(false);
    const { refreshAllDepositData, refreshConnectedUserBalance, loading } = useContractData();
    const [isAboveMaxSwapLimitUsdtDeposit, setIsAboveMaxSwapLimitUsdtDeposit] = useState(false);
    const [isAboveMaxSwapLimitBtcOutput, setIsAboveMaxSwapLimitBtcOutput] = useState(false);
    const [isBelowMinUsdtDeposit, setIsBelowMinUsdtDeposit] = useState(false);
    const [isBelowMinBtcOutput, setIsBelowMinBtcOutput] = useState(false);
    const [minBtcOutputAmount, setMinBtcOutputAmount] = useState('0.00000001'); // Default to 1 sat
    const areNewDepositsPaused = useStore((state) => state.areNewDepositsPaused);
    const [dots, setDots] = useState('');

    // update token price and available liquidity
    useEffect(() => {
        if (selectedInputAsset && validAssets[selectedInputAsset.name]) {
            const totalAvailableLiquidity = validAssets[selectedInputAsset.name]?.totalAvailableLiquidity;
            setAvailableLiquidity(totalAvailableLiquidity ?? BigNumber.from(0));
            setUsdtExchangeRatePerBTC(validAssets[selectedInputAsset.name].exchangeRateInTokenPerBTC);
            setUserUsdtBalance(validAssets[selectedInputAsset.name].connectedUserBalanceFormatted);
        }
    }, [selectedInputAsset, validAssets]);

    // update min btc output amount
    useEffect(() => {
        if (usdtExchangeRatePerBTC) {
            const minBtcAmount = 1 / usdtExchangeRatePerBTC;
            setMinBtcOutputAmount(minBtcAmount.toFixed(8)); // Adjust precision as needed
        }
    }, [usdtExchangeRatePerBTC]);

    useEffect(() => {
        setUserBalanceExceeded(false);
    }, []);

    // --------------- USDT INPUT ---------------
    const handleUsdtInputChange = (e, amount = null) => {
        setIsAboveMaxSwapLimitBtcOutput(false);
        setIsBelowMinBtcOutput(false);
        setUserBalanceExceeded(false);

        const maxDecimals = useStore.getState().validAssets[selectedInputAsset.name]?.decimals;
        const usdtValue = amount !== null ? amount : e.target.value;

        const validateUsdtInputChange = (value: string) => {
            if (value === '') return true;
            const regex = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`);
            return regex.test(value);
        };

        if (validateUsdtInputChange(usdtValue)) {
            setIsAboveMaxSwapLimitUsdtDeposit(false);
            setIsBelowMinUsdtDeposit(false);

            // check if input is above max swap limit
            if (parseFloat(usdtValue) > parseFloat(formatUnits(MAX_SWAP_AMOUNT_MICRO_USDT, selectedInputAsset.decimals))) {
                setIsAboveMaxSwapLimitUsdtDeposit(true);
                setUsdtDepositAmount(usdtValue);
                setBtcOutputAmount('');
                setBtcInputSwapAmount('');
                return;
            }

            // check if input is below min required amount
            if (parseFloat(usdtValue) < 1) {
                setIsBelowMinUsdtDeposit(true);
                setUsdtDepositAmount(usdtValue);
                setBtcOutputAmount('');
                setBtcInputSwapAmount('');
                return;
            }

            setUsdtDepositAmount(usdtValue);
            setUsdtOutputSwapAmount(usdtValue);
            const btcOutputValue = usdtValue && parseFloat(usdtValue) > 0 ? parseFloat(usdtValue) / useStore.getState().validAssets[selectedInputAsset.name].exchangeRateInTokenPerBTC : 0;
            setBtcOutputAmount(formatAmountToString(selectedInputAsset, btcOutputValue));
            setBtcInputSwapAmount(formatAmountToString(selectedInputAsset, btcOutputValue));

            // check if exceeds user balance
            if (isConnected) {
                checkLiquidityExceeded(usdtValue);
            }
        }
    };

    const checkLiquidityExceeded = (amount: number) => {
        if (isConnected) setUserBalanceExceeded(amount > parseFloat(userUsdtBalance));
    };

    // --------------- BTC OUTPUT ---------------
    const handleBtcOutputChange = (e) => {
        setIsAboveMaxSwapLimitUsdtDeposit(false);
        const btcValue = validateBtcOutput(e.target.value);

        if (btcValue !== null) {
            setIsAboveMaxSwapLimitBtcOutput(false);
            setIsBelowMinBtcOutput(false);
            setIsBelowMinUsdtDeposit(false);

            // calculate equivalent USDT deposit amount
            const usdtInputValueLocal = btcValue && parseFloat(btcValue) > 0 ? parseFloat(btcValue) * useStore.getState().validAssets[selectedInputAsset.name].exchangeRateInTokenPerBTC : 0;

            // check if BTC output exceeds max swap limit
            if (usdtInputValueLocal > parseFloat(formatUnits(MAX_SWAP_AMOUNT_MICRO_USDT, selectedInputAsset.decimals))) {
                setIsAboveMaxSwapLimitBtcOutput(true);
                setBtcOutputAmount(btcValue);
                setUsdtDepositAmount('');
                setUsdtOutputSwapAmount('');
                return;
            }

            // check if usdt input is below min 1
            if (usdtInputValueLocal && usdtInputValueLocal < 1 && usdtInputValueLocal !== 0) {
                setIsBelowMinBtcOutput(true);
                setBtcOutputAmount(btcValue);
                setUsdtDepositAmount('');
                setUsdtOutputSwapAmount('');
                return;
            }

            setBtcOutputAmount(btcValue);
            setBtcInputSwapAmount(btcValue);
            let usdtInputValue = btcValue && parseFloat(btcValue) > 0 ? parseFloat(btcValue) * useStore.getState().validAssets[selectedInputAsset.name].exchangeRateInTokenPerBTC : 0;
            setUsdtDepositAmount(formatAmountToString(selectedInputAsset, usdtInputValue));
            setUsdtOutputSwapAmount(formatAmountToString(selectedInputAsset, usdtInputValue));
            checkLiquidityExceeded(usdtInputValue);
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
                const latestUserUsdtBalance = validAssets[selectedInputAsset.name].connectedUserBalanceFormatted;

                if (parseFloat(usdtDepositAmount || '0') > parseFloat(latestUserUsdtBalance || '0')) {
                    setUserBalanceExceeded(true);
                } else {
                    proceedWithDeposit();
                }
            }
        };

        handleConnection();
    }, [isConnected, isAwaitingConnection, refreshConnectedUserBalance, validAssets, selectedInputAsset, usdtDepositAmount]);

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
                                {/* USDT Input */}
                                <Flex px='10px' bg={selectedInputAsset.dark_bg_color} w='100%' h='117px' border='2px solid' borderColor={selectedInputAsset.bg_color} borderRadius={'10px'}>
                                    <Flex direction={'column'} py='10px' px='5px'>
                                        <Text
                                            color={loading ? colors.offerWhite : !usdtDepositAmount ? colors.offWhite : colors.textGray}
                                            fontSize={'14px'}
                                            letterSpacing={'-1px'}
                                            fontWeight={'normal'}
                                            fontFamily={'Aux'}
                                            userSelect='none'>
                                            {loading ? `Loading contract data${dots}` : 'You Deposit'}
                                        </Text>
                                        {loading && !isMobile ? (
                                            <Skeleton height='62px' pt='40px' mt='5px' mb='0.5px' w='200px' borderRadius='5px' startColor={'#2E5F50'} endColor={'#0F4534'} />
                                        ) : (
                                            <Input
                                                value={usdtDepositAmount}
                                                onChange={handleUsdtInputChange}
                                                fontFamily={'Aux'}
                                                border='none'
                                                mt='6px'
                                                mr='-150px'
                                                ml='-5px'
                                                p='0px'
                                                letterSpacing={'-6px'}
                                                color={isAboveMaxSwapLimitUsdtDeposit || isBelowMinUsdtDeposit || userBalanceExceeded ? colors.red : colors.offWhite}
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
                                                        isAboveMaxSwapLimitUsdtDeposit || isBelowMinUsdtDeposit || userBalanceExceeded
                                                            ? colors.redHover
                                                            : !usdtDepositAmount
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
                                                    {isAboveMaxSwapLimitUsdtDeposit
                                                        ? `Exceeds maximum swap limit - `
                                                        : isBelowMinUsdtDeposit
                                                        ? `Minimum ${MIN_SWAP_AMOUNT_USDT} USDT required - `
                                                        : userBalanceExceeded
                                                        ? `Exceeds your available balance - `
                                                        : usdtPriceUSD
                                                        ? usdtDepositAmount
                                                            ? (usdtPriceUSD * parseFloat(usdtDepositAmount)).toLocaleString('en-US', {
                                                                  style: 'currency',
                                                                  currency: 'USD',
                                                              })
                                                            : '$0.00'
                                                        : '$0.00'}
                                                </Text>
                                            )}
                                            {/* Actionable Suggestion */}
                                            {(isAboveMaxSwapLimitUsdtDeposit || isBelowMinUsdtDeposit || userBalanceExceeded) && (
                                                <Text
                                                    fontSize={'14px'}
                                                    mt='7px'
                                                    mr='-116px'
                                                    zIndex={'10'}
                                                    color={selectedInputAsset.border_color_light}
                                                    cursor='pointer'
                                                    onClick={() =>
                                                        handleUsdtInputChange(
                                                            null,
                                                            isAboveMaxSwapLimitUsdtDeposit ? MAX_SWAP_AMOUNT_USDT.toString() : isBelowMinUsdtDeposit ? `${MIN_SWAP_AMOUNT_USDT}` : userUsdtBalance,
                                                        )
                                                    }
                                                    _hover={{ textDecoration: 'underline' }}
                                                    letterSpacing={'-1.5px'}
                                                    fontWeight={'normal'}
                                                    fontFamily={'Aux'}>
                                                    {isAboveMaxSwapLimitUsdtDeposit
                                                        ? `${MAX_SWAP_AMOUNT_USDT} USDT Max`
                                                        : isBelowMinUsdtDeposit
                                                        ? `${MIN_SWAP_AMOUNT_USDT} USDT Min`
                                                        : `${parseFloat(userUsdtBalance).toFixed(4)} USDT Max`}
                                                </Text>
                                            )}
                                        </Flex>
                                    </Flex>

                                    <Spacer />
                                    <Flex mr='6px'>
                                        <WebAssetTag cursor='pointer' asset='USDT' onDropDown={() => setCurrencyModalTitle('deposit')} />
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
                                    onClick={() => setDepositMode(false)}
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
                                                        : bitcoinPriceUSD
                                                        ? btcOutputAmount
                                                            ? (bitcoinPriceUSD * parseFloat(btcOutputAmount)).toLocaleString('en-US', {
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
                                                            handleUsdtInputChange(null, MAX_SWAP_AMOUNT_USDT.toString());
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
                                                        ? `${(MAX_SWAP_AMOUNT_USDT / usdtExchangeRatePerBTC).toFixed(8)} BTC Max`
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
                                    {usdtExchangeRatePerBTC
                                        ? usdtExchangeRatePerBTC.toLocaleString('en-US', {
                                              maximumFractionDigits: 4,
                                          })
                                        : 'N/A'}{' '}
                                    {selectedInputAsset.name}
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
                                bg={usdtDepositAmount && !isAboveMaxSwapLimitUsdtDeposit && !isBelowMinUsdtDeposit && !userBalanceExceeded ? colors.purpleBackground : colors.purpleBackgroundDisabled}
                                _hover={{ bg: usdtDepositAmount && !isAboveMaxSwapLimitUsdtDeposit && !isBelowMinUsdtDeposit && !userBalanceExceeded ? colors.purpleHover : undefined }}
                                w='100%'
                                mt='15px'
                                transition={'0.2s'}
                                h='48px'
                                onClick={
                                    areNewDepositsPaused
                                        ? () => toastInfo({ title: 'New swaps paused', description: 'in preparation for our upcoming Base launch!' })
                                        : isMobile
                                        ? () => toastInfo({ title: 'Hop on your laptop', description: 'This app is too cool for small screens, mobile coming soon!' })
                                        : usdtDepositAmount && !isAboveMaxSwapLimitUsdtDeposit && !isBelowMinUsdtDeposit && !userBalanceExceeded && btcOutputAmount
                                        ? () => initiateDeposit()
                                        : null
                                }
                                fontSize={'16px'}
                                align={'center'}
                                userSelect={'none'}
                                cursor={usdtDepositAmount && !isAboveMaxSwapLimitUsdtDeposit && !isBelowMinUsdtDeposit && !userBalanceExceeded && btcOutputAmount ? 'pointer' : 'not-allowed'}
                                borderRadius={'10px'}
                                justify={'center'}
                                border={
                                    usdtDepositAmount && !isAboveMaxSwapLimitUsdtDeposit && !isBelowMinUsdtDeposit && !userBalanceExceeded && btcOutputAmount
                                        ? '3px solid #445BCB'
                                        : '3px solid #3242a8'
                                }>
                                <Text
                                    color={
                                        usdtDepositAmount && !isAboveMaxSwapLimitUsdtDeposit && !isBelowMinUsdtDeposit && !userBalanceExceeded && btcOutputAmount && !areNewDepositsPaused
                                            ? colors.offWhite
                                            : colors.darkerGray
                                    }
                                    fontFamily='Nostromo'>
                                    {areNewDepositsPaused ? 'NEW SWAPS DISABLED' : isConnected ? 'Create Sell Order' : 'Connect Wallet'}
                                </Text>
                            </Flex>
                        </>
                    )}
                </Flex>
            </Flex>
        </>
    );
};
