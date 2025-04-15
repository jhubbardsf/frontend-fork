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
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { colors } from '../../utils/colors';
import { BTCSVG, ETHSVG, InfoSVG } from '../other/SVGs';
import { SwapAmounts } from './SwapAmounts';
import { ChevronLeftIcon } from '@chakra-ui/icons';
import riftExchangeABI from '../../abis/RiftExchange.json';
import { useStore } from '../../store';
import { SwapStatusTimeline } from './SwapStatusTimeline';
import { FONT_FAMILIES } from '../../utils/font';
import { weiToEth } from '../../utils/dappHelper';
import { BigNumber, ethers } from 'ethers';
import { useReserveLiquidity } from '../../hooks/contract/useReserveLiquidity';
import ReservationStatusModal from './ReservationStatusModal';
import { formatUnits } from 'ethers/lib/utils';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useConnectModal } from '../../hooks/useReownConnect';
import { FRONTEND_RESERVATION_EXPIRATION_WINDOW_IN_SECONDS, opaqueBackgroundColor } from '../../utils/constants';
import { IoMdCheckmarkCircle } from 'react-icons/io';
import { HiXCircle } from 'react-icons/hi';
import { FaClock, FaLock } from 'react-icons/fa';
import { LockClosed } from 'react-ionicons';
import { AssetTag } from '../other/AssetTag';
import WebAssetTag from '../other/WebAssetTag';
import { toastError, toastInfo } from '../../hooks/toast';
import { listenForLiquidityReservedEvent } from '../../utils/contractReadFunctions';
import { useContractData } from '../../components/providers/ContractDataProvider';
import { bufferTo18Decimals, createReservationUrl } from '../../utils/dappHelper';
import {
    ProxyWalletLiquidityProvider,
    ReservationByPaymasterRequest,
    ReservationByPaymasterResponse,
} from '../../types';
import {
    CreateRiftSwapArgs,
    GetProxyWalletArgs,
    GetProxyWalletResponse,
    GetRiftSwapFeesArgs,
    GetRiftSwapStatusArgs,
    ProxyWalletStatus,
    RiftSwapFees,
} from '../../proxy-wallet/types';

export const ReserveLiquidity = ({}) => {
    const { isMobile } = useWindowSize();
    const router = useRouter();
    const fontSize = isMobile ? '20px' : '20px';
    const actualBorderColor = '#323232';
    const chainId = useChainId();
    const { chains, error, switchChain } = useSwitchChain();
    const borderColor = `2px solid ${actualBorderColor}`;
    const swapFlowState = useStore((state) => state.swapFlowState);
    const setSwapFlowState = useStore((state) => state.setSwapFlowState);
    const lowestFeeReservationParams = useStore((state) => state.lowestFeeReservationParams);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const setEthPayoutAddress = useStore((state) => state.setEthPayoutAddress);
    const ethPayoutAddress = useStore((state) => state.ethPayoutAddress);
    const { address, isConnected } = useAccount();
    const [isAwaitingConnection, setIsAwaitingConnection] = useState(false);
    const { openConnectModal } = useConnectModal();
    const setLowestFeeReservationParams = useStore((state) => state.setLowestFeeReservationParams);
    const [isWaitingForCorrectNetwork, setIsWaitingForCorrectNetwork] = useState(false);
    const [isEthereumPayoutAddressValid, setIsEthereumPayoutAddressValid] = useState<boolean>(false);
    const isPayingFeesInBTC = useStore((state) => state.isPayingFeesInBTC);
    const ethersRpcProvider = useStore.getState().ethersRpcProvider;
    const [loadingReservation, setLoadingReservation] = useState(false);
    const [reservationError, setReservationError] = useState<string | null>(null);

    const { refreshUserSwapsFromAddress } = useContractData();

    const handleNavigation = (route: string) => {
        router.push(route);
    };

    // usdt payout address
    const handleETHPayoutAddressChange = (e) => {
        const newEthPayoutAddress = e.target.value;
        setEthPayoutAddress(newEthPayoutAddress);

        // Update the lowestFeeReservationParams with the new ETH payout address
        setLowestFeeReservationParams({
            ...lowestFeeReservationParams,
            ethPayoutAddress: newEthPayoutAddress,
        });
    };
    const {
        reserveLiquidity,
        status: reserveLiquidityStatus,
        error: reserveLiquidityError,

        txHash,
        resetReserveState,
    } = useReserveLiquidity();

    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!isPayingFeesInBTC) {
            if (isConnected && isAwaitingConnection) {
                setIsAwaitingConnection(false);
                proceedWithReservationPayingFeesUsingEth();
            }

            if (isWaitingForCorrectNetwork && chainId === selectedInputAsset.contractChainID) {
                setIsWaitingForCorrectNetwork(false);
                proceedWithReservationPayingFeesUsingEth();
            }
        }
    }, [isConnected, isAwaitingConnection, chainId, isWaitingForCorrectNetwork]);

    const initiateReservationPayingFeesInEth = async () => {
        if (!isPayingFeesInBTC) {
            if (!isConnected) {
                setIsAwaitingConnection(true);
                openConnectModal();
                return;
            }

            if (chainId !== selectedInputAsset.contractChainID) {
                setIsWaitingForCorrectNetwork(true);
                switchChain({ chainId: selectedInputAsset.contractChainID });
                return;
            }
            proceedWithReservationPayingFeesUsingEth();
        }
    };

    const proceedWithReservationPayingFeesUsingBtc = async () => {
        // Reset the reserve state before starting a new reservation
        setLoadingReservation(true);
        resetReserveState();

        const totalSatsInputInlcudingProxyFee = lowestFeeReservationParams.totalSatsInputInlcudingProxyFee;

        // get the current block height
        const blockHeight = await ethersRpcProvider.getBlockNumber();

        try {
            // [1] sauce this to server:
            const reservationRequest: ReservationByPaymasterRequest = {
                sender: String(ethPayoutAddress), // address that will receive the ETH payout
                vault_indexes_to_reserve: lowestFeeReservationParams.vaultIndexesToReserve.map(String), // convert each vault index to a string
                amounts_to_reserve: lowestFeeReservationParams.amountsInMicroUsdtToReserve.map(String), // convert each amount to a string
                eth_payout_address: String(ethPayoutAddress), // convert ETH payout address to a string
                total_sats_input_inlcuding_proxy_fee: String(totalSatsInputInlcudingProxyFee), // convert total sats including proxy fee to a string
                expired_swap_reservation_indexes: lowestFeeReservationParams.expiredSwapReservationIndexes.map(String), // convert each expired reservation index to a string
            };

            // Retry if we get this error with different deposit vaults:
            // NotEnoughLiquidity() -> 0x4323a555
            try {
                // let resp = await validateReserveLiquidity(ethersRpcProvider, riftExchangeABI.abi, selectedInputAsset.riftExchangeContractAddress, reservationRequest);
            } catch (e) {
                if (e.toString().includes('0x4323a555')) {
                    // liquidity being unavail/changed
                    toastError('', {
                        title: 'Liquidity Unavailable',
                        description: 'Someone else reserved your liquidity from under your feet :(',
                    });
                    setSwapFlowState('0-not-started');
                } else {
                    // some other reservation error
                    toastError('', {
                        title: 'Reservation Failed',
                        description: 'There was an error reserving liquidity, please try again.',
                    });
                    setSwapFlowState('0-not-started');
                }
                const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
                await sleep(5000);
            }

            // [0] start listening for the liquidity reserved event
            let reservationsDetailPromise = listenForLiquidityReservedEvent(
                ethersRpcProvider,
                selectedInputAsset.riftExchangeContractAddress,
                riftExchangeABI.abi,
                ethPayoutAddress,
                blockHeight,
            );

            // [1] wait for the reservation to confirm
            const reservationDetails = await reservationsDetailPromise;

            const reservationUri = createReservationUrl(
                reservationDetails.orderNonce,
                reservationDetails.swapReservationIndex,
            );

            const liquidityProviders: Array<ProxyWalletLiquidityProvider> =
                lowestFeeReservationParams.vaultIndexesToReserve.map((index: number, i: number) => {
                    return {
                        amount: BigNumber.from(
                            bufferTo18Decimals(
                                lowestFeeReservationParams.amountsInMicroUsdtToReserve[i],
                                selectedInputAsset.decimals,
                            ),
                        ).toString(),
                        btcExchangeRate: BigNumber.from(lowestFeeReservationParams.btcExchangeRates[i]).toString(),
                        lockingScriptHex: lowestFeeReservationParams.btcPayoutLockingScripts[i],
                    };
                });

            const reservationNonce = reservationDetails.orderNonce;

            const riftSwapArgs = {
                orderNonceHex: reservationNonce,
                liquidityProviders: liquidityProviders,
            };

            try {
                window.rift.createRiftSwap(riftSwapArgs);
            } catch (e) {
                console.error('Error creating Rift swap:', e);
            }
            refreshUserSwapsFromAddress();

            try {
                handleNavigation(`/swap/${reservationUri}`);
            } catch (e) {
                console.error('Navigation error:', e);
            }
        } catch (error) {
            console.error('Error reserving liquidity:', error);
            setLoadingReservation(false);
        }
    };

    const proceedWithReservationPayingFeesUsingEth = async () => {
        if (!window.ethereum || !lowestFeeReservationParams) {
            console.error('Ethereum or reservation parameters not found.');
            return;
        }

        // Reset the reserve state before starting a new reservation
        resetReserveState();

        setIsModalOpen(true);

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const totalSatsInputInlcudingProxyFee = lowestFeeReservationParams.totalSatsInputInlcudingProxyFee;

        try {
            await reserveLiquidity({
                signer,
                riftExchangeAbi: selectedInputAsset.riftExchangeAbi,
                riftExchangeContract: selectedInputAsset.riftExchangeContractAddress,
                vaultIndexesToReserve: lowestFeeReservationParams.vaultIndexesToReserve,
                amountsToReserve: lowestFeeReservationParams.amountsInMicroUsdtToReserve,
                ethPayoutAddress,
                totalSatsInputInlcudingProxyFee: totalSatsInputInlcudingProxyFee,
                expiredSwapReservationIndexes: lowestFeeReservationParams.expiredSwapReservationIndexes,
                tokenAddress: selectedInputAsset.tokenAddress,
            });
        } catch (error) {
            console.error('Error reserving liquidity:', error);
        } finally {
            // setIsModalOpen(false);
        }
    };

    const validateEthereumPayoutAddress = (address: string): boolean => {
        const ethereumRegex = /^0x[a-fA-F0-9]{40}$/;
        return ethereumRegex.test(address);
    };

    const EthereumAddressValidation: React.FC<{ address: string }> = ({ address }) => {
        const isValid = validateEthereumPayoutAddress(address);
        setIsEthereumPayoutAddressValid(isValid);

        if (address.length === 0) {
            return <Text>...</Text>;
        }

        return (
            <Flex
                align='center'
                fontFamily={FONT_FAMILIES.NOSTROMO}
                w='50px'
                ml='-45px'
                mr='0px'
                h='100%'
                justify='center'
                direction='column'>
                {isValid ? (
                    <>
                        <IoMdCheckmarkCircle color={colors.greenOutline} size={'24px'} />
                        <Text fontSize={'10px'} mt='3px' color={colors.greenOutline}>
                            Valid
                        </Text>
                    </>
                ) : (
                    <>
                        <HiXCircle color='red' size={'24px'} />
                        <Text fontSize={'10px'} mt='3px' color='red'>
                            Invalid
                        </Text>
                    </>
                )}
            </Flex>
        );
    };

    return (
        <>
            <Flex
                // h='800px'
                w='100%'
                mt='20px'
                borderRadius={'30px'}
                px='50px'
                direction={'column'}
                pb='30px'
                pt='10px'
                align={'center'}
                {...opaqueBackgroundColor}
                borderWidth={3}
                borderColor={colors.borderGray}>
                <Text
                    fontSize='14px'
                    mb='18px'
                    maxW={'900px'}
                    fontWeight={'normal'}
                    color={colors.textGray}
                    fontFamily={FONT_FAMILIES.AUX_MONO}
                    textAlign='center'
                    mt='25px'
                    flex='1'>
                    Initiate the swap by reserving liquidity to lock the seller's USDT. After the reservation is
                    confirmed, you will have {FRONTEND_RESERVATION_EXPIRATION_WINDOW_IN_SECONDS / 60 / 60} hour to send
                    BTC to complete the swap.
                </Text>

                {/* USDT Payout Address */}
                <Text
                    ml='8px'
                    mt='24px'
                    w='100%'
                    mb='10px'
                    fontSize='15px'
                    fontFamily={FONT_FAMILIES.NOSTROMO}
                    color={colors.offWhite}>
                    USDT Payout Address
                </Text>
                <Flex
                    mt='-2px'
                    mb='22px'
                    px='10px'
                    bg='#111'
                    border='2px solid #565656'
                    w='100%'
                    h='60px'
                    borderRadius={'10px'}>
                    <Flex direction={'row'} py='6px' px='5px'>
                        <Input
                            value={ethPayoutAddress}
                            onChange={handleETHPayoutAddressChange}
                            fontFamily={'Aux'}
                            border='none'
                            mt='3.5px'
                            w='804px'
                            mr='65px'
                            ml='-4px'
                            p='0px'
                            letterSpacing={'-4px'}
                            color={colors.offWhite}
                            _active={{ border: 'none', boxShadow: 'none' }}
                            _focus={{ border: 'none', boxShadow: 'none' }}
                            _selected={{ border: 'none', boxShadow: 'none' }}
                            fontSize='28px'
                            placeholder='0xb0cb90a9a3dfd81...'
                            _placeholder={{ color: colors.darkerGray }}
                            spellCheck={false}
                        />

                        {ethPayoutAddress.length > 0 && (
                            <Flex ml='-5px' mt='0px'>
                                <EthereumAddressValidation address={ethPayoutAddress} />
                            </Flex>
                        )}
                    </Flex>
                </Flex>

                {/* Fees and Swap Time Estimate */}
                <Flex w='100%' justify={'center'} mb='7px'>
                    <Flex w='48%' justify={'center'} mt='16px'>
                        <Flex
                            w='100%'
                            h='60px'
                            borderRadius={'10px'}
                            overflow={'hidden'}
                            mt='0px'
                            mb='6px'
                            bg={colors.borderGray}
                            borderColor={'#212229'}
                            borderWidth={2}>
                            <Flex w='50%' align='center' bg={'linear-gradient(180deg, #111219 0%, #0D0E14 100%)'}>
                                <Flex mx='13px' w='20px'>
                                    <FaLock size={'22px'} color={colors.textGray} />
                                </Flex>
                                <Flex direction={'column'}>
                                    <Text
                                        fontSize={'11px'}
                                        fontFamily={FONT_FAMILIES.NOSTROMO}
                                        letterSpacing={-0.3}
                                        color={colors.offWhite}>
                                        Reservation Fee
                                    </Text>
                                    <Text
                                        fontFamily={FONT_FAMILIES.NOSTROMO}
                                        fontSize='10px'
                                        fontWeight='normal'
                                        color={colors.textGray}>
                                        Free
                                    </Text>
                                </Flex>
                            </Flex>
                            <Flex w='50%' align='center' bg={'linear-gradient(180deg, #212229 0%, #1A1B20 100%)'}>
                                <Flex mx='15px'>
                                    <FaClock size={'24px'} color={colors.textGray} />
                                </Flex>
                                <Flex direction={'column'}>
                                    <Text
                                        fontSize={'11px'}
                                        fontFamily={FONT_FAMILIES.NOSTROMO}
                                        letterSpacing={-0.3}
                                        color={colors.offWhite}>
                                        Estimated Swap Time
                                    </Text>{' '}
                                    <Text fontSize={'10px'} fontFamily={FONT_FAMILIES.NOSTROMO} color={colors.textGray}>
                                        20-30 Minutes
                                    </Text>
                                </Flex>
                            </Flex>
                        </Flex>
                    </Flex>
                </Flex>
                {/* Reserve Button */}
            </Flex>
            <Flex
                bg={
                    ethPayoutAddress && isEthereumPayoutAddressValid
                        ? colors.purpleBackground
                        : colors.purpleBackgroundDisabled
                }
                _hover={{ bg: colors.purpleHover }}
                w='400px'
                transition={'0.2s'}
                px='20px'
                py='4px'
                mt={'22px'}
                h={'50px'}
                onClick={
                    ethPayoutAddress && isEthereumPayoutAddressValid
                        ? () =>
                              isPayingFeesInBTC
                                  ? proceedWithReservationPayingFeesUsingBtc()
                                  : initiateReservationPayingFeesInEth()
                        : null
                }
                fontSize={'16px'}
                align={'center'}
                userSelect={'none'}
                cursor={'pointer'}
                borderRadius={'10px'}
                justify={'center'}
                border={ethPayoutAddress && isEthereumPayoutAddressValid ? '3px solid #445BCB' : '3px solid #3242a8'}>
                {loadingReservation ? (
                    <Spinner size='sm' color={colors.offWhite} />
                ) : (
                    <Text
                        color={ethPayoutAddress && isEthereumPayoutAddressValid ? colors.offWhite : colors.darkerGray}
                        fontFamily='Nostromo'>
                        {isPayingFeesInBTC ? 'Reserve Liquidity' : isConnected ? 'Reserve Liquidity' : 'Connect Wallet'}
                    </Text>
                )}
            </Flex>
            <ReservationStatusModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                status={reserveLiquidityStatus}
                error={reserveLiquidityError}
                txHash={txHash}
            />
        </>
    );
};
