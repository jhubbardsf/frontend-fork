import { Box, Button, Flex, FlexProps, Spacer, Text, Image, useClipboard, VStack, Input } from '@chakra-ui/react';
import { colors } from '../../utils/colors';
import useWindowSize from '../../hooks/useWindowSize';
import { useRouter } from 'next/router';
import { IoMenu, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ConnectWalletButton } from '../other/ConnectWalletButton';
import { FONT_FAMILIES } from '../../utils/font';
import { useStore } from '../../store';
import { weiToEth } from '../../utils/dappHelper';
import { BigNumber, ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import { ValidAsset } from '../../types';
import { formatUnits } from 'ethers/lib/utils';
import { isDismissWarning, onDismiss } from '../../utils/warningHelper';
import GlowingShimmerText from '../other/GlowingText';
import riftExchangeABI from '../../abis/RiftExchange.json';

export const Navbar = ({}) => {
    const { isMobile, isTablet, isSmallLaptop, windowSize } = useWindowSize();
    const router = useRouter();
    const fontSize = isMobile ? '20px' : '20px';
    const [isLocalhost, setIsLocalhost] = useState(false);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const validAssets = useStore((state) => state.validAssets);
    const lowestFeeReservationParams = useStore((state) => state.lowestFeeReservationParams);
    const [availableLiquidity, setAvailableLiquidity] = useState(BigNumber.from(0));
    const [formattedTotalAmount, setFormattedTotalAmount] = useState<string>('0');
    const protocolFeeAmountMicroUsdt = useStore((state) => state.protocolFeeAmountMicroUsdt);
    const setSelectedSwapToManage = useStore((state) => state.setSelectedSwapToManage);
    const selectedSwapToManage = useStore((state) => state.selectedSwapToManage);
    const [localSelectedVaultToManage, setLocalSelectedVaultToManage] = useState<number | null>(null);
    const [isLoadingVault, setIsLoadingVault] = useState(false);
    const ethersRpcProvider = useStore.getState().ethersRpcProvider;
    const depositFlowState = useStore((state) => state.depositFlowState);

    const [displayWarning, setDisplayWarning] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        setDisplayWarning(!isDismissWarning('dismissAlphaWarning'));
    }, []);

    useEffect(() => {
        const totalAvailableLiquidity = validAssets[selectedInputAsset.name]?.totalAvailableLiquidity;
        setAvailableLiquidity(totalAvailableLiquidity ?? BigNumber.from(0));
    }, [validAssets]);

    useEffect(() => {
        const hostname = window.location.hostname;
        setIsLocalhost(hostname === 'localhost' || hostname === '127.0.0.1');
    }, []);

    useEffect(() => {
        if (!lowestFeeReservationParams) {
            return;
        }
        const totalAmount = lowestFeeReservationParams?.amountsInMicroUsdtToReserve.reduce((acc, curr) => BigNumber.from(acc).add(curr), ethers.BigNumber.from(0));
        setFormattedTotalAmount(formatUnits(totalAmount, selectedInputAsset.decimals));
    }, [lowestFeeReservationParams]);

    const handleNavigation = (route: string) => {
        router.push(route);
    };

    const navItem = (text: string, route: string) => {
        return (
            <Flex
                _hover={{ background: 'rgba(150, 150, 150, 0.2)' }}
                cursor='pointer'
                borderRadius='6px'
                px='10px'
                onClick={() => {
                    if (route === '/about') {
                        window.location.href = 'https://rift.exchange';
                    } else {
                        handleNavigation(route);
                    }
                }}
                py='2px'
                position='relative'
                alignItems='center'>
                <Text color={router.pathname == route ? colors.offWhite : '#ccc'} fontSize={isTablet ? '0.9rem' : '19px'} fontFamily='Nostromo'>
                    {text}
                </Text>
                {(router.pathname === route || (route === '/' && router.pathname.includes('/swap'))) && (
                    <Flex position={'absolute'} top='31px' w='calc(100% - 20px)' height='2px' bgGradient={`linear(-90deg, #394AFF, #FF8F28)`} />
                )}
            </Flex>
        );
    };

    const StatCard = ({ label, value, color = colors.RiftOrange }) => (
        <Box borderWidth='1px' borderColor={colors.textGray} borderRadius='10px' bg={colors.offBlack} p={'10px'} textAlign='center'>
            <Text color={colors.textGray} fontSize='10px' mb={1}>
                {label}
            </Text>
            <Text color={color} fontSize='14px' fontWeight='bold'>
                {value}
            </Text>
        </Box>
    );

    const getChainName = (id) => {
        switch (id) {
            case 11155111:
                return 'Sepolia';
            case 17000:
                return 'Holesky';
            case 421614:
                return 'Arbitrum Sepolia';
            case 1:
                return 'ETH';
            default:
                return id;
        }
    };

    // Function to map numeric state to string literal
    const mapStateNumberToString = (stateNumber: number): '0-not-started' | '1-finding-liquidity' | '2-awaiting-payment' | '3-payment-recieved' => {
        switch (stateNumber) {
            case 0:
                return '0-not-started';
            case 1:
                return '1-finding-liquidity';
            case 2:
                return '2-awaiting-payment';
            case 3:
                return '3-payment-recieved';
            default:
                return '0-not-started'; // Default case
        }
    };

    if (isMobile) return null;

    return (
        <Flex width='100%' direction={'column'} position='fixed' top={0} left={0} right={0} zIndex={1010}>
            <Flex bgGradient='linear(0deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.8))' position='absolute' w='100%' h='130%'></Flex>
            {displayWarning == true && (
                <>
                    <Flex
                        bgGradient='linear(90deg, rgba(223, 111, 19, 1), rgba(39, 46, 221, 1))'
                        zIndex='2'
                        alignSelf={'center'}
                        align={'center'}
                        justify={'center'}
                        w='100%'
                        minH='40px'
                        position='relative'>
                        <GlowingShimmerText>The Rift early alpha is awaiting audits - swaps are limited to 100 USDT - use at your own risk</GlowingShimmerText>
                        <Flex
                            // h='100%'
                            h='38px'
                            w={isSmallLaptop ? '38px' : '100px'}
                            align='center'
                            borderRadius={'4px'}
                            justify={'center'}
                            position='absolute'
                            cursor={'pointer'}
                            right={isSmallLaptop ? '10px' : '10px'}
                            color={isSmallLaptop ? colors.textGray : colors.offWhite}
                            _hover={{ bg: colors.purpleButtonBG, color: colors.offWhite }}
                            onClick={() => {
                                onDismiss('dismissAlphaWarning');
                                setDisplayWarning(false);
                            }}>
                            <Text textShadow={'0px 0px 10px rgba(0, 0, 0, 0.5)'} fontFamily={FONT_FAMILIES.NOSTROMO} fontSize='16px'>
                                {isSmallLaptop ? 'X' : 'DISMISS'}
                            </Text>
                        </Flex>
                    </Flex>
                    <Flex
                        bgGradient='linear(-90deg, rgba(251, 142, 45, 0.5), rgba(69, 76, 251, 0.5))'
                        zIndex='2'
                        alignSelf={'center'}
                        align={'center'}
                        justify={'center'}
                        w='100%'
                        h='2px'
                        mb='-10px'
                    />
                </>
            )}

            <Flex direction='row' w='100%' px={'30px'} pt='25px' zIndex={400}>
                <Flex gap='12px'>
                    {navItem('Swap', '/')}
                    {navItem('Activity', '/activity')}
                    {/* {navItem('OTC', '/otc')} */}
                </Flex>
                <Flex ml='25px' gap='30px' align='center'>
                    <a href='https://x.com/riftdex' target='_blank' rel='noopener noreferrer'>
                        <Image src='/images/social/x.svg' w='17px' aspectRatio={1} />
                    </a>
                    <Flex mt='1px'>
                        <a href='https://t.me/riftdex' target='_blank' rel='noopener noreferrer'>
                            <Image src='/images/social/telegram.svg' w='23px' aspectRatio={1} />
                        </a>
                    </Flex>
                </Flex>
                <Spacer />
                <Flex direction='column' fontFamily={FONT_FAMILIES.AUX_MONO} align='center' fontSize='12px' position='absolute' top={0} left={0} right={0}>
                    {depositFlowState !== '0-not-started' && (
                        <Flex justify='center' align='center' mt='25px'>
                            <svg width={isTablet ? '70' : '112'} height={isTablet ? '30' : '48'} viewBox='0 0 3190 674' fill='none' xmlns='http://www.w3.org/2000/svg'>
                                <path
                                    d='M362.16 0.509766L708.992 1.01953C764.583 1.01988 854.441 35.3784 899.254 66.0684C946.209 98.2244 976.303 137.703 991.728 187.377C998.545 209.335 999.065 270.158 992.616 291.358C977.097 342.374 948.466 381.798 903.368 414.254C880.445 430.753 849.028 447.137 821.983 456.698C811.159 460.525 802.305 464.051 802.305 464.535C802.324 465.034 855.943 511.837 921.476 568.554C987.014 625.277 1040.64 672.038 1040.65 672.471C1040.65 672.896 989.297 673.212 926.534 673.17L812.423 673.096L709.3 578.507L606.177 483.921H326.44L231.556 373.886H462.542C577.817 373.886 657.812 373.229 672.215 372.168C764.603 365.355 822.541 317.06 822.541 246.859C822.541 191.068 785.958 148.878 721.28 130.076C691.254 121.348 696.678 121.509 432.987 121.479L188.463 121.451V673.246H0.960938V58.8457C0.960938 26.3598 27.3199 0.0372334 59.8057 0.0830078L362.16 0.509766ZM1358.4 673.242H1171.9V0H1358.4V673.242ZM2215.9 134.838H1680.88V269.92H2094.76L1997.96 382.709H1680.88V673.242H1493.72V67.4189C1493.72 48.8748 1502.88 33.0017 1521.21 19.8008C1539.53 6.60022 1561.56 5.19057e-05 1587.3 0H2337.08L2215.9 134.838ZM3189.12 134.834H2869.77V673.242H2697.47V134.834H2363.92L2485.05 0H3189.12V134.834Z'
                                    fill='white'
                                />
                            </svg>
                        </Flex>
                    )}
                </Flex>
                <Spacer />
                <Flex mb='-5px' pr='5px' alignItems='center' gap='10px'>
                    {isLocalhost && (
                        <Flex userSelect={'none'} zIndex={1000} alignItems='center' bg={colors.offBlack} borderRadius='6px' p='5px 10px' borderWidth='1px' borderColor={colors.textGray}>
                            <Box
                                as={IoChevronBack}
                                color={colors.textGray}
                                cursor='pointer'
                                fontSize='20px'
                                onClick={() => {
                                    const currentState = useStore.getState().depositFlowState;
                                    const currentStateNumber = parseInt(currentState, 10);
                                    if (currentStateNumber > 0) {
                                        useStore.setState({ depositFlowState: mapStateNumberToString(currentStateNumber - 1) });
                                    }
                                }}
                            />
                            <Text mx='10px' userSelect={'none'} color={colors.offWhite} fontFamily={FONT_FAMILIES.NOSTROMO}>
                                {depositFlowState}
                            </Text>
                            <Box
                                as={IoChevronForward}
                                color={colors.textGray}
                                cursor='pointer'
                                fontSize='20px'
                                onClick={() => {
                                    const currentState = useStore.getState().depositFlowState;
                                    const currentStateNumber = parseInt(currentState, 10);
                                    useStore.setState({ depositFlowState: mapStateNumberToString(currentStateNumber + 1) });
                                }}
                            />
                        </Flex>
                    )}
                    <ConnectWalletButton />
                </Flex>
            </Flex>
        </Flex>
    );
};
