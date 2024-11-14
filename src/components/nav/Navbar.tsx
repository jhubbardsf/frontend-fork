import { Box, Button, Flex, FlexProps, Spacer, Text, Image, useClipboard, VStack, Input } from '@chakra-ui/react';
import { colors } from '../../utils/colors';
import useWindowSize from '../../hooks/useWindowSize';
import { useRouter } from 'next/router';
import { IoMenu } from 'react-icons/io5';
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
import { getDepositVaultByIndex } from '../../utils/contractReadFunctions';
import riftExchangeABI from '../../abis/RiftExchange.json';

export const Navbar = ({}) => {
    const { isMobile, isTablet, isSmallLaptop, windowSize } = useWindowSize();
    const router = useRouter();
    const fontSize = isMobile ? '20px' : '20px';
    const allSwapReservations = useStore((state) => state.allSwapReservations);
    const allDepositVaults = useStore((state) => state.allDepositVaults);
    const userActiveDepositVaults = useStore((state) => state.userActiveDepositVaults);
    const userCompletedDepositVaults = useStore((state) => state.userCompletedDepositVaults);
    const totalExpiredReservations = useStore((state) => state.totalExpiredReservations);
    const setTotalUnlockedReservations = useStore((state) => state.setTotalUnlockedReservations);
    const totalUnlockedReservations = useStore((state) => state.totalUnlockedReservations);
    const totalCompletedReservations = useStore((state) => state.totalCompletedReservations);
    const [showDeveloperMode, setShowDeveloperMode] = useState(false);
    const [isLocalhost, setIsLocalhost] = useState(false);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const validAssets = useStore((state) => state.validAssets);
    const lowestFeeReservationParams = useStore((state) => state.lowestFeeReservationParams);
    const [availableLiquidity, setAvailableLiquidity] = useState(BigNumber.from(0));
    const [formattedTotalAmount, setFormattedTotalAmount] = useState<string>('0');
    const protocolFeeAmountMicroUsdt = useStore((state) => state.protocolFeeAmountMicroUsdt);
    const setSelectedVaultToManage = useStore((state) => state.setSelectedVaultToManage);
    const selectedVaultToManage = useStore((state) => state.selectedVaultToManage);
    const [localSelectedVaultToManage, setLocalSelectedVaultToManage] = useState<number | null>(null);
    const [isLoadingVault, setIsLoadingVault] = useState(false);
    const ethersRpcProvider = useStore.getState().ethersRpcProvider;

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

    const handleSetVaultToManage = async () => {
        if (localSelectedVaultToManage === null) {
            alert('Please enter a valid number');
            return;
        }

        setIsLoadingVault(true);
        try {
            const vaultData = await getDepositVaultByIndex(ethersRpcProvider, riftExchangeABI.abi, selectedInputAsset.riftExchangeContractAddress, localSelectedVaultToManage);
            if (vaultData) {
                setSelectedVaultToManage(vaultData);
                alert(`Vault ${localSelectedVaultToManage} set to manage`);
            } else {
                alert(`No vault found with index ${localSelectedVaultToManage}`);
            }
        } catch (error) {
            console.error('Error fetching vault data:', error);
            alert('Error fetching vault data. Please try again.');
        } finally {
            setIsLoadingVault(false);
        }
    };

    if (isMobile) return null;

    return (
        <Flex width='100%' direction={'column'} position='fixed' top={0} left={0} right={0} zIndex={1000}>
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
                    {/* {navItem('Lending', '/lending')} */}
                    {/* {navItem('OTC', '/otc')} */}
                    {/* {navItem('Manage', '/manage')} */}
                    {navItem('Activity', '/activity')}
                    {navItem('About', '/about')}
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
                    {/* {isLocalhost && ( */}
                    <Button
                        position={'absolute'}
                        top={0}
                        w='20px'
                        mt='54px'
                        _hover={{ background: 'rgba(150, 150, 150, 0.2)' }}
                        color={colors.textGray}
                        bg={'none'}
                        onClick={() => {
                            setShowDeveloperMode(!showDeveloperMode);
                        }}></Button>
                    {/* )} */}
                    {showDeveloperMode && (
                        <>
                            <Text my='10px'>Current Rift Contracts:</Text>
                            <VStack spacing={1} align='stretch' width='100%' maxWidth='600px'>
                                {Object.keys(useStore.getState().validAssets).map((key) => {
                                    const asset = useStore.getState().validAssets[key];
                                    return (
                                        <Flex key={key} justify='space-between'>
                                            <Text>{asset.name}:</Text>
                                            <Text>{asset.riftExchangeContractAddress}</Text>
                                            <Text>Chain: {getChainName(asset.contractChainID)}</Text>
                                        </Flex>
                                    );
                                })}
                            </VStack>
                            <Flex direction='column' mt='50vh' align='center' width='100%'>
                                <Text fontFamily={FONT_FAMILIES.NOSTROMO} fontSize='16px' fontWeight='normal' mb={4}>
                                    Vault Selection Algo VISUALIZER
                                </Text>
                                <Text fontFamily={FONT_FAMILIES.NOSTROMO} fontSize='16px' fontWeight='normal' mb={4}>
                                    If you found this, you're a wizard
                                </Text>
                                <Flex justify='center' wrap='wrap' gap={4} alignItems='center'>
                                    {lowestFeeReservationParams?.vaultIndexesToReserve?.map((index, i) => (
                                        <React.Fragment key={`${index}-${i}`}>
                                            <Box
                                                border='3px solid'
                                                borderColor={colors.purpleBorder}
                                                borderRadius='md'
                                                p={3}
                                                pt='10px'
                                                bg={colors.purpleBackground}
                                                width='250px'
                                                height='95px'
                                                display='flex'
                                                flexDirection='column'
                                                alignItems='center'
                                                justifyContent='space-between'
                                                boxShadow='md'>
                                                <Text fontSize='12px' color={colors.textGray} fontWeight='bold'>
                                                    Vault #{index}
                                                </Text>
                                                <Text fontFamily={FONT_FAMILIES.AUX_MONO} letterSpacing={'-2px'} fontSize='25px'>
                                                    {parseFloat(formatUnits(lowestFeeReservationParams.amountsInMicroUsdtToReserve[i], selectedInputAsset.decimals)).toFixed(2)}{' '}
                                                    {selectedInputAsset.name}
                                                </Text>
                                                <Text fontSize='8px' color={colors.textGray} fontWeight='bold'>
                                                    {BigNumber.from(lowestFeeReservationParams.btcExchangeRates[i]).toString()} μUsdt/Sat
                                                </Text>
                                            </Box>
                                            {i < lowestFeeReservationParams.vaultIndexesToReserve.length - 1 ? (
                                                <Text fontSize='24px' fontWeight='bold'>
                                                    +
                                                </Text>
                                            ) : (
                                                <Text fontSize='24px' fontWeight='bold'>
                                                    =
                                                </Text>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    <Box
                                        border='3px solid'
                                        borderColor={colors.greenOutline}
                                        borderRadius='md'
                                        p={3}
                                        bg={colors.greenBackground}
                                        width='250px'
                                        height='90px'
                                        display='flex'
                                        flexDirection='column'
                                        alignItems='center'
                                        justifyContent='space-between'
                                        boxShadow='md'>
                                        <Text fontSize='12px' color={colors.offerWhite} fontWeight='bold'>
                                            TOTAL AMOUNT
                                        </Text>
                                        <Text fontFamily={FONT_FAMILIES.AUX_MONO} letterSpacing={'-2px'} fontSize='25px'>
                                            {parseFloat(formattedTotalAmount.toString()).toFixed(2)} {selectedInputAsset.name}
                                        </Text>
                                    </Box>
                                </Flex>

                                {protocolFeeAmountMicroUsdt && (
                                    <>
                                        <Text fontFamily={FONT_FAMILIES.AUX_MONO} fontSize='16px' fontWeight='normal' mt={4} color={colors.textGray}>
                                            {protocolFeeAmountMicroUsdt.toString()} MICRO {selectedInputAsset.name} PROTOCOL FEE
                                        </Text>
                                        <Text fontFamily={FONT_FAMILIES.AUX_MONO} fontSize='16px' fontWeight='normal' mt={4} color={colors.textGray}>
                                            {parseFloat(formatUnits(protocolFeeAmountMicroUsdt, selectedInputAsset.decimals))} {selectedInputAsset.name} PROTOCOL FEE
                                        </Text>
                                    </>
                                )}
                            </Flex>

                            <Flex position='absolute' top={windowSize.height - 140} gap={3} flexWrap='wrap' justifyContent='center'>
                                <StatCard label='Total Available Liquidity' value={`${formatUnits(availableLiquidity, selectedInputAsset.decimals)} ${selectedInputAsset.name}`} />
                                <StatCard label='Total Deposits' value={allDepositVaults.length} />
                                <StatCard label='My Active Deposits' value={userActiveDepositVaults.length} />
                                <StatCard label='My Completed Deposits' value={userCompletedDepositVaults.length} />
                                <StatCard label='Total Active Reservations' value={allSwapReservations.length - totalUnlockedReservations - totalCompletedReservations - totalExpiredReservations} />
                                <StatCard label='Total Expired Reservations' value={totalExpiredReservations} />
                                <StatCard label='Total Unlocked Reservations' value={totalUnlockedReservations} />
                                <StatCard label='Total Completed Reservations' value={totalCompletedReservations} />
                                <StatCard label='Total Expired Reservations' value={totalExpiredReservations} />
                            </Flex>
                        </>
                    )}
                </Flex>
                <Spacer />
                <Flex mb='-5px' pr='5px'>
                    <ConnectWalletButton />
                </Flex>
            </Flex>
        </Flex>
    );
};
