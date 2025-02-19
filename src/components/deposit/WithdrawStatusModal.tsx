import React, { useEffect, useState } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Text, Flex, Box, Spacer, Button, Input } from '@chakra-ui/react';
import { BigNumber, ethers } from 'ethers';
import { WithdrawStatus } from '../../hooks/contract/useWithdrawLiquidity';
import { useWithdrawLiquidity } from '../../hooks/contract/useWithdrawLiquidity';
import { FONT_FAMILIES } from '../../utils/font';
import { colors } from '../../utils/colors';
import { AlertCircleOutline } from 'react-ionicons';
import { HiOutlineExternalLink, HiXCircle } from 'react-icons/hi';
import { AssetTag } from '../other/AssetTag';
import { UserSwap } from '../../types';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { useStore } from '../../store';
import riftExchangeABI from '../../abis/RiftExchange.json';
import GooSpinner from '../other/GooSpiner';
import { IoIosCheckmarkCircle } from 'react-icons/io';
import { useChainId, useSwitchChain } from 'wagmi';
import { useContractData } from '../providers/ContractDataProvider';
import { toastError } from '../../hooks/toast';
import { BITCOIN_DECIMALS } from '../../utils/constants';

interface WithdrawStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    clearError: () => void;
    selectedSwapToManage: UserSwap;
}

const WithdrawStatusModal: React.FC<WithdrawStatusModalProps> = ({ isOpen, onClose, clearError, selectedSwapToManage }) => {
    const [isConfirmStep, setIsConfirmStep] = useState(true);
    const withdrawAmount = useStore((state) => state.withdrawAmount);
    const setWithdrawAmount = useStore((state) => state.setWithdrawAmount);
    const setSelectedSwapToManage = useStore((state) => state.setSelectedSwapToManage);
    const [_refreshKey, setRefreshKey] = useState(0);
    const [isWaitingForCorrectNetwork, setIsWaitingForCorrectNetwork] = useState(false);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const { status, error, txHash, resetWithdrawState, withdrawLiquidity } = useWithdrawLiquidity();
    const chainId = useChainId();
    const { chains, switchChain } = useSwitchChain();
    const { refreshUserSwapsFromAddress, loading } = useContractData();

    useEffect(() => {
        if (isOpen) {
            setWithdrawAmount('');
            setIsConfirmStep(true);
        }
    }, [isOpen, setWithdrawAmount]);

    useEffect(() => {
        if (isWaitingForCorrectNetwork && chainId === selectedInputAsset.contractChainID) {
            setIsWaitingForCorrectNetwork(false);
            handleConfirmWithdraw();
        }
    }, [isWaitingForCorrectNetwork, chainId, selectedInputAsset.contractChainID]);

    const handleClose = () => {
        resetWithdrawState();
        onClose();
    };

    // handle withdraw liquidity
    const handleWithdraw = async () => {
        if (!window.ethereum || !selectedSwapToManage) {
            console.error('Ethereum provider or selected vault not available');
            return;
        }

        resetWithdrawState();

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        console.log('withdrawAmount:', withdrawAmount);
        const withdrawAmountInTokenSmallestUnit = selectedSwapToManage.depositAmount;

        const globalVaultIndex = selectedSwapToManage.vaultIndex;

        // try {
        //     // get the liquidity provider's data
        //     const liquidityProviderData = await getLiquidityProvider(provider, riftExchangeABI.abi, selectedSwapToManage.depositAsset.riftExchangeContractAddress, await signer.getAddress());

        //     // convert the depositVaultIndexes to strings for comparison
        //     const stringIndexes = liquidityProviderData.depositVaultIndexes.map((index) => BigNumber.from(index).toNumber());

        //     // find the local index of the globalVaultIndex in the depositVaultIndexes array
        //     const localVaultIndex = stringIndexes.findIndex((index) => BigNumber.from(index).toNumber() === globalVaultIndex);

        //     if (localVaultIndex === -1) {
        //         throw new Error("Selected vault not found in user's deposit vaults");
        //     }

        //     await withdrawLiquidity({
        //         signer,
        //         riftExchangeAbi: riftExchangeABI.abi,
        //         riftExchangeContract: selectedSwapToManage.depositAsset.riftExchangeContractAddress,
        //         globalVaultIndex,
        //         amountToWithdraw: withdrawAmountInTokenSmallestUnit,
        //         expiredReservationIndexes: currentlyExpiredReservationIndexes,
        //     });

        //     const updatedVault = userActiveDepositVaults.find((vault) => vault.index === selectedSwapToManage.index);
        //     if (updatedVault) {
        //         setSelectedSwapToManage(updatedVault);
        //     }
        //     setRefreshKey((prevKey) => prevKey + 1);
        //     refreshUserSwapsFromAddress();
        // } catch (error) {
        //     console.error('Failed to process withdrawal:', error);
        // }
    };

    const isCompleted = status === WithdrawStatus.Confirmed;
    const isError = status === WithdrawStatus.Error;
    const isLoading = !isCompleted && !isError && status !== WithdrawStatus.Idle;

    const getStatusMessage = () => {
        switch (status) {
            case WithdrawStatus.WaitingForWalletConfirmation:
                return 'Waiting for wallet confirmation...';
            case WithdrawStatus.InitiatingWithdrawal:
                return 'Initiating withdrawal...';
            case WithdrawStatus.WithdrawingLiquidity:
                return 'Withdrawing liquidity...';
            case WithdrawStatus.WithdrawalPending:
                return 'Confirming withdrawal...';
            case WithdrawStatus.Confirmed:
                return 'Withdrawal success!';
            case WithdrawStatus.Error:
                if (error && error.toLowerCase().includes('user rejected transaction')) {
                    return 'User rejected transaction';
                }
                return `Error: ${error}`;
            default:
                return 'Processing...';
        }
    };

    const getEtherscanUrl = () => {
        if (!txHash) return '#';
        return `${selectedInputAsset.etherScanBaseUrl}/tx/${txHash}`;
    };

    const handleConfirmWithdraw = () => {
        if (chainId !== selectedInputAsset.contractChainID) {
            console.log('Switching network');
            setIsWaitingForCorrectNetwork(true);
            switchChain({ chainId: selectedInputAsset.contractChainID });
            return;
        }

        setIsConfirmStep(false);
        handleWithdraw();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} isCentered closeOnOverlayClick={!isLoading} closeOnEsc={!isLoading}>
            <ModalOverlay />
            <ModalContent
                top={'20px'}
                bottom={'20px'}
                bg={colors.offBlack}
                borderWidth={2}
                minH={isCompleted ? '280px' : '290px'}
                w={isError ? '600px' : isCompleted ? '420px' : '560px'}
                maxWidth='100%'
                borderColor={colors.borderGray}
                borderRadius='20px'
                fontFamily={FONT_FAMILIES.AUX_MONO}
                color={colors.offWhite}
                animation={`breathe 3s infinite ease-in-out`}
                sx={{
                    '@keyframes breathe': {
                        '0%, 100%': {
                            filter: isError ? 'drop-shadow(0px 0px 30px rgba(183, 6, 6, 0.3))' : 'drop-shadow(0px 0px 30px rgba(6, 64, 183, 0.4))',
                        },
                        '50%': {
                            filter: isError ? 'drop-shadow(0px 0px 40px rgba(183, 6, 6, 0.5))' : 'drop-shadow(0px 0px 50px rgba(6, 64, 183, 0.6))',
                        },
                    },
                }}>
                <ModalHeader fontSize='24px' userSelect={'none'} fontFamily={FONT_FAMILIES.NOSTROMO} fontWeight='bold' textAlign='center'>
                    {isConfirmStep ? 'Withdraw Liquidity' : 'Withdrawal Status'}
                </ModalHeader>
                {(status === WithdrawStatus.Confirmed || status === WithdrawStatus.Error) && <ModalCloseButton />}

                <ModalBody>
                    {isConfirmStep ? (
                        <Flex direction='column' align='center' justify='center' h='100%'>
                            <Flex direction='column' py='10px' w='100%' borderRadius={'14px'} bg={colors.offBlackLighter} border='2px solid' borderColor={colors.borderGrayLight} px='16px'>
                                <Flex justify='space-between ' w='100%' align='center'>
                                    <Text color={!withdrawAmount ? colors.offWhite : colors.textGray} fontSize='13px' letterSpacing='-1px' fontWeight='normal' fontFamily='Aux'>
                                        Amount {formatUnits(BigNumber.from(selectedSwapToManage.depositAmount).toString(), BITCOIN_DECIMALS)}
                                    </Text>
                                </Flex>
                            </Flex>
                            <Button
                                h='48px'
                                onClick={handleConfirmWithdraw}
                                _hover={{ bg: colors.redHover }}
                                bg={colors.redBackground}
                                color={colors.offWhite}
                                border={`3px solid ${colors.red}`}
                                borderRadius='10px'
                                fontSize='15px'
                                fontFamily={FONT_FAMILIES.NOSTROMO}
                                w='full'
                                mt={'20px'}>
                                Confirm Withdraw
                            </Button>
                        </Flex>
                    ) : (
                        <Flex direction='column' align='center' justify='center' h='100%' pb={'15px'}>
                            {isLoading && <GooSpinner flexSize={100} color={colors.purpleBorder} />}
                            <Spacer />
                            <Text
                                fontSize='12px'
                                w={
                                    status != WithdrawStatus.Confirmed &&
                                    status != WithdrawStatus.Error &&
                                    (status === WithdrawStatus.WaitingForWalletConfirmation || status === WithdrawStatus.WithdrawalPending ? '100%' : '60%')
                                }
                                mt='25px'
                                mb='0px'
                                color={colors.textGray}
                                fontWeight={'normal'}
                                textAlign='center'>
                                {status != WithdrawStatus.Confirmed &&
                                    status != WithdrawStatus.Error &&
                                    (status === WithdrawStatus.WaitingForWalletConfirmation || status === WithdrawStatus.WithdrawalPending
                                        ? 'Awaiting blockchain confirmation...'
                                        : 'Please confirm the transaction in your wallet')}
                            </Text>
                            <Flex direction={'column'} align={'center'} w='100%' justify={'center'}>
                                {isCompleted && (
                                    <Flex mt='-20px' ml='4px'>
                                        <IoIosCheckmarkCircle size={45} color={colors.greenOutline} />
                                    </Flex>
                                )}
                                {isError && (
                                    <Flex mt='-20px' mb='8px' ml='4px'>
                                        <AlertCircleOutline width='38px' height={'38px'} color={colors.red} />
                                    </Flex>
                                )}
                                <Text
                                    overflowWrap={'anywhere'}
                                    fontFamily={FONT_FAMILIES.NOSTROMO}
                                    color={isCompleted ? colors.greenOutline : colors.offWhite}
                                    fontSize={getStatusMessage().length > 40 ? '12px' : '18px'}
                                    mt={isLoading ? '20px' : isCompleted ? '5px' : '20px'}
                                    fontWeight='bold'
                                    textAlign='center'>
                                    {getStatusMessage()}
                                </Text>
                            </Flex>
                            {isCompleted && (
                                <Flex direction='column' mt={'5px'} w='100%'>
                                    <Button
                                        mt={'30px'}
                                        bg={colors.purpleButtonBG}
                                        borderWidth={'2px'}
                                        borderColor={colors.purpleBorder}
                                        _hover={{ bg: colors.purpleHover }}
                                        borderRadius='md'
                                        h='45px'
                                        onClick={() => window.open(getEtherscanUrl(), '_blank')}
                                        isDisabled={!txHash}>
                                        <Flex mt='-4px ' mr='8px'>
                                            <HiOutlineExternalLink size={'17px'} color={colors.offWhite} />
                                        </Flex>
                                        <Text fontSize='14px' color={colors.offerWhite} fontFamily={FONT_FAMILIES.NOSTROMO} cursor={'pointer'} fontWeight={'normal'}>
                                            View on Etherscan
                                        </Text>
                                    </Button>
                                    <Button
                                        mt={'10px'}
                                        h='45px'
                                        bg={colors.offBlackLighter}
                                        borderWidth={'2px'}
                                        borderColor={colors.borderGrayLight}
                                        fontWeight={'normal'}
                                        onClick={() => {
                                            handleClose();
                                        }}
                                        _hover={{ bg: colors.offBlackLighter2 }}
                                        borderRadius='md'>
                                        <Flex mt='-2px ' mr='8px'>
                                            <HiXCircle size={'17px'} color={colors.offWhite} />
                                        </Flex>
                                        <Text fontSize='14px' color={colors.offWhite} fontFamily={FONT_FAMILIES.NOSTROMO} cursor={'pointer'} fontWeight={'normal'}>
                                            Dismiss
                                        </Text>
                                    </Button>
                                </Flex>
                            )}
                            {isError && (
                                <>
                                    <Box mt={4} p={2} bg='#2E1C0C' border='1px solid #78491F' borderRadius='md'>
                                        <Text overflowWrap={'anywhere'} fontSize='12px' color='#FF6B6B'>
                                            {typeof error === 'string' && error.toLowerCase().includes('user rejected transaction')
                                                ? 'User rejected the transaction, please try again.'
                                                : error?.toString()}
                                        </Text>
                                    </Box>
                                    <Button
                                        mt={'25px'}
                                        onClick={handleClose}
                                        bg={colors.borderGray}
                                        borderWidth={2}
                                        borderColor={colors.offBlackLighter2}
                                        _hover={{ bg: colors.offBlackLighter2 }}
                                        color={colors.offWhite}
                                        fontFamily={FONT_FAMILIES.AUX_MONO}>
                                        Dismiss
                                    </Button>
                                </>
                            )}
                        </Flex>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default WithdrawStatusModal;
