import React, { useEffect, useState } from 'react';
import { Button, Flex, Spinner, Text } from '@chakra-ui/react';
import { colors } from '../../utils/colors';
import { IoIosCheckmarkCircle } from 'react-icons/io';
import { LuCopy, LuExternalLink } from 'react-icons/lu';
import { FONT_FAMILIES } from '../../utils/font';
import { useStore } from '../../store';
import { FaClock } from 'react-icons/fa';
import { useRouter } from 'next/router';
import { FRONTEND_RESERVATION_EXPIRATION_WINDOW_IN_SECONDS } from '../../utils/constants';
import { copyToClipboard } from '../../utils/frontendHelpers';

export const MainSwapFlow = () => {
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [totalSwapAmountInSats, setTotalSwapAmountInSats] = useState(0);
    const [bitcoinUri, setBitcoinUri] = useState(null);
    const confirmationBlocksNeeded = useStore((state) => state.confirmationBlocksNeeded);
    const setConfirmationBlocksNeeded = useStore((state) => state.setConfirmationBlocksNeeded);
    const currentTotalBlockConfirmations = useStore((state) => state.currentTotalBlockConfirmations);
    const setCurrentTotalBlockConfirmations = useStore((state) => state.setCurrentTotalBlockConfirmations);
    const bitcoinSwapTransactionHash = useStore((state) => state.bitcoinSwapTransactionHash);
    const setBitcoinSwapTransactionHash = useStore((state) => state.setBitcoinSwapTransactionHash);

    const lowestFeeReservationParams = useStore((state) => state.lowestFeeReservationParams);
    const currentReservationState = useStore((state) => state.currentReservationState);
    // const swapReservationData = useStore((state) => state.swapReservationData);
    const [timeLeft, setTimeLeft] = useState(0);
    const router = useRouter();
    const [dots, setDots] = useState('');
    const [isActiveProxyTxn, setIsActiveProxyTxn] = useState(false);

    const handleNavigation = (route: string) => {
        router.push(route);
    };

    useEffect(() => {
        const checkSwapStatus = async () => {
            // if (!swapReservationData || !swapReservationData.nonce) return;

            try {
                // @ts-ignore
                const status = await window.rift.getRiftSwapStatus({ internalId: swapReservationData.nonce });
                console.log('Swap status from proxy wallet:', status);

                if (status.status === 1) {
                    setIsActiveProxyTxn(true);
                } else {
                    setIsActiveProxyTxn(false);
                }
            } catch (error) {
                console.error('Error fetching swap status:', error);
            }
        };

        checkSwapStatus();
    }, [currentReservationState]);

    // loading dots effect
    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setDots((prev) => (prev === '...' ? '' : prev + '.'));
            }, 350);
            return () => clearInterval(interval);
        }
    }, [loading]);

    useEffect(() => {
        const fetchConfirmations = async () => {
            try {
                // Fetch transaction details from mempool.space
                const txResponse = await fetch(`https://mempool.space/api/tx/${bitcoinSwapTransactionHash}`);
                const txData = await txResponse.json();

                if (!txData.status.confirmed) {
                    setCurrentTotalBlockConfirmations(0);
                } else {
                    // Fetch latest block height
                    const blockHeightResponse = await fetch('https://mempool.space/api/blocks/tip/height');
                    const latestBlockHeight = await blockHeightResponse.json();

                    const transactionBlockHeight = txData.status.block_height;
                    const currentConfirmations = latestBlockHeight - transactionBlockHeight + 1;

                    setCurrentTotalBlockConfirmations(currentConfirmations);
                }
            } catch (error) {
                console.error('Error fetching transaction confirmations:', error);
                setError('Could not fetch confirmation data.');
            }
        };

        if (bitcoinSwapTransactionHash) {
            fetchConfirmations();
            const interval = setInterval(fetchConfirmations, 10000);
            return () => clearInterval(interval);
        }
    }, [bitcoinSwapTransactionHash]);

    // TODO: add time left calculation
    // useEffect(() => {
    //     const calculateTimeLeft = () => {
    //         const currentTime = Math.floor(Date.now() / 1000);
    //         const endTime = swapReservationData.liquidityUnlockedTimestamp; // unlock timestamp is actually the time when the swap becomes fully Proved
    //         const remainingTime = endTime - currentTime;
    //         setTimeLeft(remainingTime > 0 ? remainingTime : 0);
    //     };

    //     calculateTimeLeft();
    //     const interval = setInterval(calculateTimeLeft, 1000);

    //     return () => clearInterval(interval);
    // }, [swapReservationData]);

    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
    };

    return (
        <>
            {currentReservationState === 'Created' && (
                <>
                    <Flex mt='-10px' ml='4px'>
                        <IoIosCheckmarkCircle size={45} color={colors.greenOutline} />
                    </Flex>
                    <Text textAlign={'center'} mt='12px' fontSize='25px' fontFamily={FONT_FAMILIES.NOSTROMO} color={colors.greenOutline} mb='20px'>
                        Bitcoin Transaction Detected!
                    </Text>

                    {/* INFO TEXT */}
                    <Text
                        fontSize='14px'
                        maxW={'900px'}
                        fontWeight={'normal'}
                        color={colors.textGray}
                        fontFamily={FONT_FAMILIES.AUX_MONO}
                        textAlign='center'
                        mt='0px'
                        flex='1'
                        letterSpacing={'-1.2px'}>
                        A hypernode will now automatically generate a proof of your transaction, and your requested USDT will be released upon {confirmationBlocksNeeded} block confirmations. You can
                        safely leave this tab or return to see swap status.
                    </Text>

                    {/* BLOCK CONFIRMATIONS  */}
                    {currentTotalBlockConfirmations !== null ? (
                        <>
                            <Flex mt='30px' w='469px' mr='-40px' textAlign='left' align={'flex-start'} direction={'column'}>
                                <Text
                                    ml='8px'
                                    textAlign={'center'}
                                    fontSize='25px'
                                    fontFamily={FONT_FAMILIES.AUX_MONO}
                                    color={currentTotalBlockConfirmations >= confirmationBlocksNeeded ? colors.greenOutline : colors.RiftOrange}>
                                    {` ${currentTotalBlockConfirmations}/${confirmationBlocksNeeded} Block Confirmations${currentTotalBlockConfirmations >= confirmationBlocksNeeded ? '' : dots}`}
                                </Text>
                                {currentTotalBlockConfirmations >= confirmationBlocksNeeded && (
                                    <Text ml='8px' fontSize={'12px'} fontFamily={FONT_FAMILIES.AUX_MONO} color={colors.RiftOrange}>{`Block confirmations reached! Generating proof${dots}`}</Text>
                                )}
                            </Flex>
                        </>
                    ) : (
                        <Spinner color={colors.greenOutline} mt='20px' />
                    )}

                    {/* TXN BUTTONS */}
                    <Flex mt='30px' mb='0px' gap='10px' justify={'center'}>
                        <Button
                            rightIcon={<LuCopy />}
                            onClick={() => copyToClipboard(bitcoinSwapTransactionHash, 'Transaction hash copied to clipboard!')}
                            bgGradient='linear(to-b, #222, #111)'
                            color={colors.textGray}
                            h='42px'
                            px='15px'
                            w='175px'
                            fontSize='14px'
                            borderRadius='8px'
                            fontFamily={FONT_FAMILIES.NOSTROMO}
                            border={`2px solid ${colors.offBlackLighter3}`}
                            _hover={{ bgGradient: 'linear(to-b, #3A3A3A, #2A2A2A)' }}>
                            Copy Hash
                        </Button>
                        <Button
                            rightIcon={<LuExternalLink />}
                            onClick={() => window.open(`https://mempool.space/tx/${bitcoinSwapTransactionHash}`, '_blank')}
                            bgGradient='linear(to-b, #222, #111)'
                            color={colors.textGray}
                            h='42px'
                            borderRadius='8px'
                            px='15px'
                            w='175px'
                            fontSize='14px'
                            fontFamily={FONT_FAMILIES.NOSTROMO}
                            border={`2px solid ${colors.offBlackLighter3}`}
                            _hover={{ bgGradient: 'linear(to-b, #3A3A3A, #2A2A2A)' }}
                            mr={2}>
                            View TXN
                        </Button>
                    </Flex>
                </>
            )}

            {currentReservationState === 'Proved' && (
                <>
                    <Flex mb='0px' ml='4px'>
                        <Text textAlign={'center'} mt='0px' fontSize='25px' fontFamily={FONT_FAMILIES.NOSTROMO} color={colors.RiftOrange} mb='20px'>
                            PROOF VERIFICATION SUCCESSFUL!
                        </Text>
                    </Flex>

                    <Text
                        fontSize='14px'
                        maxW={'900px'}
                        fontWeight={'normal'}
                        color={colors.textGray}
                        fontFamily={FONT_FAMILIES.AUX_MONO}
                        textAlign='center'
                        mt='5px'
                        flex='1'
                        letterSpacing={'-1.2px'}>
                        Your bitcoin transaction was successfully proved on-chain, your requested USDT will be realeased to you in 10 minutes. You can safely leave this tab or return to see swap
                        status.
                    </Text>
                    {/* // TODO ADD PROOF/UNLOCK HASH */}
                    {/* <Flex mt='10px'>
                        <Text fontSize='14px' mr='10px' fontFamily={FONT_FAMILIES.AUX_MONO} color={colors.textGray}>
                            Proof Hash:{' '}
                        </Text>
                        <Text
                            as='a'
                            href={`https://mempool.space/tx/${bitcoinSwapTransactionHash}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            fontSize='14px'
                            fontFamily={FONT_FAMILIES.AUX_MONO}
                            color={colors.offWhite}
                            style={{
                                textDecoration: 'none',
                                cursor: 'pointer',
                            }}
                            _hover={{
                                textDecoration: 'underline',
                            }}>
                            TODO - ADD PROOF HASH
                        </Text>
                        <LuCopy
                            color='gray'
                            size={20}
                            style={{
                                cursor: 'pointer',
                                marginLeft: '10px',
                            }}
                            onClick={() => navigator.clipboard.writeText(bitcoinSwapTransactionHash)}
                        />
                    </Flex> */}
                    <Flex mt='35px'>
                        <Text fontWeight='bold' fontSize='16px' mr='10px' fontFamily={FONT_FAMILIES.AUX_MONO} color={colors.textGray}>
                            Estimated Time Remaining:
                        </Text>
                        <Text
                            fontWeight='bold'
                            fontSize='16px'
                            fontFamily={FONT_FAMILIES.AUX_MONO}
                            color={colors.greenOutline}
                            style={{
                                textDecoration: 'none',
                            }}
                            _hover={{
                                textDecoration: 'underline',
                            }}>
                            {timeLeft > 0 ? formatTime(timeLeft) : '0m 00s'}
                        </Text>
                    </Flex>
                </>
            )}

            {currentReservationState === 'Completed' && (
                <>
                    <Flex mt='-10px' ml='4px'>
                        <IoIosCheckmarkCircle size={45} color={colors.greenOutline} />
                    </Flex>
                    <Text textAlign={'center'} mt='12px' fontSize='25px' fontFamily={FONT_FAMILIES.NOSTROMO} color={colors.greenOutline} mb='20px'>
                        Your swap is complete!
                    </Text>
                    <Text
                        fontSize='14px'
                        maxW={'900px'}
                        fontWeight={'normal'}
                        color={colors.textGray}
                        fontFamily={FONT_FAMILIES.AUX_MONO}
                        textAlign='center'
                        mt='0px'
                        flex='1'
                        letterSpacing={'-1.2px'}>
                        Your requested USDT funds have been released to your address.
                    </Text>
                    {/* // TODO ADD RELEASE HASH */}
                    {/* <Flex mt='10px'>
                        <Text fontSize='14px' mr='10px' fontFamily={FONT_FAMILIES.AUX_MONO} color={colors.textGray}>
                            Proof Hash:{' '}
                        </Text>
                        <Text
                            as='a'
                            href={`https://mempool.space/tx/${bitcoinSwapTransactionHash}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            fontSize='14px'
                            fontFamily={FONT_FAMILIES.AUX_MONO}
                            color={colors.offWhite}
                            style={{
                                textDecoration: 'none',
                                cursor: 'pointer',
                            }}
                            _hover={{
                                textDecoration: 'underline',
                            }}>
                            TODO - ADD RELEASE HASH
                        </Text>
                        <LuCopy
                            color='gray'
                            size={20}
                            style={{
                                cursor: 'pointer',
                                marginLeft: '10px',
                            }}
                            onClick={() => navigator.clipboard.writeText(bitcoinSwapTransactionHash)}
                        />
                    </Flex> */}
                </>
            )}

            {currentReservationState === 'Expired' && !isActiveProxyTxn && (
                <>
                    <Flex mb='10px' ml='4px' opacity={1}>
                        <FaClock size={38} color={colors.red} />
                    </Flex>
                    <Text textAlign={'center'} mt='12px' fontSize='25px' fontFamily={FONT_FAMILIES.NOSTROMO} color={colors.redHover} mb='20px'>
                        Your swap reservation has expired.
                    </Text>
                    <Text
                        fontSize='14px'
                        maxW={'900px'}
                        fontWeight={'normal'}
                        color={colors.textGray}
                        fontFamily={FONT_FAMILIES.AUX_MONO}
                        textAlign='center'
                        mt='0px'
                        flex='1'
                        letterSpacing={'-1.2px'}>
                        No bitcoin transaction was detected and proved within the {FRONTEND_RESERVATION_EXPIRATION_WINDOW_IN_SECONDS / 60 / 60} hour reservation window. Please use the button below to
                        start a new swap.
                    </Text>
                    <Button
                        mt='38px'
                        px='38px'
                        bg={colors.purpleBackground}
                        _hover={{ bg: colors.purpleHover }}
                        onClick={() => handleNavigation('/')}
                        color={colors.offWhite}
                        border={'2px solid'}
                        borderColor={colors.purpleBorder}>
                        <Text>Start a new swap</Text>
                    </Button>
                </>
            )}
        </>
    );
};
