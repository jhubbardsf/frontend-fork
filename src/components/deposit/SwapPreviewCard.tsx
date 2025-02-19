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
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { BITCOIN_DECIMALS } from '../../utils/constants';
import { satsToBtc } from '../../utils/dappHelper';
import WebAssetTag from '../other/WebAssetTag';
import { HiOutlineExternalLink } from 'react-icons/hi';
import GooSpinner from '../other/GooSpiner';

interface SwapPreviewCardProps {
    swap?: UserSwap; // Uses the new Swap type
    selectedInputAsset: ValidAsset;
    onClick?: () => void;
    isActivityPage?: boolean;
}

const SwapPreviewCard: React.FC<SwapPreviewCardProps> = ({ swap, selectedInputAsset, onClick }) => {
    const { isMobile } = useWindowSize();

    if (!swap) {
        return null; // or some fallback UI
    }

    // [1] TIMESTAMP
    const timestampMs = swap.depositTimestamp * 1000;
    const timeAgo = formatDistanceToNow(new Date(timestampMs), { addSuffix: true });

    // [2] DEPOSIT AMOUNT (hex -> BigNumber -> formatUnits)
    const depositAmountDecimal = BigNumber.from(swap.depositAmount).toString();
    const depositAmountDisplay = formatUnits(depositAmountDecimal, BITCOIN_DECIMALS);

    // [3] EXPECTED SATS (convert satoshis to BTC)
    const satsOutBtc = satsToBtc(BigNumber.from(swap.expectedSats));

    // [4] STATUS based on swap_proofs
    const status = swap.swap_proofs.length > 0 ? 'Completed' : 'Pending';

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
                cursor={'pointer'}
                bg={colors.offBlack}
                w='100%'
                mb='10px'
                fontSize='18px'
                px='16px'
                py={'12px'}
                align='flex-start'
                justify='flex-start'
                borderRadius='10px'
                border='2px solid'
                color={colors.textGray}
                borderColor={colors.borderGray}
                gap='12px'
                flexDirection={'row'}
                letterSpacing='-2px'
                _hover={{
                    bg: colors.purpleBackground,
                    borderColor: colors.purpleBorder,
                }}>
                {/* TIMESTAMP */}
                <Flex w='100%' align='center' direction={isMobile ? 'column' : 'row'}>
                    <Text width='130px' pr='10px' fontSize='14px' fontFamily={FONT_FAMILIES.AUX_MONO} fontWeight='normal'>
                        {timeAgo}
                    </Text>

                    {/* SWAP INPUT & SWAP OUTPUT */}
                    <Flex align='center' mt='-5px'>
                        <Flex direction='column'>
                            <Flex
                                h='50px'
                                mt='6px'
                                mr='40px'
                                w='100%'
                                bg={selectedInputAsset.dark_bg_color}
                                border='3px solid'
                                borderColor={selectedInputAsset.bg_color}
                                borderRadius={'14px'}
                                pl='15px'
                                pr='10px'
                                align={'center'}>
                                <Text fontSize='16px' color={colors.offWhite} letterSpacing={'-1px'} fontFamily={FONT_FAMILIES.AUX_MONO}>
                                    {formatUnits(BigNumber.from(swap.depositAmount).toString(), BITCOIN_DECIMALS).toString()}
                                </Text>
                                <Spacer />
                                <AssetTag assetName={'cbBTC'} width='110px' />
                            </Flex>
                        </Flex>
                        <Text mt='7px' mx='12px' fontSize='20px' opacity={0.9} fontWeight={'bold'} color={colors.offWhite} letterSpacing={'-1px'} fontFamily={FONT_FAMILIES.AUX_MONO}>
                            <FaRegArrowAltCircleRight color={colors.RiftOrange} />
                        </Text>

                        <Flex direction='column'>
                            <Flex h='50px' mr='55px' mt='6px' w='100%' bg='#2E1C0C' border={'3px solid'} borderColor={'#78491F'} borderRadius={'14px'} pl='15px' pr='10px' align={'center'}>
                                <Text fontSize='16px' color={colors.offWhite} letterSpacing={'-1px'} fontFamily={FONT_FAMILIES.AUX_MONO}>
                                    {satsToBtc(BigNumber.from(swap.expectedSats))}
                                </Text>

                                <Spacer />
                                <AssetTag assetName={'BTC'} width='84px' />
                            </Flex>
                        </Flex>
                    </Flex>
                    {/* TXID */}
                    <Flex
                        mx='40px'
                        align='center'
                        cursor='pointer'
                        onClick={() => window.open(`https://basescan.org/tx/${swap.deposit_txid}`, '_blank')}
                        _hover={{ bg: 'rgba(255, 255, 255, 0.1)' }}
                        p='8px'
                        borderRadius='8px'>
                        <Text mr='8px' fontFamily={FONT_FAMILIES.AUX_MONO} fontSize='15px' color={colors.textGray}>
                            {swap.deposit_txid.slice(0, 6)}...{swap.deposit_txid.slice(-6)}
                        </Text>
                        <HiOutlineExternalLink color={colors.textGray} />
                    </Flex>

                    {/* STATUS  */}
                    <Flex align='center' mt='10px' justify='center'>
                        <GooSpinner flexSize={10} lRingSize={15} stroke={2} color={colors.textGray} />
                        <Text ml='14px' mt='-14px' mr='30px' fontFamily={FONT_FAMILIES.AUX_MONO} fontSize='15px' color={colors.textGray}>
                            {status}
                        </Text>
                    </Flex>
                </Flex>
            </Flex>
        </Flex>
    );
};

export default SwapPreviewCard;
