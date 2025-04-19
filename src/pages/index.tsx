import useWindowSize from '../hooks/useWindowSize';
import { useRouter } from 'next/router';
import { Flex, Spacer, Text, Box } from '@chakra-ui/react';
import { colors } from '../utils/colors';
import { FONT_FAMILIES } from '../utils/font';
import BlueText from '../components/other/BlueText';
import OrangeText from '../components/other/OrangeText';
import React, { useEffect } from 'react';
import { useStore } from '../store';
import { SwapContainer } from '../components/swap/SwapContainer';
import { DepositUI } from '../components/deposit/DepositUI';
import { ReserveLiquidityContainer } from '../components/swap/ReserveLiquidityContainer';
import CurrencyModal from '../components/swap/CurrencyModal';
import OfflinePage from '../components/background/OfflinePage';
import MainLayout from '../components/layout/MainLayout';

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

    useEffect(() => {
        setSwapFlowState('0-not-started');
        setDepositFlowState('0-not-started');
        setCoinbaseBtcDepositAmount('');
        setBtcInputSwapAmount('');
        setBtcOutputAmount('');
    }, []);

    const RiftSVG = () => {
        return (
            <svg
                width={isTablet ? '50' : '90'}
                height={isTablet ? '30' : '40'}
                viewBox='0 0 2293 547'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'>
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
        <MainLayout>
            <Flex
                direction={'column'}
                align='center'
                w='100%'
                mt={swapFlowState === '0-not-started' ? '15vh' : '100px'}>
                {swapFlowState != '0-not-started' ? (
                    <ReserveLiquidityContainer />
                ) : (
                    // {/* LOGOS & TEXT */}
                    <>
                        {depositFlowState === '0-not-started' && (
                            <>
                                <RiftSVG />
                                <Flex
                                    userSelect={'none'}
                                    cursor={'default'}
                                    sx={{
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                    }}
                                    bgGradient={`linear(90deg, #394AFF, #FF8F28)`}
                                    letterSpacing={isTablet ? '1px' : '2px'}
                                    fontSize={isMobile ? '44px' : isTablet ? '60px' : '106px'}
                                    fontFamily={'Klein'}
                                    fontWeight='bold'
                                    mt={isTablet ? '-18px' : '-25px'}>
                                    <Text px='12px' as='h1'>
                                        HyperBrid
                                    </Text>
                                    <Text ml={isTablet ? '-18px' : '-20px'} as='h1'>
                                        ge
                                    </Text>
                                </Flex>

                                <Flex
                                    flexDir={'column'}
                                    textAlign={'center'}
                                    userSelect={'none'}
                                    fontSize={isTablet ? '12px' : '15px'}
                                    mt={'8px'}
                                    fontFamily={FONT_FAMILIES.AUX_MONO}
                                    color={'#c3c3c3'}
                                    cursor={'default'}
                                    fontWeight={'normal'}
                                    gap={'0px'}>
                                    <Text>
                                        The first trustless <OrangeText>Bitcoin</OrangeText> exchange
                                    </Text>
                                    <Text>
                                        See{' '}
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
                            </>
                        )}
                        <SwapContainer />
                    </>
                )}
            </Flex>
            <CurrencyModal />
        </MainLayout>
    );
};

export default Home;
