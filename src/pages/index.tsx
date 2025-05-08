import useWindowSize from '../hooks/useWindowSize';
import { useRouter } from 'next/router';
import { Flex, Spacer, Text, Box, Spinner } from '@chakra-ui/react';
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
                            <Flex mt='20px'></Flex>
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
                                <Flex w='90%' direction={'column'} justifyContent={'center'} alignItems={'center'}>
                                    <Text align={'center'}>Payment received!</Text>
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
