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
    useDisclosure,
    ModalFooter,
    ModalOverlay,
    ModalContent,
    Modal,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    SliderTrack,
    Slider,
    SliderMark,
    SliderThumb,
    SliderFilledTrack,
} from '@chakra-ui/react';
import useWindowSize from '../../hooks/useWindowSize';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef, ChangeEvent, use } from 'react';
import styled from 'styled-components';
import { colors } from '../../utils/colors';
import { BTCSVG, ETHSVG, InfoSVG } from '../other/SVGs';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi';
import {
    ethToWei,
    weiToEth,
    btcToSats,
    findVaultIndexToOverwrite,
    findVaultIndexWithSameExchangeRate,
    satsToBtc,
    bufferTo18Decimals,
    convertToBitcoinLockingScript,
    addNetwork,
} from '../../utils/dappHelper';
import riftExchangeABI from '../../abis/RiftExchange.json';
import { BigNumber, ethers } from 'ethers';
import { useStore } from '../../store';
import { FONT_FAMILIES } from '../../utils/font';
import { DepositStatus, useDepositLiquidity } from '../../hooks/contract/useDepositLiquidity';
import DepositStatusModal from './DepositStatusModal';
import WhiteText from '../other/WhiteText';
import OrangeText from '../other/OrangeText';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { BITCOIN_DECIMALS } from '../../utils/constants';
import { CheckCircleIcon, CheckIcon, ChevronLeftIcon, SettingsIcon } from '@chakra-ui/icons';
import { HiOutlineXCircle, HiXCircle } from 'react-icons/hi';
import { IoCheckmarkDoneCircle } from 'react-icons/io5';
import { IoMdCheckmarkCircle } from 'react-icons/io';
import { AssetTag } from '../other/AssetTag';
import { FaClock, FaRegArrowAltCircleRight, FaLock } from 'react-icons/fa';
import * as bitcoin from 'bitcoinjs-lib';
import { addChain } from 'viem/actions';
import { createWalletClient, custom } from 'viem';
import { toastError } from '../../hooks/toast';
import WebAssetTag from '../other/WebAssetTag';

type ActiveTab = 'swap' | 'liquidity';

const ExchangeRateInput = ({ value, onChange }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const spanRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (spanRef.current && inputRef.current) {
            spanRef.current.textContent = value || '1.0';
            const calculatedWidth = spanRef.current.offsetWidth + 40;
            inputRef.current.style.width = `${calculatedWidth}px`;
        }
    }, [value]);

    return (
        <Flex position='relative' display='inline-flex' alignItems='center' zIndex={37}>
            <Box as='span' ref={spanRef} position='absolute' visibility='hidden' whiteSpace='pre' fontFamily='Aux' fontSize='20px' letterSpacing='-3px' />
            <Input
                ref={inputRef}
                bg={value > 1 ? '#296746' : '#584539'}
                value={value}
                onChange={onChange}
                cursor={'text'}
                fontFamily='Aux'
                border={value > 1 ? '2px solid #548148' : '2px solid #C86B6B'}
                borderRadius='10px'
                mt='2px'
                textAlign='right'
                h='31px'
                minWidth='20px'
                letterSpacing='-3px'
                pr='19px'
                pl='0px'
                color={colors.offWhite}
                _active={{ border: 'none', boxShadow: 'none' }}
                _focus={{ border: 'none', boxShadow: 'none' }}
                _selected={{ border: 'none', boxShadow: 'none' }}
                fontSize='20px'
                placeholder='1.0'
                _placeholder={{ color: '#888' }}
            />
            <Text color={colors.offWhite} ml='5px' mt='1px' letterSpacing='-1px' fontSize={'16px'}>
                BTC <span style={{ color: colors.textGray }}>≈</span> 1 cbBTC
            </Text>
        </Flex>
    );
};

export const OtcDeposit = ({}) => {
    const { isMobile } = useWindowSize();
    const router = useRouter();
    const { openConnectModal } = useConnectModal();
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { chains, error, switchChain } = useSwitchChain();
    const { data: walletClient } = useWalletClient();
    const { depositLiquidity, status: depositLiquidityStatus, error: depositLiquidityError, txHash, resetDepositState } = useDepositLiquidity();
    const ethersRpcProvider = useStore.getState().ethersRpcProvider;
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const coinbaseBtcDepositAmount = useStore((state) => state.coinbaseBtcDepositAmount);
    const setCoinbaseBtcDepositAmount = useStore((state) => state.setCoinbaseBtcDepositAmount);
    const btcOutputAmount = useStore((state) => state.btcOutputAmount);
    const setBtcOutputAmount = useStore((state) => state.setBtcOutputAmount);
    const [coinbaseBtcDepositAmountUSD, setCoinbaseBtcDepositAmountUSD] = useState('0.00');
    const [coinbaseBtcPerBtcExchangeRate, setCoinbaseBtcPerBtcExchangeRate] = useState('1');
    const [bitcoinOutputAmountUSD, setBitcoinOutputAmountUSD] = useState('0.00');
    const [payoutBTCAddress, setPayoutBTCAddress] = useState('');
    const [otcRecipientUSDCAddress, setOtcRecipientUSDCAddress] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isWaitingForConnection, setIsWaitingForConnection] = useState(false);
    const [isWaitingForCorrectNetwork, setIsWaitingForCorrectNetwork] = useState(false);
    const btcPriceUSD = useStore.getState().validAssets['BTC'].priceUSD;
    const coinbasebtcPriceUSD = useStore.getState().validAssets['CoinbaseBTC'].priceUSD;
    const validAssets = useStore((state) => state.validAssets);
    const setDepositFlowState = useStore((state) => state.setDepositFlowState);
    const setBtcInputSwapAmount = useStore((state) => state.setBtcInputSwapAmount);
    const usdtOutputSwapAmount = useStore((state) => state.usdtOutputSwapAmount);
    const setUsdtOutputSwapAmount = useStore((state) => state.setUsdtOutputSwapAmount);
    const [sliderT, setSliderT] = useState(0.5); // start at middle
    const tickPercents = [-10, -6, -3, -1, 0, 1, 3, 6, 10];
    const A = 56.56854249; // approx.
    const realSliderPercent = valueFromSlider(sliderT);

    // ---------- USE EFFECTS ---------- //
    // [0] watch for wallet connection and proceed with deposit
    useEffect(() => {
        if (isWaitingForConnection && isConnected) {
            setIsWaitingForConnection(false);
            proceedWithDeposit();
        }

        if (isWaitingForCorrectNetwork && chainId === selectedInputAsset.contractChainID) {
            setIsWaitingForCorrectNetwork(false);
            proceedWithDeposit();
        }
    }, [isConnected, isWaitingForConnection, chainId, isWaitingForCorrectNetwork]);

    // [1] calculate coinbase btc deposit amount in USD
    useEffect(() => {
        const coinbaseBtcDepositAmountUSD =
            coinbasebtcPriceUSD && coinbaseBtcDepositAmount
                ? (coinbasebtcPriceUSD * parseFloat(coinbaseBtcDepositAmount)).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                  })
                : '$0.00';
        setCoinbaseBtcDepositAmountUSD(coinbaseBtcDepositAmountUSD);
    }, [coinbaseBtcDepositAmount]);

    // [2] calculate Bitcoin output amount in USD
    useEffect(() => {
        const bitcoinOutputAmountUSD =
            btcPriceUSD && btcOutputAmount
                ? (btcPriceUSD * parseFloat(btcOutputAmount)).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                  })
                : '$0.00';
        setBitcoinOutputAmountUSD(bitcoinOutputAmountUSD);
    }, [btcOutputAmount]);

    // [3] update the exchange rate based on the real percent from the slider
    useEffect(() => {
        const baseExchangeRate = 1;
        const adjustedExchangeRate = baseExchangeRate * (1 + realSliderPercent / 100);
        setCoinbaseBtcPerBtcExchangeRate(adjustedExchangeRate.toFixed(8));
    }, [realSliderPercent]);

    // [4] calculate bitcoin output amount upon exchange rate change
    useEffect(() => {
        const calculateBitcoinOutputAmount = () => {
            if (coinbasebtcPriceUSD && btcPriceUSD && coinbaseBtcDepositAmount && coinbaseBtcPerBtcExchangeRate) {
                const newBitcoinOutputAmount = parseFloat(coinbaseBtcDepositAmount) * parseFloat(coinbaseBtcPerBtcExchangeRate);
                const formattedBitcoinOutputAmount = newBitcoinOutputAmount == 0 ? '0.0' : newBitcoinOutputAmount.toFixed(BITCOIN_DECIMALS);

                if (validateBitcoinAmount(formattedBitcoinOutputAmount)) {
                    setBtcOutputAmount(formattedBitcoinOutputAmount === '0.0' ? '' : formattedBitcoinOutputAmount);
                }
            }
        };

        calculateBitcoinOutputAmount();
    }, [coinbaseBtcPerBtcExchangeRate, coinbaseBtcDepositAmount]);

    // [5] calculate exchange rate upon btc output amount change
    useEffect(() => {
        if (btcOutputAmount && coinbaseBtcDepositAmount) {
            const newExchangeRate = parseFloat(btcOutputAmount) / parseFloat(coinbaseBtcDepositAmount);
            setCoinbaseBtcPerBtcExchangeRate(newExchangeRate.toFixed(8));

            // Update the slider position based on the new exchange rate
            const percentChange = (newExchangeRate - 1) * 100;
            setSliderT(sliderFromValue(percentChange));
        }
    }, [btcOutputAmount, coinbaseBtcDepositAmount]);

    // ---------- cbBTC DEPOSIT AMOUNT ---------- //
    const handleCoinbaseBtcDepositChange = (e: ChangeEvent<HTMLInputElement>) => {
        const tokenValue = e.target.value;

        // [0] if valid, set coinbase btc deposit amount and calculate the bitcoin output amount
        if (validateBitcoinAmount(tokenValue)) {
            setCoinbaseBtcDepositAmount(tokenValue);
        }
    };

    // ---------- EXCHANGE RATE SLIDER ---------- //
    // [0] forward mapping: t in [0..1] → real percent in [-10..+10].
    function valueFromSlider(t) {
        const distFromMiddle = t - 0.5;
        const sign = distFromMiddle < 0 ? -1 : 1;
        const magnitude = Math.abs(distFromMiddle);
        return A * sign * magnitude ** 2.5; // (|dist|^2.5), reapply sign
    }

    // [1] inverse mapping: real percent → t in [0..1].
    function sliderFromValue(v) {
        const sign = v < 0 ? -1 : 1;
        const magnitude = Math.abs(v) / A;
        return 0.5 + sign * magnitude ** (1 / 2.5);
    }

    // [2] handle exchange rate change
    const handleCoinbaseBtcPerBtcExchangeRateChange = (e: ChangeEvent<HTMLInputElement>) => {
        const coinbaseBtcPerBtcExchangeRateValue = e.target.value;

        // [0] validate bitcoin amount
        if (validateBitcoinAmount(coinbaseBtcPerBtcExchangeRateValue)) {
            // [0] if valid, set exchange rate & calculate bitcoin output amount
            setCoinbaseBtcPerBtcExchangeRate(coinbaseBtcPerBtcExchangeRateValue);

            // [1] update slider location
            const exchangeRate = parseFloat(coinbaseBtcPerBtcExchangeRateValue) || 1;
            const percentChange = (exchangeRate - 1) * 100;
            setSliderT(sliderFromValue(percentChange));
        }
    };

    // ---------- BITCOIN OUTPUT AMOUNT ---------- //
    const handleBitcoinOutputAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
        const bitcoinOutputAmountValue = e.target.value;

        // [0] if valid, set bitcoin output amount
        if (validateBitcoinAmount(bitcoinOutputAmountValue)) {
            setBtcOutputAmount(bitcoinOutputAmountValue === '0.0' ? '' : bitcoinOutputAmountValue);
        }
    };

    // ---------- BTC PAYOUT ADDRESS ---------- //
    const handleBTCPayoutAddressChange = (e) => {
        const BTCPayoutAddress = e.target.value;
        setPayoutBTCAddress(BTCPayoutAddress);
    };

    const handleOtcRecipientBaseAddressChange = (e) => {
        const otcRecipientUSDCAddress = e.target.value;
        setOtcRecipientUSDCAddress(otcRecipientUSDCAddress);
    };

    const validateBitcoinPayoutAddress = (address: string): boolean => {
        try {
            // attempt to decode the address
            const decoded = bitcoin.address.fromBech32(address);

            // ensure it's a mainnet address with prefix 'bc'
            if (decoded.prefix !== 'bc') {
                return false;
            }

            // ensure it's a segwit version 0 address (P2WPKH or P2WSH)
            if (decoded.version !== 0) {
                return false;
            }

            // additional check for data length (per BIP 173)
            if (decoded.data.length !== 20 && decoded.data.length !== 32) {
                return false;
            }

            return true; // address is valid
        } catch (error) {
            // decoding failed, address is invalid
            return false;
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        if (depositLiquidityStatus === DepositStatus.Confirmed) {
            setCoinbaseBtcDepositAmount('');
            setBtcInputSwapAmount('');
            setUsdtOutputSwapAmount('');
            setBtcOutputAmount('');

            setDepositFlowState('0-not-started');
        }
    };

    const BitcoinAddressValidation: React.FC<{ address: string }> = ({ address }) => {
        const isValid = validateBitcoinPayoutAddress(address);

        if (address.length === 0) {
            return <Text>...</Text>;
        }

        return (
            <Flex align='center' fontFamily={FONT_FAMILIES.NOSTROMO} w='50px' ml='-10px' mr='0px' h='100%' justify='center' direction='column'>
                {isValid ? (
                    <Flex direction={'column'} align={'center'} justify={'center'} mr='-4px'>
                        <IoMdCheckmarkCircle color={colors.greenOutline} size={'26px'} />
                        <Text color={colors.greenOutline} fontSize={'10px'} mt='3px'>
                            Valid
                        </Text>
                    </Flex>
                ) : (
                    <Flex w='160px' ml='7px' align='cetner'>
                        <Flex mt='2px'>
                            <HiXCircle color='red' size={'40px'} />
                        </Flex>
                        <Text fontSize={'9px'} w='70px' mt='3px' ml='6px' color='red'>
                            Invalid Segwit Address
                        </Text>
                    </Flex>
                )}
            </Flex>
        );
    };

    // ---------- INITIATE DEPOSIT LOGIC ---------- //
    const initiateDeposit = async () => {
        if (!isConnected) {
            setIsWaitingForConnection(true);
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
            // reset the deposit state before starting a new deposit
            resetDepositState();
            setIsModalOpen(true);

            const vaultIndexToOverwrite = findVaultIndexToOverwrite();
            const vaultIndexWithSameExchangeRate = findVaultIndexWithSameExchangeRate();
            const tokenDecmials = useStore.getState().validAssets[selectedInputAsset.name].decimals;
            const tokenDepositAmountInSmallestTokenUnits = parseUnits(coinbaseBtcDepositAmount, tokenDecmials);
            const tokenDepositAmountInSmallestTokenUnitsBufferedTo18Decimals = bufferTo18Decimals(tokenDepositAmountInSmallestTokenUnits, tokenDecmials);
            const bitcoinOutputAmountInSats = parseUnits(btcOutputAmount, BITCOIN_DECIMALS);
            console.log('bitcoinOutputAmountInSats:', bitcoinOutputAmountInSats.toString());
            const exchangeRate = tokenDepositAmountInSmallestTokenUnitsBufferedTo18Decimals.div(bitcoinOutputAmountInSats);

            const clipToDecimals = BITCOIN_DECIMALS; // Calculate how many decimals to clip to
            const precisionBN = BigNumber.from(10).pow(clipToDecimals); // Calculate precision

            const clippedExchangeRate = exchangeRate.div(precisionBN).mul(precisionBN);

            const bitcoinPayoutLockingScript = convertToBitcoinLockingScript(payoutBTCAddress);

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            await depositLiquidity({
                signer: signer,
                riftExchangeAbi: selectedInputAsset.riftExchangeAbi,
                riftExchangeContractAddress: selectedInputAsset.riftExchangeContractAddress,
                tokenAddress: selectedInputAsset.tokenAddress,
                tokenDepositAmountInSmallestTokenUnits: tokenDepositAmountInSmallestTokenUnits,
                btcPayoutLockingScript: bitcoinPayoutLockingScript,
                btcExchangeRate: clippedExchangeRate,
            });
        }
    };

    // ---------- HELPER FUNCTIONS ---------- //
    const validateBitcoinAmount = (value: string) => {
        if (value === '') return true;
        const regex = new RegExp(`^\\d*\\.?\\d{0,${BITCOIN_DECIMALS}}$`);
        return regex.test(value);
    };

    return (
        <Flex w='100%' h='100%' flexDir={'column'} userSelect={'none'} fontSize={'12px'} fontFamily={FONT_FAMILIES.AUX_MONO} color={'#c3c3c3'} fontWeight={'normal'} overflow={'visible'} gap={'0px'}>
            <Text align='center' w='100%' mb='20px' fontSize='25px' fontFamily={FONT_FAMILIES.NOSTROMO} color={colors.offWhite}>
                INITIATE DIRECT SWAP
            </Text>

            {/* INSTRUCTIONAL TEXT  */}
            <Text mb='10px' justifyContent='center' w='100%' fontSize={'14px'} letterSpacing={'-1px'} textAlign={'center'}>
                Create a direct OTC swap if you know your counterparty. Set your exchange rate and recipiant's Base payout address. Your deposit will be locked for 8 hours or until your counterparty
                pays you the agreed upon amount of <OrangeText> Bitcoin.</OrangeText>
            </Text>

            <Flex mt='25px' direction={'column'} overflow={'visible'}>
                {/* Content */}
                <Flex direction='column' align='center' overflow={'visible'}>
                    <Flex w='100%' overflow={'visible'} direction={'column'}>
                        {/* Deposit Input */}
                        <Flex mt='0px' px='10px' bg={selectedInputAsset.dark_bg_color} w='100%' h='105px' border='2px solid' borderColor={selectedInputAsset.bg_color} borderRadius={'10px'}>
                            <Flex direction={'column'} py='10px' px='5px'>
                                <Text color={!coinbaseBtcDepositAmount ? colors.offWhite : colors.textGray} fontSize={'13px'} letterSpacing={'-1px'} fontWeight={'normal'} fontFamily={'Aux'}>
                                    You Deposit
                                </Text>
                                <Input
                                    value={coinbaseBtcDepositAmount}
                                    onChange={(e) => {
                                        handleCoinbaseBtcDepositChange(e);
                                    }}
                                    fontFamily={'Aux'}
                                    border='none'
                                    mt='2px'
                                    mr='-100px'
                                    ml='-5px'
                                    p='0px'
                                    letterSpacing={'-6px'}
                                    color={colors.offWhite}
                                    _active={{ border: 'none', boxShadow: 'none' }}
                                    _focus={{ border: 'none', boxShadow: 'none' }}
                                    _selected={{ border: 'none', boxShadow: 'none' }}
                                    fontSize='40px'
                                    placeholder='0.0'
                                    _placeholder={{
                                        color: selectedInputAsset.light_text_color,
                                    }}
                                />
                                <Text
                                    color={!coinbaseBtcDepositAmount ? colors.offWhite : colors.textGray}
                                    fontSize={'13px'}
                                    mt='2px'
                                    ml='1px'
                                    letterSpacing={'-1px'}
                                    fontWeight={'normal'}
                                    fontFamily={'Aux'}>
                                    {coinbaseBtcDepositAmountUSD}
                                </Text>
                            </Flex>
                            <Spacer />
                            <Flex mr='6px'>
                                <WebAssetTag asset='CoinbaseBTC' />
                            </Flex>
                        </Flex>
                        {/* USDT Recipient Address */}
                        {/* <Text ml='8px' mt='24px' w='100%' mb='10px' fontSize='15px' fontFamily={FONT_FAMILIES.NOSTROMO} color={colors.offWhite}>
                            USDT Payout Address
                        </Text> */}
                        {/* <Flex mt='-2px' mb='22px' px='10px' bg='#111' border='2px solid #565656' w='100%' h='60px' borderRadius={'10px'}>
                            <Flex direction={'row'} py='6px' px='5px'>
                                <Input
                                    value={otcRecipientUSDCAddress}
                                    onChange={handleOtcRecipientUSDCAddressChange}
                                    fontFamily={'Aux'}
                                    border='none'
                                    mt='3.5px'
                                    w='804px'
                                    mr='65px'
                                    ml='-4px'
                                    p='0px'
                                    letterSpacing={'-4px'}
                                    color={colors.offWhite}
                                    _active={{ border: 'none', boxShadow: 'none' }}
                                    _focus={{ border: 'none', boxShadow: 'none' }}
                                    _selected={{ border: 'none', boxShadow: 'none' }}
                                    fontSize='28px'
                                    placeholder='0xb0cb90a9a3dfd81...'
                                    _placeholder={{ color: colors.darkerGray }}
                                    spellCheck={false}
                                />

                                {otcRecipientUSDCAddress.length > 0 && (
                                    <Flex ml='-5px' mt='0px'>
                                        <EthereumAddressValidation address={otcRecipientUSDCAddress} />
                                    </Flex>
                                )}
                            </Flex>
                        </Flex> */}
                        {/* Exchange Rate Slider Input */}
                        <Flex mt='10px' px='10px' bg='#193626' w='100%' h='155px' border='2px solid #548148' borderRadius={'10px'} justify='center'>
                            <Flex direction={'column'} py='10px' px='5px' w='100%'>
                                <Text color={colors.offWhite} fontSize={'13px'} letterSpacing={'-1px'} fontWeight={'normal'} fontFamily={'Aux'}>
                                    Your Exchange Rate
                                </Text>
                                <Flex mt='0px' w='100%' justify='center'>
                                    <ExchangeRateInput
                                        value={coinbaseBtcPerBtcExchangeRate}
                                        onChange={(e) => {
                                            handleCoinbaseBtcPerBtcExchangeRateChange(e);
                                        }}
                                    />
                                </Flex>
                                <Flex direction='column' w='100%' mt='-48px' zIndex={3}>
                                    <Box mt='55px' px='10px' w='95%' alignSelf='center'>
                                        <Slider min={0} max={1} step={0.001} value={sliderT} onChange={(val) => setSliderT(val)} aria-label='exchange-rate-slider'>
                                            {tickPercents.map((p) => {
                                                const markPosition = sliderFromValue(p);
                                                return (
                                                    <SliderMark key={p} value={markPosition} fontSize='sm' textAlign='center' mt='2' ml='-15px'>
                                                        {p < 0 ? `${p}%` : `+${p}%`}
                                                    </SliderMark>
                                                );
                                            })}
                                            <SliderTrack h='14px' borderRadius='20px' bg='transparent' position='relative'>
                                                <Box
                                                    position='absolute'
                                                    left='0'
                                                    w='50%'
                                                    h='100%'
                                                    bg='#584539'
                                                    borderLeft='2px solid #C86B6B'
                                                    borderTop='2px solid #C86B6B'
                                                    borderBottom='2px solid #C86B6B'
                                                />
                                                <Box
                                                    position='absolute'
                                                    left='50%'
                                                    w='50%'
                                                    h='100%'
                                                    bg='#3C6850'
                                                    borderRight='2px solid #78C86B'
                                                    borderTop='2px solid #78C86B'
                                                    borderBottom='2px solid #78C86B'
                                                />
                                            </SliderTrack>
                                            <SliderFilledTrack bg='transparent' />

                                            <SliderThumb boxSize={3} height={7} bg='#EAC344' border='2px solid #B8AF73' borderRadius='10px' _focus={{ boxShadow: '0 0 0 2px rgba(234,195,68, 0.6)' }} />
                                        </Slider>

                                        {/* Show the real mapped percentage */}
                                        <Box mt='12px' textAlign='center'>
                                            <Text as='span' ml='4px' fontWeight='bold' color={realSliderPercent >= 0 ? 'green.300' : 'red.300'}>
                                                {realSliderPercent.toFixed(2)}%
                                            </Text>
                                            {realSliderPercent !== 0 && (
                                                <Text as='span' ml='6px' color={realSliderPercent >= 0 ? 'green.300' : 'red.300'}>
                                                    {realSliderPercent >= 0 ? 'above market rate' : 'below market rate'}
                                                </Text>
                                            )}
                                        </Box>
                                    </Box>
                                </Flex>
                            </Flex>
                        </Flex>
                        {/* Bitcoin Amount Out */}
                        <Flex mt='10px' px='10px' bg='#2E1C0C' w='100%' h='105px' border='2px solid #78491F' borderRadius={'10px'}>
                            <Flex direction={'column'} py='10px' px='5px'>
                                <Text color={!btcOutputAmount ? colors.offWhite : colors.textGray} fontSize={'13px'} letterSpacing={'-1px'} fontWeight={'normal'} fontFamily={'Aux'}>
                                    You Recieve
                                </Text>
                                <Input
                                    value={btcOutputAmount}
                                    onChange={handleBitcoinOutputAmountChange}
                                    fontFamily={'Aux'}
                                    border='none'
                                    mt='2px'
                                    mr='-5px'
                                    ml='-5px'
                                    p='0px'
                                    letterSpacing={'-6px'}
                                    color={colors.offWhite}
                                    _active={{ border: 'none', boxShadow: 'none' }}
                                    _focus={{ border: 'none', boxShadow: 'none' }}
                                    _selected={{ border: 'none', boxShadow: 'none' }}
                                    fontSize='40px'
                                    placeholder='0.0'
                                    _placeholder={{ color: '#805530' }}
                                />
                                <Text
                                    color={!btcOutputAmount ? colors.offWhite : colors.textGray}
                                    fontSize={'13px'}
                                    mt='2px'
                                    ml='1px'
                                    letterSpacing={'-1.5px'}
                                    fontWeight={'normal'}
                                    fontFamily={'Aux'}>
                                    ≈ {bitcoinOutputAmountUSD}
                                </Text>
                            </Flex>
                            <Spacer />
                            <Flex mt='8px' mr='6px'>
                                <AssetTag assetName='BTC' />
                            </Flex>
                        </Flex>
                    </Flex>
                </Flex>
            </Flex>

            <Flex mt='10px' direction={'column'} overflow={'visible'}>
                <Flex direction='column' align='center' overflow={'visible'}>
                    <Flex w='100%' overflow={'visible'} direction={'column'}>
                        {/* BTC Payout Address */}
                        {/* <Text ml='8px' mt='10px' w='100%' mb='10px' fontSize='14px' fontFamily={FONT_FAMILIES.NOSTROMO} color={colors.offWhite}>
                            Bitcoin Payout Address
                        </Text>
                        <Flex mt='-2px' mb='10px' px='10px' bg='#111' border='2px solid #565656' w='100%' h='60px' borderRadius={'10px'}>
                            <Flex direction={'row'} py='6px' px='5px'>
                                <Input
                                    value={payoutBTCAddress}
                                    onChange={handleBTCPayoutAddressChange}
                                    fontFamily={'Aux'}
                                    border='none'
                                    mt='3.5px'
                                    mr='75px'
                                    ml='-4px'
                                    p='0px'
                                    w='585px'
                                    letterSpacing={'-6px'}
                                    color={colors.offWhite}
                                    _active={{ border: 'none', boxShadow: 'none' }}
                                    _focus={{ border: 'none', boxShadow: 'none' }}
                                    _selected={{ border: 'none', boxShadow: 'none' }}
                                    fontSize='28px'
                                    placeholder='bc1q5d7rjq7g6rd2d94ca69...'
                                    _placeholder={{ color: colors.darkerGray }}
                                    spellCheck={false}
                                />

                                {payoutBTCAddress.length > 0 && (
                                    <Flex ml='-5px'>
                                        <BitcoinAddressValidation address={payoutBTCAddress} />
                                    </Flex>
                                )}
                            </Flex>
                        </Flex> */}

                        {/* Deposit Button */}
                        <Flex
                            alignSelf={'center'}
                            bg={isConnected ? (coinbaseBtcDepositAmount && btcOutputAmount && payoutBTCAddress ? colors.purpleBackground : colors.purpleBackgroundDisabled) : colors.purpleBackground}
                            _hover={{ bg: colors.purpleHover }}
                            w='300px'
                            mt='12px'
                            transition={'0.2s'}
                            h='45px'
                            onClick={async () => {
                                console.log('coinbaseBtcDepositAmount:', coinbaseBtcDepositAmount);
                                console.log('btcOutputAmount:', btcOutputAmount);
                                console.log('payoutBTCAddress:', payoutBTCAddress);
                                if (coinbaseBtcDepositAmount && btcOutputAmount && payoutBTCAddress && validateBitcoinPayoutAddress(payoutBTCAddress)) {
                                    initiateDeposit();
                                } else toastError('', { title: 'Invalid Bitcoin Address', description: 'Please input a valid Segwit (bc1q...) Bitcoin payout address' });
                            }}
                            fontSize={'15px'}
                            align={'center'}
                            userSelect={'none'}
                            cursor={'pointer'}
                            borderRadius={'10px'}
                            justify={'center'}
                            border={coinbaseBtcDepositAmount && btcOutputAmount && payoutBTCAddress && validateBitcoinPayoutAddress(payoutBTCAddress) ? '3px solid #445BCB' : '3px solid #3242a8'}>
                            <Text
                                color={coinbaseBtcDepositAmount && btcOutputAmount && payoutBTCAddress && validateBitcoinPayoutAddress(payoutBTCAddress) ? colors.offWhite : colors.darkerGray}
                                fontFamily='Nostromo'>
                                {isConnected ? 'Continue' : 'Connect Wallet'}
                            </Text>
                        </Flex>
                    </Flex>
                </Flex>
            </Flex>
            <DepositStatusModal isOpen={isModalOpen} onClose={handleModalClose} status={depositLiquidityStatus} error={depositLiquidityError} txHash={txHash} />
        </Flex>
    );
};
