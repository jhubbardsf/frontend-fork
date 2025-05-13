import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '../../../store';
import { Text, Flex, Image, Center, Box, Button, color, Spinner, Input } from '@chakra-ui/react';
import { Navbar } from '../../../components/nav/Navbar';
import { colors } from '../../../utils/colors';
import {
    bufferTo18Decimals,
    calculateBtcOutputAmountFromExchangeRate,
    decodeReservationUrl,
} from '../../../utils/dappHelper';
import CurrencyModal from '../../../components/swap/CurrencyModal';
import { MainSwapFlow } from '../../../components/swap/MainSwapFlow';
import { SwapStatusTimeline } from '../../../components/swap/SwapStatusTimeline';
import { CheckCircleIcon, ChevronLeftIcon } from '@chakra-ui/icons';
import { SwapAmounts } from '../../../components/swap/SwapAmounts';
import { OpenGraph } from '../../../components/background/OpenGraph';
import { ChromeLogoSVG, WarningSVG } from '../../../components/other/SVGs';
import { FONT_FAMILIES } from '../../../utils/font';
import {
    bitcoin_dark_bg_color,
    BITCOIN_DECIMALS,
    FRONTEND_RESERVATION_EXPIRATION_WINDOW_IN_SECONDS,
    opaqueBackgroundColor,
    PROTOCOL_FEE,
    PROTOCOL_FEE_DENOMINATOR,
} from '../../../utils/constants';
import { formatUnits } from 'ethers/lib/utils';
import QRCode from 'qrcode.react';
import swapReservationsAggregatorABI from '../../../abis/SwapReservationsAggregator.json';
import { BigNumber } from 'ethers';
import depositVaultAggregatorABI from '../../../abis/DepositVaultsAggregator.json';
import { parseUnits } from 'viem';
import { bitcoin } from 'bitcoinjs-lib/src/networks';
import { LuCopy } from 'react-icons/lu';
import { AssetTag } from '../../../components/other/AssetTag';
import { FaClock } from 'react-icons/fa';

const ReservationDetails = () => {
    const router = useRouter();
    const { swapReservationURL } = router.query;
    const setSwapFlowState = useStore((state) => state.setSwapFlowState);
    const swapFlowState = useStore((state) => state.swapFlowState);
    const [address, setAddress] = useState('');
    const [loadingState, setLoadingState] = useState(true);
    const [error, setError] = useState('');
    const [totalSwapAmountInSats, setTotalSwapAmountInSats] = useState(0);
    const [bitcoinUri, setBitcoinUri] = useState(null);
    const lowestFeeReservationParams = useStore((state) => state.lowestFeeReservationParams);
    const bitcoinSwapTransactionHash = useStore((state) => state.bitcoinSwapTransactionHash);
    const setBitcoinSwapTransactionHash = useStore((state) => state.setBitcoinSwapTransactionHash);
    const ethersRpcProvider = useStore.getState().ethersRpcProvider;
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const btcInputSwapAmount = useStore((state) => state.btcInputSwapAmount);
    const setBtcInputSwapAmount = useStore((state) => state.setBtcInputSwapAmount);
    const userSwapsFromAddress = useStore((state) => state.userSwapsFromAddress);
    const [proxyWalletSwapInternalID, setProxyWalletSwapInternalID] = useState('');
    const currentReservationState = useStore((state) => state.currentReservationState);
    const setCurrentReservationState = useStore((state) => state.setCurrentReservationState);
    const swapReservationNotFound = useStore((state) => state.swapReservationNotFound);
    const setSwapReservationNotFound = useStore((state) => state.setSwapReservationNotFound);
    const currentTotalBlockConfirmations = useStore((state) => state.currentTotalBlockConfirmations);
    const confirmationBlocksNeeded = useStore((state) => state.confirmationBlocksNeeded);
    const [timeLeft, setTimeLeft] = useState('');
    const setProxyWalletSwapStatus = useStore((state) => state.setProxyWalletSwapStatus);
    const [minutesLeft, setMinutesLeft] = useState(0);
    const [dumpWalletMode, setDumpWalletMode] = useState(false);
    const [dumpWalletAddress, setDumpWalletAddress] = useState('');
    const [aggregateProxyBalance, setAggregateProxyBalance] = useState(0);
    const [isWalletDumped, setIsWalletDumped] = useState(false);

    useEffect(() => {
        const fetchAggregateProxyBalance = async () => {
            try {
                const balance = await window.rift.getAggregateProxyBalance();
                console.log('procbrother balance', balance);
                setAggregateProxyBalance(balance);
            } catch (error) {
                console.error('Error fetching aggregate proxy balance:', error);
            }
        };

        fetchAggregateProxyBalance();

        const intervalId = setInterval(fetchAggregateProxyBalance, 5000);

        return () => clearInterval(intervalId);
    }, []);

    // useEffect(() => {
    //     const calculateTimeLeft = () => {
    //         const reservationTime = new Date(swapReservationData?.reservationTimestamp * 1000);
    //         const endTime = new Date(reservationTime.getTime() + FRONTEND_RESERVATION_EXPIRATION_WINDOW_IN_SECONDS * 1000); // Add 1 hour
    //         const now = new Date();
    //         const difference = endTime.getTime() - now.getTime();
    //         if (difference > 0) {
    //             const minutes = Math.floor(difference / (1000 * 60));
    //             const seconds = Math.floor((difference / 1000) % 60);

    //             setMinutesLeft(minutes);
    //             return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    //         }

    //         setMinutesLeft(0);
    //         return;
    //     };

    //     const timer = setInterval(() => {
    //         setTimeLeft(calculateTimeLeft());
    //     }, 1000);

    //     return () => clearInterval(timer);
    // }, [swapReservationData?.reservationTimestamp]);

    const handleNavigation = (route: string) => {
        router.push(route);
    };
    useEffect(() => {
        if (typeof window !== 'undefined' && address && totalSwapAmountInSats) {
            const uri = `bitcoin:${address}?amount=${formatUnits(totalSwapAmountInSats, BITCOIN_DECIMALS)}&label=Rift%20Exchange%20Swap`;
            setBitcoinUri(uri);
        }
    }, [address, lowestFeeReservationParams, totalSwapAmountInSats]);

    // useEffect(() => {
    //     if (!address || !totalSwapAmountInSats || btcInputSwapAmount === '-1' || usdtOutputSwapAmount === '-1' || !btcInputSwapAmount || !usdtOutputSwapAmount) {
    //         setLoadingState(true);
    //     } else {
    //         setLoadingState(false);
    //     }
    // }, [address, totalSwapAmountInSats]);

    // useEffect(() => {
    //     setSwapFlowState('2-send-bitcoin');
    //     setBtcInputSwapAmount('-1');
    //     setUsdtOutputSwapAmount('-1');
    // }, []);

    // constantly look for swap status updates from proxy wallet
    // useEffect(() => {
    //     const checkSwapStatus = async () => {
    //         console.log('checkSwapStatus called');
    //         // @ts-ignore
    //         if (typeof window === 'undefined' || !window.rift || !window.rift.getRiftSwapStatus || !swapReservationData) {
    //             setError('Rift wallet not detected or getRiftSwapStatus not available.');
    //             return;
    //         }

    //         setError(null);

    //         if (swapReservationData) {
    //             // @ts-ignore
    //             const walletInfo = await window.rift.getProxyWallet({ orderNonceHex: swapReservationData.nonce });
    //             if (walletInfo && walletInfo.address) {
    //                 setAddress(walletInfo.address);
    //             } else {
    //                 setError('Unable to retrieve Bitcoin address from wallet info.');
    //             }
    //         }

    //         if (typeof window !== 'undefined') {
    //             // @ts-ignore
    //             window.rift
    //                 .getRiftSwapStatus({ internalId: swapReservationData.nonce })
    //                 .then((status) => {
    //                     console.log('Swap status from proxy wallet:', status);
    //                     console.log('Swap flow state:', swapFlowState);
    //                     console.log('Current reservation state:', currentReservationState);

    //                     // check currentReservationState
    //                     if (currentReservationState && currentReservationState === 'Completed') {
    //                         console.log('Setting Swap status to 4-completed');
    //                         setSwapFlowState('4-completed');
    //                     } else if (status.status === 1 && currentReservationState === 'Created') {
    //                         console.log('Setting Swap status to 3-receive-evm-token');
    //                         setSwapFlowState('3-receive-evm-token');
    //                         setProxyWalletSwapStatus(status.status);
    //                         setBitcoinSwapTransactionHash(status.paymentTxid);
    //                     }
    //                     setProxyWalletSwapInternalID(status.internalId);
    //                 })
    //                 .catch((err) => {
    //                     console.error('Error fetching swap status:', err);
    //                 });
    //         }
    //     };

    //     checkSwapStatus();
    //     const intervalId = setInterval(checkSwapStatus, 1000); // check every second
    //     return () => clearInterval(intervalId);
    // }, [swapReservationData?.nonce]);

    const dumpWallet = async () => {
        const dumpWalletResult = await window.rift.sweepKeysToWallet(dumpWalletAddress);
        console.log('dumpWalletResult', dumpWalletResult);
        setIsWalletDumped(true);
    };

    // useEffect(() => {
    //     const fetchData = async () => {
    //         if (swapReservationURL && typeof swapReservationURL === 'string') {
    //             try {
    //                 const reservationDetails = await fetchReservationDetails(swapReservationURL, ethersRpcProvider, selectedInputAsset);
    //                 console.log('Fetching reservation details...');
    //                 console.log('Reservation details:', reservationDetails);
    //                 setSwapReservationNotFound(false);

    //                 const currentReservationStateFromContract = getReservationStateString(reservationDetails.swapReservationData.state);
    //                 setCurrentReservationState(currentReservationStateFromContract);
    //                 // set swap flow state to expired if its been 4 hours since the reservation was created
    //                 const isReservationExpired = Date.now() - reservationDetails.swapReservationData.reservationTimestamp * 1000 > FRONTEND_RESERVATION_EXPIRATION_WINDOW_IN_SECONDS * 1000;

    //                 if (currentReservationStateFromContract === 'Created' && isReservationExpired) {
    //                     setSwapFlowState('5-expired');
    //                 } else if (currentReservationStateFromContract === 'Proved') {
    //                     setSwapFlowState('3-receive-evm-token');
    //                 } else if (currentReservationStateFromContract === 'Completed') {
    //                     setSwapFlowState('4-completed');
    //                 } else if (currentReservationStateFromContract === 'Expired') {
    //                     setSwapFlowState('5-expired');
    //                 }

    //                 setSwapReservationData(reservationDetails.swapReservationData);

    //                 const microUsdtOutputAmountWithoutFee = calculateOriginalAmountBeforeFee(reservationDetails.totalReservedAmountInMicroUsdt);
    //                 console.log('proc reservationDetails.totalReservedAmountInMicroUsdt:', reservationDetails.totalReservedAmountInMicroUsdt.toString());
    //                 console.log('proc calculateOriginalAmountBeforeFee', microUsdtOutputAmountWithoutFee.toString());
    //                 const trueProtocolFee = reservationDetails.totalReservedAmountInMicroUsdt.sub(microUsdtOutputAmountWithoutFee).toString();
    //                 console.log('proc trueProtocolFee:', trueProtocolFee);
    //                 const trueMicroUsdtSwapOutputAmount = reservationDetails.totalReservedAmountInMicroUsdt.sub(trueProtocolFee).toString();

    //                 setUsdtOutputSwapAmount(formatUnits(trueMicroUsdtSwapOutputAmount.toString(), selectedInputAsset.decimals));
    //                 setBtcInputSwapAmount(reservationDetails.btcInputSwapAmount);
    //                 setTotalSwapAmountInSats(reservationDetails.totalSwapAmountInSats);
    //             } catch (error) {
    //                 setSwapReservationNotFound(true);
    //                 console.error('Error fetching reservation details:', error);
    //             }
    //         }
    //     };

    //     fetchData();
    //     const intervalId = setInterval(fetchData, 5000); // refresh every 5 seconds
    //     return () => clearInterval(intervalId);
    // }, [swapReservationURL, ethersRpcProvider, selectedInputAsset]);

    enum ReservationState {
        None = 0,
        Created = 1,
        Proved = 2,
        Completed = 3,
        Expired = 4,
    }

    // convert reservation state from contract to string
    function getReservationStateString(state: number): string {
        switch (state) {
            case ReservationState.None:
                return 'None';
            case ReservationState.Created:
                return 'Created';
            case ReservationState.Proved:
                return 'Proved';
            case ReservationState.Completed:
                return 'Completed';
            case ReservationState.Expired:
                return 'Expired';
            default:
                return 'Unknown State';
        }
    }

    return (
        <>
            <OpenGraph />
            <Flex
                h='100vh'
                width='100%'
                direction='column'
                backgroundImage={'/images/rift_background_low.webp'}
                backgroundSize='cover'
                backgroundPosition='center'>
                <Navbar />
                <Flex direction={'column'} align='center' w='100%' mt={'130px'}>
                    <Flex width='1000px' align={'center'} direction={'column'}>
                        <SwapAmounts />
                        {proxyWalletSwapInternalID && !loadingState && swapFlowState !== '5-expired' && (
                            <Flex justify={'center'} w='100%' mt='20px'>
                                <SwapStatusTimeline />
                            </Flex>
                        )}
                        {/* MAIN CONTAINER */}
                        <Flex
                            {...opaqueBackgroundColor}
                            w='100%'
                            mt='20px'
                            borderRadius='30px'
                            px='40px'
                            boxShadow={
                                currentReservationState === 'Completed'
                                    ? `0px 0px 15px 1px ${colors.greenOutline}`
                                    : '0px 0px 20px 2px rgba(0, 0, 0, 0.1)'
                            }
                            direction='column'
                            py='35px'
                            align='center'
                            borderWidth={3}
                            borderColor={colors.borderGray}>
                            {loadingState ? (
                                swapReservationNotFound ? (
                                    <Flex mb='20px' mt='20px' direction={'column'} align='center'>
                                        <Text
                                            fontSize='18px'
                                            textAlign='center'
                                            w='800px'
                                            mt='-4px'
                                            mb='0px'
                                            fontWeight={'normal'}
                                            color={colors.offWhite}
                                            fontFamily={FONT_FAMILIES.NOSTROMO}>
                                            Invalid Swap Reservation
                                        </Text>
                                        <Flex>
                                            <Text
                                                fontSize='15px'
                                                textAlign='center'
                                                // w='800px'
                                                mt='10px'
                                                mb='0px'
                                                fontWeight={'normal'}
                                                color={colors.textGray}
                                                fontFamily={FONT_FAMILIES.AUX_MONO}>
                                                Please check your swap reservations on the
                                            </Text>
                                            <Text
                                                fontSize='15px'
                                                textAlign='center'
                                                // w='800px'
                                                mt='10px'
                                                cursor={'pointer'}
                                                mb='0px'
                                                textDecoration={'underline'}
                                                onClick={() => handleNavigation('/manage')}
                                                ml='10px'
                                                fontWeight={'normal'}
                                                color={colors.RiftOrange}
                                                fontFamily={FONT_FAMILIES.AUX_MONO}>
                                                manage page
                                            </Text>
                                        </Flex>
                                    </Flex>
                                ) : (
                                    <Flex mb='20px' mt='20px'>
                                        <Spinner
                                            color={colors.textGray}
                                            h={'50px'}
                                            w={'50px'}
                                            thickness='3px'
                                            speed='0.65s'
                                        />
                                    </Flex>
                                )
                            ) : swapFlowState === '3-receive-evm-token' ||
                              swapFlowState === '4-completed' ||
                              swapFlowState === '5-expired' ||
                              currentReservationState === 'Proved' ||
                              currentReservationState === 'Expired' ||
                              currentReservationState === 'Completed' ? (
                                <MainSwapFlow />
                            ) : proxyWalletSwapInternalID ? (
                                <>
                                    <Flex
                                        alignItems='center'
                                        fontFamily={FONT_FAMILIES.NOSTROMO}
                                        fontWeight={'bold'}
                                        fontSize={'24px'}
                                        mt='-5px'
                                        mb='18px'>
                                        <Flex mr='10px' mt='-1px'>
                                            <FaClock size={'22px'} color={colors.darkerGray} />
                                        </Flex>
                                        <Text marginRight='4px'>Reservation Locked for:</Text>
                                        <span
                                            style={{
                                                color:
                                                    minutesLeft >= 20
                                                        ? colors.greenOutline
                                                        : minutesLeft >= 10
                                                          ? 'yellow'
                                                          : 'red',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}>
                                            {timeLeft ? (
                                                <>
                                                    <Flex mr='7px' mt='-1px'></Flex>
                                                    {timeLeft}
                                                </>
                                            ) : (
                                                <Flex ml='6px' mt='-1px'>
                                                    <Spinner
                                                        color={colors.textGray}
                                                        h={'18px'}
                                                        w={'18px'}
                                                        thickness='3px'
                                                        speed='0.65s'
                                                    />
                                                </Flex>
                                            )}
                                        </span>
                                    </Flex>
                                    <Text
                                        fontSize='16px'
                                        textAlign='center'
                                        w='800px'
                                        mt='0px'
                                        mb='20px'
                                        fontWeight={'normal'}
                                        color={colors.darkerGray}
                                        fontFamily={FONT_FAMILIES.AUX_MONO}>
                                        Your reservation is confirmed! Send the following amount of Bitcoin to the
                                        address below within 1 hour to initiate the swap:
                                    </Text>
                                    <Flex mt='10px' mx='10px'>
                                        {bitcoinUri && bitcoinUri !== '' && (
                                            <Flex
                                                py='10px'
                                                px='10px'
                                                w={'270px'}
                                                borderRadius='10px'
                                                bg='white'
                                                mr='40px'
                                                boxShadow={'0px 15px 15px rgba(0, 16, 118, 0.4)'}>
                                                <QRCode value={bitcoinUri} size={250} />
                                            </Flex>
                                        )}
                                        <Flex direction={'column'}>
                                            <Text
                                                mt='8px'
                                                fontSize='16px'
                                                color={colors.textGray}
                                                fontFamily={FONT_FAMILIES.NOSTROMO}>
                                                Bitcoin Address:
                                            </Text>
                                            <Flex direction='column' alignItems='flex-start' maxW='200px'>
                                                {address ? (
                                                    <>
                                                        <Text
                                                            mt='6px'
                                                            fontSize='25px'
                                                            display='inline-flex'
                                                            letterSpacing={'-1px'}
                                                            color={colors.offWhite}
                                                            fontFamily={FONT_FAMILIES.AUX_MONO}
                                                            whiteSpace='nowrap'
                                                            overflow='hidden'
                                                            textOverflow='ellipsis'>
                                                            {address.slice(0, Math.floor((2 / 3) * address.length))}
                                                        </Text>
                                                        <Flex alignItems='center'>
                                                            <Text
                                                                letterSpacing={'-1px'}
                                                                fontSize='25px'
                                                                display='inline-flex'
                                                                color={colors.offWhite}
                                                                fontFamily={FONT_FAMILIES.AUX_MONO}>
                                                                {address.slice(Math.floor((2 / 3) * address.length))}
                                                            </Text>
                                                            <LuCopy
                                                                color='gray'
                                                                size={20}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    marginLeft: '10px',
                                                                }}
                                                                onClick={() => navigator.clipboard.writeText(address)}
                                                            />
                                                        </Flex>
                                                    </>
                                                ) : (
                                                    <Text
                                                        mt='2px'
                                                        fontSize='25px'
                                                        color={colors.offWhite}
                                                        fontFamily={FONT_FAMILIES.AUX_MONO}>
                                                        Loading...
                                                    </Text>
                                                )}
                                            </Flex>

                                            <Text
                                                mt='25px'
                                                fontSize='16px'
                                                mb='-18px'
                                                color={colors.textGray}
                                                fontFamily={FONT_FAMILIES.NOSTROMO}>
                                                Deposit Amount:{' '}
                                            </Text>
                                            <Flex alignItems='center'>
                                                <Text
                                                    letterSpacing={'-1px'}
                                                    mt='2px'
                                                    fontSize='25px'
                                                    width={'500px'}
                                                    color={colors.offWhite}
                                                    fontFamily={FONT_FAMILIES.AUX_MONO}
                                                    display='inline-flex'
                                                    flexDirection='row'
                                                    alignItems='center'>
                                                    {totalSwapAmountInSats ? (
                                                        <>
                                                            {formatUnits(totalSwapAmountInSats, BITCOIN_DECIMALS)}
                                                            <LuCopy
                                                                color='gray'
                                                                size={20}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    marginLeft: '10px',
                                                                }}
                                                                onClick={() =>
                                                                    navigator.clipboard.writeText(
                                                                        formatUnits(
                                                                            totalSwapAmountInSats,
                                                                            BITCOIN_DECIMALS,
                                                                        ).toString(),
                                                                    )
                                                                }
                                                            />
                                                            <Flex ml='20px' mt='-1px'>
                                                                <AssetTag assetName='BTC' width='75px' />
                                                            </Flex>
                                                        </>
                                                    ) : (
                                                        'Loading...'
                                                    )}
                                                </Text>
                                            </Flex>
                                        </Flex>
                                    </Flex>
                                    {aggregateProxyBalance > 0 && (
                                        <Flex
                                            mt='32px'
                                            bg={colors.offBlackLighter2}
                                            onClick={() => setDumpWalletMode(!dumpWalletMode)}
                                            _hover={{ cursor: 'pointer' }}>
                                            <Text>Dump Proxy wallet balance: {aggregateProxyBalance} </Text>
                                        </Flex>
                                    )}
                                    <Text
                                        mt={aggregateProxyBalance <= 0 ? '32px' : '0px'}
                                        fontWeight={'normal'}
                                        fontSize='13px'
                                        color={colors.RiftOrange}
                                        fontFamily={FONT_FAMILIES.AUX_MONO}>
                                        WARNING: Do not clear browser cache or cookies until the swap is complete.
                                    </Text>
                                    <Text
                                        fontWeight={'normal'}
                                        fontSize='13px'
                                        mt='0px'
                                        color={colors.darkerGray}
                                        fontFamily={FONT_FAMILIES.AUX_MONO}>
                                        {proxyWalletSwapInternalID
                                            ? 'Internal ID - ' + proxyWalletSwapInternalID
                                            : 'Loading internal id...'}
                                    </Text>
                                    {dumpWalletMode && (
                                        <Flex>
                                            <Flex alignItems='center' mt='10px'>
                                                <Button
                                                    bg='none'
                                                    textColor={'white'}
                                                    mr='10px'
                                                    onClick={() => setDumpWalletMode(false)}>
                                                    X
                                                </Button>
                                                <Input
                                                    value={dumpWalletAddress}
                                                    onChange={(e) => setDumpWalletAddress(e.target.value)}
                                                    placeholder='Enter BTC Address'
                                                    _placeholder={{
                                                        color: 'white',
                                                        fontFamily: FONT_FAMILIES.NOSTROMO,
                                                    }}
                                                    mr='10px'
                                                    width='700px'
                                                    fontFamily={FONT_FAMILIES.AUX_MONO}
                                                    bg={colors.offBlackLighter2}
                                                    color={colors.offWhite}
                                                    borderColor={colors.RiftOrange}
                                                    _hover={{ borderColor: colors.purpleHover }}
                                                    _focus={{ borderColor: colors.purpleHover }}
                                                />
                                                <Button
                                                    onClick={dumpWallet}
                                                    bg={isWalletDumped ? colors.greenOutline : colors.RiftOrange}
                                                    color={colors.offWhite}
                                                    _hover={{ bg: colors.purpleHover }}
                                                    borderColor={colors.borderGray}>
                                                    {isWalletDumped ? 'Wallet Dumped!' : 'Dump Wallet'}
                                                </Button>
                                            </Flex>
                                        </Flex>
                                    )}
                                </>
                            ) : (
                                <Flex direction='column'>
                                    <Text>Invalid reservation id...</Text>
                                    <Button
                                        mt='18px'
                                        px='38px'
                                        bg={colors.purpleBackground}
                                        _hover={{ bg: colors.purpleHover }}
                                        onClick={() => handleNavigation('/')}
                                        color={colors.offWhite}
                                        border={'2px solid'}
                                        borderColor={colors.purpleBorder}>
                                        <Text>Start a new swap</Text>
                                    </Button>
                                </Flex>
                            )}
                        </Flex>
                        {proxyWalletSwapInternalID &&
                            !loadingState &&
                            swapFlowState === '2-send-bitcoin' &&
                            currentReservationState !== 'Proved' &&
                            currentReservationState !== 'Completed' && (
                                <Flex
                                    bg={colors.purpleBackgroundDisabled}
                                    borderColor={colors.purpleBorderDark}
                                    borderWidth={3}
                                    borderRadius='14px'
                                    px='20px'
                                    w='540px'
                                    py='4px'
                                    mt={'20px'}
                                    h={'60px'}
                                    align={'center'}
                                    justify={'center'}>
                                    <Text
                                        fontSize={'18px'}
                                        mr='15px'
                                        color={colors.textGray}
                                        fontFamily={FONT_FAMILIES.NOSTROMO}>
                                        AWAITING BITCOIN PAYMENT
                                    </Text>
                                    <Spinner
                                        w={'18px'}
                                        h={'18px'}
                                        thickness='3px'
                                        color={colors.textGray}
                                        speed='0.65s'
                                    />
                                </Flex>
                            )}
                        {currentReservationState === 'Created' &&
                            swapFlowState === '3-receive-evm-token' &&
                            currentTotalBlockConfirmations < confirmationBlocksNeeded && (
                                <Flex
                                    bg={colors.purpleBackgroundDisabled}
                                    borderColor={colors.purpleBorderDark}
                                    borderWidth={3}
                                    borderRadius='14px'
                                    px='20px'
                                    w='540px'
                                    py='4px'
                                    mt={'20px'}
                                    h={'60px'}
                                    align={'center'}
                                    justify={'center'}>
                                    <Text
                                        fontSize={'18px'}
                                        mr='15px'
                                        color={colors.textGray}
                                        fontFamily={FONT_FAMILIES.NOSTROMO}>
                                        Awaiting Block Confirmation
                                        {confirmationBlocksNeeded - currentTotalBlockConfirmations > 1 ? 's' : ''}
                                    </Text>
                                    <Spinner
                                        w={'18px'}
                                        h={'18px'}
                                        thickness='3px'
                                        color={colors.textGray}
                                        speed='0.65s'
                                    />
                                </Flex>
                            )}{' '}
                        {currentReservationState === 'Created' &&
                            currentTotalBlockConfirmations >= confirmationBlocksNeeded && (
                                <Flex
                                    bg={colors.purpleBackgroundDisabled}
                                    borderColor={colors.purpleBorderDark}
                                    borderWidth={3}
                                    borderRadius='14px'
                                    px='20px'
                                    w='540px'
                                    py='4px'
                                    mt={'20px'}
                                    h={'60px'}
                                    align={'center'}
                                    justify={'center'}>
                                    <Text
                                        fontSize={'18px'}
                                        mr='15px'
                                        color={colors.textGray}
                                        fontFamily={FONT_FAMILIES.NOSTROMO}>
                                        Generating Transaction Proof
                                    </Text>
                                    <Spinner
                                        w={'18px'}
                                        h={'18px'}
                                        thickness='3px'
                                        color={colors.textGray}
                                        speed='0.65s'
                                    />
                                </Flex>
                            )}
                        {currentReservationState === 'Proved' && (
                            <Flex
                                bg={'rgba(8, 34, 22, 0.8)'}
                                borderColor='#3D5A44'
                                borderWidth={3}
                                borderRadius='14px'
                                px='20px'
                                w='400px'
                                py='4px'
                                mt={'20px'}
                                h={'60px'}
                                align={'center'}
                                justify={'center'}>
                                <Text
                                    fontSize={'18px'}
                                    mr='15px'
                                    color={colors.textGray}
                                    fontFamily={FONT_FAMILIES.NOSTROMO}>
                                    RELEASING FUNDS
                                </Text>
                                <Spinner w={'18px'} h={'18px'} thickness='3px' color={colors.textGray} speed='0.65s' />
                            </Flex>
                        )}
                    </Flex>
                </Flex>
                <CurrencyModal />
            </Flex>
        </>
    );
};

export default ReservationDetails;
