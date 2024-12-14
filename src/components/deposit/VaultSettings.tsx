import { ChevronLeftIcon } from '@chakra-ui/icons';
import { Button, Flex, Spacer, Text } from '@chakra-ui/react';
import { BigNumber } from 'ethers';
import { FaRegArrowAltCircleRight } from 'react-icons/fa';
import { colors } from '../../utils/colors';
import { bitcoin_border_color } from '../../utils/constants';
import { convertLockingScriptToBitcoinAddress, calculateBtcOutputAmountFromExchangeRate, formatBtcExchangeRate } from '../../utils/dappHelper';
import { FONT_FAMILIES } from '../../utils/font';
import { AssetTag } from '../other/AssetTag';
import { VaultStatusBar } from './VaultStatusBar';
import WithdrawStatusModal from './WithdrawStatusModal';
import { DepositVault, ValidAsset } from '../../types';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { useWithdrawLiquidity } from '../../hooks/contract/useWithdrawLiquidity';
import { useState } from 'react';
import { useStore } from '../../store';
import UpdateExchangeRateModal from './UpdateExchangeRateModal';
import { toastError } from '../../hooks/toast';

interface VaultSettingsProps {
    selectedVaultToManage: DepositVault;
    handleGoBack: () => void;
    selectedInputAsset: ValidAsset;
}

const VaultSettings: React.FC<VaultSettingsProps> = ({ selectedVaultToManage, handleGoBack, selectedInputAsset }) => {
    const { status: withdrawLiquidityStatus, error: withdrawLiquidityError, txHash: withdrawTxHash, resetWithdrawState } = useWithdrawLiquidity();

    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isUpdateExchangeRateModalOpen, setIsUpdateExchangeRateModalOpen] = useState(false);
    // const [withdrawAmount, setWithdrawAmount] = useState('');
    const withdrawAmount = useStore((state) => state.withdrawAmount);
    const setWithdrawAmount = useStore((state) => state.setWithdrawAmount);

    const handleOpenWithdrawModal = () => {
        setIsWithdrawModalOpen(true);
        setWithdrawAmount('');
        resetWithdrawState();
    };

    const handleOpenUpdateExchangeRateModal = () => {
        setIsUpdateExchangeRateModalOpen(true);
    };

    return (
        <Flex
            h='101%'
            w='100%'
            mt='10px'
            px='35px'
            py='30px'
            flexDir={'column'}
            userSelect={'none'}
            fontSize={'12px'}
            borderRadius={'20px'}
            fontFamily={FONT_FAMILIES.NOSTROMO}
            color={'#c3c3c3'}
            fontWeight={'normal'}
            gap={'0px'}>
            <Flex w='100%' mt='-25px' ml='0px'>
                <Button bg='none' w='12px' _hover={{ bg: colors.borderGrayLight }} onClick={() => handleGoBack()}>
                    <ChevronLeftIcon width={'40px'} height={'40px'} bg='none' color={colors.offWhite} />
                </Button>
            </Flex>
            <Flex direction='column' align='center' mt='-26px' mb='20px' w='100%'>
                <Text fontSize='22px' color={colors.offWhite} textAlign='center' mt='-12px' flex='1'>
                    Manage Deposit Vault #{selectedVaultToManage.index}
                </Text>
                <Text fontSize='12px' color={colors.textGray} fontFamily={FONT_FAMILIES.AUX_MONO} textAlign='center' mt='6px' flex='1'>
                    Edit or Withdraw unreserved liquidity at anytime.{' '}
                </Text>
            </Flex>

            {/* BITCOIN PAYOUT ADDRESS */}
            <Flex w='100%' mt='20px'>
                <Flex w='100%' direction='column'>
                    <Text ml='8px' w='100%' fontSize='18px' color={colors.offWhite}>
                        Bitcoin Payout Address
                    </Text>
                    <Flex h='50px' mt='6px' w='100%' bg={colors.offBlackLighter} border={'3px solid'} borderColor={colors.borderGrayLight} borderRadius={'14px'} px='15px' align={'center'}>
                        <Text fontSize='16px' color={colors.offWhite} letterSpacing='-1px' fontFamily={FONT_FAMILIES.AUX_MONO}>
                            {convertLockingScriptToBitcoinAddress(selectedVaultToManage.btcPayoutLockingScript)}
                        </Text>

                        <Spacer />
                    </Flex>
                </Flex>
            </Flex>

            {/* SWAP INPUT & SWAP OUTPUT */}
            <Flex w='100%' mt='20px'>
                <Flex w='47%' direction='column'>
                    <Text ml='8px' w='100%' fontSize='18px' color={colors.offWhite}>
                        Input
                    </Text>
                    <Flex
                        h='50px'
                        mt='6px'
                        w='100%'
                        bg={selectedInputAsset.dark_bg_color}
                        border='3px solid'
                        borderColor={selectedInputAsset.bg_color}
                        borderRadius={'14px'}
                        pl='15px'
                        pr='10px'
                        align={'center'}>
                        <Text fontSize='16px' color={colors.offWhite} letterSpacing={'-1px'} fontFamily={FONT_FAMILIES.AUX_MONO}>
                            {formatUnits(BigNumber.from(selectedVaultToManage.initialBalance).toString(), selectedVaultToManage.depositAsset.decimals).toString()}
                        </Text>
                        <Spacer />
                        <AssetTag assetName={'ARBITRUM_USDT'} width='110px' />
                    </Flex>
                </Flex>
                <Text mt='46px' pl='16px' fontSize='20px' opacity={0.9} fontWeight={'bold'} color={colors.offWhite} letterSpacing={'-1px'} fontFamily={FONT_FAMILIES.AUX_MONO}>
                    <FaRegArrowAltCircleRight color={colors.RiftOrange} />
                </Text>
                <Spacer />

                <Flex w='47%' direction='column'>
                    <Text ml='8px' w='100%' fontSize='18px' color={colors.offWhite}>
                        Output
                    </Text>
                    <Flex h='50px' mt='6px' w='100%' bg='#2E1C0C' border={'3px solid'} borderColor={'#78491F'} borderRadius={'14px'} pl='15px' pr='10px' align={'center'}>
                        <Text fontSize='16px' color={colors.offWhite} letterSpacing={'-1px'} fontFamily={FONT_FAMILIES.AUX_MONO}>
                            {selectedVaultToManage.btcExchangeRate &&
                                calculateBtcOutputAmountFromExchangeRate(selectedVaultToManage.initialBalance, selectedVaultToManage.depositAsset.decimals, selectedVaultToManage.btcExchangeRate)}
                        </Text>

                        <Spacer />
                        <AssetTag assetName={'BTC'} width='84px' />
                    </Flex>
                </Flex>
            </Flex>
            {/* ORDER STATUS & REMAINING LIQUIDITY */}
            <Flex w='100%' mt='20px'>
                <Flex w='100%' direction='column'>
                    <Text ml='8px' w='100%' fontSize='18px' color={colors.offWhite}>
                        Status
                    </Text>
                    <VaultStatusBar selectedVault={selectedVaultToManage} minPercentageForText={5} />
                </Flex>
            </Flex>

            {/* EXCHANGE RATE */}
            <Flex w='100%' mt='20px'>
                <Flex w='100%' direction='column'>
                    <Text ml='8px' w='100%' fontSize='18px' color={colors.offWhite}>
                        Exchange Rate{' '}
                    </Text>
                    <Flex
                        h='50px'
                        mt='6px'
                        w='100%'
                        bg={colors.offBlackLighter}
                        border={'3px solid'}
                        borderColor={colors.borderGrayLight}
                        borderRadius={'14px'}
                        px='15px'
                        fontSize={'18px'}
                        align={'center'}>
                        <Flex
                            mt='2px'
                            color={colors.offWhite} // Change the default color to gray
                            letterSpacing='-1px'
                            fontFamily={FONT_FAMILIES.AUX_MONO}>
                            <Text color={bitcoin_border_color}>1 BTC</Text>
                            <Text mx='12px' color={bitcoin_border_color}>
                                {' '}
                                ={' '}
                            </Text>
                            <Text color={selectedVaultToManage.depositAsset.border_color_light}>
                                {' '}
                                {selectedVaultToManage.btcExchangeRate &&
                                    Number(formatBtcExchangeRate(selectedVaultToManage.btcExchangeRate, selectedVaultToManage.depositAsset.decimals)).toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}{' '}
                            </Text>
                            <Text ml='12px' color={selectedVaultToManage.depositAsset.border_color_light}>
                                {' '}
                                {selectedVaultToManage.depositAsset.name}
                            </Text>
                            {/* <Flex mt='-29px' ml='12px'>
                                <AssetTag assetName={selectedVaultToManage.depositAsset.name} width='76px' />
                            </Flex> */}
                        </Flex>

                        <Spacer />
                        {/* <Button
                            color={colors.offWhite}
                            bg={colors.purpleButtonBG}
                            onClick={() => {
                                if (BigNumber.from(selectedVaultToManage.trueUnreservedBalance).gt(BigNumber.from(0))) {
                                    handleOpenUpdateExchangeRateModal();
                                } else {
                                    toastError('', { title: 'No Unreserved Liquidity', description: 'There is no unreserved liquidity on this deposit vault to update' });
                                }
                            }}
                            borderRadius='10px'
                            border={`3px solid ${colors.purpleBorder}`}
                            px='14px'
                            _hover={{ bg: colors.purpleBorderDark }}
                            mr='-19px'
                            mt='1px'
                            py={'16px'}
                            h='114%'
                            w='305px'>
                            Update Exchange Rate
                        </Button> */}
                    </Flex>
                </Flex>
            </Flex>

            {/* WITHDRAW LIQUIDITY BUTTON */}
            <>
                <Flex mt='38px' justify='center'>
                    <Button
                        h='45px'
                        onClick={() => {
                            if (BigNumber.from(selectedVaultToManage.trueUnreservedBalance).gt(BigNumber.from(0))) {
                                handleOpenWithdrawModal();
                            } else {
                                toastError('', { title: 'No Unreserved Liquidity', description: 'There is no unreserved liquidity on this deposit vault to withdraw' });
                            }
                        }}
                        _hover={{ bg: colors.redHover }}
                        bg={colors.redBackground}
                        color={colors.offWhite}
                        border={`3px solid ${colors.red}`}
                        borderRadius='10px'
                        fontSize='15px'
                        w='275px'>
                        Withdraw Liquidity
                    </Button>
                </Flex>

                {/* Withdraw Status Modal */}
                <WithdrawStatusModal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} clearError={resetWithdrawState} selectedVaultToManage={selectedVaultToManage} />

                {/* Update Exchange Rate Modal  */}
                <UpdateExchangeRateModal isOpen={isUpdateExchangeRateModalOpen} onClose={() => setIsUpdateExchangeRateModalOpen(false)} selectedVault={selectedVaultToManage} />
            </>
        </Flex>
    );
};

export default VaultSettings;
