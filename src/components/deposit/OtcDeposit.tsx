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
import type { ChangeEvent } from 'react';
import { useEffect, useState, useRef, use } from 'react';
import styled from 'styled-components';
import { colors } from '../../utils/colors';
import { BTCSVG, Coinbase_BTC_Card, ETHSVG, InfoSVG } from '../other/SVGs';
import { useConnectModal } from '../../hooks/useReownConnect';
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi';
import {
    ethToWei,
    weiToEth,
    btcToSats,
    satsToBtc,
    bufferTo18Decimals,
    convertToBitcoinLockingScript,
    addNetwork,
    validateBitcoinPayoutAddress,
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
import { BITCOIN_DECIMALS, DEVNET_DATA_ENGINE_URL, opaqueBackgroundColor } from '../../utils/constants';
import { ArrowRightIcon, CheckCircleIcon, CheckIcon, ChevronLeftIcon, SettingsIcon } from '@chakra-ui/icons';
import { HiOutlineXCircle, HiXCircle } from 'react-icons/hi';
import { IoCheckmarkDoneCircle } from 'react-icons/io5';
import { IoMdCheckmarkCircle } from 'react-icons/io';
import { AssetTag } from '../other/AssetTag';
import { FaClock, FaRegArrowAltCircleRight, FaLock, FaArrowRight } from 'react-icons/fa';
import * as bitcoin from 'bitcoinjs-lib';
import { addChain } from 'viem/actions';
import { createWalletClient, custom } from 'viem';
import { toastError } from '../../hooks/toast';
import WebAssetTag from '../other/WebAssetTag';
import { DepositAmounts } from './DepositAmounts';
import { MdArrowRight } from 'react-icons/md';
import { getTipProof } from '../../utils/dataEngineClient';
import BitcoinAddressValidation from '../other/BitcoinAddressValidation';

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
        // exchange rate manual input
        <Flex position='relative' display='inline-flex' alignItems='center' zIndex={37}>
            <Box
                as='span'
                ref={spanRef}
                position='absolute'
                visibility='hidden'
                whiteSpace='pre'
                fontFamily='Aux'
                fontSize='20px'
                letterSpacing='-3px'
            />
            <Input
                ref={inputRef}
                bg={value > 1 ? '#296746' : '#584539'}
                value={value}
                onChange={onChange}
                cursor={'text'}
                fontFamily='Aux'
                border={value > 1 ? '2px solid #548148' : '2px solid #C86B6B'}
                borderRadius='8px'
                mt='2px'
                textAlign='right'
                h='34px'
                minWidth='20px'
                letterSpacing='-3px'
                pr='20px'
                pt='2px'
                pl='0px'
                color={colors.offWhite}
                _active={{ border: 'none', boxShadow: 'none' }}
                _focus={{ border: 'none', boxShadow: 'none', paddingRight: '22px', backgroundColor: '#685549' }}
                _selected={{ border: 'none', boxShadow: 'none' }}
                fontSize='20px'
                placeholder='1.0'
                _placeholder={{ color: '#888' }}
            />
            <Text color={colors.offWhite} ml='6px' mt='1px' letterSpacing='-1px' fontSize={'16px'}>
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
    const {
        depositLiquidity,
        status: depositLiquidityStatus,
        error: depositLiquidityError,
        txHash,
        resetDepositState,
    } = useDepositLiquidity();
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
    const [showConfirmationScreen, setShowConfirmationScreen] = useState(false);
    const [otcRecipientBaseAddress, setOtcRecipientUSDCAddress] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isWaitingForConnection, setIsWaitingForConnection] = useState(false);
    const [isWaitingForCorrectNetwork, setIsWaitingForCorrectNetwork] = useState(false);
    const findAssetByName = useStore.getState().findAssetByName;
    const btcPriceUSD = findAssetByName('BTC')?.priceUSD || 0;
    const coinbasebtcPriceUSD = findAssetByName('CoinbaseBTC')?.priceUSD || 0;
    const validAssets = useStore((state) => state.validAssets);
    const setDepositFlowState = useStore((state) => state.setDepositFlowState);
    const setBtcInputSwapAmount = useStore((state) => state.setBtcInputSwapAmount);
    const [isEthereumPayoutAddressValid, setIsEthereumPayoutAddressValid] = useState<boolean>(false);
    const [sliderT, setSliderT] = useState(0.5); // start at middle
    const [blockConfirmationsSliderValue, setBlockConfirmationsSlider] = useState(2); // 2 block confs default
    const userEthAddress = useStore((state) => state.userEthAddress);
    const tickPercents = [-10, -6, -3, -1, 0, 1, 3, 6, 10];
    const blockConfirmationOptions = [2, 3, 4, 5, 6];
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
                const newBitcoinOutputAmount =
                    parseFloat(coinbaseBtcDepositAmount) * parseFloat(coinbaseBtcPerBtcExchangeRate);
                const formattedBitcoinOutputAmount =
                    newBitcoinOutputAmount == 0 ? '0.0' : newBitcoinOutputAmount.toFixed(BITCOIN_DECIMALS);

                if (validateBitcoinAmount(formattedBitcoinOutputAmount)) {
                    // setBtcOutputAmount(formattedBitcoinOutputAmount === '0.0' ? '' : formattedBitcoinOutputAmount);
                }
            }
        };

        calculateBitcoinOutputAmount();
    }, [coinbaseBtcPerBtcExchangeRate, coinbaseBtcDepositAmount]);

    // [5] calculate exchange rate upon btc output amount change
    // TODO - fix this useeffect causing the unfocusing of the exchange rate and output amount input fields
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
        const otcRecipientBaseAddress = e.target.value;
        setOtcRecipientUSDCAddress(otcRecipientBaseAddress);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        if (depositLiquidityStatus === DepositStatus.Confirmed) {
            setCoinbaseBtcDepositAmount('');
            setCoinbaseBtcDepositAmountUSD('');
            setOtcRecipientUSDCAddress('');
            setBlockConfirmationsSlider(2);
            setBtcOutputAmount('');
            setBitcoinOutputAmountUSD('');
            setShowConfirmationScreen(false);
        }
    };

    // ---------- INITIATE DEPOSIT LOGIC ---------- //
    const initiateDeposit = async () => {
        // this function ensures user is connected, and switched to the correct chain before proceeding with the deposit attempt
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

            // gather tip block data TODO - ALPINE
            const tipProof = await getTipProof(selectedInputAsset.dataEngineUrl);

            console.log('[alpine] tipProof', tipProof);

            // [2] deposit liquidity
            await depositLiquidity({
                signer: signer,
                riftExchangeAbi: selectedInputAsset.riftExchangeAbi,
                riftExchangeContractAddress: selectedInputAsset.riftExchangeContractAddress,
                tokenAddress: selectedInputAsset.tokenAddress,
                params: {
                    depositOwnerAddress: userEthAddress,
                    specifiedPayoutAddress: otcRecipientBaseAddress,
                    depositAmount: depositAmountInSmallestTokenUnit, // renamed from depositAmountInSmallestTokenUnit
                    expectedSats: bitcoinOutputAmountInSats,
                    btcPayoutScriptPubKey: btcPayoutScriptPubKey,
                    depositSalt: generatedDepositSalt, // TODO: check contract for deposit salt input type
                    confirmationBlocks: blockConfirmationsSliderValue, // TODO - make this an advanced settings slider (between 2-6?)
                    safeBlockLeaf: tipProof.leaf,
                    safeBlockSiblings: tipProof.siblings,
                    safeBlockPeaks: tipProof.peaks,
                },
            });
        }
    };

    // ---------- HELPER FUNCTIONS ---------- //
    const validateBitcoinAmount = (value: string) => {
        if (value === '') return true;
        const regex = new RegExp(`^\\d*\\.?\\d{0,${BITCOIN_DECIMALS}}$`);
        return regex.test(value);
    };

    const validateEthereumPayoutAddress = (address: string): boolean => {
        const ethereumRegex = /^0x[a-fA-F0-9]{40}$/;
        return ethereumRegex.test(address);
    };

    const EthereumAddressValidation: React.FC<{ address: string }> = ({ address }) => {
        const isValid = validateEthereumPayoutAddress(address);
        setIsEthereumPayoutAddressValid(isValid);

        if (address.length === 0) {
            return <Text>...</Text>;
        }

        return (
            <Flex
                align='center'
                fontFamily={FONT_FAMILIES.NOSTROMO}
                ml='-45px'
                mr='0px'
                h='100%'
                justify='center'
                direction='column'>
                {isValid ? (
                    <Flex mr='-148px' direction={'column'} align={'center'}>
                        <IoMdCheckmarkCircle color={colors.greenOutline} size={'25px'} />
                        <Text fontSize={'10px'} mt='3px' color={colors.greenOutline}>
                            Valid
                        </Text>
                    </Flex>
                ) : (
                    <Flex w='160px' ml='0px' mt='-3px' align='cetner'>
                        <Flex mt='5px'>
                            <HiXCircle color='red' size={'35px'} />
                        </Flex>
                        <Text fontSize={'9px'} w='70px' mt='3px' ml='5px' color='red'>
                            Invalid <br /> Base Address
                        </Text>
                    </Flex>
                )}
            </Flex>
        );
    };

    return (
        <Flex
            w='100%'
            h='100%'
            flexDir={'column'}
            userSelect={'none'}
            fontSize={'12px'}
            fontFamily={FONT_FAMILIES.AUX_MONO}
            color={'#c3c3c3'}
            fontWeight={'normal'}
            overflow={'visible'}
            gap={'0px'}>
            {showConfirmationScreen && (
                <Flex w='100%' mt='-5px' mb='-35px' ml='0px'>
                    <Button
                        bg='none'
                        w='12px'
                        _hover={{ bg: colors.borderGray }}
                        onClick={() => setShowConfirmationScreen(false)}>
                        <ChevronLeftIcon width={'40px'} height={'40px'} bg='none' color={colors.offWhite} />
                    </Button>
                </Flex>
            )}
            <Text
                align='center'
                w='100%'
                mb='12px'
                fontSize='25px'
                fontFamily={FONT_FAMILIES.NOSTROMO}
                color={colors.offWhite}>
                DIRECT OTC SWAP
            </Text>

            {/* INSTRUCTIONAL TEXT  */}
            {!showConfirmationScreen && (
                <Text
                    mb='8px'
                    justifyContent='center'
                    w='100%'
                    fontSize={'14px'}
                    letterSpacing={'-1px'}
                    textAlign={'center'}>
                    Create a direct OTC swap if you know your counterparty. Set your exchange rate and recipiant's Base
                    payout address. Your deposit will be locked for 8 hours or until your counterparty pays you the
                    agreed upon amount of <OrangeText> Bitcoin.</OrangeText>
                </Text>
            )}

            <Flex mt='25px' direction={'column'} overflow={'visible'}>
                {/* Content */}
                {showConfirmationScreen ? (
                    <Flex direction='column' align='center' overflow={'visible'}>
                        {/* Deposit Amounts Info */}
                        <Flex mt='-16px' mb='30px'>
                            <Flex
                                borderRadius='full'
                                h='88px'
                                {...opaqueBackgroundColor}
                                borderWidth={3}
                                borderColor={'rgba(255, 142, 40, 0.55)'}
                                boxShadow='0px 0px 16px 4px rgba(255, 142, 40, 0.2)'
                                px='40px'
                                fontFamily={FONT_FAMILIES.AUX_MONO}
                                fontWeight='normal'
                                py='3px'>
                                <>
                                    <Flex ml='-3px' direction='column'>
                                        <Flex>
                                            <Text
                                                mr='15px'
                                                fontSize='36px'
                                                letterSpacing='-6px'
                                                color={colors.offWhite}>
                                                {coinbaseBtcDepositAmount}
                                            </Text>
                                            <Flex mt='-16px' mb='-5px' ml='-4px'>
                                                {/* <WebAssetTag asset='CoinbaseBTC' /> */}
                                                <Coinbase_BTC_Card width='114px' />
                                            </Flex>
                                        </Flex>
                                        <Text
                                            color={colors.textGray}
                                            fontSize='13px'
                                            mt='-12px'
                                            ml='6px'
                                            letterSpacing='-2px'
                                            fontWeight='normal'
                                            fontFamily='Aux'>
                                            {coinbaseBtcDepositAmountUSD}
                                        </Text>
                                    </Flex>

                                    <Spacer />
                                    <Flex align='center' ml='-4px' mr='-5px' px='20px' mt='-28px' justify='center'>
                                        <ArrowRightIcon w={'16px'} h='16px' color={'#888'} />
                                    </Flex>
                                    <Spacer />

                                    <Flex direction='column'>
                                        <Flex>
                                            <Text
                                                mr='15px'
                                                fontSize='36px'
                                                letterSpacing='-6px'
                                                color={colors.offWhite}>
                                                {btcOutputAmount}
                                            </Text>
                                            <Flex mt='-15px' mb='-8px'>
                                                <AssetTag assetName='BTC' width='79px' />
                                            </Flex>
                                        </Flex>
                                        <Text
                                            color={colors.textGray}
                                            fontSize='13px'
                                            mt='-10.5px'
                                            ml='6px'
                                            letterSpacing='-2px'
                                            fontWeight='normal'
                                            fontFamily='Aux'>
                                            ≈ {bitcoinOutputAmountUSD}
                                        </Text>
                                    </Flex>
                                </>
                            </Flex>
                        </Flex>
                        {/* Recipient Base Address */}
                        <Text
                            ml='8px'
                            mt='0px'
                            w='100%'
                            mb='10px'
                            fontSize='15px'
                            fontFamily={FONT_FAMILIES.NOSTROMO}
                            color={colors.offWhite}>
                            Recipient Base Address
                        </Text>
                        <Flex
                            mt='-2px'
                            mb='22px'
                            px='10px'
                            bg={selectedInputAsset.dark_bg_color}
                            border='2px solid'
                            borderColor={selectedInputAsset.bg_color}
                            w='100%'
                            h='60px'
                            borderRadius={'10px'}>
                            <Flex direction={'row'} py='6px' px='5px'>
                                <Input
                                    value={otcRecipientBaseAddress}
                                    onChange={handleOtcRecipientBaseAddressChange}
                                    fontFamily={'Aux'}
                                    border='none'
                                    mt='3.5px'
                                    w='620px'
                                    mr='75px'
                                    ml='-4px'
                                    p='0px'
                                    letterSpacing={'-5px'}
                                    color={colors.offWhite}
                                    _active={{ border: 'none', boxShadow: 'none' }}
                                    _focus={{ border: 'none', boxShadow: 'none' }}
                                    _selected={{ border: 'none', boxShadow: 'none' }}
                                    fontSize='28px'
                                    placeholder='0xb0cb90a9a3dfd81...'
                                    _placeholder={{ color: '#5F7192' }}
                                    spellCheck={false}
                                />

                                {otcRecipientBaseAddress.length > 0 && (
                                    <Flex ml='-5px' mt='0px'>
                                        <EthereumAddressValidation address={otcRecipientBaseAddress} />
                                    </Flex>
                                )}
                            </Flex>
                        </Flex>

                        {/* BTC Payout Address */}
                        <Text
                            ml='8px'
                            mt='0px'
                            w='100%'
                            mb='10px'
                            fontSize='15px'
                            fontFamily={FONT_FAMILIES.NOSTROMO}
                            color={colors.offWhite}>
                            Bitcoin Payout Address
                        </Text>
                        <Flex
                            mt='-2px'
                            mb='10px'
                            px='10px'
                            bg='rgba(46, 29, 14, 0.45)'
                            border='2px solid #78491F'
                            w='100%'
                            h='60px'
                            borderRadius={'10px'}>
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
                                    w='620px'
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

                        {/* Block Confirmation Slider */}
                        <Text
                            ml='8px'
                            mt='15px'
                            w='100%'
                            mb='0px'
                            fontSize='15px'
                            fontFamily={FONT_FAMILIES.NOSTROMO}
                            color={colors.offWhite}>
                            Block Confirmations
                        </Text>
                        <Flex
                            mt='10px'
                            mb='10px'
                            px='10px'
                            bg='rgba(25, 54, 38, 0.5)'
                            w='100%'
                            h='90px'
                            border='2px solid #548148'
                            borderRadius={'10px'}
                            justify='center'>
                            <Flex direction={'column'} py='10px' px='5px' w='100%'>
                                <Flex>
                                    <Text
                                        mt='-2px'
                                        mb='-4px'
                                        textAlign={'left'}
                                        color={'#78C86B'}
                                        fontSize={'48px'}
                                        letterSpacing={'-1px'}
                                        fontWeight={'normal'}
                                        p='0px'
                                        fontFamily={'Aux'}>
                                        {blockConfirmationsSliderValue}
                                    </Text>
                                    <Text
                                        textAlign={'left'}
                                        color={colors.offWhite}
                                        fontSize={'13px'}
                                        ml='17px'
                                        letterSpacing={'-1px'}
                                        fontWeight={'normal'}
                                        mt='13px'
                                        fontFamily={'Aux'}>
                                        Estimated Time <br />
                                        <span style={{ color: colors.textGray }}>
                                            ≈ {blockConfirmationsSliderValue}0 minutes
                                        </span>
                                    </Text>
                                </Flex>

                                {/* block confirmations slider */}
                                <Flex w='70%' ml='200px' mt='-112px' zIndex={3}>
                                    <Box mt='55px' w='100%' alignSelf='center'>
                                        <Slider
                                            min={2}
                                            max={6}
                                            step={1}
                                            value={blockConfirmationsSliderValue}
                                            onChange={(val) => setBlockConfirmationsSlider(val)}
                                            aria-label='block-confirmations-slider'>
                                            {blockConfirmationOptions.map((p) => (
                                                <SliderMark
                                                    key={p}
                                                    value={p}
                                                    fontSize='sm'
                                                    fontWeight={'bold'}
                                                    letterSpacing={'-1px'}
                                                    textAlign='center'
                                                    mt='15px'
                                                    ml={'-5px'}>
                                                    {p}
                                                </SliderMark>
                                            ))}
                                            <SliderTrack
                                                h='14px'
                                                borderRadius='20px'
                                                bg='transparent'
                                                position='relative'>
                                                <Box
                                                    position='absolute'
                                                    w='100%'
                                                    h='100%'
                                                    bg='#3C6850'
                                                    borderRadius={'10px'}
                                                    border='2px solid #78C86B'
                                                />
                                            </SliderTrack>
                                            <SliderFilledTrack bg='transparent' />
                                            <SliderThumb
                                                boxSize={3}
                                                height={7}
                                                bg='#EAC344'
                                                border='2px solid #B8AF73'
                                                borderRadius='10px'
                                                _focus={{ boxShadow: '0 0 0 2px rgba(234,195,68, 0.6)' }}
                                            />
                                        </Slider>
                                    </Box>
                                </Flex>
                            </Flex>
                        </Flex>
                    </Flex>
                ) : (
                    <Flex direction='column' align='center' overflow={'visible'}>
                        <Flex w='100%' overflow={'visible'} direction={'column'}>
                            {/* Deposit Input */}
                            <Flex
                                mt='0px'
                                px='10px'
                                bg={selectedInputAsset.dark_bg_color}
                                w='100%'
                                h='105px'
                                border='2px solid'
                                borderColor={selectedInputAsset.bg_color}
                                borderRadius={'10px'}>
                                <Flex direction={'column'} py='10px' px='5px'>
                                    <Text
                                        color={!coinbaseBtcDepositAmount ? colors.offWhite : colors.textGray}
                                        fontSize={'13px'}
                                        letterSpacing={'-1px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
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

                            {/* Exchange Rate Slider Input */}
                            <Flex
                                mt='10px'
                                px='10px'
                                bg='rgba(25, 54, 38, 0.5)'
                                w='100%'
                                h='168px'
                                border='2px solid #548148'
                                borderRadius={'10px'}
                                justify='center'>
                                <Flex direction={'column'} py='10px' px='5px' w='100%'>
                                    <Text
                                        color={colors.offWhite}
                                        fontSize={'13px'}
                                        letterSpacing={'-1px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
                                        Your Exchange Rate
                                    </Text>
                                    {/* exchange rate input */}
                                    <Flex mt='6px' mb='5px' w='100%' justify='flex-start'>
                                        <ExchangeRateInput
                                            value={coinbaseBtcPerBtcExchangeRate}
                                            onChange={(e) => {
                                                handleCoinbaseBtcPerBtcExchangeRateChange(e);
                                            }}
                                        />
                                    </Flex>

                                    {/* exchange rate slider */}
                                    <Flex direction='column' w='100%' mt='-50px' zIndex={3}>
                                        <Box mt='55px' w='100%' alignSelf='center'>
                                            <Slider
                                                min={0}
                                                max={1}
                                                step={0.001}
                                                value={sliderT}
                                                onChange={(val) => setSliderT(val)}
                                                aria-label='exchange-rate-slider'>
                                                {tickPercents.map((p) => {
                                                    const markPosition = sliderFromValue(p);
                                                    return (
                                                        <SliderMark
                                                            key={p}
                                                            value={markPosition}
                                                            fontSize='sm'
                                                            letterSpacing={'-1px'}
                                                            textAlign='center'
                                                            mt='15px'
                                                            ml={p == -10 ? '0px' : p == 10 ? '-38px' : '-14px'}>
                                                            {p < 0 ? `${p}%` : `+${p}%`}
                                                        </SliderMark>
                                                    );
                                                })}
                                                <SliderTrack
                                                    h='14px'
                                                    borderRadius='20px'
                                                    bg='transparent'
                                                    position='relative'>
                                                    <Box
                                                        position='absolute'
                                                        left='0'
                                                        w='50%'
                                                        h='100%'
                                                        bg='#584539'
                                                        borderRadius={'10px 0px 0px 10px'}
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
                                                        borderRadius={'0px 10px 10px 0px'}
                                                        borderRight='2px solid #78C86B'
                                                        borderTop='2px solid #78C86B'
                                                        borderBottom='2px solid #78C86B'
                                                    />
                                                </SliderTrack>
                                                <SliderFilledTrack bg='transparent' />

                                                <SliderThumb
                                                    boxSize={3}
                                                    height={7}
                                                    bg='#EAC344'
                                                    border='2px solid #B8AF73'
                                                    borderRadius='10px'
                                                    _focus={{ boxShadow: '0 0 0 2px rgba(234,195,68, 0.6)' }}
                                                />
                                            </Slider>
                                        </Box>
                                    </Flex>
                                    {/* market rate percentage */}
                                    <Box fontSize='11px' mt='20px' textAlign='center'>
                                        <Text
                                            as='span'
                                            ml='4px'
                                            fontWeight='bold'
                                            color={realSliderPercent >= 0 ? 'green.300' : 'red.300'}>
                                            {realSliderPercent !== 0 && `${realSliderPercent.toFixed(2)}%`}
                                        </Text>
                                        <Text
                                            as='span'
                                            ml='6px'
                                            color={
                                                realSliderPercent !== 0
                                                    ? realSliderPercent >= 0
                                                        ? 'green.300'
                                                        : 'red.300'
                                                    : colors.offWhite
                                            }>
                                            {realSliderPercent !== 0
                                                ? realSliderPercent >= 0
                                                    ? 'above market rate'
                                                    : 'below market rate'
                                                : 'Current Market Rate'}
                                        </Text>
                                    </Box>
                                </Flex>
                            </Flex>
                            {/* Bitcoin Amount Out */}
                            <Flex
                                mt='10px'
                                px='10px'
                                bg='rgba(46, 29, 14, 0.45)'
                                border='2px solid #78491F'
                                w='100%'
                                h='105px'
                                borderRadius={'10px'}>
                                <Flex direction={'column'} py='10px' px='5px'>
                                    <Text
                                        color={!btcOutputAmount ? colors.offWhite : colors.textGray}
                                        fontSize={'13px'}
                                        letterSpacing={'-1px'}
                                        fontWeight={'normal'}
                                        fontFamily={'Aux'}>
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
                )}
            </Flex>

            <Flex mt='10px' direction={'column'} overflow={'visible'}>
                <Flex direction='column' align='center' overflow={'visible'}>
                    <Flex w='100%' overflow={'visible'} direction={'column'}>
                        {/* Deposit Button */}
                        <Flex
                            alignSelf={'center'}
                            bg={
                                isConnected
                                    ? coinbaseBtcDepositAmount && btcOutputAmount && payoutBTCAddress
                                        ? colors.purpleBackground
                                        : colors.purpleBackgroundDisabled
                                    : colors.purpleBackground
                            }
                            _hover={{ bg: colors.purpleHover }}
                            w='300px'
                            mt={showConfirmationScreen ? '15px' : '18px'}
                            mb='5px'
                            transition={'0.2s'}
                            h='45px'
                            onClick={async () => {
                                if (showConfirmationScreen) {
                                    if (
                                        coinbaseBtcDepositAmount &&
                                        btcOutputAmount &&
                                        payoutBTCAddress &&
                                        validateBitcoinPayoutAddress(payoutBTCAddress)
                                    ) {
                                        initiateDeposit();
                                    } else
                                        toastError('', {
                                            title: 'Invalid Bitcoin Address',
                                            description: 'Please input a valid Segwit (bc1q...) Bitcoin payout address',
                                        });
                                } else if (coinbaseBtcDepositAmount && btcOutputAmount) {
                                    setShowConfirmationScreen(true);
                                }
                            }}
                            fontSize={'15px'}
                            align={'center'}
                            userSelect={'none'}
                            cursor={'pointer'}
                            borderRadius={'10px'}
                            justify={'center'}
                            border={
                                showConfirmationScreen
                                    ? coinbaseBtcDepositAmount &&
                                      btcOutputAmount &&
                                      payoutBTCAddress &&
                                      validateBitcoinPayoutAddress(payoutBTCAddress)
                                        ? '3px solid #445BCB'
                                        : '3px solid #3242a8'
                                    : coinbaseBtcDepositAmount && btcOutputAmount
                                      ? '3px solid #445BCB'
                                      : '3px solid #3242a8'
                            }>
                            <Text
                                color={
                                    showConfirmationScreen
                                        ? coinbaseBtcDepositAmount &&
                                          btcOutputAmount &&
                                          payoutBTCAddress &&
                                          validateBitcoinPayoutAddress(payoutBTCAddress)
                                            ? colors.offWhite
                                            : colors.darkerGray
                                        : coinbaseBtcDepositAmount && btcOutputAmount
                                          ? colors.offWhite
                                          : colors.darkerGray
                                }
                                fontFamily='Nostromo'>
                                {!showConfirmationScreen
                                    ? 'Continue'
                                    : isConnected
                                      ? 'Initiate Deposit'
                                      : 'Connect Wallet'}
                            </Text>
                        </Flex>
                    </Flex>
                </Flex>
            </Flex>
            <DepositStatusModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                status={depositLiquidityStatus}
                error={depositLiquidityError}
                txHash={txHash}
            />
        </Flex>
    );
};
