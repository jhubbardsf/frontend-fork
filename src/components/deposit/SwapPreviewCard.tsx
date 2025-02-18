import { Flex, Spacer, Tooltip, Text } from '@chakra-ui/react';
import { BigNumber } from 'ethers';
import { formatDistanceToNow } from 'date-fns';
import { FaRegArrowAltCircleRight } from 'react-icons/fa';
import { IoMdSettings } from 'react-icons/io';
import { copyToClipboard } from '../../utils/frontendHelpers';
import useWindowSize from '../../hooks/useWindowSize';
import { FONT_FAMILIES } from '../../utils/font';
import { colors } from '../../utils/colors';
import { UserSwap } from '../../types'; // <-- Your new Swap interface
import { ValidAsset } from '../../types'; // <-- For selectedInputAsset
import { AssetTag } from '../other/AssetTag';

interface SwapPreviewCardProps {
    swap?: UserSwap; // Uses the new Swap type
    selectedInputAsset: ValidAsset;
    onClick?: () => void;
    isActivityPage?: boolean;
}

const SwapPreviewCard: React.FC<SwapPreviewCardProps> = ({ swap, selectedInputAsset, onClick, isActivityPage }) => {
    const { isMobile } = useWindowSize();

    if (!swap) {
        return null; // or some fallback UI
    }

    // 1) TIMESTAMP
    // swap.depositTimestamp is a Unix epoch (seconds).
    const timestampMs = swap.depositTimestamp * 1000;
    const timeAgo = formatDistanceToNow(new Date(timestampMs), { addSuffix: true });

    // 2) DEPOSIT AMOUNT (hex -> BigNumber -> decimal)
    const depositAmountDecimal = BigNumber.from(swap.depositAmount).toString();
    const depositAmountDisplay = Number(depositAmountDecimal).toLocaleString();

    // 3) EXPECTED SATS (convert satoshis to BTC)
    const satsOutBtc = swap.expectedSats / 1e8;
    const satsOutDisplay = satsOutBtc.toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' BTC';

    // 4) STATUS based on swap_proofs
    const status = swap.swap_proofs.length > 0 ? 'Completed' : 'Pending';

    // Helper: copy owner address (only if isActivityPage)
    const renderOwnerAddress = (address?: string) => {
        if (!address || !isActivityPage) return null;
        const shortened = `${address.slice(0, 4)}...${address.slice(-4)}`;
        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            copyToClipboard(address, 'Address copied to clipboard.');
        };
        return (
            <Text fontSize='10px' fontFamily={FONT_FAMILIES.NOSTROMO} letterSpacing='1px' color={colors.textGray} cursor='pointer' onClick={handleClick} _hover={{ textDecoration: 'underline' }}>
                {shortened}
            </Text>
        );
    };

    const SettingsWithTooltip = () => {
        const label = `Deposit TX: ${swap.deposit_txid}\nSettings`;
        return (
            <Tooltip fontFamily={FONT_FAMILIES.AUX_MONO} label={label} fontSize='sm' bg={colors.offBlackLighter3} borderColor={colors.offBlack} color={colors.textGray} borderRadius='md' hasArrow>
                <Flex w='30px' justify='flex-end' alignItems='center'>
                    <IoMdSettings size={18} color={colors.textGray} />
                </Flex>
            </Tooltip>
        );
    };

    return (
        <Flex>
            <Flex
                onClick={onClick}
                cursor={isActivityPage ? 'normal' : 'pointer'}
                bg={colors.offBlack}
                w='100%'
                mb='10px'
                fontSize='18px'
                px='16px'
                py={isActivityPage ? '24px' : '12px'}
                align='flex-start'
                justify='flex-start'
                borderRadius='10px'
                border='2px solid'
                color={colors.textGray}
                borderColor={colors.borderGray}
                gap='12px'
                flexDirection={isActivityPage ? 'column' : 'row'}
                letterSpacing='-2px'
                _hover={
                    isActivityPage
                        ? {}
                        : {
                              bg: colors.purpleBackground,
                              borderColor: colors.purpleBorder,
                          }
                }>
                {/* Left side: timeAgo */}
                <Flex w='100%' direction={isMobile ? 'column' : 'row'}>
                    <Text width='110px' pr='10px' fontSize='14px' fontFamily={FONT_FAMILIES.AUX_MONO} fontWeight='normal'>
                        {timeAgo}
                    </Text>

                    {/* Middle: deposit box / arrow / sats out box */}
                    <Flex flex={1} w='100%' align='center' gap='12px' direction={isMobile ? 'column' : 'row'}>
                        {isActivityPage && (
                            <Flex w='100px' direction='column'>
                                {renderOwnerAddress(swap.ownerAddress)}
                            </Flex>
                        )}

                        {/* Deposit Amount Box */}
                        <Flex flex={1} direction='column' align={isMobile ? 'center' : 'flex-start'} w={isMobile ? '100%' : 'auto'}>
                            <Flex
                                h='50px'
                                w={isMobile ? '100%' : '160px'}
                                bg={selectedInputAsset.dark_bg_color}
                                border='2px solid'
                                borderColor={selectedInputAsset.bg_color}
                                borderRadius='14px'
                                pl='15px'
                                pr='10px'
                                align='center'>
                                <Text fontSize='16px' color={colors.offWhite} letterSpacing='-1px' fontFamily={FONT_FAMILIES.AUX_MONO}>
                                    {depositAmountDisplay}
                                </Text>
                                <Spacer />
                                {/* If you want an asset tag, something like: */}
                                <AssetTag assetName={selectedInputAsset.name} width='80px' />
                            </Flex>
                        </Flex>

                        {/* Arrow */}
                        <Flex mt='0px' fontSize='20px' opacity={0.9}>
                            <FaRegArrowAltCircleRight color={colors.RiftOrange} />
                        </Flex>

                        {/* Sats Out Box */}
                        <Flex flex={1} direction='column' align={isMobile ? 'center' : 'flex-start'} w={isMobile ? '100%' : 'auto'}>
                            <Flex
                                h='50px'
                                w={isMobile ? '100%' : '160px'}
                                bg={colors.offBlackLighter3}
                                border='2px solid'
                                borderColor={colors.borderGray}
                                borderRadius='14px'
                                pl='15px'
                                pr='10px'
                                align='center'>
                                <Text fontSize='16px' color={colors.offWhite} letterSpacing='-1px' fontFamily={FONT_FAMILIES.AUX_MONO}>
                                    {satsOutDisplay}
                                </Text>
                                <Spacer />
                                <AssetTag assetName='BTC' width='80px' />
                            </Flex>
                        </Flex>
                    </Flex>

                    {/* Settings Icon (if not on activity page) */}
                    {!isActivityPage && <SettingsWithTooltip />}
                </Flex>

                {/* Bottom: If on activity page, show status or more info */}
                {isActivityPage && (
                    <Flex w='100%' direction={isMobile ? 'column' : 'row'} mt='16px'>
                        <Text fontFamily={FONT_FAMILIES.AUX_MONO} fontSize='12px' color={colors.offWhite} mr='12px'>
                            Status: {status}
                        </Text>
                        <Text fontFamily={FONT_FAMILIES.AUX_MONO} fontSize='12px' color={colors.offWhite}>
                            Tx: {swap.deposit_txid.slice(0, 10)}...
                        </Text>
                    </Flex>
                )}
            </Flex>
        </Flex>
    );
};

export default SwapPreviewCard;
