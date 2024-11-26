import { Flex, Spacer, Tooltip, Text, Spinner, calc } from '@chakra-ui/react';
import { calculateBtcOutputAmountFromExchangeRate, calculateOriginalAmountBeforeFee, formatBtcExchangeRate } from '../../utils/dappHelper';
import { DepositVault, ValidAsset } from '../../types';
import { BigNumber } from 'ethers';
import { colors } from '../../utils/colors';
import { FONT_FAMILIES } from '../../utils/font';
import { AssetTag } from '../other/AssetTag';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { FaRegArrowAltCircleRight } from 'react-icons/fa';
import { IoMdSettings } from 'react-icons/io';
import { VaultStatusBar } from './VaultStatusBar';
import { formatDistanceToNow } from 'date-fns';
import { useStore } from '../../store';
import { useEffect, useState } from 'react';
import { fetchReservationDetails } from '../../utils/dappHelper';
import { BITCOIN_DECIMALS } from '../../utils/constants';
import { copyToClipboard } from '../../utils/frontendHelpers';
import useWindowSize from '../../hooks/useWindowSize';

interface SwapPreviewCardProps {
    vault?: DepositVault;
    url?: string;
    onClick?: () => void;
    selectedInputAsset: ValidAsset;
    isActivityPage?: boolean;
}

const SwapPreviewCard: React.FC<SwapPreviewCardProps> = ({ vault, url, onClick, selectedInputAsset, isActivityPage }) => {
    const timestampUnix = vault?.depositTimestamp ? BigNumber.from(vault.depositTimestamp).toNumber() : null;
    const { isMobile } = useWindowSize();

    const timeAgo = timestampUnix ? formatDistanceToNow(new Date(timestampUnix * 1000), { addSuffix: true }) : 'N/A';
    const [btcInputSwapAmount, setBtcInputSwapAmount] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const ethersRpcProvider = useStore.getState().ethersRpcProvider;

    const SettingsWithTooltip = () => {
        const label = vault ? `d-${vault.index} \n settings` : 'settings';

        return (
            <Tooltip fontFamily={FONT_FAMILIES.AUX_MONO} label={label} fontSize='sm' bg={colors.offBlackLighter3} borderColor={colors.offBlack} color={colors.textGray} borderRadius='md' hasArrow>
                <Flex w='30px' justify='flex-end'>
                    <Flex alignItems='center'>
                        <IoMdSettings size={'18px'} color={colors.textGray} />
                    </Flex>
                </Flex>
            </Tooltip>
        );
    };

    const renderAddress = (address: string | undefined) => {
        if (!address || !isActivityPage) return null;
        const shortenedAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

        const handleAddressClick = (e: React.MouseEvent) => {
            e.stopPropagation(); // Prevent triggering the parent onClick
            copyToClipboard(address, 'Address copied to clipboard.');
        };

        return (
            <Text
                fontSize='10px'
                fontFamily={FONT_FAMILIES.NOSTROMO}
                letterSpacing={'1px'}
                color={colors.textGray}
                cursor='pointer'
                onClick={handleAddressClick}
                _hover={{ textDecoration: 'underline' }}>
                {shortenedAddress}
            </Text>
        );
    };

    const renderAmount = (amount: string | null, isLoading: boolean, fallbackValue: string | undefined) => {
        if (isLoading) {
            return <Spinner size='sm' color={colors.offWhite} />;
        }
        return (
            <Text fontSize='16px' color={colors.offWhite} letterSpacing={'-1px'} fontFamily={FONT_FAMILIES.AUX_MONO}>
                {amount !== null ? amount : fallbackValue || 'N/A'}
            </Text>
        );
    };

    const renderDetailRow = (label: string, value: string | number | null | undefined) => (
        <Flex mr='20px' py='4px' fontSize='13px'>
            <Text fontFamily={FONT_FAMILIES.AUX_MONO} color={colors.textGray}>
                {label}:
            </Text>
            <Text ml='3px' fontFamily={FONT_FAMILIES.AUX_MONO} color={colors.offWhite}>
                {value}
            </Text>
        </Flex>
    );

    return (
        <Flex>
            <Flex
                _hover={
                    isActivityPage
                        ? {}
                        : {
                              bg: colors.purpleBackground,
                              borderColor: colors.purpleBorder,
                          }
                }
                onClick={onClick}
                cursor={isActivityPage ? 'normal' : 'pointer'}
                letterSpacing={'-2px'}
                bg={colors.offBlack}
                w='100%'
                mb='10px'
                fontSize={'18px'}
                px='16px'
                py={isActivityPage ? '24px' : '12px'}
                align='flex-start'
                justify='flex-start'
                borderRadius={'10px'}
                border='2px solid '
                color={colors.textGray}
                borderColor={colors.borderGray}
                gap='12px'
                flexDirection={isActivityPage ? 'column' : 'row'}
                height={isActivityPage ? 'auto' : 'unset'}>
                <Flex w='100%' direction={isMobile ? 'column' : 'row'}>
                    <Text width='110px' pr='10px' fontSize={'14px'} fontFamily={FONT_FAMILIES.AUX_MONO} fontWeight={'normal'}>
                        {timeAgo}
                    </Text>
                    <Flex flex={1} w='100%' align='center' gap='12px' direction={isMobile ? 'column' : 'row'}>
                        {isActivityPage && (
                            <Flex w='100px' direction='column'>
                                {renderAddress(vault?.owner)}
                            </Flex>
                        )}

                        {/* Input Section */}
                        <Flex flex={1} direction='column' align={isMobile ? 'center' : ''} w={isMobile ? '100%' : ''}>
                            <Flex
                                h='50px'
                                w={isMobile ? '100%' : '300px'}
                                bg={selectedInputAsset.dark_bg_color}
                                border='2px solid'
                                borderColor={selectedInputAsset.bg_color}
                                borderRadius={'14px'}
                                pl='15px'
                                pr='10px'
                                align={'center'}>
                                {renderAmount(vault.initialBalance && formatUnits(BigNumber.from(vault.initialBalance).toString(), vault.depositAsset?.decimals).toString(), false, undefined)}
                                <Spacer />
                                <AssetTag assetName={vault.depositAsset?.name == 'USDT' ? 'ARBITRUM_USDT' : vault.depositAsset?.name} width='100px' />
                            </Flex>
                        </Flex>

                        {/* Arrow */}
                        <Flex mt='0px' fontSize='20px' opacity={0.9}>
                            <FaRegArrowAltCircleRight color={colors.RiftOrange} />
                        </Flex>

                        {/* Output Section */}
                        <Flex flex={1} direction='column' w={isMobile ? '100%' : ''}>
                            <Flex
                                h='50px'
                                w={isMobile ? '100%' : '300px'}
                                bg={colors.currencyCard.btc.background}
                                border='2px solid'
                                borderColor={colors.currencyCard.btc.border}
                                borderRadius={'14px'}
                                pl='15px'
                                pr='10px'
                                align={'center'}>
                                {renderAmount(
                                    btcInputSwapAmount,
                                    isLoading,
                                    vault?.btcExchangeRate && calculateBtcOutputAmountFromExchangeRate(vault.initialBalance, vault.depositAsset?.decimals, vault.btcExchangeRate),
                                )}
                                <Spacer />
                                <AssetTag assetName='BTC' width='80px' />
                            </Flex>
                        </Flex>
                    </Flex>

                    <Flex width={isMobile ? '100%' : '125px'} mt={isMobile ? '20px' : '0px'} ml={isMobile ? '0px' : '10px'} mb={isMobile ? '-20px' : '0px'}>
                        {vault && (
                            <Flex w='100%'>
                                <VaultStatusBar mini={true} selectedVault={vault} />
                            </Flex>
                        )}
                    </Flex>

                    {!isActivityPage && <SettingsWithTooltip />}
                </Flex>

                {isActivityPage && vault && (
                    <Flex w='100%' direction={isMobile ? 'column' : 'row'}>
                        <Flex w='100%' direction={isMobile ? 'column' : 'row'} gap='1px' mt='16px' fontSize='12px' fontFamily={FONT_FAMILIES.AUX_MONO}>
                            {renderDetailRow('D-', vault.index)}
                            {renderDetailRow('Deposit Timestamp', new Date(BigNumber.from(vault.depositTimestamp).toNumber() * 1000).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))}
                            {renderDetailRow('Initial Balance', formatUnits(vault.initialBalance, vault.depositAsset?.decimals))}
                            {renderDetailRow('BTC Exchange Rate', formatBtcExchangeRate(vault.btcExchangeRate, vault.depositAsset?.decimals))}
                        </Flex>
                    </Flex>
                )}
            </Flex>
        </Flex>
    );
};

export default SwapPreviewCard;
