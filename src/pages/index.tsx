import useWindowSize from '../hooks/useWindowSize';
import { useRouter } from 'next/router';
import { Flex, Spacer, Text, Box, Spinner, Button } from '@chakra-ui/react';
import { Navbar } from '../components/nav/Navbar';
import { colors } from '../utils/colors';
import { OpenGraph } from '../components/background/OpenGraph';
import { FONT_FAMILIES } from '../utils/font';
import BlueText from '../components/other/BlueText';
import OrangeText from '../components/other/OrangeText';
import React, { useEffect, useCallback, useState } from 'react';
import { useStore } from '../store';
import { SwapContainer } from '../components/swap/SwapContainer';
import { DepositUI } from '../components/deposit/DepositUI';
import { ReserveLiquidityContainer } from '../components/swap/ReserveLiquidityContainer';
import CurrencyModal from '../components/swap/CurrencyModal';
import OfflinePage from '../components/background/OfflinePage';
import { opaqueBackgroundColor } from '../utils/constants';
import { SwapAmounts } from '../components/swap/SwapAmounts';
import { AssetTag } from '../components/other/AssetTag';
import { MdArrowRight } from 'react-icons/md';
import { DummySwapAmounts } from '../components/other/DummySwapAmoutns';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import type { Engine } from 'tsparticles-engine';
import { useRive, Layout, Fit, Alignment, useStateMachineInput } from '@rive-app/react-canvas';
import { IoIosCheckmarkCircle } from 'react-icons/io';
import { BsCheckCircleFill } from 'react-icons/bs';
import { LuCopy } from 'react-icons/lu';
import { BTC_Logo } from '../components/other/SVGs';
import { HiOutlineExternalLink } from 'react-icons/hi';

const Home = () => {
    const { isTablet, isMobile } = useWindowSize();
    const router = useRouter();
    const handleNavigation = (route: string) => {
        router.push(route);
    };

    const swapFlowState = useStore((state) => state.swapFlowState);
    const depositFlowState = useStore((state) => state.depositFlowState);
    const setSwapFlowState = useStore((state) => state.setSwapFlowState);
    const setDepositFlowState = useStore((state) => state.setDepositFlowState);
    const btcInputSwapAmount = useStore((state) => state.btcInputSwapAmount);
    const setBtcInputSwapAmount = useStore((state) => state.setBtcInputSwapAmount);
    const coinbaseBtcDepositAmount = useStore((state) => state.coinbaseBtcDepositAmount);
    const setCoinbaseBtcDepositAmount = useStore((state) => state.setCoinbaseBtcDepositAmount);
    const btcOutputAmount = useStore((state) => state.btcOutputAmount);
    const setBtcOutputAmount = useStore((state) => state.setBtcOutputAmount);
    const depositMode = useStore((state) => state.depositMode);
    const { isLaptop, isSmallMobile, windowSize, isLargeDesktop } = useWindowSize();

    const [auctionStep, setAuctionStep] = useState(0);

    const animationURL = '/rift.riv';
    const { rive, RiveComponent } = useRive({
        src: animationURL,
        stateMachines: 'State Machine 1',
        layout: new Layout({
            fit: Fit.Cover,
            alignment: Alignment.Center,
        }),
        autoplay: true,
    });

    const orangeButtonURL = '/orange_button.riv';
    const { rive: orangeButtonRive, RiveComponent: OrangeButtonRiveComponent } = useRive({
        src: orangeButtonURL,
        stateMachines: 'State Machine 1',
        layout: new Layout({
            fit: Fit.Contain,
            alignment: Alignment.Center,
        }),
        autoplay: true,
    });

    useEffect(() => {
        setSwapFlowState('0-not-started');
        // setDepositFlowState('0-not-started');
        setCoinbaseBtcDepositAmount('');
        setBtcInputSwapAmount('');
        setBtcOutputAmount('');
    }, []);

    useEffect(() => {
        if (depositFlowState === '1-finding-liquidity') {
            const auctionSteps = [
                'initializing market maker auction...',
                'broadcasting request to liquidity providers...',
                'collecting price quotes...',
                'comparing rates across providers...',
                'finalizing optimal execution path...',
            ];

            const interval = setInterval(() => {
                setAuctionStep((prev) => (prev + 1) % auctionSteps.length);
            }, 3000);

            return () => clearInterval(interval);
        }
    }, [depositFlowState]);

    const particlesInit = useCallback(async (engine: Engine) => {
        await loadSlim(engine);
    }, []);

    const RiftSVG = () => {
        return (
            <svg width={isTablet ? '50' : '250'} height={isTablet ? '30' : '40'} viewBox='0 0 2293 547' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path
                    fillRule='evenodd'
                    clipRule='evenodd'
                    d='M1039 54.7764V546.997H1169.27V109.553H1626V-0.000172489H1104.13C1086.22 -0.000172489 1070.88 5.36252 1058.13 16.088C1045.38 26.8135 1039 39.7097 1039 54.7764ZM815 0V109.55V546.997H944.812V109.55V0H815ZM1718 0V109.55H1940.27V546.997H2070.09V109.55H2292.36V0H1718ZM1549.09 219.305H1626V306.69L1272 306.69L1202 219.305L1549.09 219.305ZM0 273.501V547H70.2531H130.506V322.839V98.6771L300.702 98.6994L310.51 98.7007C461.956 98.7193 478.794 98.7213 494.25 103.345C496.183 103.923 498.095 104.574 500.246 105.306C500.61 105.43 500.981 105.556 501.36 105.685C546.378 120.96 571.84 155.239 571.84 200.569C571.84 257.606 531.515 296.845 467.21 302.38C457.186 303.242 401.507 303.775 321.272 303.775H160.5L226.542 393.177H306.394H421.245L493.022 470.027L564.798 546.878L644.222 546.938C687.907 546.972 723.647 546.716 723.647 546.37C723.647 546.024 686.321 508.03 640.701 461.94C595.081 415.85 557.755 377.818 557.755 377.426C557.755 377.033 563.918 374.168 571.452 371.059C590.276 363.29 612.143 349.979 628.098 336.574C659.488 310.204 679.415 278.173 690.217 236.724C694.705 219.499 694.344 170.081 689.598 152.24C678.862 111.881 657.916 79.8054 625.234 53.6791C594.043 28.7439 531.5 0.828266 492.807 0.828266L251.404 0.414123L65.1071 0.107247C29.1668 0.0480449 0 29.1668 0 65.1072V273.501Z'
                    fill='white'
                />
            </svg>
        );
    };

    return (
        <>
            <OpenGraph />
            {/* <OfflinePage> */}
            <Flex h='100vh' width='100%' direction='column' backgroundImage={'/images/rift_background_low.webp'} backgroundSize='cover' backgroundPosition='center'>
                <Navbar />
                <Flex direction={'column'} align='center' w='100%' mt={swapFlowState === '0-not-started' ? '15vh' : '100px'}>
                    {depositFlowState === '0-not-started' && (
                        // 0 - MAIN SWAP UI
                        <>
                            <Flex mt='15px'></Flex>
                            <RiftSVG />

                            <Flex
                                flexDir={'column'}
                                textAlign={'center'}
                                userSelect={'none'}
                                fontSize={isTablet ? '12px' : '15px'}
                                mt={'18px'}
                                fontFamily={FONT_FAMILIES.AUX_MONO}
                                color={'#c3c3c3'}
                                cursor={'default'}
                                fontWeight={'normal'}
                                gap={'0px'}>
                                <Text mt='15px'>
                                    The first trustless <OrangeText>Bitcoin</OrangeText> exchange. See{' '}
                                    <Box
                                        as='span'
                                        // go to https://rift.exchange
                                        onClick={() => (window.location.href = 'https://rift.exchange')}
                                        style={{
                                            textDecoration: 'underline',
                                            cursor: 'pointer !important',
                                        }}
                                        fontWeight={'bold'}>
                                        how it works
                                    </Box>
                                </Text>
                            </Flex>
                            <SwapContainer />
                        </>
                    )}
                    {depositFlowState === '1-finding-liquidity' && (
                        // 1 - FINDING LIQUIDITY UI
                        <>
                            {/* <Flex mt='20px'></Flex> */}
                            <DummySwapAmounts />
                            <Flex
                                direction='column'
                                align='center'
                                mt={'30px'}
                                w={isMobile ? '100%' : '950px'}
                                h='480px'
                                borderRadius='40px'
                                boxShadow='0px -1px 33.5px rgba(255, 160, 76, 0.46)'
                                {...opaqueBackgroundColor}
                                borderBottom={'2px solid #FFA04C'}
                                borderLeft={'2px solid #FFA04C'}
                                borderTop={'2px solid #FFA04C'}
                                borderRight={'2px solid #FFA04C'}
                                position='relative'
                                justifyContent={'center'}
                                overflow='hidden'>
                                <Flex w='90%' direction={'column'} alignItems={'center'} zIndex='1'>
                                    <Text
                                        fontSize={'12px'}
                                        color={'#aaa'}
                                        fontFamily={FONT_FAMILIES.AUX_MONO}
                                        fontWeight={'normal'}
                                        letterSpacing={'-1.5px'}
                                        textShadow='0px 2px 4px rgba(0, 0, 0, 0.7)'>
                                        ~ 20 seconds remaining
                                    </Text>

                                    <Flex align='center' justify='center'>
                                        <Spinner color='#FFA04C' width='16px' height='16px' borderRadius={'200px'} thickness='3px' mr='10px' mt='-2px' speed='0.85s' position='relative' zIndex='1' />
                                        <Text fontSize={'32px'} color={'#fff'} fontWeight={'bold'} fontFamily={FONT_FAMILIES.NOSTROMO} textShadow='0px 0px 4px rgba(150, 150, 150, 0.8)'>
                                            SEARCHING FOR the best price...
                                        </Text>
                                    </Flex>
                                    <Text fontSize={'12px'} color={'#aaa'} fontFamily={FONT_FAMILIES.AUX_MONO} fontWeight={'normal'} letterSpacing={'-1px'} textShadow='0px 2px 4px rgba(0, 0, 0, 0.7)'>
                                        {auctionStep === 0 && 'initializing market maker auction...'}
                                        {auctionStep === 1 && 'broadcasting request to liquidity providers...'}
                                        {auctionStep === 2 && 'collecting price quotes...'}
                                        {auctionStep === 3 && 'comparing rates across providers...'}
                                        {auctionStep === 4 && 'finalizing optimal execution path...'}
                                    </Text>
                                </Flex>
                                <Particles
                                    id='tsparticles'
                                    init={particlesInit}
                                    options={{
                                        background: {
                                            color: {
                                                value: 'transparent',
                                            },
                                        },
                                        fpsLimit: 120,
                                        particles: {
                                            color: {
                                                value: '#FFA04C',
                                            },
                                            links: {
                                                color: '#FFA04C',
                                                distance: 150,
                                                enable: true,
                                                opacity: 0.8,
                                                width: 1,
                                            },
                                            move: {
                                                direction: 'none',
                                                enable: true,
                                                outModes: {
                                                    default: 'bounce',
                                                },
                                                random: false,
                                                speed: 3,
                                                straight: false,
                                            },
                                            number: {
                                                density: {
                                                    enable: true,
                                                    area: 700,
                                                },
                                                value: 80,
                                            },
                                            opacity: {
                                                value: 0.8,
                                            },
                                            shape: {
                                                type: 'circle',
                                            },
                                            size: {
                                                value: { min: 0.8, max: 6 },
                                            },
                                        },
                                        interactivity: {
                                            detect_on: 'window',
                                            events: {
                                                onhover: {
                                                    enable: true,
                                                    mode: 'grab',
                                                },
                                                onclick: {
                                                    enable: true,
                                                    mode: 'push',
                                                },
                                                resize: true,
                                            },
                                            modes: {
                                                grab: {
                                                    distance: 200,
                                                    line_linked: {
                                                        opacity: 1,
                                                    },
                                                },
                                                bubble: {
                                                    distance: 400,
                                                    size: 40,
                                                    duration: 2,
                                                    opacity: 8,
                                                    speed: 3,
                                                },
                                                push: {
                                                    particles_nb: 4,
                                                },
                                                remove: {
                                                    particles_nb: 2,
                                                },
                                            },
                                        },
                                        detectRetina: true,
                                    }}
                                    style={{
                                        position: 'absolute',
                                        zIndex: -1,
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                    }}
                                />
                            </Flex>
                        </>
                    )}
                    {depositFlowState === '2-awaiting-payment' && (
                        // 2 - AWAITING PAYMENT UI
                        <>
                            <DummySwapAmounts />
                            <Flex
                                direction='column'
                                align='center'
                                mt={'30px'}
                                py={isMobile ? '20px' : '27px'}
                                w={isMobile ? '100%' : '950px'}
                                h='480px'
                                borderRadius='40px'
                                boxShadow='0px -1px 33.5px rgba(255, 160, 76, 0.46)'
                                bg={'#000'}
                                overflow={'hidden'}
                                borderBottom={'2px solid #FFA04C'}
                                borderLeft={'2px solid #FFA04C'}
                                borderTop={'2px solid #FFA04C'}
                                borderRight={'2px solid #FFA04C'}>
                                <Flex w='100%' h='100%' mt='-80px' justifyContent={'center'} alignItems={'center'} overflow={'clip'}>
                                    <RiveComponent />
                                </Flex>
                                <Flex w='90%' direction={'column'} alignItems={'center'} mt='-20px' zIndex='1'>
                                    <Text
                                        fontSize={'12px'}
                                        color={'#aaa'}
                                        fontFamily={FONT_FAMILIES.AUX_MONO}
                                        fontWeight={'normal'}
                                        letterSpacing={'-1.5px'}
                                        textShadow='0px 2px 4px rgba(0, 0, 0, 0.7)'>
                                        ~ 10 seconds remaining
                                    </Text>

                                    <Flex align='center' justify='center'>
                                        {/* <Spinner color='#FFA04C' width='16px' height='16px' borderRadius={'200px'} thickness='3px' mr='10px' mt='-2px' speed='0.85s' position='relative' zIndex='1' /> */}
                                        <Text fontSize={'30px'} color={'#fff'} fontWeight={'bold'} fontFamily={FONT_FAMILIES.NOSTROMO} textShadow='0px 0px 4px rgba(150, 150, 150, 0.8)'>
                                            TRANSFERRING ASSETS TO YOUR WALLET...
                                        </Text>
                                    </Flex>
                                    <Text fontSize={'12px'} color={'#aaa'} fontFamily={FONT_FAMILIES.AUX_MONO} fontWeight={'normal'} letterSpacing={'-1px'} textShadow='0px 2px 4px rgba(0, 0, 0, 0.7)'>
                                        We found you the best price! Assets are being transferred to your wallet...
                                    </Text>
                                </Flex>
                            </Flex>
                        </>
                    )}
                    {depositFlowState === '3-payment-recieved' && (
                        // 3 - PAYMENT RECIEVED UI
                        <>
                            <DummySwapAmounts />
                            <Flex
                                direction='column'
                                align='center'
                                mt={'30px'}
                                py={isMobile ? '20px' : '27px'}
                                w={isMobile ? '100%' : '950px'}
                                h='480px'
                                borderRadius='40px'
                                boxShadow='0px -1px 33.5px rgba(255, 160, 76, 0.46)'
                                {...opaqueBackgroundColor}
                                borderBottom={'2px solid #FFA04C'}
                                borderLeft={'2px solid #FFA04C'}
                                borderTop={'2px solid #FFA04C'}
                                borderRight={'2px solid #FFA04C'}>
                                <Flex w='80%' h='100%' ml='60px' mt='-19px' justifyContent={'center'} alignItems={'center'} position='absolute' overflow={'clip'}>
                                    <OrangeButtonRiveComponent />
                                </Flex>

                                <Flex w='90%' direction={'row'} justifyContent={'center'} alignItems={'center'}>
                                    <Flex mt='-2px' mr='10px'>
                                        <BsCheckCircleFill
                                            size={29}
                                            color={'#FFA04C'}
                                            style={{
                                                filter: 'drop-shadow(0px 0px 4.968px rgba(247, 147, 26, 0.43))',
                                                fill: 'url(#orangeGradient)',
                                            }}
                                        />
                                        <svg width='0' height='0'>
                                            <defs>
                                                <linearGradient id='orangeGradient' x1='0%' y1='0%' x2='0%' y2='100%'>
                                                    <stop offset='0%' stopColor='#FFA74A' />
                                                    <stop offset='100%' stopColor='#EF761A' />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    </Flex>
                                    <Text fontSize={'32px'} align={'center'}>
                                        Payment received!
                                    </Text>
                                </Flex>
                                <Flex w='70%' direction={'column'} alignItems={'center'} mt='4px' zIndex='1'>
                                    <Text
                                        fontSize={'12.25px'}
                                        color={'#aaa'}
                                        fontFamily={FONT_FAMILIES.AUX_MONO}
                                        fontWeight={'normal'}
                                        letterSpacing={'-1px'}
                                        textShadow='0px 2px 4px rgba(0, 0, 0, 0.7)'>
                                        Bitcoin has been sent to your wallet and should shortly!
                                    </Text>
                                </Flex>

                                {/* PAYMENT DETAILS */}
                                <Flex w='89%' direction={'row'} justifyContent={'space-between'} alignItems={'center'} mt='55px'>
                                    <Flex direction={'column'} w='29.5%'>
                                        <Text fontFamily={FONT_FAMILIES.NOSTROMO} fontSize={'13px'} mb='7px' fontWeight={'bold'}>
                                            Status
                                        </Text>
                                        <Button
                                            w='100%'
                                            borderRadius={'10px'}
                                            px='17px'
                                            py='19px'
                                            fontSize={'15px'}
                                            fontWeight={'normal'}
                                            justifyContent={'flex-start'}
                                            onClick={() => window.open('https://mempool.space/tx/b3f89c0729bb16636af6bca2a0d0965e8b32663e9d091067e24f52a73d70e869', '_blank')}
                                            letterSpacing={'-1.5px'}
                                            fontFamily={FONT_FAMILIES.AUX_MONO}
                                            border='2px solid #555'
                                            background='linear-gradient(0deg, rgba(97, 97, 97, 0.25) 0%, rgba(0, 0, 0, 0.12) 100%)'
                                            boxShadow='0px 2.595px 23.351px 3.243px rgba(59, 59, 59, 0.33)'
                                            color='white'>
                                            2 Block Confirmations
                                        </Button>
                                    </Flex>

                                    <Flex direction={'column'} w='68%'>
                                        <Text fontFamily={FONT_FAMILIES.NOSTROMO} fontSize={'13px'} mb='7px' fontWeight={'bold'}>
                                            Your Address{' '}
                                        </Text>
                                        <Button
                                            w='100%'
                                            borderRadius={'10px'}
                                            px='17px'
                                            py='19px'
                                            fontSize={'15px'}
                                            onClick={() => window.open('https://mempool.space/tx/b3f89c0729bb16636af6bca2a0d0965e8b32663e9d091067e24f52a73d70e869', '_blank')}
                                            fontWeight={'normal'}
                                            letterSpacing={'-1.5px'}
                                            fontFamily={FONT_FAMILIES.AUX_MONO}
                                            border='2px solid #FF9E38'
                                            background='linear-gradient(0deg, rgba(242, 119, 31, 0.16) 0%, rgba(111, 44, 15, 0.12) 100%)'
                                            boxShadow='0px 2.566px 23.096px 3.208px rgba(254, 157, 56, 0.29)'
                                            backdropFilter='blur(32.00636672973633px)'
                                            color='white'>
                                            <Flex w='100%' justifyContent='space-between' alignItems='center'>
                                                <Text>bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</Text>

                                                <LuCopy color='gray' />
                                            </Flex>
                                        </Button>
                                    </Flex>
                                </Flex>

                                <Flex w='89%' direction={'row'} justifyContent={'space-between'} alignItems={'center'} mt='25px'>
                                    <Flex direction={'column'} w='64%'>
                                        <Text fontFamily={FONT_FAMILIES.NOSTROMO} fontSize={'13px'} mb='7px' fontWeight={'bold'}>
                                            TXN HASH
                                        </Text>
                                        <Button
                                            w='100%'
                                            borderRadius={'10px'}
                                            px='17px'
                                            py='19px'
                                            fontSize={'15px'}
                                            fontWeight={'normal'}
                                            letterSpacing={'-1.5px'}
                                            fontFamily={FONT_FAMILIES.AUX_MONO}
                                            border='2px solid #555'
                                            background='linear-gradient(0deg, rgba(97, 97, 97, 0.25) 0%, rgba(0, 0, 0, 0.12) 100%)'
                                            boxShadow='0px 2.595px 23.351px 3.243px rgba(59, 59, 59, 0.33)'
                                            color='white'>
                                            <Flex w='100%' justifyContent='space-between' alignItems='center'>
                                                <Text>0cabaa52f2c2eb87d68f49b9a...40a1ddeffd296f34ca8b9c201</Text>

                                                <LuCopy color='gray' />
                                            </Flex>
                                        </Button>
                                    </Flex>
                                    <Flex direction={'column'} w='33.5%'>
                                        <Text fontFamily={FONT_FAMILIES.NOSTROMO} fontSize={'13px'} mb='7px' fontWeight={'bold'}>
                                            BALANCE
                                        </Text>

                                        <Button
                                            w='100%'
                                            borderRadius={'10px'}
                                            px='17px'
                                            py='19px'
                                            fontSize={'15px'}
                                            fontWeight={'normal'}
                                            letterSpacing={'-1.5px'}
                                            fontFamily={FONT_FAMILIES.AUX_MONO}
                                            border='2px solid #FF9E38'
                                            background='linear-gradient(0deg, rgba(242, 119, 31, 0.16) 0%, rgba(111, 44, 15, 0.12) 100%)'
                                            boxShadow='0px 2.566px 23.096px 3.208px rgba(254, 157, 56, 0.29)'
                                            backdropFilter='blur(32.00636672973633px)'
                                            color='white'>
                                            <Flex w='100%' alignItems='center'>
                                                <BTC_Logo width={'19px'} height={'19px'} />
                                                <Text ml='8px' letterSpacing={'-1.5px'} fontFamily={FONT_FAMILIES.AUX_MONO} fontSize={'16px'} fontWeight={'normal'}>
                                                    1.20240252
                                                </Text>
                                                <Spacer />
                                                <Text ml='15px' fontFamily={FONT_FAMILIES.AUX_MONO} fontSize={'13px'} fontWeight={'normal'} color={'#999'}>
                                                    $121,355.63
                                                </Text>
                                            </Flex>{' '}
                                        </Button>
                                    </Flex>
                                </Flex>
                                <Flex mt='70px' gap='10px'>
                                    <Button
                                        bg={colors.offBlackLighter}
                                        borderWidth={'2px'}
                                        borderColor={colors.borderGrayLight}
                                        _hover={{ bg: colors.borderGray }}
                                        borderRadius='12px'
                                        px='20px'
                                        h='40px'
                                        border='2px solid #445BCB'
                                        background='rgba(50, 66, 168, 0.30)'
                                        boxShadow='0px 2.595px 23.351px 3.243px rgba(59, 59, 59, 0.33)'>
                                        <Flex mt='-4px ' mr='8px'>
                                            <HiOutlineExternalLink size={'17px'} color={colors.offerWhite} />
                                        </Flex>
                                        <Text fontSize='14px' color={colors.offerWhite} fontFamily={FONT_FAMILIES.NOSTROMO} cursor={'pointer'} fontWeight={'normal'}>
                                            View on Mempool
                                        </Text>
                                    </Button>
                                    <Button
                                        borderRadius='12px'
                                        h='40px'
                                        onClick={() => setDepositFlowState('0-not-started')}
                                        px='20px'
                                        border='2px solid #FF9E38'
                                        background='linear-gradient(0deg, rgba(255, 80, 2, 0.35) 0%, rgba(111, 44, 15, 0.12) 100%)'
                                        boxShadow='0px 2.3px 20.7px 2.875px rgba(254, 157, 56, 0.38)'
                                        backdropFilter='blur(28.685392379760742px)'
                                        _hover={{ opacity: 0.9 }}>
                                        <Flex mt='-4px ' mr='8px'>
                                            <HiOutlineExternalLink size={'17px'} color={colors.offerWhite} />
                                        </Flex>
                                        <Text fontSize='14px' color={colors.offerWhite} fontFamily={FONT_FAMILIES.NOSTROMO} cursor={'pointer'} fontWeight={'normal'}>
                                            Start New Swap
                                        </Text>
                                    </Button>
                                </Flex>
                            </Flex>
                        </>
                    )}
                </Flex>
                <CurrencyModal />
            </Flex>
            {/* </OfflinePage> */}
        </>
    );
};

export default Home;
