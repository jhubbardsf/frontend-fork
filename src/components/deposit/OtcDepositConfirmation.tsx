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

export const OtcDepositConfirmation = ({}) => {
    const { isMobile } = useWindowSize();
    const router = useRouter();
    const fontSize = isMobile ? '20px' : '20px';

    const { openConnectModal } = useConnectModal();
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { chains, error, switchChain } = useSwitchChain();
    const { data: walletClient } = useWalletClient();
    const { depositLiquidity, status: depositLiquidityStatus, error: depositLiquidityError, txHash, resetDepositState } = useDepositLiquidity();
    const ethersRpcProvider = useStore.getState().ethersRpcProvider;
    const bitcoinPriceUSD = useStore((state) => state.bitcoinPriceUSD);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);

    const usdtDepositAmount = useStore((state) => state.usdtDepositAmount);
    const setUsdtDepositAmount = useStore((state) => state.setUsdtDepositAmount);
    const btcOutputAmount = useStore((state) => state.btcOutputAmount);
    const setBtcOutputAmount = useStore((state) => state.setBtcOutputAmount);

    const [usdtDepositAmountUSD, setUsdtDepositAmountUSD] = useState('0.00');

    const [profitPercentage, setProfitPercentage] = useState('');
    const [profitAmountUSD, setProfitAmountUSD] = useState('0.00');

    const [bitcoinOutputAmountUSD, setBitcoinOutputAmountUSD] = useState('0.00');
    const [payoutBTCAddress, setPayoutBTCAddress] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isWaitingForConnection, setIsWaitingForConnection] = useState(false);
    const [isWaitingForCorrectNetwork, setIsWaitingForCorrectNetwork] = useState(false);
    const usdtPriceUSD = useStore.getState().validAssets[selectedInputAsset.name].priceUSD;
    const [editExchangeRateMode, setEditExchangeRateMode] = useState(false);
    const setDepositFlowState = useStore((state) => state.setDepositFlowState);
    const actualBorderColor = '#323232';
    const borderColor = `2px solid ${actualBorderColor}`;
    const { isOpen, onOpen, onClose } = useDisclosure();
    const setBtcInputSwapAmount = useStore((state) => state.setBtcInputSwapAmount);
    const usdtOutputSwapAmount = useStore((state) => state.usdtOutputSwapAmount);
    const setUsdtOutputSwapAmount = useStore((state) => state.setUsdtOutputSwapAmount);

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

    // calculate profit amount in USD
    useEffect(() => {
        const profitAmountUSD = `${(((parseFloat(usdtDepositAmount) * parseFloat(profitPercentage)) / 100) * (usdtPriceUSD ?? 0)).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
        })}`;

        setProfitAmountUSD(!profitPercentage || !usdtDepositAmount || profitPercentage == '-' ? '$0.00' : profitAmountUSD);
    }, [usdtDepositAmount, profitPercentage]);

    // calculate deposit amount in USD
    useEffect(() => {
        const usdtDepositAmountUSD =
            usdtPriceUSD && usdtDepositAmount
                ? (usdtPriceUSD * parseFloat(usdtDepositAmount)).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                  })
                : '$0.00';
        setUsdtDepositAmountUSD(usdtDepositAmountUSD);
    }, [usdtDepositAmount]);

    // calculate Bitcoin output amount in USD
    useEffect(() => {
        console.log('bitcoinPriceUSD:', bitcoinPriceUSD);
        const bitcoinOutputAmountUSD =
            bitcoinPriceUSD && btcOutputAmount
                ? (bitcoinPriceUSD * parseFloat(btcOutputAmount)).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                  })
                : '$0.00';
        setBitcoinOutputAmountUSD(bitcoinOutputAmountUSD);
    }, [btcOutputAmount]);

    // ---------- DEPOSIT TOKEN AMOUNT ---------- //
    const handleTokenDepositChange = (e: ChangeEvent<HTMLInputElement>) => {
        const maxDecimals = useStore.getState().validAssets[selectedInputAsset.name].decimals;
        const tokenValue = e.target.value;

        const validateTokenDepositChange = (value: string) => {
            if (value === '') return true;
            const regex = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`);
            return regex.test(value);
        };

        if (validateTokenDepositChange(tokenValue)) {
            setUsdtDepositAmount(tokenValue);
            calculateBitcoinOutputAmount(tokenValue, undefined);
        }
    };

    // ---------- PROFIT PERCENTAGE ---------- //
    const handleProfitPercentageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const profitPercentageValue = e.target.value.replace('%', '');

        if (validateProfitPercentage(profitPercentageValue)) {
            setProfitPercentage(profitPercentageValue);
            calculateBitcoinOutputAmount(undefined, profitPercentageValue);
        } else {
            console.log('Invalid profit percentage');
        }
    };

    const handleProfitPercentageFocus = (value: string) => {
        // remove percentage sign and plus/minus sign on focus
        let ProfitPercentageValue = value.replace('%', '').replace(/^\+/, '');
        setProfitPercentage(ProfitPercentageValue);
    };

    const handleProfitPercentageBlur = () => {
        // add percentage sign and plus/minus sign on blur
        if (profitPercentage === '-') setProfitPercentage('');
        else if (profitPercentage !== '') {
            let formattedProfitPercentage = profitPercentage;
            if (!formattedProfitPercentage.endsWith('%')) {
                if (!formattedProfitPercentage.startsWith('-') && /^[0-9]/.test(formattedProfitPercentage)) {
                    // check if it's numeric and not negative
                    formattedProfitPercentage = '+' + formattedProfitPercentage;
                }
                formattedProfitPercentage += '%';
            }
            setProfitPercentage(formattedProfitPercentage);
        }
    };

    const calculateProfitPercent = (bitcoinAmount: string) => {
        const startValue = parseFloat(usdtDepositAmount);
        const endValue = parseFloat(bitcoinAmount) * useStore.getState().validAssets[selectedInputAsset.name].exchangeRateInTokenPerBTC;

        const newProfitPercentage = (((endValue - startValue) / startValue) * 100).toFixed(2);
        if (validateProfitPercentage(newProfitPercentage)) {
            let formattedProfitPercentage = newProfitPercentage;
            if (!formattedProfitPercentage.startsWith('-') && /^[0-9]/.test(formattedProfitPercentage)) {
                // check if it's numeric and not negative
                formattedProfitPercentage = '+' + formattedProfitPercentage;
            }
            formattedProfitPercentage += '%';
            setProfitPercentage(formattedProfitPercentage);
        }
    };

    const validateProfitPercentage = (value) => {
        // max 2 decimal places and optional minus sign
        if (value === '') return true;
        const regex = /^-?\d*(\.\d{0,2})?$/;
        return regex.test(value);
    };

    // ---------- BITCOIN OUTPUT AMOUNT ---------- //
    const handleBitcoinOutputAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
        const bitcoinOutputAmountValue = e.target.value;

        if (validateBitcoinOutputAmount(bitcoinOutputAmountValue)) {
            setBtcOutputAmount(bitcoinOutputAmountValue === '0.0' ? '' : bitcoinOutputAmountValue);
            calculateProfitPercent(bitcoinOutputAmountValue);
        }
    };

    const calculateBitcoinOutputAmount = (newEthDepositAmount: string | undefined, newProfitPercentage: string | undefined) => {
        if (usdtPriceUSD && bitcoinPriceUSD) {
            console.log('newProfitPercentage:', newProfitPercentage);
            const profitAmountInToken = parseFloat(newEthDepositAmount ?? usdtDepositAmount) * (parseFloat(newProfitPercentage ?? profitPercentage) / 100);
            const totalTokenUSD = parseFloat(newEthDepositAmount ?? usdtDepositAmount) * usdtPriceUSD + profitAmountInToken * usdtPriceUSD;
            const newBitcoinOutputAmount = totalTokenUSD / bitcoinPriceUSD > 0 ? totalTokenUSD / bitcoinPriceUSD : 0;
            const formattedBitcoinOutputAmount = newBitcoinOutputAmount == 0 ? '0.0' : newBitcoinOutputAmount.toFixed(7);

            if (validateBitcoinOutputAmount(formattedBitcoinOutputAmount)) {
                setBtcOutputAmount(formattedBitcoinOutputAmount === '0.0' ? '' : formattedBitcoinOutputAmount);
            }
            // calculate the profit amount in USD

            const profitAmountUSD = `${(((parseFloat(usdtDepositAmount) * parseFloat(newProfitPercentage ?? profitPercentage)) / 100) * usdtPriceUSD).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
            })}`;
            setProfitAmountUSD(profitAmountUSD);

            // calculate and update the deposit amount in USD
            console.log('tokenDepositAmount:', usdtDepositAmount);
            const usdtDepositAmountUSD =
                usdtPriceUSD && usdtDepositAmount
                    ? (usdtPriceUSD * parseFloat(usdtDepositAmount)).toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                      })
                    : '$0.00';
            setUsdtDepositAmountUSD(usdtDepositAmountUSD);
        }
    };

    const validateBitcoinOutputAmount = (value: string) => {
        if (value === '') return true;
        const regex = /^\d*\.?\d*$/;
        return regex.test(value);
    };

    // ---------- BTC PAYOUT ADDRESS ---------- //
    const handleBTCPayoutAddressChange = (e) => {
        const BTCPayoutAddress = e.target.value;
        setPayoutBTCAddress(BTCPayoutAddress);
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
            setUsdtDepositAmount('');
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
    // ---------- DEPOSIT ---------- //

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
            const tokenDepositAmountInSmallestTokenUnits = parseUnits(usdtDepositAmount, tokenDecmials);
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

    return (
        <Flex w='100%' h='100%' flexDir={'column'} userSelect={'none'} fontSize={'12px'} fontFamily={FONT_FAMILIES.AUX_MONO} color={'#c3c3c3'} fontWeight={'normal'} overflow={'visible'} gap={'0px'}>
            <Text align='center' w='100%' mb='24px' fontSize='24px' fontFamily={FONT_FAMILIES.NOSTROMO} color={colors.offWhite}>
                INITIATE OTC SWAP
            </Text>

            {/* INSTRUCTIONAL TEXT  */}
            <Text mb='10px' justifyContent='center' w='100%' fontSize={'13px'} letterSpacing={'-1px'} textAlign={'center'}>
                Create an OTC swap by setting the exchange rate and recipiant's USDC payout address. Your deposit will be locked for 8 hours or until your counterparty proves they paid you the agreed
                upon amount of <OrangeText> Bitcoin.</OrangeText>
            </Text>

            <Flex mt='25px' direction={'column'} overflow={'visible'}>
                {/* Content */}
                <Flex direction='column' align='center' overflow={'visible'}>
                    <Flex w='100%' overflow={'visible'} direction={'column'}>
                        {/* Deposit Input */}
                        <Flex mt='0px' px='10px' bg={selectedInputAsset.dark_bg_color} w='100%' h='105px' border='2px solid' borderColor={selectedInputAsset.bg_color} borderRadius={'10px'}>
                            <Flex direction={'column'} py='10px' px='5px'>
                                <Text color={!usdtDepositAmount ? colors.offWhite : colors.textGray} fontSize={'13px'} letterSpacing={'-1px'} fontWeight={'normal'} fontFamily={'Aux'}>
                                    You Deposit
                                </Text>
                                <Input
                                    value={usdtDepositAmount}
                                    onChange={(e) => {
                                        handleTokenDepositChange(e);
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
                                    color={!usdtDepositAmount ? colors.offWhite : colors.textGray}
                                    fontSize={'13px'}
                                    mt='2px'
                                    ml='1px'
                                    letterSpacing={'-1px'}
                                    fontWeight={'normal'}
                                    fontFamily={'Aux'}>
                                    {usdtDepositAmountUSD}
                                </Text>
                            </Flex>
                            <Spacer />
                            <Flex mr='6px'>
                                <WebAssetTag asset='USDC' />
                            </Flex>
                        </Flex>
                        {/* Profit Percentage Input */}
                        <Flex mt='10px' px='10px' bg='#161A33' w='100%' h='105px' border='2px solid #303F9F' borderRadius={'10px'}>
                            <Flex direction={'column'} py='10px' px='5px'>
                                <Text color={!profitPercentage ? colors.offWhite : colors.textGray} fontSize={'13px'} letterSpacing={'-1px'} fontWeight={'normal'} fontFamily={'Aux'}>
                                    Your Profit %
                                </Text>
                                <Input
                                    value={profitPercentage}
                                    onChange={(e) => {
                                        handleProfitPercentageChange(e);
                                    }}
                                    onBlur={handleProfitPercentageBlur}
                                    onFocus={() => handleProfitPercentageFocus(profitPercentage)}
                                    fontFamily={'Aux'}
                                    border='none'
                                    mt='2px'
                                    mr='-120px'
                                    ml='-5px'
                                    p='0px'
                                    letterSpacing={'-6px'}
                                    color={colors.offWhite}
                                    _active={{ border: 'none', boxShadow: 'none' }}
                                    _focus={{ border: 'none', boxShadow: 'none' }}
                                    _selected={{ border: 'none', boxShadow: 'none' }}
                                    fontSize='40px'
                                    placeholder='0.0'
                                    _placeholder={{ color: '#5C63A3' }}
                                />
                                <Text color={!profitPercentage ? colors.offWhite : colors.textGray} fontSize={'13px'} mt='2px' ml='1px' letterSpacing={'-1px'} fontWeight={'normal'} fontFamily={'Aux'}>
                                    ≈ {profitAmountUSD}
                                </Text>
                            </Flex>
                            <Spacer />
                            <Flex
                                alignSelf={'center'}
                                mr='6px'
                                w='220px'
                                h='60px'
                                bg='#222753'
                                fontSize={'12px'}
                                align='center'
                                letterSpacing={'-1px'}
                                justify='center'
                                border='2px solid #3C4ABB'
                                borderRadius={'10px'}
                                textAlign='center'
                                direction='column'>
                                <Text color={colors.offWhite}>Your Exchange Rate</Text>
                                <Text>
                                    1 BTC = {/* amount of deposit asset / amount of BTC out ) * deposit asset price in USD */}
                                    {usdtDepositAmount && btcOutputAmount
                                        ? ((parseFloat(usdtDepositAmount) / parseFloat(btcOutputAmount)) * usdtPriceUSD).toLocaleString('en-US', {
                                              style: 'currency',
                                              currency: 'USD',
                                          })
                                        : '$0.00'}{' '}
                                    {selectedInputAsset.name}
                                </Text>
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
                        {/* <Text ml='8px' mt='15px' w='100%' mb='10px' fontSize='14px' fontFamily={FONT_FAMILIES.NOSTROMO} color={colors.offWhite}>
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

                        {/* Fees and Swap Time Estimate */}
                        <Flex w='100%' justify={'center'} mb='7px'>
                            <Flex w='62%' justify={'center'} mt='20px'>
                                <Flex w='100%' h='60px' borderRadius={'10px'} overflow={'hidden'} mt='0px' mb='6px' bg={colors.borderGray} borderColor={'#212229'} borderWidth={2}>
                                    <Flex w='50%' align='center' bg={'linear-gradient(180deg, #111219 0%, #0D0E14 100%)'}>
                                        <Flex mx='13px' w='20px'>
                                            <FaLock size={'22px'} color={colors.textGray} />
                                        </Flex>
                                        <Flex direction={'column'}>
                                            <Text fontSize={'11px'} fontFamily={FONT_FAMILIES.NOSTROMO} letterSpacing={-0.3} color={colors.offWhite}>
                                                Reservation Fee
                                            </Text>
                                            <Text fontFamily={FONT_FAMILIES.NOSTROMO} fontSize='10px' fontWeight='normal' color={colors.textGray}>
                                                Free
                                            </Text>
                                        </Flex>
                                    </Flex>
                                    <Flex w='50%' align='center' bg={'linear-gradient(180deg, #212229 0%, #1A1B20 100%)'}>
                                        <Flex mx='15px'>
                                            <FaClock size={'24px'} color={colors.textGray} />
                                        </Flex>
                                        <Flex direction={'column'}>
                                            <Text fontSize={'11px'} fontFamily={FONT_FAMILIES.NOSTROMO} letterSpacing={-0.3} color={colors.offWhite}>
                                                Estimated Swap Time
                                            </Text>{' '}
                                            <Text fontSize={'10px'} fontFamily={FONT_FAMILIES.NOSTROMO} color={colors.textGray}>
                                                20-30 Minutes
                                            </Text>
                                        </Flex>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Flex>

                        {/* Deposit Button */}
                        <Flex
                            alignSelf={'center'}
                            bg={isConnected ? (usdtDepositAmount && btcOutputAmount && payoutBTCAddress ? colors.purpleBackground : colors.purpleBackgroundDisabled) : colors.purpleBackground}
                            _hover={{ bg: colors.purpleHover }}
                            w='300px'
                            mt='10px'
                            transition={'0.2s'}
                            h='45px'
                            onClick={async () => {
                                console.log('usdtDepositAmount:', usdtDepositAmount);
                                console.log('btcOutputAmount:', btcOutputAmount);
                                console.log('payoutBTCAddress:', payoutBTCAddress);
                                if (usdtDepositAmount && btcOutputAmount && payoutBTCAddress && validateBitcoinPayoutAddress(payoutBTCAddress)) {
                                    initiateDeposit();
                                } else toastError('', { title: 'Invalid Bitcoin Address', description: 'Please input a valid Segwit (bc1q...) Bitcoin payout address' });
                            }}
                            fontSize={'15px'}
                            align={'center'}
                            userSelect={'none'}
                            cursor={'pointer'}
                            borderRadius={'10px'}
                            justify={'center'}
                            border={usdtDepositAmount && btcOutputAmount && payoutBTCAddress && validateBitcoinPayoutAddress(payoutBTCAddress) ? '3px solid #445BCB' : '3px solid #3242a8'}>
                            <Text
                                color={usdtDepositAmount && btcOutputAmount && payoutBTCAddress && validateBitcoinPayoutAddress(payoutBTCAddress) ? colors.offWhite : colors.darkerGray}
                                fontFamily='Nostromo'>
                                {isConnected ? 'Deposit Liquidity' : 'Connect Wallet'}
                            </Text>
                        </Flex>
                    </Flex>
                </Flex>
            </Flex>
            <DepositStatusModal isOpen={isModalOpen} onClose={handleModalClose} status={depositLiquidityStatus} error={depositLiquidityError} txHash={txHash} />
        </Flex>
    );
};
