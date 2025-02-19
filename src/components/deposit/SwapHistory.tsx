import { Flex, Spinner, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import useHorizontalSelectorInput from '../../hooks/useHorizontalSelectorInput';
import { useStore } from '../../store';
import { colors } from '../../utils/colors';
import { FONT_FAMILIES } from '../../utils/font';
import HorizontalButtonSelector from '../other/HorizontalButtonSelector';
import { useAccount } from 'wagmi';
import { ConnectWalletButton } from '../other/ConnectWalletButton';
import { createReservationUrl } from '../../utils/dappHelper';
import { useRouter } from 'next/router';
import { opaqueBackgroundColor } from '../../utils/constants';
import { useContractData } from '../providers/ContractDataProvider';
import SwapPreviewCard from './SwapPreviewCard';
import UserSwapSettings from './UserSwapSettings';

export const SwapHistory = ({}) => {
    const selectedSwapToManage = useStore((state) => state.selectedSwapToManage);
    const setSelectedSwapToManage = useStore((state) => state.setSelectedSwapToManage);
    const userSwapsFromAddress = useStore((state) => state.userSwapsFromAddress);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const { address, isConnected } = useAccount();
    const { refreshUserSwapsFromAddress, loading } = useContractData();
    const router = useRouter();
    const {
        options: optionsButtonVaultsVsReservations,
        selected: selectedButtonVaultsVsReservations,
        setSelected: setOptionsButtonVaultsVsReservations,
    } = useHorizontalSelectorInput(['Vaults', 'Reservations'] as const);

    const handleGoBack = () => {
        setSelectedSwapToManage(null);
    };

    const handleNavigation = (route: string) => {
        router.push(route);
    };

    useEffect(() => {
        refreshUserSwapsFromAddress();
    }, []);

    // Update selected vault with new data
    // useEffect(() => {
    //     if (selectedSwapToManage) {
    //         const selectedVaultIndex = selectedSwapToManage.index;

    //         const updatedVault = userActiveDepositVaults.find((vault) => vault.index === selectedVaultIndex) || userCompletedDepositVaults.find((vault) => vault.index === selectedVaultIndex);

    //         if (updatedVault) {
    //             setSelectedSwapToManage(updatedVault);
    //         } else {
    //             console.warn(`Vault with index ${selectedVaultIndex} not found in active or completed vaults.`);
    //         }
    //     }
    // }, [selectedSwapToManage]);

    return !isConnected ? (
        <Flex
            w={'100%'}
            h='100%'
            flexDir={'column'}
            userSelect={'none'}
            fontSize={'12px'}
            fontFamily={FONT_FAMILIES.AUX_MONO}
            color={'#c3c3c3'}
            fontWeight={'normal'}
            gap={'0px'}
            align='center'
            mt='24px'>
            <Flex
                w='100%'
                maxW='600px'
                h='200px'
                px='24px'
                justify='center'
                py='12px'
                align={'center'}
                borderRadius={'20px'}
                mt={selectedSwapToManage ? '56px' : '16px'}
                border='2px solid'
                {...opaqueBackgroundColor}
                borderColor={colors.borderGray}
                flexDir='column'>
                <Text textAlign={'center'} fontSize={'16px'} px='20px' mb='30px'>
                    Connect your wallet to see active swaps
                </Text>

                <ConnectWalletButton />
            </Flex>
        </Flex>
    ) : (
        <Flex
            w={'100%'}
            h='100%'
            flexDir={'column'}
            userSelect={'none'}
            fontSize={'12px'}
            fontFamily={FONT_FAMILIES.AUX_MONO}
            color={'#c3c3c3'}
            fontWeight={'normal'}
            gap={'0px'}
            align='center'
            mt='24px'>
            {loading ? (
                <>
                    {' '}
                    <Flex
                        w='100%'
                        maxW='1000px'
                        h='200px'
                        px='24px'
                        justify='center'
                        py='12px'
                        align={'center'}
                        {...opaqueBackgroundColor}
                        borderRadius={'20px'}
                        mt={'16px'}
                        border='2px solid'
                        borderColor={colors.borderGray}
                        flexDir='column'>
                        <Spinner size='lg' thickness='3px' color={colors.textGray} speed='0.65s' />
                    </Flex>
                </>
            ) : (
                <Flex
                    w='100%'
                    maxW='1100px'
                    h='650px'
                    px='24px'
                    justify={loading ? 'center' : userSwapsFromAddress.length > 0 ? 'flex-start' : 'center'}
                    py='12px'
                    align={'center'}
                    {...opaqueBackgroundColor}
                    borderRadius={'35px'}
                    mt={'16px'}
                    border='2px solid'
                    borderColor={colors.borderGray}
                    flexDir='column'>
                    {selectedSwapToManage ? (
                        <UserSwapSettings selectedSwapToManage={selectedSwapToManage} handleGoBack={handleGoBack} selectedInputAsset={selectedInputAsset} />
                    ) : (
                        <>
                            {userSwapsFromAddress.length > 0 ? (
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
                                    fontSize={'14px'}
                                    fontFamily={FONT_FAMILIES.NOSTROMO}
                                    borderColor={colors.borderGray}
                                    fontWeight='bold'
                                    color={colors.offWhite}
                                    gap='12px'>
                                    <Text width='135px'>TIMESTAMP</Text>
                                    <Flex flex={1} gap='12px'>
                                        <Text>SWAP INPUT</Text>
                                        <Flex w='20px' />
                                        <Text ml='140px'>SWAP OUTPUT</Text>
                                        <Text ml='124px' mr='56px'>
                                            TXID
                                        </Text>
                                        <Text ml='94px' mr='52px'>
                                            STATUS
                                        </Text>
                                    </Flex>
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
                            <Flex
                                className='flex-scroll-dark'
                                overflowY={
                                    (selectedButtonVaultsVsReservations === 'Vaults' && userSwapsFromAddress && userSwapsFromAddress.length > 0) ||
                                    (selectedButtonVaultsVsReservations === 'Reservations' && userSwapsFromAddress && userSwapsFromAddress.length > 0)
                                        ? 'scroll'
                                        : 'hidden'
                                }
                                direction='column'
                                w='100%'>
                                {userSwapsFromAddress.length === 0 ? (
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
                                            // map user swaps to SwapPreviewCard components
                                            return userSwapsFromAddress.map((swap, index) => (
                                                <SwapPreviewCard key={`swap-${index}`} swap={swap} onClick={() => setSelectedSwapToManage(swap)} selectedInputAsset={selectedInputAsset} />
                                            ));
                                        })()}
                                    </>
                                )}
                            </Flex>
                        </>
                    )}
                </Flex>
            )}
        </Flex>
    );
};
