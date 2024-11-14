import useWindowSize from '../hooks/useWindowSize';
import { useRouter } from 'next/router';
import { Flex, Spacer, Text, Box, Input, Button, InputGroup, InputRightElement, Tooltip } from '@chakra-ui/react';
import { Navbar } from '../components/nav/Navbar';
import { colors } from '../utils/colors';
import { IoCheckbox } from 'react-icons/io5';
import { useEffect, useState } from 'react';
import { MdOutlineCheckBoxOutlineBlank } from 'react-icons/md';
import { FaCheckSquare } from 'react-icons/fa';
import { FaSearch } from 'react-icons/fa';
import { useStore } from '../store';
import { toastSuccess } from '../hooks/toast';
import { BTCSVG, ETHArrow, WBTCSVG, BTCArrow, GreenCheck } from '../components/other/SVGs';
import { OpenGraph } from '../components/background/OpenGraph';
import SwapTable from '../components/activity/SwapTable';
import useHorizontalSelectorInput from '../hooks/useHorizontalSelectorInput';
import HorizontalButtonSelector from '../components/other/HorizontalButtonSelector';
import ActivityChartContainer from '../components/charts/ActivityChartContainer';
import ActiveLiquidityRawChart from '../components/charts/ActiveLiquidityRawChart';
import MonthlyValueRawChart from '../components/charts/MonthlyValueRawChart';
import { FONT_FAMILIES } from '../utils/font';
import SwapPreviewCard from '../components/deposit/SwapPreviewCard';
import { DepositVault, SwapReservation } from '../types';
import { createReservationUrl } from '../utils/dappHelper';
import { formatUnits } from 'ethers/lib/utils';
import { BigNumber } from 'ethers';

const Activity = () => {
    const { isMobile } = useWindowSize();
    const router = useRouter();
    const handleNavigation = (route: string) => {
        router.push(route);
    };
    const allDepositVaults = useStore((state) => state.allDepositVaults);
    const allSwapReservations = useStore((state) => state.allSwapReservations);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const setSelectedVaultToManage = useStore((state) => state.setSelectedVaultToManage);
    const selectedVaultToManage = useStore((state) => state.selectedVaultToManage);
    const { options: optionsButton, selected: selectedButton, setSelected: setSelectedButton } = useHorizontalSelectorInput(['Swaps', 'Deposits'] as const);
    const [availableLiquidity, setAvailableLiquidity] = useState(BigNumber.from(0));
    const validAssets = useStore((state) => state.validAssets);

    useEffect(() => {
        const totalAvailableLiquidity = validAssets[selectedInputAsset.name]?.totalAvailableLiquidity;
        setAvailableLiquidity(totalAvailableLiquidity ?? BigNumber.from(0));
    }, [validAssets]);

    return (
        <>
            <OpenGraph title='Activity' />
            <Flex h='100vh' width='100%' direction='column' backgroundImage={'/images/rift_background_low.webp'} backgroundSize='cover' backgroundPosition='center'>
                <Navbar />
                <Flex direction={'column'} align='center' w='100%' h='100%' mt='105px'>
                    {/* LOGOS & TEXT */}
                    <Flex direction={'column'} align='center' w='100%'>
                        <Flex
                            sx={{
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                            }}
                            bgGradient={`linear(90deg, #FF8F28, #394AFF)`}
                            letterSpacing={'2px'}
                            mt='-25px'>
                            <Text userSelect={'none'} fontSize='46px' fontFamily={'Klein'} fontWeight='bold' px='12px' as='h1'>
                                Activity
                            </Text>
                        </Flex>
                        <Text
                            userSelect={'none'}
                            fontSize='13px'
                            fontFamily={'Aux'}
                            color={'#c3c3c3'}
                            mt='5px'
                            textAlign={'center'}
                            mb='20px'
                            fontWeight={'normal'}
                            textShadow={'0px 0px 4px rgba(0, 0, 0)'}
                            as='h2'>
                            Manage current swaps and previous bridge activity.
                        </Text>
                    </Flex>

                    {/* CHARTS */}
                    <Flex w='100%' maxW='1200px' gap='12px' px='20px' align='center' justify='center'>
                        {/* <Flex
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
                        </Flex> */}

                        {/* <ActivityChartContainer title='Active Liquidity' value='329,343.32'>
                            <ActiveLiquidityRawChart />
                        </ActivityChartContainer>
                        <ActivityChartContainer title='Monthly Volume' value='$21.23B'>
                            <MonthlyValueRawChart />
                        </ActivityChartContainer> */}
                    </Flex>

                    <Flex w='100%' maxW='1200px' gap='12px' px='20px' mt='40px'>
                        <Flex w='100%' direction='column'>
                            {(allDepositVaults && allDepositVaults.length > 0 && !isMobile) || (allSwapReservations && allSwapReservations.length > 0 && !isMobile) ? (
                                <Flex
                                    w='100%'
                                    h='30px'
                                    py='5px'
                                    mt='5px'
                                    mb='9px'
                                    pl='18px'
                                    align='center'
                                    justify='flex-start'
                                    borderRadius={'10px'}
                                    fontSize={'10px'}
                                    fontFamily={FONT_FAMILIES.NOSTROMO}
                                    borderColor={colors.borderGray}
                                    fontWeight='bold'
                                    color={colors.offWhite}
                                    gap='12px'>
                                    <Flex gap='10vw'>
                                        <Flex width={isMobile ? '10vw' : '109px'}>
                                            <Text>TIMESTAMP</Text>
                                        </Flex>
                                        <Flex w={isMobile ? '10vw' : '105px'}>
                                            <Text>OWNER</Text>
                                        </Flex>
                                        <Flex w={isMobile ? '10vw' : '375px'}>
                                            <Text>SWAP INPUT</Text>
                                        </Flex>
                                        <Flex w={isMobile ? '10vw' : '335px'}>
                                            <Text>SWAP OUTPUT</Text>
                                        </Flex>
                                    </Flex>
                                    <Text width={isMobile ? '10vw' : '140px'} ml='20px' mr='52px'>
                                        STATUS
                                    </Text>
                                </Flex>
                            ) : null}
                            <style>
                                {`
                                .flex-scroll-dark::-webkit-scrollbar {
                                    width: 8px;
                                    padding-left: 10px;
                                }
                                .flex-scroll-dark::-webkit-scrollbar-track {
                                    background: transparent;
                                    margin-left: 10px;
                                }
                                .flex-scroll-dark::-webkit-scrollbar-thumb {
                                    background-color: #555;
                                    border-radius: 6px;
                                    border: 2px solid #2D2D2D;
                                }
                            `}
                            </style>
                            <Flex className='flex-scroll-dark' overflowY={'scroll'} direction='column' w='100%'>
                                {(allSwapReservations == null || allSwapReservations.length === 0) && (allDepositVaults == null || allDepositVaults.length === 0) ? (
                                    <Flex justify={'center'} direction='column' fontSize={'16px'} alignItems={'center'}>
                                        <Text mb='10px'>No active swaps found with your address...</Text>
                                        <Flex
                                            bg={colors.purpleBackground}
                                            _hover={{ bg: colors.purpleHover }}
                                            w='320px'
                                            mt='15px'
                                            transition={'0.2s'}
                                            h='48px'
                                            onClick={() => handleNavigation('/')}
                                            fontSize={'16px'}
                                            align={'center'}
                                            userSelect={'none'}
                                            cursor={'pointer'}
                                            borderRadius={'10px'}
                                            justify={'center'}
                                            border={'3px solid #445BCB'}>
                                            <Text color={colors.offWhite} fontFamily='Nostromo'>
                                                Create a swap
                                            </Text>
                                        </Flex>
                                    </Flex>
                                ) : (
                                    <>
                                        {(() => {
                                            // Combine reservations and vaults into a single array
                                            const combinedReservationsAndVaults = [
                                                ...allSwapReservations.map((reservation) => ({ type: 'reservation', data: reservation })),
                                                ...allDepositVaults.map((vault) => ({ type: 'vault', data: vault })),
                                            ];

                                            // Sort the combined array by timestamp in descending order
                                            combinedReservationsAndVaults.sort((a, b) => {
                                                // Directly check properties to access the correct timestamp
                                                const timestampA = 'reservationTimestamp' in a.data ? a.data.reservationTimestamp : a.data.depositTimestamp;
                                                const timestampB = 'reservationTimestamp' in b.data ? b.data.reservationTimestamp : b.data.depositTimestamp;
                                                return timestampB - timestampA;
                                            });

                                            // Map the sorted array back to the unified LightDepositVault component
                                            return combinedReservationsAndVaults.map((item, index) => {
                                                if (item.type === 'reservation') {
                                                    const reservation = item.data as SwapReservation;
                                                    return <SwapPreviewCard key={`reservation-${index}`} reservation={reservation} selectedInputAsset={selectedInputAsset} isActivityPage={true} />;
                                                } else {
                                                    const vault = item.data as DepositVault;
                                                    return (
                                                        <SwapPreviewCard
                                                            key={`vault-${index}`}
                                                            vault={vault}
                                                            selectedInputAsset={selectedInputAsset}
                                                            isActivityPage={true}
                                                            onClick={() => setSelectedVaultToManage(vault)}
                                                        />
                                                    );
                                                }
                                            });
                                        })()}
                                    </>
                                )}
                            </Flex>
                        </Flex>
                    </Flex>
                </Flex>
            </Flex>
        </>
    );
};

export default Activity;
