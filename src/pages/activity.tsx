import { Flex, Text } from '@chakra-ui/react';
import { useConnectModal } from '../hooks/useReownConnect';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import HorizontalButtonSelector from '../components/other/HorizontalButtonSelector';
import OrangeText from '../components/other/OrangeText';
import WhiteText from '../components/other/WhiteText';
import { SwapHistory } from '../components/deposit/SwapHistory';
import useHorizontalSelectorInput from '../hooks/useHorizontalSelectorInput';
import useWindowSize from '../hooks/useWindowSize';
import { useStore } from '../store';
import { colors } from '../utils/colors';
import { useContractData } from '../components/providers/ContractDataProvider';
import ActivityChartContainer from '../components/charts/ActivityChartContainer';
import ActiveLiquidityRawChart from '../components/charts/ActiveLiquidityRawChart';
import MonthlyValueRawChart from '../components/charts/MonthlyValueRawChart';
import { BigNumber } from 'ethers';
import { FONT_FAMILIES } from '../utils/font';
import { formatUnits } from 'ethers/lib/utils';
import React from 'react';
import MainLayout from '../components/layout/MainLayout';

const Activity = () => {
    const { isMobile } = useWindowSize();
    const router = useRouter();
    const handleNavigation = (route: string) => {
        router.push(route);
    };
    const {
        options: optionsButton,
        selected: selectedButton,
        setSelected: setSelectedButton,
    } = useHorizontalSelectorInput(['Create a Vault', 'Manage Vaults'] as const);

    const userSwapsFromAddress = useStore((state) => state.userSwapsFromAddress);

    const selectedSwapToManage = useStore((state) => state.selectedSwapToManage);
    const setSelectedSwapToManage = useStore((state) => state.setSelectedSwapToManage);
    const showManageDepositVaultsScreen = useStore((state) => state.showManageDepositVaultsScreen);
    const setShowManageDepositVaultsScreen = useStore((state) => state.setShowManageDepositVaultsScreen);
    const { address, isConnected } = useAccount();
    const { loading } = useContractData();
    const [availableLiquidity, setAvailableLiquidity] = useState(BigNumber.from(0));
    const validAssets = useStore((state) => state.validAssets);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    useEffect(() => {
        const totalAvailableLiquidity = validAssets[selectedInputAsset.name]?.totalAvailableLiquidity;
        setAvailableLiquidity(totalAvailableLiquidity ?? BigNumber.from(0));
    }, [validAssets]);

    // switch to manage vaults screen if user has just created a vault
    useEffect(() => {
        if (showManageDepositVaultsScreen) {
            setSelectedButton('Manage Vaults');
            console.log('Switching to manage vaults screen', selectedButton);
            setShowManageDepositVaultsScreen(false);
        }
    }, [showManageDepositVaultsScreen, selectedButton]);

    // reset selected vault when switching between screens
    useEffect(() => {
        if (selectedButton !== 'Manage Vaults') {
            setSelectedSwapToManage(null);
        }
    }, [selectedButton]);

    const handleButtonSelection = (selection) => {
        setSelectedButton(selection);
    };

    return (
        <MainLayout title='Liquidity'>
            <Flex direction={'column'} align='center' w='100%' h='100%' mt='105px'>
                {/* LOGOS & TEXT */}
                <Flex direction={'column'} align='center' mt={!isConnected ? '20vh' : '10px'} w='100%'>
                    <Flex
                        sx={{
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                        }}
                        bgGradient={`linear(-90deg, #394AFF, #FF8F28)`}
                        opacity={0.9}
                        letterSpacing={'2px'}
                        mt='-10px'>
                        <Text
                            userSelect={'none'}
                            fontSize='60px'
                            fontFamily={'Klein'}
                            fontWeight='bold'
                            px='12px'
                            as='h1'>
                            Activity
                        </Text>
                    </Flex>
                </Flex>
                {/* CHARTS */}
                {/* <Flex w='100%' mt='25px' maxW='1100px' gap='12px' align='center' justify='center' direction='column'>
                     <Flex
                        letterSpacing={'-2px'}
                        bg={colors.offBlack}
                        mb='10px'
                        fontSize={'24px'}
                        direction={'column'}
                        px='36px'
                        py={'12px'}
                        align='center'
                        justify='center'
                        borderRadius={'10px'}
                        border='2px solid '
                        color={colors.textGray}
                        borderColor={colors.borderGray}
                        gap='0px'
                        height={'120px'}>
                        <Text fontSize={'14px'} fontFamily={FONT_FAMILIES.AUX_MONO} color={colors.offWhite}>
                            TOTAL AVAILABLE LIQUIDITY
                        </Text>
                        <Text fontSize={'29px'} color={selectedInputAsset.border_color_light} fontFamily={FONT_FAMILIES.AUX_MONO}>{`${formatUnits(
                            availableLiquidity,
                            selectedInputAsset.decimals,
                        )} ${selectedInputAsset.name}`}</Text>
                    </Flex> 

                <Flex w='100%' direction='row' gap='12px'>
                        <ActivityChartContainer title='Active Liquidity' value='329,343.32'>
                            <ActiveLiquidityRawChart />
                        </ActivityChartContainer>
                        <ActivityChartContainer title='Monthly Volume' value='$21.23B'>
                            <MonthlyValueRawChart />
                        </ActivityChartContainer>
                    </Flex> 
                </Flex>*/}
                <Flex w='100%' maxW='1200px' align={'center'} justify={'center'}>
                    <SwapHistory />
                </Flex>
            </Flex>
        </MainLayout>
    );
};

export default Activity;
