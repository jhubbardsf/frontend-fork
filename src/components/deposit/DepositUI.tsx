import { Tabs, TabList, Tooltip, TabPanels, Tab, Button, Flex, Text, useColorModeValue, Box, Spacer, Input, Skeleton } from '@chakra-ui/react';
import useWindowSize from '../../hooks/useWindowSize';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { colors } from '../../utils/colors';
import { useStore } from '../../store';
import { BTCSVG, ETHSVG, InfoSVG } from '../other/SVGs';
import { formatUnits, parseEther, parseUnits } from 'ethers/lib/utils';
import { addNetwork, btcToSats, convertToBitcoinLockingScript, ethToWei, formatAmountToString, satsToBtc, validateBitcoinPayoutAddress, weiToEth } from '../../utils/dappHelper';
import { BITCOIN_DECIMALS, MAX_SWAP_AMOUNT_SATS, MAX_SWAP_LP_OUTPUTS, MIN_SWAP_AMOUNT_SATS, opaqueBackgroundColor, SAMEES_DEMO_CB_BTC_ADDRESS } from '../../utils/constants';
import { AssetTag } from '../other/AssetTag';
import { custom, useAccount, useChainId } from 'wagmi';
import { connectorsForWallets, useConnectModal } from '@rainbow-me/rainbowkit';
import WebAssetTag from '../other/WebAssetTag';
import { useContractData } from '../providers/ContractDataProvider';
import { toastInfo } from '../../hooks/toast';
import { DepositAmounts } from './DepositAmounts';
import { btcLimitOrders, usdcLimitOrders, OptimalSwapsResult } from '../../utils/LimitOrderPriceFunctions';
import { FONT_FAMILIES } from '../../utils/font';
import BitcoinAddressValidation from '../other/BitcoinAddressValidation';
import { createWalletClient } from 'viem';
import { getTipProof } from '../../utils/dataEngineClient';
import { BigNumber, ethers } from 'ethers';
import { DepositStatus, useDepositLiquidity } from '../../hooks/contract/useDepositLiquidity';
import DepositStatusModal from './DepositStatusModal';
import UniswapSwapWidget from '../uniswap/UniswapSwapWidget';
import TokenButton from '../other/TokenButton';
import GooSpinner from '../other/GooSpiner';
import { useQuery } from '@tanstack/react-query';
import { useSwapRoute } from '@/hooks/useSwapRoute';
import { useLogState } from '@/hooks/useLogState';

export const DepositUI = () => {
    const { isMobile } = useWindowSize();
    const router = useRouter();
    const fontSize = isMobile ? '20px' : '20px';
    const coinbaseBtcDepositAmount = useStore((state) => state.coinbaseBtcDepositAmount);
    const setCoinbaseBtcDepositAmount = useStore((state) => state.setCoinbaseBtcDepositAmount);
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
    const actualBorderColor = '#323232';
    const borderColor = `2px solid ${actualBorderColor}`;
    const [userCoinbaseBtcBalance, setUserCoinbaseBtcBalance] = useState('0.00');
    const setBtcOutputAmount = useStore((state) => state.setBtcOutputAmount);
    const btcOutputAmount = useStore((state) => state.btcOutputAmount);
    const setBtcInputSwapAmount = useStore((state) => state.setBtcInputSwapAmount);
    const [isAwaitingConnection, setIsAwaitingConnection] = useState(false);
    const { refreshUserSwapsFromAddress, refreshConnectedUserBalance, loading } = useContractData();
    const [isAboveMaxSwapLimitCoinbaseBtcDeposit, setIsAboveMaxSwapLimitCoinbaseBtcDeposit] = useState(false);
    const [isAboveMaxSwapLimitBtcOutput, setIsAboveMaxSwapLimitBtcOutput] = useState(false);
    const [isBelowMinCoinbaseBtcDeposit, setIsBelowMinCoinbaseBtcDeposit] = useState(false);
    const [isBelowMinBtcOutput, setIsBelowMinBtcOutput] = useState(false);
    const areNewDepositsPaused = useStore((state) => state.areNewDepositsPaused);
    const payoutBTCAddress = useStore((state) => state.payoutBTCAddress);
    const setPayoutBTCAddress = useStore((state) => state.setPayoutBTCAddress);
    const chainId = useChainId();
    const [isWaitingForCorrectNetwork, setIsWaitingForCorrectNetwork] = useState(false);
    const [dots, setDots] = useState('');
    const { depositLiquidity, status: depositLiquidityStatus, error: depositLiquidityError, txHash, resetDepositState } = useDepositLiquidity();

    // New token stuff
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUniswapSwapWidgetOpen, setIsUniswapSwapWidgetOpen] = useState(false);
    const uniswapTokens = useStore((state) => state.uniswapTokens);
    const selectedUniswapInputAsset = useStore((state) => state.selectedUniswapInputAsset);
    const setSelectedUniswapInputAsset = useStore((state) => state.setSelectedUniswapInputAsset);
    const setSelectedInputAsset = useStore((state) => state.setSelectedInputAsset);

    const validAssetPriceUSD = validAssets[selectedInputAsset.name]?.priceUSD;
    // Route finding
    const { isPending, isLoading, isFetching, isPaused, isStale,isError, data, error } = useSwapRoute(selectedInputAsset, coinbaseBtcDepositAmount, chainId);
    useLogState('Bun vars', { selectedInputAsset, coinbaseBtcDepositAmount, chainId, isPending, isError, data, error });
    // Clear form values on component mount
    useEffect(() => {
        // Reset all input values when component mounts
        setCoinbaseBtcDepositAmount('');
        setBtcOutputAmount('');
        setBtcInputSwapAmount('');
        setPayoutBTCAddress('');

        // Also reset validation states
        setUserBalanceExceeded(false);
        setIsAboveMaxSwapLimitCoinbaseBtcDeposit(false);
        setIsBelowMinCoinbaseBtcDeposit(false);
        setIsAboveMaxSwapLimitBtcOutput(false);
        setIsBelowMinBtcOutput(false);
    }, []);

    // Helper function to check if all deposit conditions are met
    const canProceedWithDeposit = () => {
        return (
            coinbaseBtcDepositAmount &&
            !isAboveMaxSwapLimitCoinbaseBtcDeposit &&
            !isBelowMinCoinbaseBtcDeposit &&
            !userBalanceExceeded &&
            btcOutputAmount &&
            validateBitcoinPayoutAddress(payoutBTCAddress) &&
            !areNewDepositsPaused
        );
    };

    // Modern approach using onKeyDown
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && canProceedWithDeposit()) {
            initiateDeposit();
        }
    };

    // ---------- BTC PAYOUT ADDRESS ---------- //
    const handleBTCPayoutAddressChange = (e) => {
        const BTCPayoutAddress = e.target.value;
        setPayoutBTCAddress('bc1qpy7q5sjv448kkaln44r7726pa9xyzsskk84tw7');
    };

    // update token price and available liquidity
    useEffect(() => {
        if (selectedInputAsset && validAssets[selectedInputAsset.name]) {
            const totalAvailableLiquidity = validAssets[selectedInputAsset.name]?.totalAvailableLiquidity;
            setAvailableLiquidity(totalAvailableLiquidity ?? BigNumber.from(0));
            setCoinbaseBtcExchangeRatePerBTC(validAssets[selectedInputAsset.name].exchangeRateInTokenPerBTC);
            setUserCoinbaseBtcBalance(validAssets[selectedInputAsset.name].connectedUserBalanceFormatted);
        }
    }, [selectedInputAsset, validAssets]);

    useEffect(() => {
        setUserBalanceExceeded(false);
    }, []);

    // --------------- cbBTC INPUT ---------------
    const handleCoinbaseBtcInputChange = (e, amount = null) => {
        const asset = useStore.getState().validAssets[selectedInputAsset.name];
        console.log("Bun handleCoinbaseBtcInputChange", { e, amount });
        setIsAboveMaxSwapLimitBtcOutput(false);
        setIsBelowMinBtcOutput(false);
        setUserBalanceExceeded(false)
        
        const maxDecimals = asset?.decimals;
        const coinbaseBtcValue = amount !== null ? amount : e.target.value;

        console.log("Change 1");
        const validateCoinbaseBtcInputChange = (value: string) => {
            console.log({value})
            if (value === '') return true;
            const regex = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`);
            console.log({valid: regex.test(value), decimals: maxDecimals});
            return regex.test(value);
        };
        console.log("Change 1.2");
        if (validateCoinbaseBtcInputChange(coinbaseBtcValue)) {
            console.log("Change 1.3");
            setIsAboveMaxSwapLimitCoinbaseBtcDeposit(false);
            setIsBelowMinCoinbaseBtcDeposit(false);
            console.log("Change 2");
            // check if input is above max swap limit
            if (!asset.fromTokenList) // TODO: Skip next check for testing
            if (parseFloat(coinbaseBtcValue) > parseFloat(formatUnits(MAX_SWAP_AMOUNT_SATS, selectedInputAsset.decimals))) {
                setIsAboveMaxSwapLimitCoinbaseBtcDeposit(true);
                setCoinbaseBtcDepositAmount(coinbaseBtcValue);
                setBtcOutputAmount('');
                setBtcInputSwapAmount('');
                console.log("ERR1");
                return;
            }
            console.log("Change 3");
            // check if input is below min required amount
            if (parseFloat(coinbaseBtcValue) > 0 && parseFloat(coinbaseBtcValue) < parseFloat(satsToBtc(BigNumber.from(MIN_SWAP_AMOUNT_SATS)))) {
                setIsBelowMinCoinbaseBtcDeposit(true);
                setCoinbaseBtcDepositAmount(coinbaseBtcValue);
                setBtcOutputAmount('');
                setBtcInputSwapAmount('');
                console.log("Change 3 ERR");
                return;
            }
            console.log("Change 4");
            setCoinbaseBtcDepositAmount(coinbaseBtcValue);
            // Use the actual exchange rate instead of hardcoded 0.999
            const outputAmount = parseFloat(coinbaseBtcValue) / coinbaseBtcExchangeRatePerBTC;
            setBtcOutputAmount(outputAmount > 0 ? outputAmount.toFixed(8) : '');
            setBtcInputSwapAmount(outputAmount > 0 ? outputAmount.toFixed(8) : '');
            console.log("Change 5");
            // check if exceeds user balance
            if (isConnected) {
                checkLiquidityExceeded(coinbaseBtcValue);
            }
        }
    };

    const checkLiquidityExceeded = (amount: number) => {
        if (isConnected) setUserBalanceExceeded(amount > parseFloat(userCoinbaseBtcBalance));
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        resetDepositState();

        // Only clear form values if deposit was successful
        if (depositLiquidityStatus === DepositStatus.Confirmed) {
            setCoinbaseBtcDepositAmount('');
            setBtcOutputAmount('');
            setBtcInputSwapAmount('');
            setPayoutBTCAddress('');
        }
    };

    // --------------- BTC OUTPUT ---------------
    const handleBtcOutputChange = (e) => {
        setIsAboveMaxSwapLimitCoinbaseBtcDeposit(false);
        const btcValue = validateBtcOutput(e.target.value);

        if (btcValue !== null) {
            setIsAboveMaxSwapLimitBtcOutput(false);
            setIsBelowMinBtcOutput(false);
            setIsBelowMinCoinbaseBtcDeposit(false);

            // calculate equivalent cbBTC deposit amount using the exchange rate
            const coinbaseBtcInputValueLocal = btcValue && parseFloat(btcValue) > 0 ? parseFloat(btcValue) * useStore.getState().validAssets[selectedInputAsset.name].exchangeRateInTokenPerBTC : 0;

            // check if BTC output exceeds max swap limit
            if (coinbaseBtcInputValueLocal > parseFloat(formatUnits(MAX_SWAP_AMOUNT_SATS, selectedInputAsset.decimals))) {
                setIsAboveMaxSwapLimitBtcOutput(true);
                setBtcOutputAmount(btcValue);
                setCoinbaseBtcDepositAmount('');
                return;
            }

            // check if coinbaseBtc input is below min from constants
            if (coinbaseBtcInputValueLocal && coinbaseBtcInputValueLocal < parseFloat(satsToBtc(BigNumber.from(MIN_SWAP_AMOUNT_SATS))) && coinbaseBtcInputValueLocal !== 0) {
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

                // fetch the latest user balance after refreshing
                await refreshConnectedUserBalance();
                const latestUserCoinbaseBtcBalance = validAssets[selectedInputAsset.name].connectedUserBalanceFormatted;

                if (parseFloat(coinbaseBtcDepositAmount || '0') > parseFloat(latestUserCoinbaseBtcBalance || '0')) {
                    setUserBalanceExceeded(true);
                } else {
                    proceedWithDeposit();
                }
            }
        };

        handleConnection();
    }, [isConnected]);

    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setDots((prev) => (prev === '...' ? '' : prev + '.'));
            }, 350);
            return () => clearInterval(interval);
        }
    }, [loading]);

    // ---------- INITIATE DEPOSIT LOGIC ---------- //
    const initiateDeposit = async () => {
        // this function ensures user is connected, and switched to the correct chain before proceeding with the deposit attempt
        if (!isConnected) {
            setIsAwaitingConnection(true);
            openConnectModal();
            return;
        }

        if (chainId !== selectedInputAsset.contractChainID) {
            console.log('Switching or adding network');
            console.log('current chainId:', chainId);
            console.log('target chainId:', selectedInputAsset.contractChainID);
            setIsWaitingForCorrectNetwork(true);

            const client = createWalletClient({
                transport: custom(window.ethereum),
            });

            // convert chainId to the proper hex format
            const hexChainId = `0x${selectedInputAsset.contractChainID.toString(16)}`;

            // check if the chain is already available in MetaMask
            try {
                // attempt to switch to the target network
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: hexChainId }],
                });
                console.log('Switched to the existing network successfully');
            } catch (error) {
                // error code 4902 indicates the chain is not available
                console.error('error', error);
                if (error.code === 4902) {
                    console.log('Network not available in MetaMask. Attempting to add network.');

                    try {
                        // attempt to add the network if it's not found
                        await addNetwork(selectedInputAsset.chainDetails); // Or pass the appropriate chain object
                        console.log('Network added successfully');

                        // after adding, attempt to switch to the new network
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: hexChainId }],
                        });
                        console.log('Switched to the newly added network successfully');
                    } catch (addNetworkError) {
                        console.log('Failed to add or switch to network:', addNetworkError);
                        // handle add network error (e.g., notify the user)
                        return;
                    }
                } else {
                    console.log('Error switching network:', error);
                    // handle other errors (e.g., switch chain permission denied)
                    return;
                }
            }

            return;
        }

        proceedWithDeposit();
    };

    const proceedWithDeposit = async () => {
        if (window.ethereum) {
            // [0] reset the deposit state before starting a new deposit
            resetDepositState();
            setIsModalOpen(true);

            // [1] convert deposit amount to smallest token unit (sats), prepare deposit params
            console.log('SELECTED ASSET', useStore.getState().validAssets[selectedInputAsset.name]);
            const depositTokenDecmials = useStore.getState().validAssets[selectedInputAsset.name].decimals;
            console.log('depositTokenDecmials', depositTokenDecmials);
            const depositAmountInSmallestTokenUnit = parseUnits(coinbaseBtcDepositAmount, depositTokenDecmials);
            const bitcoinOutputAmountInSats = parseUnits(btcOutputAmount, BITCOIN_DECIMALS);
            const btcPayoutScriptPubKey = convertToBitcoinLockingScript(payoutBTCAddress);
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const randomBytes = new Uint8Array(32);
            const generatedDepositSalt =
                '0x' +
                Array.from(window.crypto.getRandomValues(randomBytes))
                    .map((byte) => byte.toString(16).padStart(2, '0'))
                    .join('');
            console.log('generatedDepositSalt', generatedDepositSalt);

            console.log('[IN] depositAmountInSmallestTokenUnit:', depositAmountInSmallestTokenUnit.toString());
            console.log('[OUT] bitcoinOutputAmountInSats:', bitcoinOutputAmountInSats.toString());

            // Get tip proof and handle potential errors
            let tipProof;
            try {
                tipProof = await getTipProof(selectedInputAsset.dataEngineUrl);
                console.log('[alpine] tipProof', tipProof);
            } catch (error) {
                console.error('[alpine] error', error);
                // manually set the error state in the depositLiquidity hook (this doesnt actually try to deposit)
                setIsModalOpen(true);
                depositLiquidity({
                    signer,
                    riftExchangeAbi: selectedInputAsset.riftExchangeAbi,
                    riftExchangeContractAddress: selectedInputAsset.riftExchangeContractAddress,
                    tokenAddress: selectedInputAsset.tokenAddress,
                    params: {
                        // We're passing empty/dummy values here because we know it will fail
                        // The hook will catch the error and update the status
                        depositOwnerAddress: userEthAddress,
                        specifiedPayoutAddress: '0x0',
                        depositAmount: BigNumber.from(0),
                        expectedSats: BigNumber.from(0),
                        btcPayoutScriptPubKey: '0x0',
                        depositSalt: '0x0',
                        confirmationBlocks: 0,
                        safeBlockLeaf: null,
                        safeBlockSiblings: [],
                        safeBlockPeaks: [],
                    },
                    // Pass the error directly to force an error state
                    forceError: `Failed to get tip proof: ${error.message || 'Unknown error'}`,
                });
                return;
            }

            // [2] deposit liquidity with valid tip proof
            await depositLiquidity({
                signer: signer,
                riftExchangeAbi: selectedInputAsset.riftExchangeAbi,
                riftExchangeContractAddress: selectedInputAsset.riftExchangeContractAddress,
                tokenAddress: selectedInputAsset.tokenAddress,
                params: {
                    depositOwnerAddress: userEthAddress,
                    specifiedPayoutAddress: SAMEES_DEMO_CB_BTC_ADDRESS, // TODO: rempve hard codeding address after demo
                    depositAmount: depositAmountInSmallestTokenUnit, // renamed from depositAmountInSmallestTokenUnit
                    expectedSats: bitcoinOutputAmountInSats,
                    btcPayoutScriptPubKey: btcPayoutScriptPubKey,
                    depositSalt: generatedDepositSalt, // TODO: check contract for deposit salt input type
                    confirmationBlocks: 2,
                    safeBlockLeaf: tipProof.leaf,
                    safeBlockSiblings: tipProof.siblings,
                    safeBlockPeaks: tipProof.peaks,
                },
            });
        }
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
                        <Flex>
                            <Flex w='100%' flexDir='column' position='relative'>
                                <Flex>
                                    <Text>Deposit Confirmation | 1-confirm-deposit</Text>
                                </Flex>
                            </Flex>
                        </Flex>
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
                                                onKeyDown={handleKeyDown}
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
                                                        ? `Minimum ${satsToBtc(BigNumber.from(MIN_SWAP_AMOUNT_SATS))} cbBTC required - `
                                                        : userBalanceExceeded
                                                        ? `Exceeds your available balance - `
                                                        : coinbaseBtcPriceUSD
                                                        ? coinbaseBtcDepositAmount
                                                            ? ((validAssetPriceUSD || coinbaseBtcPriceUSD) * parseFloat(coinbaseBtcDepositAmount)).toLocaleString('en-US', {
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
                                                                ? satsToBtc(BigNumber.from(MAX_SWAP_AMOUNT_SATS))
                                                                : isBelowMinCoinbaseBtcDeposit
                                                                ? `${satsToBtc(BigNumber.from(MIN_SWAP_AMOUNT_SATS))}`
                                                                : userCoinbaseBtcBalance,
                                                        )
                                                    }
                                                    _hover={{ textDecoration: 'underline' }}
                                                    letterSpacing={'-1.5px'}
                                                    fontWeight={'normal'}
                                                    fontFamily={'Aux'}>
                                                    {isAboveMaxSwapLimitCoinbaseBtcDeposit
                                                        ? `${satsToBtc(BigNumber.from(MAX_SWAP_AMOUNT_SATS))} cbBTC Max`
                                                        : isBelowMinCoinbaseBtcDeposit
                                                        ? `${satsToBtc(BigNumber.from(MIN_SWAP_AMOUNT_SATS))} cbBTC Min`
                                                        : `${parseFloat(userCoinbaseBtcBalance).toFixed(4)} cbBTC Max`}
                                                </Text>
                                            )}
                                        </Flex>
                                    </Flex>

                                    <Spacer />
                                    <Flex mr='6px'>
                                        {/* JSH Deposit Button */}
                                        {/* <WebAssetTag cursor='pointer' asset='CoinbaseBTC' onDropDown={() => setCurrencyModalTitle('deposit')} /> */}
                                        <TokenButton
                                            cursor='pointer'
                                            asset={uniswapTokens.find((t) => t.symbol === 'cbBTC')}
                                            onDropDown={() => {
                                                setIsUniswapSwapWidgetOpen(true);
                                            }}
                                        />
                                    </Flex>
                                </Flex>
                                {/* Switch Button */}
                                <Flex
                                    zIndex='overlay'
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
                                    top='34.5%'
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
                                <Flex position='relative' mt={'5px'} px='10px' bg='rgba(46, 29, 14, 0.66)' w='100%' h='117px' border='2px solid #78491F' borderRadius={'10px'}>
                                    {(isFetching) && <GooSpinner overlay fullOverlay color={colors.purpleBorder} />}
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
                                                onKeyDown={handleKeyDown}
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
                                                            handleCoinbaseBtcInputChange(null, satsToBtc(BigNumber.from(MAX_SWAP_AMOUNT_SATS)).toString());
                                                        } else {
                                                            handleBtcOutputChange({
                                                                target: {
                                                                    value: satsToBtc(BigNumber.from(MIN_SWAP_AMOUNT_SATS)).toString(),
                                                                },
                                                            });
                                                        }
                                                    }}
                                                    _hover={{ textDecoration: 'underline' }}
                                                    letterSpacing={'-1.5px'}
                                                    fontWeight={'normal'}
                                                    fontFamily={'Aux'}>
                                                    {isAboveMaxSwapLimitBtcOutput
                                                        ? `${satsToBtc(BigNumber.from(MAX_SWAP_AMOUNT_SATS))} BTC Max`
                                                        : `${satsToBtc(BigNumber.from(MIN_SWAP_AMOUNT_SATS))} BTC Min`}
                                                </Text>
                                            )}
                                        </Flex>
                                    </Flex>

                                    <Spacer />
                                    <Flex mr='6px'>
                                        <WebAssetTag cursor='pointer' asset='BTC' onDropDown={() => setCurrencyModalTitle('recieve')} />
                                    </Flex>
                                </Flex>

                                {/* BTC Payout Address */}
                                <Box ml='8px' display='flex' alignItems='center' mt='18px' w='100%' mb='6px' fontSize='15px' fontFamily={FONT_FAMILIES.NOSTROMO} color={colors.offWhite}>
                                    Bitcoin Payout Address
                                    <Tooltip
                                        fontFamily={'Aux'}
                                        letterSpacing={'-0.5px'}
                                        color={colors.offWhite}
                                        ml='100px'
                                        bg={'#121212'}
                                        fontSize={'12px'}
                                        label='Only P2WPKH, P2PKH, or P2SH Bitcoin addresses are supported.'
                                        aria-label='A tooltip'>
                                        <Flex pl='5px' mt='-2px' cursor={'pointer'} userSelect={'none'}>
                                            <Flex mt='0px' mr='2px'>
                                                <InfoSVG width='12px' />
                                            </Flex>
                                        </Flex>
                                    </Tooltip>
                                </Box>
                                <Flex mt='-4px' mb='10px' px='10px' bg='rgba(46, 29, 14, 0.66)' border='2px solid #78491F' w='100%' h='60px' borderRadius={'10px'}>
                                    <Flex direction={'row'} py='6px' px='5px'>
                                        <Input
                                            value={payoutBTCAddress}
                                            onChange={handleBTCPayoutAddressChange}
                                            onKeyDown={handleKeyDown}
                                            fontFamily={'Aux'}
                                            border='none'
                                            mt='3.5px'
                                            mr='15px'
                                            ml='-4px'
                                            p='0px'
                                            w='485px'
                                            letterSpacing={'-5px'}
                                            color={colors.offWhite}
                                            _active={{ border: 'none', boxShadow: 'none' }}
                                            _focus={{ border: 'none', boxShadow: 'none' }}
                                            _selected={{ border: 'none', boxShadow: 'none' }}
                                            fontSize='28px'
                                            placeholder='bc1q5d7rjq7g6rd2d...'
                                            _placeholder={{ color: '#856549' }}
                                            spellCheck={false}
                                        />

                                        {payoutBTCAddress.length > 0 && (
                                            <Flex ml='-5px'>
                                                <BitcoinAddressValidation address={payoutBTCAddress} />
                                            </Flex>
                                        )}
                                    </Flex>
                                </Flex>
                            </Flex>
                            {/* Rate/Liquidity Details */}
                            <Flex mt='12px'>
                                <Text color={colors.textGray} fontSize={'14px'} ml='3px' letterSpacing={'-1.5px'} fontWeight={'normal'} fontFamily={'Aux'}>
                                    1 cbBTC ≈{' '}
                                    {coinbaseBtcExchangeRatePerBTC
                                        ? (1 / coinbaseBtcExchangeRatePerBTC).toLocaleString('en-US', {
                                              maximumFractionDigits: 5,
                                              minimumFractionDigits: 0,
                                          })
                                        : '0.999'}{' '}
                                    BTC
                                    {/* Display the actual exchange rate with max 5 decimal places, no trailing zeros */}
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
                                            <Flex mt='0px' mr='2px'>
                                                <InfoSVG width='14px' />
                                            </Flex>
                                        </Flex>
                                    </Tooltip>
                                </Flex>
                            </Flex>
                            {/* Exchange Button */}
                            <Flex
                                bg={canProceedWithDeposit() ? colors.purpleBackground : colors.purpleBackgroundDisabled}
                                _hover={{
                                    bg: canProceedWithDeposit() ? colors.purpleHover : undefined,
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
                                        : canProceedWithDeposit()
                                        ? () => initiateDeposit()
                                        : null
                                }
                                fontSize={'16px'}
                                align={'center'}
                                userSelect={'none'}
                                cursor={canProceedWithDeposit() ? 'pointer' : 'not-allowed'}
                                borderRadius={'10px'}
                                justify={'center'}
                                border={canProceedWithDeposit() ? '3px solid #445BCB' : '3px solid #3242a8'}>
                                <Text color={canProceedWithDeposit() ? colors.offWhite : colors.darkerGray} fontFamily='Nostromo'>
                                    {canProceedWithDeposit() ? 'Exchange' : 'Connect Wallet'}
                                </Text>
                            </Flex>
                        </>
                    )}
                </Flex>
                <DepositStatusModal isOpen={isModalOpen} onClose={handleModalClose} status={depositLiquidityStatus} error={depositLiquidityError} txHash={txHash} />
                <UniswapSwapWidget isOpen={isUniswapSwapWidgetOpen} onClose={() => setIsUniswapSwapWidgetOpen(false)} onTokenSelected={setSelectedInputAsset} />
            </Flex>
        </>
    );
};
