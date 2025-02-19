import React from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Text, Flex, Box, Spacer, Button } from '@chakra-ui/react';
import { ReserveStatus } from '../../hooks/contract/useReserveLiquidity';
import { FONT_FAMILIES } from '../../utils/font';
import { colors } from '../../utils/colors';
import { AlertCircleOutline } from 'react-ionicons';
import { HiOutlineExternalLink } from 'react-icons/hi';
import { useStore } from '../../store';
import GooSpinner from '../other/GooSpiner';
import { IoIosCheckmarkCircle } from 'react-icons/io';

interface ReservationStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    status: ReserveStatus;
    error: string | null;
    txHash: string | null;
}

const CustomAlertCircleOutline = ({ width = '38px', height = '38px', color = colors.red }) => {
    return <AlertCircleOutline width={width} height={height} color={color} />;
};

const ReservationStatusModal: React.FC<ReservationStatusModalProps> = ({ isOpen = false, onClose, status = ReserveStatus.Idle, error = null, txHash = null }) => {
    const isCompleted = status === ReserveStatus.Confirmed;
    const isError = status === ReserveStatus.Error;
    const isLoading = ![ReserveStatus.Idle, ReserveStatus.Confirmed, ReserveStatus.Error].includes(status);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const setSwapFlowState = useStore((state) => state.setSwapFlowState);

    const getStatusMessage = () => {
        switch (status) {
            case ReserveStatus.Idle:
                return 'Ready to reserve liquidity';
            case ReserveStatus.WaitingForWalletConfirmation:
                return 'Waiting for wallet confirmation...';
            case ReserveStatus.WaitingForTokenApproval:
                return 'Waiting for token approval...';
            case ReserveStatus.ApprovalPending:
                return 'Confirming token approval...';
            case ReserveStatus.ReservingLiquidity:
                return 'Reserving liquidity...';
            case ReserveStatus.Confirmed:
                return 'Reservation success!';
            case ReserveStatus.Error:
                if (error && error.toLowerCase().includes('user rejected transaction')) {
                    return 'User rejected transaction';
                }
                return `Error: ${error}`;
            default:
                return 'Confirming...';
        }
    };

    const getEtherscanUrl = () => {
        if (!txHash) return '#';
        return `${selectedInputAsset.etherScanBaseUrl}/tx/${txHash}`;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered closeOnOverlayClick={!isLoading} closeOnEsc={!isLoading}>
            <ModalOverlay />
            <ModalContent
                top={'20px'}
                bottom={'20px'}
                bg={colors.offBlack}
                borderWidth={2}
                minH={isCompleted ? '280px' : '320px'}
                w={isError ? '600px' : isCompleted ? '400px' : '500px'}
                maxWidth='100%'
                borderColor={colors.borderGray}
                borderRadius='10px'
                fontFamily={FONT_FAMILIES.AUX_MONO}
                color={colors.offWhite}>
                <ModalHeader fontSize='24px' userSelect={'none'} fontFamily={FONT_FAMILIES.NOSTROMO} fontWeight='bold' textAlign='center'>
                    Reservation Status
                </ModalHeader>
                {(isCompleted || isError) && <ModalCloseButton />}
                <ModalBody>
                    <Flex direction='column' align='center' justify='center' h='100%' pb={'15px'}>
                        {isLoading && <GooSpinner flexSize={100} color={colors.purpleBorder} />}
                        <Spacer />
                        <Text fontSize='12px' w={'100%'} mt='25px' mb='0px' color={colors.textGray} fontWeight={'normal'} textAlign='center'>
                            {status != ReserveStatus.Confirmed &&
                                status != ReserveStatus.Error &&
                                (status === ReserveStatus.WaitingForWalletConfirmation || status === ReserveStatus.ApprovalPending || status === ReserveStatus.ReservationPending
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
                                <Flex mt='-20px' ml='4px'>
                                    <CustomAlertCircleOutline width='38px' height={'38px'} color={colors.red} />
                                </Flex>
                            )}
                            <Text
                                overflowWrap={'anywhere'}
                                color={isCompleted ? colors.greenOutline : colors.offWhite}
                                fontSize={getStatusMessage().length > 40 ? '12px' : '20px'}
                                mt={isLoading ? '25px' : isCompleted ? '5px' : '20px'}
                                fontWeight='normal'
                                textAlign='center'>
                                {getStatusMessage()}
                            </Text>
                        </Flex>
                        {isCompleted && (
                            <Flex direction='column' mt={'40px'} w='100%'>
                                <Button
                                    bg={colors.offBlackLighter}
                                    borderWidth={'2px'}
                                    borderColor={colors.borderGrayLight}
                                    _hover={{ bg: colors.borderGray }}
                                    borderRadius='md'
                                    onClick={() => window.open(getEtherscanUrl(), '_blank')}
                                    isDisabled={!txHash}>
                                    <Flex mt='-4px ' mr='8px'>
                                        <HiOutlineExternalLink size={'17px'} color={colors.offerWhite} />
                                    </Flex>
                                    <Text fontSize='14px' color={colors.offerWhite} fontFamily={FONT_FAMILIES.NOSTROMO} cursor={'pointer'} fontWeight={'normal'}>
                                        View on Etherscan
                                    </Text>
                                </Button>

                                <Button
                                    mt={'10px'}
                                    bg={colors.purpleBackground}
                                    borderWidth={'2px'}
                                    borderColor={colors.purpleBorder}
                                    fontWeight={'normal'}
                                    onClick={() => {
                                        setSwapFlowState('2-send-bitcoin');
                                        onClose();
                                    }}
                                    _hover={{ bg: colors.purpleHover }}
                                    borderRadius='md'>
                                    <Text fontSize='14px' fontFamily={FONT_FAMILIES.NOSTROMO} color={colors.offWhite}>
                                        Continue
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
                                    onClick={onClose}
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
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default ReservationStatusModal;
