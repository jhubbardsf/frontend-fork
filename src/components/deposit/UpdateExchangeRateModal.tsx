import React, { useState, useEffect } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter, Text, Flex, Spacer, Button, Input, Spinner, Box } from '@chakra-ui/react';
import { BigNumber, ethers } from 'ethers';
import { useStore } from '../../store';
import { colors } from '../../utils/colors';
import { FONT_FAMILIES } from '../../utils/font';
import { AssetTag } from '../other/AssetTag';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { BITCOIN_DECIMALS } from '../../utils/constants';
import { bufferTo18Decimals } from '../../utils/dappHelper';
import WhiteText from '../other/WhiteText';
import OrangeText from '../other/OrangeText';
import { UpdateExchangeRateParams } from '../../types';
import { IoIosCheckmarkCircle } from 'react-icons/io';
import { AlertCircleOutline } from 'react-ionicons';
import { HiOutlineExternalLink, HiXCircle } from 'react-icons/hi';
import { useContractData } from '../providers/ContractDataProvider';
import GooSpinner from '../other/GooSpiner';
import { toastError } from '../../hooks/toast';

enum UpdateStatus {
    Idle,
    WaitingForWalletConfirmation,
    UpdatingExchangeRate,
    UpdatePending,
    Confirmed,
    Error,
}

const UpdateExchangeRateModal = ({ isOpen, onClose, selectedVault }) => {
    const [usdtUnreservedAmount, setUsdtUnreservedAmount] = useState('');
    const [profitPercentage, setProfitPercentage] = useState('');
    const [btcOutputAmount, setBtcOutputAmount] = useState('');
    const [usdtDepositUnreservedUSD, setUsdtUnreservedAmountUSD] = useState('$0.00');
    const [profitAmountUSD, setProfitAmountUSD] = useState('$0.00');
    const [bitcoinOutputAmountUSD, setBitcoinOutputAmountUSD] = useState('$0.00');
    const currentlyExpiredReservationIndexes = useStore((state) => state.currentlyExpiredReservationIndexes);
    const bitcoinPriceUSD = useStore((state) => state.validAssets['BTC'].priceUSD);
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);
    const usdtPriceUSD = useStore.getState().validAssets[selectedInputAsset.name].priceUSD;
    const { refreshUserSwapsFromAddress, loading } = useContractData();
    const [updateStatus, setUpdateStatus] = useState(UpdateStatus.Idle);
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState('');

    useEffect(() => {
        console.log('selectedVault:', selectedVault);
        if (isOpen && selectedVault) {
            setUsdtUnreservedAmount(formatUnits(selectedVault.trueUnreservedBalance, selectedInputAsset.decimals).toString() ?? '0');
        }
    }, [isOpen, selectedVault]);

    useEffect(() => {
        calculateUsdValues();
    }, [usdtUnreservedAmount, btcOutputAmount, profitPercentage]);

    useEffect(() => {
        const usdtDepositUnreservedUSD =
            usdtPriceUSD && usdtUnreservedAmount
                ? (usdtPriceUSD * parseFloat(usdtUnreservedAmount)).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                  })
                : '$0.00';
        setUsdtUnreservedAmountUSD(usdtDepositUnreservedUSD);
    }, [usdtUnreservedAmount]);

    // calculate deposit amount in USD
    const calculateUsdValues = () => {
        const depositAmountUSD =
            usdtPriceUSD && usdtUnreservedAmount
                ? (usdtPriceUSD * parseFloat(usdtUnreservedAmount)).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                  })
                : '$0.00';
        setUsdtUnreservedAmountUSD(depositAmountUSD);

        // calculate profit amount in USD
        const profitAmountUSD =
            usdtPriceUSD && usdtUnreservedAmount && profitPercentage
                ? (((parseFloat(usdtUnreservedAmount) * parseFloat(profitPercentage)) / 100) * usdtPriceUSD).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                  })
                : '$0.00';
        setProfitAmountUSD(profitAmountUSD);

        // calculate Bitcoin output amount in USD
        const btcOutputAmountUSD =
            bitcoinPriceUSD && btcOutputAmount
                ? (bitcoinPriceUSD * parseFloat(btcOutputAmount)).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                  })
                : '$0.00';
        setBitcoinOutputAmountUSD(btcOutputAmountUSD);
    };

    const handleTokenDepositChange = (e) => {
        const maxDecimals = selectedVault.depositAsset.decimals;
        const tokenValue = e.target.value;

        const validateTokenDepositChange = (value) => {
            if (value === '') return true;
            const regex = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`);
            return regex.test(value);
        };

        if (validateTokenDepositChange(tokenValue)) {
            setUsdtUnreservedAmount(tokenValue);
            calculateBitcoinOutputAmount(tokenValue, undefined);
        }
    };

    const handleProfitPercentageChange = (e) => {
        const profitPercentageValue = e.target.value.replace('%', '');

        if (validateProfitPercentage(profitPercentageValue)) {
            setProfitPercentage(profitPercentageValue);
            calculateBitcoinOutputAmount(undefined, profitPercentageValue);
        } else {
            console.log('Invalid profit percentage');
        }
    };

    const handleProfitPercentageFocus = (value) => {
        let profitPercentageValue = value.replace('%', '').replace(/^\+/, '');
        setProfitPercentage(profitPercentageValue);
    };

    const handleProfitPercentageBlur = () => {
        if (profitPercentage === '-') setProfitPercentage('');
        else if (profitPercentage !== '') {
            let formattedProfitPercentage = profitPercentage;
            if (!formattedProfitPercentage.startsWith('-') && /^[0-9]/.test(formattedProfitPercentage)) {
                formattedProfitPercentage = '+' + formattedProfitPercentage;
            }
            formattedProfitPercentage += '%';
            setProfitPercentage(formattedProfitPercentage);
        }
    };

    const calculateProfitPercent = (bitcoinAmount) => {
        const startValue = parseFloat(usdtUnreservedAmount);
        const endValue = parseFloat(bitcoinAmount) * useStore.getState().validAssets[selectedInputAsset.name].exchangeRateInTokenPerBTC;

        const newProfitPercentage = (((endValue - startValue) / startValue) * 100).toFixed(2);
        if (validateProfitPercentage(newProfitPercentage)) {
            let formattedProfitPercentage = newProfitPercentage;
            if (!formattedProfitPercentage.startsWith('-') && /^[0-9]/.test(formattedProfitPercentage)) {
                formattedProfitPercentage = '+' + formattedProfitPercentage;
            }
            formattedProfitPercentage += '%';
            setProfitPercentage(formattedProfitPercentage);
        }
    };

    const validateProfitPercentage = (value) => {
        if (value === '') return true;
        const regex = /^-?\d*(\.\d{0,2})?$/;
        return regex.test(value);
    };

    const handleBitcoinOutputAmountChange = (e) => {
        const bitcoinOutputAmountValue = e.target.value;

        if (validateBitcoinOutputAmount(bitcoinOutputAmountValue)) {
            setBtcOutputAmount(bitcoinOutputAmountValue === '0.0' ? '' : bitcoinOutputAmountValue);
            calculateProfitPercent(bitcoinOutputAmountValue);
        }
    };

    const calculateBitcoinOutputAmount = (newUsdtDepositAmount, newProfitPercentage) => {
        if (usdtPriceUSD && bitcoinPriceUSD) {
            const profitAmountInToken = parseFloat(newUsdtDepositAmount ?? usdtUnreservedAmount) * (parseFloat(newProfitPercentage ?? profitPercentage) / 100);
            const totalTokenUSD = parseFloat(newUsdtDepositAmount ?? usdtUnreservedAmount) * usdtPriceUSD + profitAmountInToken * usdtPriceUSD;
            const newBitcoinOutputAmount = totalTokenUSD / bitcoinPriceUSD > 0 ? totalTokenUSD / bitcoinPriceUSD : 0;
            const formattedBitcoinOutputAmount = newBitcoinOutputAmount == 0 ? '0.0' : newBitcoinOutputAmount.toFixed(7);

            if (validateBitcoinOutputAmount(formattedBitcoinOutputAmount)) {
                setBtcOutputAmount(formattedBitcoinOutputAmount === '0.0' ? '' : formattedBitcoinOutputAmount);
            }
        }
    };

    const validateBitcoinOutputAmount = (value) => {
        if (value === '') return true;
        const regex = /^\d*\.?\d*$/;
        return regex.test(value);
    };

    const handleUpdateExchangeRate = async () => {
        if (!window.ethereum || !selectedVault) {
            console.error('Ethereum provider or selected vault not available');
            return;
        }

        setUpdateStatus(UpdateStatus.WaitingForWalletConfirmation);

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        const tokenDepositAmountInSmallestTokenUnits = parseUnits(usdtUnreservedAmount, selectedVault.depositAsset.decimals);
        const tokenDepositAmountInSmallestTokenUnitsBufferedTo18Decimals = bufferTo18Decimals(tokenDepositAmountInSmallestTokenUnits, selectedVault.depositAsset.decimals);
        const bitcoinOutputAmountInSats = parseUnits(btcOutputAmount, BITCOIN_DECIMALS);
        const exchangeRate = tokenDepositAmountInSmallestTokenUnitsBufferedTo18Decimals.div(bitcoinOutputAmountInSats);

        const clipToDecimals = BITCOIN_DECIMALS;
        const precisionBN = BigNumber.from(10).pow(clipToDecimals);
        const clippedExchangeRate = exchangeRate.div(precisionBN).mul(precisionBN);

        const updateExchangeRateParams: UpdateExchangeRateParams = {
            globalVaultIndex: selectedVault.index,
            newExchangeRate: clippedExchangeRate,
            expiredSwapReservationIndexes: currentlyExpiredReservationIndexes,
        };

        try {
            const contract = new ethers.Contract(selectedVault.depositAsset.riftExchangeContractAddress, selectedVault.depositAsset.riftExchangeAbi, signer);

            setUpdateStatus(UpdateStatus.UpdatingExchangeRate);
            const tx = await contract.updateExchangeRate(updateExchangeRateParams.globalVaultIndex, updateExchangeRateParams.newExchangeRate, updateExchangeRateParams.expiredSwapReservationIndexes);

            setTxHash(tx.hash);
            setUpdateStatus(UpdateStatus.UpdatePending);

            await tx.wait();
            setUpdateStatus(UpdateStatus.Confirmed);
            console.log('Exchange rate updated successfully');
            setProfitPercentage('');
            setBtcOutputAmount('');
            refreshUserSwapsFromAddress();
        } catch (error) {
            console.error('Failed to update exchange rate:', error);
            setError(error.message || 'An error occurred while updating the exchange rate');
            setUpdateStatus(UpdateStatus.Error);
        }
    };

    const getStatusMessage = () => {
        switch (updateStatus) {
            case UpdateStatus.WaitingForWalletConfirmation:
                return 'Waiting for wallet confirmation...';
            case UpdateStatus.UpdatingExchangeRate:
                return 'Updating exchange rate...';
            case UpdateStatus.UpdatePending:
                return 'Confirming update...';
            case UpdateStatus.Confirmed:
                return 'Exchange rate updated successfully!';
            case UpdateStatus.Error:
                if (error.toLowerCase().includes('user rejected transaction')) {
                    return 'User rejected transaction';
                }
                return `Error: ${error}`;
            default:
                return 'Processing...';
        }
    };

    const getSubtext = () => {
        switch (updateStatus) {
            case UpdateStatus.WaitingForWalletConfirmation:
                return 'Please confirm the transaction in your wallet';
            case UpdateStatus.UpdatingExchangeRate:
            case UpdateStatus.UpdatePending:
                return 'Awaiting blockchain confirmation...';
            default:
                return '';
        }
    };

    const getEtherscanUrl = () => {
        if (!txHash) return '#';
        return `${selectedVault.depositAsset.etherScanBaseUrl}/tx/${txHash}`;
    };

    const resetModal = () => {
        setUpdateStatus(UpdateStatus.Idle);
        setError('');
        setTxHash('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={resetModal} isCentered closeOnOverlayClick={updateStatus !== UpdateStatus.UpdatingExchangeRate && updateStatus !== UpdateStatus.UpdatePending}>
            <ModalOverlay />
            <ModalContent
                bg={colors.offBlackLighter}
                minW={updateStatus === UpdateStatus.Idle ? '700px' : updateStatus === UpdateStatus.Error ? '600px' : updateStatus === UpdateStatus.Confirmed ? '400px' : '500px'}
                mx='auto'
                my='auto'
                borderRadius='20px'
                alignItems='center'
                border={`2px solid ${colors.borderGray}`}
                animation={`breathe 3s infinite ease-in-out`}
                sx={{
                    '@keyframes breathe': {
                        '0%, 100%': {
                            filter: error != '' ? 'drop-shadow(0px 0px 30px rgba(183, 6, 6, 0.3))' : 'drop-shadow(0px 0px 30px rgba(6, 64, 183, 0.4))',
                        },
                        '50%': {
                            filter: error != '' ? 'drop-shadow(0px 0px 40px rgba(183, 6, 6, 0.5))' : 'drop-shadow(0px 0px 50px rgba(6, 64, 183, 0.6))',
                        },
                    },
                }}>
                <ModalHeader color={colors.offWhite} userSelect={'none'} fontFamily={FONT_FAMILIES.NOSTROMO} fontWeight='bold' textAlign='center' fontSize='24px'>
                    {updateStatus === UpdateStatus.Idle ? 'Update Exchange Rate' : 'Update Status'}
                </ModalHeader>
                {updateStatus !== UpdateStatus.UpdatingExchangeRate && updateStatus !== UpdateStatus.UpdatePending && <ModalCloseButton color={colors.offWhite} />}
                <ModalBody w='100%'>
                    {updateStatus === UpdateStatus.Idle ? (
                        <Flex
                            w='100%'
                            h='100%'
                            mt='-15px'
                            px='30px'
                            py='8px'
                            flexDir='column'
                            userSelect='none'
                            fontSize='12px'
                            fontFamily={FONT_FAMILIES.AUX_MONO}
                            color='#c3c3c3'
                            fontWeight='normal'
                            gap='0px'>
                            <Text fontSize='13px' letterSpacing='-1px' my='10px' textAlign='center'>
                                Update your sell order by adjusting the <WhiteText>Exchange Rate</WhiteText>. If you have active reservations on this vault, the remaining unreserved liqudity will be
                                <Text as='span' color='orange'>
                                    {' '}
                                    forked into a new vault{' '}
                                </Text>{' '}
                                with your updated exchange rate
                            </Text>
                            <Flex mt='25px' direction='column' overflow='visible'>
                                {/* Deposit Input */}
                                <Flex mt='0px' px='10px' bg={selectedInputAsset.dark_bg_color} w='100%' h='105px' border='2px solid' borderColor={selectedInputAsset.bg_color} borderRadius='10px'>
                                    <Flex direction='column' py='10px' px='5px'>
                                        <Text color={!usdtUnreservedAmount ? colors.offWhite : colors.textGray} fontSize='13px' letterSpacing='-1px' fontWeight='normal' fontFamily='Aux'>
                                            Current Unreserved Liquidity
                                        </Text>
                                        <Input
                                            value={usdtUnreservedAmount}
                                            disabled={true}
                                            onChange={handleTokenDepositChange}
                                            fontFamily='Aux'
                                            border='none'
                                            mt='2px'
                                            mr='-100px'
                                            ml='-5px'
                                            p='0px'
                                            letterSpacing='-6px'
                                            color={colors.offWhite}
                                            _active={{ border: 'none', boxShadow: 'none' }}
                                            _focus={{ border: 'none', boxShadow: 'none' }}
                                            _selected={{ border: 'none', boxShadow: 'none' }}
                                            fontSize='40px'
                                            _placeholder={{
                                                color: selectedInputAsset.light_text_color,
                                            }}
                                        />
                                        <Text
                                            color={!usdtUnreservedAmount ? colors.offWhite : colors.textGray}
                                            fontSize='13px'
                                            mt='2px'
                                            ml='1px'
                                            letterSpacing='-1px'
                                            fontWeight='normal'
                                            fontFamily='Aux'>
                                            {usdtDepositUnreservedUSD}
                                        </Text>
                                    </Flex>
                                    <Spacer />
                                    <Flex mt='8px' mr='6px'>
                                        <AssetTag assetName={'ARBITRUM_USDT'} width='134px' />
                                    </Flex>
                                </Flex>
                                {/* Profit Percentage Input */}
                                <Flex mt='10px' px='10px' bg='#161A33' w='100%' h='105px' border='2px solid #303F9F' borderRadius='10px'>
                                    <Flex direction='column' py='10px' px='5px'>
                                        <Text color={!profitPercentage ? colors.offWhite : colors.textGray} fontSize='13px' letterSpacing='-1px' fontWeight='normal' fontFamily='Aux'>
                                            Your Profit %
                                        </Text>
                                        <Input
                                            value={profitPercentage}
                                            onChange={(e) => {
                                                handleProfitPercentageChange(e);
                                            }}
                                            onBlur={handleProfitPercentageBlur}
                                            onFocus={() => handleProfitPercentageFocus(profitPercentage)}
                                            fontFamily='Aux'
                                            border='none'
                                            mt='2px'
                                            mr='-120px'
                                            ml='-5px'
                                            p='0px'
                                            letterSpacing='-6px'
                                            color={colors.offWhite}
                                            _active={{ border: 'none', boxShadow: 'none' }}
                                            _focus={{ border: 'none', boxShadow: 'none' }}
                                            _selected={{ border: 'none', boxShadow: 'none' }}
                                            fontSize='40px'
                                            placeholder='0.0'
                                            _placeholder={{ color: '#5C63A3' }}
                                        />
                                        <Text color={!profitPercentage ? colors.offWhite : colors.textGray} fontSize='13px' mt='2px' ml='1px' letterSpacing='-1px' fontWeight='normal' fontFamily='Aux'>
                                            ≈ {profitAmountUSD}
                                        </Text>
                                    </Flex>
                                    <Spacer />
                                    <Flex
                                        alignSelf='center'
                                        mr='6px'
                                        w='220px'
                                        h='60px'
                                        bg='#222753'
                                        fontSize='12px'
                                        align='center'
                                        letterSpacing='-1px'
                                        justify='center'
                                        border='2px solid #3C4ABB'
                                        borderRadius='10px'
                                        textAlign='center'
                                        direction='column'>
                                        <Text color={colors.offWhite}>Your Exchange Rate</Text>
                                        <Text>
                                            1 BTC ={' '}
                                            {usdtUnreservedAmount && btcOutputAmount
                                                ? ((parseFloat(usdtUnreservedAmount) / parseFloat(btcOutputAmount)) * usdtPriceUSD).toLocaleString('en-US', {
                                                      style: 'currency',
                                                      currency: 'USD',
                                                  })
                                                : '$0.00'}{' '}
                                            {selectedInputAsset.name}
                                        </Text>
                                    </Flex>
                                </Flex>
                                {/* Bitcoin Amount Out */}
                                <Flex mt='10px' px='10px' bg='#2E1C0C' w='100%' h='105px' border='2px solid #78491F' borderRadius='10px'>
                                    <Flex direction='column' py='10px' px='5px'>
                                        <Text color={!btcOutputAmount ? colors.offWhite : colors.textGray} fontSize='13px' letterSpacing='-1px' fontWeight='normal' fontFamily='Aux'>
                                            You Receive
                                        </Text>
                                        <Input
                                            value={btcOutputAmount}
                                            onChange={handleBitcoinOutputAmountChange}
                                            fontFamily='Aux'
                                            border='none'
                                            mt='2px'
                                            mr='-5px'
                                            ml='-5px'
                                            p='0px'
                                            letterSpacing='-6px'
                                            color={colors.offWhite}
                                            _active={{ border: 'none', boxShadow: 'none' }}
                                            _focus={{ border: 'none', boxShadow: 'none' }}
                                            _selected={{ border: 'none', boxShadow: 'none' }}
                                            fontSize='40px'
                                            placeholder='0.0'
                                            _placeholder={{ color: '#805530' }}
                                        />
                                        <Text
                                            color={!btcOutputAmount ? colors.offWhite : colors.textGray}
                                            fontSize='13px'
                                            mt='2px'
                                            ml='1px'
                                            letterSpacing='-1.5px'
                                            fontWeight='normal'
                                            fontFamily='Aux'>
                                            ≈ {bitcoinOutputAmountUSD}
                                        </Text>
                                    </Flex>
                                    <Spacer />
                                    <Flex mt='8px' mr='6px'>
                                        <AssetTag assetName='BTC' />
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Flex>
                    ) : (
                        <Flex direction='column' align='center' justify='center' h='100%' pb={'15px'}>
                            {(updateStatus === UpdateStatus.UpdatingExchangeRate || updateStatus === UpdateStatus.UpdatePending) && <GooSpinner size={100} color={colors.purpleBorder} />}
                            <Spacer />
                            <Text fontSize='12px' w='100%' mt='25px' mb='0px' color={colors.textGray} fontFamily={FONT_FAMILIES.AUX_MONO} fontWeight={'normal'} textAlign='center'>
                                {getSubtext()}
                            </Text>
                            <Flex direction={'column'} align={'center'} w='100%' justify={'center'}>
                                {updateStatus === UpdateStatus.Confirmed && (
                                    <Flex mt='-20px' ml='4px'>
                                        <IoIosCheckmarkCircle size={45} color={colors.greenOutline} />
                                    </Flex>
                                )}
                                {updateStatus === UpdateStatus.Error && (
                                    <Flex mt='-20px' mb='8px' ml='4px'>
                                        <AlertCircleOutline width='38px' height={'38px'} color={colors.red} />
                                    </Flex>
                                )}
                                <Text
                                    overflowWrap={'anywhere'}
                                    fontFamily={FONT_FAMILIES.NOSTROMO}
                                    color={updateStatus === UpdateStatus.Confirmed ? colors.greenOutline : colors.offWhite}
                                    fontSize={getStatusMessage().length > 40 ? '12px' : '18px'}
                                    mt={updateStatus === UpdateStatus.Confirmed ? '5px' : '20px'}
                                    fontWeight='normal'
                                    textAlign='center'>
                                    {getStatusMessage()}
                                </Text>
                            </Flex>
                            {updateStatus === UpdateStatus.Confirmed && (
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
                                        <Text fontSize='14px' color={colors.offWhite} fontFamily={FONT_FAMILIES.NOSTROMO} cursor={'pointer'} fontWeight={'normal'}>
                                            View on Etherscan
                                        </Text>
                                    </Button>
                                    <Button
                                        mt={'10px'}
                                        bg={colors.offBlackLighter}
                                        borderWidth={'2px'}
                                        h='45px'
                                        borderColor={colors.borderGrayLight}
                                        fontWeight={'normal'}
                                        onClick={resetModal}
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
                            {updateStatus === UpdateStatus.Error && (
                                <>
                                    <Box mt={4} p={2} bg='#2E1C0C' border='1px solid #78491F' borderRadius='md'>
                                        <Text overflowWrap={'anywhere'} fontSize='12px' color='#FF6B6B' fontFamily={FONT_FAMILIES.AUX_MONO} fontWeight='normal' textAlign='center'>
                                            {error.toLowerCase().includes('user rejected transaction') ? 'User rejected the transaction, please try again.' : error}
                                        </Text>
                                    </Box>
                                    <Button
                                        mt={'25px'}
                                        onClick={resetModal}
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
                {updateStatus === UpdateStatus.Idle && (
                    <ModalFooter>
                        <Button
                            bg={colors.purpleButtonBG}
                            color={colors.offWhite}
                            mb='10px'
                            _hover={{ bg: usdtUnreservedAmount && profitPercentage && btcOutputAmount ? colors.purpleHover : colors.purpleButtonBG }}
                            mt='-5px'
                            w='350px'
                            borderRadius='10px'
                            h='50px'
                            border='2px solid #445BCB'
                            mr={3}
                            onClick={() => {
                                usdtUnreservedAmount && profitPercentage && btcOutputAmount
                                    ? handleUpdateExchangeRate()
                                    : toastError('', { title: 'Empty Fields Required', description: 'Please fill in the profit percentage or bitcoin output amount' });
                            }}
                            opacity={usdtUnreservedAmount && profitPercentage && btcOutputAmount ? 1 : 0.5}
                            cursor={'pointer'}>
                            UPDATE EXCHANGE RATE
                        </Button>
                    </ModalFooter>
                )}
            </ModalContent>
        </Modal>
    );
};

export default UpdateExchangeRateModal;
