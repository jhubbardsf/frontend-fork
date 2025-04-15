import React, { useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Text,
    Flex,
    Box,
    Spacer,
    Button,
    Icon,
    Spinner,
} from '@chakra-ui/react';
import { DepositStatus } from '../../hooks/contract/useDepositLiquidity';
import { FONT_FAMILIES } from '../../utils/font';
import { colors } from '../../utils/colors';
import { AlertCircleOutline, List, OpenOutline } from 'react-ionicons';
import { HiOutlineExternalLink } from 'react-icons/hi';
import { PiVaultBold } from 'react-icons/pi';
import { IoIosCheckmarkCircle, IoMdSettings } from 'react-icons/io';
import { useStore } from '../../store';
import { useRouter } from 'next/router';
import GooSpinner from '../other/GooSpiner';
import { useContractData } from '../providers/ContractDataProvider';
import { getContractErrorMessage } from '../../utils/contractErrors';

interface DepositStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    status: DepositStatus;
    error: string | null;
    txHash: string | null;
}

const DepositStatusModal: React.FC<DepositStatusModalProps> = ({
    isOpen = false,
    onClose,
    status = DepositStatus.WaitingForWalletConfirmation,
    error = null,
    txHash = null,
}) => {
    const isCompleted = status === DepositStatus.Confirmed;
    const isError = status === DepositStatus.Error;
    const isLoading = !isCompleted && !isError;
    const showManageDepositVaultsScreen = useStore((state) => state.showManageDepositVaultsScreen);
    const setShowManageDepositVaultsScreen = useStore((state) => state.setShowManageDepositVaultsScreen);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const router = useRouter();
    const [isLoadingRedirect, setIsLoadingRedirect] = React.useState(false);
    const { refreshUserSwapsFromAddress, loading } = useContractData();

    const handleNavigation = (route: string) => {
        router.push(route);
    };

    const getStatusMessage = () => {
        switch (status) {
            case DepositStatus.WaitingForWalletConfirmation:
                return 'Waiting for wallet confirmation...';
            case DepositStatus.WaitingForDepositTokenApproval:
                return 'Approving ' + selectedInputAsset.name + '...';
            case DepositStatus.WaitingForDepositApproval:
                return 'Depositing liquidity...';
            case DepositStatus.ApprovalPending:
                return 'Confirming Approval...';
            case DepositStatus.DepositPending:
                return 'Confirming Deposit...';
            case DepositStatus.Confirmed:
                return 'Deposit success!';
            case DepositStatus.Error:
                if (error && error.toLowerCase().includes('user rejected transaction')) {
                    return 'User rejected transaction';
                }
                return `Error: ${getContractErrorMessage(error)}`;
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
                minH={isCompleted ? '280px' : '300px'}
                w={isError ? '600px' : isCompleted ? '400px' : '500px'}
                maxWidth='100%'
                borderColor={colors.borderGray}
                borderRadius='20px'
                fontFamily={FONT_FAMILIES.AUX_MONO}
                color={colors.offWhite}
                animation={`breathe${isError ? 'Error' : 'Success'} 3s infinite ease-in-out`}
                sx={{
                    '@keyframes breatheSuccess': {
                        '0%, 100%': {
                            filter: 'drop-shadow(0px 0px 30px rgba(6, 64, 183, 0.4))',
                        },
                        '50%': {
                            filter: 'drop-shadow(0px 0px 50px rgba(6, 64, 183, 0.6))',
                        },
                    },
                    '@keyframes breatheError': {
                        '0%, 100%': {
                            filter: 'drop-shadow(0px 0px 30px rgba(183, 6, 6, 0.3))',
                        },
                        '50%': {
                            filter: 'drop-shadow(0px 0px 40px rgba(183, 6, 6, 0.5))',
                        },
                    },
                }}>
                <ModalHeader
                    mt='10px'
                    fontSize='24px'
                    userSelect={'none'}
                    fontFamily={FONT_FAMILIES.NOSTROMO}
                    fontWeight='bold'
                    textAlign='center'>
                    Deposit Status
                </ModalHeader>
                {(isCompleted || isError) && <ModalCloseButton />}
                <ModalBody>
                    <Flex direction='column' align='center' justify='center' h='100%' pb={'15px'}>
                        {isLoading && <GooSpinner flexSize={100} color={colors.purpleBorder} />}
                        <Spacer />
                        <Text
                            fontSize='12px'
                            w={
                                status != DepositStatus.Confirmed &&
                                status != DepositStatus.Error &&
                                (status === DepositStatus.WaitingForWalletConfirmation ||
                                status === DepositStatus.ApprovalPending ||
                                status === DepositStatus.DepositPending
                                    ? '100%'
                                    : '60%')
                            }
                            mt='25px'
                            mb='0px'
                            color={colors.textGray}
                            fontWeight={'normal'}
                            textAlign='center'>
                            {status != DepositStatus.Confirmed &&
                                status != DepositStatus.Error &&
                                (status === DepositStatus.WaitingForWalletConfirmation ||
                                status === DepositStatus.ApprovalPending ||
                                status === DepositStatus.DepositPending
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
                                    <AlertCircleOutline width='38px' height={'38px'} color={colors.red} />
                                </Flex>
                            )}
                            <Text
                                overflowWrap={'anywhere'}
                                color={isCompleted ? colors.greenOutline : colors.offWhite}
                                fontSize={getStatusMessage().length > 40 ? '12px' : '18px'}
                                mt={isLoading ? '25px' : isCompleted ? '5px' : '20px'}
                                fontWeight='bold'
                                fontFamily={FONT_FAMILIES.NOSTROMO}
                                textAlign='center'>
                                {getStatusMessage()}
                                {status === DepositStatus.Confirmed && (
                                    // Note, <Text>'s are wrapped by <p>, and
                                    // two <p>'s can't be nested so this gives
                                    // console errors.
                                    <Text
                                        mt='18px'
                                        mb='-5px'
                                        color={colors.textGray}
                                        fontWeight={'normal'}
                                        justifySelf={'center'}
                                        fontSize='13px'
                                        w='80%'
                                        fontFamily={FONT_FAMILIES.AUX_MONO}>
                                        Bitcoin will be sent to your wallet shortly!
                                    </Text>
                                )}
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
                                    h='45px'
                                    onClick={() => {
                                        window.open(getEtherscanUrl(), '_blank');
                                        onClose();
                                    }}
                                    isDisabled={!txHash}>
                                    <Flex mt='-4px ' mr='8px'>
                                        <HiOutlineExternalLink size={'17px'} color={colors.offerWhite} />
                                    </Flex>
                                    <Text
                                        fontSize='14px'
                                        color={colors.offerWhite}
                                        fontFamily={FONT_FAMILIES.NOSTROMO}
                                        cursor={'pointer'}
                                        fontWeight={'normal'}>
                                        View on Etherscan
                                    </Text>
                                </Button>

                                <Button
                                    mt={'10px'}
                                    bg={colors.purpleBackground}
                                    borderWidth={'2px'}
                                    h='45px'
                                    borderColor={colors.purpleBorder}
                                    fontWeight={'normal'}
                                    onClick={() => {
                                        refreshUserSwapsFromAddress();
                                        handleNavigation('/activity'); // TODO - make this go to the activity page
                                        setIsLoadingRedirect(true);
                                        // onClose();
                                    }}
                                    _hover={{ bg: colors.purpleHover }}
                                    borderRadius='md'>
                                    {!isLoadingRedirect && (
                                        <Flex mt='-2px ' mr='8px'>
                                            <List width={'18px'} color={colors.offWhite} />
                                        </Flex>
                                    )}
                                    {isLoadingRedirect ? (
                                        <Spinner size='sm' color={colors.offWhite} />
                                    ) : (
                                        <Text
                                            fontSize='14px'
                                            fontFamily={FONT_FAMILIES.NOSTROMO}
                                            color={colors.offWhite}>
                                            Swap Activity
                                        </Text>
                                    )}
                                </Button>
                            </Flex>
                        )}
                        {isError && (
                            <>
                                <Box mt={4} p={2} bg='#2E1C0C' border='1px solid #78491F' borderRadius='md'>
                                    <Text overflowWrap={'anywhere'} fontSize='12px' color='#FF6B6B'>
                                        {typeof error === 'string' &&
                                        error.toLowerCase().includes('user rejected transaction')
                                            ? 'User rejected the transaction, please try again.'
                                            : getContractErrorMessage(error)}
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

export default DepositStatusModal;
