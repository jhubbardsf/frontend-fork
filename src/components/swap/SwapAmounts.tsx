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
    Spinner,
} from '@chakra-ui/react';
import useWindowSize from '../../hooks/useWindowSize';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { colors } from '../../utils/colors';
import { useStore } from '../../store';
import { BTCSVG, ETHSVG, InfoSVG } from '../other/SVGs';
import { FONT_FAMILIES } from '../../utils/font';
import { ArrowRightIcon } from '@chakra-ui/icons';
import { FaArrowRight } from 'react-icons/fa';
import { MdArrowRight } from 'react-icons/md';
import { AssetTag } from '../other/AssetTag';
import { LoaderIcon } from 'react-hot-toast';
import { opaqueBackgroundColor } from '../../utils/constants';

export const SwapAmounts = ({}) => {
    const { isMobile } = useWindowSize();
    const router = useRouter();
    const fontSize = isMobile ? '20px' : '20px';
    const btcInputSwapAmount = useStore((state) => state.btcInputSwapAmount);
    const btcOutputAmount = useStore((state) => state.btcOutputAmount);
    const coinbaseBtcOutputAmount = useStore((state) => state.coinbaseBtcOutputAmount);
    const btcAsset = useStore.getState().findAssetByName('BTC');
    const btcPriceUSD = btcAsset?.priceUSD || 0;
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const swapReservationNotFound = useStore((state) => state.swapReservationNotFound);
    const swapFlowState = useStore((state) => state.swapFlowState);
    const setSwapFlowState = useStore((state) => state.setSwapFlowState);
    const findAssetByName = useStore((state) => state.findAssetByName);

    const handleNavigation = (route: string) => {
        router.push(route);
    };

    const actualBorderColor = '#323232';
    const borderColor = `2px solid ${actualBorderColor}`;

    return (
        <>
            {btcInputSwapAmount === '-1' || coinbaseBtcOutputAmount === '-1' ? (
                swapReservationNotFound ? null : (
                    <Flex
                        {...opaqueBackgroundColor}
                        borderWidth={3}
                        borderColor={colors.borderGray}
                        borderRadius={'full'}
                        h='88px'
                        px={'35px'}
                        fontFamily={FONT_FAMILIES.AUX_MONO}
                        fontWeight={'normal'}
                        py='3px'>
                        <Flex align={'center'} justify={'center'}>
                            <Spinner size='lg' thickness='3px' color={colors.textGray} speed='0.65s' />
                        </Flex>
                    </Flex>
                )
            ) : (
                <Flex
                    mt={swapFlowState === '2-send-bitcoin' ? '-55px' : '0px'}
                    borderRadius={'full'}
                    h='88px'
                    {...opaqueBackgroundColor}
                    px={'40px'}
                    fontFamily={FONT_FAMILIES.AUX_MONO}
                    fontWeight={'normal'}
                    borderWidth={3}
                    borderColor={colors.borderGray}
                    boxShadow={'0px 0px 20px 5px rgba(0, 0, 0, 0.3)'}
                    py='3px'>
                    <Flex direction='column'>
                        <Flex>
                            <Text mr='15px' fontSize={'36px'} letterSpacing={'-5px'} color={colors.offWhite}>
                                {btcInputSwapAmount === '-1' ? 'Loading...' : btcInputSwapAmount}
                            </Text>
                            <Flex mt='-14px' mb='-9px'>
                                <AssetTag assetName='BTC' width='79px' />
                            </Flex>
                        </Flex>
                        <Text
                            color={colors.textGray}
                            fontSize={'13px'}
                            mt='-12px'
                            ml='6px'
                            letterSpacing={'-2px'}
                            fontWeight={'normal'}
                            fontFamily={'Aux'}>
                            ≈ $
                            {(parseFloat(btcInputSwapAmount) * btcPriceUSD).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}{' '}
                            USD{' '}
                        </Text>
                    </Flex>

                    <Spacer />
                    <Flex align='center' ml='-4px' mr='-5px' mt='-2px' justify={'center'}>
                        <MdArrowRight size={'50px'} color={colors.darkerGray} />
                    </Flex>
                    <Spacer />
                    <Flex direction='column'>
                        <Flex>
                            <Text mr='15px' fontSize={'36px'} letterSpacing={'-5px'} color={colors.offWhite}>
                                {coinbaseBtcOutputAmount === '-1' ? 'Loading...' : coinbaseBtcOutputAmount}
                            </Text>
                            <Flex mt='-14px' mb='-9px'>
                                <AssetTag assetName='ARBITRUM_USDT' width='108px' />
                            </Flex>{' '}
                        </Flex>
                        <Text
                            color={colors.textGray}
                            fontSize={'13px'}
                            mt='-10.5px'
                            ml='6px'
                            letterSpacing={'-2px'}
                            fontWeight={'normal'}
                            fontFamily={'Aux'}>
                            ≈ $
                            {(
                                parseFloat(coinbaseBtcOutputAmount) *
                                    findAssetByName(selectedInputAsset.name)?.priceUSD || 0
                            ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}{' '}
                            USD{' '}
                        </Text>
                    </Flex>
                </Flex>
            )}
        </>
    );
};
